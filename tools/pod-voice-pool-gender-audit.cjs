#!/usr/bin/env node
/**
 * Cross-check every `app_config.pod_voice_pools` gender list against the
 * provider's OWN catalogue, and move any voice sitting in the wrong gender
 * list into the right one.
 *
 * Why this exists (2026-08-11, Tom's ruling): the pod-0 rollout found `tur.f[0]`
 * — the voice pod-sync casts every Turkish female character to — was
 * `tr-TR-AhmetNeural`, which Azure's catalogue calls Male, while
 * `tr-TR-EmelNeural` (Female) sat in the MALE list. A clean transposition that
 * nobody had reason to look at, and the same class of silent miscast as the
 * Spanish accent rejection the day before: a label nobody checked.
 *
 * The check is cheap and needs no audio. Azure publishes a hard gender per
 * voice at /cognitiveservices/voices/list, so a pool entry's gender is a fact,
 * not a judgment. The check is therefore:
 *
 *     pool says slot 'f' → catalogue says Female?  else mismatch.
 *
 * xAI ENTRIES ARE CHECKABLE TOO (corrected 2026-08-11). This file used to say
 * they were not: xAI's /v1/tts/voices LIST is keyed by human names (altair,
 * ara, …) and our pool ids are opaque hex (`f331ee80`), so comparing the two
 * found nothing. That comparison was by name and proved nothing. xAI serves
 * these ids one endpoint deeper — GET /v1/tts/voices/{voice_id} returns
 * {voice_id, name, language, gender, age} — and 47 of the 48 pool entries
 * answer. `tools/xai-voice-metadata-sync.cjs` reads that endpoint (a GET; no
 * audio, no spend) and lands the answer in `voices.gender`, which is what this
 * audit now checks xAI entries against. An xAI voice with `voices.gender` NULL
 * is still UNVERIFIABLE — genuinely unknown, never guessed.
 *
 *   node tools/pod-voice-pool-gender-audit.cjs                  # audit only
 *   node tools/pod-voice-pool-gender-audit.cjs --fix=tur        # dry-run a fix
 *   node tools/pod-voice-pool-gender-audit.cjs --fix=tur --apply
 *
 * WHAT --fix DOES, EXACTLY. It moves each mismatched entry out of the list it
 * is in and into the other one, appended at the END, and leaves everything else
 * in its original relative order. Nothing is added, nothing is dropped: the
 * multiset of voices in the pool is asserted identical before and after, and
 * every other pool is asserted byte-identical. It writes ONE app_config row and
 * touches neither `courses.voice_config` nor `listening_pods.speakers`, so no
 * course's live casting moves and no rendered clip is orphaned.
 *
 * It refuses a pool with more than one mismatch per gender list, or one where a
 * fix would empty a gender list — those are scrambles, not transpositions, and
 * which voice belongs where is then a judgment call for a human.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

let _supabase = null
function db() {
  if (!_supabase) _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  return _supabase
}

function parseArgs(argv) {
  const out = { apply: false }
  for (const a of argv.slice(2)) {
    if (a === '--apply') out.apply = true
    else if (a.startsWith('--fix=')) out.fix = a.slice('--fix='.length)
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length)
  }
  return out
}

async function azureCatalogue() {
  const region = process.env.AZURE_SPEECH_REGION || process.env.AZURE_TTS_REGION
  const key = process.env.AZURE_SPEECH_KEY || process.env.AZURE_TTS_KEY
  if (!region || !key) throw new Error('AZURE_SPEECH_REGION/KEY not set — cannot read the catalogue')
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
    headers: { 'Ocp-Apim-Subscription-Key': key },
  })
  if (!res.ok) throw new Error(`azure voices/list: ${res.status}`)
  const list = await res.json()
  return new Map(list.map(v => [v.ShortName, v]))
}

/**
 * Every xAI voice whose gender the provider has actually stated, read from
 * `voices` — the column tools/xai-voice-metadata-sync.cjs fills from
 * GET /v1/tts/voices/{id}. A NULL gender is simply absent from the map, so an
 * unknown voice stays unverifiable rather than becoming a guess.
 *
 * `metadata_source` comes with it because not every answer is the provider's:
 * a cloned voice (Tom's own, eng.m[0]) is known by provenance instead, and the
 * report says so rather than counting it as provider-verified.
 */
