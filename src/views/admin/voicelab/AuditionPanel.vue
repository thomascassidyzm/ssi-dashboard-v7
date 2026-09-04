<script setup>
/**
 * AUDITION — "what does this voice sound like speaking that language?"
 *
 * Tom asked for five sentences of his own clone speaking Italian on 2026-09-04,
 * to show Aran, and it was answered by a one-off script. His reply: stop
 * building one-offs — that question is permanent, he asks it every time he
 * casts, and it belongs here, on the screen where the casting happens.
 *
 * So: a voice, a language, one button, audio you can play on a phone. There is
 * deliberately nothing else. Every knob this screen could grow already exists
 * one tab away in Play, better, and a second half-version of it would only make
 * the fast question slower to ask.
 *
 * ── THREE THINGS THAT ARE NOT OBVIOUS FROM THE PIXELS ───────────────────────
 * ONE PARAGRAPH PER LANGUAGE, fixed. Two voices heard on two different
 * sentences are not being compared — one of them got the easy line. The text is
 * a constant of the language (services/voicelab/audition-paragraphs.cjs) so the
 * only thing that varies between two auditions is the voice.
 *
 * EVERY AUDITION IS CACHED on voice + language + paragraph version, so the
 * second person to ask the same question pays nothing and the button says so
 * before it is pressed. The screen asks the free lookup on every change; the
 * paying call happens only when you press.
 *
 * THE VOICE LIST IS NOT FILTERED BY LANGUAGE, and that is the feature. Every
 * other menu in this lab shows the voices FOR a language, because casting needs
 * that. This is the question you ask before casting — his English clone in
 * Italian is the exact thing he wanted to hear — so the menu is every voice,
 * and each row carries the language it is actually listed under instead.
 *
 * NOTHING HERE CASTS ANYTHING. No course write, no manifest, no presentation
 * row. Casting stays a deliberate action on the Languages tab.
 */
import { ref, computed, watch } from 'vue'
import SearchSelect from './SearchSelect.vue'
import { api, clipUrl } from './labApi'
import { dirFor } from '@/utils/textDirection.js'

const loading = ref(true)
const loadError = ref('')
const voices = ref([])
const languages = ref([])
const spend = ref(null)

const voiceKey = ref('')       // "provider:id" — a bare id is not unique across providers
const language = ref('ita')    // the question that started this feature

const voice = computed(() => voices.value.find((v) => `${v.provider}:${v.id}` === voiceKey.value) || null)
const languageRow = computed(() => languages.value.find((l) => l.code === language.value) || null)

async function boot () {
  loading.value = true
  loadError.value = ''
  try {
    const data = await api.auditionOptions()
    voices.value = data.voices || []
    languages.value = data.languages || []
    spend.value = data.spend || null
    // Land on this estate's own clones — the group the question is nearly always
    // about — rather than on whatever the vendor happened to list first.
    if (!voiceKey.value) {
      const first = voices.value[0]
      if (first) voiceKey.value = `${first.provider}:${first.id}`
    }
  } catch (e) {
    loadError.value = e.message
  } finally {
    loading.value = false
  }
}
boot()

// ── The two menus ───────────────────────────────────────────────────────────
//
// `haystack` is what SearchSelect filters on, and it deliberately carries more
// than the label: gender, provider, accent, whether it is one of ours, and the
// languages the voice is listed under. "female welsh cartesia" has to narrow.

const voiceOptions = computed(() => voices.value.map((v) => {
  const chips = []
  if (v.clone || v.owner) chips.push({ text: 'our clone', kind: 'clone' })
  chips.push({ text: v.provider })
  if (v.gender) chips.push({ text: v.gender === 'f' ? 'female' : 'male' })
  chips.push(v.accent ? { text: v.accent, kind: 'accent' } : { text: 'accent not listed', kind: 'missing' })
  chips.push({ text: `listed in ${v.nativeLanguages.join(', ')}` })
  return {
    value: `${v.provider}:${v.id}`,
    label: v.name,
    group: v.group,
    chips,
    haystack: [v.name, v.id, v.provider, v.gender === 'f' ? 'female' : v.gender === 'm' ? 'male' : '', v.accent || '', v.clone || v.owner ? 'clone ours estate' : '', v.nativeLanguages.join(' '), v.description || ''].join(' '),
  }
}))

