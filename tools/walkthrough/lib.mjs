/**
 * Walkthrough compiler — the PURE validation half (the DRIFT GATE).
 *
 * "How this works clips" are hand-authored JSON (tools/walkthrough/walks/*.json
 * — the DECISIONS); this module is the gate between them and the live Vue
 * source. A step anchored to an element that no longer exists, offered to a
 * persona who cannot see it, or a walk that has grown to five steps — each
 * FAILS THE BUILD, exactly like the explainer pack's gate.
 *
 * Ported from ssi-learning-app/tools/walkthrough/lib.mjs, with three of the
 * founder's rulings (2026-08-04) encoded as gates the original does not have:
 *
 *   · FEWER THAN 5 STEPS  — "< 5 steps", not "around five". Four is the cap;
 *     a longer journey is more than one clip, chained via `next`.
 *   · EVERY STEP IS A CHOICE — click, setting or toggle. A passive
 *     "look at this panel" step is not a clip step and does not compile.
 *   · PERSONA VISIBILITY IS DECLARED, NOT GUESSED — every anchor carries
 *     data-persona, cross-checked against the enclosing useAuth guards. The
 *     learning app's `v-if="!member"` heuristic does not exist in Popty; a
 *     straight port would have been a no-op that looks like a gate.
 *
 * Kept pure (no fs) so the gates unit-test with fixtures; compile.mjs is the
 * CLI shell that feeds it real files.
 */

// Popty's real personas — src/composables/useAuth.js (isAdmin / isRecorder /
// hasDashboardAccess) and the role <option>s in src/views/UserManagement.vue.
// Same three the explainer compiler calls APP_PERSONAS.
export const PERSONAS = ['admin', 'editor', 'recorder']

export const ADVANCE_KINDS = ['next', 'click', 'visible']

// Founder ruling 2026-08-04: "each step is a choice: click, setting, toggle".
export const CHOICE_KINDS = ['click', 'setting', 'toggle']

// Founder ruling 2026-08-04: "< 5 steps". Four is the cap, not a target.
export const MAX_STEPS = 4

// A walk is either finished training material or an honest placeholder. The
// runtime only ever offers 'authored' walks; 'skeleton' entries exist so the
// inventory of what Popty can DO is visible and countable without pretending
// the clips are written.
export const WALK_STATUSES = ['authored', 'skeleton']

// Marker an author leaves where a sentence needs Tom's voice. An `authored`
// walk carrying one fails the compile — the placeholder set cannot silently
// ship as finished training material.
export const NEEDS_VOICE_MARKER = 'TODO(tom)'

// The destructive-verb denylist, re-derived for Popty's own money-and-
// irreversibility surface (the learning app's list is about invites and
// entitlements; Popty's is about builds, TTS spend, audio passes and course
// deletion). A click-advance step on any of these is a BUILD FAILURE — a clip
// may point at them, never walk the user's finger onto them.
export const DESTRUCTIVE_ANCHOR_PATTERNS = [
  /delete/i, /purge/i, /remove/i, /reset/i, /revoke/i, /submit/i,
  /generate/i, /tts/i, /audio-pass/i, /regenerate/i, /rebuild/i, /build-start/i,
  /publish/i, /approve/i, /deploy/i, /spend/i, /queue/i, /cascade/i, /merge/i,
]

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])

// ─── Anchor indexing ────────────────────────────────────────────────────────

/**
 * Find every data-walk="<id>" occurrence in one .vue source, together with the
 * v-if/v-show expressions on the element ITSELF and on every enclosing element.
 * The ancestor chain is what makes the persona gate real: in Popty visibility
 * is almost never on the button — it is on the section wrapper three levels up.
 *
 * @returns {Array<{path, id, tag, personaAttr, guardExpr}>}
 */
export function anchorSitesIn(path, src) {
  const sites = []
  const stack = []
  const tagRe = /<\/?([a-zA-Z][\w.-]*)((?:"[^"]*"|'[^']*'|[^>'"])*?)(\/?)>/g
  let m
  while ((m = tagRe.exec(src)) !== null) {
    const [full, name, attrs, selfClose] = m
    if (full.startsWith('</')) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].name === name) { stack.length = i; break }
      }
      continue
    }
    const idMatch = attrs.match(/\bdata-walk="([a-z0-9-]+)"/)
    if (idMatch) {
      const chain = [...stack.map((s) => s.attrs), attrs].join(' ')
      sites.push({
        path,
        id: idMatch[1],
        tag: full,
        personaAttr: attrs.match(/\bdata-persona="([^"]*)"/)?.[1] ?? null,
        guardExpr: [...chain.matchAll(/\bv-(?:if|else-if|show)="([^"]*)"/g)].map((g) => g[1]),
      })
    }
    if (!selfClose && !VOID_TAGS.has(name.toLowerCase())) stack.push({ name, attrs })
  }
  return sites
}

