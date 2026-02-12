<template>
  <div class="docs-layout">
    <main class="docs-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.docs-layout {
  min-height: 100vh;
  background: #0f172a;
  color: #f1f5f9;
}

.docs-content {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
