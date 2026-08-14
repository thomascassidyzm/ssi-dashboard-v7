<!--
  CourseQAGate.vue — the manual approval gate for one course.

  "No course should EVER go out to learners unless it has passed a manual
  approval gate... I think we MUST manually play through the first X ROUNDS."
  (Tom, 2026-08-05.) This is the surface that makes 100 rounds of listening
  tractable and dividable.

  The shape of the work:
    1. Claim a range of rounds, so two people never do the same ones.
    2. For each round, press ▶ — which opens the REAL learning app at that
       round, with the default configs live in the DB, exactly what a learner
       would get. The Script Viewer's own preview player is a proofing tool by
       ruling and is deliberately not the instrument here.
    3. Come back and record a verdict. Flagging names the clips, so the flag
       lands in the repair flow rather than in a note field.

  This is internal production UI, so round numbers and LEGO ids are shown
  plainly — the no-numbers/no-jargon rule is about learner-facing copy.
  Nothing here names a "seed position"; a round IS a LEGO.
-->
<template>
  <div class="qa-gate p-6 space-y-6">

    <!-- ── Gate header: the verdict on the whole course ───────────────── -->
    <div class="rounded-lg border p-5" :class="gateBannerClass">
      <div class="flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div class="text-xs uppercase tracking-wide opacity-70">Approval gate</div>
          <h1 class="text-2xl font-semibold mt-1">
            {{ courseName(courseCode) }} — {{ gateLabel }}
          </h1>
          <p class="mt-2 text-sm opacity-90 max-w-2xl">
            <template v-if="gate?.gate_status === 'passed'">
              A human played the first {{ gate.required_rounds }} rounds through and signed
              every one off. Passed by {{ gate.passed_by }} on {{ formatDate(gate.passed_at) }}.
            </template>
            <template v-else>
              {{ progress.passed }} of {{ windowSize }} required rounds signed off.
              This course cannot be promoted to learner-visible until every one of them is.
            </template>
          </p>
          <p v-if="gate?.override_by" class="mt-2 text-sm text-amber-300">
            Overridden by {{ gate.override_by }} — {{ gate.override_reason }}
          </p>
        </div>

        <div class="text-right shrink-0">
          <div class="text-4xl font-bold tabular-nums">
            {{ progress.passed }}<span class="opacity-50 text-2xl">/{{ windowSize || gate?.required_rounds || 0 }}</span>
          </div>
          <div class="text-xs opacity-70 mt-1">rounds signed off</div>
          <div v-if="progress.flagged" class="text-xs text-red-300 mt-1">
            {{ progress.flagged }} flagged
          </div>
          <div v-if="progress.stale" class="text-xs text-amber-300 mt-1">
            {{ progress.stale }} stale
          </div>
        </div>
      </div>

      <div class="mt-4 h-2 rounded bg-black/30 overflow-hidden">
        <div class="h-full bg-emerald-500 transition-all"
             :style="{ width: pct(progress.passed, windowSize) }" />
      </div>
    </div>

    <div v-if="error" class="rounded border border-red-700 bg-red-900/30 text-red-200 p-4 text-sm">
      {{ error }}
    </div>

    <!-- ── Dividing the work ──────────────────────────────────────────── -->
    <section class="rounded-lg border border-subtle bg-surface-2 p-5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold">Who is listening to what</h2>
        <span class="text-xs text-muted">
          Overlapping claims are refused by the database, not just by this form.
        </span>
      </div>

      <div v-if="assignments.length" class="flex flex-wrap gap-2 mb-4">
        <span v-for="a in assignments" :key="a.id"
              class="inline-flex items-center gap-2 text-xs rounded-full border border-subtle bg-surface-3 px-3 py-1">
          <strong>{{ a.assignee }}</strong>
          <span class="text-muted">R{{ rangeStart(a.rounds) }}–{{ rangeEnd(a.rounds) }}</span>
          <button class="text-muted hover:text-red-300" title="Release this range"
                  @click="release(a.id)">×</button>
        </span>
      </div>
      <p v-else class="text-sm text-muted mb-4">Nobody has claimed a range yet.</p>

      <form class="flex flex-wrap items-end gap-3" @submit.prevent="claim">
        <label class="text-xs text-muted">Rounds
          <input v-model.number="claimForm.fromRound" type="number" min="1"
                 class="ml-2 w-20 bg-surface-3 border border-subtle rounded px-2 py-1 text-ink" />
        </label>
        <span class="text-muted pb-1">to</span>
        <input v-model.number="claimForm.toRound" type="number" min="1"
               class="w-20 bg-surface-3 border border-subtle rounded px-2 py-1 text-ink" />
        <label class="text-xs text-muted">for
          <input v-model="claimForm.assignee" placeholder="name or email"
                 class="ml-2 w-56 bg-surface-3 border border-subtle rounded px-2 py-1 text-ink" />
        </label>
        <button type="submit" :disabled="busy"
                class="px-3 py-1.5 rounded bg-accent text-white text-sm disabled:opacity-50">
          Claim
        </button>
      </form>
    </section>

    <!-- ── Open flags: what a human still has to deal with ────────────── -->
    <section v-if="openFlags.length" class="rounded-lg border border-red-800 bg-red-950/30 p-5">
      <h2 class="font-semibold text-red-200 mb-1">{{ openFlags.length }} clip{{ openFlags.length === 1 ? '' : 's' }} flagged</h2>
      <p class="text-xs text-red-300/80 mb-3">
        A flag is cleared by a human listening again, or by a repair replacing the bytes.
        Nothing automated can clear one.
      </p>
      <ul class="space-y-2">
        <li v-for="f in openFlags" :key="f.id"
            class="flex items-start justify-between gap-4 text-sm bg-black/20 rounded p-3">
          <div class="min-w-0">
            <div class="truncate"><strong>{{ f.clip?.role }}</strong> — “{{ f.clip?.text }}”</div>
            <div class="text-xs text-muted mt-0.5">
              {{ f.reason }} · raised by {{ f.raised_by }}
              <span v-if="f.detector_precision != null">
                · detector precision {{ Math.round(f.detector_precision * 100) }}%
              </span>
              <span v-if="f.superseded" class="text-amber-300">· bytes since replaced</span>
            </div>
          </div>
          <button class="shrink-0 text-xs px-2 py-1 rounded border border-subtle hover:bg-surface-3"
                  @click="clearFlag(f)">
            I listened — it's fine
          </button>
        </li>
      </ul>
    </section>

    <!-- ── The play-through worklist ──────────────────────────────────── -->
    <section class="rounded-lg border border-subtle bg-surface-2">
      <div class="flex items-center justify-between p-4 border-b border-subtle">
        <h2 class="font-semibold">The first {{ gate?.required_rounds ?? '—' }} rounds</h2>
        <label class="text-xs text-muted flex items-center gap-2">
          <input v-model="hideDone" type="checkbox" /> hide signed-off
        </label>
      </div>

      <div v-if="loading" class="p-8 text-center text-muted">Loading…</div>
      <div v-else-if="!visibleRounds.length" class="p-8 text-center text-muted">
        Nothing left in this view.
      </div>

      <ul v-else class="divide-y divide-subtle">
        <li v-for="r in visibleRounds" :key="r.round_index" class="p-3">
          <div class="flex items-center gap-3 flex-wrap">
            <span class="w-14 shrink-0 text-sm text-muted tabular-nums">R{{ r.round_index }}</span>
            <span class="w-24 shrink-0 text-sm font-mono">{{ r.lego_id }}</span>

            <span class="text-xs px-2 py-0.5 rounded border" :class="statusClass(r.status)">
              {{ statusLabel(r.status) }}
            </span>

            <span class="text-xs text-muted">
              {{ r.verified_cycles }}/{{ r.cycle_count }} cycles verified
              <span v-if="r.flagged_clips" class="text-red-300">· {{ r.flagged_clips }} clips flagged</span>
            </span>

            <span v-if="r.assignee" class="text-xs text-muted">· {{ r.assignee }}</span>
            <span v-if="r.signed_off_by" class="text-xs text-muted">
              · {{ r.signed_off_by }}, {{ formatDate(r.signed_off_at) }}
            </span>

            <div class="ml-auto flex items-center gap-2">
              <!-- The listening instrument: the REAL player, at this round,
                   with whatever configs are live in the DB right now. -->
              <a :href="playerUrl(r)" target="_blank" rel="noopener"
                 class="px-2.5 py-1 rounded bg-accent text-white text-xs"
                 title="Open this round in the real learning app">
                ▶ Play in app
              </a>
              <button class="px-2.5 py-1 rounded border border-subtle text-xs hover:bg-surface-3"
                      @click="toggleCycles(r)">
                {{ expanded === r.lego_id ? 'Hide' : 'Cycles' }}
              </button>
              <button class="px-2.5 py-1 rounded border border-emerald-700 text-emerald-300 text-xs hover:bg-emerald-900/40"
                      :disabled="busy" @click="signOff(r, 'passed')">
                Passed
              </button>
              <button class="px-2.5 py-1 rounded border border-red-700 text-red-300 text-xs hover:bg-red-900/40"
                      :disabled="busy" @click="openFlagDialog(r)">
                Flag
              </button>
            </div>
          </div>

          <!-- Derived per-cycle status (Part 1) — "cycles that have had all
               their clips checked through the whole verification process" -->
          <div v-if="expanded === r.lego_id" class="mt-3 ml-14 space-y-1">
            <div v-if="!cycles.length" class="text-xs text-muted">No cycles with audio.</div>
            <div v-for="c in cycles" :key="c.cycle_key"
                 class="flex items-center gap-3 text-xs">
              <span class="font-mono w-40">{{ c.cycle_key }}</span>
              <span class="px-1.5 py-0.5 rounded border" :class="cycleClass(c.status)">{{ c.status }}</span>
              <span class="text-muted">
                {{ c.passed_clips }}/{{ c.clip_count }} clips passed
                <span v-if="c.flagged_clips" class="text-red-300">· {{ c.flagged_clips }} flagged</span>
              </span>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <!-- ── Flag dialog: name the clips, so it becomes work ─────────────── -->
    <div v-if="flagDialog" class="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50"
         @click.self="flagDialog = null">
      <div class="bg-surface-2 border border-subtle rounded-lg p-5 w-full max-w-xl space-y-4">
        <h3 class="font-semibold">Flag round {{ flagDialog.round.round_index }} ({{ flagDialog.round.lego_id }})</h3>
        <textarea v-model="flagDialog.notes" rows="3" placeholder="What did you hear?"
                  class="w-full bg-surface-3 border border-subtle rounded px-3 py-2 text-sm text-ink" />
        <div>
          <div class="text-xs text-muted mb-2">
            Tick the clips that are wrong. Each becomes a real flag on that clip — which
            only a human, or a repair replacing the audio, can clear.
          </div>
          <div class="max-h-56 overflow-y-auto space-y-1">
            <label v-for="c in flagDialog.clips" :key="c.audio_id"
                   class="flex items-center gap-2 text-xs bg-surface-3 rounded px-2 py-1">
              <input v-model="flagDialog.selected" type="checkbox" :value="c.audio_id" />
              <span class="font-mono w-40 shrink-0">{{ c.cycle_key }}</span>
              <span class="text-muted w-16 shrink-0">{{ c.audio_role }}</span>
              <span class="truncate">{{ c.text }}</span>
            </label>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <button class="px-3 py-1.5 text-sm text-muted" @click="flagDialog = null">Cancel</button>
          <button class="px-3 py-1.5 rounded bg-red-700 text-white text-sm" :disabled="busy"
                  @click="submitFlag">Flag round</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { buildLearningAppUrl } from '@/utils/learningAppUrl'
