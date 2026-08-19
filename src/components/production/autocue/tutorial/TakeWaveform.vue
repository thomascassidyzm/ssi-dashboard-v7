<template>
  <canvas ref="canvasRef" class="take-waveform"></canvas>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { SPLICE_CONFIG } from '@/utils/takeSplice'

/**
 * The one thing the real recorder does NOT have: the recordist's own take with
 * the cut lines drawn on it.
 *
 * The real review screen (SegmentCard.vue) paints eight decorative bars whose
 * heights come from a hash of the segment id — it is a placeholder, not a
 * picture of the audio. The tutorial's whole teaching moment is SEEING where
 * the splitter cut, so this component draws the actual PCM and the actual
 * region boundaries `detectVoicedRegions()` returned. It is an ADDITION to the
 * real surface, not a fork of anything in it.
 */
const props = defineProps({
  samples: { type: Object, required: true },      // Float32Array
  sampleRate: { type: Number, required: true },
  regions: { type: Array, default: () => [] },    // [{ startMs, endMs }]
})

const canvasRef = ref(null)

function paint() {
  const canvas = canvasRef.value
  if (!canvas || !props.samples?.length) return

  const dpr = window.devicePixelRatio || 1
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  if (!w || !h) return
  canvas.width = w * dpr
  canvas.height = h * dpr
  const g = canvas.getContext('2d')
  g.setTransform(dpr, 0, 0, dpr, 0, 0)
  g.clearRect(0, 0, w, h)

  // Read the live theme tokens so the drawing follows light/dark like every
  // other surface in the studio, instead of baking two palettes in here.
  const cs = getComputedStyle(canvas)
  const keep = cs.getPropertyValue('--color-emerald').trim() || '#06ffa5'
  const wave = cs.getPropertyValue('--muted').trim() || '#94a3b8'

  const durMs = (props.samples.length / props.sampleRate) * 1000
  const x = (ms) => (ms / durMs) * w

  // The kept pieces, behind the waveform — padded exactly as sliceChunk() pads.
  g.fillStyle = keep
  g.globalAlpha = 0.16
  for (const r of props.regions) {
    const pad = SPLICE_CONFIG.PAD_MS
    const a = x(r.startMs - pad)
    g.fillRect(a, 0, Math.max(2, x(r.endMs + pad) - a), h)
  }
  g.globalAlpha = 1

  // Peak envelope, one column per CSS pixel.
  g.fillStyle = wave
  const per = Math.max(1, Math.floor(props.samples.length / w))
  for (let px = 0; px < w; px++) {
    let mx = 0
    const o = px * per
    for (let i = 0; i < per && o + i < props.samples.length; i++) {
      const a = Math.abs(props.samples[o + i])
      if (a > mx) mx = a
    }
    const bh = Math.max(1, mx * (h * 0.92))
    g.fillRect(px, (h - bh) / 2, 1, bh)
  }

  // The cuts themselves.
  g.strokeStyle = keep
  g.lineWidth = 1
  for (const r of props.regions) {
    for (const ms of [r.startMs, r.endMs]) {
      g.beginPath()
      g.moveTo(x(ms), 0)
      g.lineTo(x(ms), h)
      g.stroke()
    }
  }
}

// Canvas is sized in CSS pixels, so a rotation or a resize needs a repaint.
onMounted(() => {
  paint()
  window.addEventListener('resize', paint)
})
onUnmounted(() => window.removeEventListener('resize', paint))
watch(() => [props.samples, props.regions], paint, { deep: false })
</script>

<style scoped>
.take-waveform {
  display: block;
  width: 100%;
  height: 96px;
  background: var(--color-void, var(--canvas));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px;
}

:root[data-theme="light"] .take-waveform {
  border-color: var(--line);
}
</style>
