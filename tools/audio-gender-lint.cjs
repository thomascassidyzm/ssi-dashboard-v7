#!/usr/bin/env node
/**
 * audio-gender-lint.cjs — flag voice↔gendered-speech mismatches in course audio.
 *
 * WHY THIS EXISTS
 *   Some languages encode the SPEAKER'S gender directly in the utterance —
 *   Thai polite particles (ครับ male / ค่ะ female), first-person pronouns,
 *   Hebrew/Arabic speaker verbs & adjectives, Indo-Aryan first-person verb
 *   endings. In listening/dialogue content each line is voiced by a specific
 *   voice (Azure Niwat/Premwadee, a pod-cast member, …). If a line whose text
 *   carries FEMALE markers is voiced by a MALE voice (or vice-versa), the
 *   speaker sounds wrong — in Thai a man using ค่ะ reads as effeminate
 *   ("kathoey"). This is exactly the tha_for_eng listening-content defect
 *   (male Azure voice th-TH-NiwatNeural on 38 ค่ะ lines).
 *
 *   The gender-prep coordinator (services/gender-prep-coordinator.cjs) only
 *   handles FIRST-PERSON speaker agreement in PRACTICE phrases, and assumes
 *   one speaker whose gender == the voice. It does NOT cover multi-character
 *   dialogue/pod content where each line's marker gender must match the voice
 *   assigned to that line. This lint closes that gap and is language-agnostic.
 *
 * WHAT IT DOES (read-only — never writes audio, never touches the DB)
 *   For a course, for every audio row on a "spoken by one voice" role, if the
 *   voice's gender is known AND the text carries markers of exactly ONE gender
 *   that conflicts with the voice, it flags the row. Emits a summary + a JSON
 *   fix list to temp/audio-gender-lint/<course>.json.
 *
 * USAGE
 *   node tools/audio-gender-lint.cjs <course_code> [--all-langs] [--limit N]
 *   node tools/audio-gender-lint.cjs tha_for_eng
 *
 * EXTENDING
 *   - Add a language to GENDERED_FORMS below (female/male marker regexes).
 *   - Add voices to VOICE_GENDER (or drop a temp/audio-gender-lint/
 *     <course>.cast.json mapping voice_id → "M"/"F" for pod-cast voices).
 *   Conservative by design: only SINGLE-gender lines are judged; a line that
 *   mixes both genders' markers (two characters quoted in one line) is skipped.
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const fs = require('fs')
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') })

// Gendered-speech markers live in one shared module so this lint and the voice
// picker (tools/pod-recolour.cjs) judge gender identically.
const { GENDERED_FORMS } = require('./gendered-speech.cjs')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// ── Voice → gender registry ─────────────────────────────────────────────────
// Known TTS voices. Extend as courses add voices. Substring match on voice_id
// (handles the azure_ / bare prefix inconsistency, see memory
// voice-id-prefix-inconsistency).
const VOICE_GENDER_RULES = [
  // Azure Thai
  { match: /NiwatNeural/i, gender: 'M' },
  { match: /PremwadeeNeural/i, gender: 'F' },
  { match: /AcharaNeural/i, gender: 'F' },
  // Azure Hebrew
  { match: /HilaNeural/i, gender: 'F' },
  { match: /AvriNeural/i, gender: 'M' },
  // Azure Croatian
  { match: /GabrijelaNeural/i, gender: 'F' },
  { match: /SreckoNeural/i, gender: 'M' },
  // ElevenLabs voices seen in hrv pod-0 (exact ids): Sarah/Laura = F, George = M
  { match: /^(EXAVITQu4vr4xnSDxMaL|FGY2WhTYpPnrIDTdsKH5)$/, gender: 'F' },
  { match: /^JBFqnCBsd6RMkjVDRZzb$/, gender: 'M' },
  // Azure Arabic (common eg/sy/msa voices)
  { match: /(Salma|Amany|Iman|Fatima|Layla|Sana|Noor|Hala|Amina)Neural/i, gender: 'F' },
  { match: /(Shakir|Hamed|Omar|Fahed|Bassel|Taim|Rashid|Ali)Neural/i, gender: 'M' },
  // Azure Slavic / Indic / Romance / Greek / Baltic / Icelandic pod voices.
  // Female then male, grouped by language (name substring, case-insensitive).
  { match: /(Zofia|Agnieszka|Gabrijela|Polina|Swara|Ananya|Kavya|Elvira|Abril|Dalia|Elsa|Isabella|Palma|Raquel|Fernanda|Francisca|Brenda|Denise|Eloise|Vivienne|Sylvie|Jolie|Joana|Alba|Alina|Athina|Gudrun|Everita|Ona|Kalina)Neural/i, gender: 'F' },
  { match: /(Marek|Srecko|Ostap|Madhur|Alvaro|Jorge|Diego|Giuseppe|Duarte|Antonio|Henri|Jean|Enric|Emil|Nestoras|Gunnar|Nils|Leonas|Borislav)Neural/i, gender: 'M' },
  // Azure English (known voices, for completeness on known-role lines)
  { match: /(Sonia|Libby|Hollie|Maisie|Abbi|Bella|Olivia)Neural/i, gender: 'F' },
  { match: /(Ryan|Thomas|Alfie|Elliot|Noah|Oliver)Neural/i, gender: 'M' },
]

function voiceGender(voiceId, castMap) {
  if (!voiceId) return null
  if (castMap && castMap[voiceId]) return castMap[voiceId]
  for (const r of VOICE_GENDER_RULES) if (r.match.test(voiceId)) return r.gender
  return null // unknown — e.g. pod-cast ids like "rex"/"908c4626660f" (supply a cast map)
}

// Roles where a single voice speaks the line (so voice gender must match the
// line's speaker gender). Excludes known-language & narration roles.
const SPOKEN_ROLES = new Set(['target1', 'target2', 'pod_take_g', 'pod_explainer'])

async function fetchAllAudio(courseCode) {
  let rows = [], from = 0, page = 1000
  while (true) {
    const { data, error } = await supabase.from('course_audio')
      .select('id, role, text, voice_id, origin, s3_key, lego_id')
      .eq('course_code', courseCode).range(from, from + page - 1)
    if (error) throw new Error(error.message)
    if (!data || !data.length) break
    rows = rows.concat(data)
    if (data.length < page) break
    from += page
  }
  return rows
}

function loadCastMap(courseCode) {
  const p = path.resolve(__dirname, '..', 'temp', 'audio-gender-lint', `${courseCode}.cast.json`)
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { /* ignore */ }
  }
  return null
}

