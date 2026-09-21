<template>
  <div class="hub">
    <div class="ambient-bg">
      <div class="grid-overlay"></div>
      <div class="glow-orb glow-orb-1"></div>
      <div class="glow-orb glow-orb-2"></div>
    </div>

    <header class="hub-header">
      <div class="header-titles">
        <div>
          <h1 class="page-title">SSi HQ</h1>
          <p class="page-subtitle">
            The company at one level of granularity — are we focusing on the right things right now?
            Every cell below is read from the live database at the moment you load this page.
            Nothing here is typed by a human, and nothing here is a guess.
          </p>
        </div>
      </div>
    </header>

    <main class="hub-main">
      <p v-if="loading" class="state-line">Reading…</p>
      <p v-else-if="error" class="state-line error">{{ error }}</p>

      <template v-else-if="data">
        <!-- FUNCTIONS ------------------------------------------------------->
        <section class="hub-section">
          <div class="section-header">
            <span class="section-label">FUNCTIONS</span>
            <div class="section-line"></div>
          </div>
          <p class="section-note">
            A function with no owner, or no recent trace, IS the gap — it is shown, not hidden.
          </p>

          <table class="hq-table">
            <thead>
              <tr><th>Function</th><th>Owner</th><th>Cadence</th><th>Last seen</th><th>Trace</th></tr>
            </thead>
            <tbody>
              <tr v-for="fn in data.functions" :key="fn.key" :class="{ gapped: !fn.readable }">
                <td class="cell-name">{{ fn.label }}</td>
                <td class="cell-owner">{{ fn.owner_display }}</td>
                <td>{{ fn.cadence || '—' }}</td>
                <td>
                  <span v-if="fn.last_seen" class="seen" :class="{ stale: isStale(fn.last_seen) }">
                    {{ ago(fn.last_seen) }}
                  </span>
                  <span v-else class="blank">no trace</span>
                </td>
                <td class="cell-trace">
                  <div class="trace-source">{{ fn.trace_source }}</div>
                  <div v-if="fn.last_actor" class="trace-detail">last actor: {{ fn.last_actor }}</div>
                  <div v-if="fn.detail" class="trace-detail">{{ fn.detail }}</div>
                  <div v-if="fn.gap" class="trace-gap">{{ fn.gap }}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        <!-- NUMBERS --------------------------------------------------------->
        <section class="hub-section">
          <div class="section-header">
            <span class="section-label">KEY NUMBERS</span>
            <div class="section-line"></div>
          </div>
          <p class="section-note">
            A blank is not a zero. Where no readable source exists, the card says
            <em>{{ data.semantics.honest_blank ? 'the record cannot tell' : '' }}</em>
            and names what would unlock it.
          </p>

          <div class="number-grid">
            <div v-for="n in data.numbers" :key="n.key" class="number-card" :class="{ unreadable: !n.readable }">
              <div class="number-label">{{ n.label }}</div>

              <div v-if="n.readable" class="number-value">
                {{ n.value.toLocaleString() }}
                <span v-if="n.direction" class="direction" :class="n.direction">
                  {{ arrow(n.direction) }}<span v-if="n.prior !== null" class="prior">was {{ n.prior.toLocaleString() }}</span>
                </span>
              </div>
              <div v-else class="number-blank">{{ n.display }}</div>

              <div v-if="n.period" class="number-period">{{ n.period }}</div>
              <div v-if="n.source" class="number-source">{{ n.source }}</div>
              <div v-if="n.blank_reason" class="number-reason">{{ n.blank_reason }}</div>
              <div v-if="n.unlock" class="number-unlock"><strong>To make it readable:</strong> {{ n.unlock }}</div>
              <div v-if="n.note" class="number-note">{{ n.note }}</div>
            </div>
          </div>
        </section>

        <footer class="hq-footer">
          <p>Computed {{ data.computed }} — {{ new Date(data.generated_at).toLocaleString() }}.</p>
          <p>
            This page does not replace Basecamp, Slack or Drive. It reads what it can and says plainly what it cannot.
            The census behind every verdict here, including what each blank would take:
            <a :href="data.census_url" target="_blank" rel="noopener">the company census</a>.
          </p>
        </footer>
      </template>
    </main>
  </div>
</template>

