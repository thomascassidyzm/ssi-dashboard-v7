<script setup>
/**
 * PARAMETERS — layer 1 of the lab.
 *
 * Everything a run is allowed to vary, in one place: provider, voice (Tom's
 * clone included), language, the encoding the provider actually accepts, and
 * the six gate thresholds.
 *
 * TWO RULES THIS PANEL EXISTS TO KEEP.
 *
 * 1 · A CONTROL THAT DOES NOTHING IS WORSE THAN NO CONTROL. A provider may
 *   not honour a knob at all — Cartesia pins the container to mp3, Azure pins
 *   the whole output format — so a field the selected provider ignores is
 *   disabled and SAYS WHY rather than silently ignoring what you typed. The backend reports per-provider support
 *   in /api/voicelab/params; this panel renders that report, it does not carry
 *   its own opinion about what a provider can do.
 *
 * 2 · THE THRESHOLDS ARE RENDERED FROM THE BACKEND'S OWN DEFAULTS, key by key.
 *   Nothing here hardcodes a number. If the backend marks a threshold
 *   readOnly, it renders disabled with the backend's reason attached — that is
 *   the honest shape for a gate whose number cannot yet be threaded.
 */
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Object, required: true },
  params: { type: Object, required: true },
  label: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

function set (key, value) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
function setThreshold (gate, key, value) {
  const thresholds = props.modelValue.thresholds || {}
  emit('update:modelValue', {
    ...props.modelValue,
    thresholds: { ...thresholds, [gate]: { ...(thresholds[gate] || {}), [key]: value } },
  })
}

const provider = computed(() =>
  (props.params.providers || []).find((p) => p.id === props.modelValue.provider) || { supports: {} })

const supports = computed(() => provider.value.supports || {})

const language = computed(() =>
  (props.params.languages || []).find((l) => l.code === props.modelValue.language) || null)

/** Only voices this provider can actually render, grouped as the backend grouped them. */
const voiceGroups = computed(() => {
  const voices = (language.value?.voices || []).filter((v) => v.provider === props.modelValue.provider)
  const groups = new Map()
  for (const v of voices) {
    const g = v.group || 'Voices'
    if (!groups.has(g)) groups.set(g, [])
    groups.get(g).push(v)
  }
  return [...groups.entries()].map(([name, list]) => ({ name, list }))
})

function pickVoice (id) {
  const v = (language.value?.voices || []).find((x) => x.id === id)
  emit('update:modelValue', { ...props.modelValue, voiceId: id, voiceName: v?.name || id })
}

function onProvider (id) {
  // Switching provider strands the voice — pick that provider's first voice for
  // this language rather than leaving a voice the provider cannot render.
  const first = (language.value?.voices || []).find((v) => v.provider === id)
  emit('update:modelValue', {
    ...props.modelValue,
    provider: id,
    voiceId: first?.id || '',
    voiceName: first?.name || '',
  })
}

function onLanguage (code) {
  const lang = (props.params.languages || []).find((l) => l.code === code)
  const first = (lang?.voices || []).find((v) => v.provider === props.modelValue.provider)
  emit('update:modelValue', {
    ...props.modelValue,
    language: code,
    voiceId: first?.id || props.modelValue.voiceId,
    voiceName: first?.name || props.modelValue.voiceName,
  })
}

// ── The gate thresholds, rendered from whatever the backend declares ──────────
const GATE_TITLES = {
  speechSpan: 'speech-span · where the speech actually is',
  loudness: 'loudness · integrated LUFS in band, true peak under the ceiling',
  tailShape: 'tail-shape · did the voice stop, or was it cut',
  syllableRate: 'syllable-rate · could this voice say those syllables in that time',
  phonology: 'phonology · is it the right language',
  words: 'words · are the right words in there',
}
/**
 * The backend declares, per threshold, what it means and whether moving it
 * actually reaches a gate (`thresholdSpec[]`, keyed "group.field"). This panel
 * carries no opinion of its own about either — a number the gate ignores must
 * render disabled, and only the gate stack knows which those are.
 */
const specByKey = computed(() => {
  const out = {}
  for (const s of props.params.thresholdSpec || []) out[s.key] = s
  return out
})

const thresholdGates = computed(() => {
  const t = props.modelValue.thresholds || {}
  return Object.entries(t).map(([group, fields]) => ({
    group,
    title: GATE_TITLES[group] || group,
    fields: Object.entries(fields || {}).map(([key, value]) => {
      const spec = specByKey.value[`${group}.${key}`] || {}
      return {
        key,
        value,
        isList: Array.isArray(value),
        unit: spec.unit || '',
        // Absent from the spec means the gate stack does not read it — the same
        // honesty as an explicit readOnly, arrived at by omission.
        readOnly: spec.readOnly === true || !specByKey.value[`${group}.${key}`],
        why: spec.what || '',
      }
    }),
  }))
})

function prettyKey (k) {
  return k.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}
</script>

