<template>
  <div class="min-h-screen bg-canvas text-ink p-4 sm:p-8">
    <div class="mx-auto" :class="overlayColumns.length ? 'max-w-[1400px]' : 'max-w-4xl'">
      <div class="flex items-center gap-3 mb-4 text-sm">
        <router-link to="/" class="text-muted hover:text-ink underline underline-offset-2">Home</router-link>
        <span class="text-faint">/</span>
        <router-link to="/canonical/scripts" class="text-muted hover:text-ink underline underline-offset-2">Script Lab</router-link>
        <span class="text-faint">/</span>
        <span class="text-muted">{{ slug }}</span>
      </div>

      <h1 class="text-2xl sm:text-3xl font-bold text-ink mb-1">{{ title }}</h1>
      <p class="text-muted text-sm mb-1">
        The whole script, scene by scene, with no course loaded — and what it does to the graph.
      </p>
      <p class="text-muted text-xs mb-4">
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
              <div class="text-2xl font-bold text-ink">{{ cov.totals.neverReached }}</div>
              <div class="text-xs text-muted">never reached</div>
            </div>
          </div>

          <!-- the deficit list, live -->
          <!-- THE DEFICIT LIST IS NOW PLAIN GREY BODY TEXT. The cards on the
               metagraph carry the signal — dashed, unfilled, dimmed — so a red
               list here was the page stating its deficit a second time, louder
               than it states its coverage. The count above is the measurement;
               this is the roll-call under it. -->
          <div class="px-4 sm:px-5 py-4 deficit border-b border-line">
            <h3 class="text-sm font-semibold text-ink mb-2">Never reached — the deficit list</h3>
            <p v-if="!cov.neverReached.length" class="text-xs text-muted">Every shape in the graph is traversed by this walk.</p>
            <ul v-else class="space-y-1.5">
              <li v-for="n in cov.neverReached" :key="n.id" class="text-sm flex flex-wrap gap-x-2">
                <span class="font-mono text-xs text-muted pt-0.5">{{ n.id }}</span>
                <span class="text-muted">{{ n.title }}</span>
                <span class="text-xs text-faint w-full sm:w-auto">{{ n.sequence }}</span>
                <span v-if="n.partialGroups" class="text-xs text-faint">{{ n.partialGroups }} attestation{{ n.partialGroups === 1 ? '' : 's' }} only partly present</span>
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
              <li v-for="o in cov.outcomes" :key="o.id" class="text-sm flex flex-wrap gap-x-2 items-baseline"
                  :class="o.delivered ? 'out-delivered' : 'out-missing'">
                <span class="font-mono text-xs">{{ o.id }}</span>
                <span>{{ o.name }}</span>
                <span v-if="o.mustBeMinted" class="text-xs text-faint">attested nowhere — must be minted</span>
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
                <span class="font-mono text-xs text-muted">{{ s.id }}</span>
                <span class="text-ink">{{ s.presupposes }}</span>
                <span class="text-xs text-muted" :class="s.recoveryRank === 0 ? 'font-semibold text-ink' : ''">
                  recovery: {{ s.recoveryAttested }}
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
              <span :class="cov.totals.unmapped ? 'text-ink font-semibold' : ''">{{ cov.totals.unmapped }} UNMAPPED</span>
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
              <span class="text-ink font-semibold">{{ walk.unresolved.length }} UNRESOLVED</span>
              ({{ unresolvedByRegister }}).
              An unresolved declaration is a shape the pod names that the store has no id for. It is
              counted, never guessed into a mapping.
            </p>
            <p>Graph: <code>{{ graph.source }}</code> — {{ graph.provenance }}</p>
          </div>
          </template>
        </section>

        <!-- ══ THE LANGUAGE SELECTOR ══
             Tom, 2026-09-02: "I could find no way to choose the course for the
             pod on display." There IS a global "Choose course…" in the top
             chrome, but it reads as site-wide furniture and is not discoverable
             as THIS screen's control — that is the defect, not the absence of a
             control. The Metagraph's chip row (Graph only / POD 1 / Method Pod)
             is exactly the right shape, so it is REUSED rather than redesigned,
             with "Canonical only" as the leftmost chip and the default, exactly
             as "Graph only" is there.

             And it is the same control as Ruling 3: with nothing selected,
             KNOWN was a byte-identical copy of CANONICAL with "= canonical"
             stamped under every row and TARGET was a column of em-dashes — two
             thirds of the width carrying zero bits. Canonical runs at FULL
             WIDTH until a language is picked. -->
        <div class="lang-picker flex flex-wrap items-center gap-2 mb-4">
          <span class="text-xs uppercase tracking-wide text-faint mr-1">Language</span>
          <button
            type="button"
            class="lang-chip"
            :class="selectedLang === null ? 'is-on' : ''"
            @click="selectedLang = null"
          >Canonical only</button>
          <button
            v-for="l in availableLangs" :key="l.code"
            type="button"
            class="lang-chip"
            :class="selectedLang === l.code ? 'is-on' : ''"
            @click="selectedLang = l.code"
          >
            {{ l.code }}
            <span class="text-faint ml-1">{{ l.lines }} lines</span>
          </button>
          <span v-if="!availableLangs.length" class="text-xs text-faint">
            This script carries no target-language layer yet, so there is nothing to lay beside the canonical.
          </span>
        </div>

        <!-- ══ THE CHUNK-MAPPING CAVEAT ══
             Shown once, at the top, when any line on this page carries a chunk
             mapping. It exists because divergence marks in a mapping are made
             CHUNK BY CHUNK, and a divergence that runs right through the
             document is therefore marked on no row at all. Putting an invented
             badge on the affected rows would be a green nobody made; saying it
             once, here, is the honest form. It names no language and no pod, so
             the Italian overlay inherits it unchanged. -->
        <p v-if="chunkMappedLines" class="mb-4 text-xs text-muted bg-surface border border-line rounded-lg px-4 py-2">
          <span class="text-ink font-semibold">Chunk mappings</span> —
          {{ chunkMappedLines }} of {{ totalLines }} lines record one.
          Divergence marks are per chunk, so a divergence that runs through the whole
          document is marked on <em>no</em> row: read the source document's own
          page-level notes alongside these. Nothing here is inferred — every mark is
          one an author wrote.
        </p>

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
              <span class="text-xs font-mono text-ink bg-surface-2 border border-line px-1.5 py-0.5 rounded">{{ idx + 1 }}/{{ walk.scenes.length }}</span>
              <span class="text-xs font-mono text-faint">{{ scene.label || ('Scene ' + scene.number) }}</span>
              <span class="font-semibold text-ink">{{ scene.title }}</span>
              <span v-if="scene.subtitle" class="text-xs italic text-faint">{{ scene.subtitle }}</span>
              <span class="ml-auto text-xs" :class="sceneShapes(scene).length ? 'text-muted' : 'text-faint'">
                {{ sceneShapes(scene).join(' ') || 'no shape' }}
              </span>
              <span v-if="sceneUnresolved(scene).length" class="basis-full text-xs text-muted">
                declared, unresolved: {{ sceneUnresolved(scene).join(' · ') }}
              </span>
            </div>

            <table class="script-table" :class="{ 'canonical-only': !overlayColumns.length }">
              <thead>
                <tr>
                  <th class="col-ref">#</th>
                  <th class="col-speaker">Speaker</th>
                  <th class="col-canonical">{{ canonicalColumn.label }}</th>
                  <th v-for="col in overlayColumns" :key="col.key" class="col-overlay">{{ col.label }}</th>
                  <th class="col-state">State</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(step, i) in scene.steps" :key="step.payload.id || i">
                  <tr class="script-row" :class="{ 'row-alt': i % 2 === 1, dirty: rowDirty(step) }">
                    <td class="col-ref">
                      <!-- The Seed Editor's per-row dot, carried over. It reports
                           only honest state — unsaved / has a target / has none.
                           No quality score is invented, so there is no third colour. -->
                      <span class="status-dot" :class="dotClass(step)" :title="dotTitle(step)"></span>
                      <span class="ref-num">{{ step.ref || '·' }}</span>
                      <!-- A step kind is a NAME, not a measurement — ink for the
                           mapped ones, grey for the rest. UNMAPPED used to be red;
                           the page already says in words that unmapped means the
                           graph has nothing to say, not that the line is wrong. -->
                      <span class="ref-kind" :title="stepTitle(step)"
                            :class="step.kind === 'move' ? 'text-muted' : 'text-faint'">
                        {{ step.nodeId || (step.kind === 'move' ? '' : KIND_TAG[step.kind]) }}
                      </span>
                    </td>

                    <td class="col-speaker" :title="step.payload.speaker">{{ step.payload.speaker }}</td>

                    <!-- ══ CANONICAL — THE INVARIANT COLUMN ══
                         One pod is authored once; known and target are overlays
                         ON this. Here — the canonical script lab, with no course
                         loaded — this column IS the master being authored, so it
                         is editable; on a per-course page the same text is
                         read-only, and that asymmetry is what stops a course
                         forking the pod. -->
                    <td class="col-canonical">
                      <ScriptLineCell :step="step" :col="canonicalColumn" :ed="ed" />

                      <p v-if="step.branch" class="row-note text-faint">
                        fork · {{ step.branch.key }} arm{{ step.branch.continues ? '' : ' · no uptake' }}
                      </p>
                      <p v-else-if="step.variant" class="row-note text-faint">
                        another way of saying {{ step.variant.of }}
                      </p>
                    </td>

                    <!-- ══ THE OVERLAY COLUMNS ══
                         Driven by a list, never hand-written: North Welsh beside
                         South Welsh over one canonical is one more descriptor. -->
                    <td v-for="col in overlayColumns" :key="col.key" class="col-overlay" :class="'col-' + col.key">
                      <ScriptLineCell :step="step" :col="col" :ed="ed" />
                    </td>

                    <td class="col-state">
                      <div class="state-stack">
                        <span v-if="step.payload._saving" class="text-muted text-xs">saving…</span>
                        <span v-else-if="step.payload._saved" class="text-ink text-xs font-semibold">saved ✓</span>
                        <!-- The one surviving red on this page: a failed write is a
                             system fault, not a measurement. /courses keeps red for
                             exactly this and it is the reference implementation. -->
                        <span v-else-if="step.payload._err" class="text-danger text-xs" :title="step.payload._err">error</span>
                        <span v-else-if="rowDirty(step)" class="text-ink text-xs font-semibold">unsaved</span>

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

                  <!-- ══ THE CHUNK MAPPING ══
                       Present when and only when the line CARRIES one, keyed off
                       author_notes and never off a pod slug — the Italian overlay
                       lands next and must light this up untouched. Full width
                       rather than inside a content column: a chunk table squeezed
                       into a third of the page is not scannable, and scannable is
                       the requirement. -->
                  <tr v-if="step.payload.notes" class="notes-row" :class="{ 'row-alt': i % 2 === 1 }">
                    <td :colspan="colCount">
                      <ChunkNotesPanel :step="step" :ed="ed" />
                    </td>
                  </tr>

                  <tr v-if="openLine === step.payload.id" class="history-row" :class="{ 'row-alt': i % 2 === 1 }">
                    <td :colspan="colCount">
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
                              <span class="text-xs" :class="v.kind === 'original' ? 'text-ink font-semibold' : 'text-muted'">
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
                              <span v-else class="text-xs text-muted">this is the line now</span>
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
import ScriptLineCell from '@/components/scriptlab/ScriptLineCell.vue'
import ChunkNotesPanel from '@/components/scriptlab/ChunkNotesPanel.vue'

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
const FIELDS = { english: 'english_text', target: 'target_text', notes: 'author_notes' }
const drafts = reactive({})            // `${field}:${scenario_id}` -> uncommitted text
const openKey = ref(null)              // the ONE editor that is expanded, anywhere
const dkey = (step, field) => `${field}:${step.payload.id}`
const stored = (step, field) =>
  (field === 'target' ? step.payload.target : field === 'notes' ? step.payload.notes : step.payload.text) ?? ''