const languageOptions = computed(() => languages.value.map((l) => {
  const chips = []
  if (l.dialectOf) chips.push({ text: `a ${l.dialectOf} dialect, its own text`, kind: 'accent' })
  chips.push(l.available ? { text: `${l.chars} characters` } : { text: 'no paragraph yet', kind: 'missing' })
  return {
    value: l.code,
    label: l.name,
    group: l.dialectOf ? 'Dialects — each with its own paragraph' : 'Languages',
    chips,
    haystack: [l.name, l.code, l.dialectOf || '', l.available ? '' : 'missing unavailable gap'].join(' '),
  }
}))

// ── Is it already paid for? Asked on every change; spends nothing ───────────
const lookup = ref(null)
const lookupError = ref('')
const checking = ref(false)

async function refreshLookup () {
  lookup.value = null
  lookupError.value = ''
  runError.value = ''
  // Clear the player FIRST. A clip left under a new selection is the worst
  // failure this screen can have: you would be judging the last voice while
  // reading the name of the next one.
  result.value = null
  audioSrc.value = ''
  if (!voice.value || !language.value) return
  // A language with no paragraph has nothing to look up, and the panel above
  // already says so in full. Asking anyway only puts a second, shorter version
  // of the same sentence in red next to the button.
  if (languageRow.value && !languageRow.value.available) return
  checking.value = true
  try {
    lookup.value = await api.auditionLookup({
      voiceId: voice.value.id,
      provider: voice.value.provider,
      language: language.value,
    })
    // A cached audition is free and instant, so it is played into the element
    // immediately rather than made to wait behind a button that costs nothing.
    if (lookup.value.audition) await present(lookup.value.audition)
  } catch (e) {
    lookupError.value = e.message
  } finally { checking.value = false }
}
watch([voice, language], refreshLookup, { immediate: false })
watch(voices, () => { if (voice.value) refreshLookup() })

// ── The render ──────────────────────────────────────────────────────────────
const running = ref(false)
const runError = ref('')
const result = ref(null)
const audioSrc = ref('')

/** Turn an audition record into something the <audio> element can play. */
async function present (a) {
  result.value = a
  audioSrc.value = await clipUrl(a.url)
}

const armed = computed(() =>
  !running.value && Boolean(voice.value) && Boolean(languageRow.value?.available) && !lookupError.value)

async function hear () {
  running.value = true
  runError.value = ''
  try {
    const { audition } = await api.auditionRender({
      voiceId: voice.value.id,
      provider: voice.value.provider,
      voiceName: voice.value.name,
      language: language.value,
    })
    await present(audition)
    await refreshSpend()
  } catch (e) {
    runError.value = e.message
  } finally { running.value = false }
}

async function refreshSpend () {
  try {
    const data = await api.auditionOptions()
    spend.value = data.spend || null
  } catch { /* the number is a nicety; a failed refresh must not eat the audio */ }
}

const seconds = computed(() => (result.value?.durationMs ? (result.value.durationMs / 1000).toFixed(1) : null))
</script>

