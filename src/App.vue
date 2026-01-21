<template>
  <!-- Global Environment Switcher - always visible -->
  <div class="env-switcher-bar">
    <EnvironmentSwitcher />
  </div>

  <router-view />

  <div class="build-label">
    {{ gitCommit }}
  </div>
</template>

<script setup>
import EnvironmentSwitcher from './components/EnvironmentSwitcher.vue'

const gitCommit = __GIT_COMMIT__

// Clean v7.0 build with Vue Router
console.log(`🚀 SSi Dashboard ${gitCommit} - Clean Build`)
</script>

<style scoped>
.env-switcher-bar {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 9999;
  background: rgba(15, 23, 42, 0.9);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(100, 116, 139, 0.3);
  backdrop-filter: blur(8px);
}

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
