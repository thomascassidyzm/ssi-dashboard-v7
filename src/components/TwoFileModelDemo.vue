<!--
  Two-file intention model — listening-audio playground (Tom 2026-06-13).
  A reference demo embedded in the Listening Config admin: explains the
  validated Stage-0 audio model and lets you hear it. Clips are static
  assets under public/listening-demo/ (xAI Spanish, voice yis75yfp).
  Spec: docs/pods/stage0-explainer-ladder-SPEC.md
-->
<template>
  <section class="config-row two-file-demo">
    <div class="tf-head">
      <h2>The two-file intention model <span class="tf-badge">xAI Spanish</span></h2>
      <p class="tf-intro">
        Each intention is recorded as <strong>two files</strong>: <em>File 1</em> (natural
        conversation speed) and <em>File 2</em> (slower, with recorded gaps at the atom
        seams). Early tiers derive from File 2; the final tier is File 1; a speed ramp
        bridges. Atoms are sliced from File 2's clean gap-seams, never synthesized alone.
        Voice: xAI clone <code>yis75yfp</code>.
      </p>
      <p class="tf-intro tf-fix">
        <strong>End-chop fix</strong> (this build): atom slicing now trims only the dead
        silence before a word and keeps the word's natural decay tail (~150–230&nbsp;ms of
        fade). The old slicer cut into the decay — hear it in the A/B at the bottom: the
        final atom now finishes the word instead of clipping it.
      </p>
    </div>

    <div v-for="ex in examples" :key="ex.id" class="tf-example">
      <div class="tf-example-title">
        <span class="tf-target">{{ ex.target }}</span>
        <span class="tf-gloss">{{ ex.gloss }}</span>
      </div>
      <div class="tf-clips">
        <div v-for="clip in ex.clips" :key="clip.src" class="tf-clip">
          <div class="tf-clip-label">{{ clip.label }}</div>
          <div class="tf-clip-desc">{{ clip.desc }}</div>
          <audio controls preload="none" :src="clip.src"></audio>
        </div>
      </div>
    </div>

    <div class="tf-ab">
      <div class="tf-ab-title">End-chop A/B — the same word, "gracias"</div>
      <div class="tf-clips">
        <div class="tf-clip tf-clip-old">
          <div class="tf-clip-label">Before — clipped</div>
          <div class="tf-clip-desc">cut while the word is still sounding</div>
          <audio controls preload="none" src="/listening-demo/Spanish-atom-gracias.mp3"></audio>
        </div>
        <div class="tf-clip tf-clip-new">
          <div class="tf-clip-label">After — natural decay kept</div>
          <div class="tf-clip-desc">fades to silence; the word finishes</div>
          <audio controls preload="none" src="/listening-demo/Spanish-atom-gracias-FIXED.mp3"></audio>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const BASE = '/listening-demo/'
const examples = [
  {
    id: 'A',
    target: '¿Vas a la fiesta mañana?',
    gloss: 'are you going to the party tomorrow? — 3 parts',
    clips: [
      { label: 'File 1 — natural', desc: 'bona-fide conversation speed', src: BASE + 'Spanish-A-party-natural.mp3' },
      { label: 'File 2 — slow + recorded gaps', desc: 'the source for every chunked tier', src: BASE + 'Spanish-A-party-slowgapped.mp3' },
      { label: 'Ladder', desc: 'atoms → fused → natural', src: BASE + 'Spanish-A-party-ladder.mp3' },
      { label: 'Atom from File 2', desc: '"mañana" sliced — natural tail kept', src: BASE + 'Spanish-A-party-atom-manana.mp3' },
    ],
  },
  {
    id: 'B',
    target: 'Hola, ¿qué tal te va el día hoy?',
    gloss: "hi there, how's your day going today? — 4 parts",
    clips: [
      { label: 'File 1 — natural', desc: 'bona-fide conversation speed', src: BASE + 'Spanish-B-day-natural.mp3' },
      { label: 'File 2 — slow + recorded gaps', desc: 'four atoms, clean recorded seams', src: BASE + 'Spanish-B-day-slowgapped.mp3' },
      { label: 'Ladder', desc: '4 atoms → 2 pairs → whole', src: BASE + 'Spanish-B-day-ladder.mp3' },
      { label: 'Atom from File 2', desc: '"hoy" sliced — natural tail kept', src: BASE + 'Spanish-B-day-atom-hoy.mp3' },
    ],
  },
]
</script>

<style scoped>
.two-file-demo { display: flex; flex-direction: column; gap: 1.1rem; }
.tf-head h2 { margin: 0 0 0.5rem; display: flex; align-items: center; gap: 0.6rem; }
.tf-badge {
  font-size: 0.7rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
  background: rgba(251, 146, 60, 0.15); color: #fdba74;
  border: 1px solid rgba(251, 146, 60, 0.3); border-radius: 999px; padding: 2px 9px;
}
.tf-intro {
  margin: 0 0 0.5rem; color: var(--color-paper-dim, #94a3b8);
  font-size: 0.85rem; line-height: 1.55; max-width: 760px;
}
.tf-intro code { font-size: 0.8em; background: rgba(255,255,255,0.06); padding: 1px 5px; border-radius: 4px; }
.tf-intro em { color: var(--color-paper, #f7f7f2); font-style: normal; font-weight: 600; }
.tf-fix { border-left: 2px solid rgba(251,146,60,0.4); padding-left: 0.7rem; }

.tf-example {
  background: rgba(255, 255, 255, 0.025); border: 1px solid var(--color-graphite, #334155);
  border-radius: 10px; padding: 0.9rem 1rem;
}
.tf-example-title { display: flex; flex-direction: column; gap: 1px; margin-bottom: 0.75rem; }
.tf-target { font-size: 1.05rem; font-weight: 650; color: var(--color-paper, #f7f7f2); }
.tf-gloss { font-size: 0.8rem; color: var(--color-paper-dim, #94a3b8); }

.tf-clips { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 0.7rem; }
.tf-clip {
  background: rgba(255, 255, 255, 0.03); border: 1px solid var(--color-graphite, #334155);
  border-radius: 8px; padding: 0.65rem 0.7rem;
}
.tf-clip-label { font-size: 0.82rem; font-weight: 600; color: var(--color-paper, #f7f7f2); }
.tf-clip-desc { font-size: 0.72rem; color: var(--color-paper-dim, #94a3b8); margin: 1px 0 0.5rem; }
.tf-clip audio { width: 100%; height: 34px; }

.tf-ab { margin-top: 0.3rem; }
.tf-ab-title { font-size: 0.85rem; font-weight: 600; color: var(--color-paper, #f7f7f2); margin-bottom: 0.6rem; }
.tf-clip-old { border-color: rgba(248, 113, 113, 0.35); }
.tf-clip-new { border-color: rgba(74, 222, 128, 0.35); }
</style>
