<template>
  <!-- RECORDING ARTISTS, for Tom and Aran only (Aran, 2026-10-14, job #350). The server refuses
       everyone else (services/voice-engine/booth-artists-router.cjs); on a 401/403 this section
       draws nothing at all, so the other admins who open this page see the page they always had. -->
  <section v-if="state !== 'hidden'" class="artists">
    <div class="artists-head">
      <h2>Recording artists</h2>
      <button v-if="state === 'ready'" class="refresh" @click="load(true)">Refresh</button>
    </div>
    <p class="lede">How each reader is getting on. Seen only by Tom and Aran.</p>

    <div v-if="state === 'loading'" class="ba-loading">Loading every artist… (up to 20 seconds the first time)</div>
    <p v-else-if="state === 'error'" class="ba-error">{{ error }}</p>

    <template v-else>
      <ul class="cards">
        <li v-for="a in mainArtists" :key="a.voiceId" class="card" :class="{ open: openId === a.voiceId }">
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
            <div v-for="q in queues(a)" :key="q.key" class="q">
              <span class="q-label">{{ q.label }}</span>
              <span class="q-bar"><span class="q-fill" :style="{ width: pct(q.done, q.total) }"></span></span>
              <span class="q-num">{{ q.done.toLocaleString() }} / {{ q.total.toLocaleString() }}</span>
            </div>
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

              <template v-if="kindRows(a).length">
                <h3>Lines by queue</h3>
                <table class="tbl">
                  <tr v-for="k in kindRows(a)" :key="k.key"><td>{{ k.label }}</td><td class="n">{{ k.done }} / {{ k.total }}</td><td class="n">{{ pct(k.done, k.total, true) }}</td></tr>
                </table>
              </template>

              <template v-if="detail[a.voiceId].phraseBatches.length">
                <h3>Practice phrases by batch</h3>
                <div v-for="g in batchGroups(detail[a.voiceId].phraseBatches)" :key="g.key" class="batch-group">
                  <span class="batch-label">{{ g.label }} · {{ g.done }}/{{ g.batches.length }} batches</span>
                  <div class="batches">
                    <div v-for="b in g.batches" :key="b.batch"
                         class="batch" :class="{ done: b.recorded + b.held >= b.total, started: b.recorded > 0 && b.recorded + b.held < b.total }"
                         :title="`${g.label} batch ${b.batch}: ${b.recorded} of ${b.total} read${b.held ? `, ${b.held} held by a proof flag` : ''}`">
                      <span>{{ b.batch }}</span>
                    </div>
                  </div>
                </div>
                <p class="note">Each square is one batch (~200 lines). Filled = finished, outlined = started. Tap and hold for numbers.</p>
              </template>

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
                  <span class="take-meta">{{ fmtWhen(t.recordedAt) }} · {{ t.courseCode }} · {{ t.role }}<template v-if="t.durationMs"> · {{ (t.durationMs / 1000).toFixed(1) }}s</template><template v-if="t.archived"> · archived by Re-record all</template></span>
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
          <dt>Lines x / y</dt><dd>Lines in that queue with a take, out of all lines in it — the booth's own count. POD-1, new sentences and minimal set come from the booth's queue; practice phrases are pass 1 and pass 2 of the phrase batches.</dd>
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
import { ref, computed, onMounted } from 'vue'
import { recordingApiBase as apiBase } from '@/services/recordingApi'
import { useAuth } from '@/composables/useAuth'

const { getAccessToken } = useAuth()

const state = ref('loading') // loading | ready | error | hidden
const error = ref(null)
const data = ref({ artists: [] })
const openId = ref(null)
const detail = ref({})
const takeLimit = ref(10)

const CHART_W = 300
const CHART_H = 70
const colW = CHART_W / 30

const KIND_LABELS = { pod: 'POD-1', takeg: 'Take G', seed: 'New sentences', quarry: 'Minimal set', rerecord: 'Re-recording' }
const COURSE_LABELS = { cym_nv2_for_eng: 'North', cym_sv2_for_eng: 'South' }

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

/** The headline bars: the booth queue as one, then each phrase pass. Empty queues are not drawn. */
function queues(a) {
  const out = []
  if (a.lines && a.lines.total) out.push({ key: 'lines', label: 'Booth lines', done: a.lines.withTake, total: a.lines.total })
  const passes = (a.phrases && a.phrases.passes) || {}
  for (const p of Object.keys(passes).sort()) {
    if (passes[p].total) out.push({ key: `p${p}`, label: `Phrases pass ${p}`, done: passes[p].recorded, total: passes[p].total })
  }
  return out
}

function kindRows(a) {
  const kinds = (a.lines && a.lines.kinds) || {}
  return Object.keys(KIND_LABELS).filter((k) => kinds[k] && kinds[k].total)
    .map((k) => ({ key: k, label: KIND_LABELS[k], done: kinds[k].withTake ?? 0, total: kinds[k].total }))
}

function courseLabel(c) { return COURSE_LABELS[c] || c }

/** One row of squares per course and pass, so batch 3 of pass 2 never reads as batch 3 of pass 1. */
function batchGroups(batches) {
  const groups = new Map()
  for (const b of batches) {
    const key = `${b.courseCode}-${b.pass}`
    if (!groups.has(key)) groups.set(key, { key, label: `${courseLabel(b.courseCode)} pass ${b.pass}`, batches: [], done: 0 })
    const g = groups.get(key)
    g.batches.push(b)
    if (b.recorded + b.held >= b.total) g.done += 1
  }
  return [...groups.values()]
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

onMounted(() => load())
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
.q { display: grid; grid-template-columns: 7.5rem 1fr auto; align-items: center; gap: 0.5rem; font-size: 0.74rem; margin-top: 0.3rem; }
.q-label { color: var(--color-paper-dim, #c1c1bb); }
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
.batch-group { margin-bottom: 0.5rem; }
.batch-label { display: block; font-size: 0.72rem; color: var(--color-paper-dim, #c1c1bb); margin-bottom: 0.2rem; }
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
:root[data-theme="light"] .card { border-color: var(--line); }
</style>
