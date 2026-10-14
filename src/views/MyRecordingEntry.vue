<template>
  <!-- data-surface: greppable in the served bundle, so "did it ship?" is answerable without a login -->
  <div class="entry" data-surface="my-recording-entry-2026-09-02">

    <section v-if="phase === 'loading'" class="card center">
      <div class="spinner"></div>
      <p>Finding your lines…</p>
    </section>

    <!-- Signed in, but nobody has cast this login as a voice. Say exactly that,
         and say which email it looked under — a recordist who signed in with a
         second address needs to see the address, not a shrug. Carried over
         unchanged from the list page this replaced. -->
    <section v-else-if="phase === 'no-voice'" class="card center">
      <h2>No recording voice for this login</h2>
      <p>
        You're signed in as <strong>{{ me.email }}</strong>, and no language names that address as
        one of its voices. Ask for your address to be added and this page fills itself in.
      </p>
    </section>

    <section v-else-if="phase === 'error'" class="card center">
      <h2>Couldn't find your recording voice</h2>
      <p>{{ loadError }}</p>
      <button class="btn-ghost" @click="load">Try again</button>
    </section>
  </div>
</template>

<script setup>
/**
 * MyRecordingEntry — the LOGIN door onto the recording booth. Not a page you
 * stay on.
 *
 * WHY THIS REPLACED A LIST (Tom's ruling, 2026-09-02). There were two competing
 * recording surfaces: /r/:voiceId (the booth — link-is-identity, autocue, runs
 * the whole queue in one go) and /my-recording (a tap-a-row list). Tom tested
 * both and condemned the list in his own words — "basically a shambles of UX …
 * no way to easily record the whole list … hard to know what you have recorded,
 * what is playing back" — and ruled: "the link to the second tool is way better
 * - so we will persist with that one".
 *
 * So there is now ONE recording experience, reached two ways: whoever holds the
 * LINK opens /r/:voiceId directly, and whoever holds the LOGIN lands here, which
 * asks the server which voice they are and sends them to the same booth. Nothing
 * is recorded on this route, nothing is listed on it, and nobody stays here.
 *
 * A login with MORE THAN ONE voice used to be asked here which one it was reading
 * today. Since job #392 (Aran, 2026-10-14) the booth itself carries a tab per voice,
 * so this door opens the first one and the tabs do the rest: every voice's key is
 * remembered first, so each tab opens as its own link would.
 *
 * replace: true on the redirect, deliberately. Back out of the booth and you get
 * wherever you came from, not this resolver bouncing you forwards again.
 */
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { recordingApiBase as apiBase, rememberBoothKey } from '@/services/recordingApi'

const router = useRouter()
const { getAccessToken } = useAuth()

const phase = ref('loading')   // loading | no-voice | error
const loadError = ref(null)
const me = reactive({ email: '', name: '', voices: [] })


// The signed-in artist's own private link key comes back from /mine (job #380):
// remembered for the booth and put on the address, so the booth opens as the link would.
function go(voiceId) {
  const key = (me.voices.find((v) => v.voiceId === voiceId) || {}).boothKey || null
  if (key) rememberBoothKey(voiceId, key)
  router.replace({ name: 'RecordistRoom', params: { voiceId }, ...(key ? { query: { k: key } } : {}) })
}

async function load() {
  phase.value = 'loading'
  loadError.value = null
  try {
    const token = await getAccessToken()
    const res = await fetch(`${apiBase()}/api/recording/mine`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!res.ok) throw new Error(`Could not check your recording voice (${res.status})`)
    const data = await res.json()
    me.email = data.email || ''
    me.name = data.name || ''
    me.voices = Array.isArray(data.voices) ? data.voices : []
    if (!me.voices.length) { phase.value = 'no-voice'; return }
    for (const v of me.voices) if (v.boothKey) rememberBoothKey(v.voiceId, v.boothKey)
    go(me.voices[0].voiceId)
  } catch (err) {
    loadError.value = (err && err.message) || 'Network error'
    phase.value = 'error'
  }
}

onMounted(load)
</script>

<style scoped>
/* Phone first: Aran and Catrin work on phones. Everything tappable clears 48px. */
.entry {
  max-width: 640px;
  margin: 0 auto;
  padding: 1rem 1rem 4rem;
  min-height: 100vh;
  color: var(--color-paper, #f7f7f2);
  background: var(--color-void, #0f172a);
}
.card {
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 16px;
  padding: 1.75rem 1.35rem;
  margin-top: 1.5rem;
}
.center { text-align: center; }
.btn-ghost {
  margin-top: 1rem;
  min-height: 48px;
  padding: 0.7rem 1.2rem;
  border-radius: 10px;
  border: 1px solid var(--color-graphite, #475569);
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.spinner {
  width: 28px; height: 28px; margin: 0 auto 0.9rem;
  border: 3px solid var(--color-graphite, #475569);
  border-top-color: var(--color-paper, #f7f7f2);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
