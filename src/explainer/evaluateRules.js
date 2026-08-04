/**
 * evaluateRules — the RUNTIME half of Popty's self-explaining pack
 * (docs/self-explaining-popty.md §5, §4). Evaluates the compiled pack's
 * declarative noticing rules against either the pack's own compile-time
 * `snapshot` or a payload object the mounting page already fetched — zero
 * new queries, zero model calls, zero polling. Output is gentle invitations
 * (never missions): a sentence and an optional deep link, rendered
 * dismissible by NoticingInvitations.vue.
 *
 * Plain JS port of the first proof (ssi-learning-app
 * packages/player-vue/src/explainer/evaluateRules.ts), extended with a
 * `source: 'snapshot' | 'payload'` field per tools/explainer/rules.json's
 * documented join conventions.
 */

function get(obj, path) {
  let cur = obj
  for (const seg of path.split('.')) {
    if (cur == null) return undefined
    cur = cur[seg]
  }
  return cur
}

function holds(cond, scope) {
  const v = get(scope, cond.path)
  switch (cond.op) {
    case 'eq': return v === cond.value
    case 'gt': return typeof v === 'number' && v > cond.value
    case 'lt': return typeof v === 'number' && v < cond.value
    case 'gte': return typeof v === 'number' && v >= cond.value
    case 'lte': return typeof v === 'number' && v <= cond.value
    case 'truthy': return !!v
    case 'falsy': return !v
    case 'daysSinceGt': {
      if (!v) return false
      const days = (Date.now() - new Date(v).getTime()) / 86400000
      return days > cond.value
    }
    default: return false
  }
}

const allHold = (conds, scope) => (conds ?? []).every((c) => holds(c, scope))

/** `{path.to.field}` interpolation from the match scope; `{count}` is special. */
function interpolate(template, scope, count) {
  if (!template) return template
  return template.replace(/\{([\w.]+)\}/g, (_, p) => {
    if (p === 'count' && count !== undefined) return String(count)
    const v = get(scope, p)
    return v == null ? '' : String(v)
  })
}

/**
 * Semantic CTA targets resolve to null (no navigation — the rule already
 * fires on the page the invitation is about, e.g. QAReview/RecordRoom).
 * A literal path template (starts with '/') is interpolated against the
 * match scope, e.g. "/course/{code}".
 */
function resolveTarget(target, scope, count) {
  if (!target) return null
  if (!target.startsWith('/')) return null
  return interpolate(target, scope, count)
}

/**
 * A 'walk:<id>' CTA offers a "how this works" clip instead of navigating: the
 * invitation carries a `walk` field, NoticingInvitations renders it as a
 * "Show me" button, and the tap calls startWalk. Lockstep-checked by
 * tools/walkthrough/lib.mjs (gateOffers), which fails the build if this
 * prefix handling ever leaves the evaluator or names a clip that does not
 * exist — or one still marked skeleton.
 */
function resolveWalk(target) {
  if (!target || !target.startsWith('walk:')) return null
  return target.slice(5) || null
}

const MAX_PER_RULE = 3

/**
 * @param {Array} rules - pack.rules (tools/explainer/rules.json shape)
 * @param {{snapshot?: object, payload?: object}} data - pack.snapshot and/or
 *   the mounting page's own payload (already joined with any snapshot flags
 *   the mount needs, per rules.json's documented join conventions)
 * @param {string} persona - 'admin' | 'editor' | 'recorder'
 * @param {string} mount - 'home' | 'record-room' | 'qa'
 */
export function evaluateRules(rules, data, persona, mount) {
  const snapshot = data?.snapshot ?? {}
  const payload = data?.payload ?? {}
  const out = []

  for (const rule of rules ?? []) {
    if (rule.mount !== mount) continue
    if (!rule.personas?.includes(persona)) continue

    if (rule.shape === 'node') {
      const scope = rule.source === 'snapshot' ? snapshot : payload
      if (!allHold(rule.when, scope)) continue
      out.push({
        key: rule.id,
        ruleId: rule.id,
        text: interpolate(rule.invitation, scope),
        ctaLabel: interpolate(rule.cta?.label, scope),
        to: resolveTarget(rule.cta?.target, scope),
        walk: resolveWalk(rule.cta?.target),
      })
      continue
    }

    const items = get(payload, rule.arrayPath || '')
    if (!Array.isArray(items)) continue
    // perChild/countWhere over a snapshot-sourced check: join each item with
    // its own snapshot slice (keyed by the item's `code`) before testing —
    // the joinConvention documented in tools/explainer/rules.json.
    const scopedItems = rule.source === 'snapshot'
      ? items.map((item) => ({ ...item, ...(snapshot.vocabGate?.[item.code] ?? {}) }))
      : items
    const matches = scopedItems.filter((item) => allHold(rule.itemWhen, item))

    if (rule.shape === 'countWhere') {
      if (matches.length >= (rule.min ?? 1)) {
        out.push({
          key: rule.id,
          ruleId: rule.id,
          text: interpolate(rule.invitation, payload, matches.length),
          ctaLabel: interpolate(rule.cta?.label, payload, matches.length),
          to: resolveTarget(rule.cta?.target, payload, matches.length),
          walk: resolveWalk(rule.cta?.target),
        })
      }
    } else if (rule.shape === 'perChild') {
      for (const item of matches.slice(0, MAX_PER_RULE)) {
        out.push({
          key: `${rule.id}:${item.code ?? item.id ?? ''}`,
          ruleId: rule.id,
          text: interpolate(rule.invitation, item),
          ctaLabel: interpolate(rule.cta?.label, item),
          to: resolveTarget(rule.cta?.target, item),
          walk: resolveWalk(rule.cta?.target),
        })
      }
    }
  }

  return out
}
