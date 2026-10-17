<template>
  <main class="coverage">
    <h1>Per-voice coverage</h1>
    <p>A voice keeps a round only when it has every required clip on its language side. One missing line sends the whole round to the next voice.</p>
    <p v-if="loading" role="status">Loading saved coverage…</p>
    <p v-else-if="error" role="alert">{{ error }} <button @click="load">Retry</button></p>
    <template v-else-if="data">
      <p>Measured {{ new Date(data.generatedAt).toLocaleString() }} · refreshed every {{ data.refreshHours }} hours.</p>
      <p v-if="data.stale" role="alert" class="gap">This measurement is over 12 hours old. The scheduled refresh needs attention.</p>
      <p class="scope">{{ data.scope }} Coverage describes clips held, rather than the voices currently linked in gameplay. “Entirely” refers to the selected language side, including introductions on the known side.</p>
      <details><summary>Languages and voices in the clip index ({{ data.languages.length }})</summary>
        <p v-for="lang in data.languages" :key="lang.language"><strong>{{ lang.language }}</strong>: {{ lang.voices.map(name).join(', ') }}</p>
      </details>
      <label>Course <input v-model="filter" placeholder="Filter courses or languages" type="search" /></label>
      <p>Best alternative means most complete rounds, then most distinct pairs. A dash means there is no denominator; zero means measured and missing.</p>
      <article v-for="course in courses" :key="course.courseCode">
        <h2>{{ course.courseCode }}</h2>
        <p v-if="course.error" role="alert" class="gap">Gap: {{ course.error }}</p>
        <section v-for="side in course.sides || []" :key="side.side">
          <h3>{{ side.side === 'target' ? 'Target' : 'Known' }} · {{ side.language }}</h3>
          <p>{{ side.neededPairs.toLocaleString() }} distinct language/text pairs · {{ side.rounds.toLocaleString() }} complete rounds needed.</p>
          <p v-if="side.missingTextRounds" class="gap">{{ side.missingTextRounds }} rounds have missing text and cannot count as complete.</p>
          <p v-for="r in side.castResolution.filter(r => r.status !== 'voice')" :key="r.role" class="gap">Cast gap ({{ r.role }}): {{ r.message || r.reason || r.status }}</p>
          <p v-for="v in headlines(side)" :key="v.voiceId"><strong>{{ v.isCast ? 'Cast' : 'Best alternative' }}: {{ name(v.voiceId) }}</strong> — {{ percent(v.pairPercent) }} of pairs; {{ percent(v.roundPercent) }} of rounds; first break {{ v.firstBreak ?? 'none' }}.</p>
          <details><summary>Every voice ({{ side.voices.length }})</summary>
            <div class="table-scroll"><table>
              <thead><tr><th>Voice</th><th>Pairs held</th><th>Pair share</th><th>Complete rounds</th><th>Round share</th><th>First break</th></tr></thead>
              <tbody><tr v-for="v in side.voices" :key="v.voiceId">
                <th :title="v.voiceId">{{ name(v.voiceId) }} <small v-if="v.isCast">cast</small></th>
                <td>{{ v.heldPairs }}/{{ side.neededPairs }}</td><td>{{ percent(v.pairPercent) }}</td>
                <td>{{ v.completeRounds }}/{{ side.rounds }}</td><td>{{ percent(v.roundPercent) }}</td><td>{{ v.firstBreak ?? 'none' }}</td>
              </tr></tbody>
            </table></div>
          </details>
        </section>
      </article>
      <p v-if="!courses.length">No matching courses.</p>
    </template>
  </main>
</template>
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { recordingApiBase } from '@/services/recordingApi'
const { getAccessToken } = useAuth()
const data = ref(null), loading = ref(true), error = ref(null), filter = ref('')
const courses = computed(() => (data.value?.courses || []).filter(c => `${c.courseCode} ${(c.sides || []).map(s => s.language).join(' ')}`.toLowerCase().includes(filter.value.toLowerCase())))
const name = id => data.value?.voiceNames?.[id] || id
const percent = n => n == null ? '—' : `${n.toFixed(1)}%`
const headlines = side => side.voices.filter(v => v.isCast || v.voiceId === side.bestAlternative)
async function load() {
  loading.value = true; error.value = null
  try {
    const token = await getAccessToken()
    const res = await fetch(`${recordingApiBase()}/api/admin/voice-coverage`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    const body = await res.json()
    if (!res.ok) throw new Error(body.error || `Could not load coverage (${res.status})`)
    data.value = body
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}
onMounted(load)
</script>
<style scoped>
.coverage { max-width: 1200px; margin: auto; padding: 2rem 1rem; color: var(--color-ink, inherit); }
h1 { font-size: 2rem; font-weight: 700; } h2 { font-size: 1.4rem; font-weight: 600; } h3 { font-weight: 600; margin-top: 1rem; }
p { margin: .7rem 0; } article { margin: 1.5rem 0; padding: 1rem; border: 1px solid #64748b66; border-radius: .6rem; }
input { margin: 1rem; padding: .5rem; background: transparent; border: 1px solid #64748b; border-radius: .3rem; }
.table-scroll { overflow-x: auto; } table { width: 100%; border-collapse: collapse; } th, td { text-align: left; padding: .6rem; border-bottom: 1px solid #64748b44; } small { color: #14b8a6; } .gap { color: #d97706; } .scope { opacity: .8; } summary { cursor: pointer; padding: .5rem 0; }
</style>
