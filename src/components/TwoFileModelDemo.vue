<!--
  Stage-0 tuner — embedded in the Listening Config admin (Tom 2026-06-13).
  The full self-contained tuner (speed ramp, timing sliders, fusion gaps,
  T·M·T·T pattern, per-tier visits, exposures, config export) with a
  language/example picker (Irish · Azure, Croatian · Azure, Spanish · xAI).
  Hosted as a static page at public/stage0-tuner.html; embedded here and
  also openable full-screen. Spec: docs/pods/stage0-explainer-ladder-SPEC.md
-->
<template>
  <section class="config-row stage0-tuner-embed">
    <div class="st-head">
      <h2>Stage-0 tuner <span class="st-badge">playground</span></h2>
      <p class="st-intro">
        One pod sentence introduced across gentle exposures — atoms fusing tighter within each
        intention until each intention plays as its own natural take. Tune the timing, the speed
        ramp, the fusion gaps and the structure by ear, switch between language examples
        (Irish · Azure, Croatian · Azure, Spanish · xAI), then export the config.
      </p>
      <a class="st-fullscreen" href="/stage0-tuner.html" target="_blank" rel="noopener">
        Open full-screen ↗
      </a>
    </div>
    <div class="st-frame-wrap">
      <iframe
        class="st-frame"
        src="/stage0-tuner.html"
        title="Stage-0 tuner"
        loading="lazy"
      ></iframe>
    </div>
  </section>
</template>

<script setup>
// Pure embed — the tuner is a self-contained static page under public/.
</script>

<style scoped>
.stage0-tuner-embed { display: flex; flex-direction: column; gap: 0.9rem; }
.st-head h2 { margin: 0 0 0.4rem; display: flex; align-items: center; gap: 0.6rem; }
.st-badge {
  font-size: 0.7rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
  background: rgba(251, 146, 60, 0.15); color: #fdba74;
  border: 1px solid rgba(251, 146, 60, 0.3); border-radius: 999px; padding: 2px 9px;
}
.st-intro {
  margin: 0 0 0.5rem; color: var(--color-paper-dim, #94a3b8);
  font-size: 0.85rem; line-height: 1.55; max-width: 820px;
}
.st-fullscreen {
  display: inline-block; font-size: 0.8rem; font-weight: 600; color: #fdba74;
  text-decoration: none; border: 1px solid rgba(251, 146, 60, 0.3);
  border-radius: 8px; padding: 5px 12px;
}
.st-fullscreen:hover { background: rgba(251, 146, 60, 0.1); }
.st-frame-wrap {
  border: 1px solid var(--color-graphite, #334155); border-radius: 12px;
  overflow: hidden; background: #efe9e1;
}
.st-frame { display: block; width: 100%; height: 1500px; border: 0; }
</style>
