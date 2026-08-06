<template>
  <div
    v-if="gaps || error || loading"
    data-walk="audio-preview-course-gaps"
    class="mb-4 rounded-lg bg-surface px-4 py-2.5"
    :class="hasGaps ? 'border border-amber-500/40' : 'border border-line'"
  >
    <p v-if="error" class="text-xs text-danger">
      Could not list the course's missing clips: {{ error }} — this block cannot tell you how many gaps the course has.
    </p>
    <p v-else-if="loading" class="text-xs text-faint">
      Scanning the whole course for missing clips…
    </p>

    <template v-else>
      <button
        @click="open = !open"
        data-walk="audio-preview-course-gaps-toggle"
        class="w-full flex items-center justify-between text-left text-xs gap-3"
      >
        <span v-if="hasGaps" class="font-medium">
          <span class="text-amber-400 text-base font-bold" data-gaps-total>{{ totals.blocking }}</span>
          <span class="text-amber-400"> clip{{ totals.blocking === 1 ? '' : 's' }} missing across the whole course</span>
          <span class="text-faint">
            — {{ totals.roundsAffected }} of {{ totals.roundsTotal }} rounds affected<template
              v-if="totals.nonBlocking"
            >, plus {{ totals.nonBlocking }} row{{ totals.nonBlocking === 1 ? '' : 's' }} missing only target2</template>
          </span>
        </span>
        <span v-else class="text-muted font-medium">
          No missing clips anywhere in the course — all {{ totals.itemsScanned }} journey slots have their audio
        </span>
        <span class="text-faint shrink-0">{{ open ? 'hide' : 'show' }}</span>
      </button>

      <!-- What the LIVE PLAYER does with those gaps. A separate question from
           "what is there to record", and the one a sign-off actually turns on:
           a LEGO short of any one voice costs its whole round, not its cycle. -->
      <p
        v-if="playerDelivery && playerDelivery.roundsDropped > 0"
        data-gaps-player-delivery
        class="text-xs text-amber-400 mt-1.5 leading-relaxed"
      >
        The live player currently delivers
        <span class="font-bold" data-player-rounds-played>{{ playerDelivery.roundsPlayed }}</span>
        of {{ playerDelivery.roundsTotal }} rounds —
        <span class="font-bold" data-player-rounds-dropped>{{ playerDelivery.roundsDropped }}</span>
        round{{ playerDelivery.roundsDropped === 1 ? '' : 's' }} never reach a learner, because the LEGO
        that opens {{ playerDelivery.roundsDropped === 1 ? 'it is' : 'them is' }} short at least one of its
        three voices. {{ playerDelivery.slotsUndeliverable }} playback slot{{ playerDelivery.slotsUndeliverable === 1 ? '' : 's' }}
        {{ playerDelivery.slotsUndeliverable === 1 ? 'is' : 'are' }} lost in total.
      </p>
      <p
        v-else-if="playerDelivery && playerDelivery.slotsUndeliverable > 0"
        data-gaps-player-delivery
        class="text-xs text-amber-400 mt-1.5 leading-relaxed"
      >
        Every round reaches a learner, but the player skips
        <span class="font-bold" data-player-slots>{{ playerDelivery.slotsUndeliverable }}</span>
        individual row{{ playerDelivery.slotsUndeliverable === 1 ? '' : 's' }} inside them.
      </p>
      <p
        v-else-if="playerDelivery"
        data-gaps-player-delivery
        class="text-xs text-muted mt-1.5"
      >
        The live player delivers all {{ playerDelivery.roundsTotal }} rounds of this course.
      </p>

      <div v-if="open" class="mt-3 space-y-4">
        <!-- The accounting, per role, so a gap class nobody looked at cannot
             hide inside a single total. -->
        <div>
          <div class="text-[11px] uppercase tracking-wide text-faint mb-1">Missing by role</div>
          <table class="w-full text-xs">
            <thead>
              <tr class="text-faint text-left">
                <th class="font-normal py-0.5">role</th>
                <th class="font-normal py-0.5 text-right">rows missing it</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="role in roleRows"
                :key="role.role"
                :data-gap-role="role.role"
                class="border-t border-line/40"
              >
                <td class="font-mono text-muted py-0.5">{{ role.role }}</td>
                <td
                  class="font-mono py-0.5 text-right"
                  :class="role.count ? 'text-amber-400' : 'text-faint'"
                >{{ role.count }}</td>
              </tr>
            </tbody>
          </table>
          <p class="text-[11px] text-faint mt-1 leading-relaxed">
            One row = one thing to fix (a phrase, or a LEGO's intro or debut), not one playback slot:
            these {{ totals.rows }} row{{ totals.rows === 1 ? '' : 's' }} block
            {{ totals.occurrences }} slot{{ totals.occurrences === 1 ? '' : 's' }} across the journey,
            because review rounds replay the same phrase.
            <em>target2</em> is not part of Popty's playback gate, so a row missing only target2 is counted
            but is not one of the {{ totals.blocking }}. It is not harmless, though: the LIVE PLAYER
            requires all three voices, and on a LEGO a target2 gap costs the learner that LEGO's entire
            round — which is what the delivery line above counts.
          </p>
        </div>

        <!-- Grouped by the round the gap first appears in: a cluster of gaps in
             one round should read as a cluster. -->
        <ul class="space-y-2">
          <li
            v-for="group in visibleGroups"
            :key="group.roundNumber"
            data-gap-group
            class="border-l-2 border-amber-500/60 pl-2.5 py-0.5"
          >
            <div class="flex gap-2 flex-wrap items-baseline text-xs">
              <span class="font-mono text-accent-2">R{{ group.roundNumber }}</span>
              <span class="font-mono text-muted">{{ group.legoId }}</span>
              <span class="text-faint">seed {{ group.seedNumber }}</span>
              <span class="text-faint">{{ group.rows.length }} gap{{ group.rows.length === 1 ? '' : 's' }}</span>
            </div>
            <div
              v-for="row in group.rows"
              :key="row.key"
              data-gap-row
              class="mt-1 pl-1"
            >
              <div class="flex gap-2 flex-wrap items-baseline text-xs">
                <span
                  class="uppercase text-[10px] tracking-wide font-medium"
                  :class="row.blocking ? 'text-amber-400' : 'text-faint'"
                >{{ row.missing.join(' + ') }}</span>
                <span class="text-faint">{{ row.kind }}<template v-if="row.playedAs.length"> · plays as {{ row.playedAs.join(', ') }}</template></span>
                <span v-if="row.occurrences > 1" class="text-faint">×{{ row.occurrences }} slots</span>
              </div>
              <div class="text-xs text-ink">{{ row.targetText || '—' }}</div>
              <div v-if="row.knownText" class="text-xs text-muted">{{ row.knownText }}</div>
              <div v-if="row.phraseId" class="text-[11px] font-mono text-faint">{{ row.phraseId }}</div>
            </div>
          </li>
        </ul>

        <button
          v-if="gaps.groups.length > visibleGroups.length"
          @click="shown += PAGE"
          data-walk="audio-preview-course-gaps-more"
          class="px-3 py-1.5 rounded text-xs font-medium bg-surface border border-line text-muted hover:text-ink"
        >Show more ({{ gaps.groups.length - visibleGroups.length }} round{{ gaps.groups.length - visibleGroups.length === 1 ? '' : 's' }} left)</button>

        <p v-if="outsideJourney" class="text-[11px] text-faint leading-relaxed" data-gaps-outside>
          Outside this list: {{ outsideJourney.phrases }} phrase{{ outsideJourney.phrases === 1 ? '' : 's' }}
          and {{ outsideJourney.legos }} LEGO{{ outsideJourney.legos === 1 ? '' : 's' }} also have audio gaps
          but are never played by the journey — {{ outsideJourney.note }}
        </p>
        <p class="text-[11px] text-faint leading-relaxed">
          {{ gaps.note }} Scanned in {{ gaps.computedInMs }}ms. Nothing in the list is capped — every gap
          the journey plays is in it.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup>
/**
 * Every missing clip in the course, in one place.
 *
 * The gap this closes: Script Viewer's "Missing audio only" toggle filters only
 * the rounds it has loaded (20 LEGOs per page), so the sole way to find every
 * gap was to wade through the course a block at a time. This block asks the
 * server the same question over the whole course and prints the answer as one
 * number and one list.
 *
 * Two rules, inherited from AudioPreviewMissing.vue and worth repeating: the
 * list is never silently truncated (the payload is uncapped; only the RENDER
 * pages, and it says how many rounds are still hidden), and two different facts
 * never merge into one number — a row the learner cannot hear at all is counted
 * apart from a row whose only gap is target2.
 */
import { ref, computed } from 'vue'

// Every role is printed, including the ones at zero: a zero nobody prints is
// indistinguishable from a role nobody checked.
const ROLE_ORDER = ['presentation', 'known', 'target1', 'target2']

const props = defineProps({
  // The /audio-preview/missing-clips payload, or null while loading.
  gaps: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})

const PAGE = 25
const open = ref(false)
const shown = ref(PAGE)

const totals = computed(() => props.gaps?.totals || {
  rows: 0, blocking: 0, nonBlocking: 0, occurrences: 0,
  byRole: {}, byKind: {}, roundsAffected: 0, roundsTotal: 0, itemsScanned: 0,
})
const hasGaps = computed(() => totals.value.rows > 0)
// Absent on an older payload — the block then says nothing about delivery
// rather than printing a zero it did not measure.
const playerDelivery = computed(() => totals.value.playerDelivery || null)
const outsideJourney = computed(() => props.gaps?.outsideJourney || null)
const visibleGroups = computed(() => (props.gaps?.groups || []).slice(0, shown.value))
const roleRows = computed(() =>
  ROLE_ORDER.map(role => ({ role, count: totals.value.byRole?.[role] || 0 })))
</script>
