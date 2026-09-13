#!/usr/bin/env node
/**
 * pod1-eligibility-census.cjs — which courses can actually MOVE to POD 1.
 *
 * READ-ONLY. No writes of any kind. Safe to re-run.
 *
 * Tom's constraint (2026-09-02): "we can only move a course to a new POD, if it
 * exists for both that course's known AND target languages". Eligibility is a
 * property of the language PAIR, not of the course. This tool measures it from
 * listening_pods + listening_pod_sentences and nothing else.
 *
 *   node tools/pods/pod1-eligibility-census.cjs [--json=out.json]
 */
'use strict'
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const { createClient } = require('@supabase/supabase-js')
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const arg = (n) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=').slice(1).join('=') : null }

// Language derivation: course codes are `<target>_for_<known>`. Dialects are
// DISTINCT languages (Tom, 2026-09-02) — spa vs spa_mx, por vs por_br,
// cym_n vs cym_s, ara vs ara_eg vs ara_sy, deu vs deu_at, fra vs fra_ca.
const langsOf = (code) => {
  const i = code.indexOf('_for_')
  if (i < 0) return { target: null, known: null }
  return { target: code.slice(0, i), known: code.slice(i + 5) }
}

const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0

;(async () => {
  // 1. every pod row, all slugs (129) — we need pod-1 rows plus the pod-0 fleet.
  const { data: pods, error: e1 } = await db
    .from('listening_pods').select('id, course_code, slug, title, pod_order, visibility')
  if (e1) throw e1

  // 2. every sentence for the pods we care about, counted per pod.
  const podIds = pods.map(p => p.id)
  const counts = new Map() // pod_id -> {known, target, rows}
  for (let i = 0; i < podIds.length; i += 20) {
    const chunk = podIds.slice(i, i + 20)
    let from = 0
    for (;;) {
      const { data, error } = await db.from('listening_pod_sentences')
        .select('pod_id, known_text, target_text').in('pod_id', chunk).order('id').range(from, from + 999)
      if (error) throw error
      for (const r of data) {
        const c = counts.get(r.pod_id) || { rows: 0, known: 0, target: 0 }
        c.rows++
        if (nonEmpty(r.known_text)) c.known++
        if (nonEmpty(r.target_text)) c.target++
        counts.set(r.pod_id, c)
      }
      if (data.length < 1000) break
      from += 1000
    }
  }

  const pod1 = pods.filter(p => p.slug === 'pod-1')
  const pod0 = pods.filter(p => p.slug === 'pod-0')

  // 3. per-language POD 1 inventory. A language has POD 1 content on the TARGET
  //    side if some pod-1 pod whose course's target language is L has >0 rows
  //    with non-empty target_text; KNOWN side likewise on known_text.
  const inv = new Map() // lang -> {targetRows, targetCourses[], knownRows, knownCourses[]}
  const bump = (lang, side, course, rows) => {
    if (!lang) return
    const e = inv.get(lang) || { targetRows: 0, targetCourses: [], knownRows: 0, knownCourses: [] }
    e[side + 'Rows'] += rows
    if (rows > 0) e[side + 'Courses'].push({ course, rows })
    inv.set(lang, e)
  }
  for (const p of pod1) {
    const { target, known } = langsOf(p.course_code)
    const c = counts.get(p.id) || { rows: 0, known: 0, target: 0 }
    bump(target, 'target', p.course_code, c.target)
    bump(known, 'known', p.course_code, c.known)
  }

  const verdict = (code) => {
    const { target, known } = langsOf(code)
    const t = inv.get(target), k = inv.get(known)
    const tOk = !!(t && t.targetRows > 0), kOk = !!(k && k.knownRows > 0)
    return {
      course: code, targetLang: target, knownLang: known,
      targetSide: tOk ? t.targetRows : 0, knownSide: kOk ? k.knownRows : 0,
      targetSideSource: tOk ? t.targetCourses.map(x => x.course) : [],
      knownSideSource: kOk ? k.knownCourses.map(x => x.course) : [],
      eligible: tOk && kOk,
      blockedOn: tOk && kOk ? null : (!tOk && !kOk ? 'both' : (!tOk ? 'target' : 'known')),
      missingLangs: [...(tOk ? [] : [target]), ...(kOk ? [] : [known])]
    }
  }

  const isTest = (c) => /^zzz_/.test(c)
  const fleet = pod0.map(p => p.course_code).sort().map(verdict)
  const controls = pod1.map(p => p.course_code).sort().map(c => {
    const v = verdict(c)
    const cc = counts.get(`${c}:pod-1`) || counts.get(pod1.find(p => p.course_code === c).id) || { rows: 0, known: 0, target: 0 }
    return { ...v, ownPod1Rows: cc.rows, ownKnownRows: cc.known, ownTargetRows: cc.target }
  })

  // 3b. DEFINITION B ("mirror"): a language has POD 1 TEXT if it appears on
  //     EITHER side of any pod-1 pod. The 231-line English script is identical
  //     across all 22 pod-1 courses bar 5 lines that name the target language,
  //     so English POD 1 text demonstrably exists — as known_text — even though
  //     no pod-1 course has English as its TARGET. Under B a course is eligible
  //     if POD 1 text exists in both its languages, on either side.
  const anySide = new Set()
  for (const [lang, v] of inv) { if (v.targetRows > 0 || v.knownRows > 0) anySide.add(lang) }
  const verdictB = (code) => {
    const { target, known } = langsOf(code)
    return { course: code, targetLang: target, knownLang: known,
      eligible: anySide.has(target) && anySide.has(known),
      missingLangs: [...(anySide.has(target) ? [] : [target]), ...(anySide.has(known) ? [] : [known])] }
  }

  // 4. blocked set collapsed by language
  const byLang = new Map()
  for (const f of fleet.filter(f => !f.eligible)) {
    for (const L of f.missingLangs) {
      const side = L === f.knownLang ? 'known' : 'target'
      const key = `${L}|${side}`
      const e = byLang.get(key) || { lang: L, side, courses: [] }
      e.courses.push(f.course); byLang.set(key, e)
    }
  }
  const ranked = [...byLang.values()].sort((a, b) => b.courses.length - a.courses.length)

  const fleetB = pod0.map(p => p.course_code).sort().map(verdictB)
  const byLangB = new Map()
  for (const f of fleetB.filter(f => !f.eligible)) for (const L of f.missingLangs) {
    const e = byLangB.get(L) || { lang: L, courses: [] }; e.courses.push(f.course); byLangB.set(L, e)
  }
  const rankedB = [...byLangB.values()].sort((a, b) => b.courses.length - a.courses.length)

  const out = {
    generated_at: new Date().toISOString(),
    definition: 'POD 1 content exists for language L on side S iff >=1 listening_pods row with slug=pod-1 whose course code maps L to side S has >=1 listening_pod_sentences row with non-empty <S>_text. Course code parsed as <target>_for_<known>. Dialects are distinct languages.',
    pod_slug_counts: pods.reduce((m, p) => (m[p.slug] = (m[p.slug] || 0) + 1, m), {}),
    pod1_inventory: [...inv.entries()].map(([lang, v]) => ({ lang, ...v })).sort((a, b) => a.lang.localeCompare(b.lang)),
    fleet_pod0: fleet,
    controls_pod1: controls,
    blocked_by_language_ranked: ranked,
    definition_b: 'MIRROR: language L has POD 1 text if L appears on EITHER side of any pod-1 pod (English qualifies via known_text).',
    fleet_pod0_definition_b: fleetB,
    blocked_by_language_ranked_definition_b: rankedB,
    summary: {
      pod0_total: fleet.length,
      pod0_eligible: fleet.filter(f => f.eligible).length,
      pod0_blocked: fleet.filter(f => !f.eligible).length,
      pod0_real_total: fleet.filter(f => !isTest(f.course)).length,
      pod0_real_eligible: fleet.filter(f => f.eligible && !isTest(f.course)).length,
      controls_total: controls.length,
      controls_eligible: controls.filter(c => c.eligible).length,
      pod0_eligible_definition_b: fleetB.filter(f => f.eligible).length,
      pod0_real_eligible_definition_b: fleetB.filter(f => f.eligible && !isTest(f.course)).length
    }
  }

  const w = (s) => process.stdout.write(s + '\n')
  w('POD 1 eligibility census — READ-ONLY')
  w(JSON.stringify(out.summary, null, 1))
  w('\n--- pod-1 language inventory ---')
  for (const r of out.pod1_inventory) w(`${r.lang.padEnd(8)} target_rows=${String(r.targetRows).padStart(5)}  known_rows=${String(r.knownRows).padStart(5)}`)
  w('\n--- the 46 on pod-0 ---')
  for (const f of fleet) w(`${f.course.padEnd(22)} known=${String(f.knownLang).padEnd(7)} target=${String(f.targetLang).padEnd(7)} ${f.eligible ? 'ELIGIBLE' : 'BLOCKED(' + f.blockedOn + '): ' + f.missingLangs.join('+')}`)
  w('\n--- the 22 controls on pod-1 ---')
  for (const c of controls) w(`${c.course.padEnd(22)} own_rows=${String(c.ownPod1Rows).padStart(4)} known=${String(c.ownKnownRows).padStart(4)} target=${String(c.ownTargetRows).padStart(4)} ${c.eligible ? 'ok' : 'ELIGIBILITY-FAIL: ' + c.missingLangs.join('+')}`)
  w('\n--- blocked, by language ---')
  for (const r of ranked) w(`${r.lang} (${r.side} side): ${r.courses.length} courses`)

  w('\n--- DEFINITION B (mirror): eligible ---')
  for (const f of fleetB.filter(f => f.eligible)) w(`  ${f.course}`)
  w('--- DEFINITION B: blocked, by missing language ---')
  for (const r of rankedB) w(`  ${r.lang}: ${r.courses.length} (${r.courses.join(', ')})`)

  const jf = arg('json')
  if (jf) { fs.writeFileSync(jf, JSON.stringify(out, null, 2)); w(`\nwrote ${jf}`) }
})().catch(e => { console.error(e); process.exit(1) })
