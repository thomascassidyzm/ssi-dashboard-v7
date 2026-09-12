#!/usr/bin/env node
/**
 * eng_for_hin — drill कल रात and कल दोपहर beyond the one round that introduces
 * them, so the sense that was just fixed in the introduction gets used.
 *
 * KAI'S RULING (2026-09-03): use the "as in" context for all six कल chunks,
 * "then keep using the word in ONLY that sense… drill the new sense with
 * practice phrases it works in… and it needs to be drilled a lot", and
 * "I don't care about losing a few phrases, just make new ones".
 *
 * WHERE THE DRILLING ACTUALLY IS THIN, MEASURED RATHER THAN ASSUMED. Counting
 * the phrases whose decomposition tiles each कल chunk:
 *
 *     कल          → yesterday                 112 phrases across 67 seeds
 *     कल सुबह     → tomorrow morning           54 phrases across 36 seeds
 *     कल दोपहर    → tomorrow afternoon         20 phrases across  9 seeds
 *     कल क्या होगा → what's going to happen…    16 phrases across  9 seeds
 *     कल रात      → tomorrow night             13 phrases across  3 seeds
 *     कल रात सब   → everything last night        9 phrases across  1 seed
 *     कल रात के मुक़ाबले → than last night        8 phrases across  1 seed
 *
 * So two of the six are already drilled hard and two are ORPHANS — taught in
 * one round and never met again, which is canon P11's "no spaced repetition"
 * case. The two orphans are NOT fixed here and the reason is in the report:
 * "everything last night" and "than last night" are constituents that fit only
 * the frame of their own seed, so spreading them means inventing sentences
 * nobody would say. That is a chunk-boundary defect, not a drilling shortage.
 *
 * The two that CAN be spread are spread, into host LEGOs whose own phrase sets
 * already prove the adverbial slot exists (each host below has a live sibling
 * phrase using आज शाम "this evening" in exactly the slot कल रात takes here).
 *
 * EVERY ONE IS FUTURE, AND THAT IS THE POINT. कल रात = last night has no LEGO
 * of its own in this course — the six past uses of it elsewhere are GHOST tiles
 * — so a past drill here would teach untaught material. Keeping every added
 * drill on the future sense is exactly Kai's "keep using it in ONLY that sense"
 * for the stretch between seed 192, which teaches कल रात as tomorrow night, and
 * seed 234, where कल रात comes back as last night inside its own chunk.
 *
 * AUDIO. Three clips per phrase that cannot be rendered today — all four voices
 * on this course are xAI and xAI is retired. The learner walk DROPS a phrase
 * missing all three clips rather than playing a gap, so these join the queue
 * and reach a learner at the recast. An audio pass is queued. NO TTS.
 *
 *   node tools/course-optimization/spread-eng-for-hin-kal-drills-2026-09-03.cjs
 *   node tools/course-optimization/spread-eng-for-hin-kal-drills-2026-09-03.cjs --apply
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { decoratePhrasesWithDecomposition } = require('../../services/phrase-decomposition-writer.cjs')

const COURSE = 'eng_for_hin'
const APPLY = process.argv.includes('--apply')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

/**
 * host  — the LEGO the drill belongs to (its target text must be contained).
 * chunk — the कल LEGO being spread (its target text must be contained too).
 * pin   — the marker in the Hindi that fixes the direction, quoted.
 * model — the live sibling phrase that proves this slot takes a time adverbial.
 */
