#!/usr/bin/env node
/**
 * Pod recast — re-resolve a course's pod speaker voices IN PLACE from the LIVE
 * voice pools, with no markdown file and no sentence mutation.
 *
 * Why this exists (2026-08-07): 16 `eng_for_*` courses carry corrupted stored
 * casting in `listening_pods.speakers` — a byte-for-byte copy of the
 * `zho_for_eng` cast, so their TARGET (English) speakers are on xAI Chinese
 * voices at `locale: "zh"` and their KNOWN speakers are on English voices
 * regardless of the actual known language. The rendered audio out there is fine;
 * only the stored casting is wrong, and it would fail 100% of clips on any
 * re-render (the phonology gate sees a clip steered `zh` but hears English).
 * See docs/pods/pod-redo-scope-2026-08-07.md §4a.
 *
 *   node tools/pod-recast.cjs --course=eng_for_ita                  # dry-run
 *   node tools/pod-recast.cjs --courses=eng_for_ita,eng_for_deu     # dry-run many
 *   node tools/pod-recast.cjs --course=eng_for_ita --apply          # write
 *   node tools/pod-recast.cjs --course=eng_for_ita --verbose
 *
 * Contract:
 *   - Speaker labels come from the DB (keys of listening_pods.speakers plus
 *     DISTINCT speaker from listening_pod_sentences). No markdown is parsed and
 *     no sentence row is created, deleted or edited.
 *   - Casting comes from ONE source: assignVoices() in tools/pod-sync.cjs, which
 *     reads live app_config.pod_voice_pools and (since 403718a3) applies Aran's
 *     two-voice rule — one male + one female for the whole cast. This tool does
 *     not reimplement casting, and deliberately does NOT use
 *     tools/pod-voice-coverage.cjs / tools/pod-recolour.cjs: that static
 *     coverage map has diverged from the live pools.
 *
 * ⚠️ MAKE BEFORE BREAK — READ BEFORE EDITING THIS FILE ⚠️
 *   --apply writes `listening_pods.speakers` and NOTHING ELSE. It must NEVER
 *   null `target_audio_id` / `known_audio_id` on listening_pod_sentences.
 *   tools/pod-recolour.cjs does null them; that is correct only when a bulk
 *   regeneration follows immediately. There is NO bulk pod regeneration in this
 *   phase, so nulling the links here would strip working, learner-facing audio
 *   with nothing queued to replace it. Corrected casting simply sits in place
 *   until a re-render is approved.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const fs = require('fs')
const consentGate = require('../services/shared/voice-consent-gate.cjs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { assignVoices, canonicalSpeakerName, loadVoicePools, poolKeysForCourse } = require('./pod-sync.cjs')
const { toBcp47 } = require('../services/voice-discovery-service.cjs')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// ---------------------------------------------------------------------------
// Pool-key resolution — the langKey() workaround
// ---------------------------------------------------------------------------
// KNOWN BUG in tools/pod-sync.cjs (still live there, needs its own fix):
//   langKey() does `lang.toLowerCase().split(/[_-]/)[0]`, and syncPod() already
//   splits on '_' before calling assignVoices. So 'ara_sy' → 'ara',
//   'fra_ca' → 'fra', 'por_br' → 'por', 'spa_mx' → 'spa'. The live pool HAS
//   distinct ara_sy / fra_ca / por_br / spa_mx entries, which are therefore
//   unreachable through pod-sync — a Syrian-Arabic course is silently cast on
//   the Saudi/MSA pool.
// We must not edit pod-sync.cjs (another worker owns it), so the correction is
// applied here, after the fact: assignVoices() resolves on the base key as
// usual, then remapExactPool() re-points each assignment at the same RANK in
// the exact-code pool when app_config.pod_voice_pools actually has that key.
// Rank is preserved, so gender resolution and the two-voice rule are untouched.
function poolKeyFor(pools, lang) {
  const exact = String(lang || '').toLowerCase().replace(/-/g, '_')
  const base = exact.split('_')[0]
  return {
    exact: pools[exact] ? exact : null,
    base,
    baseExists: !!pools[base],
  }
}

// Rank of an assigned voice inside the pool assignVoices resolved it from.
function rankIn(pool, gender, voiceId) {
  const list = (pool && pool[gender]) || []
  return list.findIndex(v => v.voice_id === voiceId)
}

function remapExactPool(assignments, pools, targetLang, knownLang) {
  const notes = []
  for (const track of ['target', 'known']) {
    const lang = track === 'target' ? targetLang : knownLang
    const k = poolKeyFor(pools, lang)
    if (!k.exact || k.exact === k.base) continue
    const from = pools[k.base] || { f: [], m: [] }
    const to = pools[k.exact]
    for (const [canon, a] of Object.entries(assignments)) {
      const entry = a[track]
      if (!entry) continue
      const pick = a.gender === 'n' ? 'm' : a.gender
      const idx = rankIn(from, pick, entry.voice_id)
      const list = (to[pick] || [])
      if (idx < 0 || !list.length) continue
      const v = list[idx % list.length]
      a[track] = { provider: v.provider, voice_id: v.voice_id, name: v.name }
      notes.push(`${canon}/${track}: ${k.base} → ${k.exact} (${v.name})`)
    }
  }
  return notes
}

// ---------------------------------------------------------------------------
// Locale
// ---------------------------------------------------------------------------
// phase8's buildPodTTSConfig prefers the `locale` stored on the voice and only
// falls back to toBcp47(language) when it's absent. A pool entry MAY now carry
// an explicit `locale` (Tom, 2026-08-16), and when it does that field is the
// human's own choice — the Iberian-vs-Mexican steering tag for xAI Spanish —
// so it wins outright and nothing below runs. Derivation is the fallback for
// the ~145 locale-less entries, and it derives from live data only — never
// invents:
//   1. Azure voice ids encode it ('en-GB-SoniaNeural' → 'en-GB').
//   2. Otherwise toBcp47(lang), but only if it is a real 2-letter primary
//      subtag (toBcp47('ara') returns 'ara', which is not a BCP-47 tag).
//   3. Otherwise borrow the primary subtag from an Azure voice in the same pool
//      ('ar-SA-HamedNeural' → 'ar').
//   4. Otherwise omit — phase8 then behaves exactly as it does today.
function azureLocale(voiceId) {
  const m = String(voiceId || '').match(/^([a-z]{2,3}(?:-[A-Za-z]{4})?-[A-Z]{2})-/)
  return m ? m[1] : null
}

function resolveLocale(voice, lang, pool) {
  if (voice.provider === 'azure') {
    const l = azureLocale(voice.voice_id)
    if (l) return l
  }
  const b = toBcp47(lang)
  if (/^[a-z]{2}(-|$)/.test(String(b || ''))) return b
  for (const g of ['f', 'm']) {
    for (const v of (pool && pool[g]) || []) {
      const l = azureLocale(v.voice_id)
      if (l) return l.split('-')[0]
    }
  }
  return null
}

function stampLocales(assignments, pools, targetLang, knownLang) {
  const warn = []
  for (const track of ['target', 'known']) {
    const lang = track === 'target' ? targetLang : knownLang
    const k = poolKeyFor(pools, lang)
    const pool = pools[k.exact || k.base] || { f: [], m: [] }
    for (const [canon, a] of Object.entries(assignments)) {
      const entry = a[track]
      if (!entry) continue
      // Explicit beats derived: resolveCast already copied a pool entry's own
      // locale onto the voice, and that field is a human's choice, not a guess.
      // Warn when derivation would have said something else, so a pool typo
      // still surfaces instead of being silently honoured.
      if (entry.locale) {
        const derived = resolveLocale(entry, lang, pool)
        if (derived && derived !== entry.locale) {
          warn.push(`${canon}/${track}: keeping explicit locale ${entry.locale} for ${entry.voice_id} (derivation said ${derived})`)
        }
        continue
      }
      const locale = resolveLocale(entry, lang, pool)
      if (locale) entry.locale = locale
      else warn.push(`${canon}/${track}: no locale resolvable for ${entry.voice_id} (${lang})`)
    }
  }
  return warn
}

// ---------------------------------------------------------------------------
// Recast one pod
// ---------------------------------------------------------------------------
function voiceSig(v) {
  return v ? `${v.voice_id}|${v.provider || '?'}|${v.locale || '-'}` : '(none)'
}

function distinct(assignments, track) {
  const s = new Set()
  for (const [k, a] of Object.entries(assignments)) {
    if (k === '_default') continue
    if (a[track] && a[track].voice_id) s.add(a[track].voice_id)
  }
  return [...s]
}

async function recastPod(pod, targetLang, knownLang, pools) {
  // Canonical speaker labels come from the DB, both sources unioned:
  //   - keys of listening_pods.speakers (minus the _default sentinel)
  //   - DISTINCT speaker on listening_pod_sentences (the raw variants, which is
  //     what assignVoices expects — it collapses them itself)
  const { data: rows, error } = await supabase
    .from('listening_pod_sentences')
    .select('speaker').eq('pod_id', pod.id)
  if (error) throw new Error(`load sentences ${pod.id}: ${error.message}`)

  const raw = []
  const seen = new Set()
  for (const r of rows) {
    const sp = (r.speaker || '').trim()
    if (!sp || seen.has(sp)) continue
    seen.add(sp)
    raw.push(sp)
  }
  const before = pod.speakers || {}
  for (const k of Object.keys(before)) {
    if (k === '_default' || seen.has(k)) continue
    seen.add(k)
    raw.push(k)   // stored-only label: keep it cast so nothing loses a voice
  }
  if (!raw.length) return { pod_id: pod.id, skipped: 'no speaker labels' }

  // targetLang/knownLang arrive here as RESOLVED POOL KEYS (see recastCourse),
  // so assignVoices lands on the exact pool by itself and remapExactPool has
  // nothing left to do. It is deliberately NOT called: re-pointing an
  // already-exact assignment by rank could move a voice that is already right,
  // which is the opposite of what this tool is for. The function stays exported
  // for the tests that pin its behaviour.
  const after = await assignVoices(raw, targetLang, knownLang)
  const remapped = []
  const localeWarnings = stampLocales(after, pools, targetLang, knownLang)

  const changes = []
  for (const canon of Object.keys(after)) {
    const b = before[canon] || {}
    for (const track of ['target', 'known']) {
      const bv = b[track] || null
      const av = after[canon][track] || null
      if (voiceSig(bv) === voiceSig(av)) continue
      changes.push({
        speaker: canon,
        track,
        gender: after[canon].gender,
        before: bv ? { voice_id: bv.voice_id, provider: bv.provider, locale: bv.locale || null, name: bv.name } : null,
        after: av ? { voice_id: av.voice_id, provider: av.provider, locale: av.locale || null, name: av.name } : null,
      })
    }
  }
  const droppedSpeakers = Object.keys(before).filter(k => k !== '_default' && !after[k])

  return {
    pod_id: pod.id,
    slug: pod.slug,
    sentences: rows.length,
    speakers_before: Object.keys(before).filter(k => k !== '_default').length,
    speakers_after: Object.keys(after).filter(k => k !== '_default').length,
    dropped_speakers: droppedSpeakers,
    distinct_before: {
      target: distinct(before, 'target').length,
      known: distinct(before, 'known').length,
    },
    distinct_after: {
      target: distinct(after, 'target').length,
      known: distinct(after, 'known').length,
    },
    distinct_after_ids: {
      target: distinct(after, 'target'),
      known: distinct(after, 'known'),
    },
    remapped_to_exact_pool: remapped,
    locale_warnings: localeWarnings,
    changes,
    before,
    after,
  }
}

// Before-state assertion: re-read the row immediately before writing and abort
// this pod if `speakers` moved under us since we planned the change.
async function assertNoDrift(pod) {
  const { data, error } = await supabase
    .from('listening_pods').select('speakers').eq('id', pod.id).single()
  if (error) throw new Error(`re-read ${pod.id}: ${error.message}`)
  const a = JSON.stringify(data.speakers || {})
  const b = JSON.stringify(pod.speakers || {})
  if (a !== b) throw new Error(`DRIFT on ${pod.id}: listening_pods.speakers changed since it was read — aborting this pod, nothing written`)
}

async function recastCourse(courseCode, pools, opts) {
  const codeTarget = courseCode.split('_for_')[0]
  const codeKnown = courseCode.split('_for_')[1] || 'eng'

  // Pool keys come from the COURSE ROW so that courses.voice_pool_key — Tom's
  // regional-variant ruling — governs, exactly as it does on the PodLab casting
  // route. A pod whose course row is missing (test fixtures) keeps the old
  // code-derived behaviour.
  const { data: course } = await supabase
    .from('courses').select('course_code, target_lang, known_lang, voice_pool_key')
    .eq('course_code', courseCode).maybeSingle()

  const out = { course: courseCode, pods: [] }
  let keys
  try {
    keys = course
      ? poolKeysForCourse(pools, course)
      : poolKeysForCourse(pools, { course_code: courseCode, target_lang: codeTarget, known_lang: codeKnown })
  } catch (e) {
    out.blocked = e.message
    return out
  }
  const targetLang = keys.target
  const knownLang = keys.known
  out.target_lang = course ? course.target_lang : codeTarget
  out.known_lang = course ? course.known_lang : codeKnown
  out.voice_pool_key = course ? (course.voice_pool_key || null) : null
  out.pool_keys = { target: pools[targetLang] ? targetLang : null, known: pools[knownLang] ? knownLang : null }
  if (!out.pool_keys.target || !out.pool_keys.known) {
    out.blocked = `no voice pool for ${!out.pool_keys.target ? `target "${targetLang}"` : ''}${!out.pool_keys.target && !out.pool_keys.known ? ' and ' : ''}${!out.pool_keys.known ? `known "${knownLang}"` : ''}`
    return out
  }

  let podQuery = supabase.from('listening_pods')
    .select('id, slug, speakers').eq('course_code', courseCode).order('slug')
  if (opts.pod) podQuery = podQuery.eq('id', opts.pod)
  const { data: pods, error } = await podQuery
  if (error) throw new Error(`load pods ${courseCode}: ${error.message}`)
  if (!pods.length) { out.blocked = 'no pods'; return out }

  for (const pod of pods) {
    let r
    try {
      r = await recastPod(pod, targetLang, knownLang, pools)
    } catch (e) {
      out.pods.push({ pod_id: pod.id, error: e.message })
      continue
    }
    if (r.skipped) { out.pods.push(r); continue }

    if (opts.apply) {
      await assertNoDrift(pod)
      // NO CONSENT, NO CAST (Tom, 2026-08-31). An offline script writing the
      // same speakers column as the API route needs the same lock, or the rule
      // holds only for people who use the screen.
      for (const [speaker, entry] of Object.entries(r.after || {})) {
        for (const leg of ['known', 'target']) {
          const vid = entry && entry[leg] && (entry[leg].voice_id || entry[leg].voiceId)
          if (vid) await consentGate.assertConsented(String(vid), { db: supabase, context: `${pod.id} ${speaker}.${leg}` })
        }
      }
      // MAKE BEFORE BREAK: speakers only. No audio-id nulling. See file header.
      const { error: upErr } = await supabase.from('listening_pods')
        .update({ speakers: r.after, updated_at: new Date().toISOString() })
        .eq('id', pod.id)
      if (upErr) throw new Error(`update speakers ${pod.id}: ${upErr.message}`)
      r.applied = true
    }
    out.pods.push(r)
  }
  return out
}

// ---------------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2)
  const getArg = (f) => { for (const a of args) { if (a === f) return true; if (a.startsWith(f + '=')) return a.slice(f.length + 1) } return null }
  const courses = []
  const one = getArg('--course')
  const many = getArg('--courses')
  if (typeof one === 'string') courses.push(one)
  if (typeof many === 'string') courses.push(...many.split(',').map(s => s.trim()).filter(Boolean))
  const apply = !!getArg('--apply')
  const verbose = !!getArg('--verbose')
  const pod = typeof getArg('--pod') === 'string' ? getArg('--pod') : null
  const logPath = typeof getArg('--log') === 'string' ? getArg('--log')
    : path.resolve(__dirname, `../docs/pods/pod-recast-${apply ? 'applied' : 'dryrun'}-log.json`)

  if (!courses.length) {
    console.error('❌ --course=<code> or --courses=<a,b,c> required')
    process.exit(1)
  }

  return (async () => {
    const pools = await loadVoicePools()
    console.log(`\n🎙️  Pod recast  (${apply ? 'APPLY' : 'DRY-RUN'})  ${courses.length} course(s)`)
    console.log(`   pools: ${Object.keys(pools).length} language keys live in app_config.pod_voice_pools\n`)

    const results = []
    for (const c of courses) {
      const r = await recastCourse(c, pools, { apply, verbose, pod })
      results.push(r)
      if (r.blocked) { console.log(`   ⛔ ${c.padEnd(14)} BLOCKED — ${r.blocked}`); continue }
      for (const p of r.pods) {
        if (p.error) { console.log(`   ❌ ${c.padEnd(14)} ${p.pod_id}: ${p.error}`); continue }
        if (p.skipped) { console.log(`   ·  ${c.padEnd(14)} ${p.pod_id}: skipped (${p.skipped})`); continue }
        console.log(`   ${p.applied ? '✅' : '·'}  ${c.padEnd(14)} ${p.pod_id.padEnd(22)} ${String(p.speakers_after).padStart(2)} speakers · ${p.changes.length} voice changes`)
        console.log(`      distinct target ${p.distinct_before.target} → ${p.distinct_after.target}  [${p.distinct_after_ids.target.join(', ')}]`)
        console.log(`      distinct known  ${p.distinct_before.known} → ${p.distinct_after.known}  [${p.distinct_after_ids.known.join(', ')}]`)
        if (p.remapped_to_exact_pool.length) console.log(`      ↪ exact-pool remap: ${p.remapped_to_exact_pool.length} assignment(s)`)
        if (p.locale_warnings.length) for (const w of p.locale_warnings) console.log(`      ⚠️  ${w}`)
        if (p.dropped_speakers.length) console.log(`      ⚠️  stored speakers no longer cast: ${p.dropped_speakers.join(', ')}`)
        if (verbose) {
          for (const ch of p.changes) {
            console.log(`        ${ch.speaker.padEnd(20)} ${ch.track.padEnd(6)} ${voiceSig(ch.before)} → ${voiceSig(ch.after)}`)
          }
        }
      }
    }

    fs.mkdirSync(path.dirname(logPath), { recursive: true })
    fs.writeFileSync(logPath, JSON.stringify({
      mode: apply ? 'applied' : 'dryrun',
      courses: courses,
      results,
    }, null, 2))
    console.log(`\n   log → ${logPath}`)
    if (!apply) console.log(`   (dry-run — nothing written) Re-run with --apply to write listening_pods.speakers.`)
    console.log(`   Note: --apply NEVER nulls pod sentence audio ids. Existing clips keep playing.\n`)
  })()
}

if (require.main === module) main().catch(e => { console.error('\n❌', e.message); process.exit(1) })

module.exports = { recastPod, recastCourse, poolKeyFor, remapExactPool, resolveLocale }