async function lintCourse(courseCode, langCode) {
  const forms = GENDERED_FORMS[langCode]
  if (!forms || (!forms.female && !forms.male)) {
    return { courseCode, langCode, supported: false, note: forms && forms.note }
  }
  const castMap = loadCastMap(courseCode)
  const rows = (await fetchAllAudio(courseCode)).filter(r => SPOKEN_ROLES.has(r.role))

  const flags = []
  let unknownVoice = 0
  const unknownVoiceIds = {}
  for (const a of rows) {
    const t = a.text || ''
    const hasF = forms.female && forms.female.test(t)
    const hasM = forms.male && forms.male.test(t)
    if (hasF === hasM) continue // none, or mixed (two speakers in one line) → skip
    const textGender = hasF ? 'F' : 'M'
    const vg = voiceGender(a.voice_id, castMap)
    if (!vg) { unknownVoice++; unknownVoiceIds[a.voice_id] = (unknownVoiceIds[a.voice_id] || 0) + 1; continue }
    if (vg !== textGender) {
      flags.push({
        id: a.id, role: a.role, voice_id: a.voice_id, origin: a.origin,
        voice_gender: vg, text_gender: textGender, text: t, s3_key: a.s3_key, lego_id: a.lego_id,
        kind: `${vg === 'M' ? 'MALE' : 'FEMALE'} voice speaks ${textGender === 'F' ? 'FEMALE' : 'MALE'} markers`,
      })
    }
  }
  return { courseCode, langCode, supported: true, scanned: rows.length, flags, unknownVoice, unknownVoiceIds }
}

