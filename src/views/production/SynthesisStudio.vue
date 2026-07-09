<template>
  <div class="synthesis-studio">
    <header class="studio-header">
      <div>
        <h1>Build the full audio</h1>
        <p class="subtitle">
          Your recordings are stitched together so every practice phrase is heard in your team's
          voices. Check the plan first, then stitch — you can re-check as often as you like.
        </p>
      </div>
      <router-link :to="`/production/${courseCode}/journey`" class="back-link">&larr; Back to journey</router-link>
    </header>

    <p v-if="loadError" class="error-banner">
      Couldn't load coverage right now — refresh to retry.
    </p>

    <p v-else-if="!loading && seedAutoCoverGap && seedAutoCoverGap.count > 0" class="gap-banner">
      {{ seedAutoCoverGap.count }} building block{{ seedAutoCoverGap.count === 1 ? '' : 's' }}
      can't be lined up from any recording yet — these need a direct recording, not a re-check.
    </p>

    <p v-if="loading" class="hint">Loading…</p>

    <div v-else class="slot-cards">
      <section v-for="slot in slots" :key="slot.role" class="card">
        <h2>{{ slot.label }}</h2>

        <p v-if="!slot.voiceId" class="hint">
          No voice assigned yet — set this up in <router-link :to="`/production/${courseCode}/team`">Team &amp; voices</router-link>.
        </p>

        <template v-else>
          <!-- Readiness -->
          <p class="hint">
            {{ slot.recordedTakes }} recordings in, {{ slot.missing }} missing{{
              slot.alignmentFailures ? `, ${slot.alignmentFailures} couldn't be lined up` : ''
            }}.
          </p>
          <p v-if="slot.alignmentFailures" class="hint attention">
            {{ slot.alignmentFailures }} recording{{ slot.alignmentFailures === 1 ? '' : 's' }} couldn't be lined up automatically —
            <router-link :to="`/record/${courseCode}`">re-record in the Record Room</router-link>.
          </p>

          <div class="progress-row">
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: slotPercent(slot) + '%' }"></div>
            </div>
            <span class="progress-label">{{ slot.covered }} of {{ slot.needed }} phrases covered</span>
          </div>

          <!-- Buttons -->
          <div class="actions">
            <button class="btn" :disabled="isBusy(slot)" @click="checkFirst(slot)">
              {{ jobs[slot.voiceId]?.checking ? 'Checking…' : 'Check first' }}
            </button>
            <button class="btn primary" :disabled="isBusy(slot)" @click="stitch(slot)">
              {{ isRunning(slot) ? 'Stitching…' : 'Stitch' }}
            </button>
            <button v-if="isRunning(slot)" class="btn danger" @click="cancel(slot)">Cancel</button>
          </div>

          <!-- Dry-run plan -->
          <div v-if="dryRuns[slot.voiceId]" class="plan-box">
            <p class="plan-summary">
              Ready to stitch {{ dryRuns[slot.voiceId].counts.planned }} phrase{{ dryRuns[slot.voiceId].counts.planned === 1 ? '' : 's' }}
              from {{ dryRuns[slot.voiceId].counts.recordedTakes }} recording{{ dryRuns[slot.voiceId].counts.recordedTakes === 1 ? '' : 's' }}.
              <template v-if="dryRuns[slot.voiceId].gapReport.length">
                {{ dryRuns[slot.voiceId].counts.missingChunkPhrases }} phrase{{ dryRuns[slot.voiceId].counts.missingChunkPhrases === 1 ? '' : 's' }}
                can't be stitched yet.
              </template>
            </p>
            <ul v-if="dryRuns[slot.voiceId].gapReport.length" class="gap-list">
              <li v-for="(g, i) in dryRuns[slot.voiceId].gapReport.slice(0, 10)" :key="i">
                <span class="gap-text">&ldquo;{{ g.chunkText }}&rdquo;</span>
                <span class="gap-count">needed for {{ g.blockedPhrases }} phrase{{ g.blockedPhrases === 1 ? '' : 's' }}</span>
              </li>
              <li v-if="dryRuns[slot.voiceId].gapReport.length > 10" class="gap-more">
                + {{ dryRuns[slot.voiceId].gapReport.length - 10 }} more —
                <router-link :to="`/record/${courseCode}`">record these in the Record Room</router-link>, then check again.
              </li>
              <li v-else class="gap-more">
                <router-link :to="`/record/${courseCode}`">Record these</router-link>, then check again.
              </li>
            </ul>
          </div>

          <!-- Running progress -->
          <div v-if="isRunning(slot)" class="progress-box">
            <p class="hint">
              {{ phaseLabel(jobs[slot.voiceId].phase) }}…
              {{ jobs[slot.voiceId].progress?.current || 0 }} of {{ jobs[slot.voiceId].progress?.total || 0 }}
            </p>
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: jobPercent(jobs[slot.voiceId]) + '%' }"></div>
            </div>
          </div>

          <p v-if="jobs[slot.voiceId]?.conflictNote" class="hint attention">{{ jobs[slot.voiceId].conflictNote }}</p>
          <p v-if="jobs[slot.voiceId]?.interruptedNote" class="hint attention">{{ jobs[slot.voiceId].interruptedNote }}</p>

          <!-- Result -->
          <div v-if="results[slot.voiceId]" class="result-box">
            <p class="result-summary">
              {{ results[slot.voiceId].counts.takesRegistered || 0 }} recordings registered,
              {{ results[slot.voiceId].counts.spliced || 0 }} phrases stitched{{
                results[slot.voiceId].counts.spliceFailed ? `, ${results[slot.voiceId].counts.spliceFailed} failed` : ''
              }}.
            </p>
            <ul v-if="results[slot.voiceId].gapReport?.length" class="gap-list">
              <li v-for="(g, i) in results[slot.voiceId].gapReport.slice(0, 10)" :key="i">
                <span class="gap-text">&ldquo;{{ g.chunkText }}&rdquo;</span>
                <span class="gap-count">needed for {{ g.blockedPhrases }} phrase{{ g.blockedPhrases === 1 ? '' : 's' }}</span>
              </li>
            </ul>

            <div class="sampler">
              <button class="btn small" :disabled="samplerLoading[slot.voiceId]" @click="loadSample(slot)">
                {{ samplerLoading[slot.voiceId] ? 'Loading…' : 'Listen to a few' }}
              </button>
              <ul v-if="samples[slot.voiceId]?.length" class="sample-list">
                <li v-for="s in samples[slot.voiceId]" :key="s.id">
                  <button class="play-btn" :disabled="!s.url" @click="playSample(s)">
                    {{ playingId === s.id ? '⏸' : '▶' }}
                  </button>
                  <span class="sample-text">{{ s.text }}</span>
                </li>
              </ul>
            </div>

            <router-link
              :to="{ name: 'ScriptViewer', params: { courseCode }, query: { view: 'journey' } }"
              class="btn small primary"
            >Listen and fix (step 6) &rarr;</router-link>
          </div>
        </template>
      </section>
    </div>

    <audio ref="samplePlayer" @ended="playingId = null"></audio>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { getApiUrl } from '@/services/api'
