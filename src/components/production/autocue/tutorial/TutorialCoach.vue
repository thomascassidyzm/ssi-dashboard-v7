<template>
  <!--
    THE ONLY PLACE TEACHING COPY IS RENDERED.

    `v-if="on"` is the gate, and `on` comes from an inject that DEFAULTS TO
    FALSE (tutorialMode.js). Drop this component into AutocueStudio.vue or
    RecordRoom.vue and it renders an empty comment node, because neither of them
    provides TUTORIAL_MODE — there is no prop, query flag or env var that can
    turn it on from outside.
  -->
  <aside v-if="on && block" class="coach" :class="`tone-${block.tone || 'why'}`">
    <div class="coach-rail" aria-hidden="true"></div>
    <div class="coach-body">
      <h3 v-if="block.title" class="coach-title">{{ block.title }}</h3>
      <p v-for="(para, i) in block.body || []" :key="i" class="coach-para">{{ para }}</p>

      <p v-if="block.watch" class="coach-watch">
        <span class="coach-watch-tag">Notice</span>{{ block.watch }}
      </p>

      <p v-if="nudge" class="coach-nudge">{{ nudge }}</p>

      <slot />
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useTutorialMode } from './tutorialMode'
import { COACH } from './tutorialScript'

const props = defineProps({
  // Key into COACH. Passing an unknown key renders nothing rather than throwing,
  // so a renamed step degrades to silence instead of a broken practice page.
  step: { type: String, required: true },
  // Set when the recordist did something the step wasn't asking for — shows the
  // step's own `nudge` line. Never invents copy; if the step has no nudge,
  // nothing appears.
  nudged: { type: Boolean, default: false },
})

const on = useTutorialMode()
const block = computed(() => COACH[props.step] || null)
const nudge = computed(() => (props.nudged ? block.value?.nudge || null : null))
</script>

<style scoped>
/*
 * Built from the studio's own tokens so the coach reads as part of the screen
 * rather than a browser dialog pasted over it. It is deliberately NOT a modal:
 * a modal would cover the control it is talking about, and the recordist needs
 * to see the button while reading about it.
 */
.coach {
  display: flex;
  gap: 0.9rem;
  /* The studio's summary cards centre their contents, which is fine for three
     stat tiles and unreadable for four sentences of prose. Prose is left-aligned
     wherever the coach lands. */
  text-align: left;
  background: var(--color-shadow, var(--surface));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 12px;
  padding: 1rem 1.1rem;
  margin: 1.25rem 0;
  position: relative;
  z-index: 1;
}

.coach-rail {
  width: 3px;
  border-radius: 2px;
  flex-shrink: 0;
  background: var(--color-emerald, #06ffa5);
}

.tone-why .coach-rail { background: var(--color-emerald, #06ffa5); }
.tone-do .coach-rail { background: var(--color-tungsten, var(--accent)); }
.tone-watch .coach-rail { background: var(--color-film-red, #e63946); }

.coach-body {
  flex: 1;
  min-width: 0;
}

.coach-title {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-paper, var(--ink));
  margin: 0 0 0.5rem;
  letter-spacing: 0.02em;
}

.tone-do .coach-title { color: var(--color-tungsten, var(--accent)); }

.coach-para {
  color: var(--color-paper-dim, var(--muted));
  font-size: 0.97rem;
  line-height: 1.55;
  margin: 0 0 0.6rem;
}

.coach-para:last-of-type {
  margin-bottom: 0;
}

.coach-watch {
  margin: 0.85rem 0 0;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-graphite, var(--surface-3));
  color: var(--color-tungsten, var(--accent));
  font-size: 0.95rem;
  line-height: 1.55;
}

.coach-watch-tag {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-right: 0.6rem;
  opacity: 0.85;
}

.coach-nudge {
  margin: 0.85rem 0 0;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  background: rgba(255, 166, 48, 0.12);
  border: 1px solid var(--color-tungsten, var(--accent));
  color: var(--color-tungsten, var(--accent));
  font-size: 0.95rem;
  line-height: 1.5;
}

:root[data-theme="light"] .coach {
  border-color: var(--line);
}

:root[data-theme="light"] .coach-watch {
  border-top-color: var(--line);
}

@media (max-width: 480px) {
  .coach {
    padding: 0.85rem 0.9rem;
    gap: 0.7rem;
  }

  .coach-para,
  .coach-watch {
    font-size: 0.93rem;
  }
}
</style>