import { courseName } from '@/utils/languageNames'
import { qaGate, ROUND_STATUS_LABEL, ROUND_STATUS_CLASS, GATE_STATUS_LABEL } from '@/services/qaGate'

const props = defineProps({ courseCode: { type: String, required: true } })

const gate = ref(null)
const rounds = ref([])
const assignments = ref([])
const openFlags = ref([])
const cycles = ref([])
const expanded = ref(null)
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const hideDone = ref(false)
const claimForm = ref({ fromRound: 1, toRound: 25, assignee: '' })
const flagDialog = ref(null)

const windowSize = computed(() =>
  Math.min(rounds.value.length, gate.value?.required_rounds ?? 0))

const progress = computed(() => ({
  passed: inWindow.value.filter(r => r.status === 'passed').length,
  flagged: inWindow.value.filter(r => r.status === 'flagged').length,
  stale: inWindow.value.filter(r => r.status === 'stale').length,
}))

const inWindow = computed(() =>
  rounds.value.filter(r => r.round_index <= (gate.value?.required_rounds ?? 0)))

const visibleRounds = computed(() =>
  hideDone.value ? inWindow.value.filter(r => r.status !== 'passed') : inWindow.value)

const gateLabel = computed(() => GATE_STATUS_LABEL[gate.value?.gate_status] || 'Unknown')
const gateBannerClass = computed(() => ({
  passed: 'border-emerald-700 bg-emerald-950/40 text-emerald-100',
  in_progress: 'border-amber-700 bg-amber-950/30 text-amber-100',
}[gate.value?.gate_status] || 'border-subtle bg-surface-2 text-ink'))

