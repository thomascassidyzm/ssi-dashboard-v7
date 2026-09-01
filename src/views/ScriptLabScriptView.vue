<template>
  <div class="min-h-screen bg-canvas text-ink p-4 sm:p-8">
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center gap-3 mb-4 text-sm">
        <router-link to="/" class="text-accent-2 hover:opacity-80">Home</router-link>
        <span class="text-faint">/</span>
        <router-link to="/canonical/scripts" class="text-accent-2 hover:opacity-80">Script Lab</router-link>
        <span class="text-faint">/</span>
        <span class="text-muted">{{ slug }}</span>
      </div>

      <h1 class="text-2xl sm:text-3xl font-bold text-accent-2 mb-1">{{ title }}</h1>
      <p class="text-muted text-sm mb-1">
        The whole script, scene by scene, with no course loaded — and what it does to the graph.
      </p>
      <p class="text-accent text-xs mb-4">
        Edits change the language-neutral English master every course flexes from. They change no generated pod.
      </p>

      <div v-if="loading" class="text-faint py-12 text-center">Loading…</div>
      <div v-else-if="error" class="error-box border rounded-lg p-4">{{ error }}</div>

      <template v-else>
        <!-- ══ COVERAGE — the reason this page exists ══ -->
        <section class="bg-surface border border-line rounded-lg mb-6 overflow-hidden">
          <div class="px-4 sm:px-5 py-3 border-b border-line">
            <h2 class="font-semibold text-ink">Coverage — this script as a walk over the graph</h2>
          </div>

          <!-- a pair overlay makes no metagraph claim — say so, not a deficit -->
          <div v-if="pairOverlay" class="px-4 sm:px-5 py-4 text-sm text-muted">
            <p><span class="font-semibold text-faint">Coverage — not applicable.</span>
              This is a pair overlay: it carries <code>{{ overlayTargetLang }}</code> target text over
              another script's English and declares no walk of its own, so it makes no claim about the
              shape graph. Coverage is measured on the script it overlays.</p>
          </div>

          <template v-else>
          <div class="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
            <div class="py-3">
              <div class="text-2xl font-bold text-ink">{{ cov.totals.traversed }}<span class="text-faint text-base">/{{ cov.totals.nodes }}</span></div>
              <div class="text-xs text-muted">shapes traversed</div>
            </div>
            <div class="py-3">
              <div class="text-2xl font-bold text-ink">{{ cov.totals.hitTwice }}</div>
              <div class="text-xs text-muted">hit twice or more</div>
            </div>
            <div class="py-3">
              <div class="text-2xl font-bold" :class="cov.totals.neverReached ? 'text-danger' : 'text-accent-2'">{{ cov.totals.neverReached }}</div>
              <div class="text-xs text-muted">never reached</div>
            </div>
          </div>

          <!-- the deficit list, live -->
          <div class="px-4 sm:px-5 py-4 deficit border-b border-line">
            <h3 class="text-sm font-semibold text-danger mb-2">Never reached — the deficit list</h3>
            <p v-if="!cov.neverReached.length" class="text-xs text-accent-2">Every shape in the graph is traversed by this walk.</p>
            <ul v-else class="space-y-1.5">
              <li v-for="n in cov.neverReached" :key="n.id" class="text-sm flex flex-wrap gap-x-2">
                <span class="font-mono text-xs text-danger pt-0.5">{{ n.id }}</span>
                <span class="text-ink">{{ n.title }}</span>
                <span class="text-xs text-faint w-full sm:w-auto">{{ n.sequence }}</span>
                <span v-if="n.partialGroups" class="text-xs text-accent">{{ n.partialGroups }} attestation{{ n.partialGroups === 1 ? '' : 's' }} only partly present</span>
              </li>
            </ul>
          </div>

          <!-- the overlay's nine -->
          <div class="px-4 sm:px-5 py-4 border-b border-line">
            <h3 class="text-sm font-semibold text-ink mb-1">Outcome shapes — {{ cov.totals.outcomesDelivered }} delivered, {{ cov.totals.outcomesMissing }} missing</h3>
            <p class="text-xs text-faint mb-2">
              An outcome counts as delivered only when a line declares it. The ask it is <em>sited on</em> being present is not delivery.
            </p>
            <ul class="space-y-1">
              <li v-for="o in cov.outcomes" :key="o.id" class="text-sm flex flex-wrap gap-x-2 items-baseline">
                <span class="font-mono text-xs" :class="o.delivered ? 'text-accent-2' : 'text-danger'">{{ o.id }}</span>
                <span :class="o.delivered ? 'text-muted' : 'text-ink'">{{ o.name }}</span>
                <span v-if="o.mustBeMinted" class="text-xs text-accent">attested nowhere — must be minted</span>
                <span v-else-if="!o.delivered" class="text-xs text-faint">{{ o.attested }}</span>
                <span class="text-xs text-faint w-full sm:w-auto">recovery: {{ o.recovery }}</span>
              </li>
            </ul>
          </div>

          <!-- survivability, carrying the corpus's null result -->
          <div class="px-4 sm:px-5 py-4 border-b border-line">
            <h3 class="text-sm font-semibold text-ink mb-1">
              Survivability — {{ exercised.length }} of {{ cov.survivability.length }} edges exercised
            </h3>
            <p class="text-xs text-faint mb-2">
              The graph carries no safety weight of its own. What it does carry is whether the recovery was ever attested — the honest proxy, surfaced rather than invented.
            </p>
            <ul class="space-y-1">
              <li v-for="s in exercised" :key="s.id" class="text-sm flex flex-wrap gap-x-2 items-baseline">
                <span class="font-mono text-xs text-accent-2">{{ s.id }}</span>
                <span class="text-ink">{{ s.presupposes }}</span>
                <span class="text-xs" :class="s.recoveryRank === 0 ? 'text-danger font-semibold' : s.recoveryRank === 1 ? 'text-accent' : 'text-muted'">
                  <span v-if="s.recoveryRank === 0">⚠ </span>recovery: {{ s.recoveryAttested }}
                </span>
              </li>
            </ul>
          </div>

          <!-- what the graph could not say -->
          <div class="px-4 sm:px-5 py-3 text-xs text-faint space-y-1">
            <p>
              {{ cov.totals.steps }} lines · {{ cov.totals.mapped }} mapped to a shape ·
              {{ cov.totals.branches }} on a branch ·
              {{ cov.totals.codas }} scene-exit vocabulary drips ·
              {{ cov.totals.alternatives }} surface variants ·
              <span :class="cov.totals.unmapped ? 'text-accent' : ''">{{ cov.totals.unmapped }} UNMAPPED</span>
            </p>
            <p v-if="cov.totals.unmapped">
              Unmapped means the graph has nothing to say about the line — not that the line is wrong.
              <template v-if="graph.accounting">
                The store encodes {{ graph.accounting.complete_walks_encoded_here }} of the {{ graph.accounting.complete_walks_in_corpus }} complete walks,
                so {{ graph.accounting.rows_on_complete_walks_not_yet_placed }} rows that lie on a complete walk are counted but not yet placed on one,
                and the {{ graph.accounting.drill_rows_scenes_15_21 }} truncated drill rows of scenes 15–21 carry no shape.
                Encoding the remaining walks is what moves this number.
              </template>
            </p>
            <p v-if="walk.declarations && walk.declarations.length">
              <span class="text-muted">Shape declarations:</span>
              {{ walk.declarations.length }} declared ·
              {{ walk.declarations.length - walk.unresolved.length }} resolved against the store ·
              <span class="text-accent">{{ walk.unresolved.length }} UNRESOLVED</span>
              ({{ unresolvedByRegister }}).
              An unresolved declaration is a shape the pod names that the store has no id for. It is
              counted, never guessed into a mapping.
            </p>
            <p>Graph: <code>{{ graph.source }}</code> — {{ graph.provenance }}</p>
          </div>
          </template>
        </section>

        <!-- ══ THE SCRIPT ══
             The row/table treatment is lifted from src/views/production/SeedEditor.vue —
             a real table with named columns, generous cell padding, alternating rows and a
             hover state — because the complaint this fixes is that a `rows="1"` textarea
             clipped the sentence being edited. Here every cell simply renders its text, so
             the row grows to fit two- or three-line dialogue and nothing is ever truncated,
             at rest OR while editing.
        -->
        <div class="space-y-6">
          <div v-for="(scene, idx) in walk.scenes" :key="scene.number" class="bg-surface border border-line rounded-lg overflow-hidden">
            <div class="px-4 sm:px-5 py-3 border-b border-line flex flex-wrap items-baseline gap-2 sm:gap-3">
              <span class="text-xs font-mono text-accent-2 bg-surface-2 border border-line px-1.5 py-0.5 rounded">{{ idx + 1 }}/{{ walk.scenes.length }}</span>
              <span class="text-xs font-mono text-faint">{{ scene.label || ('Scene ' + scene.number) }}</span>
              <span class="font-semibold text-ink">{{ scene.title }}</span>
              <span v-if="scene.subtitle" class="text-xs italic text-faint">{{ scene.subtitle }}</span>
              <span class="ml-auto text-xs" :class="sceneShapes(scene).length ? 'text-accent-2' : 'text-faint'">
                {{ sceneShapes(scene).join(' ') || 'no shape' }}
              </span>
              <span v-if="sceneUnresolved(scene).length" class="basis-full text-xs text-accent">
                declared, unresolved: {{ sceneUnresolved(scene).join(' · ') }}
              </span>
            </div>

            <table class="script-table">
              <thead>
                <tr>
                  <th class="col-ref">#</th>
                  <th class="col-speaker">Speaker</th>
                  <th class="col-canonical">Canonical English</th>
                  <th class="col-state">State</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(step, i) in scene.steps" :key="step.payload.id || i">
                  <tr class="script-row" :class="{ 'row-alt': i % 2 === 1, dirty: rowDirty(step) }">
                    <td class="col-ref">
                      <span class="ref-num">{{ step.ref || '·' }}</span>
                      <span class="ref-kind" :title="stepTitle(step)"
                            :class="step.kind === 'move' ? 'text-accent-2' : step.kind === 'branch' ? 'text-accent' : step.kind === 'unmapped' ? 'text-danger' : 'text-faint'">
                        {{ step.nodeId || (step.kind === 'move' ? '' : KIND_TAG[step.kind]) }}
                      </span>
                    </td>

                    <td class="col-speaker" :title="step.payload.speaker">{{ step.payload.speaker }}</td>

                    <td class="col-canonical">
                      <!-- RESTING: the whole line, wrapped, never clipped. One tap opens it. -->
                      <div v-if="!isEditing(step, 'english')" class="canonical-read" :class="{ parked: isDirty(step, 'english') }" @click="startEdit(step, 'english', $event)">
                        <span class="canonical-text">{{ displayText(step, 'english') }}</span>
                        <span v-if="isDirty(step, 'english')" class="edit-hint unsaved">unsaved · tap to carry on</span>
                        <span v-else class="edit-hint">tap to edit</span>
                      </div>

                      <!-- EDITING: the draft is held locally. Blur does NOT save. Only the
                           explicit Save canonical button commits — canonical text is the
                           English master every course flexes from, so an accidental
                           keystroke or a stray click must never write it. -->
                      <div v-else class="canonical-edit">
                        <textarea
                          :ref="el => registerGrower(el, 'english:' + step.payload.id)"
                          v-model="drafts['english:' + step.payload.id]"
                          class="canonical-input"
                          rows="1"
                          @input="autoGrow($event.target)"
                          @keydown.escape.prevent="discardEdit(step, 'english')"
                          @keydown.enter.ctrl.prevent="commitEdit(step, 'english')"
                          @keydown.enter.meta.prevent="commitEdit(step, 'english')"
                        />
                        <p v-if="isDirty(step, 'english')" class="was-line">
                          <span class="was-label">was</span> {{ step.payload.text }}
                        </p>
                        <div class="confirm-bar">
                          <button type="button" class="btn-confirm" :disabled="!isDirty(step, 'english') || step.payload._saving" @click="commitEdit(step, 'english')">
                            {{ step.payload._saving ? 'Saving…' : 'Save canonical' }}
                          </button>
                          <button type="button" class="btn-discard" @click="discardEdit(step, 'english')">Discard</button>
                          <span v-if="isDirty(step, 'english')" class="unsaved-flag">unsaved — nothing is written until you save</span>
                          <span v-else class="text-xs text-faint">no change yet · Esc closes · Ctrl/⌘+Enter saves</span>
                        </div>
                      </div>

                      <!-- THE TARGET, EDITABLE (2026-09-01). It sits under the canonical
                           text rather than taking a column of its own, because it is a
                           rendering OF this line and it is absent on most rows. It was
                           read-only until the Welsh health overlay landed here as a
                           DRAFT: a draft nobody can correct on the page is a page you can
                           only look at. Same tap-to-open, same explicit save, same
                           history — one versioned route for both fields. -->
                      <template v-if="hasTarget(step)">
                        <p v-if="!isEditing(step, 'target')" class="specimen" :class="{ parked: isDirty(step, 'target') }" @click="startEdit(step, 'target', $event)">
                          <span class="specimen-run" :dir="dirFor(displayText(step, 'target'))">{{ displayText(step, 'target') || '— no target line yet —' }}</span>
                          <span class="text-faint not-italic"> · {{ step.payload.targetLang }}</span>
                          <span v-if="isDirty(step, 'target')" class="edit-hint unsaved">unsaved · tap to carry on</span>
                          <span v-else class="edit-hint">tap to edit</span>
                        </p>
                        <div v-else class="canonical-edit">
                          <textarea
                            :ref="el => registerGrower(el, 'target:' + step.payload.id)"
                            v-model="drafts['target:' + step.payload.id]"
                            class="canonical-input target-input"
                            :dir="dirFor(drafts['target:' + step.payload.id] || '')"
                            rows="1"
                            @input="autoGrow($event.target)"
                            @keydown.escape.prevent="discardEdit(step, 'target')"
                            @keydown.enter.ctrl.prevent="commitEdit(step, 'target')"
                            @keydown.enter.meta.prevent="commitEdit(step, 'target')"
                          />
                          <p v-if="isDirty(step, 'target')" class="was-line">
                            <span class="was-label">was</span> {{ step.payload.target }}
                          </p>
                          <div class="confirm-bar">
                            <button type="button" class="btn-confirm" :disabled="!isDirty(step, 'target') || step.payload._saving" @click="commitEdit(step, 'target')">
                              {{ step.payload._saving ? 'Saving…' : `Save ${step.payload.targetLang}` }}
                            </button>
                            <button type="button" class="btn-discard" @click="discardEdit(step, 'target')">Discard</button>
                            <span v-if="isDirty(step, 'target')" class="unsaved-flag">unsaved — nothing is written until you save</span>
                            <span v-else class="text-xs text-faint">no change yet · Esc closes · Ctrl/⌘+Enter saves</span>
                          </div>
                        </div>
                      </template>
                      <p v-else-if="step.payload.target" class="specimen">
                        <span class="specimen-run" :dir="dirFor(step.payload.target)">{{ step.payload.target }}</span>
                        <span class="text-faint not-italic"> · specimen, no language declared on this row</span>
                      </p>

                      <p v-if="step.branch" class="row-note text-accent">
                        fork · {{ step.branch.key }} arm{{ step.branch.continues ? '' : ' · no uptake' }}
                      </p>
                      <p v-else-if="step.variant" class="row-note text-faint">
                        another way of saying {{ step.variant.of }}
                      </p>
                    </td>

                    <td class="col-state">
                      <div class="state-stack">
                        <span v-if="step.payload._saving" class="text-accent text-xs">saving…</span>
                        <span v-else-if="step.payload._saved" class="text-accent-2 text-xs">saved ✓</span>
                        <span v-else-if="step.payload._err" class="text-danger text-xs" :title="step.payload._err">error</span>
                        <span v-else-if="rowDirty(step)" class="text-accent text-xs">unsaved</span>

                        <!-- The chip is the whole affordance: tap to see what this line
                             used to say, tap a version to put it back. No drag, no
                             swipe, no long-press. -->
                        <button
                          v-if="edits(step.payload.id)"
                          type="button"
                          class="chip"
                          :class="{ on: openLine === step.payload.id }"
                          @click="toggleHistory(step.payload.id)"
                        >
                          edited {{ edits(step.payload.id).edits }}× ·
                          {{ shortWho(edits(step.payload.id).lastSavedBy) }} ·
                          {{ ago(edits(step.payload.id).lastSavedAt) }}
                          <span class="text-faint">{{ openLine === step.payload.id ? '▲' : '▼' }}</span>
                        </button>
                      </div>
                    </td>
                  </tr>

                  <tr v-if="openLine === step.payload.id" class="history-row" :class="{ 'row-alt': i % 2 === 1 }">
                    <td colspan="4">
                      <div class="history">
                        <p v-if="hist(step.payload.id).loading" class="text-xs text-faint py-2">Loading history…</p>
                        <p v-else-if="hist(step.payload.id).error" class="text-xs text-danger py-2">{{ hist(step.payload.id).error }}</p>
                        <template v-else>
                          <p class="text-xs text-faint pb-2">
                            Newest first. Each one is diffed against the line as it stands now — struck-through words go, underlined words come in.
                            The frozen original at the bottom is what it said before anyone edited it.
                          </p>
                          <div v-for="v in hist(step.payload.id).versions" :key="v.versionId" class="version">
                            <div class="version-head">
                              <span class="text-xs" :class="v.kind === 'original' ? 'text-accent' : 'text-muted'">
                                {{ v.kind === 'original' ? 'original' : 'save' }} #{{ v.versionId }}
                              </span>
                              <span class="text-xs text-faint">{{ stamp(v.savedAt) }}</span>
                              <span class="text-xs text-muted truncate">{{ v.savedBy }}</span>
                              <button
                                v-if="!sameAsNow(v, step)"
                                type="button"
                                class="chip restore"
                                :disabled="hist(step.payload.id).restoring === v.versionId"
                                @click="restore(step, v.versionId)"
                              >{{ hist(step.payload.id).restoring === v.versionId ? 'restoring…' : 'restore' }}</button>
                              <span v-else class="text-xs text-accent-2">this is the line now</span>
                            </div>
                            <p class="diff">
                              <span v-for="(r, k) in diffOf(v, step)" :key="k" :class="r.kind">{{ r.text }}</span>
                            </p>
                            <p v-if="hasTarget(step)" class="diff diff-target" :dir="dirFor(step.payload.target || '')">
                              <span v-for="(r, k) in diffOfTarget(v, step)" :key="k" :class="r.kind">{{ r.text }}</span>
                            </p>
                          </div>
                        </template>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'
