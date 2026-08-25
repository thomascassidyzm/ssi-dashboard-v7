#!/usr/bin/env node
/**
 * SSi Release Notes — generate a LEARNER-FACING release note from the
 * learning-app's main..staging delta, then publish it.
 *
 * Mirrors services/insight-discovery.cjs: hand-rolled env loader, raw fetch
 * against Supabase REST with the service key, and `claude --print` on the Pro
 * Max SUBSCRIPTION (never the billed API — ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN
 * / CLAUDECODE are scrubbed from the child env). Zero npm deps so it runs with
 * plain `node`.
 *
 * Flow:
 *   generateDraft()  — read main..staging via LOCAL git on the machine (mirrors
 *                      services/publish-manifest-service.cjs — shells out to git
 *                      against a sibling repo cloned on the machine, using the
 *                      machine's SSH creds; no GitHub token), filter engineering
 *                      noise, ask claude for a concise note, INSERT a DRAFT
 *                      (is_published=false) into release_notes, return it.
 *   publishNote()    — flip a draft to is_published=true, saving any user edits.
 *
 * The release_notes table is SHARED with the learning-app, which renders the
 * published note to learners at /admin/release-notes.
 *
 * Usage (CLI, optional — the dashboard API calls the exports directly):
 *   node services/release-notes.cjs            # generate a draft -> stdout
 */
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync, execSync } = require('child_process')
const { CLAUDE_CONFIG_DIR } = require('./shared/claude-config.cjs')

function loadEnv(p) {
  if (!fs.existsSync(p)) return
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '')
  }
}
loadEnv(path.join(__dirname, '..', '.env'))
loadEnv(path.join(__dirname, '..', '.env.local'))

// Env-name fallbacks so this runs in either repo: learning-app uses
// VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY; the dashboard (SSi Machine)
// uses SUPABASE_URL / SUPABASE_SERVICE_KEY. (Same as insight-discovery.cjs.)
const BASE = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

// Local clone of the learning-app repo on the machine. We read main..staging
// via LOCAL git (the machine already has SSH access for deploy) — no GitHub
// token. Mirrors COURSE_CONFIGS_REPO in publish-manifest-service.cjs.
const LEARNING_APP_REPO = process.env.LEARNING_APP_REPO || path.join(os.homedir(), 'Documents', 'GitHub', 'ssi-learning-app')

// Filter engineering noise EXACTLY like the learning-app CLI drafter.
const NOISE_TYPES = /^(chore|test|ci|build|refactor|style|perf|docs|deps|wip|revert)\b/i
const NOISE_LINES = /^(promote|merge\b|merge branch|merge pull request|merge remote)/i

// House style, Tom's ruling 2026-08-24 (plate A-258), general rule for ALL future
// learner-facing release notes: "too much information for learners - general rules:
// 3 biggest headlines (to the learner's viewpoint) + bug fixes etc." At most 3
// headline-level bullets, each a plain warm sentence, chosen for LEARNER impact —
// not commit volume. The closing catch-all line is appended in code (below), never
// left to the model, so it's guaranteed present by construction.
const CATCH_ALL_LINE = 'Plus bug fixes and improvements.'

const PROMPT = (subjects) => `
You are drafting a SUPER-CONCISE, LEARNER-FACING release note for SSi, a language-learning app. Below is the raw list of git commit subjects shipped in this release. Translate them into what the LEARNER actually gets — plain language, no jargon, no commit-speak, no internal/technical detail.

Rules:
- Write for a language learner using the app, not a developer. No file names, no "refactor", no ticket-speak, no acronyms unless a learner would know them.
- GROUP related commits into one bullet (e.g. several tiling/pinyin commits -> one bullet about clearer pronunciation help).
- SKIP anything internal: tests, refactors, telemetry, build/ops, admin-only tooling, insight/analytics dashboards (those are for the team, not learners).
- Pick AT MOST 3 headline bullets — the 3 biggest changes from the LEARNER's viewpoint, biggest impact first. This is a hard cap: even if many things shipped, only the 3 most learner-impactful make the cut. If there's genuinely only 1 or 2 learner-facing headlines, use fewer — never pad to 3.
- Each headline bullet is one short, warm, plain sentence describing the benefit. No markdown, no leading dashes, no commit-speak.
- Do NOT write a catch-all "bug fixes" line yourself — that is added automatically afterwards. Just give the headline bullets.
- A short, warm, plain overall headline (<= ~8 words) summarising the release.
- Be honest, never invent features.

Return ONLY strict JSON, no prose, no markdown fence:
{"headline": "...", "bullets": ["...", "...", "..."]}

COMMIT SUBJECTS:
${subjects.map(s => '- ' + s).join('\n')}
`.trim()