/**
 * Which personas an element's guard expressions can possibly admit.
 * Heuristic and deliberately narrow: it only reads the useAuth flags Popty
 * actually guards on. An expression it does not recognise imposes no
 * constraint (returns all personas) — the mandatory data-persona declaration
 * is the primary teeth; this is the cross-check that catches a lying one.
 */
export function personasAdmittedByGuards(guardExprs) {
  let admitted = new Set(PERSONAS)
  const narrow = (allowed) => { admitted = new Set([...admitted].filter((p) => allowed.includes(p))) }
  for (const raw of guardExprs) {
    const expr = raw.replace(/\s+/g, '')
    // Negations first — "!isAdmin" also contains "isAdmin".
    if (/!isAdmin\b/.test(expr)) narrow(['editor', 'recorder'])
    else if (/\bisAdmin\b/.test(expr)) narrow(['admin'])
    if (/!isRecorder\b/.test(expr)) narrow(['admin', 'editor'])
    else if (/\bisRecorder\b/.test(expr)) narrow(['recorder'])
  }
  return admitted
}

/** Parse a data-persona attribute into a persona set. `all` = every persona. */
export function parsePersonaAttr(value) {
  const parts = String(value).trim().split(/[\s,]+/).filter(Boolean)
  if (parts.includes('all')) return { personas: new Set(PERSONAS), unknown: [] }
  return {
    personas: new Set(parts.filter((p) => PERSONAS.includes(p))),
    unknown: parts.filter((p) => !PERSONAS.includes(p)),
  }
}

// ─── Gates ──────────────────────────────────────────────────────────────────

/** Structural schema check — one error string per violation. */
export function validateWalkSchema(walk) {
  const errors = []
  const at = (msg) => errors.push(`SCHEMA: walk "${walk?.id ?? '?'}": ${msg}`)
  if (!walk || typeof walk !== 'object') return ['SCHEMA: walk is not an object']
  if (!walk.id || !/^[a-z0-9-]+$/.test(walk.id)) at('id must be kebab-case')
  if (!walk.title || typeof walk.title !== 'string') at('title is required')
  if (!WALK_STATUSES.includes(walk.status)) at(`status must be one of ${WALK_STATUSES.join('/')}`)
  if (!Array.isArray(walk.personas) || !walk.personas.length) at('personas[] is required')
  for (const p of walk.personas ?? []) {
    if (!PERSONAS.includes(p)) at(`unknown persona "${p}" (Popty has ${PERSONAS.join('/')})`)
  }
  if (!walk.place || typeof walk.place.section !== 'string') at('place.section is required')
  if (!Array.isArray(walk.steps) || !walk.steps.length) at('steps[] must be non-empty')
  // Founder ruling: fewer than five steps. Split the journey and chain it.
  if (Array.isArray(walk.steps) && walk.steps.length > MAX_STEPS) {
    at(`has ${walk.steps.length} steps — a clip is FEWER THAN 5 steps (max ${MAX_STEPS}). Split it and chain with "next".`)
  }
  walk.steps?.forEach((s, i) => {
    const n = i + 1
    if (!s.anchor || !/^[a-z0-9-]+$/.test(s.anchor)) at(`step ${n}: anchor must be kebab-case`)
    // Founder ruling: every step is a CHOICE.
    if (!CHOICE_KINDS.includes(s.choice)) {
      at(`step ${n}: choice must be one of ${CHOICE_KINDS.join('/')} — every step is a choice the user makes, not a panel to look at`)
    }
    if (!ADVANCE_KINDS.includes(s.advance?.on)) at(`step ${n}: advance.on must be one of ${ADVANCE_KINDS.join('/')}`)
    if (s.terminal && i !== walk.steps.length - 1) at(`step ${n}: terminal only allowed on the last step`)
    // `say` is the one sentence explaining the step's PURPOSE.
    if (walk.status === 'authored') {
      if (typeof s.say !== 'string' || !s.say.trim()) at(`step ${n}: say is required on an authored walk`)
      else if (s.say.includes(NEEDS_VOICE_MARKER)) at(`step ${n}: say still carries ${NEEDS_VOICE_MARKER} — mark the walk "skeleton" until it is written`)
    } else if (s.say != null && typeof s.say !== 'string') {
      at(`step ${n}: say must be a string or null`)
    }
  })
  return errors
}

