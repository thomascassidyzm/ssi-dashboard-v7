#!/usr/bin/env node
/**
 * Recast the TARGET track of a course's pods onto ONE named two-voice pair,
 * carrying an explicit locale handle.
 *
 * Why this exists (2026-08-11, Tom's ruling on the Spanish casting sample):
 * he listened to the PodLab two-voice sample for `spa_for_eng` and rejected it —
 * "the sampled pronunciation is Mexican Spanish, but spa_for_eng is an IBERIAN
 * Spanish course."
 *
 * Two things were wrong under that, and this tool fixes both at once:
 *
 *   1. THE LOCALE HANDLE. `spa_for_eng:pod-0-unrecorded` — the one pod PodLab
 *      samples — carried `target.locale = "es"` on every character. The other
 *      three Spanish pods carry `es-ES`. phase-8's buildPodTTSConfig hands that
 *      handle straight to xAI as the language, and the codebase already learned
 *      what a region-stripped handle does: `por` had to be moved to an explicit
 *      `pt-PT` because "native pt IS Brazilian" (tools/pod-voice-coverage.cjs).
 *      A bare `es` gets xAI's default Spanish, which is Latin American. That is
 *      the accent Tom heard.
 *
 *   2. THE VOICES. The pair cast on that pod — Maria `f2f41225`, Pablo
 *      `d2313a0d` — appears in NO catalogue this repo or xAI's live
 *      /v1/tts/voices endpoint can produce, and `app_config.pod_voice_pools`
 *      records them with no locale and no accent tag. Their accent is not
 *      verifiable without spending money on a render, so they cannot be the
 *      answer to a rejection that was about accent.
 *
 * The pair this recasts TO is not a guess: an Azure locale is a hard provider
 * guarantee, and the pair given for Spanish (es-ES-ElviraNeural /
 * es-ES-AlvaroNeural) is what `courses.voice_config.voices.target1/target2`
 * already designates and what ~24,000 spa_for_eng course clips are already
 * rendered on. It is the voice the course already speaks in.
 *
 * WHICH SLOT EACH CHARACTER LANDS IN
 *   - character gender `f` → the female voice, `m` → the male voice.
 *   - character gender `n` (or absent) → follows the gender of the voice it is
 *     cast to TODAY, so a neutral label keeps the casting decision someone
 *     already made rather than being re-decided here.
 *   - if that voice reads as many female characters as male ones, its gender is
 *     genuinely unknown, so the last appeal is the SAME character on another pod
 *     of the course — again a decision someone already made. spa_for_eng needs
 *     this: "Customer 3" is neutral and sits on a tied voice, and `pod-0` casts
 *     that character to a male voice.
 * Nothing else is inferred: a character none of the three rules reaches makes
 * the whole course refuse rather than land somewhere by default.
 *
 * `--by-voice` drops the first rule and maps purely voice-for-voice, when you
 * want an accent change and nothing else.
 *
 *   node tools/pod-recast-target-pair.cjs --course=spa_for_eng \
 *     --female=azure:es-ES-ElviraNeural:Elvira --male=azure:es-ES-AlvaroNeural:Alvaro \
 *     --locale=es-ES                                          # dry-run
 *   … --apply                                                 # write
 *
 * ⚠️ MAKE BEFORE BREAK ⚠️
 *   --apply writes `listening_pods.speakers` and NOTHING ELSE. It never touches
 *   listening_pod_sentences, never nulls target_audio_id/known_audio_id, never
 *   deletes audio, and never renders a second of TTS. Every clip already linked
 *   stays linked and keeps playing; this changes only which voice the cast SAYS
 *   each character is read by. The KNOWN (English) track is not touched at all.
 *
 *   Every write is guarded by a re-read: if the stored speakers map changed
 *   since this run read it, that pod is skipped, not overwritten. The full
 *   before-state of every pod is written to the log file, which is the way back.
 *
 * Changing speakers changes the cast fingerprint, so any approval on record for
 * the course goes stale and must be re-granted in PodLab. That is the gate
 * working as designed.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const approvals = require('../services/pod-voice-approvals.cjs')

// Lazy: the pure helpers below are unit-tested, and a client at module load
// would demand credentials the tests have no business holding.
let _supabase = null
function db() {
  if (!_supabase) _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return _supabase
}

/** `provider:voice_id:Name` → the voice object stored on a speakers entry. */
function parseVoice(spec) {
  const parts = String(spec || '').split(':')
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error(`voice must be "provider:voice_id[:Name]", got "${spec}"`)
  }
  const [provider, voice_id, ...rest] = parts
  return { provider, voice_id, name: rest.join(':') || voice_id }
}

