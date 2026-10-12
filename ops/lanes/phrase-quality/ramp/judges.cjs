// RAMP 967 judges: the lane's two-judgement contract (lanes.js LABOUR_BRIEFS / REVIEW_BRIEFS
// "phrase-quality") restated for direct model calls. Pure: no DB, no git, no model calls — run-ramp.cjs
// feeds it a window export and the course's earlier LEGO targets, and parses what comes back.
//   Judge A (finder, Sonnet) = the lane's Codex labour: list BAD phrases, each with at most one replacement.
//   Judge B (reviewer, Opus, a fresh context) = the lane's Opus review: verdict on each line cold, and
//   keeps A's replacement only if it would make exactly that one. Both must say BAD (README rule 1).
'use strict'
const fs = require('fs'), path = require('path')

const RUBRIC = fs.readFileSync(path.join(__dirname, '..', 'RUBRIC.md'), 'utf8')

const LANG = { eng: 'English', spa: 'Spanish', fra: 'French', deu: 'German', ita: 'Italian', por: 'Portuguese', jpn: 'Japanese', kor: 'Korean', zho: 'Mandarin Chinese',
  ara: 'Arabic', ben: 'Bengali', guj: 'Gujarati', hin: 'Hindi', kan: 'Kannada', mar: 'Marathi', pan: 'Punjabi', tam: 'Tamil', tel: 'Telugu', urd: 'Urdu', sin: 'Sinhala',
  glg: 'Galician', hrv: 'Croatian', afr: 'Afrikaans', bul: 'Bulgarian', cat: 'Catalan', ces: 'Czech', dan: 'Danish', ell: 'Greek', est: 'Estonian', eus: 'Basque',
  fas: 'Persian', gle: 'Irish', heb: 'Hebrew', hun: 'Hungarian', hye: 'Armenian', isl: 'Icelandic', lav: 'Latvian', lit: 'Lithuanian', nep: 'Nepali', nld: 'Dutch',
  nor: 'Norwegian', pol: 'Polish', ron: 'Romanian', rus: 'Russian', srp: 'Serbian', swa: 'Swahili', swe: 'Swedish', tha: 'Thai', tur: 'Turkish', ukr: 'Ukrainian' }
const VARIANT = { eg: 'Egyptian', lb: 'Levantine (Lebanese)', br: 'Brazilian', mx: 'Mexican', at: 'Austrian' }
// "spa_mx_for_eng" → {target: "Mexican Spanish", known: "English"}
function languages(course) {
  const [t, k] = course.split('_for_')
  const [code, variant] = t.split('_')
  return { target: `${variant && VARIANT[variant] ? VARIANT[variant] + ' ' : ''}${LANG[code] || code}`, known: LANG[k] || k }
}

const q = (s) => JSON.stringify(String(s ?? ''))
// The window as compact text: every seed, every LEGO, every phrase row with its id and role.
function renderWindow(win) {
  const L = []
  for (const s of win.seeds) {
    L.push(`SEED ${s.seed_number}: known ${q(s.known_text)} | target ${q(s.target_text)}`)
    for (const l of s.legos) {
      L.push(`  LEGO ${l.lego_id} [${l.type}] known ${q(l.known_text)} = target ${q(l.target_text)}`)
      for (const p of l.phrases) {
        const tag = p.phrase_role === 'component' ? 'COMPONENT (out of scope)' : p.phrase_role.toUpperCase()
        L.push(`    ${p.id} ${tag}: ${q(p.known_text)} => ${q(p.target_text)}`)
      }
    }
  }
  if (win.zutCollisions && win.zutCollisions.length) {
    L.push('', 'COURSE-WIDE ZUT GROUPS touching this window (one normalised known, several targets):')
    for (const g of win.zutCollisions) L.push(`  known ${q(g.known)}: ` + g.rows.map((r) => `${r.id} (${r.role}, seed ${r.seed}) => ${q(r.target)}`).join('; '))
  }
  return L.join('\n')
}
function renderPrior(priorTargets) {
  if (!priorTargets || !priorTargets.length) return '(none: this window starts the course)'
  return priorTargets.join(' · ')
}

function finderPrompt(win, priorTargets) {
  const { target, known } = languages(win.course)
  const system = `You are the first of two independent judges in the SSi phrase-quality lane. You read one 20-seed window of a language course and list the practice phrases that are BAD. Answer with a JSON array only, no prose before or after.

The course is ${win.course}: the learner already speaks ${known} (the KNOWN side) and is learning ${target} (the TARGET side).

THE RUBRIC (Tom's rules, exact):
${RUBRIC}

YOUR TASK:
- Judge every BUILD and USE practice phrase in the window, reading each one inside its seed and beside its sibling rows. Check grammar and meaning in ${target}, naturalness and clunkiness in ${known}, and the ZUT groups listed. Seeds, LEGOs and COMPONENT rows are out of scope: never list them.
- For each phrase you judge BAD give one object: {"row_id": "<exact id>", "after": {"known": "...", "target": "..."} or null, "problem": "<one line: which rule and what is wrong>", "evidence": "<one or two lines: the seed or sibling that proves it>"}.
- "after" is your best replacement. Include only the side(s) you change. It must contain the LEGO's exact target, and may use only vocabulary the course has already taught: the earlier-LEGO list below, plus LEGOs of earlier seeds in this window and earlier LEGOs of the same seed. No parentheses ever. If no clean replacement exists, "after" is null.
- When unsure a phrase is bad, leave it out: a false "bad" costs a real phrase. If nothing is bad, answer [].`
  const user = `TARGET TEXT OF EVERY LEGO TAUGHT BEFORE SEED ${win.from} (vocabulary already available):
${renderPrior(priorTargets)}

THE WINDOW, seeds ${win.from}-${win.to}:
${renderWindow(win)}

Answer with the JSON array of BAD phrases only.`
  return { system, user }
}

