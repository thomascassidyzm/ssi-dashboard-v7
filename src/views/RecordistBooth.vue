<template>
  <!-- data-surface: greppable in the served bundle, so "did it ship?" is answerable without a login -->
  <div class="booth-tabs-page" data-surface="booth-language-tabs-2026-10-14">
    <nav v-if="tabs.length > 1" class="booth-tabs" role="tablist" aria-label="Which voice you are recording" data-test="booth-tabs">
      <button
        v-for="t in tabs"
        :key="t.voiceId"
        type="button"
        role="tab"
        class="booth-tab"
        :class="{ on: t.voiceId === active }"
        :aria-selected="t.voiceId === active"
        :disabled="recording && t.voiceId !== active"
        :data-voice="t.voiceId"
        @click="switchTo(t.voiceId)"
      >{{ tabLabel(t, tabs) }}</button>
    </nav>
    <!-- Each voice is its own booth, kept alive when you leave its tab: the batch you were in, the
         line you were on and the ticks on its cards are all still there when you come back. -->
    <KeepAlive :max="6">
      <RecordistRoom :key="active" :voice-id="active" @phase="(p) => { phases[active] = p }" />
    </KeepAlive>
  </div>
</template>

<script setup>
/**
 * RecordistBooth — the /r/:voiceId page: ONE booth for a person with several voices, one tab per
 * voice (Aran, 2026-10-14, job #392: "I would rather have them on a single page, where I can
 * switch tabs to change languages").
 *
 * The booth itself is RecordistRoom, unchanged in what it records and how: every take, upload and
 * key still belongs to the one voice its tab names. This page only decides which booths are open
 * and which one you are looking at. The address follows the tab (/r/human_aran_eng), so a refresh,
 * a bookmark or an old link opens on the right one, and each tab's own place (?track=, ?batch=) is
 * put back when you return to it.
 *
 * Which tabs appear is the server's answer (GET …/voice/:voiceId/tabs, booth-tabs.cjs): only the
 * voices this caller could open on their own. A one-voice artist gets one, and sees no tab bar.
 */
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RecordistRoom from './RecordistRoom.vue'
import { recordingApiBase as apiBase, withBoothKey, rememberBoothKey } from '@/services/recordingApi'
import { boothMicLive } from '@/nav/boothMic'
import { tabLabel, heldKeysHeader, loadTabsSnapshot, saveTabsSnapshot } from './recordist/booth-tabs.js'

const props = defineProps({ voiceId: { type: String, required: true } })
const route = useRoute()
const router = useRouter()

const active = computed(() => props.voiceId)
const tabs = ref(loadTabsSnapshot(props.voiceId) || [])
const phases = reactive({})
// Mid-take, the other tabs wait: a take is finished (and kept) before you can leave it.
const recording = computed(() => phases[active.value] === 'recording')
// The app's top bar steps out while a take is live (navbarMode, job #411).
watch(recording, (on) => { boothMicLive.value = on }, { immediate: true })
onUnmounted(() => { boothMicLive.value = false })
/** voiceId → the query it was last on, so a tab comes back where you left it. */
const placeOf = {}

async function loadTabs(voiceId) {
  try {
    const held = heldKeysHeader(voiceId)
    const res = await fetch(withBoothKey(`${apiBase()}/api/recording/voice/${encodeURIComponent(voiceId)}/tabs`, voiceId), {
      headers: held ? { 'x-booth-keys': held } : {},
    })
    if (!res.ok) { if (res.status < 500 && voiceId === props.voiceId) { tabs.value = []; saveTabsSnapshot(voiceId, []) } return }
    const data = await res.json()
    const list = Array.isArray(data.tabs) ? data.tabs : []
    // A signed-in artist is handed their own keys, as the login door does: kept, so each tab
    // still opens on this device after they sign out.
    for (const t of list) if (t.boothKey) rememberBoothKey(t.voiceId, t.boothKey)
    saveTabsSnapshot(voiceId, list)
    if (voiceId === props.voiceId) tabs.value = list
  } catch { /* the tabs are a convenience: without them the booth is the one voice it always was */ }
}

function switchTo(voiceId) {
  if (voiceId === active.value || recording.value) return
  placeOf[active.value] = { ...route.query }
  const query = { ...(placeOf[voiceId] || {}) }
  delete query.k // the key lives on this device now; it does not ride the address between tabs
  router.replace({ name: route.name, params: { voiceId }, query })
}

// A voice outside the set (a link to someone else opened in this tab) asks again; moving between
// tabs of the same set does not, so the switch is instant.
watch(() => props.voiceId, (v, was) => {
  if (was && tabs.value.some((t) => t.voiceId === v)) return
  tabs.value = loadTabsSnapshot(v) || []
  loadTabs(v)
}, { immediate: true })
</script>

<style scoped>
.booth-tabs-page { min-height: 100vh; background: var(--color-void, #0f172a); }
.booth-tabs {
  display: flex;
  gap: 0.4rem;
  max-width: 640px;
  margin: 0 auto;
  padding: 0.6rem 1rem 0;
  position: sticky;
  top: 0;
  z-index: 5;
  background: inherit;
}
.booth-tab {
  flex: 1 1 0;
  min-height: 48px;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 12px;
  cursor: pointer;
}
.booth-tab.on { color: var(--color-void, #0f172a); background: var(--color-tungsten, #ffa630); border-color: var(--color-tungsten, #ffa630); }
.booth-tab:disabled { opacity: 0.45; cursor: not-allowed; }
@media (min-width: 900px) { .booth-tabs { max-width: none; padding: 0.8rem 2rem 0; } }
@media (max-width: 480px) { .booth-tabs { padding: 0.5rem 0.6rem 0; } }

:root[data-theme="light"] .booth-tabs-page { background: var(--surface); }
:root[data-theme="light"] .booth-tab { color: #1f2937; background: #fff; border-color: var(--line, #d4d4cf); }
:root[data-theme="light"] .booth-tab.on { color: #fff; background: #1d4ed8; border-color: #1d4ed8; }
</style>
