<template>
  <div class="speed-check">
    <header class="hdr">
      <h1>German seed&nbsp;1 — speed A/B</h1>
      <p class="sub">
        deu_for_eng · white belt · read-only listening copies of the clips already in the course.
        Nothing here was regenerated.
      </p>
    </header>

    <!-- THE NUMBERS. Kai rules on these separately from whether they are applied. -->
    <section class="numbers">
      <h2>The numbers, read from the code on <code>origin/dev</code></h2>
      <table>
        <tbody>
          <tr>
            <th>Belt speed, seed 1 (white)</th>
            <td class="num">0.80×</td>
            <td class="src"><code>beltSpeed()</code> — <code>toSimpleRounds.ts:75-80</code> (white = seeds 1-7)</td>
          </tr>
          <tr>
            <th>Course global speed, deu_for_eng</th>
            <td class="num">0.95×</td>
            <td class="src"><code>courses.voice_config.target_speed.global_speed</code> (DB, read 2026-08-06)</td>
          </tr>
          <tr>
            <th>Learner speed setting, app default</th>
            <td class="num">1.00×</td>
            <td class="src"><code>localStorage 'learner_speed'</code> default — <code>LearningPlayer.vue:6457-6461</code>, <code>SettingsScreen.vue:390</code></td>
          </tr>
          <tr class="total">
            <th>What a seed-1 beginner SHOULD hear</th>
            <td class="num">0.95 × 0.80 × 1.00 = <strong>0.76×</strong></td>
            <td class="src"><code>computeCycleSpeed()</code> — <code>toSimpleRounds.ts:101-113</code> (multiply, round to 2dp, clamp to [0.70, global])</td>
          </tr>
        </tbody>
      </table>
      <p class="note">
        The app applies this as <code>audio.playbackRate</code> on the HTML audio element
        (<code>SimplePlayer.ts:1119-1130</code>), on <strong>target audio only</strong> — known-language
        prompt audio is pinned to 1.00× and never ramped. This page uses the same mechanism
        (<code>playbackRate</code>, pitch preserved), so B and C here are the same processing the app does.
        No files were re-rendered.
      </p>
    </section>

    <section class="legend">
      <div><span class="pill a">A</span> original, exactly as stored — <b>1.00×</b></div>
      <div><span class="pill b">B</span> seed-1 belt ramp only — <b>0.80×</b></div>
      <div><span class="pill c">C</span> belt ramp × course global × learner default — <b>0.76×</b> <i>(what the app should be playing)</i></div>
    </section>

    <section class="clips">
      <article v-for="(clip, i) in clips" :key="i" class="clip">
        <div class="meta">
          <span class="role" :class="clip.role">{{ roleLabel(clip.role) }}</span>
          <span class="seed">seed {{ clip.seed }}</span>
          <span class="voice">{{ clip.voiceId }}</span>
          <span class="dur">{{ clip.durationMs }}ms</span>
        </div>
        <div class="text">
          <div class="target">{{ clip.role === 'known' ? clip.known : clip.target }}</div>
          <div class="gloss">{{ clip.role === 'known' ? clip.target : clip.known }}</div>
        </div>
        <p v-if="clip.role === 'known'" class="prompt-note">
          Known-language prompt. The app <b>never</b> slows this — B and C are here for reference only.
        </p>
        <div class="btns">
          <button
            v-for="v in variants"
            :key="v.key"
            class="play"
            :class="[v.key, { active: playing === i + ':' + v.key }]"
            @click="play(i, v)"
          >
            <span class="k">{{ v.key }}</span>
            <span class="r">{{ v.rate.toFixed(2) }}×</span>
          </button>
          <button class="stop" @click="stop">■</button>
        </div>
      </article>
    </section>

    <footer class="ftr">
      <p>
        Method: one <code>&lt;audio&gt;</code> element, <code>playbackRate</code> set before play,
        <code>preservesPitch = true</code> (the browser default, and what the app relies on).
        No server-side stretching, no resampling, no pitch shift.
      </p>
      <p>Clips fetched from <code>ssi-audio-stage</code> exactly as stored. Built 2026-08-06.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import clipData from './germanSeed1SpeedClips.json'

// The three states, with the numbers spelled out so the page is self-documenting.
const BELT_SEED1 = 0.80        // beltSpeed(1) — toSimpleRounds.ts:75-80
const COURSE_GLOBAL = 0.95     // deu_for_eng voice_config.target_speed.global_speed
const LEARNER_DEFAULT = 1.00   // localStorage 'learner_speed' default
// computeCycleSpeed rounds to 2dp then clamps to [0.7, global]. 0.95*0.8 = 0.76.
const COMBINED = Math.max(0.7, Math.min(Math.round(COURSE_GLOBAL * BELT_SEED1 * LEARNER_DEFAULT * 100) / 100, COURSE_GLOBAL))

const variants = [
  { key: 'A', rate: 1.0 },
  { key: 'B', rate: BELT_SEED1 },
  { key: 'C', rate: COMBINED },
]