import { loadGraph } from '@/lib/metagraph/loadGraph.js'
import { walkFromCanonicalRows, walkFromStoredPod } from '@/lib/metagraph/walk.js'
import { computeCoverage, isPairOverlay } from '@/lib/metagraph/coverage.js'
import { wordDiff } from '@/lib/wordDiff.js'
import { dirFor } from '@/utils/textDirection.js'

const KIND_TAG = { coda: 'ADMITS', branch: 'BRANCH', alternative: 'VARIANT', unmapped: 'UNMAPPED' }
const route = useRoute()
const slug = route.params.slug || 'pod-1'

const graph = loadGraph()
const walk = ref({ scenes: [], steps: [] })
const cov = ref(null)
const loading = ref(true)
const error = ref(null)
const title = computed(() => `Canonical script · ${slug}`)
const exercised = computed(() => (cov.value?.survivability || []).filter(s => s.exercised))
const pairOverlay = computed(() => isPairOverlay(walk.value))
const overlayTargetLang = computed(() => {
  const step = (walk.value?.steps || []).find(s => s.payload?.targetLang)
  return step?.payload?.targetLang || 'its target language'
})
const unresolvedByRegister = computed(() => {
  const by = {}
  for (const d of walk.value?.unresolved || []) by[d.register] = (by[d.register] || 0) + 1
  return Object.entries(by).map(([k, v]) => `${v} ${k}`).join(', ')
})

