<script setup>
/**
 * VOICE LAB — /admin/labs/voice
 *
 * The fifth lab, beside Listening, Speaking, Pods and VAD, and built to the
 * same three-layer shape Tom asked for on 2026-08-06: "an actual LAB with
 * parameters, running tests, and process and all sorts."
 *
 *   1 PARAMETERS   provider, voice (Tom's clone included), language, the
 *                  encoding the provider actually accepts, and the six gate
 *                  thresholds — editable per run
 *   2 TESTS        single clip · blind A/B · a capped batch of real course
 *                  sentences, with the cost shown before the button arms
 *   3 EXPERIMENTS  every run saved with its config, sentences, clips and
 *                  verdicts — listable, re-openable, re-runnable, comparable
 *                  side by side, and exportable once approved
 *
 * Plus ESTATE, which is the bench that already existed: audition, compare,
 * declare and drift, all read from the ~2.5 million takes already in the store
 * and all costing nothing. Kept, because "what does this estate already sound
 * like" is a different question from "what would this config sound like", and
 * answering the first for free is what stops the second being asked carelessly.
 *
 * ── WHERE THE RENDERING HAPPENS, AND WHY IT IS NOT HERE ─────────────────────
 * Layers 1-3 need TTS, then the pipeline's own masterAudio, then two whisper
 * passes. None of that fits a Vercel function, so it lives in production-api at
 * /api/voicelab on a real box, and this screen talks to whatever backend the
 * Environment Switcher has selected. A backend without the lab is not a routing
 * bug — the banner says which backend answered and offers the one that has it.
 *
 * NOTHING ON THIS SCREEN WRITES TO course_audio, and export is an export: the
 * lab hands you the config JSON, a human applies it. Same rule as Pod Lab, and
 * the same reason — an algorithm_config write reaches every learner in ~5 min.
 *
 * ── PLAY MODE IS THE FRONT DOOR (Tom's ruling, 2026-08-07) ──────────────────
 * "Looks fantastic but a few levels too deep in granularity… I'm going to want
 * to actually USE it without spending a week working out what these things
 * mean." So the four numbered layers above now sit behind ENGINEERING, whole
 * and unchanged, and the screen opens on PLAY: a voice, a language, a sentence,
 * three sliders that each move something you can hear, one button, and a
 * one-line verdict. Nothing was removed to make that happen — the depth stopped
 * being the entrance, which is a different thing from stopping existing.
 */
import { ref, computed } from 'vue'
import BlastRadiusBanner from '@/components/admin/BlastRadiusBanner.vue'
import { probe, labBase, useCloudBackend } from './voicelab/labApi'
import LanguagesPanel from './voicelab/LanguagesPanel.vue'
import PlayPanel from './voicelab/PlayPanel.vue'
import ParametersPanel from './voicelab/ParametersPanel.vue'
import RunPanel from './voicelab/RunPanel.vue'
import ExperimentsPanel from './voicelab/ExperimentsPanel.vue'
import EstatePanels from './voicelab/EstatePanels.vue'

const TABS = [
  { id: 'parameters', n: 1, label: 'Parameters' },
  { id: 'tests', n: 2, label: 'Tests' },
  { id: 'experiments', n: 3, label: 'Experiments' },
  { id: 'estate', n: 4, label: 'Estate' },
]

/**
 * 'languages' | 'play' | 'engineering'.
 *
 * LANGUAGES is the landing layer as of 2026-08-28. Tom asked for the lab to be
 * "a single place to check configured voices per language", and the first thing
 * that should meet you is therefore the state of the estate's casting, not a
 * render form. Play remains exactly as it was — the 2026-08-07 ruling that put
 * Play in front of Engineering is untouched; Languages goes in front of both,
 * and nothing was removed to make room for it.
 */
const mode = ref('languages')

const tab = ref('parameters')
const params = ref(null)
const loading = ref(true)
const backendError = ref('')
const backendBase = ref(labBase())

const configA = ref(null)
const configB = ref(null)
const refreshToken = ref(0)

function clone (o) { return JSON.parse(JSON.stringify(o)) }

