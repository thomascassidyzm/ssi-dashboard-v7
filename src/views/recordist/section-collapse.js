// src/views/recordist/section-collapse.js
//
// WHICH SECTIONS ARE OPEN — ONE COPY, THREE LISTS.
//
// Tom, 2026-09-04, looking at "See every line (769)" opened to 769 rows in one
// scroll: "the same logic shoudl apply to the see all my lines I think — I
// think that would be clearer". The collapse had been written inline in
// RecordistRoom for the already-recorded list the day before; a second inline
// copy in the roster is how the two halves of this screen come to disagree the
// next time a section is renamed or the affordance changes. So the state moved
// here and both lists ask the same object.
//
// It knows NOTHING about section names, order, headings or what a KIND of line
// is: the queue owns all of that (rosterSections / kindWords in
// RecordistRoom.vue) and there is exactly one copy of the strings "POD-1",
// "SENEDD" and "NEW SEEDS" in this estate. This file holds a set of keys.
//
// TWO RULES IT EXISTS TO KEEP:
//   • ALL SHUT WHEN THE LIST OPENS. The point of sections is that the panel is
//     short; a heading he has not asked to open showing its rows is the flat
//     list again with extra steps.
//   • A SEARCH NEVER HIDES ITS OWN ANSWER. A section carrying `forceOpen` (the
//     grouping module sets it while a filter is running) reads as open without
//     touching his taps, so clearing the search puts the panel back the way he
//     left it rather than slamming everything shut underneath him.

import { ref } from 'vue'

/**
 * @returns {{
 *   openKeys: import('vue').Ref<Set<string>>,
 *   isOpen: (section: {key: string, forceOpen?: boolean}) => boolean,
 *   toggle: (key: string) => void,
 *   openFor: (key: string) => void,
 *   closeAll: () => void,
 * }}
 */
export function useSectionCollapse() {
  const openKeys = ref(new Set())

  function isOpen(section) {
    if (!section) return false
    return Boolean(section.forceOpen) || openKeys.value.has(section.key)
  }

  // A new Set each time rather than mutating in place: Vue's reactivity does not
  // see set.add(), and a heading that does not repaint when it is tapped reads
  // as a dead control.
  function toggle(key) {
    const next = new Set(openKeys.value)
    if (next.has(key)) next.delete(key); else next.add(key)
    openKeys.value = next
  }

  // Open one section WITHOUT closing the others: this is used when something
  // outside the list needs a particular row on screen (an edit begun from the
  // grid above), and shutting the section he was reading to do it would be a
  // second surprise on top of the first.
  function openFor(key) {
    if (openKeys.value.has(key)) return
    const next = new Set(openKeys.value)
    next.add(key)
    openKeys.value = next
  }

  function closeAll() {
    if (openKeys.value.size) openKeys.value = new Set()
  }

  return { openKeys, isOpen, toggle, openFor, closeAll }
}
