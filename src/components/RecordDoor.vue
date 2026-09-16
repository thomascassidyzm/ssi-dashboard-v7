<template>
  <!-- THE DOOR INTO THE BOOTH. Aran, 2026-09-16, on his phone, from
       /production/cym_n_for_eng/pods/health-ladder-pilot: "feels
       counter-intuitive that in there is no way I can see to start a recording
       session - leaves me wondering where I need to be to record."
       It draws for a viewer who has no pod cast to their name, because whether a
       recordist has work here is a fact about WHO IS LOOKING and what they are
       cast to on the COURSE — never about which characters this pod happens to
       have. A pod read solo (metadata.solo_readers) has no characters at all. -->
  <div v-if="myVoices.length || readerVoices.length" class="record-links" data-surface="record-door">
    <!-- A CAST ARTIST SEES THEIR OWN DOOR AND NOBODY ELSE'S (Tom, 2026-09-12:
         the link is the artist's identity). One real button, full width on a
         phone, 44px of thumb. -->
    <template v-if="myVoices.length">
      <router-link
        v-for="v in myVoices"
        :key="v.voiceId"
        :to="boothLink(v.voiceId)"
        class="record-door-btn record-link"
      >{{ myVoices.length === 1 ? 'Record your lines' : `Record ${v.name}'s lines` }} →</router-link>
    </template>
    <!-- Everyone else is told WHO reads this, in words. An editor of the course
         gets a way in beside each name; a stranger gets the sentence alone. -->
    <template v-else>
      <span class="text-muted text-sm">Recorded by {{ readerNames }}</span>
      <template v-if="canOpenOthers">
        <router-link
          v-for="v in readerVoices"
          :key="v.voiceId"
          :to="boothLink(v.voiceId)"
          class="link-emerald font-medium record-link text-sm"
        >Open {{ v.name }} →</router-link>
      </template>
    </template>
  </div>
</template>

<script setup>
/**
 * Who gets a door, and where it lands.
 *
 * WHO READS THIS POD, in resolution order — the first that answers wins:
 *   (a) the pod row's own metadata.solo_readers: voice ids, one line per seed
 *       read solo by each human target voice (the health-ladder ruling,
 *       2026-09-16). A solo pod has no characters, so (b) is empty by design.
 *   (b) the pod's character cast (voice_config.podCast over pod.speakers).
 *   (c) the viewer's own casting on this COURSE — which is what keeps a
 *       recordist from ever meeting a pod page with no way in.
 *
 * WHOSE LINK IS DRAWN is a separate question and is answered by the viewer:
 * their own casting on this course, always and only. An editor with no casting
 * sees the readers' names and a way into each.
 */
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth.js'

const props = defineProps({
  courseCode: { type: String, required: true },
  /** Optional: scopes Start to this pod's first unread line (RecordistRoom ?pod=). */
  podSlug: { type: String, default: '' },
  /** Optional: pod.metadata.solo_readers — voice ids. */
  soloReaders: { type: Array, default: () => [] },
  /** Optional: the pod's character cast, [{ voiceId, name }]. */
  castVoices: { type: Array, default: () => [] },
  /** Optional: the course roster, [{ voiceId, name }], to name a solo reader. */
  rosterVoices: { type: Array, default: () => [] },
})

const { isEditorOf, isAdmin, dashboardUser } = useAuth()

/** A voice id is never shown raw: human_aran_cym_n reads as "Aran". */
function prettyVoiceId(voiceId) {
  const part = String(voiceId || '').replace(/^human_/, '').split('_')[0]
  return part ? part.charAt(0).toUpperCase() + part.slice(1) : String(voiceId || '')
}

const myCasting = computed(() => (dashboardUser?.value?.casting || [])
  .filter((c) => c && c.courseCode === props.courseCode && c.voiceId))

function nameFor(voiceId) {
  const cast = props.castVoices.find((v) => v.voiceId === voiceId)
  if (cast?.name) return cast.name
  const roster = props.rosterVoices.find((v) => v.voiceId === voiceId)
  if (roster?.name) return roster.name
  const mine = myCasting.value.find((c) => c.voiceId === voiceId)
  if (mine?.displayName) return mine.displayName
  return prettyVoiceId(voiceId)
}

const myVoices = computed(() => {
  const seen = new Set()
  const out = []
  for (const c of myCasting.value) {
    if (seen.has(c.voiceId)) continue
    seen.add(c.voiceId)
    out.push({ voiceId: c.voiceId, name: c.displayName || nameFor(c.voiceId) })
  }
  return out
})

const readerVoices = computed(() => {
  const solo = (props.soloReaders || []).filter((id) => typeof id === 'string' && id)
  if (solo.length) return solo.map((voiceId) => ({ voiceId, name: nameFor(voiceId) }))
  if (props.castVoices.length) return props.castVoices.map((v) => ({ voiceId: v.voiceId, name: v.name || nameFor(v.voiceId) }))
  return myVoices.value
})

const readerNames = computed(() => {
  const names = readerVoices.value.map((v) => v.name)
  if (names.length <= 1) return names[0] || ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
})

const canOpenOthers = computed(() => {
  if (typeof isEditorOf === 'function' && isEditorOf(props.courseCode)) return true
  return !!(isAdmin && isAdmin.value)
})

/**
 * /r/:voiceId?course=…&pod=… — the booth scoped to this course, with Start on
 * this pod's first unread line (RecordistRoom reads `pod` off the address).
 */
function boothLink(voiceId) {
  const q = `?course=${encodeURIComponent(props.courseCode)}`
  return props.podSlug ? `/r/${voiceId}${q}&pod=${encodeURIComponent(props.podSlug)}` : `/r/${voiceId}${q}`
}
</script>

<style scoped>
.record-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
}
/* PHONE FIRST. Aran reads this on a phone: a real button, full width, 48px of
   target, never a text link in a row of text links. */
.record-door-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 48px;
  padding: 0.75rem 1.25rem;
  border-radius: 0.5rem;
  background: #059669;
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
  text-decoration: none;
}
.record-door-btn:hover { background: #10b981; }
@media (min-width: 640px) {
  .record-door-btn { width: auto; }
}
</style>
