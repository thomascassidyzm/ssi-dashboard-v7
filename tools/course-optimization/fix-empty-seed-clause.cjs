#!/usr/bin/env node
/**
 * Repair the empty seed clause in stored presentation text (2026-09-03).
 *
 * The defect: presentation Frame A ("no context sentence") was produced by
 * stripping the "as in — '{seed}'" clause off the Frame B template with a
 * hand-maintained list of LANGUAGE-specific patterns. Templates are generated
 * PER KNOWN LANGUAGE, so any language nobody added to that list fell through,
 * only `{seed}` itself was replaced, and the stored line kept the connector and
 * an EMPTY QUOTED SLOT — spoken aloud to the learner as
 * "अंग्रेज़ी में — 'जानते हैं' — जैसे — '' — में :".
 * `stripSeedClause` was fixed in e4e1964ba; this repairs what is already stored.
 *
 * How the replacement is computed. NOT by re-rendering the whole line from the
 * template: a stored row may have come from a slightly different template
 * revision (eng_for_sin's target-language name is one character off what today's
 * template produces), and a whole-line match silently misses all 697 of those.
 * Instead, old Frame A and fixed Frame A differ by exactly ONE contiguous
 * deletion — the connector plus the empty quote — and we excise that literal
 * chunk from the stored row. Nothing else in the line can change, by
 * construction, and rows rendered from a drifted template are still repaired.
 *
 * Text only. Audio is a separate pass (fix-empty-seed-clause-audio.cjs), so a
 * repaired-text row temporarily keeps its old defective clip — no worse than
 * today, and never a silent slot.
 *
 *   node tools/course-optimization/fix-empty-seed-clause.cjs            # dry run, all courses
 *   node tools/course-optimization/fix-empty-seed-clause.cjs --apply
 *   node tools/course-optimization/fix-empty-seed-clause.cjs --course eng_for_hin --apply
 */
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs')
const presentationAuthor = require('../../services/phases/presentation-author.cjs')

const REPO = path.resolve(__dirname, '../..')
require('dotenv').config({ path: path.join(REPO, '.env') })
const LOG_DIR = path.join(REPO, 'docs/audio-repair-2026-09-03')

// The OLD (defective) Frame A render — the listed patterns, then a bare {seed} wipe.
const SEED_CLAUSE_PATTERNS = / as in — '\{seed\}' —| como en — '\{seed\}' —| comme dans — '\{seed\}' —| wie in — '\{seed\}' —| como em — '\{seed\}' —| come in — '\{seed\}' —| fel yn — '\{seed\}' —| — 「\{seed\}」のように —| — '\{seed\}'처럼 —| كما في — '\{seed\}' —| kaip — '\{seed\}' —| 如「\{seed\}」—|, as in '\{seed\}'|，如"\{seed\}"|, fel yn '\{seed\}'|, como en '\{seed\}'/g

const norm = s => String(s).replace(/\s{2,}/g, ' ').trim()

function oldStrip(template) {
  return template
    .replace(/, as in — '\{seed\}',/g, ',')
    .replace(/, as in '\{seed\}'/g, '')
    .replace(SEED_CLAUSE_PATTERNS, '')
    .replace(/\{seed\}/g, '')
}

/** Repairer for one known-language template, or null if that language strips correctly. */
function buildRepairer(template) {
  const oldT = norm(oldStrip(template))
  const newT = norm(presentationAuthor.stripSeedClause(template))
  if (oldT === newT) return null

  let p = 0
  while (p < newT.length && oldT[p] === newT[p]) p++
  let s = 0
  while (s < newT.length - p && oldT[oldT.length - 1 - s] === newT[newT.length - 1 - s]) s++
  const cut = oldT.slice(p, oldT.length - s)

  // Refuse anything that is not a single deletion of a placeholder-free chunk
  // containing the empty quote slot — that is the whole defect and nothing else.
  if (oldT.slice(0, p) + oldT.slice(oldT.length - s) !== newT) return null
  if (/\{(known|seed|target_lang_name)\}/.test(cut)) return null
  if (!/''|""|「」/.test(cut)) return null

  return {
    oldT, newT, cut,
    match(text) {
      const t = String(text)
      const i = t.indexOf(cut)
      if (i === -1) return null
      if (t.indexOf(cut, i + 1) !== -1) return { ambiguous: true }
      return norm(t.slice(0, i) + t.slice(i + cut.length))
    }
  }
}