const DRILLS = [
  // ---- कल रात → tomorrow night (S0192L02), 3 seeds → 10 -------------------
  { host: 'S0197L01', chunk: 'S0192L02',
    known: 'वह कल रात मेरे बेटे से मिलना चाहती है।', target: 'she wants to meet my son tomorrow night',
    pin: 'चाहती है — a present want points forward; Hindi present cannot host कल = yesterday',
    model: 'S0197L01U02 वह आज शाम मेरे बेटे से मिलना चाहती है।' },
  { host: 'S0200L02', chunk: 'S0192L02',
    known: 'वे कल रात अंग्रेज़ी बोलने का अभ्यास करना चाहते हैं।', target: 'they want to practise speaking English tomorrow night',
    pin: 'चाहते हैं — present want',
    model: 'S0200L02U03 वे आज शाम अंग्रेज़ी बोलने का अभ्यास करना चाहते हैं।' },
  { host: 'S0203L01', chunk: 'S0192L02',
    known: 'आप कल रात क्या करेंगे?', target: 'what would you do tomorrow night?',
    pin: 'करेंगे — future',
    model: 'S0203L01B03 आप आज शाम क्या करेंगे?' },
  { host: 'S0205L02', chunk: 'S0192L02',
    known: 'क्या आप मुझे कल रात वह शब्द बता सकते हैं?', target: 'can you tell me the word tomorrow night?',
    pin: 'सकते हैं — present ability about a night still to come',
    model: 'S0205L02U05 क्या आप मुझे आज शाम वह शब्द बता सकते हैं?' },
  { host: 'S0210L02', chunk: 'S0192L02',
    known: 'मुझे लगता है कि हमें कल रात जवाब पर चर्चा करनी है।', target: 'I think that we need to discuss the answer tomorrow night',
    pin: 'करनी है — present obligation, so the discussion has not happened',
    model: 'S0210L02U03 मुझे लगता है कि हमें आज शाम जवाब पर चर्चा करनी है।' },
  { host: 'S0219L02', chunk: 'S0192L02',
    known: 'मैं कल रात थोड़ा आराम करना चाहूँगा।', target: "I'd like to relax for a while tomorrow night",
    pin: 'चाहूँगा — future desiderative',
    model: 'S0219L02U02 मैं आज शाम थोड़ा आराम करना चाहूँगा।' },
  { host: 'S0227L01', chunk: 'S0192L02',
    known: 'वह आदमी मुझे कल रात कुछ बताने वाला है।', target: 'that man is going to tell me something tomorrow night',
    pin: 'बताने वाला है — going to, explicitly prospective',
    model: 'S0227L01U03 वह आदमी मुझे आज शाम कुछ बताने वाला है।' },

  // ---- कल दोपहर → tomorrow afternoon (S0167L02), 9 seeds → 12 -------------
  { host: 'S0200L04', chunk: 'S0167L02',
    known: 'वे यह सुनिश्चित करना चाहते हैं कि हम कल दोपहर सब कुछ ख़त्म करें।', target: 'they want to make sure that we finish everything tomorrow afternoon',
    pin: 'चाहते हैं + subjunctive करें — the finishing is still ahead',
    model: 'S0200L04U04 वे यह सुनिश्चित करना चाहते हैं कि हम आज शाम सब कुछ ख़त्म करें।' },
  { host: 'S0203L02', chunk: 'S0167L02',
    known: 'अगर मैं आपसे कल दोपहर कहूँ तो आप मेरे साथ क्या करेंगे?', target: 'what would you do with me if I asked you tomorrow afternoon?',
    pin: 'कहूँ … करेंगे — subjunctive protasis, future apodosis',
    model: 'S0203L02U05 अगर मैं आपसे आज शाम कहूँ तो आप मेरे साथ क्या करेंगे?' },
  { host: 'S0217L01', chunk: 'S0167L02',
    known: 'क्या आप मुझे कल दोपहर एक-दो गिलास दे सकते हैं?', target: 'can you give me a glass or two tomorrow afternoon?',
    pin: 'सकते हैं — a present request about an afternoon still to come',
    model: 'S0217L01U02 क्या आप मुझे आज शाम एक-दो गिलास दे सकते हैं?' }
]

const normTarget = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim()
const normKnown = (s) => String(s || '').replace(/[।?!.,\s]+/g, ' ').trim()

function legoPosition (phraseTarget, legoTarget) {
  const i = normTarget(phraseTarget).indexOf(normTarget(legoTarget))
  if (i <= 0) return 'start'
  return (i + normTarget(legoTarget).length >= normTarget(phraseTarget).length) ? 'end' : 'middle'
}

