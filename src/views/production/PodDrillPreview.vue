<template>
  <!--
    POD DRILL PREVIEW (job #692). Built by every Pod Drill stage run, with no publishing step:
    tools/pods/pod-drill/stage.mjs writes ops/pod-drill-cuts/<course>.*, services/pod-drill-router.cjs
    serves it, and this page plays each cut exactly as the Drill does (each piece target · known ·
    target · target, then the whole line the same way), sliced live from the same clips by the same
    millisecond spans the player reads. Behind Popty's login and the course-scope gate, so Kai opens
    it with his own account. Read-only: it renders nothing and writes nothing.
  -->
  <div class="min-h-screen bg-canvas text-ink p-6">
    <div class="max-w-5xl mx-auto">
      <div class="flex items-center gap-3 mb-4 text-sm">
        <router-link to="/" class="link-emerald">Home</router-link>
        <span class="text-faint">/</span>
        <router-link :to="`/production/${courseCode}`" class="link-emerald">{{ courseCode }}</router-link>
        <span class="text-faint">/</span>
        <router-link :to="`/production/${courseCode}/pods`" class="link-emerald">Pods</router-link>
        <span class="text-faint">/</span>
        <span class="text-muted">Drill cuts</span>
      </div>

      <h1 class="text-2xl font-bold text-emerald mb-1">Pod 1 Drill cuts</h1>
      <div v-if="loading" class="text-faint py-8">Loading the last run…</div>
      <div v-else-if="error" class="err-box rounded-lg p-4">{{ error }}</div>
      <div v-else-if="!data.hasRun" class="text-muted py-8">
        No Pod Drill run for {{ courseCode }} yet. It appears here after
        <code>node tools/pods/pod-drill/stage.mjs {{ courseCode }} --write</code> lands on main.
      </div>
      <template v-else>
        <p class="text-muted text-sm mb-4">
          Last run {{ fmtDate(data.runAt) }}.
          <span v-if="data.summary">{{ data.summary.cards }} cards; {{ data.summary.needCutting }} needed cutting; </span>
          {{ data.cards.length }} play cut in Drill; {{ data.rerecord.length }} known pieces to re-record;
          {{ data.needsPairing }} known pieces worded differently from their sentence; {{ data.playsWhole }} on cards Drill plays whole.
        </p>
        <p v-if="data.boundary" class="text-muted text-sm mb-4">
          Boundary score (jobs #707, #750), from the English take itself: a cut known piece is
          <span class="badge-kept">KEPT (cut)</span> when the take is at least {{ data.boundary.SILENT_BELOW_DB }} dB quieter than speech at each seam
          and the word timings do not put the seam more than {{ data.boundary.INSIDE_MS }} ms inside a word,
          and <span class="badge-new">RE-RENDERED</span> as its own clip, same voice, otherwise. Where a person has listened and marked a piece, their mark decides.
          {{ data.boundary.totals.clean }} kept, {{ data.boundary.totals.tight }} tight, {{ data.boundary.totals.unscored }} unscored
          of {{ data.boundary.totals.pieces }}. A tight piece the audio route refused still plays its cut, and says why.
        </p>

        <div class="flex gap-2 mb-5 text-sm">
          <button :class="tab === 'cuts' ? 'tab-on' : 'tab-off'" @click="tab = 'cuts'">Cut cards ({{ data.cards.length }})</button>
          <button :class="tab === 'rerecord' ? 'tab-on' : 'tab-off'" @click="tab = 'rerecord'">Re-record list ({{ data.rerecord.length }})</button>
          <button v-if="playing" class="tab-off" @click="stop">■ Stop</button>
        </div>

        <div v-if="tab === 'cuts'">
          <div v-for="card in data.cards" :key="card.id" class="card mb-3 p-3 rounded-lg">
            <div class="flex items-baseline justify-between gap-3">
              <div>
                <div class="font-medium">{{ card.target }}</div>
                <div class="text-muted text-sm">{{ card.known }}</div>
              </div>
              <div class="text-faint text-xs whitespace-nowrap">SC{{ pad(card.scene) }} · {{ shortId(card.id) }}</div>
            </div>
            <div class="mt-2">
              <button class="btn-play" @click="playCard(card)">▶ as Drill plays it</button>
            </div>
            <div v-for="(line, li) in card.lines" :key="li" class="mt-2 pl-3 border-l border-faint">
              <div v-if="card.lines.length > 1" class="text-sm">
                <button class="btn-mini" @click="playSeq([tSlice(card, line.t)])">▶</button>
                <span>{{ line.t[0] }}</span>
                <span class="text-muted"> — </span>
                <button class="btn-mini" :disabled="!kSliceOfLine(card, line)" @click="playSeq([kSliceOfLine(card, line)])">▶</button>
                <span class="text-muted">{{ line.k?.[0] }}</span>
                <span v-if="line.k && line.k.length !== 3" class="flag"> known not cut</span>
              </div>
              <div v-for="(ch, ci) in line.chunks" :key="ci" class="text-sm flex items-center gap-2 py-0.5">
                <button class="btn-mini" @click="playSeq([tSlice(card, ch)])">▶</button>
                <span class="min-w-[12rem]">{{ ch[0] }}</span>
                <button class="btn-mini" @click="playSeq([kSliceOfChunk(card, ch)])">▶</button>
                <span class="text-muted">{{ ch[3] || '—' }}</span>
                <span v-if="ch[6]" class="badge-new">RE-RENDERED</span>
                <span v-else-if="score(card, li, ci)?.verdict === 'clean'" class="badge-kept">KEPT (cut)</span>
                <span v-else-if="score(card, li, ci)?.verdict === 'tight'" class="flag">TIGHT, still the cut</span>
                <span v-else-if="score(card, li, ci)?.verdict === 'unscored'" class="flag">unscored</span>
                <span v-else-if="ch.length < 6" class="flag">known not cut: plays the whole known clip</span>
                <button v-if="ch[6] && ch[4] != null" class="btn-mini" title="the old cut, for comparison" @click="playSeq([{ clip: card.knownClip, a: ch[4], b: ch[5] }])">▶ old cut</button>
              </div>
              <div v-for="(ch, ci) in line.chunks" v-show="score(card, li, ci)" :key="'w' + ci" class="text-xs text-faint pl-8">
                <template v-if="score(card, li, ci)">{{ ch[3] }}: {{ score(card, li, ci).why }}<template v-if="score(card, li, ci).render && !ch[6]"> · route said {{ score(card, li, ci).render.code || score(card, li, ci).render.source }}<template v-if="score(card, li, ci).render.error">: {{ score(card, li, ci).render.error }}</template></template></template>
              </div>
            </div>
          </div>
        </div>

        <div v-else>
          <p class="text-muted text-sm mb-3">
            Known pieces that could not be cut from their sentence. Each is made as its own clip through
            Popty's one audio route (job #707); the badge says whether it was, or what the route answered.
          </p>
          <div v-for="(r, i) in data.rerecord" :key="i" class="card mb-2 p-3 rounded-lg text-sm">
            <div class="flex items-baseline justify-between gap-3">
              <div>
                <span class="font-medium">{{ r.target }}</span>
                <span class="text-muted"> — {{ r.known }}</span>
              </div>
              <div class="text-faint text-xs whitespace-nowrap">SC{{ pad(r.scene) }} · {{ shortId(r.card) }}</div>
            </div>
            <div class="text-muted">in “{{ r.knownSentence }}”</div>
            <div class="text-xs mt-1"><span class="flag">why</span> {{ r.why }}</div>
            <div v-if="r.fix" class="text-xs"><span class="text-faint">fix</span> {{ r.fix }}</div>
            <div v-if="r.render" class="text-xs mt-1">
              <span v-if="r.render.verified" class="badge-new">RE-RENDERED</span>
              <span v-else class="flag">not re-rendered: {{ r.render.code || 'unverified' }}</span>
              <span v-if="r.render.error" class="text-faint"> {{ r.render.error }}</span>
              <button v-if="r.render.verified" class="btn-mini" @click="playSeq([{ clip: r.render.audioId }])">▶ standalone piece</button>
            </div>
            <div class="mt-1">
              <button class="btn-mini" :disabled="!r.clip" @click="playSeq([{ clip: r.clip }])">▶ target sentence</button>
              <button class="btn-mini" :disabled="!r.knownClip" @click="playSeq([{ clip: r.knownClip }])">▶ known sentence</button>
            </div>
          </div>
        </div>
      </template>
      <audio ref="audioEl" preload="auto" class="hidden"></audio>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { getApiUrl } from '@/services/api.js'

const props = defineProps({ courseCode: { type: String, required: true } })
const courseCode = props.courseCode
const loading = ref(true)
const error = ref('')
const data = ref(null)
const tab = ref('cuts')
const playing = ref(false)
const audioEl = ref(null)

const pad = (n) => String(n ?? '?').padStart(2, '0')
const shortId = (id) => String(id).split(':').slice(2).join(':')
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString() : 'unknown')

async function load () {
  try {
    const res = await fetch(`${getApiUrl()}/api/production/${courseCode}/pod-drill`)
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`)
    data.value = await res.json()
  } catch (e) {
    error.value = `Could not load the Pod Drill run: ${e.message}`
  } finally {
    loading.value = false
  }
}
load()

// ---- slices: {clip, a?, b?} in ms; no a/b = the whole clip
const tSlice = (card, x) => ({ clip: card.clip, a: x[1], b: x[2] })
// chunk[6] = the piece's standalone clip (job #707): Drill plays it whole in place of the cut
const kSliceOfChunk = (card, ch) => (ch[6] ? { clip: ch[6] } : ch.length >= 6 && ch[4] != null ? { clip: card.knownClip, a: ch[4], b: ch[5] } : { clip: card.knownClip })
const score = (card, li, ci) => card.scores?.[`${li}|${ci}`] || null
const kSliceOfLine = (card, line) => (line.k && line.k.length === 3 ? { clip: card.knownClip, a: line.k[1], b: line.k[2] } : card.knownClip ? { clip: card.knownClip } : null)

/** composeDrillCard's order (packages/core/src/pods/fusionDrill.ts): each chunk t·k·t·t, then each
 *  line t·k·t·t, then a several-line turn once whole. */
function playCard (card) {
  const seq = []
  const tktt = (t, k) => { seq.push(t); if (k) seq.push(k); seq.push(t, t) }
  for (const line of card.lines) {
    for (const ch of line.chunks || []) tktt(tSlice(card, ch), kSliceOfChunk(card, ch))
    tktt(tSlice(card, line.t), card.lines.length > 1 ? kSliceOfLine(card, line) : { clip: card.knownClip })
  }
  if (card.lines.length > 1) { seq.push({ clip: card.clip }); if (card.knownClip) seq.push({ clip: card.knownClip }) }
  playSeq(seq)
}

const urls = new Map()
async function urlOf (clip) {
  if (!urls.has(clip)) {
    const res = await fetch(`${getApiUrl()}/api/production/${courseCode}/audio/${clip}/url`)
    if (!res.ok) throw new Error(`signed url failed (${res.status})`)
    urls.set(clip, (await res.json()).url)
  }
  return urls.get(clip)
}

let token = 0
function stop () { token++; playing.value = false; audioEl.value?.pause() }

function playOne (s, my) {
  return new Promise(async (resolve, reject) => {
    const el = audioEl.value
    try {
      const url = await urlOf(s.clip)
      if (my !== token) return resolve()
      if (el.src !== url) {
        el.src = url
        await new Promise((ok, bad) => { el.onloadedmetadata = ok; el.onerror = () => bad(new Error('audio failed to load')) })
      }
      el.currentTime = (s.a || 0) / 1000
      el.onended = () => resolve()
      await el.play()
      if (s.b == null) return
      const tick = () => {
        if (my !== token) { el.pause(); return resolve() }
        if (el.currentTime * 1000 >= s.b) { el.pause(); return resolve() }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    } catch (e) { reject(e) }
  })
}

async function playSeq (seq) {
  stop()
  const my = ++token
  playing.value = true
  try {
    for (const s of seq) {
      if (my !== token) return
      await playOne(s, my)
      await new Promise((r) => setTimeout(r, 350))
    }
  } catch (e) {
    error.value = `Playback failed: ${e.message}`
  } finally {
    if (my === token) playing.value = false
  }
}
onUnmounted(stop)
</script>

<style scoped>
.card { background: var(--color-surface, rgba(255,255,255,0.03)); border: 1px solid rgba(127,127,127,0.2); }
.btn-play { padding: 0.25rem 0.75rem; border-radius: 0.375rem; border: 1px solid rgba(16,185,129,0.5); }
.btn-mini { padding: 0 0.4rem; border-radius: 0.25rem; border: 1px solid rgba(127,127,127,0.35); font-size: 0.75rem; margin-right: 0.25rem; }
.btn-mini:disabled { opacity: 0.35; }
.tab-on { padding: 0.25rem 0.75rem; border-radius: 0.375rem; background: rgba(16,185,129,0.2); }
.tab-off { padding: 0.25rem 0.75rem; border-radius: 0.375rem; border: 1px solid rgba(127,127,127,0.3); }
.flag { color: #d97706; font-size: 0.75rem; }
.badge-kept { color: #059669; font-size: 0.7rem; font-weight: 600; }
.badge-new { color: #2563eb; font-size: 0.7rem; font-weight: 600; }
</style>