async function activeTemplates(sb) {
  const { data, error } = await sb.from('presentation_templates')
    .select('known_lang,template,priority').eq('is_active', true)
    .order('priority', { ascending: false })
  if (error) throw new Error(error.message)
  const m = new Map()
  for (const r of data) if (!m.has(r.known_lang)) m.set(r.known_lang, r.template)
  return m
}

async function presentationRows(sb, course) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('course_audio')
      .select('id,course_code,text,origin,s3_key,lego_id,voice_id')
      .eq('course_code', course).eq('role', 'presentation')
      .order('id').range(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

/** The working queue: every affected row, with its repaired text. */
async function buildQueue(sb, courseFilter) {
  const tpl = await activeTemplates(sb)
  const { data: courses, error } = await sb.from('courses').select('course_code,known_lang,target_lang,voice_config')
  if (error) throw new Error(error.message)
  const out = []
  for (const c of courses.sort((a, b) => a.course_code.localeCompare(b.course_code))) {
    if (courseFilter && c.course_code !== courseFilter) continue
    const t = tpl.get(c.known_lang)
    if (!t) continue
    const rep = buildRepairer(t)
    if (!rep) continue
    const hits = [], ambiguous = [], human = []
    for (const r of await presentationRows(sb, c.course_code)) {
      const fixed = rep.match(r.text)
      if (!fixed) continue
      if (fixed.ambiguous) { ambiguous.push(r); continue }
      if (r.origin === 'human') { human.push(r); continue }   // precious — never touched
      hits.push({ ...r, fixed })
    }
    if (hits.length || ambiguous.length || human.length) {
      out.push({ course: c.course_code, known_lang: c.known_lang, cut: rep.cut, hits, ambiguous, human })
    }
  }
  return out
}

async function main() {
  const apply = process.argv.includes('--apply')
  const ci = process.argv.indexOf('--course')
  const courseFilter = ci !== -1 ? process.argv[ci + 1] : null

  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const queue = await buildQueue(sb, courseFilter)
  fs.mkdirSync(LOG_DIR, { recursive: true })

  let totalChanged = 0, totalSkipped = 0
  for (const c of queue) {
    const log = []
    // The before-state assertion IS the update predicate: id + the exact text we
    // scanned + origin<>human. If the row moved under us it matches nothing, and
    // a zero-row result aborts the run rather than writing over a change we
    // never read.
    const writeOne = async (h) => {
      if (!apply) return { id: h.id, lego_id: h.lego_id, before: h.text, after: h.fixed }
      const { data, error } = await sb.from('course_audio')
        .update({ text: h.fixed, text_normalized: normalizeForAudio(h.fixed) })
        .eq('id', h.id).eq('text', h.text).neq('origin', 'human')
        .select('id')
      if (error) throw new Error(`update ${h.id}: ${error.message}`)
      if (!data || data.length !== 1) throw new Error(`DRIFT on ${h.id}: before-state no longer matches — aborting`)
      return { id: h.id, lego_id: h.lego_id, before: h.text, after: h.fixed }
    }
    const CONCURRENCY = 6
    for (let i = 0; i < c.hits.length; i += CONCURRENCY) {
      log.push(...await Promise.all(c.hits.slice(i, i + CONCURRENCY).map(writeOne)))
    }
    totalChanged += log.length
    totalSkipped += c.ambiguous.length + c.human.length
    const file = path.join(LOG_DIR, `${c.course}-seedclause-text-${apply ? 'applied' : 'dryrun'}-log.json`)
    fs.writeFileSync(file, JSON.stringify({
      course: c.course, known_lang: c.known_lang, excised: c.cut,
      changed: log.length,
      skipped_ambiguous: c.ambiguous.map(r => ({ id: r.id, text: r.text })),
      skipped_human: c.human.map(r => ({ id: r.id, text: r.text })),
      rows: log
    }, null, 1))
    console.log(`${c.course}\t${log.length}\tskipped=${c.ambiguous.length + c.human.length}\t→ ${path.basename(file)}`)
  }
  console.log(`\n${apply ? 'APPLIED' : 'DRY RUN'}: ${totalChanged} rows across ${queue.length} courses; ${totalSkipped} skipped`)
  if (totalChanged === 0) { console.error('No rows to change — exiting non-zero so a bulk caller stops.'); process.exit(1) }
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1) })
module.exports = { buildRepairer, buildQueue, oldStrip }
