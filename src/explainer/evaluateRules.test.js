/**
 * Unit tests for evaluateRules — the noticing-rules runtime evaluator
 * (docs/self-explaining-popty.md §5). Run: npx vitest run src/explainer/evaluateRules
 */

import { describe, it, expect } from 'vitest'
import { evaluateRules } from './evaluateRules.js'

const KNOWN_VOCAB_RULE = {
  id: 'known-vocab-flags',
  shape: 'perChild',
  arrayPath: 'courses',
  mount: 'home',
  personas: ['admin', 'editor'],
  source: 'snapshot',
  itemWhen: [{ path: 'knownBreaches', op: 'gt', value: 0 }],
  invitation: '{name} has {knownBreaches} known-side vocabulary flags from the last gate run.',
  cta: { label: 'Open {name}', target: '/course/{code}' },
}

const RECORDER_RULE = {
  id: 'recorder-pending-recording',
  shape: 'node',
  mount: 'record-room',
  personas: ['recorder'],
  source: 'payload',
  when: [
    { path: 'courseFlags.isHumanVoiceCourse', op: 'truthy' },
    { path: 'recordingScript.totalItems', op: 'gt', value: 0 },
  ],
  invitation: 'About {recordingScript.estimatedMinutes} minutes of reading left.',
  cta: { label: null, target: 'self' },
}

const QA_ERROR_RULE = {
  id: 'qa-open-error-flags',
  shape: 'countWhere',
  arrayPath: 'flags',
  mount: 'qa',
  personas: ['editor', 'admin'],
  source: 'payload',
  itemWhen: [{ path: 'severity', op: 'eq', value: 'error' }],
  min: 1,
  invitation: '{count} open QA flags are marked as errors.',
  cta: { label: null, target: 'self' },
}

describe('evaluateRules', () => {
  it('perChild + source:snapshot joins each item with its own snapshot slice by code', () => {
    const rules = [KNOWN_VOCAB_RULE]
    const payload = { courses: [{ code: 'fra_for_eng', name: 'French' }, { code: 'cat_for_spa', name: 'Catalan' }] }
    const snapshot = { vocabGate: { fra_for_eng: { knownBreaches: 776 }, cat_for_spa: { knownBreaches: 0 } } }
    const invitations = evaluateRules(rules, { snapshot, payload }, 'admin', 'home')
    expect(invitations).toHaveLength(1)
    expect(invitations[0].text).toBe('French has 776 known-side vocabulary flags from the last gate run.')
    expect(invitations[0].to).toBe('/course/fra_for_eng')
  })

  it('caps perChild matches at 3', () => {
    const payload = {
      courses: Array.from({ length: 5 }, (_, i) => ({ code: `c${i}`, name: `Course ${i}` })),
    }
    const snapshot = { vocabGate: Object.fromEntries(payload.courses.map((c) => [c.code, { knownBreaches: 5 }])) }
    const invitations = evaluateRules([KNOWN_VOCAB_RULE], { snapshot, payload }, 'admin', 'home')
    expect(invitations).toHaveLength(3)
  })

  it('node + source:payload reads straight from the mount-supplied payload', () => {
    const payload = { courseFlags: { isHumanVoiceCourse: true }, recordingScript: { totalItems: 12, estimatedMinutes: 9 } }
    const invitations = evaluateRules([RECORDER_RULE], { payload }, 'recorder', 'record-room')
    expect(invitations).toHaveLength(1)
    expect(invitations[0].text).toBe('About 9 minutes of reading left.')
    // Semantic (non-'/') targets never navigate — the invitation is already on its own page.
    expect(invitations[0].to).toBeNull()
  })

  it('node rule does not fire when a condition fails', () => {
    const payload = { courseFlags: { isHumanVoiceCourse: false }, recordingScript: { totalItems: 12 } }
    expect(evaluateRules([RECORDER_RULE], { payload }, 'recorder', 'record-room')).toHaveLength(0)
  })

  it('countWhere fires only once min is cleared, interpolating {count}', () => {
    const payload = { flags: [{ severity: 'error' }, { severity: 'warning' }, { severity: 'error' }] }
    const invitations = evaluateRules([QA_ERROR_RULE], { payload }, 'editor', 'qa')
    expect(invitations).toHaveLength(1)
    expect(invitations[0].text).toBe('2 open QA flags are marked as errors.')
  })

  it('countWhere does not fire below min', () => {
    const payload = { flags: [{ severity: 'warning' }] }
    expect(evaluateRules([QA_ERROR_RULE], { payload }, 'editor', 'qa')).toHaveLength(0)
  })

  it('filters by mount and persona', () => {
    const payload = { flags: [{ severity: 'error' }] }
    expect(evaluateRules([QA_ERROR_RULE], { payload }, 'editor', 'home')).toHaveLength(0)
    expect(evaluateRules([QA_ERROR_RULE], { payload }, 'recorder', 'qa')).toHaveLength(0)
  })

  it('handles missing/empty rules and arrays gracefully', () => {
    expect(evaluateRules([], {}, 'admin', 'home')).toEqual([])
    expect(evaluateRules([KNOWN_VOCAB_RULE], { payload: {} }, 'admin', 'home')).toEqual([])
  })
})