// canonical speaker name — mirrors phase8 / pod-bulk-migrate.cjs (parens stripped).
function canonicalSpeakerName(speaker) {
  return (speaker || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Pod-cast validator — the PREVENTIVE check. Audits listening_pods.speakers
 * (the cast: speaker → {gender, voice_id}) against the actual particle gender
 * in each speaker's listening_pod_sentences lines. Catches "female-scripted
 * character cast with a male voice" BEFORE any audio is generated. Runs on the
 * source of truth (the cast + script), so it's the right place to fix.
 */
async function lintPodCast(courseCode, langCode) {
  const forms = GENDERED_FORMS[langCode]
  const hasTextPatterns = !!(forms && (forms.female || forms.male))
  const { data: pods } = await supabase.from('listening_pods')
    .select('id, speakers, title').ilike('id', `${courseCode}:%`)
  const findings = []
  for (const pod of (pods || [])) {
    const cast = pod.speakers || {}

    // ── Check 1 (universal, no text patterns needed): a cast speaker whose
    // declared gender contradicts the gender of the voice assigned to them. ──
    for (const [name, entry] of Object.entries(cast)) {
      if (name === '_default') continue
      const castGender = entry && entry.gender
      const voiceId = entry && ((entry.target && entry.target.voice_id) || entry.voice_id)
      const voiceG = voiceGender(voiceId) // 'M'|'F'|null
      if ((castGender === 'm' || castGender === 'f') && voiceG && voiceG.toLowerCase() !== castGender) {
        findings.push({ pod: pod.id, speaker: name, castGender, voiceId, linesGender: '?', f: 0, m: 0,
          problems: [`cast gender=${castGender} but assigned voice ${voiceId} is ${voiceG}`], example: null })
      }
    }

    // ── Check 2 (needs text patterns): compare each speaker's declared gender &
    // assigned voice against the gender their actual lines reveal. ──
    if (!hasTextPatterns) continue
    const { data: sents } = await supabase.from('listening_pod_sentences')
      .select('global_order, speaker, target_text').eq('pod_id', pod.id).order('global_order')
    const tally = {}
    for (const s of (sents || [])) {
      const canon = canonicalSpeakerName(s.speaker)
      const hasF = forms.female && forms.female.test(s.target_text || '')
      const hasM = forms.male && forms.male.test(s.target_text || '')
      if (hasF === hasM) continue
      const t = (tally[canon] = tally[canon] || { f: 0, m: 0, exF: null, exM: null })
      if (hasF) { t.f++; t.exF = t.exF || s.target_text } else { t.m++; t.exM = t.exM || s.target_text }
    }
    for (const [canon, t] of Object.entries(tally)) {
      const entry = cast[canon] || cast[Object.keys(cast).find(k => canonicalSpeakerName(k) === canon)] || cast._default
      const castGender = entry && entry.gender
      const voiceId = entry && ((entry.target && entry.target.voice_id) || entry.voice_id)
      const voiceG = voiceGender(voiceId)
      const linesGender = t.f > 0 && t.m > 0 ? 'MIXED' : (t.f > 0 ? 'F' : 'M')
      const problems = []
      if (linesGender === 'MIXED') problems.push(`speaks BOTH female(${t.f}) and male(${t.m}) markers — likely two characters collapsed under one cast name`)
      else {
        if (castGender && castGender !== 'n' && castGender !== linesGender.toLowerCase())
          problems.push(`cast gender=${castGender} but lines are ${linesGender}`)
        if (voiceG && voiceG !== linesGender)
          problems.push(`voice ${voiceId} is ${voiceG} but lines are ${linesGender}`)
      }
      if (problems.length) findings.push({ pod: pod.id, speaker: canon, castGender: castGender || '?', voiceId: voiceId || '?', linesGender, f: t.f, m: t.m, problems, example: t.exF || t.exM })
    }
  }
  return { supported: true, findings }
}

// --all-pods: run the pod-cast audit across every course that has listening_pods.
async function auditAllPods() {
  let pods = [], from = 0, page = 1000
  while (true) {
    const { data, error } = await supabase.from('listening_pods').select('id').range(from, from + page - 1)
    if (error) throw new Error(error.message)
    if (!data || !data.length) break
    pods = pods.concat(data); if (data.length < page) break; from += page
  }
  const courses = [...new Set(pods.map(p => String(p.id).split(':')[0]))].sort()
  const { data: cs } = await supabase.from('courses').select('course_code, target_lang').in('course_code', courses)
  const langOf = {}; (cs || []).forEach(c => { langOf[c.course_code] = c.target_lang })

  console.log(`\n=== audio-gender-lint --all-pods : ${courses.length} pod courses ===`)
  console.log(`(every course gets the metadata check: cast gender vs assigned-voice gender.`)
  console.log(` courses with text patterns ALSO get the lines-vs-voice check.)\n`)
  const withPatterns = [], noPatterns = {}, anyFindings = []
  for (const c of courses) {
    const lang = langOf[c] || '?'
    const forms = GENDERED_FORMS[lang]
    const covered = !!(forms && (forms.female || forms.male))
    const res = await lintPodCast(c, lang)
    const n = (res.findings || []).length
    if (covered) withPatterns.push(c); else (noPatterns[lang] = noPatterns[lang] || []).push(c)
    if (n) {
      anyFindings.push(c)
      console.log(`✗ ${c} (${lang})${covered ? '' : ' [metadata-only]'}: ${n} finding(s)`)
      res.findings.forEach(f => console.log(`     "${f.speaker}" — ${f.problems.join('; ')}`))
    }
  }
  console.log(`\n--- summary ---`)
  console.log(`courses with findings: ${anyFindings.length ? anyFindings.join(', ') : 'none'}`)
  console.log(`text-pattern coverage (lines-vs-voice): ${withPatterns.join(', ')}`)
  const un = Object.entries(noPatterns).sort()
  console.log(`metadata-only (no text patterns — add to gendered-speech.cjs for full coverage): ${un.reduce((a, [, v]) => a + v.length, 0)} courses`)
  un.forEach(([l, cc]) => console.log(`   ${l} (${cc.length}): ${cc.join(', ')}`))
  console.log(`   Gendered-speech priorities to add: hin/nep, pol/hrv/ukr/bul (Slavic past tense), spa/ita/por/fra/cat/ron (predicate adj), jpn.`)
}

async function main() {
  if (process.argv.includes('--all-pods')) { await auditAllPods(); return }
  const courseCode = process.argv[2]
  if (!courseCode) {
    console.error('Usage: node tools/audio-gender-lint.cjs <course_code> [--limit N]\n       node tools/audio-gender-lint.cjs --all-pods')
    process.exit(1)
  }
  const limit = (() => { const i = process.argv.indexOf('--limit'); return i > -1 ? parseInt(process.argv[i + 1], 10) : 20 })()

  const { data: course, error } = await supabase.from('courses')
    .select('course_code, target_lang').eq('course_code', courseCode).single()
  if (error) { console.error('course lookup:', error.message); process.exit(1) }
  const langCode = course.target_lang

  const res = await lintCourse(courseCode, langCode)
  console.log(`\n=== audio-gender-lint: ${courseCode} (${langCode}) ===`)
  if (!res.supported) {
    console.log(`  ⚠ No gendered-form patterns for "${langCode}". ${res.note || ''}`)
    console.log(`  Add an entry to GENDERED_FORMS in tools/audio-gender-lint.cjs.`)
    process.exit(0)
  }
  console.log(`  scanned spoken-role rows: ${res.scanned}`)
  console.log(`  MISMATCHES: ${res.flags.length}`)
  const byKind = {}
  res.flags.forEach(f => { byKind[f.kind] = (byKind[f.kind] || 0) + 1 })
  Object.entries(byKind).forEach(([k, n]) => console.log(`    • ${k}: ${n}`))
  if (res.unknownVoice) {
    console.log(`  voices of UNKNOWN gender (not judged): ${res.unknownVoice} rows across ${Object.keys(res.unknownVoiceIds).length} voice ids`)
    console.log(`    → supply temp/audio-gender-lint/${courseCode}.cast.json {"<voice_id>":"M"|"F", ...} to include them`)
    console.log(`    ids:`, Object.entries(res.unknownVoiceIds).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}(${n})`).join(', '))
  }
  console.log(`\n  examples:`)
  res.flags.slice(0, limit).forEach(f => console.log(`    [${f.kind}] ${f.voice_id} | ${f.text}`))

  // ── Pod-cast validation (preventive: cast vs script, pre-audio) ──
  const podRes = await lintPodCast(courseCode, langCode)
  if (podRes.supported) {
    console.log(`\n  --- listening-pod cast audit (speaker gender vs. their lines) ---`)
    if (!podRes.findings.length) console.log(`  ✓ no cast/voice gender conflicts`)
    podRes.findings.forEach(f => {
      console.log(`  ✗ [${f.pod}] "${f.speaker}" (cast=${f.castGender}, voice=${f.voiceId}, lines=${f.linesGender} F${f.f}/M${f.m})`)
      f.problems.forEach(p => console.log(`       - ${p}`))
      if (f.example) console.log(`       e.g. ${f.example}`)
    })
  }

  const outDir = path.resolve(__dirname, '..', 'temp', 'audio-gender-lint')
  fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, `${courseCode}.json`)
  fs.writeFileSync(outFile, JSON.stringify({ courseCode, langCode, generated: 'run-time', ...res, podCast: podRes }, null, 2))
  console.log(`\n  fix list → ${path.relative(path.resolve(__dirname, '..'), outFile)} (${res.flags.length} audio rows + ${(podRes.findings || []).length} cast findings)`)
}

if (require.main === module) main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
module.exports = { lintCourse, GENDERED_FORMS, voiceGender }