<template>
  <div class="vl-panel">
    <h3>Parameters <span v-if="label" class="vl-chip on">{{ label }}</span></h3>
    <p class="vl-note">
      Everything a run may vary. What a provider does not accept is disabled and says so —
      a slider that changes nothing is worse than no slider.
    </p>

    <h4>Render</h4>
    <div class="vl-fields">
      <label class="vl-field">Provider
        <select :value="modelValue.provider" @change="onProvider($event.target.value)">
          <option v-for="p in params.providers" :key="p.id" :value="p.id">{{ p.name || p.id }}</option>
        </select>
        <span v-if="provider.note" class="vl-why">{{ provider.note }}</span>
      </label>

      <label class="vl-field">Language
        <select :value="modelValue.language" @change="onLanguage($event.target.value)">
          <option v-for="l in params.languages" :key="l.code" :value="l.code">
            {{ l.name }} ({{ l.code }})
          </option>
        </select>
        <span class="vl-why">Steered as <code>{{ language?.steer || '—' }}</code>.</span>
      </label>

      <label class="vl-field">Voice
        <select :value="modelValue.voiceId" @change="pickVoice($event.target.value)">
          <optgroup v-for="g in voiceGroups" :key="g.name" :label="g.name">
            <option v-for="v in g.list" :key="v.id" :value="v.id">
              {{ v.name || v.id }}{{ v.clips ? ` · ${v.clips.toLocaleString()} clips` : '' }}
            </option>
          </optgroup>
        </select>
        <span v-if="!voiceGroups.length" class="vl-why vl-warn">
          No {{ modelValue.provider }} voice listed for this language.
        </span>
      </label>

      <label class="vl-field">Speed
        <input
          type="number" step="0.05" min="0.5" max="2"
          :disabled="!supports.speed"
          :value="modelValue.speed"
          @input="set('speed', Number($event.target.value))"
        />
        <span v-if="!supports.speed" class="vl-why vl-warn">
          {{ provider.speedNote || `${provider.name || modelValue.provider} exposes no speed parameter — this would be ignored.` }}
        </span>
      </label>

      <label class="vl-field">Style
        <input
          type="text" placeholder="e.g. calm"
          :disabled="!supports.style"
          :value="modelValue.style || ''"
          @input="set('style', $event.target.value || null)"
        />
        <span v-if="!supports.style" class="vl-why vl-warn">No style parameter on this provider.</span>
      </label>

      <label class="vl-field">Style degree
        <input
          type="number" step="0.1" min="0.01" max="2"
          :disabled="!supports.style"
          :value="modelValue.styleDegree ?? ''"
          @input="set('styleDegree', $event.target.value === '' ? null : Number($event.target.value))"
        />
      </label>

      <label class="vl-field">Pitch
        <input
          type="text" placeholder="e.g. -5%"
          :disabled="!supports.pitch"
          :value="modelValue.pitch || ''"
          @input="set('pitch', $event.target.value || null)"
        />
      </label>

      <label class="vl-field">Sample rate
        <input
          type="number" step="1000"
          :disabled="!supports.sampleRate"
          :value="modelValue.sampleRate"
          @input="set('sampleRate', Number($event.target.value))"
        />
      </label>

      <label class="vl-field">Bit rate
        <input
          type="number" step="8000"
          :disabled="!supports.bitRate"
          :value="modelValue.bitRate"
          @input="set('bitRate', Number($event.target.value))"
        />
      </label>
    </div>

    <h4>Gate thresholds</h4>
    <p class="vl-note">
      The six gates that decide whether a clip would be admitted to the store, judged on the
      MASTERED bytes — the same bytes a learner would get. Every number below is the backend's
      own default until you change it; nothing here is hardcoded in the browser.
    </p>

    <div v-for="g in thresholdGates" :key="g.group" class="vl-threshold-gate">
      <div class="vl-gate-title">{{ g.title }}</div>
      <div class="vl-fields">
        <label v-for="f in g.fields" :key="f.key" class="vl-field">
          {{ prettyKey(f.key) }}<span v-if="f.unit" class="vl-unit"> · {{ f.unit }}</span>
          <input
            v-if="f.isList"
            type="text"
            :disabled="f.readOnly"
            :value="(f.value || []).join(', ')"
            @input="setThreshold(g.group, f.key, $event.target.value.split(',').map(s => s.trim()).filter(Boolean))"
          />
          <input
            v-else-if="typeof f.value === 'number'"
            type="number" step="any"
            :disabled="f.readOnly"
            :value="f.value"
            @input="setThreshold(g.group, f.key, Number($event.target.value))"
          />
          <input
            v-else
            type="text"
            :disabled="f.readOnly"
            :value="f.value ?? ''"
            @input="setThreshold(g.group, f.key, $event.target.value)"
          />
          <span v-if="f.readOnly" class="vl-why vl-warn">read-only — the gate stack does not read this, so moving it would change nothing</span>
          <span v-else-if="f.why" class="vl-why">{{ f.why }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import './lab.css';
.vl-threshold-gate { margin: 0.75rem 0 1rem; }
.vl-unit { opacity: 0.6; }
.vl-gate-title {
  font-size: 0.75rem;
  color: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  margin-bottom: 0.35rem;
}
</style>