function reviewerPrompt(win, priorTargets, findings) {
  const { target, known } = languages(win.course)
  const system = `You are the SECOND, independent judge in the SSi phrase-quality lane. Another model has listed practice phrases it judges BAD in one 20-seed window of a language course. Judge each listed line cold, by the rubric, from the window itself: you are not there to agree. Answer with a JSON array only, no prose before or after.

The course is ${win.course}: the learner already speaks ${known} (the KNOWN side) and is learning ${target} (the TARGET side).

THE RUBRIC (Tom's rules, exact):
${RUBRIC}

YOUR TASK, for EVERY listed line, one object: {"row_id": "<id>", "verdict": "BAD" or "NOT-BAD", "reason": "<one line>", "keep_after": true or false}.
- BAD only if the phrase really breaks a rule above: wrong grammar or meaning in ${target}, a clunky or wrong ${known} prompt (tier 2 or 3), a genuine ZUT collision, parentheses, wrong register, a dishonest gloss. "A native might say it differently" is NOT bad. When in doubt, NOT-BAD: a false "bad" costs a real phrase.
- keep_after is true only if the verdict is BAD AND the proposed replacement is exactly the one you would make: correct, natural, contains the LEGO's exact target, uses only vocabulary already taught. Otherwise false. Never propose your own replacement.`
  const lines = findings.map((f) => JSON.stringify({ row_id: f.row_id, role: f.role, before: f.before, proposed_after: f.after, problem: f.problem, evidence: f.evidence }))
  const user = `TARGET TEXT OF EVERY LEGO TAUGHT BEFORE SEED ${win.from} (vocabulary already available):
${renderPrior(priorTargets)}

THE WINDOW, seeds ${win.from}-${win.to}:
${renderWindow(win)}

THE LINES THE OTHER JUDGE CALLED BAD (${findings.length}):
${lines.join('\n')}

Answer with the JSON array of verdicts only, one per line above.`
  return { system, user }
}

// The first JSON array in a model's answer (tolerates a ```json fence or stray prose around it).
function parseArray(text) {
  const s = String(text || '')
  const a = s.indexOf('['), b = s.lastIndexOf(']')
  if (a < 0 || b < a) throw new Error('no JSON array in the answer')
  const v = JSON.parse(s.slice(a, b + 1))
  if (!Array.isArray(v)) throw new Error('answer is not an array')
  return v
}

// Every BUILD/USE row of the window by id.
function practiceRows(win) {
  const m = new Map()
  for (const s of win.seeds) for (const l of s.legos) for (const p of l.phrases)
    if (p.phrase_role === 'build' || p.phrase_role === 'use') m.set(p.id, { ...p, legoTarget: l.target_text })
  return m
}
const cleanAfter = (a, row) => {
  if (!a || typeof a !== 'object') return null
  const out = {}
  if (typeof a.known === 'string' && a.known.trim() && a.known.trim() !== row.known_text) out.known = a.known.trim()
  if (typeof a.target === 'string' && a.target.trim() && a.target.trim() !== row.target_text) out.target = a.target.trim()
  return Object.keys(out).length ? out : null
}
// Judge A's answer → the lane's finding lines. "before" is filled from the export, never from the model,
// so it is the exact current text; unknown ids, out-of-scope roles and duplicates are dropped.
function toFindings(win, raw) {
  const rows = practiceRows(win), seen = new Set(), out = []
  for (const f of raw) {
    const row = f && rows.get(f.row_id)
    if (!row || seen.has(row.id)) continue
    seen.add(row.id)
    out.push({ row_id: row.id, seed_number: row.seed_number, lego_index: row.lego_index, role: row.phrase_role,
      before: { known: row.known_text, target: row.target_text }, after: cleanAfter(f.after, row),
      problem: String(f.problem || '').slice(0, 600), evidence: String(f.evidence || '').slice(0, 900) })
  }
  return out
}
// Judge B's answer + A's findings → verdict lines (every finding, missing = NOT-BAD) and agreed lines
// (both BAD; A's "after" kept only when B would make exactly it, else null — as REVIEW_BRIEFS step 2).
function toVerdicts(findings, raw) {
  const by = new Map(raw.filter((v) => v && v.row_id).map((v) => [v.row_id, v]))
  const verdicts = [], agreed = []
  for (const f of findings) {
    const v = by.get(f.row_id)
    const verdict = v && String(v.verdict).toUpperCase() === 'BAD' ? 'BAD' : 'NOT-BAD'
    const reason = v ? String(v.reason || '').slice(0, 600) : 'the reviewer returned no verdict for this line'
    verdicts.push({ ...f, verdict, reason })
    if (verdict === 'BAD') agreed.push({ ...f, after: v.keep_after === true ? f.after : null })
  }
  return { verdicts, agreed }
}

module.exports = { languages, renderWindow, finderPrompt, reviewerPrompt, parseArray, toFindings, toVerdicts, practiceRows }