const hasDraft = (step, field) => Object.prototype.hasOwnProperty.call(drafts, dkey(step, field))
const isEditing = (step, field) => openKey.value != null && openKey.value === dkey(step, field)
const isDirty = (step, field) => hasDraft(step, field) && drafts[dkey(step, field)] !== stored(step, field)
/* The chunk mapping counts as unsaved work on the line like the other two do:
   it is a decision record a human is correcting, not a comment field. */
const rowDirty = step => isDirty(step, 'english') || isDirty(step, 'target') || isDirty(step, 'notes')
/** What the resting row shows: a parked draft's words, not the stale master. */
const displayText = (step, field) => (hasDraft(step, field) ? drafts[dkey(step, field)] : stored(step, field))
/** A target editor is offered only where the line HAS a target language. */
const hasTarget = step => !!step.payload.targetLang

/*
 * ══ CANONICAL || KNOWN || TARGET, ACROSS THE PAGE ══
 *
 * The canonical column is the INVARIANT: one pod is authored once, and known and
 * target are both per-course OVERLAYS on it. For zho_for_spa all three columns
 * are three different strings; for any *_for_eng course canonical and known
 * coincide, and BOTH are still shown — seeing the line you cannot change beside
 * the one you can is the point, so that duplication is deliberate.
 *
 * The overlays come from a LIST, never from hand-written cells. Pod content is
 * shared across dialect courses, so North Welsh and South Welsh are two TARGET
 * columns over one canonical and never a fork — the day that lands it is one
 * more descriptor in `overlayColumns`, not a rebuilt component.
 */
