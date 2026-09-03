#!/usr/bin/env node
/**
 * THE DEFAULT ENGLISH MALE VOICE, MADE ONE THING.
 *
 * Tom's ruling, 2026-09-03: his Cartesia clone becomes the default English male
 * voice, estate-wide. xAI is the deprecated provider and `gfzdpspr5fdp` — the
 * xAI clone of his voice — is what 327,375 existing clips across 80 courses
 * were rendered on.
 *
 * ── THE DEFAULT WAS NOT ONE THING, WHICH IS WHY THIS TOOL EXISTS ────────────
 * Read off the LIVE database and the code on origin/main, "the default English
 * male voice" was stated in three separate places, none of which knew about the
 * others:
 *
 *   1. app_config.pod_voice_pools -> eng.m[0]  — the POD default. tools/pod-sync.cjs
 *      casts every new pod speaker from this list, and with POD_VOICES_PER_GENDER=1
 *      (the default since the two-voice rule) index 0 IS the default. It said
 *      { name: 'Tom', provider: 'xai', voice_id: 'gfzdpspr5fdp' }.
 *   2. voice_language_roles                     — the COURSE default, and the one
 *      the estate DESIGNED to be the single definition (services/shared/
 *      language-voice-cast.cjs, Tom 2026-08-29: "a per-course voice block is a
 *      copy of that decision made 94 times"). It held ZERO rows, so every course
 *      fell through to leg 3.
 *   3. courses.voice_config per course          — 18 courses naming gfzdpspr5fdp
 *      by hand: the 94 copies the language cast exists to replace.
 *
 * This tool writes (1) and (2) — the two DEFINITIONS — and deliberately leaves
 * (3) alone. Nothing here rewrites a course's stored config: the language cast
 * is an OVERLAY applied at render time, so a stored xAI voice simply stops being
 * what a new render uses. Reverting is deleting one row.
 *
 * ── WHAT IT DOES NOT DO ────────────────────────────────────────────────────
 *   • It renders NOTHING and re-renders NOTHING. Every existing clip keeps
 *     playing on the voice it was made with; adoption is forward-only.
 *   • It does not touch any FEMALE English default. The cast is keyed
 *     (language, gender, slot, rank) and only the ('eng','m','phrase',0) row is
 *     written, so an English course whose voice is female stays female.
 *   • It does not touch Welsh, any human-recorded voice, or the `presentation`
 *     role — presentation is deliberately outside CAST_ROLES (a course's own
 *     presenter, not a specimen of the language), so 22,083 xAI presentation
 *     clips are unaffected and remain a decision for Tom.
 *   • It does not flip `autoCast` in services/shared/tts-provider-policy.cjs.
 *     That flag is GENDER-BLIND — turning it on would hand Tom's voice to every
 *     English line including the female ones. The cast is the gendered lever.
 *
 * Usage:  node tools/voice/set-default-english-male-cartesia.cjs           # dry run
 *         node tools/voice/set-default-english-male-cartesia.cjs --apply
 *         node tools/voice/set-default-english-male-cartesia.cjs --revert --apply
 */

'use strict';

const path = require('path');
const fs = require('fs');
const REPO = path.join(__dirname, '..', '..');
// .env.psql is gitignored and provisioned per machine (docs/secrets-vault.md), so
// it lives in the primary checkout even when this runs from a worktree.
for (const p of [path.join(REPO, '.env.psql'), '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql']) {
  if (fs.existsSync(p)) { require('dotenv').config({ path: p, quiet: true }); break; }
}
if (!process.env.DATABASE_URL) throw new Error('no DATABASE_URL: .env.psql not found');
const { Client } = require('pg');
const { applyLanguageCast } = require(path.join(REPO, 'services/shared/language-voice-cast.cjs'));
const { COURSE_CAST_FIELDS } = require(path.join(REPO, 'services/shared/cast-language-key.cjs'));

