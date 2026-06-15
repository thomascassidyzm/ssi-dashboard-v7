<template>
  <AppNavbar />
  <router-view />

  <!-- Light/dark theme toggle. Floats top-right so it's reachable on every page incl. login. -->
  <button class="theme-toggle" type="button" @click="toggleTheme" :title="`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`">
    <span class="theme-toggle__icon">{{ theme === 'light' ? '🌙' : '☀️' }}</span>
    <span class="theme-toggle__label">{{ theme === 'light' ? 'Dark' : 'Light' }} mode</span>
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
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 9999px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
  z-index: 10000;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}
.theme-toggle:hover { background: var(--surface-2); }
.theme-toggle__icon { font-size: 15px; line-height: 1; }

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