/**
 * Generate a DRAFT release note from the learning-app main..staging delta.
 * @param {object} [opts]
 * @param {string} [opts.version] - override the version SHA (default: staging tip short SHA)
 * @returns {Promise<{id, version, headline, bullets, commitCount}>}
 */
async function generateDraft(opts = {}) {
  if (!BASE || !KEY) throw new Error('Missing SUPABASE env (SUPABASE_URL / SUPABASE_SERVICE_KEY)')

  // --- read main..staging via LOCAL git (machine SSH creds; no token) ---
  // Mirrors checkCourseConfigsRepo() in publish-manifest-service.cjs.
  if (!fs.existsSync(path.join(LEARNING_APP_REPO, '.git'))) {
    throw new Error(`learning-app repo not found at ${LEARNING_APP_REPO}. Clone it first: git clone git@github.com:thomascassidyzm/ssi-learning-app.git "${LEARNING_APP_REPO}"  (or set LEARNING_APP_REPO in the dashboard env).`)
  }

  let rawSubjects = []
  let version = opts.version
  try {
    // refresh remote refs (uses the machine's SSH creds, like publish-manifest)
    execSync('git fetch origin --quiet', { cwd: LEARNING_APP_REPO, encoding: 'utf-8', stdio: 'pipe', timeout: 60000 })
    const raw = execSync('git log origin/main..origin/staging --no-merges --pretty=%s', { cwd: LEARNING_APP_REPO, encoding: 'utf-8', stdio: 'pipe' })
    rawSubjects = raw.split('\n').map(s => s.trim()).filter(Boolean)
    if (!version) {
      version = execSync('git rev-parse --short=7 origin/staging', { cwd: LEARNING_APP_REPO, encoding: 'utf-8', stdio: 'pipe' }).trim()
    }
  } catch (e) {
    // surface git's stderr — execSync hides it in error.message otherwise
    const stderr = (e.stderr && e.stderr.toString().trim()) || ''
    throw new Error(`Failed to read main..staging from local git at ${LEARNING_APP_REPO}: ${e.message}${stderr ? ` | ${stderr.slice(0, 300)}` : ''}`)
  }

  console.log(`[ReleaseNotes] main..staging — ${rawSubjects.length} commits (local git), version=${version}`)

  // filter noise, then de-dupe identical subjects (preserve order)
  const seen = new Set()
  const subjects = []
  for (const s of rawSubjects) {
    if (NOISE_TYPES.test(s) || NOISE_LINES.test(s)) continue
    if (seen.has(s)) continue
    seen.add(s)
    subjects.push(s)
  }

  if (subjects.length === 0) throw new Error('No learner-facing changes in main..staging.')

  // --- claude --print on the subscription (scrub billed key + CLAUDECODE) ---
  const childEnv = { ...process.env }
  delete childEnv.ANTHROPIC_API_KEY      // never bill — use the Max subscription
  delete childEnv.ANTHROPIC_AUTH_TOKEN
  delete childEnv.CLAUDECODE             // required for nested claude --print calls
  childEnv.CLAUDE_CONFIG_DIR = CLAUDE_CONFIG_DIR  // pin the claude@ account

  let raw
  try {
    raw = execFileSync('claude', ['--print', '--model', 'sonnet', PROMPT(subjects)],
      { env: childEnv, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 180_000 })
  } catch (e) {
    throw new Error(`claude --print failed: ${e.message}`)
  }

  // --- parse strict JSON tolerantly ---
  let text = String(raw).replace(/```json|```/g, '').trim()
  const first = text.indexOf('{'), last = text.lastIndexOf('}')
  if (first !== -1 && last !== -1) text = text.slice(first, last + 1)
  let parsed
  try { parsed = JSON.parse(text) }
  catch (e) { throw new Error(`Could not parse release-note JSON from claude. Raw:\n${raw}`) }

  if (typeof parsed.headline !== 'string' || !Array.isArray(parsed.bullets)) {
    throw new Error('claude returned malformed release note (need {headline: string, bullets: array}).')
  }
  const headline = parsed.headline.trim()
  // House style (Tom, 2026-08-24, plate A-258): at most 3 headline bullets, then a
  // single closing catch-all line — enforced here, not left to the model.
  const bullets = parsed.bullets
    .map(b => String(b).replace(/^[-•\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3)
  bullets.push(CATCH_ALL_LINE)

  // --- INSERT a DRAFT into release_notes (return the new row) ---
  const insertRes = await fetch(`${BASE}/rest/v1/release_notes`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      version,
      released_at: new Date().toISOString(),
      headline,
      bullets,            // text[] — supabase/PostgREST maps a JS array to a Postgres text array
      is_published: false,
    }),
  })
  if (!insertRes.ok) {
    const body = await insertRes.text().catch(() => '')
    throw new Error(`Failed to insert draft into release_notes (HTTP ${insertRes.status}): ${body.slice(0, 300)}`)
  }
  const rows = await insertRes.json()
  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row || !row.id) throw new Error('release_notes insert returned no row id')

  return { id: row.id, version, headline, bullets, commitCount: subjects.length }
}

