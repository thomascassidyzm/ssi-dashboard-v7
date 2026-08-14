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
  color: #00ff88;
  background: rgba(0, 255, 136, 0.08);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 4px;
  z-index: 9999;
  pointer-events: none;
  text-shadow: 0 0 8px rgba(0, 255, 136, 0.6);
  box-shadow: 0 0 12px rgba(0, 255, 136, 0.15);
}

/* Light mode: the neon-green-on-black build label washes out on a light canvas
   (#00ff88 on ~#eef2f6 ≈ 1.19:1). Re-tone to the green accent token (legible,
   same hue family) and drop the dark-mode glow. Dark mode is untouched. */
:root[data-theme="light"] .build-label {
  color: var(--accent-2);
  background: var(--surface);
  border-color: var(--line);
  text-shadow: none;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
}
</style>
