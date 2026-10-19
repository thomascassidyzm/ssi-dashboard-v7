#!/usr/bin/env node
/*
 * count-audio-gap.cjs — STANDING COUNT of prompts whose TEXT has run ahead of
 * its AUDIO.
 *
 * Why this exists (Tom, 2026-09-02): a forensic pass into twelve silent English
 * prompts found ~1,000 more by accident. Text editing runs ahead of audio
 * rendering, nobody counts the difference, and it grows silently. This makes it
 * a counted number, every night, with an alarm on any INCREASE.
 *
 * WHAT THE LEARNER ACTUALLY EXPERIENCES — verified in the delivery code, not
 * assumed: ssi-learning-app/api/courses/[code]/cycles.ts `phraseHasFullAudio()`
 * DROPS any phrase missing known/target1/target2 audio from the walk. So a
 * gapped row is not "silent", it is ABSENT: authored content the learner never
 * meets, with no error and no alarm anywhere.
 *
 * THE MECHANISM, verified in the schema (database/migrations/20260806_audio_link_integrity.sql):
 *   * BEFORE UPDATE triggers null_{lego,phrase}_audio_on_text_change NULL the
 *     audio links on ANY text change.
 *   * link_audio_to_content (AFTER INSERT ON course_audio) is the only relink
 *     path, and it only fires when BRAND-NEW audio is inserted.
 * So an edit does not leave stale audio attached — it leaves NULL. That is why
 * the categories below are what they are, and why "audio rendered before the
 * text's last edit" is measured here but is NOT the load-bearing number.
 *
 * CATEGORIES (per course, per slot kind, known/target sides):
 *   MISSING-UNRENDERED  no link, and no clip anywhere in the course matches the
 *                       current text. Fixing this costs a TTS render (money).
 *   MISSING-RELINKABLE  no link, but a clip for exactly this text already exists
 *                       in course_audio for this course. Costs nothing — the
 *                       relink trigger simply never fired for it.
 *   STALE-TEXT          a link IS present but the clip's text no longer equals
 *                       the row's text. The learner hears the wrong words. Rare
 *                       by construction (see above), so a rise here is a signal
 *                       that something wrote a link directly, bypassing triggers.
 *   TS-STALE            clip text matches but clip predates the row's updated_at.
 *                       MEASURED AND REPORTED AS NOISE: updated_at is bumped by
 *                       bulk passes that never touched the text, so this counts
 *                       ~650k rows and means nothing. Kept visible so nobody
 *                       re-derives it in three months and believes it.
 *
 * SCOPE BUCKETS. A course mid-build has no audio yet; that is a build backlog,
 * not drift. Courses are bucketed by known-side render coverage:
 *   RENDERED   coverage >= --threshold (default 0.90) — drift lives here; this
 *              is the headline number.
 *   BUILDING   coverage below it — reported separately, never in the headline.
 * The bucket a course sits in is recorded in the snapshot, so a course crossing
 * the line shows up as a bucket change rather than a mystery jump.
 *
 * Text comparison uses the DATABASE's own normalize_text(), i.e.
 * rtrim(lower(trim(t)), '.?!¿¡。？！'), because that is what writes
 * course_audio.text_normalized and what the relink trigger matches on. Using
 * anything else invents thousands of false "stale" rows out of full stops —
 * measured: 32,762 of them.
 *
 * USAGE
 *   node tools/qa/audio-gap/count-audio-gap.cjs [options]
 *     --json <path>       write the full snapshot JSON here
 *     --state <dir>       snapshot directory for night-on-night comparison
 *                         (default: ops-state/audio-gap under the repo)
 *     --no-save           do not write a new snapshot into --state
 *     --threshold <f>     rendered-coverage cutoff (default 0.90)
 *     --quiet             machine use: print nothing but the JSON path
 * Exit code 0 always unless the query itself fails (2). A rising number is a
 * NOTICE, not a broken unit — the same rule ci-run.sh follows.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Rows per statement. Every page re-reads and re-sorts the course's whole slot list to find its place, so the cost of
// a course is (pages x course size): few big pages beat many small ones (200-row pages made 2,243 statements, 600 s).
const PAGE_MAX = 8000;
const PAGE_MIN = 200;

const REPO = path.resolve(__dirname, '..', '..', '..');

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const p = path.join(REPO, '.env.psql');
  if (!fs.existsSync(p)) throw new Error(`.env.psql not found at ${p} — it is gitignored and provisioned per machine (docs/secrets-vault.md)`);
  const m = fs.readFileSync(p, 'utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
  if (!m) throw new Error('.env.psql has no DATABASE_URL');
  return m[1].trim();
}

function args(argv) {
  const o = { json: null, state: path.join(REPO, 'ops-state', 'audio-gap'), save: true, threshold: 0.90, quiet: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = argv[++i];
    else if (a === '--state') o.state = argv[++i];
    else if (a === '--no-save') o.save = false;
    else if (a === '--threshold') o.threshold = parseFloat(argv[++i]);
    else if (a === '--quiet') o.quiet = true;
    else if (a === '--help' || a === '-h') { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(0); }
    else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

/* One course and side per statement. Apply the course filter before every
 * scan/join; an estate-wide aggregate can spill and stall learner traffic. */
