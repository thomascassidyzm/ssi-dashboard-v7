<!--
  QAGateEstate.vue — Part 4: honest status for the existing estate.

  Tom, 2026-08-05: "all our courses are ALREADY published... we can't ever
  pull them back in." So nothing here was grandfathered in as passed, nothing
  was backfilled optimistically, and nothing currently live was unpublished as
  a side effect. Every course starts UNPASSED and says so.

  The deliverable is this view — the thing whoever works the retrofit
  prioritises from. The retrofit itself is human listening time, not code.

  The headline number is deliberately the uncomfortable one: how many courses
  learners can reach right now that no human has signed off.
-->
<template>
  <div class="p-6 space-y-6">
    <header>
      <h1 class="text-2xl font-semibold">QA approval gate — the estate</h1>
      <p class="text-sm text-muted mt-1 max-w-3xl">
        No course goes to learners without a human playing through its first X rounds
        in the real app. X is 100 for paid courses and 20 for free ones, stored per course.
        Every course below starts unpassed — nothing was grandfathered in.
      </p>
    </header>

    <div v-if="error" class="rounded border border-red-700 bg-red-900/30 text-red-200 p-4 text-sm">
      {{ error }}
    </div>

    <!-- The honest headline -->
    <div v-if="summary" class="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div class="rounded-lg border border-red-800 bg-red-950/40 p-4">
        <div class="text-3xl font-bold text-red-300 tabular-nums">{{ summary.liveAndUnpassed }}</div>
        <div class="text-xs text-red-300/80 mt-1">reaching learners, unsigned</div>
      </div>
      <div class="rounded-lg border border-subtle bg-surface-2 p-4">
        <div class="text-3xl font-bold tabular-nums">{{ summary.learnerVisible }}</div>
        <div class="text-xs text-muted mt-1">learner-visible</div>
      </div>
      <div class="rounded-lg border border-emerald-800 bg-emerald-950/30 p-4">
        <div class="text-3xl font-bold text-emerald-300 tabular-nums">{{ summary.passed }}</div>
        <div class="text-xs text-emerald-300/80 mt-1">gate passed</div>
      </div>
      <div class="rounded-lg border border-amber-800 bg-amber-950/30 p-4">
        <div class="text-3xl font-bold text-amber-300 tabular-nums">{{ summary.inProgress }}</div>
        <div class="text-xs text-amber-300/80 mt-1">in progress</div>
      </div>
      <div class="rounded-lg border border-subtle bg-surface-2 p-4">
        <div class="text-3xl font-bold tabular-nums">{{ summary.total }}</div>
        <div class="text-xs text-muted mt-1">courses in total</div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <input v-model="q" placeholder="filter by course code…"
             class="bg-surface-3 border border-subtle rounded px-3 py-1.5 text-sm text-ink w-64" />
      <label class="text-xs text-muted flex items-center gap-2">
        <input v-model="onlyLive" type="checkbox" /> only learner-visible
      </label>
      <label class="text-xs text-muted flex items-center gap-2">
        <input v-model="onlyPaid" type="checkbox" /> only paid
      </label>
      <span class="text-xs text-muted ml-auto">
        Progress figures use a conservative course-level staleness test — they under-report,
        never over-report. The gate itself is decided per round.
      </span>
    </div>

    <div v-if="loading" class="text-muted p-8 text-center">Loading…</div>

    <table v-else class="w-full text-sm">
      <thead class="text-xs text-muted uppercase tracking-wide border-b border-subtle">
        <tr>
          <th class="text-left py-2">Course</th>
          <th class="text-left">Tier</th>
          <th class="text-left">App status</th>
          <th class="text-left">Gate</th>
          <th class="text-right">X</th>
          <th class="text-right">Signed off</th>
          <th class="text-right">Flagged</th>
          <th class="text-right">Stale</th>
          <th class="text-right">Open flags</th>
          <th></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-subtle">
        <tr v-for="c in filtered" :key="c.course_code" class="hover:bg-surface-2">
          <td class="py-2">
            {{ courseName(c.course_code) }}
            <span class="block text-xs font-mono text-faint">{{ c.course_code }}</span>
          </td>
          <td :class="c.pricing_tier === 'premium' ? 'text-amber-300' : 'text-muted'">
            {{ c.pricing_tier }}
          </td>
          <td>
            <span class="text-xs px-2 py-0.5 rounded border"
                  :class="c.learner_visible
                    ? 'border-emerald-700 bg-emerald-900/30 text-emerald-300'
                    : 'border-transparent bg-surface-3 text-muted'">
              {{ c.new_app_status }}
            </span>
          </td>
          <td>
            <span class="text-xs px-2 py-0.5 rounded border" :class="gateClass(c.gate_status)">
              {{ gateLabel(c.gate_status) }}
            </span>
            <span v-if="c.override_by" class="text-xs text-amber-300 ml-1" :title="c.override_reason">
              overridden
            </span>
          </td>
          <td class="text-right tabular-nums text-muted">{{ c.required_rounds }}</td>
          <td class="text-right tabular-nums">
            {{ c.signed_off_rounds }}<span class="text-muted">/{{ c.gate_window_rounds }}</span>
          </td>
          <td class="text-right tabular-nums" :class="c.flagged_rounds ? 'text-red-300' : 'text-muted'">
            {{ c.flagged_rounds }}
          </td>
          <td class="text-right tabular-nums" :class="c.stale_rounds ? 'text-amber-300' : 'text-muted'">
            {{ c.stale_rounds }}
          </td>
          <td class="text-right tabular-nums" :class="c.open_flag_clips ? 'text-red-300' : 'text-muted'">
            {{ c.open_flag_clips }}
          </td>
          <td class="text-right">
            <router-link :to="`/production/${c.course_code}/qa-gate`"
                         class="text-xs text-accent hover:underline">Work it →</router-link>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { qaGate, GATE_STATUS_LABEL } from '@/services/qaGate'
import { courseName } from '@/utils/languageNames'

const courses = ref([])
const summary = ref(null)
const loading = ref(true)
const error = ref('')
const q = ref('')
const onlyLive = ref(false)
const onlyPaid = ref(false)

const filtered = computed(() => courses.value.filter(c =>
  (!q.value || c.course_code.includes(q.value.trim().toLowerCase())) &&
  (!onlyLive.value || c.learner_visible) &&
  (!onlyPaid.value || c.pricing_tier === 'premium')))

const gateLabel = (s) => GATE_STATUS_LABEL[s] || 'Not passed'
const gateClass = (s) => ({
  passed: 'border-emerald-700 bg-emerald-900/30 text-emerald-300',
  in_progress: 'border-amber-700 bg-amber-900/30 text-amber-300',
}[s] || 'border-red-800 bg-red-950/40 text-red-300')

onMounted(async () => {
  try {
    const res = await qaGate.estate()
    courses.value = res.courses || []
    summary.value = res.summary
  } catch (e) {
    error.value = e?.response?.data?.error || e.message
  } finally { loading.value = false }
})
</script>