function parseArgs(argv) {
  const out = { courses: [], apply: false, verbose: false, byVoice: false }
  for (const a of argv.slice(2)) {
    if (a === '--apply') out.apply = true
    else if (a === '--verbose') out.verbose = true
    else if (a === '--by-voice') out.byVoice = true
    else if (a.startsWith('--course=')) out.courses.push(a.slice('--course='.length))
    else if (a.startsWith('--courses=')) out.courses.push(...a.slice('--courses='.length).split(',').map(s => s.trim()).filter(Boolean))
    else if (a.startsWith('--female=')) out.female = parseVoice(a.slice('--female='.length))
    else if (a.startsWith('--male=')) out.male = parseVoice(a.slice('--male='.length))
    else if (a.startsWith('--locale=')) out.locale = a.slice('--locale='.length)
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length)
  }
  return out
}

const voiceKey = (v) => (v && v.voice_id ? `${v.provider || 'azure'}|${v.voice_id}|${v.locale || '-'}` : 'none')

function distinctVoices(speakers, track) {
  const m = new Map()
  for (const [label, e] of Object.entries(speakers || {})) {
    const v = e && e[track] && e[track].voice_id ? e[track] : (track === 'target' && e && e.voice_id ? e : null)
    const k = voiceKey(v)
    if (!m.has(k)) m.set(k, [])
    m.get(k).push(label)
  }
  return m
}

