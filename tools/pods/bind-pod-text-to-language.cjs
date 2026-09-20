#!/usr/bin/env node
/**
 * bind-pod-text-to-language.cjs — give each TARGET LANGUAGE one pod text, and bind
 * every pod of that language to it so it can never fork again.
 *
 * Tom's ruling, 2026-09-20 16:34Z: "All pods will be exactly the same for the language.
 * It's completely unacceptable to have lots of different versions of the language."
 * And his refinement: "The canonical already is there as a canonical course. It just
 * happens to be expressed in English."
 *
 * SO THIS TOOL IS NOT AN ADJUDICATION BETWEEN RIVAL COURSE COPIES. There is one
 * canonical 231-line story (canonical_pod_scenarios, pod_slug 'pod-1', variant_key
 * NULL, in English) and one translation of it per language. A course's copy is a
 * CANDIDATE translation; it earns the language slot by being a clean translation of
 * the canonical story, and where several courses hold one it is because they were
 * cloned from each other, not because the language was translated twice.
 *
 * WHAT IT WRITES, in one transaction per language:
 *   1. canonical_pod_target_text — 231 rows for the language, each joined to the
 *      canonical English line it translates (by global_order, stored as canonical_id).
 *   2. listening_pods.canonical_lang_text = true for every pod of that language whose
 *      text ALREADY matches those rows line for line. A pod that differs is NAMED and
 *      left unbound — binding never rewrites a pod (the DB trigger refuses it too).
 *
 * WHAT IT DOES NOT DO. It does not flip any course's serving pod, does not touch
 * known_text, does not delete or replace anybody's words, and renders no audio.
 * Re-keying the store and changing what a learner hears are two different acts; the
 * second one goes through tools/pods/pod-switchover.cjs with its progress migration.
 *
 * WHERE THE LANGUAGE'S WORDS COME FROM, in order (chooseLanguageSource below):
 *   - the language's <lang>_for_eng course, when it holds the canonical-length story.
 *     English is the source language and that course is the most-read copy.
 *   - for ENGLISH itself there is no eng_for_eng: any eng_for_* slate will do, and all
 *     16 are byte-identical, which is why English is the safe pilot for this shape.
 *   - failing both, the one course that has the story at all — ADOPTED, not derived,
 *     and reported as such so a human can overrule it. Catalan on 2026-09-20 is the
 *     only case: cat_for_spa holds the only 231-line Catalan in existence and
 *     cat_for_eng is still on the older, shorter slate.
 *
 * DRY RUN BY DEFAULT. --apply writes.
 *   node tools/pods/bind-pod-text-to-language.cjs                 # plan, whole estate
 *   node tools/pods/bind-pod-text-to-language.cjs --lang=eng      # one language
 *   node tools/pods/bind-pod-text-to-language.cjs --lang=eng --apply
 */
'use strict'

const path = require('path')
const { Client } = require('pg')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')

/** The canonical story's slug. Not a course pod's slug: the staged slate and the live
 *  one are the same story and share one canon. */
const CANON_SLUG = 'pod-1'

/** THE LANGUAGE KEY. Deliberately the same expression as targetLangFromCourseCode() in
 *  services/voice-engine/voice-slots.cjs and poolKeysForCourse() in tools/pod-sync.cjs:
 *  regional variants ARE distinct languages — spa vs spa_mx, cym_n vs cym_s, fra vs
 *  fra_ca — and collapsing them to an ISO prefix would merge texts Tom keeps apart. */
function targetLang (courseCode) {
  return String(courseCode || '').split('_for_')[0]
}

/**
 * PURE. Which course's copy becomes this language's text, and why.
 *
 * @param {string} lang
 * @param {Array<{course_code:string, slug:string, rows:number}>} pods  pods of this language
 * @param {number} canonRows  how many lines the canonical English story has
 * @returns {{course_code:string, slug:string, reason:string, adopted:boolean}|{blocked:string}}
 */