async function boot () {
  loading.value = true
  backendError.value = ''
  const result = await probe()
  backendBase.value = result.base
  if (!result.ok) {
    backendError.value = result.error
    params.value = null
    loading.value = false
    return
  }
  params.value = result.params
  const d = result.params.defaults?.config || {}
  configA.value = clone(d)
  // B starts as a copy of A on purpose: an A/B where the two sides differ in
  // several ways at once measures nothing. Change one thing.
  configB.value = clone(d)
  loading.value = false
}
boot()

function switchToCloud () {
  useCloudBackend()
  boot()
}

const spend = computed(() => params.value?.spend || null)

/** The meter's fill. Capped at 100 so an over-ceiling day still draws a bar. */
const spendPct = computed(() => {
  const sp = spend.value
  if (!sp?.ceiling) return 0
  return Math.min(100, Math.round((sp.charsToday / sp.ceiling) * 100))
})

/** Config B only matters for an A/B; showing it always is noise. */
const showB = ref(false)
</script>

<template>
  <div class="lab">
    <header class="lab-header">
      <nav class="admin-crumbs">
        <router-link to="/admin/labs" class="crumb-link">Labs</router-link>
        <span class="crumb-sep">/</span>
        <span class="crumb-here">Voice Lab</span>
      </nav>
      <div class="title-row">
        <h1 class="page-title">Voice Lab</h1>
        <div class="mode-switch">
          <button :class="{ on: mode === 'languages' }" @click="mode = 'languages'">Languages</button>
          <button :class="{ on: mode === 'play' }" @click="mode = 'play'">Play</button>
          <button :class="{ on: mode === 'engineering' }" @click="mode = 'engineering'">Engineering</button>
        </div>

        <!-- The spend, as a meter rather than a sentence: the bar is the fact
             that there is a ceiling, and the numbers are where you stand. -->
        <span v-if="spend" class="spend">
          <span class="spend-bar"><i :style="{ width: spendPct + '%' }"></i></span>
          {{ spend.charsToday.toLocaleString() }} / {{ spend.ceiling.toLocaleString() }} chars today
          · ${{ (spend.usdToday || 0).toFixed(4) }}
        </span>
        <span class="hdr-chip">writes no course audio</span>
      </div>
    </header>

    <!-- BLAST RADIUS (2026-09-01). The chip above says "writes no course audio",
         which is true and is the reassuring half of the story. The other half:
         Declare, in ESTATE, POSTs /api/voices/declare, which LOCKS a course side
         to a voice as versioned algorithm_config. Tom: "Voice Lab is irrelevant
         to the learner - it's about voices chosen that impact the next time
         audio is generated." Nothing is wrong the day you declare. Everything in
         that language is, the day it renders. The lab carried this only in a
         source comment until now. -->
    <BlastRadiusBanner
      tier="deferred"
      note="Declaring a voice here locks a course side to it; the next render is when a learner hears the consequence."
    />

    <!-- The backend banner. A missing lab is a deployment fact, said plainly. -->
    <div v-if="backendError" class="backend-warn">
      <strong>No Voice Lab on <code>{{ backendBase || 'unset' }}</code></strong>
      <span class="muted">{{ backendError }}</span>
      <div class="backend-actions">
        <button class="btn-primary" @click="switchToCloud">Use SSi Machine (Cloud)</button>
        <button class="btn-secondary" @click="boot">Try again</button>
      </div>
    </div>

    <div v-else-if="loading" class="muted">Loading the lab…</div>

    <!-- PLAY — the front door. -->
    <!-- Languages does not need /params, so it renders even on a backend whose
         render path is unavailable: knowing what is cast is useful regardless. -->
    <section v-if="mode === 'languages'">
      <!-- `params` may be null on a backend without the lab; the panel is built
           for that and still shows what is cast. It needs only the consent
           wording from it — see LanguagesPanel's prop comment. -->
      <LanguagesPanel :params="params" />
    </section>

    <section v-if="params && mode === 'play'">
      <PlayPanel :params="params" />
    </section>

    <template v-if="params && mode === 'engineering'">
      <nav class="tabs">
        <button v-for="t in TABS" :key="t.id" :class="{ on: tab === t.id }" @click="tab = t.id">
          <span class="tab-n">{{ t.n }}</span> {{ t.label }}
        </button>
        <span class="backend-chip" :title="backendBase">backend: {{ backendBase || 'same origin' }}</span>
      </nav>

      <section v-show="tab === 'parameters'">
        <label class="ab-toggle">
          <input type="checkbox" v-model="showB" />
          Config B
        </label>
        <div :class="showB ? 'two-up' : ''">
          <ParametersPanel v-model="configA" :params="params" label="A" />
          <ParametersPanel v-if="showB" v-model="configB" :params="params" label="B" />
        </div>
      </section>

      <section v-show="tab === 'tests'">
        <RunPanel
          :params="params"
          :config-a="configA"
          :config-b="configB"
          @ran="refreshToken++"
        />
      </section>

      <section v-show="tab === 'experiments'">
        <ExperimentsPanel :refresh-token="refreshToken" />
      </section>
    </template>

    <section v-show="(mode === 'engineering' && tab === 'estate') || (!params && !loading)">
      <EstatePanels />
    </section>
  </div>