/*
 * CANONICAL EDITING IS EXPLICIT — TWO STEPS, ALWAYS.
 *
 * The text in this column is the language-neutral English master every course's
 * pod flexes from, so a stray keystroke, a paste into the wrong row or a blur on
 * the way past must never write it. Tapping a cell opens a draft held ONLY in
 * `drafts`; blur does nothing; the value reaches /api/canonical-script only when
 * the Save canonical button (or Ctrl/⌘+Enter) is pressed. Escape discards.
 *
 * ONE LINE IS OPEN AT A TIME (2026-09-01). `drafts` used to be both "which rows
 * are open" and "what has been typed into them", so every tap added another
 * editor to the page and none of them ever closed. On a 430px phone that is the
 * whole complaint: the first editor sits there, the page grows by a screenful
 * under your thumb, and the row you meant to tap next has moved by the time the
 * tap lands — which reads as "it won't re-open" and "it goes janky".
 *
 * So the two jobs are separate now. `openId` is the ONE expanded row; `drafts`
 * is still only what has been typed. Closing a row by opening another does NOT
 * throw its typing away: the draft stays parked, the row keeps showing the
 * typed words and its unsaved flag, and tapping it again brings the editor back
 * with the words intact. The old promise is kept; the stacking is not.
 */
/*
 * TWO EDITABLE FIELDS PER LINE (2026-09-01): the canonical English, and the
 * TARGET. The target used to be a read-only specimen — fine while it was a
 * machine rendering of somebody else's decision, useless the moment it is a
 * DRAFT a human has to correct line by line, which is what the Welsh health
 * overlay is. It saves through the identical versioned route: same freeze, same
 * append, same history, same restore. Every field below is keyed `field:id`.
 */