import { getRecentHumanAudio } from '@/services/supabase'

const props = defineProps({
  courseCode: { type: String, required: true }
})

const apiBase = getApiUrl()
const engineUrl = `${apiBase}/api/production/${props.courseCode}/voice-engine`
const audioUrlBase = `${apiBase}/api/production/${props.courseCode}/audio`

const loading = ref(true)
const loadError = ref(false)
const coverage = ref(null)
const seedAutoCoverGap = computed(() => coverage.value?.seedAutoCoverGap || null)

// Per-voiceId state, keyed by voiceId (so target1/target2 never collide).
const jobs = reactive({})       // voiceId -> { state, phase, progress, conflictNote, interruptedNote, checking }
const dryRuns = reactive({})    // voiceId -> { counts, gapReport }
const results = reactive({})   // voiceId -> job.report (real run)
const samples = reactive({})    // voiceId -> [{ id, text, url }]
const samplerLoading = reactive({})
const pollTimers = {}

const samplePlayer = ref(null)
const playingId = ref(null)

const slots = computed(() => {
  const c = coverage.value
  const raw = Array.isArray(c?.slots) ? c.slots : []
  return ['target1', 'target2'].map((role, i) => {
    const s = raw.find(x => x.role === role) || {}
    return {
      role,
      label: `Voice ${i + 1}`,
      voiceId: s.voiceId || null,
      isHuman: !!s.isHuman,
      needed: s.needed || 0,
      covered: s.covered || 0,
      recordedTakes: s.recordedTakes || 0,
      spliced: s.spliced || 0,
      missing: s.missing || 0,
      alignmentFailures: s.alignmentFailures || 0,
    }
  })
})

