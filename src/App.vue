<template>
  <!-- Global Nav Bar -->
  <div class="global-nav">
    <EnvironmentSwitcher />
    <CourseSelector />
  </div>

  <router-view />

  <div class="build-label">
    {{ gitCommit }}
  </div>
</template>

<script setup>
import EnvironmentSwitcher from './components/EnvironmentSwitcher.vue'
import CourseSelector from './components/CourseSelector.vue'

const gitCommit = __GIT_COMMIT__

// Clean v7.0 build with Vue Router
console.log(`🚀 SSi Dashboard ${gitCommit} - Clean Build`)
</script>

<style scoped>
.global-nav {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(15, 23, 42, 0.95);
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(100, 116, 139, 0.3);
  backdrop-filter: blur(12px);
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