async function xaiCatalogue() {
  const { data, error } = await db()
    .from('voices').select('voice_id,gender,tts_locale,languages,metadata_source')
    .eq('tts_engine', 'xai').not('gender', 'is', null)
  if (error) throw new Error(`load xai voices: ${error.message}`)
  return new Map(data.map(v => [v.voice_id, v]))
}

/**
 * One row per pool entry: where it sits, what the catalogue says it is.
 * verdict ∈ 'ok' | 'mismatch' | 'unverifiable' | 'absent'
 *
 * `xai` is optional: without it xAI entries are 'unverifiable' (the pre-2026-08-11
 * behaviour), with it they are checked exactly like Azure's.
 */
function audit(pools, catalogue, xai = null) {
  const rows = []
  for (const [pool, genders] of Object.entries(pools)) {
    for (const slot of ['f', 'm']) {
      ;(genders[slot] || []).forEach((v, index) => {
        const base = { pool, slot, index, provider: v.provider, voice_id: v.voice_id, name: v.name }
        if (v.provider === 'xai' && xai) {
          const x = xai.get(v.voice_id)
          if (!x) return rows.push({ ...base, verdict: 'unverifiable', catalogue_gender: null })
          return rows.push({
            ...base,
            verdict: x.gender === slot ? 'ok' : 'mismatch',
            catalogue_gender: x.gender,
            gender_source: x.metadata_source || null,
            locale: x.tts_locale || (x.languages || [])[0] || null,
          })
        }
        if (v.provider !== 'azure') return rows.push({ ...base, verdict: 'unverifiable', catalogue_gender: null })
        const hit = catalogue.get(v.voice_id)
        if (!hit) return rows.push({ ...base, verdict: 'absent', catalogue_gender: null })
        const real = hit.Gender === 'Female' ? 'f' : hit.Gender === 'Male' ? 'm' : null
        rows.push({ ...base, verdict: real === slot ? 'ok' : 'mismatch', catalogue_gender: real, locale: hit.Locale })
      })
    }
  }
  return rows
}

/**
 * Move every mismatched entry of one pool into the gender list its provider
 * says it belongs to, appended at the end. Pure; throws rather than guessing.
 */
function correctPool(poolBefore, mismatches) {
  const per = { f: mismatches.filter(m => m.slot === 'f'), m: mismatches.filter(m => m.slot === 'm') }
  for (const slot of ['f', 'm']) {
    if (per[slot].length > 1) {
      throw new Error(`${per[slot].length} mismatches in the "${slot}" list — that is a scramble, not a transposition; a human picks`)
    }
  }
  const moved = new Set(mismatches.map(m => `${m.slot}:${m.voice_id}`))
  const after = { ...poolBefore }
  for (const slot of ['f', 'm']) {
    const other = slot === 'f' ? 'm' : 'f'
    const kept = (poolBefore[slot] || []).filter(v => !moved.has(`${slot}:${v.voice_id}`))
    const incoming = (poolBefore[other] || []).filter(v => moved.has(`${other}:${v.voice_id}`))
    after[slot] = [...kept, ...incoming]
    if (!after[slot].length) throw new Error(`fixing would empty the "${slot}" list — refusing`)
  }
  const bag = o => JSON.stringify([...(o.f || []), ...(o.m || [])].map(v => `${v.provider}:${v.voice_id}`).sort())
  if (bag(poolBefore) !== bag(after)) throw new Error('the fix would add or drop a voice — refusing')
  return after
}

function label(v) {
  return `${v.name} (${v.provider}:${v.voice_id})`
}