/** Every walk id unique, and every `next` pointer resolves. */
export function gateIdsAndChains(walks) {
  const failures = []
  const seen = new Set()
  for (const w of walks) {
    if (seen.has(w.id)) failures.push(`SCHEMA: duplicate walk id "${w.id}"`)
    seen.add(w.id)
  }
  for (const w of walks) {
    if (w.next && !seen.has(w.next)) failures.push(`CHAIN: walk "${w.id}" points next → "${w.next}" but no such walk exists`)
    if (w.next === w.id) failures.push(`CHAIN: walk "${w.id}" points next at itself`)
  }
  return { failures }
}

/**
 * Gate — anchor existence AND persona visibility, against the real Vue source.
 * `vueFiles` = [{ path, src }]. Skeleton walks are exempt from the anchor
 * check (their anchors are proposals, not yet annotated) but every OTHER gate
 * still applies to them; the compile reports the exemption as a count.
 */
export function gateAnchors(walks, vueFiles) {
  const failures = []
  const warnings = []
  const sitesById = new Map()
  for (const { path, src } of vueFiles) {
    for (const site of anchorSitesIn(path, src)) {
      if (!sitesById.has(site.id)) sitesById.set(site.id, [])
      sitesById.get(site.id).push(site)
    }
  }
  const referenced = new Set()
  let skeletonSteps = 0

  for (const walk of walks) {
    for (const step of walk.steps ?? []) {
      if (walk.status === 'skeleton') { skeletonSteps += 1; continue }
      referenced.add(step.anchor)
      const sites = sitesById.get(step.anchor)
      if (!sites) {
        failures.push(`ANCHOR: walk "${walk.id}" step anchor "${step.anchor}" has no data-walk="${step.anchor}" in any .vue source`)
        continue
      }
      for (const site of sites) {
        // 1. Declaration is mandatory. Absence is a failure, never a silent
        //    pass — this is what stops the gate degrading into a no-op.
        if (site.personaAttr === null) {
          failures.push(`PERSONA: anchor "${step.anchor}" in ${site.path} carries no data-persona — every walk anchor must declare who can see it (admin/editor/recorder, or "all")`)
          continue
        }
        const { personas: declared, unknown } = parsePersonaAttr(site.personaAttr)
        if (unknown.length) {
          failures.push(`PERSONA: anchor "${step.anchor}" in ${site.path} declares unknown persona(s) ${unknown.join('/')} — Popty has ${PERSONAS.join('/')}`)
          continue
        }
        if (!declared.size) {
          failures.push(`PERSONA: anchor "${step.anchor}" in ${site.path} has an empty data-persona`)
          continue
        }
        // 2. The walk may only be offered to personas the anchor admits.
        const cannotSee = (walk.personas ?? []).filter((p) => !declared.has(p))
        if (cannotSee.length) {
          failures.push(`PERSONA: walk "${walk.id}" is offered to ${cannotSee.join('/')} but anchor "${step.anchor}" (${site.path}) is declared visible only to ${[...declared].join('/')}`)
        }
        // 3. The declaration must not lie about the useAuth guards around it.
        const admitted = personasAdmittedByGuards(site.guardExpr)
        const overclaimed = [...declared].filter((p) => !admitted.has(p))
        if (overclaimed.length) {
          failures.push(`PERSONA: anchor "${step.anchor}" in ${site.path} declares ${overclaimed.join('/')} but its enclosing guard (${site.guardExpr.join(' && ')}) only admits ${[...admitted].join('/')}`)
        }
      }
    }
  }
  for (const id of sitesById.keys()) {
    if (!referenced.has(id)) warnings.push(`orphan anchor data-walk="${id}" — no authored walk references it`)
  }
  return { failures, warnings, skeletonSteps }
}

