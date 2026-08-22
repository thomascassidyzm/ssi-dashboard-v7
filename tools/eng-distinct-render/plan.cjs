#!/usr/bin/env node
/**
 * Turn the 672 render units into a concrete render plan: for each (norm, voice) pick
 * ONE raw text to synthesise and ONE owning course for the course_audio row.
 *
 * Why a choice is needed at all: `norm` strips punctuation, so several raw strings can
 * collapse into one render unit ("Good morning" / "Good morning."). The clip must say
 * something, so the plan picks the MODAL raw text across that unit's slots, tie-broken
 * towards the longer string — i.e. the one that keeps its punctuation, because that is
 * what the pod authors actually wrote and what the TTS prosody wants.
 *
 * Owner course: the modal course among the unit's slots, EXCLUDING cym_* (human-voiced,
 * never synthesised — services/shared/human-voice-courses.cjs) and zzz_test_*. A shared
 * clip is referenced cross-course by design (phase8 findAudioRowForClip, Tom 2026-08-11),
 * so the owner is bookkeeping, not scope.
 *
 * Role: the modal side of the unit's slots — 'known' where English is the known language,
 * 'target1' where the course puts English on the target side.
 *
 * Read-only. Writes render-plan.json.
 */
const fs = require('fs')
const rows = JSON.parse(fs.readFileSync(__dirname + '/slots-resolved.json'))
const need = JSON.parse(fs.readFileSync(__dirname + '/need.json'))

// One home for the human-voice rule, not a local regex that can drift from it.
const { isHumanVoiceCourse } = require('../../services/shared/human-voice-courses.cjs')
const HUMAN = { test: c => isHumanVoiceCourse(c) }, TEST = /^zzz_test/
const needKeys = new Set(need.map(u => u.norm + ' ' + u.want))

const bucket = new Map()
for (const r of rows) {
  if (!r.want || !r.norm) continue
  const k = r.norm + ' ' + r.want
  if (!needKeys.has(k)) continue
  if (!bucket.has(k)) bucket.set(k, [])
  bucket.get(k).push(r)
}

const modal = (arr, pick, tie = () => 0) => {
  const c = new Map()
  for (const x of arr) { const v = pick(x); if (v == null) continue; c.set(v, (c.get(v) || 0) + 1) }
  return [...c.entries()].sort((a, b) => b[1] - a[1] || tie(b[0], a[0]))[0]?.[0]
}

const plan = []
const skipped = []
for (const [k, slots] of bucket) {
  const [norm, want] = [slots[0].norm, slots[0].want]
  const text = modal(slots, s => s.txt, (a, b) => String(a).length - String(b).length)
  const eligible = slots.filter(s => !HUMAN.test(s.course_code) && !TEST.test(s.course_code))
  if (!eligible.length) { skipped.push({ key: k, reason: 'only human-voice/test courses use this line', courses: [...new Set(slots.map(s => s.course_code))] }); continue }
  const owner = modal(eligible, s => s.course_code)
  const side = modal(eligible, s => s.side)
  plan.push({
    norm, voice: want, text,
    role: side === 'known' ? 'known' : 'target1',
    owner_course: owner,
    slots: slots.length,
    courses: new Set(slots.map(s => s.course_code)).size,
  })
}

plan.sort((a, b) => b.slots - a.slots)
fs.writeFileSync(__dirname + '/render-plan.json', JSON.stringify(plan, null, 1))
const chars = plan.reduce((a, p) => a + p.text.length, 0)
console.log('render plan units:', plan.length)
console.log('  clone :', plan.filter(p => p.voice === 'gfzdpspr5fdp').length)
console.log('  olivia:', plan.filter(p => p.voice === 'bedd6226').length)
console.log('  roles :', JSON.stringify(plan.reduce((a, p) => (a[p.role] = (a[p.role] || 0) + 1, a), {})))
console.log('  chars :', chars, '-> $' + (chars / 1e6 * 15).toFixed(2))
console.log('  slots covered by these units:', plan.reduce((a, p) => a + p.slots, 0))
console.log('  owner courses:', new Set(plan.map(p => p.owner_course)).size)
console.log('  cym/test owners:', plan.filter(p => HUMAN.test(p.owner_course) || TEST.test(p.owner_course)).length)
console.log('SKIPPED (human/test-only lines):', skipped.length)
if (skipped.length) console.log(JSON.stringify(skipped, null, 1))
fs.writeFileSync(__dirname + '/render-plan-skipped.json', JSON.stringify(skipped, null, 1))
