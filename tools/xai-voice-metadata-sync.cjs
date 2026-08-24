#!/usr/bin/env node
/**
 * Resolve every xAI voice id we use to the provider's OWN metadata — by ID —
 * and write it into `voices`, so gender/accent are facts on record instead of
 * a guess from a display name or a human's ears.
 *
 * WHY THIS EXISTS (2026-08-11, Tom's ruling: zero-spend pass first).
 * `tools/pod-voice-pool-gender-audit.cjs` checked every Azure pool entry
 * against Azure's catalogue and caught a live miscast, but declared all 48 xAI
 * entries UNVERIFIABLE: our ids are opaque hex (`f331ee80`) and appear nowhere
 * in xAI's /v1/tts/voices list, which is keyed by human names (altair, ara, …).
 * That comparison was by NAME, and it proved nothing. xAI does serve these ids
 * — one endpoint deeper:
 *
 *     GET https://api.x.ai/v1/tts/voices/{voice_id}
 *     → { voice_id, name, language, gender, age }
 *
 * It is a GET. It renders no audio and costs nothing, which is why this runs
 * before anyone proposes sampling a voice to listen for its gender.
 *
 * WHAT IT READS. Every distinct xAI voice id in play, from three places:
 *   1. `app_config.pod_voice_pools`  — the pod casting pools (the 48)
 *   2. `tools/pod-voices-xai.json`   — the per-language xAI catalogue file
 *   3. `voices` rows with tts_engine='xai'
 *
 * WHAT IT WRITES (only under --apply). One `voices` row per resolved id:
 * gender, age, tts_locale/languages from the provider's `language`, display
 * name, plus metadata_source + metadata_checked_at recording where the answer
 * came from. Rows that already exist are UPDATED in place — voice_id is the
 * key, nothing is inserted twice, nothing is deleted, ever.
 *
 * WHAT IT REFUSES. An id the API does not know (404) is left ALONE: no row is
 * written with a guessed gender, and the id is reported as residual. NULL in
 * `voices.gender` means genuinely unknown — never "probably".
 *
 *   node tools/xai-voice-metadata-sync.cjs            # dry run, writes a log
 *   node tools/xai-voice-metadata-sync.cjs --apply    # writes `voices`
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const XAI_BASE = 'https://api.x.ai'
const SOURCE = 'xai:GET /v1/tts/voices/{id}'

let _supabase = null
function db() {
  if (!_supabase) _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return _supabase
}

function parseArgs(argv) {
  const out = { apply: false }
  for (const a of argv.slice(2)) {
    if (a === '--apply') out.apply = true
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length)
  }
  return out
}

/** The provider's word, normalised to the f/m the pools speak. */
function normaliseGender(g) {
  const s = String(g || '').trim().toLowerCase()
  if (s.startsWith('f')) return 'f'
  if (s.startsWith('m')) return 'm'
  return null
}

/**
 * xAI's `language` is sometimes a bare language ('tr', 'de') and sometimes a
 * locale ('ca-ES', 'en-GB'). Keep both readings rather than flattening one
 * into the other: the locale IS the accent, and the base is what routing keys
 * off.
 */
function splitLanguage(language) {
  const raw = String(language || '').trim()
  if (!raw || raw === 'multilingual') return { locale: null, base: raw === 'multilingual' ? 'mul' : null }
  return { locale: raw.includes('-') ? raw : null, base: raw.split('-')[0].toLowerCase() }
}

