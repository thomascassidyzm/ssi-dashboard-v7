<template>
  <div class="min-h-screen bg-canvas text-ink p-8">
    <div class="max-w-6xl mx-auto">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-3 mb-6 text-sm">
        <router-link to="/" class="link-emerald">Home</router-link>
        <span class="text-faint">/</span>
        <router-link :to="`/production/${courseCode}`" class="link-emerald">{{ getCourseName(courseCode) }}</router-link>
        <span class="text-faint">/</span>
        <router-link :to="`/production/${courseCode}/pods`" class="link-emerald">Pods</router-link>
        <span class="text-faint">/</span>
        <span class="text-muted">{{ slug }}</span>
      </div>

      <div v-if="loading" class="text-faint text-center py-12">Loading pod…</div>

      <div v-else-if="error" class="err-box rounded-lg p-4">
        {{ error }}
      </div>

      <div v-else-if="pod">
        <!-- Pod header -->
        <div class="mb-8">
          <div class="flex items-center gap-3 mb-2">
            <h1 class="text-3xl font-bold text-emerald">{{ pod.title }}</h1>
            <span :class="podTypeClass(pod.pod_type)" class="text-xs px-2 py-0.5 rounded-full">{{ pod.pod_type }}</span>
            <span :class="isHeld ? 'vis-held' : 'vis-live'" class="vis-badge">{{ isHeld ? 'HELD' : 'LIVE' }}</span>
          </div>
          <div class="text-muted text-sm">
            <code class="text-emerald">{{ pod.id }}</code>
            · {{ sentences.length }} sentences
            <span v-if="pod.source_file"> · from <code>{{ pod.source_file }}</code></span>
          </div>
        </div>

        <!-- HOLD / RELEASE (Tom, 2026-08-23: keep a pod back "until … after all
             until they exist!!!"). Held = RLS hides this pod and every line in
             it from the learner app. Popty reads with the service role, so this
             page keeps working on a held pod — that is the point. Releasing is a
             human act and asks first; holding is one tap. -->
        <div class="mb-6 rounded-lg p-4 text-sm" :class="isHeld ? 'vis-panel-held' : 'bg-surface border border-line'">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="min-w-0">
              <div class="font-semibold" :class="isHeld ? '' : 'text-ink'">
                {{ isHeld ? 'Held back — no learner can reach this pod' : 'Live — learners can reach this pod now' }}
              </div>
              <div class="text-xs mt-1" :class="isHeld ? '' : 'text-muted'">
                <template v-if="isHeld">
                  The pod and every line in it are invisible in the app. Release it when it is
                  finished and you have listened to it — nothing releases itself.
                </template>
                <template v-else>
                  Hold it back to take it off learners while it is being recorded or fixed. Nothing
                  is deleted and no progress moves.
                </template>
              </div>
              <div v-if="visTrail" class="text-xs mt-1 opacity-80">{{ visTrail }}</div>
              <div v-if="visError" class="text-xs mt-1 text-danger">{{ visError }}</div>
            </div>
            <button
              :disabled="visBusy"
              @click="setVisibility(isHeld ? 'live' : 'held')"
              class="px-4 py-2 text-sm rounded border font-medium whitespace-nowrap disabled:opacity-50"
              :class="isHeld ? 'vis-btn-release' : 'vis-btn-hold'"
            >
              {{ visBusy ? 'Saving…' : (isHeld ? 'Release to learners' : 'Hold back from learners') }}
            </button>
          </div>
        </div>

        <!-- Drafts awaiting proofread — machine-written target text nobody has
             read yet (listening_pod_sentences.target_text_draft). Editing a line
             below IS the proofread: PATCH clears the marker in the same write,
             so this panel empties itself as the proofreader works. -->
        <div v-if="draftCount > 0" class="mb-6 draft-panel rounded-lg p-4 text-sm">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="min-w-0">
              <div class="draft-panel-title font-semibold">
                {{ draftCount }} {{ targetName }} line{{ draftCount === 1 ? '' : 's' }} awaiting proofread
              </div>
              <div class="text-xs text-muted mt-1">
                These are machine-written drafts, marked <strong>DRAFT</strong> below and in the
                recording room. Nobody should record one as it stands. Edit a line — or save it
                unchanged if it is already right — and the DRAFT marker comes off that line.
              </div>
            </div>
            <button
              @click="draftsOnly = !draftsOnly"
              class="px-3 py-1.5 text-xs rounded whitespace-nowrap draft-filter-btn"
              :class="draftsOnly ? 'draft-filter-on' : ''"
            >{{ draftsOnly ? 'Showing drafts only — show all lines' : 'Show only the drafts' }}</button>
          </div>
        </div>
        <div v-else-if="draftsLoaded" class="mb-6 bg-surface border border-line rounded-lg px-4 py-2 text-xs text-muted">
          <!-- "No drafts left" is all this can honestly claim. The marker column dates from
               2026-08-06 and defaults to false, so an unmarked line is one nobody recorded a
               verdict on — it is not evidence that a human read it. -->
          No lines are marked as awaiting proofread. Lines are only marked from 6 August 2026
          onward, so anything older is unmarked whether or not a human has read it.
        </div>

        <!-- Metadata (hosts / design notes) -->
        <div v-if="hasMetadata" class="mb-6 bg-surface border border-line rounded-lg p-4 text-sm card-sep">
          <details>
            <summary class="cursor-pointer text-ink font-semibold">Pod metadata</summary>
            <div class="mt-3 space-y-2 text-muted">
              <div v-if="pod.metadata?.hosts?.length">
                <span class="text-ink">Hosts:</span>
                <ul class="ml-4 mt-1">
                  <li v-for="h in pod.metadata.hosts" :key="h.name">
                    <span class="text-emerald">{{ h.name }}</span>
                    <span v-if="h.description"> — {{ h.description }}</span>
                  </li>
                </ul>
              </div>
              <div v-if="pod.metadata?.register">
                <span class="text-ink">Register:</span> {{ pod.metadata.register }}
              </div>
              <div v-if="pod.metadata?.status">
                <span class="text-ink">Status:</span> {{ pod.metadata.status }}
              </div>
            </div>
          </details>
        </div>

        <!-- Who records this pod.
             Two facts that used to be confused here (Tom 2026-08-06): the
             number of CHARACTERS in the script is a writing fact, and a scene
             can have as many as it likes; the number of human VOICES recording
             them is a casting fact, and that is two. This panel used to render
             all 22 characters against raw generation voice ids, open by
             default — which read as a 22-strong cast and is exactly the
             "massive overkill" the ruling removes. The recording cast leads;
             the character list is one click away. -->
        <div class="mb-6 bg-surface border border-line rounded-lg p-4 text-sm card-sep">
          <div class="text-ink font-semibold mb-2">Who records this</div>
          <div v-if="castVoices.length" class="grid gap-2 sm:grid-cols-2">
            <div v-for="v in castVoices" :key="v.voiceId" class="px-3 py-2 bg-surface-2 border border-line rounded">
              <div class="text-ink font-medium">
                {{ v.name }}
                <span v-if="v.gender" class="text-[10px] text-muted border border-line rounded-full px-1.5 py-0.5 ml-1 align-middle">
                  {{ v.gender === 'f' ? 'female voice' : 'male voice' }}
                </span>
              </div>
              <div class="text-xs text-muted mt-0.5">
                Plays {{ v.characters.length }} character{{ v.characters.length === 1 ? '' : 's' }} in this pod
              </div>
            </div>
          </div>
          <div v-else class="text-xs text-faint">
            No cast yet — set the two voices on the course's pods page, and the record links go live.
          </div>

          <details class="mt-3">
            <summary class="cursor-pointer text-xs text-faint hover:text-ink">
              {{ characterNames.length }} characters in this script
            </summary>
            <div class="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
              <div v-for="spk in characterNames" :key="spk" class="flex justify-between gap-2 px-2 py-1 bg-surface-2 border border-line rounded">
                <span class="text-ink truncate">{{ spk }}</span>
                <span class="text-muted text-xs flex-shrink-0">{{ castNameFor(spk) || '—' }}</span>
              </div>
            </div>
          </details>
        </div>

        <!-- Explainer generation panel
             Stage-1 sequence is target → known → explainer → target → target.
             Generate the per-sentence narration text via Haiku (Max Plan),
             store on the row. Audio rendering is a separate pass once the
             text looks good. -->
        <div class="mb-6 bg-surface border border-line rounded-lg p-4 text-sm card-sep">
          <div class="flex items-center justify-between gap-3">
            <div class="flex flex-col gap-1 min-w-0">
              <div class="text-ink font-semibold">Stage-1 explainer text</div>
              <div class="text-faint text-xs">
                {{ explainerCovered }}/{{ sentences.length }} sentences have explainer text
                <span v-if="explainerAudioCovered > 0">
                  · {{ explainerAudioCovered }} with audio
                </span>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                @click="generateExplainers(false)"
                :disabled="explainerBusy || allExplained"
                class="px-3 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 text-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate explainer text for sentences that don't have one yet"
              >{{ explainerBusy ? 'Generating…' : 'Generate' }}</button>
              <button
                @click="generateExplainers(true)"
                :disabled="explainerBusy || sentences.length === 0"
                class="px-3 py-1.5 text-xs rounded bg-amber-700 hover:bg-amber-600 text-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Re-run for ALL sentences in this pod, overwriting existing explainer text (use after a prompt change)"
              >Regenerate all</button>
              <button
                @click="generateExplainerAudio"
                :disabled="explainerAudioBusy || explainerAudioMissing === 0"
                class="px-3 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 text-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Render explainer narration (Tom's voice) for sentences that have explainer text but no audio yet. Never deletes or overwrites existing explainer audio."
              >{{ explainerAudioBusy ? 'Generating explainer audio…' : `Generate explainer audio (${explainerAudioMissing})` }}</button>
            </div>
          </div>
          <div v-if="explainerStatus" class="mt-3 text-xs text-muted">{{ explainerStatus }}</div>
          <div v-if="explainerError" class="mt-3 text-xs err-inline rounded px-2 py-1">{{ explainerError }}</div>
          <div v-if="explainerAudioStatus" class="mt-3 text-xs text-muted">{{ explainerAudioStatus }}</div>
          <div v-if="explainerAudioError" class="mt-3 text-xs err-inline rounded px-2 py-1">{{ explainerAudioError }}</div>
        </div>

        <!-- Pod audio coverage + inline regeneration
             Fills only MISSING (e.g. freshly-edited) target/known clips via
             Phase 8. Optimistic: no confirm, runs in the background and reloads
             the pod when done so the new audio is playable right here. This is
             NOT the destructive text "Regenerate" — it never deletes audio. -->
        <div class="mb-6 bg-surface border border-line rounded-lg p-4 text-sm card-sep">
          <div class="flex items-center justify-between gap-3">
            <div class="flex flex-col gap-1 min-w-0">
              <div class="text-ink font-semibold">Pod audio</div>
              <div class="text-faint text-xs">
                {{ audioVoiced }}/{{ audioTotal }} clips voiced
                <span v-if="audioMissing > 0"> · {{ audioMissing }} missing</span>
                <span v-else class="text-emerald"> · fully voiced</span>
              </div>
            </div>
            <button
              @click="regenerateAudio"
              :disabled="audioBusy || audioMissing === 0"
              class="px-3 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 text-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Generate audio for sentences missing it (e.g. after editing text). Never deletes existing audio."
            >{{ audioBusy ? 'Regenerating…' : `Regenerate audio (${audioMissing})` }}</button>
          </div>
          <div v-if="audioStatus" class="mt-3 text-xs text-muted">{{ audioStatus }}</div>
          <div v-if="audioError" class="mt-3 text-xs err-inline rounded px-2 py-1">{{ audioError }}</div>
        </div>

        <!-- LISTEN. Hearing a pod's recordings used to mean opening the
             recording room and ticking "Re-read lines I've already recorded" —
             a box that reads like "I am about to overwrite my work" (Aran, via
             Tom, 2026-08-23). The per-line play buttons below always worked;
             what was missing was a way in that says so, whose voice you are
             hearing, and being able to let a run of lines play on a phone.
             Playback only — nothing on this page writes. -->
        <div class="mb-6 bg-surface border border-line rounded-lg p-4 text-sm card-sep">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div class="flex flex-col gap-1 min-w-0">
              <div class="text-ink font-semibold">Listen to this pod</div>
              <div class="text-faint text-xs">
                <template v-if="humanClipCount">
                  {{ humanClipCount }} human take{{ humanClipCount === 1 ? '' : 's' }}<span v-if="humanVoiceNames.length"> by {{ humanVoiceNames.join(' and ') }}</span> ·
                </template>
                {{ playableTargets.length }} of {{ sentences.length }} {{ targetName }} lines have audio.
                Tap ▶ on a line to hear it, or ▶▶ to play on down the list.
              </div>
            </div>
            <div class="flex gap-2">
              <button
                @click="playAllTargets"
                :disabled="!playableTargets.length"
                class="px-3 py-1.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 text-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                :title="`Play every ${targetName} line that has audio, in order`"
              >▶ Play all {{ targetName }} lines ({{ playableTargets.length }})</button>
              <button
                v-if="isPlaying"
                @click="stopPlayback"
                class="px-3 py-1.5 text-xs rounded border border-line text-ink hover:border-emerald-600"
              >Stop</button>
            </div>
          </div>
        </div>

        <!-- Scenes and sentences -->
        <div v-for="scene in groupedScenes" :key="scene.number" class="mb-8">
          <h2 class="text-sm uppercase tracking-wide text-faint mb-2 flex items-center gap-3">
            <span class="bg-surface border border-line px-2 py-0.5 rounded text-muted">{{ scene.number }}</span>
            <span>{{ scene.title || `Scene ${scene.number}` }}</span>
            <span class="text-faint text-xs">({{ scene.sentences.length }} sentences)</span>
          </h2>

          <!-- Sentences -->
          <div class="space-y-1">
            <template v-for="sent in scene.sentences" :key="sent.id">
              <!-- Beat label separator -->
              <div v-if="sent._showBeat" class="text-xs text-faint italic py-2 pl-4 border-l-2 border-line">
                {{ sent.beat_label }}
              </div>
              <!-- Sentence row -->
              <div
                class="bg-surface border rounded px-3 py-2 grid grid-cols-[32px_110px_1fr_auto] gap-3 items-start text-sm row-sep"
                :class="[isDraft(sent) ? 'draft-row' : 'border-line', isRowPlaying(sent) ? 'row-playing' : '']"
              >
                <div class="text-faint font-mono text-xs tabular-nums pt-0.5">{{ sent.global_order }}</div>
                <div class="text-muted text-xs truncate pt-0.5" :title="sent.speaker">{{ sent.speaker }}</div>
                <div class="min-w-0">
                  <!-- Display mode -->
                  <template v-if="editingId !== sent.id">
                    <!-- Unproofread machine draft: say so before the words, so
                         nobody reads them believing they are final. -->
                    <div v-if="isDraft(sent)" class="draft-badge">DRAFT — AWAITING PROOFREAD</div>
                    <!-- Target text carries its OWN direction. Arabic under an
                         LTR paragraph pushes trailing neutrals (! . , quotes)
                         to the visual right; `dir` on the painting element is
                         the fix. `text-left` pins the alignment back, because
                         dir="rtl" would otherwise right-align this line while
                         the known line below it stayed left — a layout change
                         nobody asked for. -->
                    <div class="text-ink truncate text-left bidi-isolate" :dir="dirFor(sent.target_text)" :title="sent.target_text">{{ sent.target_text }}</div>
                    <div class="text-faint text-xs truncate" :title="sent.known_text">{{ sent.known_text }}</div>
                    <!-- Stage-1 explainer (inline, only when populated) -->
                    <div
                      v-if="sent.explainer_text"
                      class="explainer-note text-xs mt-1 italic leading-snug"
                      :title="sent.explainer_text"
                    >
                      <!-- Mixed-language narration sharing a line with the ⓘ
                           glyph: isolate just the text run so the icon keeps
                           its place whichever way the narration reads. -->
                      <span class="explainer-icon not-italic mr-1">ⓘ</span><span class="bidi-isolate" :dir="dirFor(sent.explainer_text)">{{ sent.explainer_text }}</span>
                    </div>
                  </template>
                  <!-- Edit mode -->
                  <div v-else class="space-y-1.5">
                    <textarea v-model="editBuf.target" rows="1" :dir="dirFor(editBuf.target)"
                      class="w-full bg-canvas border border-emerald-700 rounded px-2 py-1 text-ink text-sm resize-y outline-none" placeholder="target" />
                    <textarea v-model="editBuf.known" rows="1"
                      class="w-full bg-canvas border border-line rounded px-2 py-1 text-muted text-xs resize-y outline-none" placeholder="known / translation" />
                    <div class="flex items-center gap-2">
                      <button :disabled="savingEdit" @click="saveSentence(sent)" class="text-xs px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white">{{ savingEdit ? 'Saving…' : 'Save' }}</button>
                      <button :disabled="savingEdit" @click="cancelEdit" class="text-xs px-2.5 py-1 rounded border border-line text-ink">Cancel</button>
                      <span class="text-[11px] text-faint">
                        editing clears this line's audio<template v-if="isDraft(sent)">
                          · saving takes the DRAFT marker off, even if you change nothing</template>
                      </span>
                      <span v-if="editError" class="text-[11px] text-danger">{{ editError }}</span>
                    </div>
                  </div>
                </div>
                <div class="flex gap-1 items-center pt-0.5">
                  <!-- Human-recording status (pods coverage) — additive, hides when coverage unavailable -->
                  <span
                    v-if="recChip(sent)"
                    :class="['px-1.5 py-0.5 text-[10px] rounded whitespace-nowrap', recChip(sent).cls]"
                    :title="recChip(sent).title"
                  >{{ recChip(sent).text }}</span>
                  <button
                    v-if="sent.target_audio_id"
                    @click="playAudio(sent.target_audio_id)"
                    :class="['px-2 py-1 text-xs rounded transition-colors', playingId === sent.target_audio_id ? 'bg-emerald-700 text-emerald-100' : 'bg-surface-2 hover:bg-emerald-700 text-ink hover:text-emerald-100']"
                    :title="clipTitle(sent, 'target')"
                  >▶{{ targetFlag }}</button>
                  <span v-else class="px-2 py-1 text-xs text-faint" title="No target audio">{{ targetFlag }}</span>
                  <!-- Play on down the list from this line. The whole point of
                       listening on a phone is not tapping 231 times. -->
                  <button
                    v-if="sent.target_audio_id"
                    @click="playFrom(sent)"
                    class="px-2 py-1 text-xs rounded transition-colors bg-surface-2 hover:bg-emerald-700 text-ink hover:text-emerald-100"
                    :title="`Play from here to the end of the pod (${targetName} lines)`"
                  >▶▶</button>
                  <button
                    v-if="sent.known_audio_id"
                    @click="playAudio(sent.known_audio_id)"
                    :class="['px-2 py-1 text-xs rounded transition-colors', playingId === sent.known_audio_id ? 'bg-emerald-700 text-emerald-100' : 'bg-surface-2 hover:bg-emerald-700 text-ink hover:text-emerald-100']"
                    :title="clipTitle(sent, 'known')"
                  >▶{{ knownFlag }}</button>
                  <span v-else class="px-2 py-1 text-xs text-faint" title="No known audio">{{ knownFlag }}</span>
                  <button
                    v-if="sent.explainer_audio_id"
                    @click="playAudio(sent.explainer_audio_id)"
                    :class="['px-2 py-1 text-xs rounded transition-colors', playingId === sent.explainer_audio_id ? 'bg-amber-700 text-amber-100' : 'bg-surface-2 hover:bg-amber-700 text-ink hover:text-amber-100']"
                    title="Play Stage-1 explainer (mixed-language narration)"
                  >ⓘ</button>
                  <span
                    v-else-if="sent.explainer_text"
                    class="px-2 py-1 text-xs explainer-icon-dim"
                    title="Explainer text generated; audio not yet rendered"
                  >ⓘ</span>
                  <button
                    v-if="sent.target_audio_id && sent.known_audio_id"
                    @click="playPair(sent.target_audio_id, sent.known_audio_id)"
                    :class="['px-2 py-1 text-xs rounded transition-colors bg-surface-2 hover:bg-emerald-700 text-ink hover:text-emerald-100']"
                    title="Play target then known"
                  >⇉</button>
                  <button
                    v-if="editingId !== sent.id"
                    @click="startEdit(sent)"
                    class="px-2 py-1 text-xs rounded bg-surface-2 hover:bg-sky-700 text-ink hover:text-sky-100"
                    title="Edit target / known text"
                  >✎</button>
                </div>
              </div>
            </template>
          </div>
        </div>

        <!-- Hidden audio element -->
        <audio ref="audioEl" @ended="onAudioEnded"></audio>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'
import { getLanguageName, useCourses } from '@/composables/useCourses.js'
import { dirFor } from '@/utils/textDirection.js'

const route = useRoute()
const courseCode = route.params.courseCode
const slug = route.params.slug
const { getCourseName } = useCourses()

// Flag + name for each SSi language code. England/Wales/Scotland use regional
// tag sequences — NOT 🇬🇧 — so an English course shows St George's cross.
const LANG_FLAGS = {
  eng: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', cym: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', gae: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  spa: '🇪🇸', fra: '🇫🇷', deu: '🇩🇪', ita: '🇮🇹',
  por: '🇵🇹', por_br: '🇧🇷',
  zho: '🇨🇳', jpn: '🇯🇵', kor: '🇰🇷',
  ara: '🇸🇦', ara_sy: '🇸🇾',
  gle: '🇮🇪', nld: '🇳🇱', hrv: '🇭🇷',
}
const [targetLang, knownLang] = String(courseCode).split('_for_')
// Dialect codes fall back to their base language for the flag: cym_n flies the
// same Welsh flag as cym. Names come from the shared course table, which knows
// the dialects by name ("Welsh (North)") — a private copy here once left the
// drafts panel counting "109 cym_n lines".
const flagFor = (code) => LANG_FLAGS[code] || LANG_FLAGS[String(code || '').split('_')[0]] || '🌐'
const targetFlag = flagFor(targetLang)
const knownFlag = flagFor(knownLang)
const targetName = computed(() => getLanguageName(targetLang, 'target'))
const knownName = computed(() => getLanguageName(knownLang, 'known'))

const pod = ref(null)
const sentences = ref([])
const loading = ref(true)
const error = ref(null)
const audioEl = ref(null)
const playingId = ref(null)
const playQueue = ref([])

// Stage-1 explainer state (text generation, audio is a separate pass)
const explainerBusy = ref(false)
const explainerStatus = ref('')
const explainerError = ref('')

// Stage-1 explainer AUDIO state (renders narration for explainer text). N is
// the sentences that have explainer text but no explainer audio yet — exactly
// the rows the endpoint will render.
const explainerAudioBusy = ref(false)
const explainerAudioStatus = ref('')
const explainerAudioError = ref('')

const explainerCovered = computed(() =>
  sentences.value.filter(s => s.explainer_text && s.explainer_text.trim()).length
)
const explainerAudioCovered = computed(() =>
  sentences.value.filter(s => s.explainer_audio_id).length
)
const explainerAudioMissing = computed(() =>
  Math.max(0, explainerCovered.value - explainerAudioCovered.value)
)
const allExplained = computed(() =>
  sentences.value.length > 0 && explainerCovered.value === sentences.value.length
)

// Pod audio regeneration state. N (missing clips) is derived from the same
// rows the page already loads — every sentence needs a target + a known clip,
// so total = 2 × sentences and missing = the ones with a null audio id.
const audioBusy = ref(false)
const audioStatus = ref('')
const audioError = ref('')

const audioTotal = computed(() => sentences.value.length * 2)
const audioVoiced = computed(() =>
  sentences.value.reduce((n, s) => n + (s.target_audio_id ? 1 : 0) + (s.known_audio_id ? 1 : 0), 0)
)
const audioMissing = computed(() => audioTotal.value - audioVoiced.value)

const hasMetadata = computed(() =>
  pod.value?.metadata && (pod.value.metadata.hosts?.length || pod.value.metadata.register || pod.value.metadata.status)
)

// --- Drafts awaiting proofread ---
// listening_pod_sentences.target_text_draft, read from the course-gated pods
// door (GET .../pods/drafts). The open /api/pods detail endpoint doesn't carry
// the column, and the marker is only ever cleared through the gated PATCH, so
// this is the same door both ways.
const draftIds = ref(new Set())
const draftsLoaded = ref(false)
const draftsOnly = ref(route.query.drafts === '1')

const isDraft = (sent) => draftIds.value.has(sent.id)
const draftCount = computed(() => sentences.value.filter(s => draftIds.value.has(s.id)).length)

async function loadDrafts() {
  try {
    const res = await authedFetch(`/api/production/${courseCode}/pods/drafts`)
    if (!res.ok) return   // non-fatal: the page still shows every line
    const body = await res.json()
    draftIds.value = new Set((body.items || []).filter(i => i.podId === pod.value?.id).map(i => i.id))
    draftsLoaded.value = true
  } catch { /* non-fatal */ }
}

// Group sentences by scene + annotate beat-label separators
const groupedScenes = computed(() => {
  const byScene = new Map()
  const rows = draftsOnly.value ? sentences.value.filter(s => draftIds.value.has(s.id)) : sentences.value
  for (const s of rows) {
    if (!byScene.has(s.scene_number)) {
      byScene.set(s.scene_number, {
        number: s.scene_number,
        title: getSceneTitle(s.scene_number),
        sentences: [],
      })
    }
    byScene.get(s.scene_number).sentences.push(s)
  }
  // Annotate beat changes
  for (const scene of byScene.values()) {
    let prevBeat = null
    for (const s of scene.sentences) {
      s._showBeat = s.beat_label && s.beat_label !== prevBeat
      prevBeat = s.beat_label
    }
  }
  return [...byScene.values()].sort((a, b) => a.number - b.number)
})

function getSceneTitle(sceneNum) {
  const sections = pod.value?.metadata?.sections
  if (Array.isArray(sections)) {
    const s = sections.find(x => x.number === sceneNum)
    if (s) return s.title
  }
  return null
}

function podTypeClass(type) {
  if (type === 'core') return 'pill-emerald'
  return 'pill-purple'
}

async function getSignedUrl(audioId) {
  const res = await fetch(`${getApiUrl()}/api/production/${courseCode}/audio/${audioId}/url`, {
    headers: { 'ngrok-skip-browser-warning': 'true' },
  })
  if (!res.ok) throw new Error(`signed url failed (${res.status})`)
  const data = await res.json()
  return data.url
}

async function playAudio(audioId) {
  try {
    playingId.value = audioId
    const url = await getSignedUrl(audioId)
    if (!audioEl.value) return
    audioEl.value.src = url
    await audioEl.value.play()
  } catch (err) {
    console.error('[Pod] play error:', err)
    playingId.value = null
  }
}

function playPair(targetId, knownId) {
  playQueue.value = [targetId, knownId]
  playNext()
}

// --- Play-through -----------------------------------------------------------
// Same queue playPair already used, over a run of lines instead of a pair.
// Display order, not row order: what you hear must match what you are reading,
// including when the DRAFT filter is on.
const orderedSentences = computed(() => groupedScenes.value.flatMap(s => s.sentences))
const playableTargets = computed(() =>
  orderedSentences.value.map(s => s.target_audio_id).filter(Boolean)
)
const isPlaying = computed(() => playingId.value !== null)
const isRowPlaying = (sent) => !!playingId.value && [
  sent.target_audio_id, sent.known_audio_id, sent.explainer_audio_id,
].includes(playingId.value)

function startQueue(ids) {
  if (!ids.length) return
  playQueue.value = ids.slice()
  playNext()
}

function playAllTargets() { startQueue(playableTargets.value) }

function playFrom(sent) {
  const list = orderedSentences.value
  const i = list.findIndex(s => s.id === sent.id)
  startQueue(list.slice(i < 0 ? 0 : i).map(s => s.target_audio_id).filter(Boolean))
}

function stopPlayback() {
  playQueue.value = []
  if (audioEl.value) { audioEl.value.pause(); audioEl.value.src = '' }
  playingId.value = null
}

function playNext() {
  if (playQueue.value.length === 0) {
    playingId.value = null
    return
  }
  const next = playQueue.value.shift()
  playAudio(next)
}

function onAudioEnded() {
  if (playQueue.value.length > 0) playNext()
  else playingId.value = null
}

async function loadPod() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${getApiUrl()}/api/pods/${courseCode}/${slug}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
    if (!res.ok) throw new Error(`Failed to load pod (${res.status})`)
    const data = await res.json()
    pod.value = data.pod
    sentences.value = data.sentences || []
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

// --- Hold / release: learner reachability (Tom, 2026-08-23) ---------------
// `listening_pods.visibility`, gated in RLS. Fail closed to match
// src/lib/servingPod.js: anything that is not explicitly 'live' reads as held.
const visBusy = ref(false)
const visError = ref('')
const isHeld = computed(() => pod.value?.visibility !== 'live')

// The trail the endpoint writes into metadata — who did it and when. Shown so
// "why is this held?" has an answer on the page rather than in a log.
const visTrail = computed(() => {
  const m = pod.value?.metadata
  if (!m) return ''
  const parts = []
  if (m.held_at) parts.push(`Held ${shortDate(m.held_at)}${m.held_by ? ` by ${m.held_by}` : ''}`)
  if (m.released_at) parts.push(`Released ${shortDate(m.released_at)}${m.released_by ? ` by ${m.released_by}` : ''}`)
  return parts.join(' · ')
})

function shortDate(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10)
}