/**
 * Publish a draft: flip is_published=true, re-stamp released_at, stamp version with
 * the DEPLOYED build SHA (origin/main), and save any user edits to headline/bullets.
 * @param {object} args
 * @param {string|number} args.id - release_notes row id
 * @param {string} [args.headline] - edited headline (saved if provided)
 * @param {string[]} [args.bullets] - edited bullets (saved if provided)
 * @returns {Promise<object>} the updated row
 */
async function publishNote({ id, headline, bullets } = {}) {
  if (!BASE || !KEY) throw new Error('Missing SUPABASE env (SUPABASE_URL / SUPABASE_SERVICE_KEY)')
  if (id === undefined || id === null || id === '') throw new Error('publishNote requires an id')

  const patch = { is_published: true, released_at: new Date().toISOString() }
  if (typeof headline === 'string') patch.headline = headline.trim()
  if (Array.isArray(bullets)) {
    patch.bullets = bullets.map(b => String(b).replace(/^[-•\s]+/, '').trim()).filter(Boolean)
  }

  // Stamp version with the DEPLOYED build SHA (origin/main), not the staging tip.
  // Publishing happens AFTER staging→main, so origin/main is the commit that ships,
  // and the learner app's __BUILD_NUMBER__ (= VERCEL_GIT_COMMIT_SHA.slice(0,7)) will
  // equal it — so the note's version matches the learner's build number, and the
  // app's "you're on this version" check (note.version === buildNumber) works.
  // If git is unavailable, leave the existing version untouched (don't break publish).
  try {
    if (fs.existsSync(path.join(LEARNING_APP_REPO, '.git'))) {
      execSync('git fetch origin --quiet', { cwd: LEARNING_APP_REPO, encoding: 'utf-8', stdio: 'pipe', timeout: 60000 })
      const sha = execSync('git rev-parse --short=7 origin/main', { cwd: LEARNING_APP_REPO, encoding: 'utf-8', stdio: 'pipe' }).trim()
      if (sha) patch.version = sha
    }
  } catch (e) {
    console.warn(`[ReleaseNotes] could not stamp deployed origin/main SHA at publish (keeping existing version): ${e.message}`)
  }

  const res = await fetch(`${BASE}/rest/v1/release_notes?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to publish release_notes row ${id} (HTTP ${res.status}): ${body.slice(0, 300)}`)
  }
  const rows = await res.json()
  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row) throw new Error(`release_notes row ${id} not found`)
  return row
}

/**
 * List unpublished drafts, newest-first (for the UI to show pending drafts).
 * @returns {Promise<object[]>}
 */
async function listDrafts() {
  if (!BASE || !KEY) throw new Error('Missing SUPABASE env (SUPABASE_URL / SUPABASE_SERVICE_KEY)')
  const res = await fetch(
    `${BASE}/rest/v1/release_notes?is_published=eq.false&order=created_at.desc&select=id,version,released_at,headline,bullets,is_published,created_at`,
    { headers: H },
  )
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to list release_notes drafts (HTTP ${res.status}): ${body.slice(0, 300)}`)
  }
  return res.json()
}

module.exports = { generateDraft, publishNote, listDrafts }

// CLI entry (optional): `node services/release-notes.cjs`
if (require.main === module) {
  generateDraft()
    .then(d => { console.log(JSON.stringify(d, null, 2)) })
    .catch(e => { console.error(e.message); process.exit(1) })
}