const clips = clipData
const playing = ref('')

let audio = null
function ensureAudio() {
  if (audio) return audio
  audio = new Audio()
  audio.addEventListener('ended', () => { playing.value = '' })
  audio.addEventListener('error', () => { playing.value = '' })
  return audio
}

function play(i, v) {
  const el = ensureAudio()
  el.pause()
  el.src = clips[i].url
  // Pitch preservation is the browser default; set it explicitly (incl. the
  // legacy vendor names) so no engine silently resamples instead.
  el.preservesPitch = true
  el.mozPreservesPitch = true
  el.webkitPreservesPitch = true
  el.playbackRate = v.rate
  playing.value = i + ':' + v.key
  el.play().catch(() => { playing.value = '' })
}

function stop() {
  if (audio) audio.pause()
  playing.value = ''
}

function roleLabel(role) {
  if (role === 'known') return 'prompt (English)'
  if (role === 'target1') return 'target 1'
  return 'target 2'
}

onBeforeUnmount(() => { if (audio) { audio.pause(); audio = null } })
</script>

<style scoped>
.speed-check {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 14px 48px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #e8e8ea;
  background: #131316;
  min-height: 100vh;
  box-sizing: border-box;
}
h1 { font-size: 1.3rem; margin: 0 0 6px; }
h2 { font-size: 0.95rem; margin: 0 0 10px; color: #c9c9d0; }
.sub { margin: 0 0 20px; font-size: 0.85rem; color: #9a9aa3; line-height: 1.5; }

.numbers {
  background: #1c1c21;
  border: 1px solid #2e2e36;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 18px;
}
.numbers table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.numbers th {
  text-align: left; font-weight: 500; color: #b9b9c2;
  padding: 7px 8px 7px 0; vertical-align: top;
}
.numbers td { padding: 7px 0; vertical-align: top; }
.numbers .num { font-variant-numeric: tabular-nums; color: #7dd3a0; white-space: nowrap; padding-right: 10px; }
.numbers .src { color: #7c7c88; font-size: 0.74rem; line-height: 1.45; }
.numbers tr.total th, .numbers tr.total td { border-top: 1px solid #2e2e36; padding-top: 10px; }
.numbers tr.total .num strong { color: #ffd479; font-size: 1.05rem; }
.note { font-size: 0.78rem; color: #8f8f9a; line-height: 1.55; margin: 12px 0 0; }
code { font-family: ui-monospace, Menlo, monospace; font-size: 0.92em; color: #a9c8ff; }

.legend { display: flex; flex-direction: column; gap: 7px; margin-bottom: 20px; font-size: 0.82rem; color: #b9b9c2; }
.legend i { color: #8f8f9a; }
.pill {
  display: inline-block; width: 22px; height: 22px; line-height: 22px;
  text-align: center; border-radius: 5px; font-weight: 700; font-size: 0.75rem;
  margin-right: 8px; color: #131316;
}
.pill.a { background: #8a8a95; }
.pill.b { background: #7dd3a0; }
.pill.c { background: #ffd479; }

.clip {
  background: #1c1c21;
  border: 1px solid #2e2e36;
  border-radius: 10px;
  padding: 13px 13px 11px;
  margin-bottom: 12px;
}
.meta { display: flex; gap: 8px; flex-wrap: wrap; font-size: 0.68rem; color: #7c7c88; margin-bottom: 7px; }
.role { padding: 2px 7px; border-radius: 4px; background: #2a2a32; color: #b9b9c2; }
.role.known { background: #33303a; color: #c8b6e0; }
.text .target { font-size: 1.05rem; font-weight: 600; line-height: 1.35; }
.text .gloss { font-size: 0.82rem; color: #8f8f9a; margin-top: 3px; }
.prompt-note { font-size: 0.72rem; color: #d0a97a; margin: 8px 0 0; line-height: 1.45; }

.btns { display: flex; gap: 8px; margin-top: 12px; }
.play {
  flex: 1;
  min-height: 56px;
  border-radius: 9px;
  border: 1px solid #3a3a44;
  background: #24242b;
  color: #e8e8ea;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  font-family: inherit;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.play .k { font-weight: 700; font-size: 0.95rem; }
.play .r { font-size: 0.7rem; color: #9a9aa3; font-variant-numeric: tabular-nums; }
.play.B { border-color: #3d6b52; }
.play.C { border-color: #6b5c33; }
.play.active { background: #33333d; }
.play.B.active { background: #2c4a39; }
.play.C.active { background: #4a4028; }
.stop {
  width: 52px; min-height: 56px; border-radius: 9px;
  border: 1px solid #3a3a44; background: #1c1c21; color: #8f8f9a;
  font-size: 0.9rem; cursor: pointer;
}

.ftr { margin-top: 24px; font-size: 0.74rem; color: #7c7c88; line-height: 1.6; }
.ftr p { margin: 0 0 8px; }
</style>