/* The caveat's own numbers, counted from the walk rather than asserted: a line
   "records a chunk mapping" exactly when it carries author_notes. No slug is
   consulted anywhere on this page. */
const allSteps = computed(() => (walk.value?.scenes || []).flatMap(sc => sc.steps || []))
const totalLines = computed(() => allSteps.value.length)
const chunkMappedLines = computed(() => allSteps.value.filter(s => s.payload?.notes).length)

const canonicalColumn = {
  key: 'canonical',
  label: 'Canonical English',
  field: 'english',
  editable: true,
  saveLabel: 'Save canonical'
}

/*
 * THE KNOWN COLUMN HAS NO SOURCE OF TRUTH YET, AND SAYS SO.
 *
 * canonical_pod_scenarios carries english_text, target_text and target_lang and
 * nothing else; EDITABLE_FIELDS in api/lib/canonical-script-versions.js has no
 * known field; walk.js never carries one. So the known layer is shown as what it
 * actually is today — the canonical English, coinciding with canonical, marked
 * as coinciding, and NOT editable. A cell that accepts an edit and writes
 * nowhere would be worse than no cell at all.
 */
const KNOWN_COLUMN = {
  key: 'known',
  label: 'Known',
  editable: false,
  readsFrom: 'text',
  mirrorsCanonical: true,
  mirrorNote: 'This pod carries no separate known-language layer yet — the known text IS the canonical English, so it is shown read-only rather than pretending to be editable.'
}

