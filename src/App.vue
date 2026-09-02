<template>
  <AppNavbar />
  <router-view />

  <!-- Theme toggle now lives in the account menu (AppNavbar) — see ThemeToggle item there. -->
  <!-- The build sha is for us, not for a recordist. On a public surface it is
       one more piece of internal bookkeeping on a human's screen, which is the
       whole thing Tom asked us to take off it. -->
  <div v-if="!route.meta.public" class="build-label">
    {{ gitCommit }}
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router'
import AppNavbar from './components/AppNavbar.vue'

const route = useRoute()
const gitCommit = __GIT_COMMIT__
</script>

<style scoped>
.build-label {
  position: fixed;
  bottom: 12px;
  right: 12px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  font-family: monospace;
  /* Neon green here was the loudest colour on every screen and it measured
     nothing — it is a build sha. Ink and grey (Tom, 2026-09-02). */
  color: var(--muted);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
  z-index: 9999;
  pointer-events: none;
  text-shadow: none;
  box-shadow: none;
}

/* Light mode carries the same grey treatment as dark, minus the dark canvas.
   (This used to re-tone a neon green that was itself the problem: a build sha
   was the loudest thing on every screen and it measured nothing.) */
:root[data-theme="light"] .build-label {
  color: var(--muted);
  background: var(--surface);
  border-color: var(--line);
  text-shadow: none;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
}
</style>
