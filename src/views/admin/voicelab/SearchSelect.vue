<script setup>
/**
 * SEARCH SELECT — a dropdown you can type into.
 *
 * Tom, 2026-08-31, on the Play tab's Voice picker: "voice choice here is not
 * sophisticated enough… these long lists are impenetrable as drop downs — so we
 * should have a search bar at the top of the dropdown as a filter, this could
 * search for any parameters/variables like gender/accent etc."
 *
 * Two things, and the second is the root of it:
 *
 *   FILTER   one field at the top, matching across EVERY attribute at once, not
 *            just the name. "welsh", "female", "scottish", "cartesia" each
 *            narrow; several terms narrow further, every term having to match
 *            somewhere. Case-insensitive, accent-insensitive, partial words.
 *
 *   CHIPS    the attributes on the row itself, so the list reads WITHOUT
 *            searching. Cartesia's 421 English voices arrive as forty bare
 *            first names — Skylar, Daniel, Gemma — and a name says nothing
 *            about whether it is the voice you want, so the only way to choose
 *            was to audition down the list. An attribute we hold and do not
 *            show is the whole defect.
 *
 * An attribute we do NOT hold says so on the row ("accent not listed") rather
 * than rendering a blank that reads as "none", and a search that matches
 * nothing says what it matched nothing against.
 *
 * Generic on purpose: the same control does Voice, Language and Course, because
 * "these long lists" was plural.
 */
import { ref, computed, watch, nextTick } from 'vue'
import { filterByAttributes } from '@/utils/attributeSearch'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  /**
   * [{ value, label, chips: [{ text, kind? }], group?, haystack: string, sub? }]
   * `haystack` is what the filter matches against — the caller builds it, because
   * only the caller knows which of its fields are worth searching.
   */
  options: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  /** Plural noun for the empty state: "No voices match…". */
  noun: { type: String, default: 'options' },
  placeholder: { type: String, default: 'Search…' },
  /** One line naming what is searchable, and what is missing from this list. */
  searchNote: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const query = ref('')
const active = ref(0)
const box = ref(null)
const field = ref(null)
const listEl = ref(null)

const filtered = computed(() => filterByAttributes(props.options, query.value))

/** Grouped for display, in the order the caller gave them. */
const groups = computed(() => {
  const map = new Map()
  for (const o of filtered.value) {
    const g = o.group || ''
    if (!map.has(g)) map.set(g, [])
    map.get(g).push(o)
  }
  return [...map.entries()].map(([name, list]) => ({ name, list }))
})

/** Flat order, which is what the arrow keys walk. */
const flat = computed(() => groups.value.flatMap((g) => g.list))

const selected = computed(() => props.options.find((o) => o.value === props.modelValue) || null)

watch(filtered, () => { active.value = 0 })

async function openList () {
  open.value = true
  query.value = ''
  active.value = Math.max(0, props.options.findIndex((o) => o.value === props.modelValue))
  await nextTick()
  field.value?.focus()
  scrollActive()
}

function close () { open.value = false }

function choose (o) {
  if (!o) return
  emit('update:modelValue', o.value)
  close()
}

function move (delta) {
  if (!flat.value.length) return
  active.value = (active.value + delta + flat.value.length) % flat.value.length
  scrollActive()
}

async function scrollActive () {
  await nextTick()
  listEl.value?.querySelector('.ss-row.on')?.scrollIntoView({ block: 'nearest' })
}

function onKey (e) {
  if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
  else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
  else if (e.key === 'Enter') { e.preventDefault(); choose(flat.value[active.value]) }
  else if (e.key === 'Escape') { e.preventDefault(); close() }
}

/**
 * Colour carries meaning, not decoration: the accent is the attribute the list
 * exists to make visible, an estate clone is a fact worth spotting, and an
 * attribute we do not hold is deliberately quiet and italic so it reads as
 * "not known" rather than as a value.
 */
function hue (c) {
  if (c.kind === 'accent') return 'ui-hue-info'
  if (c.kind === 'clone') return 'ui-hue-good'
  if (c.kind === 'missing') return 'ui-hue-quiet ss-missing'
  return 'ui-hue-quiet'
}

/** A click anywhere else closes it — the same affordance a native select has. */
function onBlur (e) {
  if (!box.value?.contains(e.relatedTarget)) close()
}
</script>

