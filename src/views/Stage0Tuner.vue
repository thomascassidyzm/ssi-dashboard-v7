<template>
  <div class="stage0-tuner-page">
    <header class="s0-header">
      <nav class="s0-crumbs">
        <router-link to="/" class="crumb-link">Home</router-link>
        <span class="crumb-sep">/</span>
        <router-link :to="{ name: 'ListeningAdmin' }" class="crumb-link">Listening Config</router-link>
        <span class="crumb-sep">/</span>
        <span class="crumb-here">Stage 0 Tuner</span>
      </nav>
      <a class="s0-open" href="/stage0-tuner.html" target="_blank" rel="noopener">Open in full tab ↗</a>
    </header>
    <iframe class="s0-frame" src="/stage0-tuner.html" title="Stage 0 Tuner" allow="autoplay"></iframe>
  </div>
</template>

<script setup>
// Thin wrapper around the self-contained Stage 0 tuner (public/stage0-tuner.html).
// The tuner is vanilla JS + Web Audio with base64-embedded 192k audio; we host it
// as a static asset and frame it so it lives as a real, addressable in-app page.
// The breadcrumb mirrors the Listening Pods nav (Home / Listening Config / Stage 0
// Tuner) so there's always a path back to the dashboard and the Listening Config.
</script>

<style scoped>
.stage0-tuner-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--canvas);
}
.s0-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  height: 56px;
  padding: 0 1.25rem;
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}
.s0-crumbs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  min-width: 0;
}
.s0-crumbs .crumb-link { color: var(--accent-2); text-decoration: none; white-space: nowrap; }
.s0-crumbs .crumb-link:hover { color: #6ee7b7; }
:root[data-theme="light"] .s0-crumbs .crumb-link:hover { color: var(--success); }
.s0-crumbs .crumb-sep { color: var(--faint); }
.s0-crumbs .crumb-here { color: var(--muted); white-space: nowrap; }
.s0-open {
  margin-left: auto;
  font-family: ui-monospace, "IBM Plex Mono", Menlo, monospace;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--accent);
  text-decoration: none;
  white-space: nowrap;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  transition: border-color 0.15s, color 0.15s;
}
.s0-open:hover { border-color: var(--accent); color: var(--ink); }
.s0-frame {
  flex: 1 1 auto;
  width: 100%;
  border: 0;
  background: var(--canvas);
}
</style>