async function main () {
  const { data: legos } = await sb.from('course_legos')
    .select('lego_id, seed_number, lego_index, known_text, target_text, is_new, type, components').eq('course_code', COURSE)
  const { data: phrases } = await sb.from('course_practice_phrases')
    .select('id, seed_number, lego_index, position, phrase_role, known_text, target_text').eq('course_code', COURSE)
  const byId = new Map(legos.map(l => [l.lego_id, l]))

  const vocabUpTo = (n) => {
    const v = new Set()
    for (const l of legos.filter(x => x.seed_number <= n)) {
      for (const w of normTarget(l.target_text).split(' ')) if (w) v.add(w)
      if (l.type === 'M' && Array.isArray(l.components)) {
        for (const c of l.components) for (const w of normTarget(c.target).split(' ')) if (w) v.add(w)
      }
    }
    return v
  }

  const problems = []
  const rows = []
  const seenKnown = new Set()

  for (const d of DRILLS) {
    const host = byId.get(d.host)
    const chunk = byId.get(d.chunk)
    if (!host) { problems.push(`${d.host}: host LEGO not found`); continue }
    if (!chunk) { problems.push(`${d.chunk}: chunk LEGO not found`); continue }
    const tag = `${d.host}←${d.chunk}`

    // The chunk must already be taught by the host's seed, or this drill is a
    // forward reference — the exact defect this whole pass exists to remove.
    if (chunk.seed_number > host.seed_number) {
      problems.push(`${tag}: ${d.chunk} debuts at seed ${chunk.seed_number}, after host seed ${host.seed_number}`)
    }
    // Containment, both ways: the drill belongs to its host and tiles the chunk.
    if (!normTarget(d.target).includes(normTarget(host.target_text))) {
      problems.push(`${tag}: does not contain the host LEGO "${host.target_text}"`)
    }
    if (!normTarget(d.target).includes(normTarget(chunk.target_text))) {
      problems.push(`${tag}: does not contain the कल chunk "${chunk.target_text}"`)
    }
    if (!d.known.includes(chunk.known_text)) {
      problems.push(`${tag}: known side does not contain "${chunk.known_text}"`)
    }
    // Target vocabulary at the host's seed.
    const missing = normTarget(d.target).split(' ').filter(w => w && !vocabUpTo(host.seed_number).has(w))
    if (missing.length) problems.push(`${tag}: target vocab not taught by seed ${host.seed_number} — ${missing.join(', ')}`)
    // Known side is a controlled language too.
    const knownSeen = new Set()
    const addWords = (t) => { for (const w of String(t || '').split(/\s+/)) { const c = w.replace(/[।?!.,]/g, ''); if (c) knownSeen.add(c) } }
    legos.filter(l => l.seed_number <= host.seed_number).forEach(l => addWords(l.known_text))
    phrases.filter(p => p.seed_number <= host.seed_number).forEach(p => addWords(p.known_text))
    const kMissing = d.known.split(/\s+/).map(w => w.replace(/[।?!.,]/g, '')).filter(w => w && !knownSeen.has(w))
    if (kMissing.length) problems.push(`${tag}: known-side words never met before seed ${host.seed_number} — ${kMissing.join(' ')}`)
    // ZUT and duplicates, course-wide.
    const clash = phrases.find(p => normKnown(p.known_text) === normKnown(d.known) && normTarget(p.target_text) !== normTarget(d.target))
    if (clash) problems.push(`${tag}: ZUT — "${clash.id}" already answers that prompt with "${clash.target_text}"`)
    if (phrases.some(p => normKnown(p.known_text) === normKnown(d.known) && normTarget(p.target_text) === normTarget(d.target))) {
      problems.push(`${tag}: duplicate of a live phrase`)
    }
    if (seenKnown.has(normKnown(d.known))) problems.push(`${tag}: duplicate within this batch`)
    seenKnown.add(normKnown(d.known))
    // The model phrase that proves the slot exists must really be live.
    const modelId = `${COURSE}:${d.model.split(' ')[0]}`
    if (!phrases.some(p => p.id === modelId)) problems.push(`${tag}: model phrase ${modelId} is not live`)

    const group = phrases.filter(p => p.seed_number === host.seed_number && p.lego_index === host.lego_index)
    const useCount = group.filter(p => p.phrase_role === 'use').length
    const id = `${COURSE}:${d.host}U${String(useCount + 1).padStart(2, '0')}`
    if (phrases.some(p => p.id === id) || rows.some(r => r.id === id)) { problems.push(`${tag}: id ${id} already taken`); continue }
    const position = Math.max(...group.map(p => p.position), 0) + 1

    rows.push({
      id,
      course_code: COURSE,
      seed_number: host.seed_number,
      lego_index: host.lego_index,
      position,
      known_text: d.known,
      target_text: d.target,
      phrase_role: 'use',
      status: 'draft',
      introduce: true,
      connected_lego_ids: [],
      lego_position: legoPosition(d.target, host.target_text),
      word_count: d.target.length,
      lego_count: d.known.split(/\s+/).length,
      metadata: {
        format: 'build_use',
        pipeline: 'v2',
        source: 'कल "as in" teaching, spread pass (Kai 2026-09-03)',
        chunk_drilled: d.chunk,
        sense: 'future',
        pin: d.pin,
        slot_precedent: d.model
      }
    })
    console.log(`${id}  host ${d.host} "${host.target_text}"  drills ${d.chunk} "${chunk.target_text}"  (use ${useCount} → ${useCount + 1})`)
    console.log(`   ${d.known}`)
    console.log(`   ${d.target}`)
    console.log(`   pin: ${d.pin}`)
  }

  const log = { course: COURSE, ranAt: new Date().toISOString(), mode: APPLY ? 'apply' : 'dry-run', problems, rows }

  if (problems.length) {
    console.error(`\nREFUSING — ${problems.length} precondition failure(s):`)
    problems.forEach(p => console.error('  - ' + p))
  } else if (APPLY) {
    const { data: inserted, error } = await sb.from('course_practice_phrases').insert(rows).select('id, seed_number, target_text')
    if (error) throw error
    const dec = await decoratePhrasesWithDecomposition(sb, rows.map(r => ({
      id: r.id, course_code: COURSE, seed_number: r.seed_number, target_text: r.target_text
    })))
    const { data: after } = await sb.from('course_practice_phrases')
      .select('id, target_text, decomposition').in('id', rows.map(r => r.id))
    // The player's Strategy-0 guard is exact concat equality, and a कल tile
    // with a null legoId is the ghost this pass exists to stop creating.
    const verify = after.map(a => ({
      id: a.id,
      concatMatches: Array.isArray(a.decomposition) && a.decomposition.map(b => b.target).join('') === a.target_text,
      ghostBlocks: Array.isArray(a.decomposition) ? a.decomposition.filter(b => !b.legoId).map(b => b.target) : null,
      kalTiledBy: Array.isArray(a.decomposition) ? (a.decomposition.find(b => /कल/.test(b.known || ''))?.legoId || null) : null
    }))
    log.inserted = inserted
    log.decoration = dec
    log.verifiedAfter = verify
    console.log(`\nInserted ${inserted.length}.`)
    console.log('verify:', JSON.stringify(verify, null, 1))
    if (verify.some(v => !v.concatMatches)) console.error('WARNING: a decomposition does not concatenate back to its target text')
    if (verify.some(v => v.ghostBlocks?.length)) console.error('WARNING: a new phrase carries a ghost tile')
  } else {
    console.log('\nDRY RUN — nothing written. Re-run with --apply.')
  }

  const out = path.join(__dirname, `spread-eng-for-hin-kal-drills-2026-09-03-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`log → ${out}`)
  if (problems.length) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