</template>

<style scoped>
/* The blast-radius banner sits between the header and the lab body. */
.lab > :deep(.blast-banner) { margin-bottom: 1rem; }

@import './voicelab/lab.css';

.lab { padding: 1.5rem 2rem 4rem; max-width: 1400px; margin: 0 auto; }
.admin-crumbs { display: flex; gap: 0.5rem; font-size: 0.8125rem; margin-bottom: 0.5rem; }
.crumb-link { color: var(--accent-2); text-decoration: none; }
.crumb-sep, .crumb-here { color: var(--muted); }
.page-title { font-size: 1.75rem; margin: 0 0 0.25rem; letter-spacing: 0.04em; }
.title-row { display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 0.25rem; }
.mode-switch { display: flex; border: 1px solid var(--surface-3); border-radius: 999px; overflow: hidden; }
.mode-switch button {
  background: none; border: none; color: var(--muted); font-family: inherit;
  font-size: 0.8125rem; padding: 0.4rem 1.1rem; cursor: pointer;
}
.mode-switch button.on { background: #ec4899; color: #fff; }
.spend { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--muted); font-size: 0.75rem; }
.spend-bar { width: 5rem; height: 4px; border-radius: 999px; background: var(--surface-3); overflow: hidden; }
.spend-bar i { display: block; height: 100%; background: #ec4899; }
.hdr-chip {
  font-size: 0.68rem; color: var(--muted); border: 1px solid var(--surface-3);
  border-radius: 999px; padding: 0.1rem 0.55rem; white-space: nowrap;
}
.tabs {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  border-bottom: 1px solid var(--surface-3);
  margin-bottom: 1rem;
}
.tabs button {
  background: none;
  border: none;
  padding: 0.6rem 1rem;
  color: var(--muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  font-size: 0.8125rem;
  font-family: inherit;
}
.tabs button.on { color: inherit; border-bottom-color: #ec4899; }
.tab-n { opacity: 0.5; margin-right: 0.35rem; }
.backend-chip { margin-left: auto; font-size: 0.7rem; color: var(--muted); font-family: ui-monospace, monospace; }
.backend-warn {
  border: 1px solid #f59e0b;
  background: rgba(245, 158, 11, 0.08);
  border-radius: 10px;
  padding: 0.9rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.8125rem;
  margin-bottom: 1.25rem;
}
.backend-actions { display: flex; gap: 0.5rem; margin-top: 0.35rem; }
.btn-primary { background: #ec4899; border: none; color: #fff; padding: 0.45rem 1rem; border-radius: 6px; cursor: pointer; }
.btn-secondary { background: var(--surface-2); border: 1px solid var(--surface-3); color: inherit; padding: 0.45rem 1rem; border-radius: 6px; cursor: pointer; }
.muted { color: var(--muted); }
.small { font-size: 0.72rem; }
.ab-toggle { display: inline-flex; gap: 0.4rem; align-items: center; font-size: 0.8125rem; margin-bottom: 0.6rem; color: var(--muted); }
.two-up { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 1rem; }
@media (max-width: 1100px) { .two-up { grid-template-columns: minmax(0, 1fr); } }
</style>