<template>
  <div ref="box" class="ss" @focusout="onBlur">
    <button type="button" class="ss-button" :aria-expanded="open" @click="open ? close() : openList()">
      <span class="ss-current">
        <span class="ss-current-name">{{ selected?.label || `Choose a ${noun.replace(/s$/, '')}…` }}</span>
        <span v-if="selected?.chips?.length" class="ss-chips">
          <span v-for="c in selected.chips" :key="c.text" class="ui-pill ss-chip" :class="hue(c)">{{ c.text }}</span>
        </span>
      </span>
      <span class="ss-caret" aria-hidden="true">▾</span>
    </button>

    <div v-if="open" class="ss-pop">
      <input
        ref="field"
        v-model="query"
        class="ui-search ss-search"
        type="text"
        spellcheck="false"
        autocomplete="off"
        :placeholder="placeholder"
        :aria-label="`Filter ${noun}`"
        @keydown="onKey"
      />
      <p v-if="searchNote" class="ss-note">{{ searchNote }}</p>

      <div ref="listEl" class="ss-list">
        <template v-for="g in groups" :key="g.name">
          <div v-if="g.name" class="ss-group">{{ g.name }}</div>
          <button
            v-for="o in g.list"
            :key="o.value"
            type="button"
            class="ss-row"
            :class="{ on: flat[active]?.value === o.value, sel: o.value === modelValue }"
            @mousemove="active = flat.findIndex((f) => f.value === o.value)"
            @click="choose(o)"
          >
            <span class="ss-row-name">{{ o.label }}</span>
            <span v-if="o.chips?.length" class="ss-chips">
              <span v-for="c in o.chips" :key="c.text" class="ui-pill ss-chip" :class="hue(c)">{{ c.text }}</span>
            </span>
          </button>
        </template>

        <p v-if="!flat.length" class="ss-empty">
          No {{ noun }} match <strong>{{ query.trim() }}</strong>.
        </p>
      </div>

      <p class="ui-count ss-count">{{ flat.length }} of {{ options.length }}</p>
    </div>
  </div>
</template>

<style scoped>
.ss { position: relative; min-width: 260px; }
.ss-button {
  width: 100%;
  display: flex; align-items: center; justify-content: space-between; gap: 0.6rem;
  background: var(--surface-2); border: 1px solid var(--surface-3); color: inherit;
  border-radius: 8px; padding: 0.6rem 0.7rem; font-size: 1rem; font-family: inherit;
  cursor: pointer; text-align: left;
}
.ss-current { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; min-width: 0; }
.ss-current-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ss-caret { color: var(--muted); font-size: 0.7rem; }

.ss-pop {
  position: absolute; z-index: 9999; top: calc(100% + 4px); left: 0;
  /* Wide enough for a row of chips, never wider than a phone. */
  width: 420px; max-width: calc(100vw - 2rem);
  background: var(--color-slate, var(--surface-2)); border: 1px solid var(--surface-3);
  border-radius: 10px; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5); padding: 0.5rem;
}
.ss-search { padding: 0.5rem 0.65rem; font-size: 0.9rem; }
.ss-note { color: var(--muted); font-size: 0.7rem; margin: 0.4rem 0.15rem 0; line-height: 1.45; }
.ss-list { max-height: 320px; overflow-y: auto; margin-top: 0.4rem; }
.ss-group {
  font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted);
  padding: 0.5rem 0.3rem 0.25rem; position: sticky; top: 0;
  background: var(--color-slate, var(--surface-2));
}
.ss-row {
  display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
  width: 100%; text-align: left; background: none; border: none; color: inherit;
  padding: 0.35rem 0.4rem; border-radius: 6px; cursor: pointer;
  font-size: 0.9rem; font-family: inherit;
}
.ss-row.on { background: var(--surface-2); }
.ss-row.sel .ss-row-name { color: var(--accent-2, #ec4899); }
.ss-row-name { flex: 0 1 auto; }
.ss-chips { display: flex; gap: 0.25rem; flex-wrap: wrap; }
.ss-chip { font-size: 0.66rem; letter-spacing: 0.02em; white-space: nowrap; border-width: 1px; border-style: solid; }
.ss-missing { font-style: italic; opacity: 0.75; }
.ss-empty { color: var(--muted); font-size: 0.82rem; padding: 0.75rem 0.4rem; margin: 0; line-height: 1.5; }
.ss-empty strong { color: inherit; }
.ss-count { display: block; margin: 0.35rem 0.2rem 0; text-align: right; }
</style>
