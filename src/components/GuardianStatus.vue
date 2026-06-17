<template>
  <div class="guardian-status" aria-live="polite">
    <!-- URGENT lane — needs-attention-now (e.g. unresolved ZUT). Top banner. -->
    <div v-if="urgent.length" class="guardian-urgent">
      <div v-for="u in urgent" :key="u.id" class="urgent-card">
        <span class="urgent-icon">🔴</span>
        <div class="urgent-body">
          <div class="urgent-title">Needs your call — {{ u.courseCode }} · {{ u.ref }}</div>
          <div v-for="(f, i) in u.flags" :key="i" class="urgent-msg">{{ f.message }}</div>
        </div>
        <button class="urgent-dismiss" title="Dismiss" @click="dismissUrgent(u.id)">×</button>
      </div>
    </div>

    <!-- Inline review toasts — one per in-flight / just-finished edit. -->
    <div class="guardian-toasts">
      <div
        v-for="(r, key) in active"
        :key="key"
        class="guardian-toast"
        :class="toastClass(r)"
      >
        <span class="toast-spinner" v-if="!r.outcome" />
        <span class="toast-mark" v-else>{{ r.outcome === 'accepted' ? '✓' : '⚠' }}</span>
        <div class="toast-body">
          <div class="toast-label">{{ r.label }}</div>
          <div class="toast-meta">{{ r.courseCode }} · {{ r.ref }}<template v-if="r.outcome === 'accepted' && r.autoFixed"> · {{ r.autoFixed }} fix{{ r.autoFixed === 1 ? '' : 'es' }} applied</template></div>
          <div v-if="r.outcome === 'flagged' && r.flags && r.flags.length" class="toast-flags">
            <div v-for="(f, i) in r.flags.slice(0, 3)" :key="i" class="toast-flag" :class="'sev-' + (f.severity || 'warn')">{{ f.message }}</div>
          </div>
        </div>
        <button v-if="r.outcome" class="toast-dismiss" title="Dismiss" @click="dismiss(key)">×</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useGuardian } from '@/composables/useGuardian'

const { active, urgent, dismiss, dismissUrgent } = useGuardian()

function toastClass(r) {
  if (r.outcome === 'accepted') return 'is-accepted'
  if (r.outcome === 'flagged') return 'is-flagged'
  return 'is-working'
}
</script>

<style scoped>
.guardian-status { position: fixed; z-index: 9999; pointer-events: none; inset: 0; }
.guardian-status > * { pointer-events: auto; }

/* urgent lane — top center */
.guardian-urgent {
  position: fixed; top: 12px; left: 50%; transform: translateX(-50%);
  display: flex; flex-direction: column; gap: 8px; max-width: 560px; width: calc(100% - 32px);
}
.urgent-card {
  display: flex; gap: 10px; align-items: flex-start;
  background: #2a1212; border: 1px solid #b03636; border-left: 4px solid #e04545;
  color: #ffd9d9; border-radius: 8px; padding: 10px 12px; box-shadow: 0 6px 20px rgba(0,0,0,.35);
}
.urgent-icon { font-size: 13px; line-height: 20px; }
.urgent-body { flex: 1; min-width: 0; }
.urgent-title { font-weight: 600; font-size: 13px; color: #ffecec; }
.urgent-msg { font-size: 12px; opacity: .9; margin-top: 2px; }
.urgent-dismiss { background: none; border: none; color: #ffd9d9; font-size: 18px; cursor: pointer; line-height: 1; }

/* inline toasts — bottom right */
.guardian-toasts {
  position: fixed; bottom: 16px; right: 16px;
  display: flex; flex-direction: column; gap: 8px; max-width: 360px;
}
.guardian-toast {
  display: flex; gap: 10px; align-items: flex-start;
  background: #1c1f26; border: 1px solid #2e3340; color: #d7dbe3;
  border-radius: 8px; padding: 10px 12px; box-shadow: 0 6px 20px rgba(0,0,0,.3);
  font-size: 13px; animation: guardian-in .18s ease-out;
}
.guardian-toast.is-working { border-left: 3px solid #4a90d9; }
.guardian-toast.is-accepted { border-left: 3px solid #43b581; }
.guardian-toast.is-flagged { border-left: 3px solid #e0a23a; }
.toast-body { flex: 1; min-width: 0; }
.toast-label { font-weight: 600; }
.toast-meta { font-size: 11px; opacity: .6; margin-top: 1px; }
.toast-flags { margin-top: 6px; display: flex; flex-direction: column; gap: 3px; }
.toast-flag { font-size: 11px; padding: 3px 6px; border-radius: 4px; background: #262b34; }
.toast-flag.sev-block, .toast-flag.sev-urgent { background: #3a2020; color: #ffbcbc; }
.toast-flag.sev-warn { background: #332b1a; color: #ffe0a8; }
.toast-dismiss { background: none; border: none; color: #8a909c; font-size: 16px; cursor: pointer; line-height: 1; }
.toast-mark { font-weight: 700; }
.guardian-toast.is-accepted .toast-mark { color: #43b581; }
.guardian-toast.is-flagged .toast-mark { color: #e0a23a; }
.toast-spinner {
  width: 13px; height: 13px; margin-top: 2px; border-radius: 50%;
  border: 2px solid #3a4150; border-top-color: #4a90d9; animation: guardian-spin .8s linear infinite;
}
@keyframes guardian-spin { to { transform: rotate(360deg); } }
@keyframes guardian-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
</style>