/** Place validity, lockstep with the runtime's KNOWN_PLACES list. */
export function gatePlaces(walks, runtimeSrc) {
  const m = runtimeSrc.match(/KNOWN_PLACES\s*=\s*\[([^\]]*)\]/)
  if (!m) return { failures: ['LOCKSTEP: useWalkthrough.js no longer declares KNOWN_PLACES'], places: [] }
  const places = [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
  const failures = []
  for (const walk of walks) {
    if (!places.includes(walk.place?.section)) {
      failures.push(`PLACE: walk "${walk.id}" place.section "${walk.place?.section}" is not in the runtime's KNOWN_PLACES (${places.join(', ')})`)
    }
  }
  return { failures, places }
}

/**
 * Offer lockstep: every walk:<id> CTA in the explainer's rules.json must name
 * an AUTHORED walk in this pack, and the runtime evaluator must handle the
 * walk: prefix at all.
 */
export function gateOffers(walks, rulesJson, evaluateRulesSrc) {
  const failures = []
  const authored = new Set(walks.filter((w) => w.status === 'authored').map((w) => w.id))
  const all = new Set(walks.map((w) => w.id))
  for (const rule of rulesJson.rules ?? []) {
    const target = rule.cta?.target ?? ''
    if (!target.startsWith('walk:')) continue
    const id = target.slice(5)
    if (!all.has(id)) failures.push(`OFFER: rules.json rule "${rule.id}" targets walk:${id} but no such walk exists`)
    else if (!authored.has(id)) failures.push(`OFFER: rules.json rule "${rule.id}" targets walk:${id}, which is still a SKELETON — an unwritten clip must never be offered`)
  }
  if (!evaluateRulesSrc.includes("'walk:'")) {
    failures.push("LOCKSTEP: evaluateRules.js no longer handles the 'walk:' CTA prefix")
  }
  return { failures }
}

/** A click-advance step must never touch a destructive / money-spending verb. */
export function gateSafety(walks) {
  const failures = []
  for (const walk of walks) {
    for (const step of walk.steps ?? []) {
      if (step.advance?.on !== 'click') continue
      const hit = DESTRUCTIVE_ANCHOR_PATTERNS.find((re) => re.test(step.anchor))
      if (hit) {
        failures.push(`SAFETY: walk "${walk.id}" click-advance step anchors "${step.anchor}" (matches ${hit}) — destructive or money-spending verbs are show-and-point ONLY (advance.on: next)`)
      }
    }
  }
  return { failures }
}

/**
 * Never-auto-play, structurally. startWalk() in any .vue source may only
 * appear inside an @click handler attribute: a clip starts from a user tap or
 * not at all. A mounted-hook / watcher / query-param autostart shows up as a
 * script-block or non-click call and FAILS the build.
 */