function sql(side, limit) {
  const textCol = side === 'known' ? 'known_text' : 'target_text';
  const linkCol = side === 'known' ? 'known_audio_id' : 'target1_audio_id';
  const role = side === 'known' ? 'known' : 'target1';
  return `
    with slots as (
      select 'phrase'::text kind, course_code, id::text row_id, ${textCol} txt, ${linkCol} link, updated_at
        from course_practice_phrases where course_code = $1
      union all
      select 'lego', course_code, lego_id, ${textCol}, ${linkCol}, updated_at from course_legos where course_code = $1
      union all
      -- Only seeds that have actually been decomposed into LEGOs: a raw,
      -- undecomposed seed was never going to have audio (most courses stop
      -- content-building at the seed-300 MVP boundary, services/config/
      -- course-modes.json), so counting it as a "gap" is meaningless noise.
      select 'seed', s.course_code, s.seed_id, s.${textCol}, s.${linkCol}, s.updated_at
        from course_seeds s
       where s.course_code = $1 and exists (
         select 1 from course_legos l
          where l.course_code = s.course_code and l.seed_number = s.seed_number
       )
    ),
    -- The course's clip texts for this side, built ONCE per statement and hash-joined below. A correlated EXISTS per row
    -- was ~0.4 ms a row on prod (8 minutes of the 10-minute run cap); the distinct set makes it one probe per row and
    -- cannot multiply rows. Same question as before: does a clip for exactly this text exist in this course and role.
    clips as materialized (select distinct text_normalized from course_audio where course_code = $1 and role = '${role}'),
    batch as (select * from slots where (kind || ':' || row_id) > $2 order by (kind || ':' || row_id) limit ${limit}),
    j as (
      select s.course_code, s.kind, s.row_id, s.updated_at,
             s.txt is not null and btrim(s.txt) <> '' as authored,
             s.link is null as unlinked,
             c.text_normalized is not null as clip_exists,
             (a.id is not null and normalize_text(a.text) is distinct from normalize_text(s.txt)) as stale_text,
             (a.id is not null and normalize_text(a.text) is not distinct from normalize_text(s.txt)
                               and a.created_at < s.updated_at) as ts_stale
        from batch s
        left join course_audio a on a.id = s.link
        left join clips c on c.text_normalized = normalize_text(s.txt)
    )
    select course_code, kind, max(kind || ':' || row_id) as cursor, count(*)::int as scanned,
           count(*) filter (where authored)::int                                    as total,
           count(*) filter (where authored and unlinked)::int                                  as missing,
           count(*) filter (where authored and unlinked and clip_exists)::int                  as missing_relinkable,
           count(*) filter (where authored and unlinked and not clip_exists)::int              as missing_unrendered,
           count(*) filter (where authored and stale_text)::int                                as stale_text,
           count(*) filter (where authored and ts_stale)::int                                  as ts_stale,
           min(updated_at) filter (where authored and unlinked)                                as gap_oldest_edit,
           max(updated_at) filter (where authored and unlinked)                                as gap_newest_edit
      from j group by 1, 2 order by cursor`;
}

