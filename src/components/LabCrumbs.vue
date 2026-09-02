<script setup>
/**
 * LabCrumbs — the one breadcrumb component for every Lab page.
 *
 * Markup and classes are lifted verbatim from VoiceLab.vue's `.admin-crumbs`
 * nav (the reference template) so pages that already used that pattern render
 * byte-identically before and after adopting this component. `trail` is a
 * list of `{ label, to }`; the last entry renders as the current page
 * (`.crumb-here`) regardless of whether it carries a `to`.
 */
defineProps({
  trail: { type: Array, required: true },
})
</script>

<template>
  <nav class="admin-crumbs">
    <template v-for="(item, i) in trail" :key="item.label">
      <router-link v-if="i < trail.length - 1 && item.to" :to="item.to" class="crumb-link">{{ item.label }}</router-link>
      <span v-else class="crumb-here">{{ item.label }}</span>
      <span v-if="i < trail.length - 1" class="crumb-sep">/</span>
    </template>
  </nav>
</template>

<style scoped>
.admin-crumbs { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8125rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
.crumb-link { color: var(--accent-2); text-decoration: none; }
.crumb-link:hover { color: #6ee7b7; }
.crumb-sep, .crumb-here { color: var(--muted); }
[data-theme="light"] .crumb-link:hover { color: var(--accent-2); }
</style>