const FIELDS = { english: 'english_text', target: 'target_text' }
const drafts = reactive({})            // `${field}:${scenario_id}` -> uncommitted text
const openKey = ref(null)              // the ONE editor that is expanded, anywhere
const dkey = (step, field) => `${field}:${step.payload.id}`
const stored = (step, field) => (field === 'target' ? step.payload.target : step.payload.text) ?? ''
const hasDraft = (step, field) => Object.prototype.hasOwnProperty.call(drafts, dkey(step, field))
const isEditing = (step, field) => openKey.value != null && openKey.value === dkey(step, field)
const isDirty = (step, field) => hasDraft(step, field) && drafts[dkey(step, field)] !== stored(step, field)
const rowDirty = step => isDirty(step, 'english') || isDirty(step, 'target')
/** What the resting row shows: a parked draft's words, not the stale master. */
const displayText = (step, field) => (hasDraft(step, field) ? drafts[dkey(step, field)] : stored(step, field))
/** A target editor is offered only where the line HAS a target language. */
const hasTarget = step => !!step.payload.targetLang

function startEdit (step, field, ev) {
  const id = step.payload.id
  if (!id) return
  const k = dkey(step, field)
  // Collapsing the row that WAS open removes a screenful; without this the page
  // jumps and the row you just tapped is no longer where you tapped it. The
  // anchor has to be the <tr>, not the tapped div — the div is swapped out for
  // the editor, so it is gone by the time we measure again.
  const anchor = ev?.currentTarget?.closest('tr') || null
  const before = anchor?.getBoundingClientRect().top ?? null

  openKey.value = k
  // Reopening a parked draft must bring the typed words back, not reset them.
  if (!hasDraft(step, field)) drafts[k] = stored(step, field)
  step.payload._err = ''
  nextTick(() => {
    autoGrow(growers[k])
    if (before != null && anchor?.isConnected) {
      window.scrollBy(0, anchor.getBoundingClientRect().top - before)
    }
  })
}