/**
 * THE VOICE. tom_001, the ONLY Cartesia clone of Tom's voice that this estate
 * has ever rendered with (91 clips, spa_for_eng known track, 2026-08-27) and
 * the only one named on the render path in code — services/shared/
 * tts-provider-policy.cjs CARTESIA_VOICES, where it is declared English-only.
 *
 * THERE ARE THREE Tom clones registered (tom_001, Tom_002, Tom_003), all
 * consent-authorised. Which one he wants as the estate's voice is HIS call, not
 * a derivable fact — and it is one row to change, which is the entire point of
 * this tool. Flagged in the report rather than guessed at silently.
 */
const CLONE = {
  voice_id: 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2',
  bare: '8fef4d59-0a7e-4ad2-a261-6a3bb50734d2',
  name: 'Tom',
  provider: 'cartesia',
  locale: 'en',
};

const CAST = { language: 'eng', gender: 'm', slot: 'phrase', rank: 0 };
const OLD_POOL_VOICE_ID = 'gfzdpspr5fdp';

const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const log = { at: new Date().toISOString(), mode: APPLY ? 'applied' : 'dryrun', revert: REVERT, steps: [], wouldChange: [] };

  // ── PRE-FLIGHT ASSERTIONS. Abort on any drift. ───────────────────────────
  const { rows: [voice] } = await c.query(
    'select voice_id, gender, is_active, tts_engine, consent_status from voices where voice_id = $1', [CLONE.voice_id]);
  if (!voice) throw new Error(`clone ${CLONE.voice_id} is not registered in voices — refusing to cast a voice that does not exist`);
  if (voice.is_active === false) throw new Error(`clone ${CLONE.voice_id} is inactive`);
  if (voice.tts_engine !== 'cartesia') throw new Error(`clone ${CLONE.voice_id} has tts_engine=${voice.tts_engine}, expected cartesia`);
  if (voice.consent_status !== 'authorised') throw new Error(`clone ${CLONE.voice_id} consent_status=${voice.consent_status} — the consent gate would refuse it`);
  log.steps.push({ step: 'preflight', voice });

  // ── 1. THE VOICE ROW MUST STATE ITS GENDER ───────────────────────────────
  // Not cosmetic. language-voice-cast.genderForRole() reads the gender of the
  // voice a course CURRENTLY holds to decide which half of the cast to read.
  // Once a course holds the clone, a null gender falls to DEFAULT_GENDER, which
  // is 'f' for the `known` role — so a second resolution would silently flip
  // every *_for_eng known track to a female voice. Stating it closes that.
  if (!REVERT && voice.gender !== 'm') {
    log.steps.push({ step: 'voices.gender', from: voice.gender, to: 'm' });
    if (APPLY) await c.query(`update voices set gender='m', updated_at=now() where voice_id=$1`, [CLONE.voice_id]);
  }

  // ── 2. THE COURSE DEFAULT: one row in voice_language_roles ───────────────
  const { rows: existing } = await c.query(
    'select * from voice_language_roles where language=$1 and gender=$2 and slot=$3 and rank=$4',
    [CAST.language, CAST.gender, CAST.slot, CAST.rank]);
  if (REVERT) {
    log.steps.push({ step: 'voice_language_roles', action: 'delete', existing: existing[0] || null });
    if (APPLY) await c.query('delete from voice_language_roles where language=$1 and gender=$2 and slot=$3 and rank=$4',
      [CAST.language, CAST.gender, CAST.slot, CAST.rank]);
  } else {
    log.steps.push({ step: 'voice_language_roles', action: existing.length ? 'update' : 'insert', from: existing[0]?.voice_id || null, to: CLONE.voice_id });
    if (APPLY) {
      await c.query(`insert into voice_language_roles (language, gender, slot, rank, voice_id, assigned_by, notes)
                     values ($1,$2,$3,$4,$5,$6,$7)
                     on conflict (slot, language, gender, rank)
                     do update set voice_id=excluded.voice_id, assigned_by=excluded.assigned_by, notes=excluded.notes, updated_at=now()`,
        [CAST.language, CAST.gender, CAST.slot, CAST.rank, CLONE.voice_id, 'tom-ruling-2026-09-03',
         "Tom's ruling 2026-09-03: his Cartesia clone is the default English male voice, estate-wide. Replaces the xAI clone gfzdpspr5fdp, whose provider is deprecated. Forward-only: no existing clip is re-rendered."]);
    }
  }

  // ── 3. THE POD DEFAULT: app_config.pod_voice_pools eng.m[0] ──────────────
  const { rows: [cfg] } = await c.query(`select value from app_config where key='pod_voice_pools'`);
  if (!cfg) throw new Error('app_config.pod_voice_pools is missing');
  const pools = JSON.parse(JSON.stringify(cfg.value));
  const engM = pools.eng && pools.eng.m;
  if (!Array.isArray(engM) || !engM.length) throw new Error('pod_voice_pools.eng.m is empty — refusing to guess its shape');
  const head = engM[0];
  if (REVERT) {
    if (head.voice_id === CLONE.bare || head.voice_id === CLONE.voice_id) {
      engM[0] = { name: 'Tom', provider: 'xai', voice_id: OLD_POOL_VOICE_ID };
      log.steps.push({ step: 'pod_voice_pools.eng.m[0]', from: head, to: engM[0] });
      if (APPLY) await c.query(`update app_config set value=$1, updated_at=now() where key='pod_voice_pools'`, [JSON.stringify(pools)]);
    }
  } else {
    if (head.voice_id !== OLD_POOL_VOICE_ID && head.voice_id !== CLONE.bare) {
      throw new Error(`pod_voice_pools.eng.m[0] is ${JSON.stringify(head)} — expected the xAI Tom clone. Drift: aborting rather than overwriting somebody else's decision.`);
    }
    if (head.voice_id !== CLONE.bare) {
      // The bare uuid is what Cartesia's API wants; clip-identity spells it
      // `cartesia_<uuid>` on the way into course_audio. The pool carries the
      // provider alongside, exactly as it does for xai/azure entries.
      engM[0] = { name: CLONE.name, provider: CLONE.provider, voice_id: CLONE.bare, locale: CLONE.locale };
      log.steps.push({ step: 'pod_voice_pools.eng.m[0]', from: head, to: engM[0] });
      if (APPLY) await c.query(`update app_config set value=$1, updated_at=now() where key='pod_voice_pools'`, [JSON.stringify(pools)]);
    }
  }

  // ── WHAT THE CAST WILL ACTUALLY DECIDE, COURSE BY COURSE ─────────────────
  // Simulated through the real resolver, not guessed: the same applyLanguageCast
  // the render path calls, fed the row this tool writes.
  const roles = REVERT ? [] : [{ ...CAST, voice_id: CLONE.voice_id }];
  const { rows: voices } = await c.query('select voice_id, gender, tts_engine, is_active, display_name, human_name, languages from voices');
  const { rows: courses } = await c.query(`select ${COURSE_CAST_FIELDS}, voice_config from courses`);
  const { rows: humanRows } = await c.query(
    `select course_code, role, voice_id, count(*)::int as clips from course_audio
      where voice_id like 'human%' group by 1,2,3`).catch(() => ({ rows: [] }));
  for (const course of courses) {
    const { decisions } = applyLanguageCast({
      voiceConfig: course.voice_config || {}, course, roles, voices, humanRows,
    });
    for (const d of decisions.filter((x) => x.source === 'language-cast')) {
      log.wouldChange.push({ course: course.course_code, role: d.role, from: d.replaced, to: d.voiceId });
    }
  }

  await c.end();
  const out = path.join(REPO, 'docs/voice-engine', `default-english-male-cartesia-2026-09-03-${APPLY ? 'applied' : 'dryrun'}${REVERT ? '-revert' : ''}-log.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(log, null, 2));
  console.log(JSON.stringify({ mode: log.mode, revert: REVERT, steps: log.steps, changes: log.wouldChange.length, log: out }, null, 2));
  console.log(log.wouldChange.map((w) => `  ${w.course} ${w.role}: ${w.from} → ${w.to}`).join('\n'));
}

main().catch((e) => { console.error('ABORT:', e.message); process.exit(1); });