function chooseLanguageSource (lang, pods, canonRows) {
  const full = (pods || []).filter(p => p.rows === canonRows)
  if (!full.length) {
    return { blocked: `no pod of ${lang} holds the canonical ${canonRows}-line story (have: ${(pods || []).map(p => `${p.course_code}:${p.slug}=${p.rows}`).join(', ') || 'none'})` }
  }
  const forEng = full.filter(p => p.course_code.endsWith('_for_eng'))
  if (forEng.length) {
    const pick = forEng.sort(byLiveFirst)[0]
    return { ...pick, adopted: false, reason: `${pick.course_code} is the language's *_for_eng course — English is the source and that copy is the most read` }
  }
  if (lang === 'eng') {
    const pick = full.sort(byCourse)[0]
    return { ...pick, adopted: false, reason: `English has no eng_for_eng; the ${full.length} eng_for_* slates are byte-identical, so ${pick.course_code} stands for all of them` }
  }
  const pick = full.sort(byLiveFirst)[0]
  return {
    ...pick,
    adopted: true,
    reason: `${lang} has no *_for_eng copy of the story — ${pick.course_code}:${pick.slug} is ADOPTED as the language's text rather than derived from the canonical English, and wants a human ruling`,
  }
}

// A live serving slate outranks a staged one when both are the full story: it is the
// text that has already been read, cast and in some languages recorded.
const byLiveFirst = (a, b) => (a.slug === CANON_SLUG ? 0 : 1) - (b.slug === CANON_SLUG ? 0 : 1) || byCourse(a, b)
const byCourse = (a, b) => (a.course_code < b.course_code ? -1 : a.course_code > b.course_code ? 1 : 0)

/**
 * PURE. Given every bound-candidate pod's lines for one language, which pods agree with
 * the chosen text and which do not. The tool binds the first list and names the second.
 *
 * @param {Map<number,string>} canon           global_order -> target_text
 * @param {Array<{course_code:string, slug:string, lines:Map<number,string>}>} pods
 */
function splitByAgreement (canon, pods) {
  const agree = []
  const differ = []
  for (const pod of pods) {
    if (pod.lines.size !== canon.size) { differ.push({ ...pod, diffs: null, why: `${pod.lines.size} lines vs the canon's ${canon.size}` }); continue }
    let diffs = 0
    for (const [order, text] of canon) if (pod.lines.get(order) !== text) diffs++
    if (diffs === 0) agree.push(pod)
    else differ.push({ ...pod, diffs, why: `${diffs} line(s) differ from the language text` })
  }
  return { agree, differ }
}

