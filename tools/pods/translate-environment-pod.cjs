#!/usr/bin/env node
/**
 * translate-environment-pod — ONE translation of the ONE canonical English Environment pod
 * (Tom and Aran, 545 lines, "as recorded, unpolished") per target language, TEXT ONLY.
 *
 * Tom's rules, all binding (2026-09-20 one-text-per-language; 2026-09-30 advanced pods):
 *   - one text per language, derived from the canonical English, never chosen among course copies;
 *   - machine translation is trusted, no proofread gate;
 *   - no audio, no TTS, no schema change, nothing serves — this only writes the store.
 *
 * STORE. The canonical English lives in canonical_pod_scenarios (pod_slug = SLUG), seeded once from
 * the English known side of the live ita_for_eng pod (which is Tom's checked transcript, keeping
 * Aran's "Menai Straits"). Each language's translation lives in canonical_pod_target_text, keyed
 * (pod_slug, target_lang) — the same language-keyed store pod-1 uses. Italian, already made and
 * kept, is ADOPTED into that store verbatim (adopted_from), never re-translated.
 *
 * CHECKPOINTED PER LANGUAGE: a language is written in one transaction only when all lines came
 * back one-to-one; a language that already has rows is skipped, so a re-run never re-translates.
 *
 *   node tools/pods/translate-environment-pod.cjs --status
 *   node tools/pods/translate-environment-pod.cjs --langs=spa,fra,deu            # dry: translates nothing, shows plan
 *   node tools/pods/translate-environment-pod.cjs --langs=spa,fra,deu --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const { Client } = require('pg')
const { claudeChat } = require('../../services/shared/claude-cli.cjs')

const SLUG = 'environment-conversation'
const SOURCE_POD = 'ita_for_eng:environment-conversation'
// The premium "big ten" targets (packages/core/src/pricing/access.ts BIG_10); eng is the source.
// Order is the schedule's wave order; Arabic is last (Aran leads Arabic).
const BIG_TEN_TARGETS = ['ita', 'spa', 'fra', 'deu', 'por', 'zho', 'jpn', 'kor', 'ara']
// Job #263 (Tom 2026-10-01): the 16 further pod-1 languages/variants. 'eng' is the canonical English copied verbatim,
// exactly as pod-1 did (its eng rows equal english_text). Same store, same shape, same adopted_from=NULL as the big ten.
const EXTRA_TARGETS = ['cat', 'cym_n', 'cym_s', 'eus', 'fra_ca', 'gle', 'hin', 'hrv', 'isl', 'nld', 'ron', 'spa_mx', 'swe', 'por_br', 'ara_eg', 'eng']
const ALL_TARGETS = [...BIG_TEN_TARGETS, ...EXTRA_TARGETS]
const LANG_NAME = {
  spa: 'Spanish (neutral Castilian-leaning, European)', fra: 'French (France)', deu: 'German (standard, informal du)',
  por: 'Portuguese (European)', zho: 'Chinese (Simplified, Mandarin, natural spoken register)',
  jpn: 'Japanese (natural spoken register, no romaji)', kor: 'Korean (natural informal-polite speech, 해요체)',
  ara: 'Arabic (Modern Standard Arabic, conversational tone, Arabic script)',
  cat: 'Catalan (standard, natural spoken register)',
  cym_n: 'North Walian Welsh (Cymraeg y Gogledd: use northern forms such as "dw i", "rwyt ti"/"ti", "gen i", "mae gen i", "isio", "(dd)im", "rŵan", "lle" and northern vocabulary and pronunciation-led spellings; natural spoken register, informal ti)',
  cym_s: 'South Walian Welsh (Cymraeg y De: use southern forms such as "'+"'da fi"+'", "moyn"/"ishe", "nawr", "fi'+"'n"+'", "chi/ti", "gwd", "mas", "lan", "'+"'na"+'" and southern vocabulary; natural spoken register, informal ti; deliberately different from the northern form wherever the dialects differ)',
  eus: 'Basque (Euskara Batua, natural spoken register, standard zu forms, no hika)',
  fra_ca: 'Canadian French (Quebec; natural Québécois spoken register, Quebec vocabulary and idiom, tu-form)',
  gle: 'Irish (Gaeilge, standard Caighdeán with natural spoken register)',
  hin: 'Hindi (Devanagari script, natural spoken register, informal tum/tu-neutral, common English loanwords kept where natural)',
  hrv: 'Croatian (standard, natural spoken register)',
  isl: 'Icelandic (natural spoken register)',
  nld: 'Dutch (Netherlands, natural spoken register, informal je/jij)',
  ron: 'Romanian (natural spoken register, informal tu)',
  spa_mx: 'Mexican Spanish (natural Mexican spoken register and vocabulary, tú, ustedes not vosotros)',
  swe: 'Swedish (natural spoken register, informal du)',
  por_br: 'Brazilian Portuguese (natural Brazilian spoken register and vocabulary, você/tu-neutral, gerund forms)',
  ara_eg: 'Egyptian Arabic (Masri colloquial, Arabic script, natural spoken Cairene register; NOT Modern Standard Arabic)',
}
const CHUNK = 45
const arg = (n) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : null }
const APPLY = process.argv.includes('--apply')

async function ensureCanon (db) {
  const have = await db.query('select count(*)::int n from canonical_pod_scenarios where pod_slug=$1', [SLUG])
  if (have.rows[0].n > 0) return have.rows[0].n
  const src = await db.query(
    `select scene_number, sentence_number, global_order, speaker, known_text, target_text
       from listening_pod_sentences where pod_id=$1 order by global_order`, [SOURCE_POD])
  if (!src.rowCount) throw new Error(`source pod ${SOURCE_POD} has no sentences`)
  if (!APPLY) return 0
  await db.query('begin')
  try {
    for (const r of src.rows) {
      await db.query(
        `insert into canonical_pod_scenarios (id, pod_slug, scene_number, scene_label, scene_title, sentence_number, global_order, speaker, english_text, difficulty)
         values ($1,$2,$3,'Chapter 1','Tom and Aran talk about the environment',$4,$5,$6,$7,'advanced')`,
        [`${SLUG}:SC${String(r.scene_number).padStart(2, '0')}-S${String(r.sentence_number).padStart(3, '0')}`, SLUG, r.scene_number, r.sentence_number, r.global_order, r.speaker, r.known_text])
    }
    await db.query(
      `insert into canonical_pod_target_text (pod_slug, target_lang, global_order, canonical_id, target_text, adopted_from)
       select $1,'ita', s.global_order, c.id, s.target_text, $2
         from listening_pod_sentences s join canonical_pod_scenarios c on c.pod_slug=$1 and c.global_order=s.global_order
        where s.pod_id=$2`, [SLUG, SOURCE_POD])
    await db.query('commit')
  } catch (e) { await db.query('rollback'); throw e }
  return src.rowCount
}

async function langCounts (db) {
  const r = await db.query('select target_lang, count(*)::int n from canonical_pod_target_text where pod_slug=$1 group by 1', [SLUG])
  return Object.fromEntries(r.rows.map(x => [x.target_lang, x.n]))
}

function buildPrompt (lang, rows, prev) {
  const ctx = prev.length ? `Preceding lines, for context only (do NOT translate):\n${prev.map(r => `${r.global_order}. [${r.speaker}] ${r.english_text}`).join('\n')}\n\n` : ''
  return `You are translating a spoken two-host podcast conversation (hosts Tom and Aran, two men talking informally about the environment) from English into ${LANG_NAME[lang]}.
Rules: translate each numbered line faithfully and naturally as speech; keep it unpolished like the English (hesitations, half-sentences stay half-sentences); keep proper names (Menai Straits, Tom, Aran) as they are or in their standard local form; one output line per input line, never merge or split lines; no notes, no parentheses added, no explanations.
Output ONLY a JSON array of exactly ${rows.length} strings, in input order, nothing else.

${ctx}Lines to translate:
${rows.map(r => `${r.global_order}. [${r.speaker}] ${r.english_text}`).join('\n')}`
}

async function translateLang (lang, canon) {
  const out = []
  for (let i = 0; i < canon.length; i += CHUNK) {
    const rows = canon.slice(i, i + CHUNK)
    const prev = canon.slice(Math.max(0, i - 6), i)
    let arr = null
    for (let attempt = 1; attempt <= 3 && !arr; attempt++) {
      const raw = await claudeChat(buildPrompt(lang, rows, prev), { model: 'sonnet', timeout: 600000 })
      const m = raw.match(/\[[\s\S]*\]/)
      try {
        const p = m && JSON.parse(m[0])
        if (Array.isArray(p) && p.length === rows.length && p.every(s => typeof s === 'string' && s.trim())) arr = p
      } catch { /* retry */ }
      if (!arr) console.error(`[${lang}] chunk ${i} attempt ${attempt}: not one-to-one, retrying`)
    }
    if (!arr) throw new Error(`${lang}: chunk at ${i} never came back one-to-one`)
    out.push(...arr.map(s => s.trim()))
    console.error(`[${lang}] ${out.length}/${canon.length}`)
  }
  return out
}

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  try {
    const n = await ensureCanon(db)
    const counts = await langCounts(db)
    if (process.argv.includes('--status')) {
      console.log(JSON.stringify({ canonicalEnglishLines: n, languages: counts, remaining: ALL_TARGETS.filter(l => !counts[l]) }))
      return
    }
    const canon = (await db.query('select id, global_order, speaker, english_text from canonical_pod_scenarios where pod_slug=$1 order by global_order', [SLUG])).rows
    const wanted = [...new Set((arg('langs') || '').split(',').filter(Boolean))]
    for (const lang of wanted) {
      if (!ALL_TARGETS.includes(lang)) { console.log(`${lang}: not a pod target — skipped`); continue }
      if (counts[lang]) { console.log(`${lang}: already has ${counts[lang]} lines — never re-translated`); continue }
      if (!APPLY) { console.log(`${lang}: would translate ${canon.length} lines (dry run: no model call)`); continue }
      const text = lang === 'eng' ? canon.map(r => r.english_text) : await translateLang(lang, canon)
      await db.query('begin')
      try {
        for (let i = 0; i < canon.length; i++) {
          await db.query('insert into canonical_pod_target_text (pod_slug, target_lang, global_order, canonical_id, target_text) values ($1,$2,$3,$4,$5)',
            [SLUG, lang, canon[i].global_order, canon[i].id, text[i]])
        }
        await db.query('commit')
        console.log(`${lang}: landed ${text.length} lines`)
      } catch (e) { await db.query('rollback'); throw e }
    }
  } finally { await db.end() }
}
main().catch(e => { console.error(e.message); process.exit(1) })