async function setVisibility(next) {
  if (!pod.value || visBusy.value) return
  // Releasing puts content in front of learners and cannot be un-seen, so it
  // asks. Holding does not: erring towards invisible is always the safe way.
  if (next === 'live') {
    const msg = `Release ${pod.value.title || slug} to learners on ${courseCode}?\n\n`
      + 'From the moment you confirm, every learner on this course can hear this pod. '
      + 'Only release it if it is finished and you have listened to it.'
    if (!window.confirm(msg)) return
  }
  visBusy.value = true
  visError.value = ''
  try {
    const res = await authedFetch(`/api/admin/pods/${courseCode}/${slug}/visibility`, {
      method: 'POST',
      // `confirm` is the endpoint's deliberate-act token — it must name the pod.
      body: JSON.stringify({ visibility: next, ...(next === 'live' ? { confirm: pod.value.id } : {}) }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
    await loadPod()
  } catch (err) {
    visError.value = err?.message || String(err)
  } finally {
    visBusy.value = false
  }
}

// --- The recording cast (who actually reads these lines) ---
// courses.voice_config.podCast maps CHARACTER → human voice. Two voices is the
// default (Tom 2026-08-06), so this resolves 22 characters down to the two
// people who record them. Generation-side colouring in pod.speakers is a
// generation-time default and never drives the human recording path — the
// recording plan reads podCast alone (pods-plan.cjs#buildRecordingPlan).
const podCast = ref({})

async function loadCast() {
  try {
    const res = await authedFetch(`/api/production/${courseCode}/pods/cast`)
    if (!res.ok) return // read-only nicety; the page works without it
    const body = await res.json()
    podCast.value = body.podCast || {}
  } catch { /* cast is decoration here — never block the pod view on it */ }
}

/** Canonical character names in this pod's script (never '_default'). */
const characterNames = computed(() =>
  Object.keys(pod.value?.speakers || {}).filter(k => k !== '_default'))

/** The human voices recording this pod, each with the characters it plays. */
const castVoices = computed(() => {
  const byVoice = new Map()
  for (const spk of characterNames.value) {
    const entry = podCast.value[spk]
    if (!entry?.voiceId) continue
    if (!byVoice.has(entry.voiceId)) {
      byVoice.set(entry.voiceId, {
        voiceId: entry.voiceId,
        name: entry.name || entry.voiceId,
        gender: entry.gender === 'f' || entry.gender === 'm' ? entry.gender : null,
        characters: [],
      })
    }
    byVoice.get(entry.voiceId).characters.push(spk)
  }
  return [...byVoice.values()].sort((a, b) => b.characters.length - a.characters.length)
})

function castNameFor(speaker) {
  return podCast.value[speaker]?.name || null
}

// Admin-gated helper for the explainer endpoint. Mirrors the pattern in
// RemoteControl / Maintenance — fetch a fresh access token, attach Bearer.
const { getAccessToken } = useAuth()
async function authedFetch(path, init = {}) {
  const token = await getAccessToken()
  const headers = {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${getApiUrl()}${path}`, { ...init, headers })
}

// --- Inline sentence editing ---
const editingId = ref(null)
const editBuf = ref({ target: '', known: '' })
const savingEdit = ref(false)
const editError = ref('')

function startEdit(sent) {
  editingId.value = sent.id
  editBuf.value = { target: sent.target_text || '', known: sent.known_text || '' }
  editError.value = ''
}
function cancelEdit() { editingId.value = null; editError.value = '' }

async function saveSentence(sent) {
  savingEdit.value = true
  editError.value = ''
  try {
    // Course-scoped edit door: editors who hold the course can fix the script
    // (community leaders, not just admins — /api/admin/pod-sentences stays
    // for back-compat).
    const res = await authedFetch(`/api/production/${courseCode}/pods/sentence/${encodeURIComponent(sent.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ target_text: editBuf.value.target, known_text: editBuf.value.known }),
    })
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
    // Editing nulls the audio (text no longer matches the recording) — reflect locally.
    sent.target_text = body.sentence.target_text
    sent.known_text = body.sentence.known_text
    sent.target_audio_id = null
    sent.known_audio_id = null
    // The save WAS the proofread — the server cleared target_text_draft in the
    // same update, so drop the badge here rather than making them reload.
    if (body.sentence.target_text_draft === false && draftIds.value.has(sent.id)) {
      const next = new Set(draftIds.value)
      next.delete(sent.id)
      draftIds.value = next
    }
    editingId.value = null
  } catch (err) {
    editError.value = err?.message || String(err)
  } finally {
    savingEdit.value = false
  }
}

/**
 * Generate Stage-1 explainer text for every sentence in this pod.
 *   force=false (Generate)      — picks up only sentences with NULL explainer_text.
 *   force=true  (Regenerate all) — re-runs every sentence, overwriting existing
 *                                  text. Used after a prompt change.
 * Polls the resumable backend endpoint until more_remaining is false,
 * reloading the pod between batches so the inline display lights up live.
 */
async function generateExplainers(force) {
  if (explainerBusy.value) return
  explainerBusy.value = true
  explainerStatus.value = force ? 'Regenerating all sentences…' : 'Generating explainers…'
  explainerError.value = ''
  let totalUpdated = 0
  let totalFailed = 0
  try {
    // Resumable poll loop — endpoint caps itself at 60s wall time per call.
    // Keep going until it tells us we're exhausted, or until we hit a hard
    // failure ceiling so a runaway can't loop forever.
    for (let pass = 0; pass < 50; pass++) {
      const res = await authedFetch('/api/admin/pod-explainer-generate', {
        method: 'POST',
        body: JSON.stringify({ podId: pod.value?.id, force, limit: 200 }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
      totalUpdated += body.updated || 0
      totalFailed += body.failed || 0
      explainerStatus.value =
        `updated ${totalUpdated}, failed ${totalFailed}` +
        (body.more_remaining ? ' · more remaining, continuing…' : ' · done.')
      await loadPod() // refresh the inline rows so progress is visible
      if (!body.more_remaining) break
    }
  } catch (err) {
    explainerError.value = err?.message || String(err)
  } finally {
    explainerBusy.value = false
    if (!explainerError.value) explainerStatus.value += ' ✓'
  }
}

/**
 * Fill MISSING pod audio (target/known) for this pod via Phase 8.
 * Optimistic — no confirm, no approval. Phase 8's /generate-pods only touches
 * clips whose audio_id is null, so this never deletes or overwrites. It runs in
 * one pass (returns generated/reused/failed/total), but we loop defensively up
 * to a small ceiling in case anything's left, reloading the pod between passes
 * so the freshly-bound audio becomes playable inline immediately.
 */
async function regenerateAudio() {
  if (audioBusy.value || audioMissing.value === 0) return
  audioBusy.value = true
  audioError.value = ''
  let totalGenerated = 0
  let totalFailed = 0
  try {
    for (let pass = 0; pass < 5; pass++) {
      const before = audioMissing.value
      audioStatus.value = `Regenerating ${before} clip${before === 1 ? '' : 's'}…`
      const res = await authedFetch(
        `/api/admin/pods/${encodeURIComponent(courseCode)}/generate-audio`,
        { method: 'POST', body: JSON.stringify({ pod_ids: [pod.value?.id] }) },
      )
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
      totalGenerated += body.generated || 0
      totalFailed += body.failed || 0
      await loadPod() // re-bind audio so it's playable inline + refresh the count
      // Phase 8 is single-pass; stop once nothing new was made or none remain.
      if (audioMissing.value === 0 || (body.generated || 0) + (body.reused || 0) === 0) break
    }
    audioStatus.value =
      `generated ${totalGenerated}` +
      (totalFailed ? `, failed ${totalFailed}` : '') +
      (audioMissing.value === 0 ? ' · done ✓' : ` · ${audioMissing.value} still missing`)
  } catch (err) {
    audioError.value = err?.message || String(err)
  } finally {
    audioBusy.value = false
  }
}

/**
 * Render Stage-1 explainer narration (Tom's branded xAI voice) for sentences
 * that HAVE explainer text but NO explainer audio yet. Optimistic — no confirm.
 * The endpoint only touches rows with explainer_audio_id === null, so it never
 * deletes or overwrites. Loops defensively up to a small ceiling (reloading the
 * pod between passes so the new explainer audio becomes playable inline via the
 * per-sentence ▶ "Play Stage-1 explainer" button) in case a wave partially
 * failed and there's more left to do.
 */
async function generateExplainerAudio() {
  if (explainerAudioBusy.value || explainerAudioMissing.value === 0) return
  explainerAudioBusy.value = true
  explainerAudioError.value = ''
  let totalGenerated = 0
  let totalFailed = 0
  try {
    for (let pass = 0; pass < 5; pass++) {
      const before = explainerAudioMissing.value
      explainerAudioStatus.value = `Generating explainer audio for ${before} sentence${before === 1 ? '' : 's'}…`
      const res = await authedFetch(
        `/api/admin/pods/${encodeURIComponent(courseCode)}/generate-explainer-audio`,
        { method: 'POST', body: JSON.stringify({ pod_ids: [pod.value?.id] }) },
      )
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
      totalGenerated += body.generated || 0
      totalFailed += body.failed || 0
      await loadPod() // re-bind audio so it's playable inline + refresh the count
      // Stop once none remain or this pass made no progress (all failed).
      if (explainerAudioMissing.value === 0 || (body.generated || 0) === 0) break
    }
    explainerAudioStatus.value =
      `generated ${totalGenerated}` +
      (totalFailed ? `, failed ${totalFailed}` : '') +
      (explainerAudioMissing.value === 0 ? ' · done ✓' : ` · ${explainerAudioMissing.value} still missing`)
  } catch (err) {
    explainerAudioError.value = err?.message || String(err)
  } finally {
    explainerAudioBusy.value = false
  }
}

// --- Human recording status (pods coverage, keystone §5) ---
// Per-sentence human-vs-tts status from the voice-engine pods coverage
// endpoint. Non-fatal: the page renders fully without it (chips just hide).
const recBySentence = ref(null) // sentenceId -> kinds {target|known|explainer: {origin, recorded, ...}}

async function loadRecordingStatus() {
  try {
    const res = await fetch(`${getApiUrl()}/api/production/${courseCode}/pods/coverage`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    })
    if (!res.ok) return
    const data = await res.json()
    const podReport = (data.pods || []).find(p => p.podId === `${courseCode}:${slug}`)
    if (!podReport) return
    const map = {}
    for (const s of podReport.sentences || []) map[s.sentenceId] = s.kinds || {}
    recBySentence.value = map
    // Pretty names for voice IDS THE CLIPS ACTUALLY CARRY. The cast is only a
    // lookup table here: it is the plan for the NEXT render and disagrees with
    // the audio already on the pod (cym_n pod-0 was cast to five HUMAN_*
    // placeholders while every clip was Aran's own human_aran_cym_n), so a
    // voice that isn't in the cast shows its raw id rather than a cast name.
    const names = {}
    for (const v of data.voices || []) if (v.voiceId && v.name) names[v.voiceId] = v.name
    voiceNames.value = names
  } catch { /* coverage is additive — never block the page */ }
}

const voiceNames = ref({})
const voiceLabel = (voiceId) => (voiceId ? (voiceNames.value[voiceId] || voiceId) : null)

/** Every human take on this pod, and the distinct voices that recorded them. */
const humanKinds = computed(() => {
  const map = recBySentence.value
  if (!map) return []
  return Object.values(map).flatMap(kinds => Object.values(kinds)).filter(k => k.recorded)
})
const humanClipCount = computed(() => humanKinds.value.length)
const humanVoiceNames = computed(() =>
  [...new Set(humanKinds.value.map(k => voiceLabel(k.voiceId)).filter(Boolean))]
)

/** Play-button tooltip: whose voice this clip is, read from the clip. */
function clipTitle(sent, kind) {
  const langName = kind === 'target' ? targetName.value : knownName.value
  const k = recBySentence.value?.[sent.id]?.[kind]
  if (!k) return `Play ${kind} (${langName})`
  if (k.recorded) return `Play ${kind} (${langName}) — human take by ${voiceLabel(k.voiceId) || 'an unnamed voice'}`
  if (k.origin === 'tts') return `Play ${kind} (${langName}) — TTS voice ${voiceLabel(k.voiceId) || 'unknown'}`
  return `Play ${kind} (${langName})`
}

// One compact status chip per sentence. When a line has human takes it names
// the VOICE — that is the whole reason for listening — falling back to the
// human n/m count when the clip carries no voice id.
function recChip(sent) {
  const kinds = recBySentence.value?.[sent.id]
  if (!kinds) return null
  const entries = Object.values(kinds)
  if (!entries.length) return null
  const humanEntries = entries.filter(k => k.recorded)
  const human = humanEntries.length
  const tts = entries.filter(k => k.origin === 'tts').length
  const title = Object.entries(kinds)
    .map(([kind, k]) => `${kind}: ` + (k.recorded
      ? `human take by ${voiceLabel(k.voiceId) || 'an unnamed voice'}`
      : (k.origin === 'tts' ? `tts (${voiceLabel(k.voiceId) || 'unknown voice'})` : 'not recorded')))
    .join(' · ')
  if (human > 0) {
    const voices = [...new Set(humanEntries.map(k => voiceLabel(k.voiceId)).filter(Boolean))]
    const who = voices.length ? voices.join(' + ') : 'human'
    const partial = human < entries.length
    return {
      text: partial ? `${who} ${human}/${entries.length}` : who,
      cls: partial ? 'pill-amber' : 'pill-emerald',
      title,
    }
  }
  if (tts > 0) return { text: 'tts', cls: 'bg-surface text-faint border border-line', title }
  return { text: '—', cls: 'bg-surface text-faint border border-line', title }
}

onMounted(async () => { await loadPod(); loadDrafts(); loadRecordingStatus(); loadCast() })

onUnmounted(() => {
  if (audioEl.value) { audioEl.value.pause(); audioEl.value.src = '' }
})
</script>

<style scoped>
/* Theme-aware helpers. Dark mode keeps the original emerald/amber/red palette;
   light mode swaps to AA-legible equivalents (kept in the same hue family).
   Dark is the default; light is scoped under [data-theme="light"]. */

/* Emerald accent text (links, headings, ids, voice ids). Dark = emerald-400. */
.text-emerald { color: #34d399; }
.link-emerald { color: #34d399; }
.link-emerald:hover { color: #6ee7b7; }

/* Inline italic explainer note + its leading icon. Dark = amber-300/500. */
.explainer-note { color: rgba(252, 211, 77, 0.8); }
.explainer-icon { color: rgba(245, 158, 11, 0.6); }
.explainer-icon-dim { color: rgba(245, 158, 11, 0.4); }

/* Status pills. Dark = the original *-900/40 fill + *-300 text. */
.pill-emerald { background: rgba(6, 78, 59, 0.4); color: #6ee7b7; border: 1px solid #047857; }
.pill-purple { background: rgba(59, 7, 100, 0.4); color: #d8b4fe; border: 1px solid #7e22ce; }
.pill-amber { background: rgba(120, 53, 15, 0.3); color: #fcd34d; border: 1px solid #92400e; }

/* HELD / LIVE — learner reachability (Tom, 2026-08-23). HELD is red and solid:
   "nobody can reach this" is the surprising state and the one that must never
   be missed on a phone. LIVE stays quiet, in the same emerald as pill-emerald. */
.vis-badge { font-weight: 800; letter-spacing: 0.08em; font-size: 0.7rem; border-radius: 3px; padding: 0.1rem 0.4rem; }
.vis-held { background: #dc2626; color: #fff; }
.vis-live { background: rgba(6, 78, 59, 0.4); color: #6ee7b7; border: 1px solid #047857; }
.vis-panel-held { background: rgba(127, 29, 29, 0.35); border: 1px solid #b91c1c; color: #fecaca; }
.vis-btn-hold { border-color: #b91c1c; color: #fca5a5; }
.vis-btn-hold:hover { border-color: #dc2626; }
.vis-btn-release { border-color: #047857; color: #6ee7b7; }
.vis-btn-release:hover { border-color: #34d399; }
[data-theme="light"] .vis-live { background: #d1fae5; color: #065f46; border-color: #6ee7b7; }
[data-theme="light"] .vis-panel-held { background: #fef2f2; border-color: #dc2626; color: #991b1b; }
[data-theme="light"] .vis-btn-hold { color: #991b1b; border-color: #dc2626; }
[data-theme="light"] .vis-btn-release { color: #065f46; border-color: #047857; }

/* Big error banner + inline error rows. Dark = red-900/red-700/red-200/300. */
.err-box { background: rgba(127, 29, 29, 0.4); border: 1px solid #b91c1c; color: #fecaca; }
.err-inline { background: rgba(127, 29, 29, 0.3); border: 1px solid #991b1b; color: #fca5a5; }

[data-theme="light"] .text-emerald,
[data-theme="light"] .link-emerald {
  /* emerald-700 #047857 on white surface = 5.0:1 (AA body). */
  color: #047857;
}
[data-theme="light"] .link-emerald:hover { color: #065f46; }

[data-theme="light"] .explainer-note {
  /* amber-800 #92400e on white = 6.8:1; keeps the warm explainer identity. */
  color: #92400e;
}
[data-theme="light"] .explainer-icon { color: #b45309; }
[data-theme="light"] .explainer-icon-dim { color: #b45309; }

[data-theme="light"] .pill-emerald {
  /* emerald-50 fill, emerald-800 text #065f46 = 7.4:1, emerald-300 border. */
  background: #ecfdf5; color: #065f46; border-color: #6ee7b7;
}
[data-theme="light"] .pill-purple {
  background: #faf5ff; color: #6b21a8; border-color: #d8b4fe;
}
[data-theme="light"] .pill-amber {
  background: #fffbeb; color: #92400e; border-color: #fcd34d;
}

[data-theme="light"] .err-box {
  /* red-50 fill, red-700 text #b91c1c = 5.9:1, red-300 border. */
  background: #fef2f2; color: #b91c1c; border-color: #fca5a5;
}
[data-theme="light"] .err-inline {
  background: #fef2f2; color: #b91c1c; border-color: #fecaca;
}

/* Subtle shadow so white cards/rows lift off the slate-50 canvas in light mode
   (the border carries separation in dark mode; no shadow needed there). */
[data-theme="light"] .card-sep {
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04);
}
[data-theme="light"] .row-sep {
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

/* DRAFT — unproofread machine-written target text. Same tungsten identity the
   record room uses for the same state, so a line looks the same to whoever
   meets it first (autocue: PodLongTakeStudio .cue-draft-badge). */
.draft-panel {
  background: rgba(255, 166, 48, 0.08);
  border: 1px solid var(--color-tungsten, #ffa630);
}
.draft-panel-title { color: var(--color-tungsten, #ffa630); }
.draft-badge {
  display: inline-block;
  margin-bottom: 0.25rem;
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  background: var(--color-tungsten, #ffa630);
  color: #1a1a17;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.draft-row { border-color: var(--color-tungsten, #ffa630); }
/* The line you are hearing right now. Emerald edge only — during a play-through
   down 231 lines this is the only thing telling you where you are. */
.row-playing {
  border-color: #10b981;
  box-shadow: inset 3px 0 0 #10b981;
}
.draft-filter-btn {
  border: 1px solid var(--color-tungsten, #ffa630);
  color: var(--color-tungsten, #ffa630);
  background: transparent;
}
.draft-filter-on {
  background: var(--color-tungsten, #ffa630);
  color: #1a1a17;
}

[data-theme="light"] .draft-panel {
  /* amber-50 fill with amber-800 text = 6.8:1 on white. */
  background: #fffbeb;
  border-color: #b45309;
}
[data-theme="light"] .draft-panel-title { color: #92400e; }
[data-theme="light"] .draft-badge { background: #b45309; color: #fff; }
[data-theme="light"] .draft-row { border-color: #b45309; }
[data-theme="light"] .draft-filter-btn { border-color: #b45309; color: #92400e; }
[data-theme="light"] .draft-filter-on { background: #b45309; color: #fff; }
</style>