async function run() {
  const args = parseArgs(process.argv)
  const catalogue = await azureCatalogue()
  const xai = await xaiCatalogue()
  const { data: row, error } = await db()
    .from('app_config').select('value').eq('key', 'pod_voice_pools').single()
  if (error) throw new Error(`load pod_voice_pools: ${error.message}`)
  const before = row.value || {}

  const rows = audit(before, catalogue, xai)
  const mismatches = rows.filter(r => r.verdict === 'mismatch')
  const absent = rows.filter(r => r.verdict === 'absent')
  const unverifiable = rows.filter(r => r.verdict === 'unverifiable')
  const ok = rows.filter(r => r.verdict === 'ok')
  const humanKnown = ok.filter(r => /^human/.test(r.gender_source || ''))
  const counts = { pools: Object.keys(before).length, entries: rows.length, ok: ok.length, ok_human_known: humanKnown.length, mismatch: mismatches.length, absent: absent.length, unverifiable: unverifiable.length }

  console.log(`${counts.pools} pools, ${counts.entries} entries: ${counts.ok - counts.ok_human_known} provider-verified ok, ${counts.ok_human_known} ok on human knowledge, ${counts.mismatch} mismatched, ${counts.absent} not in the provider's catalogue, ${counts.unverifiable} with no provider-stated gender\n`)
  for (const h of humanKnown) console.log(`HUMAN-KNOWN ${h.pool}.${h.slot}[${h.index}]  ${h.name} (${h.provider}:${h.voice_id}) — ${h.gender_source}`)
  for (const m of mismatches) {
    console.log(`MISMATCH ${m.pool}.${m.slot}[${m.index}]  ${m.name} (${m.provider}:${m.voice_id})  — ${m.provider} says ${m.catalogue_gender === 'f' ? 'Female' : 'Male'}, pool says ${m.slot === 'f' ? 'female' : 'male'}`)
  }
  for (const a of absent) console.log(`ABSENT   ${a.pool}.${a.slot}[${a.index}]  ${a.provider}:${a.voice_id} is not in the catalogue`)
  for (const u of unverifiable) console.log(`UNVERIFIABLE ${u.pool}.${u.slot}[${u.index}]  ${u.name} (${u.provider}:${u.voice_id}) — no provider-stated gender on record`)
  if (!mismatches.length) console.log('no gender mismatches.')

  let after = before
  if (args.fix) {
    if (!before[args.fix]) throw new Error(`no pool "${args.fix}"`)
    const mine = mismatches.filter(m => m.pool === args.fix)
    if (!mine.length) throw new Error(`pool "${args.fix}" has no mismatch to fix`)
    after = { ...before, [args.fix]: correctPool(before[args.fix], mine) }
    for (const key of Object.keys(before)) {
      if (key === args.fix) continue
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) throw new Error(`pool "${key}" would change — refusing`)
    }
    if (Object.keys(before).length !== Object.keys(after).length) throw new Error('pool count changed — refusing')
    console.log('')
    for (const g of ['f', 'm']) {
      console.log(`${args.fix}.${g}:`)
      console.log(`  before  ${(before[args.fix][g] || []).map(label).join('  →  ')}`)
      console.log(`  after   ${(after[args.fix][g] || []).map(label).join('  →  ')}`)
    }
  }

  const out = args.out || path.resolve(
    __dirname, '..', 'docs/voice-engine/pod-cast',
    `pool-gender-audit${args.fix ? `-fix-${args.fix}` : ''}-${args.apply ? 'applied' : 'dryrun'}-log.json`,
  )
  fs.mkdirSync(path.dirname(out), { recursive: true })
  fs.writeFileSync(out, JSON.stringify({
    ran_at: new Date().toISOString(),
    mode: args.fix ? (args.apply ? 'applied' : 'dryrun') : 'audit',
    counts, rows,
    fix: args.fix || null,
    before: args.fix ? before[args.fix] : null,
    after: args.fix ? after[args.fix] : null,
    pools_before: before,
  }, null, 2))
  console.log(`\nlog → ${out}`)

  if (!args.fix) return
  if (!args.apply) return console.log('DRY RUN — nothing written. Re-run with --apply.')

  const { data: fresh, error: fErr } = await db()
    .from('app_config').select('value').eq('key', 'pod_voice_pools').single()
  if (fErr) throw new Error(`re-read: ${fErr.message}`)
  if (JSON.stringify(fresh.value || {}) !== JSON.stringify(before)) {
    throw new Error('pod_voice_pools changed under this run — not overwriting')
  }
  const { error: uErr } = await db().from('app_config').update({ value: after }).eq('key', 'pod_voice_pools')
  if (uErr) throw new Error(`write: ${uErr.message}`)
  console.log('written')
}

if (require.main === module) run().catch(e => { console.error(e.message); process.exit(1) })

module.exports = { audit, correctPool }