export function gateNoAutoPlay(vueFiles) {
  const failures = []
  for (const { path, src } of vueFiles) {
    const calls = (src.match(/startWalk\s*\(/g) ?? []).length
    if (!calls) continue
    const inClick = (src.match(/@click(?:\.[a-z.]+)?="[^"]*startWalk\s*\([^"]*"/g) ?? []).length
    if (calls !== inClick) {
      failures.push(`AUTOPLAY: ${path} calls startWalk() outside an @click handler — clips must only ever start from a user tap`)
    }
  }
  return { failures }
}

/**
 * Runtime-denylist lockstep: useWalkthrough.js carries a runtime mirror of
 * DESTRUCTIVE_ANCHOR_PATTERNS, so a stale or hand-edited pack cannot make the
 * overlay attach a click-advance listener to a destructive verb.
 */
export function gateRuntimeDenylist(runtimeSrc) {
  const m = runtimeSrc.match(/DESTRUCTIVE_ANCHOR_PATTERNS\s*=\s*\[([^\]]*)\]/s)
  if (!m) {
    return { failures: ['LOCKSTEP: useWalkthrough.js no longer declares DESTRUCTIVE_ANCHOR_PATTERNS — the runtime safety mirror is gone'] }
  }
  const runtime = new Set([...m[1].matchAll(/\/(?:[^/\\\n]|\\.)+\/[a-z]*/g)].map((x) => x[0]))
  const failures = []
  for (const re of DESTRUCTIVE_ANCHOR_PATTERNS) {
    if (!runtime.has(re.toString())) {
      failures.push(`LOCKSTEP: runtime denylist in useWalkthrough.js is missing ${re} — mirror it verbatim`)
    }
  }
  return { failures }
}

/**
 * Coverage lockstep against the capability inventory (tools/walkthrough/
 * inventory.json): the founder's ruling is TOTAL COVERAGE — "anything that
 * popty.app can DO can/must be broken down into a clip". The inventory is the
 * ledger of what Popty can do; every walk must be an entry in it, so a clip
 * can never drift off the map, and the compile prints how much of the map is
 * actually authored.
 */
export function gateInventory(walks, inventory) {
  const failures = []
  const entries = inventory?.capabilities ?? []
  const ids = new Set(entries.map((c) => c.id))
  const seen = new Set()
  for (const c of entries) {
    if (seen.has(c.id)) failures.push(`INVENTORY: duplicate capability id "${c.id}"`)
    seen.add(c.id)
    if (!c.id || !/^[a-z0-9-]+$/.test(c.id)) failures.push(`INVENTORY: capability id "${c.id}" must be kebab-case`)
    if (!c.section) failures.push(`INVENTORY: capability "${c.id}" has no section`)
    if (!Array.isArray(c.personas) || !c.personas.length) failures.push(`INVENTORY: capability "${c.id}" has no personas`)
    for (const p of c.personas ?? []) {
      if (!PERSONAS.includes(p)) failures.push(`INVENTORY: capability "${c.id}" names unknown persona "${p}"`)
    }
  }
  for (const w of walks) {
    if (!ids.has(w.id)) failures.push(`INVENTORY: walk "${w.id}" is not in the capability inventory — every clip is a capability Popty has; add it there first`)
  }
  const authored = new Set(walks.filter((w) => w.status === 'authored').map((w) => w.id))
  return {
    failures,
    coverage: { capabilities: entries.length, authored: authored.size, skeleton: walks.length - authored.size },
  }
}

/**
 * Recorder confinement, straight off the router guard. src/router/index.js
 * bounces role 'recorder' to the Record Room from every other route ("a
 * recorder must bounce to /record/..., never to the course list"), so a clip
 * offered to a recorder anywhere but `record-room` is a lie no template-level
 * data-persona can catch — the guard is in the router, not the markup.
 *
 * Lockstep: if that guard ever leaves the router, this gate says so rather
 * than silently passing.
 */
export const RECORDER_SECTION = 'record-room'

export function gateRecorderConfinement(walks, routerSrc) {
  const failures = []
  if (!/isRecorder\.value/.test(routerSrc)) {
    return { failures: ['LOCKSTEP: src/router/index.js no longer confines recorders — re-derive the persona/place rule before trusting this gate'] }
  }
  for (const walk of walks) {
    if (!walk.personas?.includes('recorder')) continue
    if (walk.place?.section !== RECORDER_SECTION) {
      failures.push(`PERSONA: walk "${walk.id}" is offered to recorder at place "${walk.place?.section}", but the router guard confines recorders to the Record Room — a recorder can never stand on that page`)
    }
  }
  return { failures }
}

/** Deterministic pack assembly (version = content hash, stamped by the CLI). */
export function assemblePack(walks) {
  const sorted = [...walks].sort((a, b) => a.id.localeCompare(b.id))
  return { walks: sorted }
}

/** Run every gate; returns { failures, warnings, coverage, skeletonSteps }. */
export function runGates({ walks, vueFiles, runtimeSrc, rulesJson, evaluateRulesSrc, inventory, routerSrc }) {
  const failures = []
  const warnings = []
  for (const w of walks) failures.push(...validateWalkSchema(w))
  failures.push(...gateIdsAndChains(walks).failures)
  const anchors = gateAnchors(walks, vueFiles)
  failures.push(...anchors.failures)
  warnings.push(...anchors.warnings)
  failures.push(...gatePlaces(walks, runtimeSrc).failures)
  failures.push(...gateRecorderConfinement(walks, routerSrc ?? '').failures)
  failures.push(...gateOffers(walks, rulesJson, evaluateRulesSrc).failures)
  failures.push(...gateSafety(walks).failures)
  failures.push(...gateNoAutoPlay(vueFiles).failures)
  failures.push(...gateRuntimeDenylist(runtimeSrc).failures)
  const inv = gateInventory(walks, inventory)
  failures.push(...inv.failures)
  return { failures, warnings, coverage: inv.coverage, skeletonSteps: anchors.skeletonSteps }
}