const statusLabel = (s) => ROUND_STATUS_LABEL[s] || s
const statusClass = (s) => ROUND_STATUS_CLASS[s] || ROUND_STATUS_CLASS.not_signed_off
const cycleClass = (s) => ({
  verified: 'bg-emerald-900/40 text-emerald-300 border-emerald-700',
  flagged: 'bg-red-900/40 text-red-300 border-red-700',
}[s] || 'bg-surface-3 text-muted border-transparent')

const pct = (n, d) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '0%')
const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB',
  { day: 'numeric', month: 'short', year: 'numeric' }) : '')

/** int4range comes back as a string like "[1,26)" — half-open, so show 1–25. */
const rangeStart = (r) => Number(String(r).match(/\[(\d+)/)?.[1] ?? 0)
const rangeEnd = (r) => Number(String(r).match(/,(\d+)\)/)?.[1] ?? 1) - 1

/**
 * The listening instrument. The real app, at this round, with the default
 * configs live in the DB — the same thing a real learner would get. The URL
 * contract is owned by src/utils/learningAppUrl.ts and mirrored on the
 * learner side; do not build one by hand here.
 */
const playerUrl = (r) => buildLearningAppUrl({
  courseCode: props.courseCode, round: r.round_index, legoId: r.lego_id,
})

