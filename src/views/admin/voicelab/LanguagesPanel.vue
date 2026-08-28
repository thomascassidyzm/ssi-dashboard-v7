<script setup>
/**
 * LANGUAGES — the Voice Lab's per-language view.
 *
 * Tom, 2026-08-28: "a single place to check configured voices per language …
 * each language needs 2 voices, 1 male and 1 female as standard, with backups
 * in case for whatever reason there's a problem … human voices will also be
 * configured here as well".
 *
 * ONE ROW PER LANGUAGE, WORST FIRST. The screen's whole value is that a gap is
 * obvious without being worked out, so the sort puts uncast languages at the
 * top and complete ones at the bottom, and an empty slot is drawn as an empty
 * slot rather than omitted.
 *
 * THE STATUSES ARE NOT INTERCHANGEABLE, and the colours say so:
 *   complete  every slot cast
 *   partial   some cast, some not
 *   uncast    a provider could speak it; nobody is cast — the real blocker
 *   nocover   Cartesia does not publish this language; the ladder uses Azure
 *   human     human-recorded only. NOT a gap: a human recording wins wherever
 *             it exists, so Welsh reads as human, never as a missing voice.
 *
 * Casting writes voice_language_roles and NOTHING else — no render is
 * triggered, no course_audio row is touched, no course voice_config is written.
 */
import { ref, computed, onMounted } from 'vue'
import { api } from './labApi'

const data = ref(null)
const loading = ref(true)
const error = ref('')
const filter = ref('all')
const q = ref('')
const busy = ref('')
const expanded = ref(null)

async function load () {
  loading.value = true
  error.value = ''
  try {
    data.value = await api.languages()
  } catch (e) {
    error.value = e.message
  }
  loading.value = false
}
onMounted(load)

const rows = computed(() => {
  const all = data.value?.languages || []
  const needle = q.value.trim().toLowerCase()
  return all
    .filter((l) => filter.value === 'all' || l.status === filter.value)
    .filter((l) => !needle || l.code.toLowerCase().includes(needle))
})

const summary = computed(() => data.value?.summary || null)

function slotsOf (lang) {
  // Male then female, each in rank order — one stable reading order, so the eye
  // can scan down a column rather than re-learning the layout per row.
  return [
    ...lang.slots.m.map((s) => ({ ...s, gender: 'm' })),
    ...lang.slots.f.map((s) => ({ ...s, gender: 'f' })),
  ]
}

async function cast (lang, slot, voiceId) {
  if (!voiceId) return
  busy.value = `${lang.code}:${slot.gender}:${slot.rank}`
  try {
    await api.castSlot(lang.code, { gender: slot.gender, rank: slot.rank, voiceId })
    await load()
  } catch (e) { error.value = e.message }
  busy.value = ''
}

async function clear (lang, slot) {
  busy.value = `${lang.code}:${slot.gender}:${slot.rank}`
  try {
    await api.clearSlot(lang.code, { gender: slot.gender, rank: slot.rank })
    await load()
  } catch (e) { error.value = e.message }
  busy.value = ''
}

/** Candidates that make sense for a slot: right gender, or gender unknown. */
function candidatesFor (lang, slot) {
  return (lang.candidates || []).filter((c) => !c.gender || c.gender === slot.gender)
}
</script>