/** GET one voice by id. 404 → null (unknown), never a guess. */
async function fetchVoice(voiceId, apiKey, fetchImpl = fetch) {
  const res = await fetchImpl(`${XAI_BASE}/v1/tts/voices/${encodeURIComponent(voiceId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (res.status === 404) return { status: 404, meta: null }
  const text = await res.text()
  if (!res.ok) return { status: res.status, meta: null, error: text.slice(0, 200) }
  let meta = null
  try { meta = JSON.parse(text) } catch { return { status: res.status, meta: null, error: 'unparseable body' } }
  return { status: res.status, meta }
}

/** Pure: provider metadata → the `voices` row we would write. */
function voiceRow(voiceId, meta, checkedAt) {
  const gender = normaliseGender(meta.gender)
  const { locale, base } = splitLanguage(meta.language)
  return {
    voice_id: voiceId,
    type: 'tts',
    tts_engine: 'xai',
    tts_voice_name: meta.name || null,
    display_name: meta.name || null,
    tts_locale: locale,
    languages: base ? [base] : [],
    gender,
    age: meta.age || null,
    metadata_source: SOURCE,
    metadata_checked_at: checkedAt,
    is_active: true,
  }
}

/** Every distinct xAI voice id we use, with where each one is used. */
function collectIds({ pools, catalogueFile, voiceRows }) {
  const seen = new Map()
  const note = (id, where) => {
    if (!id) return
    if (!seen.has(id)) seen.set(id, { voice_id: id, used_in: [], names: new Set() })
    seen.get(id).used_in.push(where)
  }
  for (const [pool, genders] of Object.entries(pools || {})) {
    for (const slot of ['f', 'm']) {
      ;(genders[slot] || []).forEach((v, index) => {
        if (v.provider !== 'xai') return
        note(v.voice_id, `pool:${pool}.${slot}[${index}]`)
        if (v.name) seen.get(v.voice_id).names.add(v.name)
      })
    }
  }
  for (const [lang, voices] of Object.entries(catalogueFile || {})) {
    for (const v of voices || []) {
      note(v.voice_id, `pod-voices-xai.json:${lang}`)
      if (v.name) seen.get(v.voice_id).names.add(v.name)
    }
  }
  for (const r of voiceRows || []) {
    note(r.voice_id, 'voices-table')
    if (r.display_name) seen.get(r.voice_id).names.add(r.display_name)
  }
  return [...seen.values()].map(e => ({ ...e, names: [...e.names] }))
}

async function run() {
  const args = parseArgs(process.argv)
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) throw new Error('XAI_API_KEY not set — cannot ask the provider')

  const { data: cfg, error: cErr } = await db()
    .from('app_config').select('value').eq('key', 'pod_voice_pools').single()
  if (cErr) throw new Error(`load pod_voice_pools: ${cErr.message}`)
  const pools = cfg.value || {}

  const catalogueFile = require('./pod-voices-xai.json')
  const { data: existing, error: vErr } = await db()
    .from('voices').select('*').eq('tts_engine', 'xai')
  if (vErr) throw new Error(`load voices: ${vErr.message}`)

  const ids = collectIds({ pools, catalogueFile, voiceRows: existing })
  const byId = new Map(existing.map(r => [r.voice_id, r]))
  const checkedAt = new Date().toISOString()

  const results = []
  for (const entry of ids) {
    const { status, meta, error } = await fetchVoice(entry.voice_id, apiKey)
    const row = meta ? voiceRow(entry.voice_id, meta, checkedAt) : null
    results.push({ ...entry, status, meta, error: error || null, row, existed: byId.has(entry.voice_id) })
  }

  // Two populations, deliberately separate. `known` = the API answered at all,
  // so name/language/age are worth recording even when it withheld a gender
  // (xAI omits `gender` on a handful of its own catalogue voices). `residual` =
  // no gender on record, which is the thing a human ear would have to settle.
  const known = results.filter(r => r.row)
  const resolved = results.filter(r => r.row && r.row.gender)
  const residual = results.filter(r => !r.row || !r.row.gender)

  // Pool slots are the point of the exercise: does the provider agree with the
  // list the voice sits in?
  const poolChecks = []
  for (const r of resolved) {
    for (const where of r.used_in) {
      const m = /^pool:(.+)\.([fm])\[(\d+)\]$/.exec(where)
      if (!m) continue
      poolChecks.push({
        pool: m[1], slot: m[2], index: Number(m[3]), voice_id: r.voice_id,
        pool_name: r.names[0] || null, provider_gender: r.row.gender,
        provider_language: r.meta.language, provider_age: r.row.age,
        verdict: r.row.gender === m[2] ? 'ok' : 'mismatch',
      })
    }
  }
  const poolResidual = results
    .filter(r => (!r.row || !r.row.gender) && r.used_in.some(w => w.startsWith('pool:')))

  console.log(`${ids.length} distinct xAI voice ids in play — ${known.length} known to the API, ${resolved.length} with a stated gender, ${residual.length} without`)
  console.log(`pool slots checked: ${poolChecks.length} — ${poolChecks.filter(p => p.verdict === 'ok').length} agree with the provider, ${poolChecks.filter(p => p.verdict === 'mismatch').length} MISMATCH, ${poolResidual.length} still unverified\n`)
  for (const p of poolChecks.filter(x => x.verdict === 'mismatch')) {
    console.log(`MISMATCH ${p.pool}.${p.slot}[${p.index}]  ${p.pool_name} (xai:${p.voice_id}) — xAI says ${p.provider_gender}, pool says ${p.slot}`)
  }
  for (const r of residual) {
    console.log(`UNRESOLVED xai:${r.voice_id} (${r.names.join('/') || 'no name'}) — HTTP ${r.status}${r.error ? ` ${r.error}` : ''} — used in ${r.used_in.join(', ')}`)
  }

  const out = args.out || path.resolve(
    __dirname, '..', 'docs/voice-engine/pod-cast',
    `xai-voice-metadata-${args.apply ? 'applied' : 'dryrun'}-log.json`,
  )
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify({
    ran_at: checkedAt,
    mode: args.apply ? 'applied' : 'dryrun',
    endpoint: `${XAI_BASE}/v1/tts/voices/{voice_id}`,
    counts: {
      ids: ids.length, known: known.length, resolved: resolved.length, unresolved: residual.length,
      pool_slots: poolChecks.length,
      pool_ok: poolChecks.filter(p => p.verdict === 'ok').length,
      pool_mismatch: poolChecks.filter(p => p.verdict === 'mismatch').length,
      pool_unverified: poolResidual.length,
    },
    pool_checks: poolChecks,
    residual: residual.map(r => ({ voice_id: r.voice_id, names: r.names, status: r.status, used_in: r.used_in })),
    voices: results.map(r => ({ voice_id: r.voice_id, status: r.status, meta: r.meta, row: r.row, existed: r.existed })),
  }, null, 2))
  console.log(`\nlog → ${out}`)

  if (!args.apply) return console.log('DRY RUN — nothing written. Re-run with --apply.')

  let inserted = 0, updated = 0
  for (const r of known) {
    if (r.existed) {
      const { voice_id, ...patch } = r.row
      const { error } = await db().from('voices').update(patch).eq('voice_id', voice_id)
      if (error) throw new Error(`update ${voice_id}: ${error.message}`)
      updated++
    } else {
      const { error } = await db().from('voices').insert(r.row)
      if (error) throw new Error(`insert ${r.row.voice_id}: ${error.message}`)
      inserted++
    }
  }
  console.log(`written: ${inserted} inserted, ${updated} updated — ${resolved.length} carry a provider-stated gender, ${known.length - resolved.length} recorded with gender NULL (the API withheld it), ${results.length - known.length} untouched (the API does not know the id)`)

  const { data: check, error: kErr } = await db()
    .from('voices').select('voice_id,gender').eq('tts_engine', 'xai').not('gender', 'is', null)
  if (kErr) throw new Error(`verify: ${kErr.message}`)
  if (check.length < resolved.length) throw new Error(`verify: expected ≥${resolved.length} gendered xai rows, found ${check.length}`)
  console.log(`verified: ${check.length} xai voices in \`voices\` now carry a provider-stated gender`)
}

if (require.main === module) run().catch(e => { console.error(e.message); process.exit(1) })

module.exports = { normaliseGender, splitLanguage, voiceRow, collectIds, fetchVoice }
