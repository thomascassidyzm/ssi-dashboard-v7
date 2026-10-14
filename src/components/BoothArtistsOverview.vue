<template>
  <!-- RECORDING ARTISTS, for Tom, Aran and Kai only (Aran, 2026-10-14, job #350). The server refuses
       everyone else (services/voice-engine/booth-artists-router.cjs); on a 401/403 this section
       draws nothing at all, so the other admins who open this page see the page they always had. -->
  <section v-if="state !== 'hidden'" class="artists">
    <div class="artists-head">
      <h2>Recording artists</h2>
      <button v-if="state === 'ready'" class="refresh" @click="load(true)">Refresh</button>
    </div>
    <p class="lede">How each reader is getting on. Seen only by Tom, Aran and Kai.</p>

    <div v-if="state === 'loading'" class="ba-loading">Loading every artist… (up to 20 seconds the first time)</div>
    <p v-else-if="state === 'error'" class="ba-error">{{ error }}</p>

    <template v-else>
      <ul class="cards">
        <li v-for="a in mainArtists" :key="a.voiceId" :id="`artist-${a.voiceId}`" class="card" :class="{ open: openId === a.voiceId }">
          <button class="card-btn" @click="toggle(a.voiceId)" :aria-expanded="openId === a.voiceId">
            <div class="card-top">
              <span class="name">{{ a.name }}</span>
              <span class="meta">{{ a.languageName || 'no queue' }}<template v-if="a.dialect && a.dialect !== 'standard'"> · {{ a.dialect }}</template></span>
              <span class="last" :class="{ today: a.activity.takesToday }">{{ lastActiveLabel(a) }}</span>
            </div>
            <div class="stats">
              <div class="stat"><span class="v">{{ a.activity.takesToday }}</span><span class="k">takes today</span></div>
              <div class="stat"><span class="v">{{ a.activity.takes7d }}</span><span class="k">last 7 days</span></div>
              <div class="stat"><span class="v">{{ fmtDur(a.activity.audioMs) }}</span><span class="k">audio kept</span></div>
              <div class="stat"><span class="v">{{ fmtDur(a.activity.sessionMs) }}</span><span class="k">at the booth</span></div>
            </div>
            <!-- ONE ROW PER PROJECT (Aran, job #379: "which project they've been working on"),
                 most recently worked on first, named in plain words by the server. -->
            <div v-for="p in a.projects" :key="p.key" class="q" :class="{ 'q-other': p.other }">
              <span class="q-label">{{ p.label }}</span>
              <template v-if="!p.other">
                <span class="q-bar"><span class="q-fill" :style="{ width: pct(p.recorded, p.total) }"></span></span>
                <span class="q-num">{{ p.recorded.toLocaleString() }} / {{ p.total.toLocaleString() }}</span>
              </template>
              <span class="q-meta">{{ projectActivity(p) }}</span>
            </div>
            <p v-if="a.queueUnavailable" class="note">Their queue could not be read just now, so every take shows as earlier lines.</p>
          </button>

          <div v-if="openId === a.voiceId" class="drill">
            <div v-if="!detail[a.voiceId] || detail[a.voiceId].loading" class="ba-loading">Loading…</div>
            <p v-else-if="detail[a.voiceId].error" class="ba-error">{{ detail[a.voiceId].error }}</p>
            <template v-else>
              <h3>Takes per day, last 30 days</h3>
              <svg class="chart" :viewBox="`0 0 ${CHART_W} ${CHART_H + 18}`" role="img" :aria-label="`Takes per day for ${a.name}`">
                <line :x1="0" :x2="CHART_W" :y1="CHART_H" :y2="CHART_H" class="axis" />
                <g v-for="(d, i) in detail[a.voiceId].daily" :key="d.date">
                  <!-- hit target the full column height, bigger than the bar -->
                  <rect :x="i * colW" y="0" :width="colW" :height="CHART_H" class="hit">
                    <title>{{ d.date }}: {{ d.takes }} takes · {{ fmtDur(d.audioMs) }} audio · {{ fmtDur(d.sessionMs) }} at the booth</title>
                  </rect>
                  <path v-if="d.takes" :d="barPath(i, d.takes, detail[a.voiceId].maxTakes)" class="bar" pointer-events="none" />
                </g>
                <text :x="0" :y="CHART_H + 14" class="tick">{{ shortDate(detail[a.voiceId].daily[0].date) }}</text>
                <text :x="CHART_W" :y="CHART_H + 14" class="tick" text-anchor="end">today</text>
                <text :x="CHART_W" y="10" class="tick" text-anchor="end">max {{ detail[a.voiceId].maxTakes }}</text>
              </svg>

              <h3>By project</h3>
              <div v-for="p in a.projects" :key="p.key" class="proj">
                <div class="proj-head">
                  <span class="proj-name">{{ p.label }}</span>
                  <span class="proj-num">{{ p.other ? `${p.activity.takes} takes` : `${p.recorded.toLocaleString()} / ${p.total.toLocaleString()} · ${pct(p.recorded, p.total, true)}` }}</span>
                </div>
                <span class="proj-meta">{{ projectActivity(p, true) }}</span>
                <template v-if="projectBatches(a.voiceId, p.key).length">
                  <div class="batches">
                    <div v-for="b in projectBatches(a.voiceId, p.key)" :key="b.batch"
                         class="batch" :class="{ done: b.recorded + b.held >= b.total, started: b.recorded > 0 && b.recorded + b.held < b.total }"
                         :title="`Batch ${b.batch}: ${b.recorded} of ${b.total} read${b.held ? `, ${b.held} held by a proof flag` : ''}`">
                      <span>{{ b.batch }}</span>
                    </div>
                  </div>
                  <p class="note">{{ p.batchesDone }} of {{ p.batches }} batches finished. Each square is one batch (~200 lines): filled = finished, outlined = started.</p>
                </template>
                <template v-if="projectTakes(a.voiceId, p.key).length">
                  <button class="link" @click="toggleProject(a.voiceId, p.key)" :aria-expanded="isProjectOpen(a.voiceId, p.key)">
                    {{ isProjectOpen(a.voiceId, p.key) ? 'Hide' : 'Hear' }} the latest {{ projectTakes(a.voiceId, p.key).length }} {{ projectTakes(a.voiceId, p.key).length === 1 ? 'take' : 'takes' }}
                  </button>
                  <ul v-if="isProjectOpen(a.voiceId, p.key)" class="takes">
                    <li v-for="t in projectTakes(a.voiceId, p.key)" :key="t.audioId" class="take">
                      <span class="take-meta">{{ fmtWhen(t.recordedAt) }}<template v-if="t.durationMs"> · {{ (t.durationMs / 1000).toFixed(1) }}s</template><template v-if="t.archived"> · archived by Re-record all</template></span>
                      <span class="take-text">{{ t.text }}</span>
                      <audio v-if="t.url" :src="t.url" controls preload="none"></audio>
                    </li>
                  </ul>
                </template>
              </div>

              <h3>Recent sittings</h3>
              <table v-if="detail[a.voiceId].sessions.length" class="tbl">
                <tr v-for="s in detail[a.voiceId].sessions.slice(0, 8)" :key="s.start">
                  <td>{{ fmtWhen(s.start) }}</td><td class="n">{{ s.takes }} {{ s.takes === 1 ? 'take' : 'takes' }}</td><td class="n">{{ fmtDur(s.spanMs) }}</td>
                </tr>
              </table>
              <p v-else class="note">No takes yet.</p>

              <h3>Latest takes</h3>
              <ul class="takes">
                <li v-for="t in detail[a.voiceId].recentTakes.slice(0, takeLimit)" :key="t.audioId" class="take">
                  <span class="take-meta">{{ fmtWhen(t.recordedAt) }} · {{ t.projectLabel || t.courseCode }}<template v-if="t.durationMs"> · {{ (t.durationMs / 1000).toFixed(1) }}s</template><template v-if="t.archived"> · archived by Re-record all</template></span>
                  <span class="take-text">{{ t.text }}</span>
                  <audio v-if="t.url" :src="t.url" controls preload="none"></audio>
                </li>
              </ul>
              <button v-if="detail[a.voiceId].recentTakes.length > takeLimit" class="more" @click="takeLimit += 20">Show more</button>
            </template>
          </div>
        </li>
      </ul>

      <details v-if="otherArtists.length" class="others">
        <summary>Test voices and old voice ids ({{ otherArtists.length }})</summary>
        <ul>
          <li v-for="a in otherArtists" :key="a.voiceId">
            <span class="name">{{ a.name }}</span>
            <span class="meta">{{ a.voiceId }} · {{ a.activity.takes }} takes · last {{ a.activity.lastActive ? fmtWhen(a.activity.lastActive) : 'never' }}</span>
          </li>
        </ul>
      </details>

      <details class="key">
        <summary>What the numbers mean</summary>
        <dl>
          <dt>Projects</dt><dd>Each piece of work the reader is cast on, split the way their booth splits it: Pod 1 and the other scripts, old sentences (already in the live course), new sentences, new practice phrases by pass. "New" means the North and South relaunch courses; "old" the live courses. "English known lines" is the English side of the Welsh courses.</dd>
          <dt>x / y</dt><dd>Lines in that project with a take, out of all lines in it — the booth's own count, the same as the reader's own home screen.</dd>
          <dt>This week, last</dt><dd>Takes filed under the project in the last 7 days, and the time of its latest take. A take is filed under the project whose line has its words.</dd>
          <dt>Earlier lines</dt><dd>Takes whose words are on no line of the reader's queue today — an old version of a pod line, a retired script. Counted so no work disappears; there is no total to finish.</dd>
          <dt>Takes</dt><dd>Clips kept, timestamped when each was first saved. Reading a line again replaces its clip and keeps the old time, so re-reads are not counted. Takes later archived by "Re-record all" still count as work done.</dd>
          <dt>Audio kept</dt><dd>Total length of those clips — speech actually kept, not time spent.</dd>
          <dt>At the booth</dt><dd>First to last take of each sitting (a gap of {{ data.sessionGapMinutes }} minutes or more starts a new sitting). The minutes before the first take and after the last are invisible, so a one-take sitting counts as zero. Read it as "at least".</dd>
          <dt>Today, last 7 days</dt><dd>Days are London days ({{ data.timeZone }}). Figures are up to a minute old.</dd>
        </dl>
      </details>
    </template>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { recordingApiBase as apiBase } from '@/services/recordingApi'
import { useAuth } from '@/composables/useAuth'

const { getAccessToken } = useAuth()

const state = ref('loading') // loading | ready | error | hidden
const error = ref(null)
const data = ref({ artists: [] })
const openId = ref(null)
const detail = ref({})
const takeLimit = ref(10)
const openProjects = ref({})
const route = useRoute()

const CHART_W = 300
const CHART_H = 70
const colW = CHART_W / 30


const mainArtists = computed(() => data.value.artists.filter((a) => !a.isTest && !a.noQueue))
const otherArtists = computed(() => data.value.artists.filter((a) => a.isTest || a.noQueue))

async function authHeaders() {
  const token = await getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function load(fresh = false) {
  state.value = 'loading'
  try {
    const res = await fetch(`${apiBase()}/api/recording/admin/artists${fresh ? '?fresh' : ''}`, { headers: await authHeaders() })
    if (res.status === 401 || res.status === 403) { state.value = 'hidden'; return }
    if (!res.ok) throw new Error(`Could not load the artists (${res.status})`)
    data.value = await res.json()
    detail.value = {}
    state.value = 'ready'
  } catch (err) {
    error.value = (err && err.message) || 'Network error'
    state.value = 'error'
  }
}

async function toggle(voiceId) {
  if (openId.value === voiceId) { openId.value = null; return }
  openId.value = voiceId
  takeLimit.value = 10
  if (detail.value[voiceId] && !detail.value[voiceId].error) return
  detail.value = { ...detail.value, [voiceId]: { loading: true } }
  try {
    const res = await fetch(`${apiBase()}/api/recording/admin/artists/${encodeURIComponent(voiceId)}`, { headers: await authHeaders() })
    if (!res.ok) throw new Error(`Could not load ${voiceId} (${res.status})`)
    const d = await res.json()
    d.maxTakes = Math.max(1, ...d.daily.map((x) => x.takes))
    detail.value = { ...detail.value, [voiceId]: d }
  } catch (err) {
    detail.value = { ...detail.value, [voiceId]: { error: (err && err.message) || 'Network error' } }
  }
}

function ago(iso) {
  const days = Math.floor((Date.now() - Date.parse(iso)) / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

/** "12 this week · last 2d ago", or "not started". */
function projectActivity(p, long = false) {
  const act = p.activity || {}
  if (!act.lastActive) return 'not started'
  const week = `${act.takes7d.toLocaleString()} this week`
  const last = long ? `last take ${fmtWhen(act.lastActive)}` : `last ${ago(act.lastActive)}`
  return p.other ? `${act.takes.toLocaleString()} takes · ${last}` : `${week} · ${last}`
}

function projectBatches(voiceId, key) {
  const d = detail.value[voiceId]
  return d && d.phraseBatches ? d.phraseBatches.filter((b) => b.project === key) : []
}
function projectTakes(voiceId, key) {
  const d = detail.value[voiceId]
  return d && d.recentTakes ? d.recentTakes.filter((t) => t.project === key).slice(0, 10) : []
}
const isProjectOpen = (voiceId, key) => !!openProjects.value[`${voiceId}/${key}`]
function toggleProject(voiceId, key) {
  const k = `${voiceId}/${key}`
  openProjects.value = { ...openProjects.value, [k]: !openProjects.value[k] }
}

function pct(n, total, text = false) {
  if (!total) return text ? '—' : '0%'
  const p = Math.max(0, Math.min(100, (n / total) * 100))
  return text ? `${p < 1 && n > 0 ? '<1' : Math.round(p)}%` : `${p}%`
}

/** Hours and minutes, never seconds — the data is not that precise. */
function fmtDur(ms) {
  if (!ms) return '0m'
  const min = Math.round(ms / 60000)
  if (min < 1) return '<1m'
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`
}

function fmtWhen(iso) {
  return new Date(iso).toLocaleString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function shortDate(d) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function lastActiveLabel(a) {
  const t = a.activity.lastActive
  if (!t) return 'not started'
  if (a.activity.takesToday) return 'active today'
  const days = Math.floor((Date.now() - Date.parse(t)) / 86400000)
  if (days < 1) return 'active in the last day'
  return `last active ${days}d ago`
}

/** A bar with 4px rounded top corners anchored to the baseline, with a 2px gap either side. */
function barPath(i, v, max) {
  const w = colW - 2
  const x = i * colW + 1
  const h = Math.max(2, (v / max) * (CHART_H - 14))
  const y = CHART_H - h
  const r = Math.min(2, w / 2, h)
  return `M${x},${CHART_H} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${CHART_H} Z`
}

// A tap on a booth's team card arrives as ?artist=<voiceId>: open that artist and bring it into view.
onMounted(async () => {
  await load()
  const want = typeof route.query.artist === 'string' ? route.query.artist : null
  if (state.value !== 'ready' || !want || !data.value.artists.some((a) => a.voiceId === want)) return
  toggle(want)
  await nextTick()
  const el = document.getElementById(`artist-${want}`)
  if (el) el.scrollIntoView({ block: 'start' })
})
</script>

<style scoped>
.artists { margin: 0 0 2rem; }
.artists-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
h2 { font-family: 'Josefin Sans', sans-serif; font-size: 1.25rem; margin: 0; }
h3 { font-family: 'Josefin Sans', sans-serif; font-size: 0.85rem; margin: 1rem 0 0.4rem; color: var(--color-paper-dim, #c1c1bb); font-weight: 600; }
.lede { color: var(--color-paper-dim, #c1c1bb); font-size: 0.85rem; margin: 0.2rem 0 0.9rem; }
.ba-loading, .note { color: var(--color-paper-dim, #c1c1bb); font-size: 0.8rem; }
.ba-error { color: #ff9d9d; }
.refresh, .more {
  font-family: 'Josefin Sans', sans-serif; font-size: 0.75rem; font-weight: 600; color: var(--color-emerald, #06ffa5);
  background: transparent; border: 1px solid var(--color-emerald, #06ffa5); border-radius: 6px; padding: 0.35rem 0.7rem; cursor: pointer; min-height: 34px;
}
.cards { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.7rem; grid-template-columns: 1fr; }
@media (min-width: 720px) { .cards { grid-template-columns: 1fr 1fr; } .card.open { grid-column: 1 / -1; } }
.card { background: var(--color-shadow, #1e293b); border: 1px solid var(--color-graphite, #475569); border-radius: 12px; overflow: hidden; }
.card-btn { all: unset; display: block; box-sizing: border-box; width: 100%; padding: 0.85rem 1rem; cursor: pointer; }
.card-btn:focus-visible { outline: 2px solid var(--color-emerald, #06ffa5); outline-offset: -2px; }
.card-top { display: flex; align-items: baseline; gap: 0.5rem; flex-wrap: wrap; }
.name { font-family: 'Josefin Sans', sans-serif; font-weight: 600; font-size: 1.05rem; }
.meta { color: var(--color-paper-dim, #c1c1bb); font-size: 0.75rem; }
.last { margin-left: auto; font-size: 0.72rem; color: var(--color-paper-dim, #c1c1bb); }
.last.today { color: var(--color-emerald, #06ffa5); }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.4rem; margin: 0.7rem 0 0.5rem; }
.stat { display: flex; flex-direction: column; }
.stat .v { font-family: 'IBM Plex Mono', monospace; font-size: 1.05rem; }
.stat .k { font-size: 0.66rem; color: var(--color-paper-dim, #c1c1bb); }
.q { display: grid; grid-template-columns: 1fr auto; align-items: center; column-gap: 0.5rem; row-gap: 0.15rem; font-size: 0.74rem; margin-top: 0.55rem; }
.q-label { grid-column: 1 / -1; color: var(--color-paper, #f7f7f2); font-weight: 600; }
.q-meta { grid-column: 1 / -1; color: var(--color-paper-dim, #c1c1bb); font-size: 0.68rem; }
.q-other .q-label { font-weight: 500; color: var(--color-paper-dim, #c1c1bb); }
.proj { padding: 0.5rem 0; border-bottom: 1px solid var(--color-graphite, #475569); max-width: 520px; }
.proj-head { display: flex; justify-content: space-between; gap: 0.6rem; align-items: baseline; }
.proj-name { font-size: 0.85rem; font-weight: 600; }
.proj-num { font-family: 'IBM Plex Mono', monospace; font-size: 0.74rem; color: var(--color-paper-dim, #c1c1bb); white-space: nowrap; }
.proj-meta { display: block; font-size: 0.72rem; color: var(--color-paper-dim, #c1c1bb); margin: 0.1rem 0 0.3rem; }
.proj .batches { margin-top: 0.3rem; }
.link { background: none; border: 0; padding: 0.3rem 0; min-height: 34px; font: inherit; font-size: 0.78rem; font-weight: 600; color: var(--color-emerald, #06ffa5); cursor: pointer; }
.q-bar { height: 8px; border-radius: 4px; background: var(--color-void, #0f172a); border: 1px solid var(--color-graphite, #475569); overflow: hidden; }
.q-fill { display: block; height: 100%; background: var(--color-emerald, #06ffa5); }
.q-num { font-family: 'IBM Plex Mono', monospace; color: var(--color-paper-dim, #c1c1bb); }
.drill { padding: 0 1rem 1rem; border-top: 1px solid var(--color-graphite, #475569); }
.chart { width: 100%; max-width: 420px; height: auto; display: block; }
.chart .axis { stroke: var(--color-graphite, #475569); stroke-width: 1; }
.chart .bar { fill: var(--color-emerald, #06ffa5); }
.chart .hit { fill: transparent; }
.chart .hit:hover { fill: rgba(255, 255, 255, 0.06); }
.chart .tick { fill: var(--color-paper-dim, #c1c1bb); font-size: 8px; font-family: 'IBM Plex Mono', monospace; }
.tbl { border-collapse: collapse; font-size: 0.78rem; width: 100%; max-width: 420px; }
.tbl td { padding: 0.25rem 0.4rem 0.25rem 0; border-bottom: 1px solid var(--color-graphite, #475569); }
.tbl .n { text-align: right; font-family: 'IBM Plex Mono', monospace; color: var(--color-paper-dim, #c1c1bb); }
.batches { display: flex; flex-wrap: wrap; gap: 3px; }
.batch { width: 22px; height: 22px; border-radius: 4px; border: 1px solid var(--color-graphite, #475569); display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: var(--color-paper-dim, #c1c1bb); font-family: 'IBM Plex Mono', monospace; }
.batch.started { border-color: var(--color-emerald, #06ffa5); color: var(--color-emerald, #06ffa5); }
.batch.done { background: var(--color-emerald, #06ffa5); border-color: var(--color-emerald, #06ffa5); color: var(--color-void, #0f172a); }
.takes { list-style: none; margin: 0; padding: 0; }
.take { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.45rem 0; border-top: 1px solid var(--color-graphite, #475569); }
.take-meta { color: var(--color-paper-dim, #c1c1bb); font-size: 0.7rem; font-family: 'IBM Plex Mono', monospace; }
.take-text { font-size: 0.85rem; }
.take audio { width: 100%; max-width: 420px; height: 36px; }
.others, .key { margin-top: 0.9rem; font-size: 0.8rem; color: var(--color-paper-dim, #c1c1bb); }
.others ul { list-style: none; padding: 0.3rem 0 0; margin: 0; }
.others li { padding: 0.2rem 0; display: flex; gap: 0.5rem; flex-wrap: wrap; }
.others .name { font-size: 0.85rem; color: var(--color-paper, #f7f7f2); }
.key dl { margin: 0.4rem 0 0; }
.key dt { font-weight: 600; color: var(--color-paper, #f7f7f2); margin-top: 0.5rem; }
.key dd { margin: 0.1rem 0 0; }
summary { cursor: pointer; min-height: 32px; display: list-item; }
/* Light mode (Aran reads in it, job #371). The palette tokens flip on their own; what does not is
   graphite as a border (slate-200, near-invisible on white), the pink error ink and the white
   hover wash, so those three are re-said here the way the booth page re-says them. */
:root[data-theme="light"] .card,
:root[data-theme="light"] .drill,
:root[data-theme="light"] .q-bar,
:root[data-theme="light"] .tbl td,
:root[data-theme="light"] .batch,
:root[data-theme="light"] .take,
:root[data-theme="light"] .proj { border-color: var(--line); }
:root[data-theme="light"] .batch.started,
:root[data-theme="light"] .batch.done { border-color: var(--color-emerald); }
:root[data-theme="light"] .card { box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06); }
:root[data-theme="light"] .chart .axis { stroke: var(--line); }
:root[data-theme="light"] .chart .hit:hover { fill: rgba(15, 23, 42, 0.06); }
:root[data-theme="light"] .ba-error { color: var(--danger); }
</style>
