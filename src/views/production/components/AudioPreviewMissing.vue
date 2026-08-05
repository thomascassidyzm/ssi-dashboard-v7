<template>
  <div
    v-if="missing"
    data-walk="audio-preview-missing"
    class="mb-4 rounded-lg bg-surface px-4 py-2.5"
    :class="hasMissing ? 'border border-danger/40' : 'border border-line'"
  >
    <button
      @click="open = !open"
      data-walk="audio-preview-missing-toggle"
      class="w-full flex items-center justify-between text-left text-xs gap-3"
    >
      <span v-if="hasMissing" class="text-danger font-medium">
        {{ missing.totals.missing }} slot{{ missing.totals.missing === 1 ? '' : 's' }}
        point at audio that no longer exists — {{ missing.totals.sentencesAffected }}
        dialogue line{{ missing.totals.sentencesAffected === 1 ? '' : 's' }} the pod cannot play
      </span>
      <span v-else class="text-muted font-medium">
        No pod slot points at missing audio — all
        {{ missing.totals.slotsReferenced }} referenced clip{{ missing.totals.slotsReferenced === 1 ? '' : 's' }} resolve
      </span>
      <span class="text-faint shrink-0">{{ open ? 'hide' : 'show' }}</span>
    </button>

    <div v-if="open" class="mt-3 space-y-4">
      <!-- The accounting. Every audio-id column on the table appears, including
           the ones with nothing wrong: an earlier sweep of this same defect
           reported two of the three array columns, and a zero that is never
           printed is indistinguishable from a column nobody checked. -->
      <div>
        <div class="text-[11px] uppercase tracking-wide text-faint mb-1">
          All {{ missing.byColumn.length }} audio-id columns scanned
        </div>
        <table class="w-full text-xs">
          <thead>
            <tr class="text-faint text-left">
              <th class="font-normal py-0.5">column</th>
              <th class="font-normal py-0.5">kind</th>
              <th class="font-normal py-0.5 text-right">ids referenced</th>
              <th class="font-normal py-0.5 text-right">missing</th>
              <th class="font-normal py-0.5 text-right">lines affected</th>
              <th class="font-normal py-0.5 text-right">no clip assigned</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="col in missing.byColumn"
              :key="col.column"
              :data-missing-column="col.column"
              class="border-t border-line/40"
            >
              <td class="font-mono text-muted py-0.5">{{ col.column }}</td>
              <td class="text-faint py-0.5">{{ col.kind }}</td>
              <td class="font-mono text-faint py-0.5 text-right">{{ col.referenced }}</td>
              <td
                class="font-mono py-0.5 text-right"
                :class="col.missing ? 'text-danger' : 'text-faint'"
              >{{ col.missing }}</td>
              <td class="font-mono text-faint py-0.5 text-right">{{ col.sentencesAffected }}</td>
              <td class="font-mono text-faint py-0.5 text-right">
                {{ col.unassignedSentences }}<template
                  v-if="col.unassignedSlots"> + {{ col.unassignedSlots }} gap{{ col.unassignedSlots === 1 ? '' : 's' }}</template>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- Two different facts about a slot, never merged into one number. -->
        <p class="text-[11px] text-faint mt-1 leading-relaxed">
          <em>missing</em> = the slot holds an id with no live clip behind it.
          <em>no clip assigned</em> = lines with nothing at all in that column, plus
          <em>gaps</em>, meaning empty positions inside a line that does have clips.
          That may well be by design. All three are counted separately on purpose.
        </p>
        <p v-if="missing.note" class="text-[11px] text-faint mt-1 leading-relaxed">
          {{ missing.note }}
        </p>
      </div>

      <!-- The slots themselves. Shown, never silently skipped — a slot a human
           cannot see is a slot nobody repairs. -->
      <ul v-if="hasMissing" class="space-y-1.5">
        <li
          v-for="slot in visibleSlots"
          :key="`${slot.sentenceId}:${slot.column}:${slot.index}`"
          data-missing-slot
          class="border-l-2 border-danger/60 pl-2.5 py-0.5"
        >
          <div class="flex gap-2 flex-wrap items-baseline text-xs">
            <span class="text-danger font-medium uppercase text-[10px] tracking-wide">missing</span>
            <span class="font-mono text-accent-2">{{ slot.courseCode }}</span>
            <span class="font-mono text-muted">{{ slot.podId }}</span>
            <span class="font-mono text-faint">{{ positionLabel(slot) }}</span>
            <span v-if="slot.speaker" class="text-faint">{{ slot.speaker }}</span>
          </div>
          <div class="text-xs text-ink mt-0.5">{{ slot.targetText || '—' }}</div>
          <div v-if="slot.knownText" class="text-xs text-muted">{{ slot.knownText }}</div>
          <div class="text-[11px] font-mono text-faint mt-0.5">
            {{ slot.column }}<template v-if="slot.index !== null">[{{ slot.index }}]</template>
            → {{ slot.audioId }}
          </div>
        </li>
      </ul>

      <button
        v-if="hasMissing && missing.slots.length > visibleSlots.length"
        @click="shown += PAGE"
        class="px-3 py-1.5 rounded text-xs font-medium bg-surface border border-line text-muted hover:text-ink"
      >Show more ({{ missing.slots.length - visibleSlots.length }} left)</button>
    </div>
  </div>
</template>

<script setup>
/**
 * The MISSING state, made loud.
 *
 * `listening_pod_sentences` references course_audio with no foreign key, so a
 * deleted clip leaves a live-looking uuid behind and the pod silently cannot
 * play that line. Before this block the page had no way to show that state at
 * all: a clip either played or sounded wrong, and a slot pointing at nothing
 * simply never appeared.
 *
 * Two rules govern everything here. Missing slots are SHOWN, never skipped —
 * silent skipping is the defect. And "no clip assigned" is never folded in with
 * "points at a clip that does not exist"; the first may be by design, the
 * second is always damage.
 */
import { ref, computed } from 'vue'

const props = defineProps({
  // The /audio-preview/missing payload, or null while it is still loading.
  missing: { type: Object, default: null },
})

const PAGE = 25
const open = ref(false)
const shown = ref(PAGE)

const hasMissing = computed(() => (props.missing?.totals?.missing || 0) > 0)
const visibleSlots = computed(() => (props.missing?.slots || []).slice(0, shown.value))

function positionLabel (slot) {
  const parts = []
  if (slot.globalOrder != null) parts.push(`line ${slot.globalOrder}`)
  if (slot.sceneNumber != null) parts.push(`scene ${slot.sceneNumber}`)
  return parts.join(' · ') || 'position unknown'
}
</script>
