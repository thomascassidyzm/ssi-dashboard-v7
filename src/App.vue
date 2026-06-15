<template>
  <AppNavbar />
  <router-view />

  <!-- Light/dark theme toggle (prototype). Floats so it's reachable on every page. -->
  <button class="theme-toggle" type="button" @click="toggleTheme" :title="`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`">
    {{ theme === 'light' ? '🌙' : '☀️' }}
  </button>

  <div class="build-label">
    {{ gitCommit }}
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppNavbar from './components/AppNavbar.vue'

const gitCommit = __GIT_COMMIT__

// Theme: 'dark' (default) | 'light'. Persisted; applied on <html data-theme>.
const theme = ref(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark')
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  if (theme.value === 'light') document.documentElement.dataset.theme = 'light'
  else delete document.documentElement.dataset.theme
  try { localStorage.setItem('popty-theme', theme.value) } catch { /* private mode */ }
}
</script>

<style scoped>
.theme-toggle {
  position: fixed;
  top: 12px;
  right: 12px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border-radius: 9999px;
  border: 1px solid var(--line);
  background: var(--surface);
  cursor: pointer;
  z-index: 10000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
.theme-toggle:hover { background: var(--surface-2); }

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
</style>
