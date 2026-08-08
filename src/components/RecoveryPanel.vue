<template>
  <section class="recovery-panel">
    <h2 class="section-title">Backend recovery</h2>
    <p class="section-blurb">
      What to do when popty.app's <strong>backend</strong> goes down (the site
      itself is on Vercel and stays up; the SSi Machine behind the ngrok tunnel
      is what fails). This page is served from Vercel, so it stays reachable
      <em>during</em> an outage — keep the steps here, not on the machine. Live
      health re-checks every 30s.
    </p>

    <!-- ─────────────── Live status ─────────────── -->
    <div class="status-card" :class="`status-${health}`">
      <span class="status-dot" :class="`dot-${health}`"></span>
      <div class="status-text">
        <div class="status-headline">
          <template v-if="health === 'up'">Backend is UP — /health responding</template>
          <template v-else-if="health === 'down'">Backend is DOWN — no response from /health</template>
          <template v-else-if="health === 'checking'">Checking backend…</template>
        </div>
        <div class="status-sub">
          Target: <code>{{ healthUrl }}</code>
          <span v-if="lastCheckedLabel"> · checked {{ lastCheckedLabel }}</span>
          <span v-if="health === 'down' && lastError"> · {{ lastError }}</span>
        </div>
      </div>
      <button class="recheck-btn" :disabled="health === 'checking'" @click="checkHealth">
        {{ health === 'checking' ? 'Checking…' : 'Re-check' }}
      </button>
    </div>

    <!-- ─────────────── Recovery steps ─────────────── -->
    <ol class="steps">
      <li>
        <div class="step-head">Restart everything (fixes most outages)</div>
        <p class="step-body">
          From a laptop/phone on the Tailscale tailnet, open a terminal:
        </p>
        <CopyLine :text="`ssh tomcassidy@toms-air`" />
        <p class="step-note">enter your Mac login password, then:</p>
        <CopyLine :text="`pm2 restart all`" />
        <p class="step-note">Wait ~10s and re-check above. This restarts the app <em>and</em> the ngrok tunnel.</p>
      </li>

      <li>
        <div class="step-head">Still down? Diagnose (same SSH session)</div>
        <CopyLine :text="`pm2 list`" />
        <CopyLine :text="`curl -s -o /dev/null -w &quot;%{http_code}\\n&quot; http://localhost:3470/health`" />
        <CopyLine :text="`pm2 logs production-api --err --lines 30`" />
        <ul class="branch">
          <li><strong>/health = 200</strong> but site still down → it's the tunnel: <code>pm2 restart ngrok</code></li>
          <li><strong>/health ≠ 200</strong> → it's the app: <code>pm2 restart production-api</code> (the watchdog also auto-fixes app crashes within ~3 min)</li>
        </ul>
      </li>

      <li>
        <div class="step-head">Can't even SSH in?</div>
        <p class="step-body">
          It's a network/power problem at the machine itself (the SSi Machine is
          Tom's MacBook Air, "Toms-Air"). Go to it physically, open Terminal, run:
        </p>
        <CopyLine :text="`pm2 restart all`" />
      </li>
    </ol>

    <div class="notes">
      <div class="notes-title">Notes</div>
      <ul>
        <li><code>toms-air</code> is the machine's Tailscale name. If it fails, use the IP <code>100.126.253.11</code>.</li>
        <li>A watchdog runs every 60s and auto-restarts the app if it crashes — often you just wait 2–3 min and re-check first.</li>
        <li>Off-machine copy of these steps (Google Doc): <a :href="docUrl" target="_blank" rel="noopener">popty.app — EMERGENCY RECOVERY</a>.</li>
      </ul>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, h } from 'vue'
import { getApiUrl } from '../services/api'

// Small inline component for a monospace command row with a copy button.
const CopyLine = {
  props: { text: { type: String, required: true } },
  setup(props) {
    const copied = ref(false)
    async function copy() {
      try {
        await navigator.clipboard.writeText(props.text)
        copied.value = true
        setTimeout(() => { copied.value = false }, 1500)
      } catch (_) { /* clipboard blocked — user can select manually */ }
    }
    return () => h('div', { class: 'copy-line' }, [
      h('code', { class: 'copy-code' }, props.text),
      h('button', { class: 'copy-btn', onClick: copy }, copied.value ? 'Copied' : 'Copy')
    ])
  }
}

const docUrl = 'https://docs.google.com/document/d/1tm3PDsR0gxk2OIQSflVPtfWgILXO4xNdlOl6qW5OvWQ/edit'

