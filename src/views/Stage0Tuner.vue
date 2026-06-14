<template>
  <div class="stage0-tuner-page">
    <header class="s0-header">
      <router-link class="s0-back" :to="{ name: 'ListeningAdmin' }" title="Back to Listening Config">←</router-link>
      <div class="s0-titles">
        <h1>Stage 0 Tuner</h1>
        <p class="s0-sub">Pod-sentence first-exposure introduction — tune the ladder, gaps and repeats by ear, then export the config.</p>
      </div>
      <a class="s0-open" href="/stage0-tuner.html" target="_blank" rel="noopener">Open in full tab ↗</a>
    </header>
    <iframe class="s0-frame" src="/stage0-tuner.html" title="Stage 0 Tuner" allow="autoplay"></iframe>
  </div>
</template>

<script setup>
// Thin wrapper around the self-contained Stage 0 tuner (public/stage0-tuner.html).
// The tuner is vanilla JS + Web Audio with base64-embedded 192k audio; we host it
// as a static asset and frame it so it lives as a real, addressable in-app page.
// Audio unlock works because the Play gesture happens inside the same-origin frame.
</script>

<style scoped>
.stage0-tuner-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #0f172a;
}
.s0-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  height: 56px;
  padding: 0 1.25rem;
  background: #1e293b;
  border-bottom: 1px solid #475569;
}
.s0-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #475569;
  color: #94a3b8;
  text-decoration: none;
  font-size: 1.1rem;
  line-height: 1;
  transition: border-color 0.15s, color 0.15s;
}
.s0-back:hover { border-color: #ffa630; color: #f7f7f2; }
.s0-titles { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.s0-titles h1 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #f7f7f2;
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
}
.s0-sub {
  margin: 0;
  font-size: 0.72rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.s0-open {
  margin-left: auto;
  font-family: ui-monospace, "IBM Plex Mono", Menlo, monospace;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #ffa630;
  text-decoration: none;
  white-space: nowrap;
  border: 1px solid #475569;
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  transition: border-color 0.15s, color 0.15s;
}
.s0-open:hover { border-color: #ffa630; color: #f7f7f2; }
.s0-frame {
  flex: 1 1 auto;
  width: 100%;
  border: 0;
  background: #0f172a;
}
</style>