async function main () {
  require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
  const APPLY = process.argv.includes('--apply')
  const only = (process.argv.find(a => a.startsWith('--lang=')) || '').split('=')[1] || null

  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  try {
    const canonRowsQ = await db.query(
      `SELECT id, global_order FROM canonical_pod_scenarios
        WHERE pod_slug = $1 AND variant_key IS NULL AND global_order IS NOT NULL
        ORDER BY global_order`, [CANON_SLUG])
    const canonIds = new Map(canonRowsQ.rows.map(r => [Number(r.global_order), r.id]))
    const canonRows = canonIds.size
    if (!canonRows) throw new Error(`canonical_pod_scenarios has no ${CANON_SLUG} story`)
    console.log(`canonical story: ${canonRows} lines (${CANON_SLUG})\n`)

    const podsQ = await db.query(
      `SELECT p.id, p.course_code, p.slug, p.canonical_lang_text, count(s.*)::int rows
         FROM listening_pods p JOIN listening_pod_sentences s ON s.pod_id = p.id
        WHERE p.slug IN ($1, $1 || '-' || $2) AND (p.pod_type IS NULL OR p.pod_type = 'core')
          AND p.course_code NOT LIKE 'zzz%'
        GROUP BY 1,2,3,4 ORDER BY p.course_code, p.slug`, [CANON_SLUG, String(canonRows)])

    const byLang = new Map()
    for (const p of podsQ.rows) {
      const lang = targetLang(p.course_code)
      if (only && lang !== only) continue
      if (!byLang.has(lang)) byLang.set(lang, [])
      byLang.get(lang).push(p)
    }

    const identity = serviceIdentity('tools/pods/bind-pod-text-to-language.cjs', { role: 'content-editor' })
    let bound = 0; let blocked = 0

    for (const [lang, pods] of [...byLang].sort((a, b) => byCourse({ course_code: a[0] }, { course_code: b[0] }))) {
      const source = chooseLanguageSource(lang, pods, canonRows)
      if (source.blocked) { console.log(`${lang}: SKIPPED — ${source.blocked}`); blocked++; continue }

      const src = pods.find(p => p.course_code === source.course_code && p.slug === source.slug)
      const srcLines = (await db.query(
        `SELECT global_order, target_text, coalesce(target_text_draft,false) draft
           FROM listening_pod_sentences WHERE pod_id = $1 ORDER BY global_order`, [src.id])).rows
      const canon = new Map(srcLines.map(r => [Number(r.global_order), r.target_text]))

      const candidates = []
      for (const p of pods) {
        const lines = (await db.query(
          `SELECT global_order, target_text FROM listening_pod_sentences WHERE pod_id = $1`, [p.id])).rows
        candidates.push({ ...p, lines: new Map(lines.map(r => [Number(r.global_order), r.target_text])) })
      }
      const { agree, differ } = splitByAgreement(canon, candidates)
      const drafts = srcLines.filter(r => r.draft).length

      console.log(`${lang}: text from ${source.course_code}:${source.slug}${source.adopted ? '  [ADOPTED — wants a ruling]' : ''}`)
      console.log(`   ${source.reason}`)
      if (drafts) console.log(`   ${drafts} of ${canonRows} lines are still flagged draft — they stay flagged, so nothing renders off unread text`)
      console.log(`   binds ${agree.length} pod(s): ${agree.map(p => `${p.course_code}:${p.slug}`).join(', ')}`)
      if (differ.length) console.log(`   LEAVES UNBOUND ${differ.length}: ${differ.map(p => `${p.course_code}:${p.slug} (${p.why})`).join(', ')}`)

      if (!APPLY) { console.log('') ; continue }

      await db.query('BEGIN')
      try {
        for (const r of srcLines) {
          const cid = canonIds.get(Number(r.global_order))
          if (!cid) throw new Error(`${lang} line ${r.global_order} has no canonical English line to translate`)
          await db.query(
            `INSERT INTO canonical_pod_target_text
               (pod_slug, target_lang, global_order, canonical_id, target_text, target_text_draft, adopted_from)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             ON CONFLICT (pod_slug, target_lang, global_order) DO UPDATE
               SET target_text = EXCLUDED.target_text,
                   target_text_draft = EXCLUDED.target_text_draft,
                   canonical_id = EXCLUDED.canonical_id,
                   adopted_from = EXCLUDED.adopted_from`,
            [CANON_SLUG, lang, Number(r.global_order), cid, r.target_text, r.draft, `${source.course_code}:${source.slug}`])
        }
        for (const p of agree) {
          if (p.canonical_lang_text) continue
          await db.query(`UPDATE listening_pods SET canonical_lang_text = true WHERE id = $1`, [p.id])
          await db.query(
            `INSERT INTO content_edit_events
               (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [p.course_code, 'tools/pods/bind-pod-text-to-language.cjs', 'pod-bind-language-text',
              identity.kind, String(identity.id), String(identity.label), identity.verified, identity.role || null,
              { pod_id: p.id, lines: canonRows },
              { target_lang: lang, text_from: `${source.course_code}:${source.slug}`, adopted: !!source.adopted }])
          bound++
        }
        await db.query('COMMIT')
        console.log('   applied.\n')
      } catch (e) {
        await db.query('ROLLBACK')
        throw e
      }
    }

    console.log(APPLY ? `\nbound ${bound} pod(s); ${blocked} language(s) skipped` : `\nDRY RUN — nothing written. ${blocked} language(s) would be skipped. Pass --apply.`)
  } finally {
    await db.end()
  }
}

if (require.main === module) main().catch(e => { console.error(`FAILED: ${e.message}`); process.exit(1) })

module.exports = { targetLang, chooseLanguageSource, splitByAgreement, CANON_SLUG }