function slotPercent(slot) {
  return slot.needed > 0 ? Math.round((slot.covered / slot.needed) * 100) : 0
}

async function fetchJson(url, options) {
  const res = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' }, ...options })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

async function loadCoverage() {
  loading.value = true
  loadError.value = false
  try {
    coverage.value = await fetchJson(`${engineUrl}/coverage`)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

function isRunning(slot) {
  return jobs[slot.voiceId]?.state === 'running'
}
function isBusy(slot) {
  return isRunning(slot) || !!jobs[slot.voiceId]?.checking
}

function phaseLabel(phase) {
  const labels = { load: 'Loading', align: 'Lining up recordings', 'register-takes': 'Registering recordings', plan: 'Planning', splice: 'Stitching', link: 'Finishing up', done: 'Done' }
  return labels[phase] || 'Working'
}

function jobPercent(job) {
  const p = job?.progress
  return p && p.total > 0 ? Math.round((p.current / p.total) * 100) : 0
}

async function checkFirst(slot) {
  jobs[slot.voiceId] = { ...(jobs[slot.voiceId] || {}), checking: true }
  try {
    const resp = await fetchJson(`${engineUrl}/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: slot.role, dryRun: true }),
    })
    dryRuns[slot.voiceId] = resp.job.report
  } catch (err) {
    if (err.status === 409) {
      jobs[slot.voiceId] = { ...(jobs[slot.voiceId] || {}), conflictNote: 'A stitch job is already running for this voice — see progress below.' }
      attachJob(slot.voiceId, err.data.job)
    }
  } finally {
    jobs[slot.voiceId] = { ...(jobs[slot.voiceId] || {}), checking: false }
  }
}

async function stitch(slot) {
  delete results[slot.voiceId]
  try {
    const resp = await fetchJson(`${engineUrl}/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: slot.role }),
    })
    attachJob(slot.voiceId, resp.job)
    pollStatus(slot.voiceId)
  } catch (err) {
    if (err.status === 409) {
      jobs[slot.voiceId] = { ...(jobs[slot.voiceId] || {}), conflictNote: 'Already running — the stitcher was started elsewhere. Showing its progress below.' }
      attachJob(slot.voiceId, err.data.job)
      pollStatus(slot.voiceId)
    }
  }
}

