/**
 * qaGate.js — client for the course QA / approval gate.
 *
 * Backend: services/api/course-qa-gate-routes.cjs. Schema and the why:
 * ops/sql/20260805-course-qa-gate.sql.
 *
 * Uses the shared axios instance rather than bare fetch, because that is
 * where the Supabase bearer token is attached — every route here is behind a
 * dashboard-user gate and a sign-off that cannot name a human is worthless.
 */
import { apiClient as api } from './api'

const unwrap = (p) => p.then(r => r.data)

export const qaGate = {
  /** Part 4: every course, its X, and how far sign-off has got. */
  estate: () => unwrap(api.get('/api/qa-gate/estate')),

  /** One course: gate, progress, open flags, assignments. */
  course: (courseCode) => unwrap(api.get(`/api/qa-gate/${courseCode}`)),

  /** The play-through worklist. */
  rounds: (courseCode, { from = 1, limit = 100, all = false } = {}) =>
    unwrap(api.get(`/api/qa-gate/${courseCode}/rounds`, { params: { from, limit, all } })),

  /** The cycles of one round, with derived verification status. */
  cycles: (courseCode, legoId) =>
    unwrap(api.get(`/api/qa-gate/${courseCode}/rounds/${legoId}/cycles`)),

  /** Every clip in one round — what the flag dialog needs to name a culprit. */
  roundClips: (courseCode, legoId) =>
    unwrap(api.get(`/api/qa-gate/${courseCode}/rounds/${legoId}/clips`)),

  /**
   * The human pass. `flaggedAudioIds` is what turns a 'flagged' verdict into
   * real work in the repair flow instead of a note nobody reads.
   */
  signOff: (courseCode, roundIndex, { verdict, notes, flaggedAudioIds } = {}) =>
    unwrap(api.post(`/api/qa-gate/${courseCode}/rounds/${roundIndex}/signoff`,
      { verdict, notes, flaggedAudioIds })),

  flags: (courseCode) => unwrap(api.get(`/api/qa-gate/${courseCode}/flags`)),

  clearFlag: (courseCode, flagId, reason) =>
    unwrap(api.post(`/api/qa-gate/${courseCode}/flags/${flagId}/clear`, { reason })),

  assign: (courseCode, { fromRound, toRound, assignee }) =>
    unwrap(api.post(`/api/qa-gate/${courseCode}/assignments`, { fromRound, toRound, assignee })),

  release: (courseCode, assignmentId) =>
    unwrap(api.delete(`/api/qa-gate/${courseCode}/assignments/${assignmentId}`)),

  /** Admin-only. */
  setRequiredRounds: (courseCode, requiredRounds) =>
    unwrap(api.post(`/api/qa-gate/${courseCode}/required-rounds`, { requiredRounds })),

  override: (courseCode, reason) =>
    unwrap(api.post(`/api/qa-gate/${courseCode}/override`, { reason })),

  clearOverride: (courseCode) => unwrap(api.delete(`/api/qa-gate/${courseCode}/override`)),
}

/** Shared vocabulary for badges, so every surface says the same words. */
export const ROUND_STATUS_LABEL = {
  passed: 'Signed off',
  flagged: 'Flagged',
  stale: 'Stale — audio or content changed since sign-off',
  not_signed_off: 'Not signed off',
}

export const ROUND_STATUS_CLASS = {
  passed: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  flagged: 'bg-red-900/40 text-red-300 border-red-700',
  stale: 'bg-amber-900/40 text-amber-300 border-amber-700',
  not_signed_off: 'bg-surface-3 text-muted border-transparent',
}

export const GATE_STATUS_LABEL = {
  passed: 'Passed',
  in_progress: 'In progress',
  unpassed: 'Not passed',
}

export default qaGate