<template>
  <div class="vl-langs">
    <p class="vl-muted vl-intro">
      One row per language the estate actually teaches, read live from
      <code>courses</code>, <code>voices</code> and the same provider policy the render path uses.
      Each language wants a primary and a backup for both genders.
      <strong>Casting here writes nothing but the casting</strong> — no audio is rendered and no
      course is changed.
    </p>

    <div v-if="summary" class="vl-summary">
      <span class="vl-chip ok">{{ summary.complete }} complete</span>
      <span class="vl-chip">{{ summary.partial }} partial</span>
      <span class="vl-chip fail">{{ summary.uncast }} uncast</span>
      <span class="vl-chip warn">{{ summary.nocover }} no Cartesia</span>
      <span class="vl-chip">{{ summary.human }} human-voiced</span>
      <span class="vl-muted">
        {{ summary.languages }} languages · complete means {{ summary.requiredPerLanguage }} voices
      </span>
    </div>

    <div class="vl-controls">
      <input v-model="q" class="vl-input" placeholder="filter by language code…" />
      <select v-model="filter" class="vl-input">
        <option value="all">every status</option>
        <option value="uncast">uncast — nobody assigned</option>
        <option value="partial">partial</option>
        <option value="complete">complete</option>
        <option value="nocover">no Cartesia coverage</option>
        <option value="human">human-voiced</option>
      </select>
      <button class="vl-btn" :disabled="loading" @click="load">Refresh</button>
    </div>

    <p v-if="error" class="vl-error">{{ error }}</p>
    <p v-if="loading" class="vl-muted">Reading the estate…</p>

    <table v-else class="vl-table">
      <thead>
        <tr>
          <th>Language</th>
          <th>Courses</th>
          <th>Default provider</th>
          <th>Voices cast</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <template v-for="lang in rows" :key="lang.code">
          <tr :class="['vl-row', lang.status]">
            <td><strong>{{ lang.code }}</strong></td>
            <td class="vl-muted">{{ lang.courses }}<span v-if="lang.released"> · {{ lang.released }} live</span></td>
            <td class="vl-muted">{{ lang.defaultProvider || '—' }}</td>
            <td>
              <span :class="['vl-count', lang.filled >= lang.required ? 'ok' : lang.filled ? 'warn' : 'fail']">
                {{ lang.filled }} / {{ lang.required }}
              </span>
            </td>
            <td><span :class="['vl-status', lang.status]">{{ lang.status }}</span></td>
            <td>
              <button class="vl-btn small" @click="expanded = expanded === lang.code ? null : lang.code">
                {{ expanded === lang.code ? 'Hide' : 'Voices' }}
              </button>
            </td>
          </tr>

          <tr v-if="expanded === lang.code" :key="lang.code + ':slots'" class="vl-detail">
            <td colspan="6">
              <p v-if="lang.human" class="vl-note">
                <strong>{{ lang.code }} is human-recorded only.</strong> A human recording wins
                wherever it exists, so empty slots here are a recording worklist for its
                recordists, not a casting gap. No TTS provider may ever be selected for it.
              </p>
              <p v-else-if="!lang.cartesiaCovers" class="vl-note">
                Cartesia does not publish <strong>{{ lang.code }}</strong>, so a new render falls to
                Azure. That is covered, just not by the default provider.
              </p>

              <div class="vl-slots">
                <div v-for="slot in slotsOf(lang)" :key="slot.gender + slot.rank" class="vl-slot">
                  <div class="vl-slot-label">
                    {{ slot.gender === 'm' ? 'male' : 'female' }} · {{ slot.rankName }}
                  </div>

                  <div v-if="slot.filled" class="vl-slot-filled">
                    <span class="vl-voice">{{ slot.voiceName }}</span>
                    <span class="vl-kind">{{ slot.kind }}</span>
                    <span v-if="slot.active === false" class="vl-status uncast">voice inactive</span>
                    <button
                      class="vl-btn small"
                      :disabled="busy === `${lang.code}:${slot.gender}:${slot.rank}`"
                      @click="clear(lang, slot)"
                    >Clear</button>
                  </div>

                  <div v-else class="vl-slot-empty">
                    <select
                      class="vl-input"
                      :disabled="busy === `${lang.code}:${slot.gender}:${slot.rank}`"
                      @change="cast(lang, slot, $event.target.value)"
                    >
                      <option value="">— empty — choose a voice</option>
                      <option v-for="c in candidatesFor(lang, slot)" :key="c.voiceId" :value="c.voiceId">
                        {{ c.name }} ({{ c.kind }})
                      </option>
                    </select>
                    <span v-if="!candidatesFor(lang, slot).length" class="vl-muted">
                      no voice in the estate declares this language
                    </span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <div v-if="data?.notes" class="vl-notes">
      <p v-for="(text, key) in data.notes" :key="key" class="vl-muted">{{ text }}</p>
    </div>
  </div>
</template>

<style scoped>
.vl-intro { max-width: 60rem; }
.vl-summary { display: flex; gap: .5rem; align-items: center; flex-wrap: wrap; margin: .75rem 0; }
.vl-controls { display: flex; gap: .5rem; margin: .75rem 0; flex-wrap: wrap; }
.vl-table { width: 100%; border-collapse: collapse; }
.vl-table th { text-align: left; font-weight: 600; padding: .4rem .5rem; border-bottom: 1px solid #3333; }
.vl-table td { padding: .4rem .5rem; border-bottom: 1px solid #2222; vertical-align: middle; }
.vl-count.ok { color: #2e7d32; font-weight: 600; }
.vl-count.warn { color: #b26a00; font-weight: 600; }
.vl-count.fail { color: #c62828; font-weight: 600; }
.vl-status { font-size: .8rem; padding: .1rem .45rem; border-radius: .6rem; border: 1px solid #8884; }
.vl-status.complete { background: #2e7d3222; color: #2e7d32; }
.vl-status.partial, .vl-status.nocover { background: #b26a0022; color: #b26a00; }
.vl-status.uncast { background: #c6282822; color: #c62828; }
.vl-status.human { background: #1565c022; color: #1565c0; }
.vl-detail td { background: #8881; }
.vl-note { margin: .25rem 0 .75rem; }
.vl-slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: .6rem; }
.vl-slot { border: 1px solid #8883; border-radius: .4rem; padding: .5rem; }
.vl-slot-label { font-size: .75rem; text-transform: uppercase; letter-spacing: .04em; opacity: .7; margin-bottom: .3rem; }
.vl-slot-filled { display: flex; gap: .4rem; align-items: center; flex-wrap: wrap; }
.vl-voice { font-weight: 600; }
.vl-kind { font-size: .75rem; opacity: .7; }
.vl-error { color: #c62828; }
.vl-notes { margin-top: 1.25rem; display: grid; gap: .35rem; }
.vl-btn.small { font-size: .75rem; padding: .15rem .5rem; }
</style>
