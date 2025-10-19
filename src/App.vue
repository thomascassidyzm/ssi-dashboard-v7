<template>
  <router-view />
  <div class="build-label">
    {{ gitCommit }}
  </div>
</template>

<script setup>
const gitCommit = __GIT_COMMIT__

// Clean v7.0 build with Vue Router
console.log(`🚀 SSi Dashboard ${gitCommit} - Clean Build`)
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
</style>