async function main(argv = process.argv) {
  const o = args(argv);
  const c = new Client({ connectionString: databaseUrl(), statement_timeout: 5000,
    application_name: 'qa:audio-gap', connectionTimeoutMillis: 10000 });
  const courses = new Map();
  const pageSizes = new Map(); // a cancelled page size is not tried again for the same course
  const sides = { known: { rows: [], query_ms: 0 }, target: { rows: [], query_ms: 0 } };
  // SET LOCAL pins the name and timeout to the actual backend through a transaction pooler.
  // Every batch commits independently, releasing its snapshot and backend between courses.
  async function read(fn) {
    await c.query('BEGIN READ ONLY');
    try {
      await c.query("SELECT set_config('application_name', $1, true), set_config('statement_timeout', $2, true)", ['qa:audio-gap', '5000']);
      const result = await fn();
      await c.query('COMMIT');
      return result;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      throw e;
    }
  }
  try {
    await c.connect();
    const meta = await read(() => c.query(`select course_code, display_name, status, known_lang, target_lang from courses`));
    for (const r of meta.rows) courses.set(r.course_code, r);
    for (const course of courses.keys()) {
      for (const side of ['known', 'target']) {
        const t0 = Date.now();
        let cursor = '';
        let page = pageSizes.get(course) || PAGE_MAX;
        while (true) {
          const started = Date.now();
          let r;
          try { r = await read(() => c.query(sql(side, page), [course, cursor])); }
          catch (e) {
            // The cap stays 5 s. A page that does not fit is retried at half the size, from the same cursor (the
            // cancelled statement was rolled back), and the smaller size is kept for the rest of this course.
            if (e.code === '57014' && page > PAGE_MIN) { page = Math.max(PAGE_MIN, Math.floor(page / 2)); pageSizes.set(course, page); continue; }
            throw e;
          }
          console.error(`qa:audio-gap course=${course} side=${side} statement_ms=${Date.now()-started}`);
          sides[side].rows.push(...r.rows);
          if (!r.rows.length || r.rows.reduce((n,r) => n + r.scanned, 0) < page) break;
          cursor = r.rows.at(-1).cursor;
        }
        sides[side].query_ms += Date.now() - t0;
      }
    }
  } finally {
    await c.end();
  }

  // fold per-course
  const byCourse = new Map();
  for (const [side, { rows }] of Object.entries(sides)) {
    for (const r of rows) {
      if (!byCourse.has(r.course_code)) byCourse.set(r.course_code, {
        course_code: r.course_code,
        display_name: (courses.get(r.course_code) || {}).display_name || null,
        status: (courses.get(r.course_code) || {}).status || 'unknown',
        known_lang: (courses.get(r.course_code) || {}).known_lang || null,
        target_lang: (courses.get(r.course_code) || {}).target_lang || null,
        known: blank(), target: blank(),
      });
      const b = byCourse.get(r.course_code)[side];
      b.total += r.total; b.missing += r.missing;
      b.missing_relinkable += r.missing_relinkable;
      b.missing_unrendered += r.missing_unrendered;
      b.stale_text += r.stale_text; b.ts_stale += r.ts_stale;
      const kind = b.by_kind[r.kind] ||= { total: 0, missing: 0, missing_relinkable: 0, missing_unrendered: 0, stale_text: 0 };
      for (const k of Object.keys(kind)) kind[k] += r[k];
      const g = r.kind === 'seed' ? b.seed : b.practice;
      for (const k of ['total', 'missing', 'missing_relinkable', 'missing_unrendered', 'stale_text']) g[k] += r[k];
      // Gap age is tracked per group as well as per side: quoting a seed-track
      // date against a practice-row count is how a report starts lying quietly.
      if (r.gap_oldest_edit && (!g.gap_oldest_edit || r.gap_oldest_edit < g.gap_oldest_edit)) g.gap_oldest_edit = r.gap_oldest_edit;
      if (r.gap_newest_edit && (!g.gap_newest_edit || r.gap_newest_edit > g.gap_newest_edit)) g.gap_newest_edit = r.gap_newest_edit;
      if (r.gap_oldest_edit && (!b.gap_oldest_edit || r.gap_oldest_edit < b.gap_oldest_edit)) b.gap_oldest_edit = r.gap_oldest_edit;
      if (r.gap_newest_edit && (!b.gap_newest_edit || r.gap_newest_edit > b.gap_newest_edit)) b.gap_newest_edit = r.gap_newest_edit;
    }
  }

  for (const cd of byCourse.values()) {
    for (const side of ['known', 'target']) {
      const b = cd[side];
      b.coverage = b.total ? +((b.total - b.missing) / b.total).toFixed(4) : 0;
      b.practice.coverage = b.practice.total ? +((b.practice.total - b.practice.missing) / b.practice.total).toFixed(4) : 0;
      b.seed.coverage = b.seed.total ? +((b.seed.total - b.seed.missing) / b.seed.total).toFixed(4) : 0;
    }
    // Bucket on the KNOWN PRACTICE coverage — phrase + lego rows, the ones the
    // learner's walk pulls from. Seed-level known audio is deliberately excluded
    // from the bucket test: estate-wide it stops at seed 300 (a uniform boundary
    // across ~30 courses, verified 2026-09-02), which is a render-plan boundary,
    // not drift, and it would drag fully-rendered courses into 'building'.
    cd.bucket = cd.known.practice.coverage >= o.threshold ? 'rendered' : 'building';
  }

  const list = [...byCourse.values()].sort((a, b) => b.known.missing - a.known.missing);
  const snap = {
    generated_at: new Date().toISOString(),
    threshold: o.threshold,
    query_ms: { known: sides.known.query_ms, target: sides.target.query_ms },
    totals: totals(list, o.threshold),
    courses: list,
  };

  // night-on-night comparison
  fs.mkdirSync(o.state, { recursive: true });
  const prevFile = latestSnapshot(o.state);
  snap.previous = prevFile ? path.basename(prevFile) : null;
  snap.delta = prevFile ? delta(JSON.parse(fs.readFileSync(prevFile, 'utf8')), snap) : null;

  if (o.save) {
    const f = path.join(o.state, `${snap.generated_at.slice(0, 10)}.json`);
    fs.writeFileSync(f, JSON.stringify(snap, null, 1));
    snap.snapshot_file = f;
    fs.writeFileSync(path.join(o.state, 'latest.json'), JSON.stringify(snap, null, 1));
  }
  if (o.json) fs.writeFileSync(o.json, JSON.stringify(snap, null, 1));
  if (!o.quiet) process.stdout.write(render(snap));
  else if (snap.snapshot_file) console.log(snap.snapshot_file);
  return snap;
}

