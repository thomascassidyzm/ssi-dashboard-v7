/**
 * useGuardian — listens for Edit Guardian status over the production-api
 * WebSocket and exposes reactive state for inline display.
 *
 * The guardian (services/course-editor/guardian-runtime.cjs) emits, per edit:
 *   guardian:progress  { courseCode, table, pk, stage }
 *   guardian:outcome   { courseCode, table, pk, outcome:'accepted'|'flagged', urgent, autoFixed, flags }
 *   guardian:urgent    { courseCode, table, pk, flags }
 *
 * Surfacing model (per Kai): NO browsable feed — results stream inline to the
 * editor as "updating… / checking side-effects… / accepted / flagged", with a
 * separate urgent lane for things that need attention now (e.g. unresolved ZUT).
 *
 * Singleton: one shared socket + reactive store across all components.
 */
import { reactive, ref } from 'vue'
import { io } from 'socket.io-client'
import { getApiUrl } from '@/services/api'

const STAGE_LABELS = {
  queued: 'Saving…',
  reviewing: 'Reviewing edit…',
  'checking-side-effects': 'Checking side-effects…',
  'checking-audio': 'Checking audio…',
  'checking-similar-courses': 'Checking similar courses…',
  'applying-fixes': 'Applying fixes…',
  accepted: 'Edit accepted',
  flagged: 'Flagged for review',
}

// shared singleton state
const active = reactive({})   // key -> { courseCode, table, pk, stage, label, outcome, autoFixed, flags, ts }
const urgent = ref([])        // [{ id, courseCode, table, pk, flags, ts }]
const connected = ref(false)

let socket = null
const timers = {}

function keyOf(p) { return `${p.courseCode}:${p.table}:${p.pk}` }
function shortPk(p) { return String(p.pk || '').split(':').pop() }

function clearTimer(key) { if (timers[key]) { clearTimeout(timers[key]); delete timers[key] } }
function fade(key, ms) {
  clearTimer(key)
  timers[key] = setTimeout(() => { delete active[key]; delete timers[key] }, ms)
}

function onProgress(p) {
  const key = keyOf(p)
  clearTimer(key)
  active[key] = {
    ...(active[key] || {}),
    courseCode: p.courseCode, table: p.table, pk: p.pk, ref: shortPk(p),
    stage: p.stage, label: STAGE_LABELS[p.stage] || p.stage, outcome: null, ts: Date.now(),
  }
}

function onOutcome(p) {
  const key = keyOf(p)
  active[key] = {
    ...(active[key] || {}),
    courseCode: p.courseCode, table: p.table, pk: p.pk, ref: shortPk(p),
    stage: p.outcome, label: STAGE_LABELS[p.outcome] || p.outcome,
    outcome: p.outcome, autoFixed: p.autoFixed || 0, flags: p.flags || [], ts: Date.now(),
  }
  // accepted fades quickly; flagged lingers so the editor notices.
  fade(key, p.outcome === 'accepted' ? 4000 : 14000)
}

function onUrgent(p) {
  urgent.value = [
    { id: `${keyOf(p)}:${Date.now()}`, courseCode: p.courseCode, table: p.table, pk: p.pk, ref: shortPk(p), flags: p.flags || [], ts: Date.now() },
    ...urgent.value,
  ].slice(0, 20)
}

function connect() {
  if (socket) return
  const wsUrl = getApiUrl() || window.location.origin
  socket = io(wsUrl, {
    path: '/api/production/websocket',
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    timeout: 10000,
  })
  socket.on('connect', () => { connected.value = true })
  socket.on('disconnect', () => { connected.value = false })
  socket.on('guardian:progress', onProgress)
  socket.on('guardian:outcome', onOutcome)
  socket.on('guardian:urgent', onUrgent)
}

export function useGuardian() {
  connect()
  return {
    active,
    urgent,
    connected,
    dismiss(key) { clearTimer(key); delete active[key] },
    dismissUrgent(id) { urgent.value = urgent.value.filter((u) => u.id !== id) },
  }
}
