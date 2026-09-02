#!/usr/bin/env node
/**
 * Duplicate a real course's teaching layer into the zzz test course, so the
 * recording booth has something to read.
 *
 * Tom, 2026-09-02: "can we IMPORT the English for Spanish speakers BOTH English
 * and Spanish into this test course - just duplicate it - because I can record
 * the English AND the Spanish minimal pairs and see how it goes"
 *
 * Source (eng_for_spa) is READ-ONLY. The pair is loaded SWAPPED: the test course
 * is known_lang=eng, so English lands on the known side and Spanish becomes the
 * target — which keeps the course code (..._for_eng) honest and makes Spanish
 * recordable through the existing target1 path with no code change.
 *
 * Direct DB writes on purpose: this is a straight copy, and the course-builder
 * submission API would validate and reshape it.
 *
 * Idempotent: the destination's legos/phrases in the seed range are cleared and
 * rewritten on every run, so re-running never duplicates rows.
 *
 *   node tools/course-optimization/duplicate-course-teaching-layer-2026-09-02.cjs --max-seed 30
 *   node tools/course-optimization/duplicate-course-teaching-layer-2026-09-02.cjs --max-seed 30 --apply
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const SRC = 'eng_for_spa'
const DEST = 'zzz_test2_for_eng'

// Hard guard: this tool only ever writes to the test course.
if (DEST !== 'zzz_test2_for_eng') throw new Error('destination guard')

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const maxSeedArg = args.indexOf('--max-seed')
const MAX_SEED = maxSeedArg >= 0 ? parseInt(args[maxSeedArg + 1], 10) : null

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const swapComponents = (c) =>
  Array.isArray(c) ? c.map((x) => ({ ...x, known: x?.target ?? '', target: x?.known ?? '' })) : c

const swapDecomposition = (d) =>
  Array.isArray(d) ? d.map((x) => ({ ...x, known: x?.target ?? '', target: x?.known ?? '' })) : null

async function fetchAll(table, courseCode, columns) {
  const out = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    let q = sb.from(table).select(columns).eq('course_code', courseCode).order('seed_number').order('id')
    if (MAX_SEED) q = q.lte('seed_number', MAX_SEED)
    const { data, error } = await q.range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...data)
    if (data.length < PAGE) break
  }
  return out
}

async function insertChunked(table, rows) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from(table).insert(rows.slice(i, i + 500))
    if (error) throw new Error(`${table} insert @${i}: ${error.message}`)
  }
}

;(async () => {
  const seeds = await fetchAll('course_seeds', SRC, 'seed_number,seed_id,known_text,target_text')
  const legos = await fetchAll('course_legos', SRC,
    'seed_number,lego_index,lego_id,type,is_new,known_text,target_text,components,status')
  const phrases = await fetchAll('course_practice_phrases', SRC,
    'id,seed_number,lego_index,position,known_text,target_text,word_count,lego_count,metadata,status,phrase_role,connected_lego_ids,lego_id,introduce,decomposition')

  // SWAP: source target (English) -> dest known; source known (Spanish) -> dest target.
  const seedRows = seeds.map((s) => ({
    seed_number: s.seed_number,
    known_text: s.target_text,
    target_text: s.known_text,
  }))
  const legoRows = legos.map((l) => ({
    course_code: DEST,
    seed_number: l.seed_number,
    lego_index: l.lego_index,
    // lego_id is a generated column in course_legos — never inserted.
    type: l.type,
    is_new: l.is_new,
    known_text: l.target_text,
    target_text: l.known_text,
    components: swapComponents(l.components),
    status: 'draft',
  }))
  const phraseRows = phrases.map((p) => ({
    id: `${DEST}:${String(p.id).split(':').pop()}`,
    course_code: DEST,
    seed_number: p.seed_number,
    lego_index: p.lego_index,
    position: p.position,
    known_text: p.target_text,
    target_text: p.known_text,
    word_count: p.word_count,
    lego_count: p.lego_count,
    metadata: p.metadata,
    status: 'draft',
    phrase_role: p.phrase_role,
    connected_lego_ids: p.connected_lego_ids,
    lego_id: p.lego_id,
    introduce: p.introduce,
    decomposition: swapDecomposition(p.decomposition),
  }))

  const log = {
    ranAt: new Date().toISOString(),
    mode: APPLY ? 'applied' : 'dryrun',
    source: SRC,
    destination: DEST,
    maxSeed: MAX_SEED,
    counts: { seedsUpdated: seedRows.length, legos: legoRows.length, phrases: phraseRows.length },
    sample: { seed: seedRows[0], lego: legoRows[0], phrase: phraseRows[0] },
  }

  if (APPLY) {
    // Clear the destination's teaching layer in range, then rewrite it.
    let dl = sb.from('course_legos').delete().eq('course_code', DEST)
    let dp = sb.from('course_practice_phrases').delete().eq('course_code', DEST)
    if (MAX_SEED) { dl = dl.lte('seed_number', MAX_SEED); dp = dp.lte('seed_number', MAX_SEED) }
    // Phrases first: course_practice_phrases carries a FK onto course_legos.
    const e2 = (await dp).error; if (e2) throw new Error(`phrase delete: ${e2.message}`)
    const e1 = (await dl).error; if (e1) throw new Error(`lego delete: ${e1.message}`)

    await insertChunked('course_legos', legoRows)
    await insertChunked('course_practice_phrases', phraseRows)

    // Seed text: overwrite the placeholder canonical seeds with the real pair.
    // Audio ids are cleared because they point at takes of the old Zzz text;
    // the clips themselves are left alone.
    for (const s of seedRows) {
      const { error } = await sb.from('course_seeds')
        .update({ known_text: s.known_text, target_text: s.target_text,
                  known_audio_id: null, target1_audio_id: null, target2_audio_id: null })
        .eq('course_code', DEST).eq('seed_number', s.seed_number)
      if (error) throw new Error(`seed ${s.seed_number}: ${error.message}`)
    }
  }

  const suffix = APPLY ? 'applied' : 'dryrun'
  const file = path.join(__dirname,
    `duplicate-course-teaching-layer-2026-09-02-${MAX_SEED || 'all'}-${suffix}-log.json`)
  fs.writeFileSync(file, JSON.stringify(log, null, 2))
  console.log(JSON.stringify(log.counts), '->', file)
})().catch((e) => { console.error(e.message); process.exit(1) })