function blank() {
  return { total: 0, missing: 0, missing_relinkable: 0, missing_unrendered: 0, stale_text: 0, ts_stale: 0, gap_oldest_edit: null, gap_newest_edit: null, by_kind: {},
           // practice = phrase + lego: the rows the learner's walk actually pulls
           // from (cycles.ts). Seed-level audio is a separate track — see notes.
           practice: { total: 0, missing: 0, missing_relinkable: 0, missing_unrendered: 0, stale_text: 0, gap_oldest_edit: null, gap_newest_edit: null },
           seed: { total: 0, missing: 0, missing_relinkable: 0, missing_unrendered: 0, stale_text: 0, gap_oldest_edit: null, gap_newest_edit: null } };
}

function totals(list, threshold) {
  // `pick` chooses which slice of a course's side to sum: the whole side, its
  // practice rows (phrase+lego) or its seed rows.
  const acc = (pred, side, pick = b => b) => list.filter(pred).reduce((s, c) => {
    const b = pick(c[side]);
    return {
      courses: s.courses + 1,
      total: s.total + b.total,
      missing: s.missing + b.missing,
      missing_relinkable: s.missing_relinkable + b.missing_relinkable,
      missing_unrendered: s.missing_unrendered + b.missing_unrendered,
      stale_text: s.stale_text + b.stale_text,
      ts_stale: s.ts_stale + (b.ts_stale || 0),
    };
  }, { courses: 0, total: 0, missing: 0, missing_relinkable: 0, missing_unrendered: 0, stale_text: 0, ts_stale: 0 });
  const rendered = c => c.bucket === 'rendered';
  const building = c => c.bucket === 'building';
  const gapped = c => c.bucket === 'rendered' && (c.known.practice.missing || c.known.practice.stale_text);
  const P = b => b.practice, S = b => b.seed;
  return {
    threshold,
    // THE NUMBER: drift on the learner's practice path in rendered courses.
    headline: acc(gapped, 'known', P),
    seed_track_rendered: acc(rendered, 'known', S),
    rendered_known: acc(rendered, 'known', P),
    building_known: acc(building, 'known', P),
    rendered_target: acc(rendered, 'target', P),
    building_target: acc(building, 'target', P),
    estate_known: acc(() => true, 'known'),
  };
}

