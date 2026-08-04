/**
 * Walkthrough gate tests — node's built-in runner, zero dependencies:
 *
 *   node --test tools/walkthrough/
 *
 * Popty's CI runs no test suite (only the explainer drift gate), so these run
 * from .github/workflows/explainer-check.yml alongside the compiler's --check.
 * Fixtures, not the real repo: the gates are pure, so the tests stay honest
 * even while the real anchors are still being annotated.
 *
 * The load-bearing case is `persona mismatch FAILS` — the scout's warning was
 * that a ported gate would be "a no-op that looks like a gate", letting a
 * recorder be pointed at an admin-only button. That case is asserted here.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  validateWalkSchema, gateAnchors, gatePlaces, gateOffers, gateSafety,
  gateNoAutoPlay, gateRuntimeDenylist, gateIdsAndChains, gateInventory,
  anchorSitesIn, personasAdmittedByGuards, gateRecorderConfinement, DESTRUCTIVE_ANCHOR_PATTERNS,
} from './lib.mjs'

// ─── Fixtures ───────────────────────────────────────────────────────────────

const RUNTIME_SRC = `
export const KNOWN_PLACES = ['home', 'courses', 'checking', 'record-room', 'admin', 'how']
export const DESTRUCTIVE_ANCHOR_PATTERNS = [
  ${DESTRUCTIVE_ANCHOR_PATTERNS.map((r) => r.toString()).join(', ')}
]
`

// An admin-only button and an everyone button, guarded the way Popty really
// does it: the guard is on the section wrapper, not on the button.
const ADMIN_SECTION_VUE = `
<template>
  <section v-if="isAdmin">
    <button data-walk="open-user-management" data-persona="admin">Users</button>
  </section>
  <button data-walk="open-course" data-persona="all">Open</button>
</template>
`

const walk = (over = {}) => ({
  id: 'a-walk',
  title: 'A walk',
  status: 'authored',
  personas: ['admin'],
  place: { section: 'home' },
  steps: [{ anchor: 'open-course', choice: 'click', say: 'So the system knows which course you mean.', advance: { on: 'click' } }],
  ...over,
})

const inventoryFor = (walks) => ({
  capabilities: walks.map((w) => ({ id: w.id, section: w.place.section, personas: w.personas })),
})

// ─── Schema, and the two founder rulings that are gates ─────────────────────

test('a well-formed walk passes the schema', () => {
  assert.deepEqual(validateWalkSchema(walk()), [])
})

test('FIVE STEPS FAILS — a clip is fewer than 5 steps', () => {
  const five = walk({
    steps: Array.from({ length: 5 }, (_, i) => ({
      anchor: `step-${i}`, choice: 'click', say: 'why.', advance: { on: 'next' },
    })),
  })
  const errs = validateWalkSchema(five)
  assert.ok(errs.some((e) => /FEWER THAN 5 steps/.test(e)), errs.join('\n'))
})

test('four steps is fine', () => {
  const four = walk({
    steps: Array.from({ length: 4 }, (_, i) => ({
      anchor: `step-${i}`, choice: 'click', say: 'why.', advance: { on: 'next' },
    })),
  })
  assert.deepEqual(validateWalkSchema(four), [])
})

test('a step without a choice kind FAILS — every step is a choice', () => {
  const passive = walk({ steps: [{ anchor: 'open-course', say: 'Look at this panel.', advance: { on: 'next' } }] })
  const errs = validateWalkSchema(passive)
  assert.ok(errs.some((e) => /choice must be one of/.test(e)), errs.join('\n'))
})

test('an authored walk carrying TODO(tom) FAILS', () => {
  const errs = validateWalkSchema(walk({ steps: [{ anchor: 'open-course', choice: 'click', say: 'TODO(tom) needs his voice', advance: { on: 'next' } }] }))
  assert.ok(errs.some((e) => /TODO\(tom\)/.test(e)), errs.join('\n'))
})

test('a skeleton walk may carry a null say', () => {
  const skeleton = walk({ status: 'skeleton', steps: [{ anchor: 'open-course', choice: 'click', say: null, advance: { on: 'next' } }] })
  assert.deepEqual(validateWalkSchema(skeleton), [])
})

test('an unknown persona FAILS (Popty has admin/editor/recorder)', () => {
  const errs = validateWalkSchema(walk({ personas: ['teacher'] }))
  assert.ok(errs.some((e) => /unknown persona "teacher"/.test(e)), errs.join('\n'))
})

// ─── The persona gate — the load-bearing slice ──────────────────────────────

test('anchorSitesIn sees the ancestor guard, not just the button', () => {
  const sites = anchorSitesIn('X.vue', ADMIN_SECTION_VUE)
  const admin = sites.find((s) => s.id === 'open-user-management')
  assert.equal(admin.personaAttr, 'admin')
  assert.deepEqual(admin.guardExpr, ['isAdmin'])
  const open = sites.find((s) => s.id === 'open-course')
  assert.deepEqual(open.guardExpr, [])
})

test('personasAdmittedByGuards reads Popty guards, negations first', () => {
  assert.deepEqual([...personasAdmittedByGuards(['isAdmin'])], ['admin'])
  assert.deepEqual([...personasAdmittedByGuards(['!isAdmin'])], ['editor', 'recorder'])
  assert.deepEqual([...personasAdmittedByGuards(['isRecorder'])], ['recorder'])
  assert.deepEqual([...personasAdmittedByGuards(['someOtherThing'])], ['admin', 'editor', 'recorder'])
})

test('PERSONA MISMATCH FAILS — a recorder walk cannot anchor an admin-only button', () => {
  const wrong = walk({ personas: ['recorder'], steps: [{ anchor: 'open-user-management', choice: 'click', say: 'why.', advance: { on: 'click' } }] })
  const { failures } = gateAnchors([wrong], [{ path: 'X.vue', src: ADMIN_SECTION_VUE }])
  assert.ok(failures.some((f) => /^PERSONA: walk "a-walk" is offered to recorder/.test(f)), failures.join('\n'))
})

test('an anchor with no data-persona FAILS — declaration is mandatory', () => {
  const src = '<template><button data-walk="open-course">Open</button></template>'
  const { failures } = gateAnchors([walk()], [{ path: 'X.vue', src }])
  assert.ok(failures.some((f) => /carries no data-persona/.test(f)), failures.join('\n'))
})

test('a data-persona that overclaims against its guard FAILS', () => {
  const src = '<template><section v-if="isAdmin"><button data-walk="open-course" data-persona="all">Open</button></section></template>'
  const { failures } = gateAnchors([walk()], [{ path: 'X.vue', src }])
  assert.ok(failures.some((f) => /declares editor\/recorder but its enclosing guard/.test(f)), failures.join('\n'))
})

test('a missing anchor FAILS', () => {
  const { failures } = gateAnchors([walk()], [{ path: 'X.vue', src: '<template><div/></template>' }])
  assert.ok(failures.some((f) => /^ANCHOR:/.test(f)), failures.join('\n'))
})

test('skeleton walks are exempt from the anchor check, and counted', () => {
  const sk = walk({ status: 'skeleton' })
  const { failures, skeletonSteps } = gateAnchors([sk], [{ path: 'X.vue', src: '<template><div/></template>' }])
  assert.deepEqual(failures, [])
  assert.equal(skeletonSteps, 1)
})

test('a correct walk passes the anchor + persona gate', () => {
  const { failures } = gateAnchors([walk()], [{ path: 'X.vue', src: ADMIN_SECTION_VUE }])
  assert.deepEqual(failures, [])
})

// ─── The rest of the gates ──────────────────────────────────────────────────

test('an unknown place FAILS, lockstep with the runtime', () => {
  const { failures } = gatePlaces([walk({ place: { section: 'node-home' } })], RUNTIME_SRC)
  assert.ok(failures.some((f) => /^PLACE:/.test(f)), failures.join('\n'))
})

test('a click-advance step on a money-spending verb FAILS', () => {
  const unsafe = walk({ steps: [{ anchor: 'generate-audio', choice: 'click', say: 'why.', advance: { on: 'click' } }] })
  assert.ok(gateSafety([unsafe]).failures.some((f) => /^SAFETY:/.test(f)))
  const safe = walk({ steps: [{ anchor: 'generate-audio', choice: 'click', say: 'why.', advance: { on: 'next' } }] })
  assert.deepEqual(gateSafety([safe]).failures, [])
})

test('startWalk outside an @click handler FAILS', () => {
  const bad = [{ path: 'X.vue', src: '<script setup>onMounted(() => startWalk("a-walk"))</script>' }]
  assert.ok(gateNoAutoPlay(bad).failures.some((f) => /^AUTOPLAY:/.test(f)))
  const good = [{ path: 'X.vue', src: '<template><button @click="startWalk(\'a-walk\')">Show me</button></template>' }]
  assert.deepEqual(gateNoAutoPlay(good).failures, [])
})

test('a drifted runtime denylist FAILS', () => {
  assert.deepEqual(gateRuntimeDenylist(RUNTIME_SRC).failures, [])
  const drifted = RUNTIME_SRC.replace('/delete/i, ', '')
  assert.ok(gateRuntimeDenylist(drifted).failures.some((f) => /LOCKSTEP/.test(f)))
})

test('a walk: CTA naming a skeleton walk FAILS', () => {
  const sk = walk({ status: 'skeleton' })
  const rules = { rules: [{ id: 'r1', cta: { target: 'walk:a-walk' } }] }
  const { failures } = gateOffers([sk], rules, "if (target.startsWith('walk:'))")
  assert.ok(failures.some((f) => /still a SKELETON/.test(f)), failures.join('\n'))
})

test('an evaluator that dropped walk: handling FAILS', () => {
  const { failures } = gateOffers([walk()], { rules: [] }, 'no prefix here')
  assert.ok(failures.some((f) => /LOCKSTEP/.test(f)))
})

test('a recorder walk outside the Record Room FAILS (router guard confines them)', () => {
  const routerSrc = 'if (isRecorder.value) { return next(homeRoom) }'
  const off = walk({ personas: ['recorder'], place: { section: 'courses' } })
  assert.ok(gateRecorderConfinement([off], routerSrc).failures.some((f) => /^PERSONA:/.test(f)))
  const ok = walk({ personas: ['recorder'], place: { section: 'record-room' } })
  assert.deepEqual(gateRecorderConfinement([ok], routerSrc).failures, [])
  // ...and the gate refuses to pass silently if the guard leaves the router.
  assert.ok(gateRecorderConfinement([ok], 'no guard here').failures.some((f) => /LOCKSTEP/.test(f)))
})

test('a dangling next pointer FAILS', () => {
  const { failures } = gateIdsAndChains([walk({ next: 'nowhere' })])
  assert.ok(failures.some((f) => /^CHAIN:/.test(f)), failures.join('\n'))
})

test('a walk missing from the inventory FAILS, and coverage is counted', () => {
  const w = walk()
  assert.ok(gateInventory([w], { capabilities: [] }).failures.some((f) => /^INVENTORY:/.test(f)))
  const ok = gateInventory([w], inventoryFor([w]))
  assert.deepEqual(ok.failures, [])
  assert.deepEqual(ok.coverage, { capabilities: 1, authored: 1, skeleton: 0 })
})