<script setup>
/**
 * SSi HQ — the company overview. Tom and Aran, 2026-09-21: "a place where you
 * and I go and get to look at the overview at different levels of granularity
 * and think, are we focusing on the right things right now".
 *
 * THIS COMPONENT HOLDS NO NUMBERS AND NO STATUSES. Every value rendered comes
 * from GET /api/hq, which is admin-gated and reads Supabase server-side with
 * the service key — the browser never touches Supabase for company numbers,
 * because new tables arrive grant-open to anon. There are no seeded constants
 * and no example rows here by design: a hand-typed figure on this page would be
 * believed, which is the one failure this surface cannot afford.
 *
 * An unreadable number renders as the honest blank the API sends, never as 0.
 */
import { ref, onMounted } from 'vue'
import { getApiUrl } from '../services/api'

const data = ref(null)
const loading = ref(true)
const error = ref('')

/** Relative, because "how long since this function left a trace" is the question. */
function ago (iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(mins, 0)} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 48) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days < 60) return `${days} days ago`
  return `${Math.floor(days / 30)} months ago`
}

/** Nothing for a fortnight is itself a finding, so it is coloured. */
function isStale (iso) {
  return Date.now() - new Date(iso).getTime() > 14 * 24 * 3600 * 1000
}

function arrow (dir) {
  return dir === 'up' ? '▲' : dir === 'down' ? '▼' : '▬'
}

onMounted(async () => {
  try {
    const r = await fetch(`${getApiUrl()}/api/hq`)
    if (r.status === 403) throw new Error('SSi HQ is admin only.')
    if (!r.ok) throw new Error(`The overview could not be read (${r.status}).`)
    data.value = await r.json()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
@import './hub.css';

.state-line { color: #94a3b8; font-size: 0.95rem; padding: 2rem 0; }
.state-line.error { color: #f87171; }

.section-note { color: #94a3b8; font-size: 0.85rem; margin: 0 0 1rem; max-width: 70ch; }

.hq-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.hq-table th {
  text-align: left; padding: 0.5rem 0.75rem; color: #64748b;
  font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}
.hq-table td { padding: 0.75rem; vertical-align: top; border-bottom: 1px solid rgba(148, 163, 184, 0.08); color: #cbd5e1; }
.hq-table tr.gapped { background: rgba(248, 113, 113, 0.05); }
.cell-name { font-weight: 600; color: #e2e8f0; white-space: nowrap; }
.cell-owner { color: #f59e0b; font-size: 0.72rem; letter-spacing: 0.04em; white-space: nowrap; }
.cell-trace { max-width: 46ch; }
.trace-source { color: #94a3b8; font-size: 0.78rem; }
.trace-detail { color: #64748b; font-size: 0.75rem; margin-top: 0.2rem; }
.trace-gap { color: #f87171; font-size: 0.75rem; margin-top: 0.35rem; }
.seen { color: #34d399; }
.seen.stale { color: #f59e0b; }
.blank { color: #f87171; }

.number-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.number-card {
  border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 10px;
  padding: 1rem; background: rgba(15, 23, 42, 0.45);
}
.number-card.unreadable { border-style: dashed; border-color: rgba(248, 113, 113, 0.3); }
.number-label { color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; }
.number-value { font-size: 2rem; font-weight: 700; color: #e2e8f0; margin: 0.35rem 0; }
.number-blank { font-size: 1rem; font-style: italic; color: #f87171; margin: 0.75rem 0; }
.direction { font-size: 0.8rem; font-weight: 600; margin-left: 0.5rem; }
.direction.up { color: #34d399; }
.direction.down { color: #f87171; }
.direction.flat { color: #94a3b8; }
.prior { color: #64748b; font-weight: 400; margin-left: 0.4rem; }
.number-period, .number-source { color: #64748b; font-size: 0.72rem; }
.number-reason { color: #fca5a5; font-size: 0.75rem; margin-top: 0.5rem; }
.number-unlock { color: #93c5fd; font-size: 0.75rem; margin-top: 0.5rem; }
.number-note { color: #64748b; font-size: 0.72rem; margin-top: 0.5rem; }

.hq-footer { color: #64748b; font-size: 0.75rem; margin: 2rem 0 4rem; max-width: 80ch; }
.hq-footer a { color: #93c5fd; }
</style>
