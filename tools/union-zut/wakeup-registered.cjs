#!/usr/bin/env node
/**
 * DID THE UNION-ZUT GATE WAKE UP? READ-ONLY. No injected registry rows anywhere
 * in this file — every family resolution below reads `course_sectors` LIVE from
 * the database, so what is being tested is the 2026-09-01 REGISTRATION, not a
 * fixture standing in for one.
 *
 * THE SEGMENT SIDE (spa_health_for_eng) IS A LABELLED STAND-IN THROUGHOUT: no
 * sector seed exists anywhere in the estate. `course_sectors` now holds a real
 * row naming that course code, but the course_legos/course_practice_phrases
 * tables hold ZERO rows for it. Every line below that touches the segment says
 * so explicitly. Do not read any of this as attested sector content.
 *
 * Run: node tools/union-zut/wakeup-registered.cjs
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const V = require('../../services/course-builder/lib/validation.cjs');
const F = require('../../services/course-builder/lib/course-family.cjs');

const BASE = 'spa_for_eng', SEG = 'spa_health_for_eng';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  console.log('='.repeat(78));
  console.log('1. THE REGISTRY ROW, READ LIVE (not injected)');
  console.log('='.repeat(78));
  const { data: rows, error: rowsErr } = await sb.from('course_sectors').select('*');
  if (rowsErr) throw new Error(rowsErr.message);
  console.log(JSON.stringify(rows, null, 2));

  console.log('\n' + '='.repeat(78));
  console.log('2. resolveCourseFamily(sb, ...) — LIVE reads, no opts.rows injection');
  console.log('='.repeat(78));
  const famBase = await F.resolveCourseFamily(sb, BASE);
  console.log(`\nresolveCourseFamily(sb, '${BASE}') [the BASE course]:`);
  console.log(JSON.stringify(famBase, null, 2));

  const famSeg = await F.resolveCourseFamily(sb, SEG);
  console.log(`\nresolveCourseFamily(sb, '${SEG}') [the STAND-IN segment code — no content exists for it anywhere]:`);
  console.log(JSON.stringify(famSeg, null, 2));

  console.log('\n' + '='.repeat(78));
  console.log('3. THE BEFORE — same call, registry FORCED EMPTY ({ rows: [] })');
  console.log('   This is the exact path every one of the ~130 other live courses');
  console.log('   still takes today: no row for them, so this is a real comparison,');
  console.log('   not a re-enactment of history.');
  console.log('='.repeat(78));
  const before = await F.resolveCourseFamily(sb, SEG, { rows: [] });
  console.log(`resolveCourseFamily(sb, '${SEG}', { rows: [] }) => ${JSON.stringify(before)}`);
  console.log(before === null
    ? '  => null: with an empty registry the segment code resolves to NO family — this IS what "armed and inert" looked like before 2026-09-01.'
    : '  => UNEXPECTED: should be null');

  console.log('\n' + '='.repeat(78));
  console.log('4. THE CROSS-FAMILY CASE — a candidate STAND-IN segment submission');
  console.log('   colliding with a REAL, LIVE spa_for_eng mapping, PAST the anchor');
  console.log('='.repeat(78));
  console.log(`Anchor for ${SEG}: ${famSeg.anchor ? JSON.stringify(famSeg.anchor) : 'null'} (parsed from core_anchor_lego_id "${rows[0].core_anchor_lego_id}")`);

  const { data: liveYou, error: youErr } = await sb.from('course_legos')
    .select('lego_id,seed_number,lego_index,known_text,target_text')
    .eq('course_code', BASE).eq('known_text', 'you').eq('seed_number', 639).eq('lego_index', 2);
  if (youErr) throw new Error(youErr.message);
  if (!liveYou.length) throw new Error('S0639L02 "you" no longer live in spa_for_eng — pick another collision row');
  console.log(`\nLIVE ${BASE} row confirmed still present: ${liveYou[0].lego_id}  "you" -> "${liveYou[0].target_text}"  (seed 639, well past anchor seed 1)`);

  console.log(`\nCANDIDATE (STAND-IN, unauthored, illustrative only — no such row exists in`);
  console.log(`${SEG} or anywhere else): the health segment mints "you" -> "vosotros" at its own seed 20.`);

  // Overlay wrapper: runs the REAL query chain against the REAL DB, then splices
  // in exactly one stand-in row for the candidate segment submission, so the
  // gate's own SQL path executes for real and only the segment's non-existent
  // content is synthetic. Labelled at every print site above and below.
  function overlayOneRow(client, table, extraRow) {
    return { from: (t) => {
      const q = client.from(t);
      if (t !== table) return q;
      const wrap = (b) => new Proxy(b, { get(tgt, k) {
        if (k === 'then') return (res, rej) => Promise.resolve(tgt).then(r => {
          const rows2 = (r.data || []).concat(matches(extraRow) ? [extraRow] : []);
          return { ...r, data: rows2 };
        }).then(res, rej);
        const v = tgt[k];
        if (typeof v !== 'function') return v;
        return (...a) => { const out = v.apply(tgt, a); rec(k, a); return out === tgt ? wrap(tgt) : (out && out.then ? out : wrap(out)); };
      }});
      const list = [];
      function rec(k, a) { list.push([k, a]); }
      function matches(row) {
        return list.every(([k, a]) => {
          if (k === 'eq') return row[a[0]] === a[1];
          if (k === 'lt') return row[a[0]] < a[1];
          if (k === 'lte') return row[a[0]] <= a[1];
          if (k === 'in') return a[1].includes(row[a[0]]);
          return true;
        });
      }
      return wrap(q);
    }};
  }
  const STANDIN_ROW = { course_code: SEG, seed_number: 20, lego_index: 1, known_text: 'you', target_text: 'vosotros', type: 'A' };
  const sbOverlay = overlayOneRow(sb, 'course_legos', STANDIN_ROW);

  const beforeResult = await V.checkLegoConflict(sbOverlay, SEG, 'you', 'vosotros', 21);
  console.log(`\nBEFORE (no family arg passed — the path an unregistered course takes):`);
  console.log(`  ${JSON.stringify(beforeResult)}`);

  const afterResult = await V.checkLegoConflict(sbOverlay, SEG, 'you', 'vosotros', 21, { family: famSeg });
  console.log(`\nAFTER  (family arg = LIVE resolveCourseFamily result from step 2):`);
  console.log(`  conflict = ${afterResult.conflict}`);
  if (afterResult.error) console.log(`  message  = "${afterResult.error}"`);
  if (afterResult.existing) for (const e of afterResult.existing)
    console.log(`  existing:  ${e.legoId} "${e.target}"${e.courseCode ? '  <- from course ' + e.courseCode : ''}`);

  console.log('\n' + '='.repeat(78));
  console.log('5. SCOPE CHECK — the collision is PAST the anchor (unbounded ZUT)');
  console.log('='.repeat(78));
  console.log(`Anchor: seed ${famSeg.anchor.seed_number}, lego ${famSeg.anchor.lego_index}.`);
  console.log(`Collision row: spa_for_eng seed 639 (>> anchor seed ${famSeg.anchor.seed_number}).`);
  console.log('The gate still catches it: ZUT is family-wide and unbounded in both');
  console.log('directions; only AVAILABILITY (tools/frame-layer/union.cjs) is anchor-bounded.');
  console.log('This run does not exercise availability — it exercises the ZUT gate only.');

  console.log('\n' + '='.repeat(78));
  console.log('VERDICT');
  console.log('='.repeat(78));
  const woke = famBase !== null && famSeg !== null && before === null
    && beforeResult.conflict === false && afterResult.conflict === 'zut'
    && /spa_for_eng/.test(afterResult.error || '');
  console.log(woke
    ? 'THE GATE WOKE UP: the same code, the same call sites, now see a family for\n' +
      'spa_for_eng / spa_health_for_eng that they saw as null before the registry\n' +
      'row existed, purely because the row now exists. No code changed to produce\n' +
      'this run versus what would have run on 2026-08-31.'
    : 'DID NOT WAKE UP — see the raw output above for where the chain broke.');
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
