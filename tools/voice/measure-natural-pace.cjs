#!/usr/bin/env node
/**
 * MEASURE EACH VOICE'S NATURAL PACE, from audio that already exists.
 *
 * ⚠️ SUPERSEDED AS A SOURCE OF TRUTH — Tom, 2026-08-29, hours after this landed:
 *
 *   "be careful - Azure voices were recorded at non 1.0x speeds so we can only
 *    use the providers APIs for the voice as the truth - not the recordings we
 *    have in the estate"
 *
 * This tool measures RECORDINGS. However carefully it filters for clips
 * believed to have been rendered at 1.0x — and the filtering below is real, and
 * its Azure finding is worth keeping — it is still measuring decisions somebody
 * already made rather than how fast a voice speaks. The live measurement is now
 * tools/voice/measure-provider-pace.cjs, which renders one controlled sentence
 * per voice straight from the provider API at 1.0x and times the bytes.
 *
 * Kept, not deleted: the Azure baked-speed finding documented below is the
 * evidence for why the estate cannot be trusted as a pace source, and it is
 * also the fastest way to re-check that finding if anyone doubts it. Do not use
 * its output to write voices.natural_pace_* any more.
 *
 * Tom's ruling, 2026-08-29: natural pace is MEASURED from rendered clips, never
 * asked of a human. A hand-typed pace reproduces exactly the blunt instrument
 * the whole exercise exists to replace.
 *
 *   Usage:  node tools/voice/measure-natural-pace.cjs            # dry run
 *           node tools/voice/measure-natural-pace.cjs --apply    # write voices.*
 *
 * Read-only by default. Touches no audio, renders nothing, costs nothing but
 * one aggregate query.
 *
 * ── THE TRAP THIS TOOL EXISTS TO AVOID ──────────────────────────────────────
 *
 * Tom's premise on 2026-08-29 was "we're minting everything at 1.0x". It is not
 * true, and the first measurement built on it was wrong because of it: 30
 * courses carry a baked settings.speed of 0.8, 0.85 or 0.9, every one of them
 * on an Azure voice, and Azure BAKES SPEED INTO THE MP3 (which is why
 * audio-reuse-planner refuses to cross roles on Azure sources). The ten slowest
 * "voices" in the first uncorrected pass were, exactly and in order, the ten
 * Azure voices rendered at 0.8x. That measured a decision somebody already
 * made, not how fast the voice speaks.
 *
 * So this tool measures ONLY clips whose course+role was rendered at 1.0x.
 * The spread that survives is smaller than the uncorrected one and it is real:
 * English `known` voices still span 0.78x to 1.41x of their own median.
 *
 * CAVEAT, stated because it cannot be fixed from the data: the baked speed we
 * filter on is the one stored TODAY. A clip rendered before a speed change
 * carries the old rate and we cannot tell. The 1.0x population is therefore
 * "believed 1.0x", not "proven 1.0x", and a voice whose course changed speed
 * recently is the one to distrust.
 *
 * ── WHAT IT COMPUTES ────────────────────────────────────────────────────────
 * Per (language, role, voice): characters of text_normalized per second of
 * audio. Then per voice: the MEDIAN of its ratios to each (language, role)
 * median — median, so 34,000 English clips do not outvote the voice itself.
 * The arithmetic lives in services/shared/voice-pace.cjs, tested, and is not
 * repeated here.
 *
 * NEVER writes natural_pace_nudge. A human's correction survives every
 * re-measurement, by construction.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { combineMeasurements } = require('../../services/shared/voice-pace.cjs');

// Clips shorter than this are dominated by leading and trailing silence, so a
// pace taken from them measures padding. Short TEXTS likewise: "yes." is a
// duration floor, not a speaking rate.
const MIN_DURATION_MS = 1500;
const MIN_TEXT_CHARS = 15;
// Below this a (language, role, voice) figure is noise. 100 was chosen because
// the same voice under its two id spellings agrees to within a few percent
// above it and diverges by up to 29% below it.
const MIN_CLIPS = 100;
const METHOD = `cps@1x tail>=${MIN_DURATION_MS}ms text>=${MIN_TEXT_CHARS} n>=${MIN_CLIPS} v1 2026-08-29`;

const SQL = `
WITH course_speed AS (
  SELECT c.course_code, r.role,
         COALESCE(NULLIF(r.v->'settings'->>'speed','')::numeric, 1.0) AS baked
  FROM courses c, LATERAL (SELECT key AS role, value AS v FROM jsonb_each(c.voice_config->'voices')) r
),
clean AS (
  SELECT ca.language, ca.role, ca.voice_id, ca.text_normalized, ca.duration_ms
  FROM course_audio ca
  LEFT JOIN course_speed cs ON cs.course_code = ca.course_code AND cs.role = ca.role
  WHERE ca.origin = 'tts' AND ca.voice_id IS NOT NULL
    AND ca.duration_ms >= ${MIN_DURATION_MS} AND length(ca.text_normalized) >= ${MIN_TEXT_CHARS}
    AND COALESCE(cs.baked, 1.0) = 1.0
),
agg AS (
  SELECT language, role, voice_id, count(*) AS n,
         (sum(length(text_normalized))::numeric / sum(duration_ms)::numeric) * 1000 AS cps
  FROM clean GROUP BY 1,2,3 HAVING count(*) >= ${MIN_CLIPS}
),
med AS (
  SELECT language, role, percentile_cont(0.5) WITHIN GROUP (ORDER BY cps) AS m, count(*) AS nvoices
  FROM agg GROUP BY 1,2
)
SELECT a.language, a.role, a.voice_id, a.n,
       round(a.cps::numeric, 3) AS cps, round((a.cps / m.m)::numeric, 4) AS ratio
FROM agg a JOIN med m USING (language, role)
-- A language+role with ONE voice has no median to compare against: its ratio
-- would be 1.000 by construction and would say nothing. Excluded, so a voice
-- is never credited with being typical on the strength of being alone.
WHERE m.nvoices >= 2
ORDER BY a.language, a.role, ratio DESC;
`;

async function main() {
  const apply = process.argv.includes('--apply');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // The aggregate is a windowed GROUP BY over 2.6M rows — PostgREST cannot
  // express it, so it goes through psql, which is how the rest of the estate's
  // analysis tools read. DATABASE_URL lives in .env.psql at the repo root.
  const { execFileSync } = require('child_process');
  const out = execFileSync('psql', [process.env.DATABASE_URL || readPsqlUrl(), '-At', '-F', '\t', '-c', SQL], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
  });
  const measurements = out.trim().split('\n').filter(Boolean).map((l) => {
    const [language, role, voice_id, n, cps, ratio] = l.split('\t');
    return { language, role, voice_id, n: Number(n), cps: Number(cps), ratio: Number(ratio) };
  });

  const byVoice = new Map();
  for (const m of measurements) {
    if (!byVoice.has(m.voice_id)) byVoice.set(m.voice_id, []);
    byVoice.get(m.voice_id).push({ ratio: m.ratio, samples: m.n, cps: m.cps, language: m.language, role: m.role });
  }

  const updates = [];
  for (const [voiceId, rows2] of byVoice) {
    const combined = combineMeasurements(rows2);
    if (!combined) continue;
    // The stored cps is the one from the row whose ratio was chosen, so the
    // evidence on the row is the evidence for the number on the row.
    const chosen = rows2.reduce((best, r) =>
      Math.abs(r.ratio - combined.ratio) < Math.abs(best.ratio - combined.ratio) ? r : best, rows2[0]);
    updates.push({
      voice_id: voiceId,
      natural_pace_ratio: combined.ratio,
      natural_pace_cps: chosen.cps,
      natural_pace_samples: combined.samples,
      natural_pace_measured_at: new Date().toISOString(),
      natural_pace_method: METHOD,
      _langs: rows2.length,
    });
  }

  updates.sort((a, b) => b.natural_pace_ratio - a.natural_pace_ratio);
  console.log(`\n${measurements.length} (language, role, voice) measurements → ${updates.length} voices\n`);
  console.log('ratio  clips    langs  voice_id');
  for (const u of updates) {
    console.log(`${u.natural_pace_ratio.toFixed(3)}  ${String(u.natural_pace_samples).padStart(7)}  ${String(u._langs).padStart(5)}  ${u.voice_id}`);
  }

  if (!apply) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to store these on `voices`.');
    console.log('natural_pace_nudge is never written by this tool: a human correction survives re-measurement.\n');
    return;
  }

  let written = 0, missing = 0;
  for (const u of updates) {
    const { _langs, ...row } = u;
    // Update, never upsert: this tool measures voices the registry already
    // knows about. A voice_id in course_audio with no `voices` row is a
    // registry gap and inventing a row here would hide it.
    const { data, error: err } = await supabase.from('voices').update(row).eq('voice_id', u.voice_id).select('voice_id');
    if (err) { console.error(`  ${u.voice_id}: ${err.message}`); continue; }
    if (!data || !data.length) { missing++; continue; }
    written++;
  }
  console.log(`\nWrote ${written} voices. ${missing} measured voice id(s) have no row in \`voices\` — registry gap, not fixed here.\n`);
}

function readPsqlUrl() {
  const fs = require('fs');
  const path = require('path');
  const f = path.join(__dirname, '..', '..', '.env.psql');
  const m = fs.readFileSync(f, 'utf8').match(/DATABASE_URL=["']?([^"'\n]+)/);
  if (!m) throw new Error('no DATABASE_URL in .env.psql');
  return m[1];
}

main().catch((e) => { console.error(e.message); process.exit(1); });