/*
 * ══ THE COLUMNS ARE EMPTY BY CONSTRUCTION UNTIL A LANGUAGE IS PICKED ══
 *
 * Tom's Ruling 3, 2026-09-02. With no language selected, KNOWN was a
 * byte-identical copy of CANONICAL with "= canonical" stamped under every row
 * and TARGET was a column of em-dashes: two thirds of a 1400px page carrying
 * zero bits, and the reason the body type had to run at 13px to fit. So the
 * default is CANONICAL ONLY, at full width — and the larger type scale that
 * makes readable comes free with the single column.
 *
 * Picking a language is what brings the overlays back, and then all three are
 * worth their width: canonical, the known side, and that language's target.
 */
const selectedLang = ref(null)

/** Every target language actually present on this script's lines, with how many
 *  lines carry it. Counted from the walk — never a list somebody typed. */
const availableLangs = computed(() => {
  const counts = new Map()
  for (const st of walk.value?.steps || []) {
    const lang = st.payload?.targetLang
    if (lang) counts.set(lang, (counts.get(lang) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    .map(([code, lines]) => ({ code, lines }))
})

/** A language that vanishes when the script reloads must not leave a dead
 *  selection behind, so the pick is validated against what is actually there. */
const activeLang = computed(() =>
  availableLangs.value.some(l => l.code === selectedLang.value) ? selectedLang.value : null
)

const overlayColumns = computed(() => {
  if (!activeLang.value) return []
  return [
    KNOWN_COLUMN,
    {
      key: 'target',
      label: `Target · ${activeLang.value}`,
      field: 'target',
      lang: activeLang.value,
      editable: true,
      saveLabel: step => `Save ${step.payload.targetLang}`
    }
  ]
})

/** # + Speaker + canonical + the overlays + State — the history row spans them all. */
const colCount = computed(() => 3 + overlayColumns.value.length + 1)

/*
 * THE PER-ROW DOT, carried over from the Seed Editor's # column. It reports only
 * state this page actually knows: an unsaved draft, a line that has target text,
 * a line that has none. There is no quality score here and none is invented, so
 * there is no third colour.
 */
function dotClass (step) {
  // NAMED FOR WHAT THEY MEAN, NOT FOR WHAT COLOUR THEY USED TO BE. They were
  // 'amber' and 'green'; under Tom's 2026-09-02 ruling neither is painted a hue
  // any more, and a class called `.amber` that renders ink is how the next
  // person re-introduces amber by accident.
  if (rowDirty(step)) return 'dot-unsaved'
  if (step.payload.target) return 'dot-has-target'
  return 'dot-none'
}
function dotTitle (step) {
  if (rowDirty(step)) return 'unsaved draft on this line'
  if (step.payload.target) return 'this line has a target rendering'
  return 'no target rendering on this line yet'
}


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

/*
 * THE EDITING SURFACE HANDED TO EACH COLUMN CELL.
 *
 * ScriptLineCell renders one column and reimplements NOTHING: tap-to-open,
 * one-editor-at-a-time, the parked draft and the explicit Save are these
 * functions, passed down. Splitting the stacked cell into columns must not cost
 * the editing behaviour that was just repaired.
 */
const ed = { drafts, stored, isEditing, isDirty, displayText, startEdit, commitEdit, discardEdit, registerGrower, autoGrow }

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
    if (body.line && 'authorNotes' in body.line) step.payload.notes = body.line.authorNotes
    for (const f of Object.keys(FIELDS)) {
      delete drafts[`${f}:${id}`]
      if (openKey.value === `${f}:${id}`) openKey.value = null
    }
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
    else if (field === 'notes') p.notes = body.line?.authorNotes ?? text
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
/* The deficit panel used to sit on a red wash. It is a roll-call under a count,
   so it sits on the same surface as everything else and reads as body text. */
.deficit { background: var(--surface); }

/* An outcome that a line delivers, and one that no line delivers. Presence is
   ink; absence is dimmed ink — the same two states as the metagraph tiles, at
   list scale where an outline would be noise. */
.out-delivered { color: var(--ink); }
.out-missing { color: var(--ink); opacity: 0.55; }

/*
 * ══ THREE CONTENT COLUMNS ══
 *
 * The proportions are the Seed Editor's: the number and speaker stay narrow, the
 * content columns take the width, and State sits at the right-hand end. These
 * rules are scoped to THIS view rather than added to the shared script-rows.css,
 * because CanonicalPodView.vue still renders a four-column table off that same
 * stylesheet and must not be re-proportioned by a change made for this page.
 */
.script-table { table-layout: fixed; }
.col-ref { width: 6rem; }
.col-speaker { width: 4.5rem; }
.col-state { width: 8rem; }
.notes-row td { padding: 0 1rem 0.5rem; border-top: 0; }
/* The three content columns share the rest evenly — CANONICAL || KNOWN ||
   TARGET reads as three columns of one width, not as one wide column with two
   offcuts. `table-layout: fixed` is what makes the percentages hold whatever
   the sentences do. */
.col-canonical, .col-overlay { width: 27%; min-width: 0; }

/*
 * CANONICAL ONLY — the default, and full width (Tom's Ruling 3, 2026-09-02).
 * One column keeps the measure sane at the Library's type size, which is why
 * Ruling 5's larger scale costs nothing here: the width that used to be spent
 * on a byte-identical KNOWN copy and a column of em-dashes now buys legibility.
 */
.script-table.canonical-only .col-canonical { width: auto; }
.script-table.canonical-only .col-state { width: 9rem; }
.script-table.canonical-only td { font-size: var(--text-body); }

/*
 * ══ THE LANGUAGE CHIP ROW ══
 * The Metagraph's own control, reused. INK AND GREY only: which chip is on is
 * a state of the page, not a measurement of the content, so it is drawn with
 * weight and fill rather than painted amber.
 */
.lang-chip {
  padding: 0.25rem 0.75rem;
  border-radius: 0.35rem;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  font-size: var(--text-label);
  font-family: inherit;
  cursor: pointer;
  transition: color .15s, border-color .15s, background-color .15s;
}
.lang-chip:hover { color: var(--ink); border-color: var(--muted); }
.lang-chip.is-on {
  border-color: var(--ink);
  background: var(--surface-2);
  color: var(--ink);
  font-weight: 600;
}

/*
 * ══ THE LIBRARY'S TYPE SCALE ══
 * Tom, 2026-09-02: the body ran ~13px across three ~370px columns and /courses
 * runs the size he named as right. The tokens live in ui-tokens.css so a screen
 * ADOPTS the scale rather than tuning itself into its own private one.
 */
.script-table td { font-size: var(--text-sm); }
.script-table th { font-size: var(--text-label); }

/* The Seed Editor's dot, in the number column. */
.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 0.45rem;
  vertical-align: middle;
  border: 1px solid var(--line);
}
/* The per-row dot reports HAS-A-TARGET / NO-TARGET / UNSAVED. Presence is a
   filled ink dot; absence is an unfilled dashed ring; an unsaved draft is the
   filled dot plus the row's own inset bar, which is the louder channel. */
.status-dot.dot-has-target { background: var(--ink); border-color: var(--ink); }
.status-dot.dot-unsaved { background: var(--ink); border-color: var(--ink); box-shadow: 0 0 0 2px var(--surface), 0 0 0 3px var(--ink); }
.status-dot.dot-none { background: none; border-style: dashed; border-color: var(--faint); opacity: 0.6; }

/*
 * PHONE, 430px. Six columns do not fit a phone, and a sideways-scrolling table
 * is a page you cannot read a sentence on. script-rows.css already stacks the
 * row into blocks below 760px; the overlay cells join that stack, each one
 * labelled by ScriptLineCell, in canonical → known → target order.
 */
@media (max-width: 760px) {
  .script-table { table-layout: auto; }
  .col-ref, .col-speaker, .col-canonical, .col-overlay, .col-state { width: auto; }
}

/* Tap is the only affordance: every control here is a button with a finger-sized
   target. No drag, no swipe, no long-press — Tom reads this on a 430px phone. */
.chip {
  min-height: 32px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: var(--text-xs);
  line-height: 1.2;
  color: var(--muted);
  border: 1px solid var(--line);
  background: var(--surface-2);
}
.chip:hover { color: var(--ink); border-color: var(--muted); }
.chip.on { color: var(--ink); border-color: var(--ink); font-weight: 600; }
.chip.restore { color: var(--ink); border-color: var(--muted); }
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
/* A word diff is already TWO redundant channels without a hue — underline for
   what comes in, strike-through for what goes. Ink for both: the decoration is
   the measurement, and it survives a colourblind reader where green/red does
   not. */
.diff .add { color: var(--ink); font-weight: 600; text-decoration: underline; }
.diff .del { color: var(--muted); text-decoration: line-through; }
.diff .same { opacity: 0.6; }
</style>