/** Canonical character name: parens stripped, whitespace collapsed. */
function canonicalLabel(label) {
  return String(label || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Which gender slot a character belongs in.
 *
 * `genderByCurrentVoice` maps the voice_id a character is cast to TODAY to
 * 'f'/'m' — built by the caller from the pods themselves, so a neutral label
 * keeps whichever half of the two-hander it already sat in. `slotByCharacter`
 * is the last appeal: the same character's slot on another pod of the course.
 * Returns null when no rule can decide, and the caller refuses rather than guess.
 */
function slotFor(entry, genderByCurrentVoice, { byVoice = false, slotByCharacter, label } = {}) {
  const current = entry && entry.target && entry.target.voice_id
  const inherited = current ? genderByCurrentVoice.get(current) || null : null
  const sibling = (slotByCharacter && label != null)
    ? slotByCharacter.get(canonicalLabel(label)) || null
    : null
  if (byVoice) return inherited || sibling
  const declared = String((entry && entry.gender) || '').trim().toLowerCase()
  if (declared === 'f' || declared === 'm') return declared
  return inherited || sibling
}

/**
 * The speakers entry this character should hold. Everything else on the entry —
 * gender, variants, the whole KNOWN track, anything a later feature added — is
 * preserved byte-for-byte. Only `target` is restated.
 */
function recastEntry(entry, voice, locale) {
  return {
    ...entry,
    target: { name: voice.name, provider: voice.provider, voice_id: voice.voice_id, ...(locale ? { locale } : {}) },
  }
}

/** voice_id → 'f'|'m', learned from the characters each voice currently reads. */
function genderMapFromPods(pods) {
  const tally = new Map()
  for (const pod of pods || []) {
    for (const entry of Object.values(pod.speakers || {})) {
      const vid = entry && entry.target && entry.target.voice_id
      if (!vid) continue
      const g = String(entry.gender || '').trim().toLowerCase()
      if (g !== 'f' && g !== 'm') continue
      const t = tally.get(vid) || { f: 0, m: 0 }
      t[g] += 1
      tally.set(vid, t)
    }
  }
  const out = new Map()
  for (const [vid, t] of tally) {
    if (t.f === t.m) continue          // genuinely ambiguous — let the caller refuse
    out.set(vid, t.f > t.m ? 'f' : 'm')
  }
  return out
}

/**
 * character → 'f'|'m', learned from how the SAME character is cast on the
 * course's other pods. Only characters every pod agrees on are recorded; a
 * character read by a female voice on one pod and a male voice on another is
 * left out, because there is no decision to inherit.
 */
function slotByCharacterFromPods(pods, genderByVoice) {
  const seen = new Map()
  for (const pod of pods || []) {
    for (const [label, entry] of Object.entries(pod.speakers || {})) {
      const key = canonicalLabel(label)
      const declared = String((entry && entry.gender) || '').trim().toLowerCase()
      const vid = entry && entry.target && entry.target.voice_id
      const g = (declared === 'f' || declared === 'm') ? declared : (vid ? genderByVoice.get(vid) : null)
      if (!g) continue
      if (!seen.has(key)) seen.set(key, new Set())
      seen.get(key).add(g)
    }
  }
  const out = new Map()
  for (const [key, gs] of seen) if (gs.size === 1) out.set(key, [...gs][0])
  return out
}

async function run() {
  const args = parseArgs(process.argv)
  if (!args.courses.length || !args.female || !args.male) {
    console.error('usage: pod-recast-target-pair.cjs --course=<code> --female=<provider:id:Name> --male=<provider:id:Name> [--locale=xx-XX] [--by-voice] [--apply]')
    process.exit(1)
  }
  const log = {
    ran_at: new Date().toISOString(),
    mode: args.apply ? 'applied' : 'dryrun',
    female: args.female, male: args.male, locale: args.locale || null,
    slot_rule: args.byVoice ? 'by-current-voice' : 'character-gender, neutral follows current voice',
    courses: [],
  }

  for (const courseCode of args.courses) {
    const { data: pods, error: pErr } = await db()
      .from('listening_pods').select('id, slug, speakers').eq('course_code', courseCode).order('id')
    if (pErr) throw new Error(`load pods ${courseCode}: ${pErr.message}`)
    if (!pods || !pods.length) throw new Error(`${courseCode}: no pods`)

    const genderByVoice = genderMapFromPods(pods)
    const slotByCharacter = slotByCharacterFromPods(pods, genderByVoice)
    const rules = { byVoice: args.byVoice, slotByCharacter }

    // Refuse before writing anything: every character must land in a slot.
    const unresolved = []
    for (const pod of pods) {
      for (const [label, entry] of Object.entries(pod.speakers || {})) {
        if (!slotFor(entry, genderByVoice, { ...rules, label })) unresolved.push(`${pod.id} :: ${label}`)
      }
    }
    if (unresolved.length) {
      throw new Error(`${courseCode}: ${unresolved.length} character(s) have no gender and no gendered current voice — refusing to guess:\n  ${unresolved.join('\n  ')}`)
    }

    const before = pods.map(p => ({ id: p.id, speakers: p.speakers || {} }))
    const after = []
    const courseLog = { course_code: courseCode, pods: [] }

    for (const pod of pods) {
      const speakers = pod.speakers || {}
      const next = {}
      const moved = []
      for (const [label, entry] of Object.entries(speakers)) {
        const slot = slotFor(entry, genderByVoice, { ...rules, label })
        next[label] = recastEntry(entry, slot === 'f' ? args.female : args.male, args.locale)
        const wasName = (entry.target && entry.target.name) || '-'
        const nowName = next[label].target.name
        if (wasName !== nowName) moved.push(`${label}: ${wasName} → ${nowName}`)
      }
      after.push({ id: pod.id, speakers: next })

      const changed = JSON.stringify(speakers) !== JSON.stringify(next)
      const podLog = {
        pod_id: pod.id,
        slug: pod.slug,
        changed,
        target_voices_before: [...distinctVoices(speakers, 'target').keys()],
        target_voices_after: [...distinctVoices(next, 'target').keys()],
        known_voices_before: [...distinctVoices(speakers, 'known').keys()],
        known_voices_after: [...distinctVoices(next, 'known').keys()],
        recast: moved,
        speakers_before: speakers,
        speakers_after: next,
      }
      courseLog.pods.push(podLog)

      console.log(`\n${pod.id} (${pod.slug || '-'}) — ${Object.keys(speakers).length} characters`)
      console.log(`  target voices: ${podLog.target_voices_before.join(', ')}`)
      console.log(`             →   ${podLog.target_voices_after.join(', ')}`)
      console.log(`  known voices UNTOUCHED: ${podLog.known_voices_before.join(', ')}`)
      if (args.verbose) for (const m of moved) console.log(`    ${m}`)

      if (!changed) { console.log('  unchanged'); podLog.write = 'skipped: already cast'; continue }
      if (!args.apply) { podLog.write = 'dry-run'; continue }

      // Guard: the row must still hold exactly what we read before we overwrite it.
      const { data: fresh, error: fErr } = await db()
        .from('listening_pods').select('speakers').eq('id', pod.id).maybeSingle()
      if (fErr) throw new Error(`re-read ${pod.id}: ${fErr.message}`)
      if (JSON.stringify(fresh?.speakers || {}) !== JSON.stringify(speakers)) {
        console.log('  SKIPPED — the stored cast changed under this run')
        podLog.write = 'skipped: drifted'
        continue
      }
      const { error: uErr } = await db().from('listening_pods').update({ speakers: next }).eq('id', pod.id)
      if (uErr) throw new Error(`write ${pod.id}: ${uErr.message}`)
      console.log('  written')
      podLog.write = 'written'
    }

    courseLog.fingerprint_before = approvals.castFingerprint(before)
    courseLog.fingerprint_after = approvals.castFingerprint(after)
    console.log(`\n${courseCode}: cast fingerprint ${courseLog.fingerprint_before} → ${courseLog.fingerprint_after}`)
    log.courses.push(courseLog)
  }

  const out = args.out || path.resolve(
    __dirname, '..', 'docs/voice-engine/pod-cast',
    `recast-target-pair-${args.apply ? 'applied' : 'dryrun'}-log.json`,
  )
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`\nlog → ${out}`)
  if (!args.apply) console.log('DRY RUN — nothing written. Re-run with --apply.')
}

if (require.main === module) run().catch(e => { console.error(e.message); process.exit(1) })

module.exports = {
  parseVoice, slotFor, recastEntry, genderMapFromPods, slotByCharacterFromPods,
  canonicalLabel, distinctVoices,
}