/** Close the editor and throw the typing away — the explicit Discard button. */
function discardEdit (step, field) {
  const k = dkey(step, field)
  delete drafts[k]
  if (openKey.value === k) openKey.value = null
}

async function commitEdit (step, field) {
  const k = dkey(step, field)
  if (!isDirty(step, field)) { discardEdit(step, field); return }
  const ok = await saveLine(step, field, drafts[k])
  if (ok) {
    delete drafts[k]
    if (openKey.value === k) openKey.value = null
  }
}

/* The row must grow with its content — that is the whole complaint being fixed —
   so the textarea is sized to its own scrollHeight on mount and on every input. */
const growers = {}
function registerGrower (el, key) {
  if (el) { growers[key] = el; autoGrow(el) } else { delete growers[key] }
}
function autoGrow (el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

/* Uncommitted canonical edits must not vanish silently on a reload. */
function warnUnsaved (e) {
  if (!Object.keys(drafts).length) return
  e.preventDefault()
  e.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', warnUnsaved))
onBeforeUnmount(() => window.removeEventListener('beforeunload', warnUnsaved))

// The history, per line: the summary chips come from one read of the whole
// script, the versions themselves are fetched the first time a chip is tapped.
const summary = ref({})     // scenario_id -> { edits, lastSavedAt, lastSavedBy }
const histories = ref({})   // scenario_id -> { loading, error, versions, restoring }
const openLine = ref(null)

const { getAccessToken } = useAuth()
async function authedFetch (path, init = {}) {
  const token = await getAccessToken()
  const headers = { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json', ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${getApiUrl()}${path}`, { ...init, headers })
}

/**
 * The versioning endpoints are Vercel routes (api/canonical-script.js), served
 * from THIS origin — not from the production API that serves the read above.
 * That is deliberate: api/* ships with every front-end deploy, whereas a new
 * route in services/production-api.cjs 404s live until somebody restarts a
 * shared long-lived process.
 */
async function vercelFetch (path, init = {}) {
  const token = await getAccessToken()
  const headers = { 'Content-Type': 'application/json', ...(init.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(path, { ...init, headers })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
  return body
}

const edits = id => summary.value[id] || null
const hist = id => histories.value[id] || { loading: true, versions: [] }

function shortWho (email) {
  return String(email || 'someone').split('@')[0]
}
function stamp (iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function ago (iso) {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

/** Every version is diffed against the line AS IT STANDS NOW — the comparison
 *  the reader is actually making: what would change if I put this back? */
function diffOf (version, step) {
  return wordDiff(version.englishText, step.payload.text ?? '')
}
/** The same comparison for the target — the second editable field on a line. */
function diffOfTarget (version, step) {
  return wordDiff(version.targetText ?? '', step.payload.target ?? '')
}
/** A version row is the state of the WHOLE line, so "this is the line now" has
 *  to mean both fields match — otherwise a target-only edit hides its own way back. */
const sameAsNow = (v, step) =>
  v.englishText === (step.payload.text ?? '') && (v.targetText ?? '') === (step.payload.target ?? '')

async function loadSummary () {
  try {
    const body = await vercelFetch(`/api/canonical-script?slug=${encodeURIComponent(slug)}&history=1`)
    summary.value = Object.fromEntries((body.lines || []).map(l => [l.scenarioId, l]))
  } catch (err) {
    // A missing history is not a reason to hide the script. The chips simply
    // do not appear, and the page says so nowhere rather than crying wolf.
    console.warn('[ScriptLab] history summary unavailable:', err.message)
  }
}

async function toggleHistory (id) {
  if (openLine.value === id) { openLine.value = null; return }
  openLine.value = id
  await loadHistory(id)
}

async function loadHistory (id) {
  histories.value = { ...histories.value, [id]: { loading: true, versions: [], error: null } }
  try {
    const body = await vercelFetch(`/api/canonical-script?line=${encodeURIComponent(id)}`)
    histories.value = { ...histories.value, [id]: { loading: false, versions: body.versions || [], error: null } }
  } catch (err) {
    histories.value = { ...histories.value, [id]: { loading: false, versions: [], error: err.message } }
  }
}

async function restore (step, versionId) {
  const id = step.payload.id
  histories.value = { ...histories.value, [id]: { ...hist(id), restoring: versionId } }
  try {
    const body = await vercelFetch(`/api/canonical-script?line=${encodeURIComponent(id)}&restore=1`, {
      method: 'POST',
      body: JSON.stringify({ versionId })
    })
    // A restore puts the WHOLE line back — English and target together, because
    // a version row is the state of the line, not of one column of it.
    step.payload.text = body.line?.englishText ?? step.payload.text
    if (body.line && 'targetText' in body.line) step.payload.target = body.line.targetText
    delete drafts[`english:${id}`]
    delete drafts[`target:${id}`]
    if (openKey.value === `english:${id}` || openKey.value === `target:${id}`) openKey.value = null
    step.payload._saved = true
    setTimeout(() => { step.payload._saved = false }, 2000)
    await Promise.all([loadHistory(id), loadSummary()])
  } catch (err) {
    histories.value = { ...histories.value, [id]: { ...hist(id), restoring: null, error: err.message } }
  }
}

function sceneShapes (scene) {
  return [...new Set(scene.steps.flatMap(s => s.nodeIds || []))]
}
function sceneUnresolved (scene) {
  return (scene.declarations || []).filter(d => d.resolution === 'unresolved').map(d => d.declared_as)
}
function stepTitle (step) {
  if (step.kind === 'unmapped') return 'the graph has nothing to say about this line'
  if (step.kind === 'coda') return 'scene-exit vocabulary drip — ADMITS, never a move'
  if (step.branch) {
    return `the ${step.branch.polarity} arm of a fork at ${step.branch.node} — ${step.branch.alternative}. `
      + `${step.branch.continues ? 'The walk continues down this arm.' : 'This arm has no uptake in the corpus.'}`
  }
  if (step.variant) return `surface variance — another way of saying ${step.variant.of}. A phrasing, not a fork.`
  if (step.kind === 'alternative') return 'an alternative at a node, not a step on the path'
  const node = graph.nodes.find(n => n.id === step.nodeId)
  return node ? `${node.id} ${node.title} — ${node.sequence}` : ''
}

async function load () {
  loading.value = true
  error.value = null
  try {
    const res = await authedFetch(`/api/admin/canonical-pods/${encodeURIComponent(slug)}`)
    const body = await res.json()
    if (!res.ok) throw new Error(body?.error || `HTTP ${res.status}`)
    walk.value = (body.walk || []).length
      ? walkFromStoredPod(body.scenarios || [], body.walk, graph, { id: slug, slug })
      : walkFromCanonicalRows(body.scenarios || [], graph, { id: slug, slug })
    cov.value = computeCoverage(graph, walk.value)
    await loadSummary()
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

/**
 * The versioned save. Called ONLY from commitEdit — never from a blur, never from
 * a watcher. Returns true when the text is safely stored.
 */
async function saveLine (step, field, value) {
  const p = step.payload
  const text = String(value ?? '')
  if (text === stored(step, field)) return true
  p._saving = true; p._saved = false; p._err = ''
  try {
    // The versioned save: it freezes the pre-edit words the first time this
    // line is touched, appends this edit, and only then moves the live text.
    // The old PATCH straight onto canonical_pod_scenarios kept nothing.
    // The target goes down the SAME route as the English — one history per line.
    const body = await vercelFetch(`/api/canonical-script?line=${encodeURIComponent(p.id)}`, {
      method: 'POST',
      body: JSON.stringify({ [FIELDS[field]]: text })
    })
    if (field === 'target') p.target = body.line?.targetText ?? text
    else p.text = body.line?.englishText ?? text
    p._saved = true
    setTimeout(() => { p._saved = false }, 2000)
    if (!body.unchanged) {
      await loadSummary()
      if (openLine.value === p.id) await loadHistory(p.id)
    }
    return true
  } catch (err) {
    p._err = err.message
    return false
  } finally {
    p._saving = false
  }
}

onMounted(load)
</script>

<style scoped>
@import '@/styles/script-rows.css';
.error-box { color: var(--danger); border-color: var(--danger); background: color-mix(in srgb, var(--danger) 14%, var(--surface)); }
:root[data-theme="light"] .error-box { background: color-mix(in srgb, var(--danger) 8%, #ffffff); }
.deficit { background: color-mix(in srgb, var(--danger) 8%, var(--surface)); }

/* Tap is the only affordance: every control here is a button with a finger-sized
   target. No drag, no swipe, no long-press — Tom reads this on a 430px phone. */
.chip {
  min-height: 32px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.2;
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}
.chip.on { background: color-mix(in srgb, var(--accent) 22%, transparent); }
.chip.restore { color: var(--accent-2); border-color: color-mix(in srgb, var(--accent-2) 45%, transparent); background: color-mix(in srgb, var(--accent-2) 10%, transparent); }
.chip[disabled] { opacity: 0.5; }

.history {
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--surface-2);
}
.version { padding: 8px 0; border-top: 1px solid color-mix(in srgb, var(--line) 70%, transparent); }
.version:first-of-type { border-top: 0; }
.version-head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 4px; }
.diff { font-size: 13px; line-height: 1.5; color: var(--ink); white-space: pre-wrap; word-break: break-word; }
.diff .add { color: var(--accent-2); text-decoration: underline; }
.diff .del { color: var(--danger); text-decoration: line-through; }
.diff .same { opacity: 0.6; }
</style>