<template>
  <div class="aud">
    <p class="vl-note">
      Pick a voice, pick a language, press the button, listen. One fixed paragraph per language,
      so two voices are always compared on the same words — and every audition is kept, so asking
      the same question twice is free. <strong>Nothing here casts anything</strong> and nothing is
      written into a course; it renders a demo clip into the lab's own store and plays it back.
    </p>

    <p v-if="loadError" class="aud-err">{{ loadError }}</p>
    <p v-else-if="loading" class="vl-note">Loading the voices…</p>

    <template v-else>
      <div class="aud-row">
        <label class="aud-field">
          <span class="aud-label">Voice</span>
          <SearchSelect
            v-model="voiceKey"
            :options="voiceOptions"
            noun="voices"
            placeholder="Search by name, gender, accent, provider…"
            search-note="Every voice the lab can render, not just the ones listed for the chosen language — that is the point of an audition."
          />
        </label>

        <label class="aud-field">
          <span class="aud-label">Language</span>
          <SearchSelect
            v-model="language"
            :options="languageOptions"
            noun="languages"
            placeholder="Search languages and dialects…"
            search-note="A dialect is its own entry with its own paragraph — Mexican Spanish is never folded into Spanish."
          />
        </label>
      </div>

      <!-- What it is about to say. Shown, not hidden: you cannot judge an accent
           without knowing the words, and a wrong paragraph should be visible. -->
      <div v-if="languageRow" class="aud-block">
        <div class="aud-label-row">
          <span class="aud-label">What it will say</span>
          <span v-if="languageRow.dialectOf" class="aud-sub">
            {{ languageRow.name }} text, steered to the provider as
            <code>{{ languageRow.steerAs || languageRow.steer }}</code> — the vendors take no
            dialect code, so the dialect is in the words, which is what a learner of that course
            would hear anyway.
          </span>
          <span v-else-if="languageRow.available" class="aud-sub">
            steered as <code>{{ languageRow.steerAs || languageRow.steer }}</code> ·
            {{ languageRow.chars }} characters · paragraph v{{ languageRow.version }}
          </span>
        </div>
        <p v-if="languageRow.available" class="aud-para bidi-isolate" :dir="dirFor(languageRow.text)">
          {{ languageRow.text }}
        </p>
        <p v-else class="aud-gap">
          <strong>Not yet available.</strong> {{ languageRow.gap }}
        </p>
      </div>

      <div class="aud-go">
        <button class="aud-hear" :disabled="!armed" @click="hear">
          {{ running ? 'Rendering…' : lookup?.cached ? 'Render again' : 'Hear it' }}
        </button>
        <span class="aud-cost">
          <template v-if="languageRow && !languageRow.available">
            Nothing to render until that paragraph is written.
          </template>
          <template v-else-if="checking">checking whether we already have it…</template>
          <span v-else-if="lookupError" class="aud-err">{{ lookupError }}</span>
          <template v-else-if="lookup?.cached">
            Already rendered — playing the kept clip, and it costs nothing.
          </template>
          <template v-else-if="lookup">
            Not rendered yet — this one costs {{ lookup.chars }} characters of TTS.
          </template>
        </span>
      </div>
      <p v-if="runError" class="aud-err">{{ runError }}</p>

      <!-- A real audio element, on purpose: Tom judges this on a phone, where a
           scrub bar and a system volume control beat a bespoke play button. -->
      <div v-if="result" class="aud-result">
        <audio :src="audioSrc" controls preload="auto" class="aud-audio"></audio>
        <p class="aud-meta">
          {{ result.voiceName || result.voiceId }} · {{ result.languageName }}
          <template v-if="seconds"> · {{ seconds }}s</template>
          <template v-if="result.cached"> · served from the cache, nothing spent</template>
          <template v-else> · rendered just now</template>
        </p>
      </div>

      <p v-if="spend" class="aud-spend">
        {{ spend.charsToday.toLocaleString() }} of {{ spend.ceiling.toLocaleString() }} characters
        spent in the lab today. The ceiling refuses rather than quietly costing money, and cached
        auditions still play once it is reached.
      </p>
    </template>
  </div>
</template>

<style scoped>
@import './lab.css';

.aud { max-width: 860px; }
.aud-row { display: flex; gap: 1.25rem; flex-wrap: wrap; align-items: flex-end; }
.aud-field { display: flex; flex-direction: column; gap: 0.3rem; flex: 1; min-width: 280px; }
.aud-label { font-size: 0.95rem; letter-spacing: 0.02em; }
.aud-label-row { display: flex; align-items: baseline; gap: 0.9rem; flex-wrap: wrap; margin-bottom: 0.4rem; }
.aud-sub { color: var(--muted); font-size: 0.72rem; line-height: 1.5; max-width: 62ch; }
.aud-block { margin-top: 1.75rem; }
.aud-para {
  background: var(--surface-2); border: 1px solid var(--surface-3); border-radius: 8px;
  padding: 0.85rem 0.95rem; margin: 0; font-size: 1.02rem; line-height: 1.6; text-align: left;
}
.aud-gap {
  border: 1px solid #f59e0b; background: rgba(245, 158, 11, 0.08); border-radius: 8px;
  padding: 0.8rem 0.9rem; margin: 0; font-size: 0.85rem; line-height: 1.55;
}
.aud-go { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; margin-top: 1.75rem; }
.aud-hear {
  background: #ec4899; border: none; color: #fff; font-size: 1.15rem; font-family: inherit;
  padding: 0.85rem 2.5rem; border-radius: 10px; cursor: pointer;
}
.aud-hear:disabled { background: var(--surface-3); color: var(--muted); cursor: not-allowed; }
.aud-cost { color: var(--muted); font-size: 0.8rem; max-width: 46ch; line-height: 1.5; }
.aud-result { margin-top: 1.5rem; }
.aud-audio { width: 100%; max-width: 520px; }
.aud-meta { color: var(--muted); font-size: 0.78rem; margin: 0.5rem 0 0; }
.aud-spend { color: var(--muted); font-size: 0.72rem; margin-top: 2rem; line-height: 1.5; max-width: 70ch; }
.aud-err { color: #f87171; font-size: 0.85rem; line-height: 1.5; max-width: 70ch; }
</style>