async function cancel(slot) {
  try {
    await fetchJson(`${engineUrl}/synthesize/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voiceId: slot.voiceId }),
    })
  } catch { /* status poll will reconcile */ }
}

function attachJob(voiceId, job) {
  jobs[voiceId] = { ...(jobs[voiceId] || {}), ...job }
}

function pollStatus(voiceId) {
  clearInterval(pollTimers[voiceId])
  pollTimers[voiceId] = setInterval(async () => {
    try {
      const job = await fetchJson(`${engineUrl}/synthesize/status?voiceId=${encodeURIComponent(voiceId)}`)
      attachJob(voiceId, job)
      if (job.state !== 'running') {
        clearInterval(pollTimers[voiceId])
        if (job.report) results[voiceId] = job.report
        loadCoverage()
      }
    } catch (err) {
      if (err.status === 404) {
        clearInterval(pollTimers[voiceId])
        jobs[voiceId] = { ...(jobs[voiceId] || {}), state: 'failed', interruptedNote: 'The stitcher was interrupted — run it again, it continues where it stopped.' }
      }
    }
  }, 2000)
}

async function loadSample(slot) {
  samplerLoading[slot.voiceId] = true
  try {
    const rows = await getRecentHumanAudio(props.courseCode, slot.voiceId, 5)
    const withUrls = await Promise.all(rows.map(async r => {
      try {
        const { url } = await fetchJson(`${audioUrlBase}/${r.id}/url`)
        return { id: r.id, text: r.text, url }
      } catch {
        return { id: r.id, text: r.text, url: null }
      }
    }))
    samples[slot.voiceId] = withUrls
  } finally {
    samplerLoading[slot.voiceId] = false
  }
}

function playSample(s) {
  if (!s.url || !samplePlayer.value) return
  samplePlayer.value.pause()
  samplePlayer.value.src = s.url
  samplePlayer.value.play()
  playingId.value = s.id
}

onMounted(loadCoverage)
onBeforeUnmount(() => {
  Object.values(pollTimers).forEach(clearInterval)
})
</script>

<style scoped>
.synthesis-studio {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
}

.studio-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.studio-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.25rem; }
.subtitle { color: var(--muted); margin: 0; max-width: 64ch; }
.back-link { color: var(--muted); font-size: 0.85rem; text-decoration: none; white-space: nowrap; }
.back-link:hover { color: var(--ink); }

.hint { color: var(--muted); font-size: 0.875rem; margin: 0 0 0.75rem; }
.hint.attention { color: #b45309; }

.error-banner, .gap-banner {
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}
.error-banner { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
.gap-banner { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }

.slot-cards { display: flex; flex-direction: column; gap: 1.25rem; }

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 1.25rem;
}
.card h2 { font-size: 1.05rem; font-weight: 600; margin: 0 0 0.5rem; }

.progress-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
.progress-track {
  flex: 1;
  height: 8px;
  background: var(--surface-2);
  border-radius: 999px;
  overflow: hidden;
}
.progress-fill { height: 100%; background: var(--accent-2, #059669); border-radius: 999px; transition: width 0.3s; }
.progress-label { font-size: 0.8rem; color: var(--muted); white-space: nowrap; }

.actions { display: flex; gap: 0.75rem; margin-bottom: 1rem; }

.btn {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  border-radius: 8px;
  padding: 0.45rem 0.9rem;
  font-size: 0.875rem;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}
.btn:hover:not(:disabled) { background: var(--surface-2); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
.btn.primary:hover:not(:disabled) { background: #1d4ed8; }
.btn.danger { color: #b91c1c; border-color: #fecaca; }
.btn.danger:hover:not(:disabled) { background: #fef2f2; }
.btn.small { padding: 0.3rem 0.7rem; font-size: 0.8rem; }

.plan-box, .progress-box, .result-box {
  background: var(--surface-2);
  border-radius: 8px;
  padding: 0.9rem 1rem;
  margin-bottom: 0.75rem;
}
.plan-summary, .result-summary { margin: 0 0 0.5rem; font-size: 0.875rem; }

.gap-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.gap-list li { font-size: 0.82rem; display: flex; justify-content: space-between; gap: 0.75rem; }
.gap-text { color: var(--ink); }
.gap-count { color: var(--muted); white-space: nowrap; }
.gap-more { color: var(--muted); font-style: italic; }

.sampler { margin: 0.75rem 0; }
.sample-list { list-style: none; margin: 0.5rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.4rem; }
.sample-list li { display: flex; align-items: center; gap: 0.6rem; font-size: 0.82rem; }
.play-btn {
  border: 1px solid var(--line);
  background: var(--surface);
  border-radius: 999px;
  width: 1.75rem;
  height: 1.75rem;
  cursor: pointer;
  font-size: 0.75rem;
}
.play-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.sample-text { color: var(--ink); }
</style>