const health = ref('checking')   // 'checking' | 'up' | 'down'
const lastError = ref('')
const lastCheckedAt = ref(null)
const lastCheckedLabel = ref('')

const healthUrl = (() => {
  const base = getApiUrl() || 'https://watson-1.tail4968cb.ts.net:8443'
  return `${base.replace(/\/$/, '')}/health`
})()

let pollTimer = null

async function checkHealth() {
  health.value = 'checking'
  lastError.value = ''
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 8000)
  try {
    const r = await fetch(healthUrl, {
      method: 'GET',
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    health.value = r.ok ? 'up' : 'down'
    if (!r.ok) lastError.value = `HTTP ${r.status}`
  } catch (e) {
    health.value = 'down'
    lastError.value = e.name === 'AbortError' ? 'timed out' : 'unreachable'
  } finally {
    clearTimeout(t)
    lastCheckedAt.value = Date.now()
    lastCheckedLabel.value = 'just now'
  }
}

function tickLabel() {
  if (!lastCheckedAt.value) return
  const s = Math.floor((Date.now() - lastCheckedAt.value) / 1000)
  lastCheckedLabel.value = s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`
}

let labelTimer = null
onMounted(() => {
  checkHealth()
  pollTimer = setInterval(checkHealth, 30_000)
  labelTimer = setInterval(tickLabel, 5_000)
})
onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (labelTimer) clearInterval(labelTimer)
})
</script>

<style scoped>
.recovery-panel {
  color: var(--ink);
  margin-bottom: 48px;
}
.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
}
.section-blurb {
  font-size: 14px;
  color: var(--muted);
  margin: 0 0 20px 0;
  line-height: 1.6;
}
.section-blurb code,
.notes code,
.branch code,
.step-note code {
  background: rgba(148, 163, 184, 0.12);
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 12px;
}

/* ─── Live status card ─── */
.status-card {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 14px 18px;
  margin-bottom: 24px;
}
.status-card.status-up { border-color: rgba(34, 197, 94, 0.4); background: rgba(34, 197, 94, 0.06); }
.status-card.status-down { border-color: rgba(239, 68, 68, 0.5); background: rgba(239, 68, 68, 0.08); }
.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--faint);
  flex-shrink: 0;
}
.dot-up { background: #22c55e; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18); }
.dot-down { background: #ef4444; box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.22); }
.dot-checking { background: #f59e0b; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18); }
.status-text { flex: 1; min-width: 0; }
.status-headline { font-size: 14px; font-weight: 600; color: var(--ink); }
.status-sub { font-size: 12px; color: var(--muted); margin-top: 3px; }
.recheck-btn {
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--ink);
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}
.recheck-btn:disabled { opacity: 0.5; cursor: default; }

/* ─── Steps ─── */
.steps {
  list-style: none;
  counter-reset: step;
  padding: 0;
  margin: 0 0 24px 0;
}
.steps > li {
  counter-increment: step;
  position: relative;
  padding: 0 0 18px 38px;
}
.steps > li::before {
  content: counter(step);
  position: absolute;
  left: 0;
  top: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}
.step-head { font-size: 15px; font-weight: 600; color: var(--ink); margin-bottom: 6px; }
.step-body { font-size: 13px; color: var(--muted); margin: 0 0 8px 0; line-height: 1.5; }
.step-note { font-size: 12px; color: var(--muted); margin: 6px 0; line-height: 1.5; }
.branch { font-size: 13px; color: var(--ink); margin: 10px 0 0 18px; line-height: 1.7; }

/* ─── Copy line ─── */
.copy-line {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin: 6px 0;
}
.copy-code {
  flex: 1;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 13px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  color: var(--ink);
  overflow-x: auto;
  white-space: nowrap;
}
.copy-btn {
  background: var(--surface-2);
  border: 1px solid var(--line);
  color: var(--ink);
  font-size: 12px;
  padding: 0 12px;
  border-radius: 6px;
  cursor: pointer;
  flex-shrink: 0;
}
.copy-btn:hover { background: var(--line); }

/* ─── Notes ─── */
.notes {
  background: var(--surface-2);
  border: 1px dashed var(--line);
  border-radius: 8px;
  padding: 14px 18px;
}
.notes-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  font-weight: 600;
  margin-bottom: 8px;
}
.notes ul { margin: 0 0 0 18px; padding: 0; font-size: 13px; color: var(--ink); line-height: 1.7; }
.notes a { color: var(--accent, #60a5fa); }
</style>