function latestSnapshot(dir) {
  if (!fs.existsSync(dir)) return null;
  const f = fs.readdirSync(dir).filter(n => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
  return f.length ? path.join(dir, f[f.length - 1]) : null;
}

/* An INCREASE is the alarm: a rising number means text was edited today and
 * nothing rendered. Decreases are reported too, plainly, because a fall that
 * nobody rendered is also worth knowing about. */
function delta(prev, cur) {
  const p = new Map((prev.courses || []).map(c => [c.course_code, c]));
  const risers = [], fallers = [], appeared = [], bucketMoves = [];
  for (const c of cur.courses) {
    const o = p.get(c.course_code);
    if (!o) { if (c.known.practice.missing || c.known.practice.stale_text) appeared.push({ course_code: c.course_code, missing: c.known.practice.missing, stale_text: c.known.practice.stale_text }); continue; }
    if (o.bucket !== c.bucket) bucketMoves.push({ course_code: c.course_code, from: o.bucket, to: c.bucket });
    // A snapshot written before the practice/seed split has no .practice — treat
    // it as absent rather than comparing undefined and inventing a rise.
    if (!o.known.practice || !o.target.practice) continue;
    const dm = c.known.practice.missing - o.known.practice.missing;
    const ds = c.known.practice.stale_text - o.known.practice.stale_text;
    const dt = c.target.practice.missing - o.target.practice.missing;
    if (dm > 0 || ds > 0 || dt > 0) risers.push({ course_code: c.course_code, known_missing: dm, stale_text: ds, target_missing: dt, now: c.known.practice.missing });
    else if (dm < 0 || ds < 0 || dt < 0) fallers.push({ course_code: c.course_code, known_missing: dm, stale_text: ds, target_missing: dt, now: c.known.practice.missing });
  }
  const h = (s) => (s.totals && s.totals.headline) || {};
  return {
    since: prev.generated_at,
    headline_missing: (h(cur).missing || 0) - (h(prev).missing || 0),
    headline_unrendered: (h(cur).missing_unrendered || 0) - (h(prev).missing_unrendered || 0),
    increased: risers.sort((a, b) => (b.known_missing + b.target_missing) - (a.known_missing + a.target_missing)),
    decreased: fallers,
    new_courses: appeared,
    bucket_moves: bucketMoves,
    alarm: risers.length > 0,
  };
}

function render(s) {
  const t = s.totals, L = [];
  const n = x => Number(x).toLocaleString('en-GB');
  const d10 = v => (v ? new Date(v).toISOString().slice(0, 10) : '-');
  L.push(`TEXT-AHEAD-OF-AUDIO — standing count, ${s.generated_at}`);
  L.push('');
  L.push(`HEADLINE — practice rows (phrase + lego), known side, in courses ${Math.round(s.threshold * 100)}%+ rendered`);
  L.push(`  ${n(t.headline.missing)} prompts have no audio attached, across ${t.headline.courses} courses`);
  L.push(`    ${n(t.headline.missing_unrendered)} never rendered — fixing costs a TTS pass (money)`);
  L.push(`    ${n(t.headline.missing_relinkable)} already have a clip for exactly that text — a relink, free`);
  L.push(`  ${n(t.headline.stale_text)} carry audio whose words no longer match the text`);
  L.push(`  target side, same courses: ${n(t.rendered_target.missing)} missing (${n(t.rendered_target.missing_unrendered)} never rendered)`);
  L.push('');
  L.push('SEPARATE TRACK — seed-level known audio in the same rendered courses');
  L.push(`  ${n(t.seed_track_rendered.missing)} of ${n(t.seed_track_rendered.total)} seed prompts have none. This is NOT drift: estate-wide`);
  L.push('  it stops at a uniform boundary near seed 300, i.e. seed audio was never rendered past it.');
  L.push('');
  L.push(`BUILD BACKLOG — courses below ${Math.round(s.threshold * 100)}% rendered, mid-build, never in the headline`);
  L.push(`  ${n(t.building_known.missing)} known-side practice prompts across ${t.building_known.courses} courses`);
  L.push('');
  L.push(`MEASURED AND REJECTED: ${n(t.estate_known.ts_stale)} rows whose clip predates updated_at but says the right words.`);
  L.push('  updated_at is bumped by bulk passes that never touch the text, so this counts nothing real. Recorded so nobody re-derives it and believes it.');
  L.push('');
  if (s.delta) {
    L.push(`SINCE ${s.delta.since.slice(0, 10)}: headline ${s.delta.headline_missing >= 0 ? '+' : ''}${s.delta.headline_missing}`);
    if (s.delta.alarm) {
      L.push('  INCREASED — text was edited and nothing rendered:');
      for (const r of s.delta.increased.slice(0, 20)) L.push(`    ${r.course_code}: known +${r.known_missing}, target +${r.target_missing}, stale +${r.stale_text} (now ${r.now})`);
    } else L.push('  no course went up.');
    for (const b of s.delta.bucket_moves) L.push(`  bucket move: ${b.course_code} ${b.from} → ${b.to}`);
    L.push('');
  } else L.push('No previous snapshot — this is the baseline.\n');
  L.push('PER COURSE — rendered bucket, known side, practice rows, worst first');
  L.push('  course                 status     missing  unrendered  relinkable  stale  oldest gap edit  seed-track');
  for (const c of s.courses.filter(c => c.bucket === 'rendered' && (c.known.practice.missing || c.known.practice.stale_text))) {
    const k = c.known.practice;
    L.push(`  ${c.course_code.padEnd(22)} ${String(c.status).padEnd(9)} ${String(k.missing).padStart(7)} ${String(k.missing_unrendered).padStart(11)} ${String(k.missing_relinkable).padStart(11)} ${String(k.stale_text).padStart(6)}  ${d10(k.gap_oldest_edit).padEnd(15)}  ${c.known.seed.missing}`);
  }
  L.push('');
  L.push('BUILDING BUCKET — known side, practice rows');
  for (const c of s.courses.filter(c => c.bucket === 'building').sort((a, b) => b.known.practice.missing - a.known.practice.missing)) {
    L.push(`  ${c.course_code.padEnd(22)} ${String(c.status).padEnd(9)} ${String(c.known.practice.missing).padStart(7)} of ${String(c.known.practice.total).padStart(6)}  coverage ${(c.known.practice.coverage * 100).toFixed(1)}%`);
  }
  return L.join('\n') + '\n';
}

if (require.main === module) {
  main().catch(e => { console.error(`count-audio-gap: ${e.message}`); process.exit(2); });
} else {
  module.exports = { main, sql, delta };
}
