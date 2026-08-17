#!/usr/bin/env node
/**
 * T-21 regional-variant pool keys — the gated write.
 *
 *   node tools/t21-variant-pool-keys.cjs            # DRY RUN (default)
 *   node tools/t21-variant-pool-keys.cjs --apply    # write
 *
 * Two writes, both reversible, neither of them audio:
 *
 *  1. app_config.pod_voice_pools — split the regional variants that Tom has
 *     ruled on into their own keys, so a re-sync/re-cast reproduces his ruling
 *     from the stored data alone:
 *       deu     Moritz + Lena   (production pair; his German ruling)
 *       deu_at  Felix + Sonja   (the old deu pool pair; his Austrian ruling)
 *       ara_eg  Rex + Eve       (his Egyptian ruling; no ara_eg pool existed)
 *     `ara` (MSA) is NOT touched — Tom rejected all four candidates, so it must
 *     stay uncast. `fra` is NOT touched — his one word on the French base pair
 *     is still outstanding. `ara_sy` and `fra_ca` already hold his rulings.
 *
 *  2. courses.voice_pool_key — the explicit per-course key, set ONLY where the
 *     pool it names genuinely exists.
 *
 * EVERY LOCALE HERE IS COPIED FROM LIVE DATA, NEVER INVENTED. Each voice is
 * stamped with the locale its own pod cast is stored with today
 * (listening_pods.speakers), so a re-cast reproduces the bytes Tom actually
 * listened to. Notably Austrian German's Felix/Sonja are stamped 'de', not
 * 'de-AT': 'de' is what they were sampled and approved at, and changing the
 * steering tag would change the sound of a pair he has already passed by ear.
 *
 * ⚠️ NO AUDIO. This script writes app_config and courses. It never touches
 * listening_pods.speakers, listening_pod_sentences, course_audio or S3, and it
 * generates nothing. Corrected pools sit in place until a re-cast is approved.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const APPLY = process.argv.includes('--apply')
const OUT = path.resolve(__dirname, '../docs/pods')

// --- 1. The pool edits -------------------------------------------------------
// `expect` is the before-state assertion: the run aborts if the live pool has
// drifted from what this plan was written against.
const POOL_PLAN = [
  {
    key: 'deu',
    why: "Tom 2026-08-17: German keeps the PRODUCTION pair Moritz + Lena; the official pool pair Felix/Sonja was not picked and moves to deu_at.",
    expect: { m: ['e1fc5a89', 'de-DE-ConradNeural'], f: ['44c91d64', 'de-DE-KatjaNeural'] },
    value: {
      m: [
        { provider: 'xai', voice_id: '41321eb41295', name: 'Moritz', locale: 'de' },
        { provider: 'azure', voice_id: 'de-DE-ConradNeural', name: 'Conrad' },
      ],
      f: [
        { provider: 'xai', voice_id: '3a7889066fa2', name: 'Lena', locale: 'de' },
        { provider: 'azure', voice_id: 'de-DE-KatjaNeural', name: 'Katja' },
      ],
    },
  },
  {
    key: 'deu_at',
    why: "Tom 2026-08-17: Austrian German approved as sampled on Felix + Sonja. Locale 'de' is what they were sampled at (deu_at_for_eng:pod-0 stores locale 'de'); de-AT steering is available but would change a sound he has already passed.",
    expect: null,            // must not exist yet
    value: {
      m: [{ provider: 'xai', voice_id: 'e1fc5a89', name: 'Felix', locale: 'de' }],
      f: [{ provider: 'xai', voice_id: '44c91d64', name: 'Sonja', locale: 'de' }],
    },
  },
  {
    key: 'ara_eg',
    why: "Tom 2026-08-17: Egyptian Arabic approved on Rex + Eve, the production side of the fork. Locale ar-EG copied from the stored ara_eg_for_eng:pod-0 cast.",
    expect: null,
    value: {
      m: [{ provider: 'xai', voice_id: 'rex', name: 'Rex', locale: 'ar-EG' }],
      f: [{ provider: 'xai', voice_id: 'eve', name: 'Eve', locale: 'ar-EG' }],
    },
  },
]

// --- 2. The course keys ------------------------------------------------------
// Every variant course whose pool key exists AFTER the plan above. deu_ch and
// ara_lb are deliberately absent: they have no pool, so they keep resolving to
// deu / ara exactly as they do today rather than throwing.
const COURSE_KEYS = {
  deu_at_for_eng: 'deu_at', deu_at_for_jpn: 'deu_at', deu_at_for_zho: 'deu_at',
  ara_eg_for_eng: 'ara_eg', ara_eg_for_jpn: 'ara_eg', ara_eg_for_zho: 'ara_eg',
  ara_sy_for_eng: 'ara_sy', ara_sy_for_jpn: 'ara_sy', ara_sy_for_zho: 'ara_sy',
  fra_ca_for_eng: 'fra_ca',
  por_br_for_eng: 'por_br', por_br_for_jpn: 'por_br', por_br_for_zho: 'por_br',
  spa_mx_for_eng: 'spa_mx', spa_mx_for_jpn: 'spa_mx', spa_mx_for_zho: 'spa_mx',
}

const ids = (list) => (list || []).map((v) => v.voice_id)

// Canonical, key-order-independent serialisation. JSONB does not preserve object
// key order, so a raw JSON.stringify comparison of a value that round-tripped
// through Postgres fails on a write that was perfectly correct — which is
// exactly what happened on the first apply of this script.
function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`
  if (v && typeof v === 'object') {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(',')}}`
  }
  return JSON.stringify(v)
}

async function main() {
  const log = { mode: APPLY ? 'apply' : 'dry-run', pools: [], courses: [], aborted: null }

  // ---- load + assert -------------------------------------------------------
  const { data: cfg, error: cfgErr } = await supabase
    .from('app_config').select('value').eq('key', 'pod_voice_pools').single()
  if (cfgErr) throw new Error(`load pod_voice_pools: ${cfgErr.message}`)
  const pools = cfg.value
  const next = JSON.parse(JSON.stringify(pools))

  for (const p of POOL_PLAN) {
    const live = pools[p.key]
    // Already applied: the live pool IS the planned value. Idempotent by
    // design, so a re-run after a partial abort is safe rather than a drift.
    if (live && canon(live) === canon(p.value)) {
      next[p.key] = p.value
      log.pools.push({ key: p.key, why: p.why, skipped: 'already applied', after: p.value })
      continue
    }
    if (p.expect === null) {
      if (live) throw new Error(`DRIFT: pool "${p.key}" already exists — this plan assumed it did not. Nothing written.`)
    } else {
      if (!live) throw new Error(`DRIFT: pool "${p.key}" is missing. Nothing written.`)
      for (const g of ['m', 'f']) {
        const got = ids(live[g]).join(',')
        const want = p.expect[g].join(',')
        if (got !== want) throw new Error(`DRIFT: pool "${p.key}".${g} is [${got}], plan was written against [${want}]. Nothing written.`)
      }
    }
    next[p.key] = p.value
    log.pools.push({ key: p.key, why: p.why, before: live || null, after: p.value })
  }

  const codes = Object.keys(COURSE_KEYS)
  const { data: courses, error: cErr } = await supabase
    .from('courses').select('course_code, target_lang, known_lang, voice_pool_key').in('course_code', codes)
  if (cErr) throw new Error(`load courses: ${cErr.message}`)
  const byCode = new Map((courses || []).map((c) => [c.course_code, c]))

  for (const code of codes) {
    const row = byCode.get(code)
    if (!row) { log.courses.push({ course_code: code, skipped: 'no such course' }); continue }
    const want = COURSE_KEYS[code]
    if (!next[want]) throw new Error(`DRIFT: course ${code} wants pool "${want}", which does not exist even after the pool plan. Nothing written.`)
    if (row.voice_pool_key === want) { log.courses.push({ course_code: code, skipped: 'already set', voice_pool_key: want }); continue }
    if (row.voice_pool_key != null) throw new Error(`DRIFT: course ${code} already carries voice_pool_key "${row.voice_pool_key}", plan wanted "${want}". Nothing written.`)
    log.courses.push({ course_code: code, target_lang: row.target_lang, before: null, after: want })
  }

  // ---- write ---------------------------------------------------------------
  if (APPLY) {
    const { error: upErr } = await supabase
      .from('app_config').update({ value: next }).eq('key', 'pod_voice_pools')
    if (upErr) throw new Error(`write pod_voice_pools: ${upErr.message}`)

    for (const c of log.courses) {
      if (c.skipped) continue
      const { error } = await supabase
        .from('courses').update({ voice_pool_key: c.after }).eq('course_code', c.course_code)
      if (error) throw new Error(`write ${c.course_code}: ${error.message}`)
    }

    // ---- re-read and reconcile against the log, exactly ---------------------
    const { data: after } = await supabase
      .from('app_config').select('value').eq('key', 'pod_voice_pools').single()
    for (const p of log.pools) {
      if (canon(after.value[p.key]) !== canon(p.after)) {
        throw new Error(`RECONCILE FAILED: pool "${p.key}" is not what was logged\n  live: ${canon(after.value[p.key])}\n  logged: ${canon(p.after)}`)
      }
    }
    const { data: afterCourses } = await supabase
      .from('courses').select('course_code, voice_pool_key').in('course_code', codes)
    const gotByCode = new Map((afterCourses || []).map((c) => [c.course_code, c.voice_pool_key]))
    for (const c of log.courses) {
      const want = c.skipped === 'no such course' ? undefined : (c.after || c.voice_pool_key)
      if (want !== undefined && gotByCode.get(c.course_code) !== want) {
        throw new Error(`RECONCILE FAILED: ${c.course_code} reads "${gotByCode.get(c.course_code)}", logged "${want}"`)
      }
    }
    log.reconciled = true
  }

  const file = path.join(OUT, `t21-variant-pool-keys-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(file, JSON.stringify(log, null, 2))
  console.log(`\n${APPLY ? '✅ APPLIED' : '🔍 DRY RUN'} — ${log.pools.length} pool keys, ${log.courses.filter((c) => !c.skipped).length} course keys`)
  for (const p of log.pools) console.log(`   pool  ${p.key.padEnd(8)} m=${ids(p.after.m).join(',')}  f=${ids(p.after.f).join(',')}`)
  for (const c of log.courses) console.log(`   course ${c.course_code.padEnd(16)} ${c.skipped || `${c.target_lang} → ${c.after}`}`)
  console.log(`   log: ${file}\n`)
}

main().catch((e) => { console.error(`\n❌ ${e.message}\n`); process.exit(1) })