async function load () {
  loading.value = true
  error.value = ''
  try {
    const [status, roundsRes] = await Promise.all([
      qaGate.course(props.courseCode),
      qaGate.rounds(props.courseCode, { from: 1, limit: 500 }),
    ])
    gate.value = status.gate
    assignments.value = status.assignments || []
    openFlags.value = status.openFlags || []
    rounds.value = roundsRes.rounds || []
  } catch (e) {
    error.value = e?.response?.data?.error || e.message
  } finally {
    loading.value = false
  }
}

async function toggleCycles (r) {
  if (expanded.value === r.lego_id) { expanded.value = null; return }
  expanded.value = r.lego_id
  cycles.value = []
  try {
    cycles.value = (await qaGate.cycles(props.courseCode, r.lego_id)).cycles || []
  } catch (e) { error.value = e?.response?.data?.error || e.message }
}

async function signOff (r, verdict, notes, flaggedAudioIds) {
  busy.value = true
  error.value = ''
  try {
    await qaGate.signOff(props.courseCode, r.round_index, { verdict, notes, flaggedAudioIds })
    await load()
  } catch (e) {
    error.value = e?.response?.data?.error || e.message
  } finally { busy.value = false }
}

async function openFlagDialog (r) {
  busy.value = true
  try {
    const { clips } = await qaGate.roundClips(props.courseCode, r.lego_id)
    flagDialog.value = { round: r, notes: '', selected: [], clips: clips || [] }
  } catch (e) {
    error.value = e?.response?.data?.error || e.message
  } finally { busy.value = false }
}

async function submitFlag () {
  const d = flagDialog.value
  flagDialog.value = null
  await signOff(d.round, 'flagged', d.notes, d.selected)
}

async function clearFlag (f) {
  const reason = window.prompt('Why is this clip fine? (recorded against your name)')
  if (!reason || !reason.trim()) return
  busy.value = true
  try {
    await qaGate.clearFlag(props.courseCode, f.id, reason.trim())
    await load()
  } catch (e) { error.value = e?.response?.data?.error || e.message } finally { busy.value = false }
}

async function claim () {
  busy.value = true
  error.value = ''
  try {
    await qaGate.assign(props.courseCode, { ...claimForm.value })
    await load()
  } catch (e) {
    const d = e?.response?.data
    error.value = d?.held
      ? `${d.error} — already held: ${d.held.map(h => `${h.assignee} ${h.rounds}`).join(', ')}`
      : (d?.error || e.message)
  } finally { busy.value = false }
}

async function release (id) {
  busy.value = true
  try { await qaGate.release(props.courseCode, id); await load() }
  catch (e) { error.value = e?.response?.data?.error || e.message } finally { busy.value = false }
}

onMounted(load)
watch(() => props.courseCode, load)
</script>
