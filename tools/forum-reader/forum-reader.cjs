#!/usr/bin/env node
/**
 * Daily learner-forum reader for Kai (design: job #152·T, approved by Kai).
 *
 * Reads every public post on the SSi Discourse forum (en.forum.saysomethingin.com) newer than the
 * last run, and publishes ONE doc for Kai on days that have something for him:
 *   1. any post that @-mentions Kai — always, at the top, whatever it says, whoever wrote it;
 *   2. learner reports of a content error in any course, found by a cheap keyword filter, then ONE
 *      Sonnet pass (only on days the filter keeps anything), then a READ-ONLY lookup of each
 *      candidate's quoted wording in live Popty (GET learning-journey/search on :3470).
 *
 * It never fixes course content, never posts to the forum, never drafts replies, and writes nothing
 * except its own state file and the published doc.
 *
 * Staff are dropped by Discourse's own staff/moderator/admin flags on each post — no name list.
 *
 * State: the highest post id seen, in a file OUTSIDE git (default
 * ~/.local/state/popty-forum-reader/state.json, override with FORUM_READER_STATE or --state). It is
 * advanced only after the doc (if any) has been published, so a failed run is re-read next time.
 *
 * Usage:
 *   node tools/forum-reader/forum-reader.cjs                  # the daily run
 *   node tools/forum-reader/forum-reader.cjs --dry-run        # print the doc, publish nothing, keep state
 *   node tools/forum-reader/forum-reader.cjs --days 14        # read back 14 days instead of from state
 *   options: --no-llm  --no-popty  --state <file>  --conv-id <id>  --fixture <posts.json>
 * Install (Tom's step; daily 07:00 Europe/London, one transient timer unit, nothing installed by this file):
 *   systemd-run --user --unit=cs-forum-reader --slice=cs-workers.slice --on-calendar='*-*-* 07:00:00 Europe/London' --property=RuntimeMaxSec=1200 --working-directory=/home/tomcassidy/SSi/ssi-dashboard-v7-clean node tools/forum-reader/forum-reader.cjs
 * Test: npx vitest run tools/forum-reader/forum-reader.test.cjs
 */

const fs = require('fs')
const path = require('path')
const os = require('os')

const FORUM = 'https://en.forum.saysomethingin.com'
const POPTY = process.env.POPTY_URL || 'http://localhost:3470'
const SURFACE = process.env.SURFACE_URL || 'http://localhost:4317'
const KAI_USERNAME = 'kai'                      // Kai's Discourse handle (case-insensitive)
const DEFAULT_STATE = path.join(os.homedir(), '.local', 'state', 'popty-forum-reader', 'state.json')
const MAX_PAGES = 60                            // 50 posts a page: a 3000-post backlog cap
const FIRST_RUN_DAYS = 1                        // with no state file, read back this far

// ── the forum ──────────────────────────────────────────────────────────────────────────────────

async function getJson(url, { timeoutMs = 30000 } = {}) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`)
  return res.json()
}

/**
 * Every public post newer than `afterId` (and, if given, newer than `floorIso`), oldest first.
 * /posts.json is site-wide, newest first, 50 a page, paged by ?before=<id>.
 */
async function fetchNewPosts({ afterId = 0, floorIso = null, get = getJson, pause = 300 } = {}) {
  const out = []
  let before = null
  let capped = false
  for (let page = 0; ; page++) {
    if (page >= MAX_PAGES) { capped = true; break }
    const d = await get(`${FORUM}/posts.json${before ? `?before=${before}` : ''}`)
    const posts = (d && d.latest_posts) || []
    if (!posts.length) break
    let reachedOld = false
    for (const p of posts) {
      if (p.id <= afterId || (floorIso && p.created_at < floorIso)) { reachedOld = true; continue }
      out.push(p)
    }
    if (reachedOld) break
    before = Math.min(...posts.map(p => p.id))
    if (pause) await new Promise(r => setTimeout(r, pause))
  }
  const byId = new Map(out.map(p => [p.id, p]))
  return { posts: [...byId.values()].sort((a, b) => a.id - b.id), capped }
}

// ── cheap filtering ────────────────────────────────────────────────────────────────────────────

const isStaff = p => !!(p.staff || p.moderator || p.admin)
const isKai = p => String(p.username || '').toLowerCase() === KAI_USERNAME

/** An @kai mention in the raw text, or Discourse's rendered mention link to /u/kai. */
function mentionsKai(p) {
  const raw = String(p.raw || '')
  const cooked = String(p.cooked || '')
  const re = new RegExp(`(^|[^\\w@.])@${KAI_USERNAME}(?![\\w-])`, 'i')
  // quoted text from someone else's post is not a mention by this poster
  const unquoted = raw.replace(/\[quote[^\]]*\][\s\S]*?\[\/quote\]/gi, '')
  return re.test(unquoted) || new RegExp(`class="mention"[^>]*href="/u/${KAI_USERNAME}"`, 'i').test(cooked.replace(/<aside class="quote[\s\S]*?<\/aside>/gi, ''))
}

// Recall-first: anything that could be a learner pointing at a wrong word, prompt, translation or
// recording. False positives cost one line in the Sonnet prompt; a false negative is a lost report.
const CONTENT_SIGNAL = new RegExp([
  'wrong', 'error', 'mistake', 'typo', 'incorrect', 'correct', 'should(?: be|n.?t)', 'instead of',
  'translat', 'pronounc', 'mispronoun', 'spell', 'grammar', 'gender', 'plural', 'tense',
  'audio', 'recording', 'voice', 'sounds? like', 'says?\\b', 'said', 'cut off', 'cuts off', 'missing',
  'prompt', 'sentence', 'phrase', 'word', 'means?\\b', 'meaning', 'odd', 'weird', 'strange', 'confus',
  'bug', 'glitch', 'not right', 'isn.?t right', 'doesn.?t make sense', 'mismatch', 'duplicate',
  'challenge', 'lesson', 'level \\d', 'belt', 'seed', 'lego',
  'french', 'spanish', 'german', 'italian', 'portug', 'dutch', 'irish', 'gaelic', 'cornish', 'manx',
  'hindi', 'urdu', 'arabic', 'chinese', 'mandarin', 'cantonese', 'japanese', 'korean', 'swedish',
  'norwegian', 'danish', 'finnish', 'polish', 'russian', 'ukrainian', 'greek', 'turkish', 'hebrew',
  'basque', 'catalan', 'breton', 'welsh', 'cymraeg', 'english',
].join('|'), 'i')

function cheapCandidate(p) {
  return CONTENT_SIGNAL.test(`${p.topic_title || ''}\n${p.raw || ''}`)
}

/** Split a batch into what Kai always sees, what goes to Sonnet, and what is dropped. */
function triage(posts) {
  const live = posts.filter(p => !p.deleted_at && !p.user_deleted && !p.hidden)
  const mentions = live.filter(p => !isKai(p) && mentionsKai(p))
  const mentionIds = new Set(mentions.map(p => p.id))
  const learner = live.filter(p => !isStaff(p))
  const candidates = learner.filter(p => !mentionIds.has(p.id) && cheapCandidate(p))
  return { live, mentions, learner, candidates }
}

// ── the one Sonnet pass ────────────────────────────────────────────────────────────────────────

function clip(s, n) { s = String(s || ''); return s.length > n ? s.slice(0, n) + ' …[truncated]' : s }

function buildPrompt(posts, courses) {
  const courseLines = courses.map(c => `${c.code}: ${c.name}`).join('\n')
  const postBlocks = posts.map(p => [
    `=== post ${p.id} | topic "${p.topic_title}" | by ${p.username} | ${p.created_at.slice(0, 10)}`,
    clip(p.raw, 2500),
  ].join('\n')).join('\n\n')
  return `You are screening posts from the SaySomethingin learner forum for ONE purpose: finding learner reports of an ERROR IN COURSE CONTENT, in any course and any language — a wrong or unnatural translation, a prompt that doesn't match its answer, a wrong word, gender, tense or spelling, a mispronounced/cut-off/wrong-voice recording, a duplicated or mislabelled item. Not content errors: app bugs (progress, login, playback, speed, navigation), general questions, praise, chat, meet-ups, and requests for new languages.

Be inclusive: if a post plausibly reports a content problem, include it, even if vague. Use the learner's exact words.

Popty course codes (known language last, e.g. hin_for_eng = Hindi for English speakers; Welsh SSiW courses may not be listed):
${courseLines}

For each post that reports a content error, give:
- post_id (number)
- course_code: the best matching code above, or null if you cannot tell
- summary: one plain sentence of what the learner says is wrong
- quoted: array of the exact phrases the learner quotes from the course (English prompt and/or target-language text), as written by the learner; [] if none
- search_terms: up to 3 short substrings (2–6 words) most likely to appear verbatim in the course's known_text or target_text, to look the item up; [] if none
- confidence: "high" | "medium" | "low"

Answer with ONLY a JSON array (no prose, no code fence). [] if no post reports a content error.

POSTS:
${postBlocks}`
}

function parseFindings(text) {
  let t = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  const a = t.indexOf('['), b = t.lastIndexOf(']')
  if (a < 0 || b < a) throw new Error(`Sonnet answer had no JSON array: ${t.slice(0, 200)}`)
  const arr = JSON.parse(t.slice(a, b + 1))
  if (!Array.isArray(arr)) throw new Error('Sonnet answer was not an array')
  return arr.filter(f => f && Number.isFinite(Number(f.post_id))).map(f => ({
    post_id: Number(f.post_id),
    course_code: f.course_code || null,
    summary: String(f.summary || ''),
    quoted: Array.isArray(f.quoted) ? f.quoted.map(String) : [],
    search_terms: Array.isArray(f.search_terms) ? f.search_terms.map(String).filter(Boolean).slice(0, 3) : [],
    confidence: f.confidence || 'low',
  }))
}

async function sonnetScreen(posts, courses) {
  // a timer's PATH has no ~/.local/bin, which is where the claude CLI lives on watson-1
  const bin = path.join(os.homedir(), '.local', 'bin')
  if (!String(process.env.PATH || '').split(':').includes(bin)) process.env.PATH = `${bin}:${process.env.PATH || ''}`
  const { claudeChat } = require('../../services/shared/claude-cli.cjs')
  const text = await claudeChat(buildPrompt(posts, courses), { model: 'sonnet', timeout: 300000 })
  return parseFindings(text)
}

// ── the read-only Popty check ──────────────────────────────────────────────────────────────────

async function listCourses(get = getJson) {
  const d = await get(`${POPTY}/api/courses`, { timeoutMs: 30000 })
  return (d.courses || [])
    .filter(c => c.course_code && !/^zzz|test|e2e/i.test(c.course_code))
    .map(c => ({ code: c.course_code, name: c.display_name || c.course_code }))
}

/** What the course says now for each search term: matching rows, or an honest "can't tell". */
async function checkInPopty(finding, courseCodes, get = getJson) {
  if (!finding.course_code) return { status: "can't tell", reason: 'no course identified' }
  if (!courseCodes.has(finding.course_code)) return { status: "can't tell", reason: `${finding.course_code} is not a Popty course` }
  if (!finding.search_terms.length) return { status: "can't tell", reason: 'learner quoted no wording to look up' }
  const hits = []
  const errors = []
  for (const term of finding.search_terms) {
    try {
      const d = await get(`${POPTY}/api/production/${encodeURIComponent(finding.course_code)}/learning-journey/search?q=${encodeURIComponent(term)}`, { timeoutMs: 90000 })
      if (d.error) { errors.push(`${term}: ${d.error}`); continue }
      const needle = term.toLowerCase()
      const seen = new Set()
      for (const it of d.allItems || []) {
        const k = String(it.known_text || ''), tg = String(it.target_text || '')
        if (!k.toLowerCase().includes(needle) && !tg.toLowerCase().includes(needle)) continue
        const id = it.phrase_id || `${it.legoId}:${it.type}`
        const key = `${k}|${tg}`
        if (seen.has(key)) continue
        seen.add(key)
        hits.push({ term, id, known: k, target: tg })
      }
    } catch (e) { errors.push(`${term}: ${e.message}`) }
  }
  if (hits.length) return { status: 'wording found', hits: hits.slice(0, 8), more: Math.max(0, hits.length - 8), errors }
  if (errors.length === finding.search_terms.length) return { status: "can't tell", reason: `Popty lookup failed (${errors.join('; ')})` }
  return { status: 'wording not found', reason: `no row contains ${finding.search_terms.map(t => `"${t}"`).join(' or ')}`, errors }
}

// ── the doc ────────────────────────────────────────────────────────────────────────────────────

const postUrl = p => `${FORUM}${p.post_url || `/t/${p.topic_slug}/${p.topic_id}/${p.post_number}`}`
const quote = s => clip(String(s || '').trim(), 1200).split('\n').map(l => `> ${l}`).join('\n')

function renderDoc({ dateLabel, windowLabel, mentions, findings, postsById, stats, gaps }) {
  const L = [`# Forum reader — ${dateLabel}`, '', `${windowLabel}. Read only: nothing was fixed, posted or drafted.`, '']
  if (mentions.length) {
    L.push(`## Mentions of you (${mentions.length})`, '')
    for (const p of mentions) {
      L.push(`**${p.username}** in "${p.topic_title}", ${p.created_at.slice(0, 16).replace('T', ' ')}Z — [open post](${postUrl(p)})`, '', quote(p.raw), '')
    }
  }
  if (findings.length) {
    L.push(`## Possible content errors (${findings.length})`, '')
    for (const f of findings) {
      const p = postsById.get(f.post_id)
      if (!p) continue
      L.push(`### ${f.course_code || 'course unknown'} — ${f.summary}`, '')
      L.push(`**${p.username}** in "${p.topic_title}", ${p.created_at.slice(0, 10)} (confidence ${f.confidence}) — [open post](${postUrl(p)})`, '')
      L.push(quote(p.raw), '')
      const c = f.check || {}
      if (c.status === 'wording found') {
        // "found" means the learner's wording is in the course today, NOT that the error is: a
        // corrected row still contains the English prompt. Kai reads the rows and judges.
        L.push(`**In Popty now: the wording is in the course** (${c.hits.length}${c.more ? `+${c.more}` : ''} row${c.hits.length === 1 ? '' : 's'}; what they say today, so you can judge whether it is still wrong)`, '')
        for (const h of c.hits) L.push(`- \`${h.id}\` ${h.known} → ${h.target}`)
        if (c.more) L.push(`- …and ${c.more} more`)
        L.push('')
      } else {
        L.push(`**In Popty now: ${c.status === 'wording not found' ? 'no longer found' : "can't tell"}** — ${c.reason || ''}`, '')
      }
    }
  }
  if (gaps.length) {
    L.push('## Gaps in this run', '')
    for (const g of gaps) L.push(`- ${g}`)
    L.push('')
  }
  L.push('---', `Read ${stats.read} posts (${stats.learner} by learners, staff dropped by Discourse's own flags); ${stats.candidates} passed the keyword filter; ${stats.sonnet ? 'one Sonnet pass' : 'no Sonnet pass'}. Public posts only — private categories, Slack and email are not covered.`)
  return L.join('\n')
}

async function publishDoc({ content, title, convId }) {
  const body = { content, title }
  if (convId) body.conv_id = convId
  const res = await fetch(`${SURFACE}/api/publish-doc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(process.env.CS_CONV_TOKEN ? { 'x-cs-conv': process.env.CS_CONV_TOKEN } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || !j.url) throw new Error(`publish-doc failed: HTTP ${res.status} ${JSON.stringify(j).slice(0, 300)}`)
  return j.url
}

// ── state ──────────────────────────────────────────────────────────────────────────────────────

function readState(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null }
}
function writeState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n')
  fs.renameSync(tmp, file)
}

// ── the run ────────────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const a = { dryRun: false, days: null, llm: true, popty: true, state: process.env.FORUM_READER_STATE || DEFAULT_STATE, convId: process.env.FORUM_READER_CONV_ID || null, fixture: null }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (k === '--dry-run') a.dryRun = true
    else if (k === '--days') a.days = Number(argv[++i])
    else if (k === '--no-llm') a.llm = false
    else if (k === '--no-popty') a.popty = false
    else if (k === '--state') a.state = argv[++i]
    else if (k === '--conv-id') a.convId = argv[++i]
    else if (k === '--fixture') a.fixture = argv[++i]
    else if (k === '-h' || k === '--help') { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(0) }
    else throw new Error(`unknown argument ${k}`)
  }
  return a
}

async function run(opts, deps = {}) {
  const log = deps.log || (m => console.error(`[forum-reader] ${m}`))
  const get = deps.get || getJson
  const screen = deps.screen || sonnetScreen
  const publish = deps.publish || publishDoc
  const now = deps.now || new Date()
  const gaps = []

  const state = opts.days ? null : readState(opts.state)
  const floorIso = opts.days
    ? new Date(now - opts.days * 86400000).toISOString()
    : (state ? null : new Date(now - FIRST_RUN_DAYS * 86400000).toISOString())
  const afterId = state ? state.lastPostId : 0

  let posts, capped
  if (opts.fixture) ({ posts, capped } = { posts: JSON.parse(fs.readFileSync(opts.fixture, 'utf8')).filter(p => p.id > afterId && (!floorIso || p.created_at >= floorIso)).sort((a, b) => a.id - b.id), capped: false })
  else ({ posts, capped } = await fetchNewPosts({ afterId, floorIso, get }))
  if (capped) gaps.push(`Backlog bigger than ${MAX_PAGES * 50} posts; only the newest were read.`)
  log(`read ${posts.length} posts after id ${afterId}${floorIso ? ` since ${floorIso.slice(0, 10)}` : ''}`)

  const { live, mentions, learner, candidates } = triage(posts)
  log(`${learner.length} learner posts, ${mentions.length} mention Kai, ${candidates.length} pass the keyword filter`)

  // mentions go to Sonnet too, so a mention that is also an error report gets its Popty check
  const toScreen = [...candidates, ...mentions].sort((a, b) => a.id - b.id)
  let findings = []
  let sonnet = false
  if (toScreen.length && opts.llm) {
    let courses = []
    try { courses = await (deps.listCourses || listCourses)(get) } catch (e) { gaps.push(`Popty course list unavailable (${e.message}); course guesses could not be checked.`) }
    // A failed Sonnet pass fails the run BEFORE the state moves, so tomorrow re-reads these posts
    // rather than Kai losing them; dumping every keyword hit on him instead would be noise.
    findings = await screen(toScreen, courses)
    sonnet = true
    const known = new Set(toScreen.map(p => p.id))
    findings = findings.filter(f => known.has(f.post_id))
    const codes = new Set(courses.map(c => c.code))
    for (const f of findings) {
      if (f.check) continue
      f.check = opts.popty ? await checkInPopty(f, codes, get) : { status: "can't tell", reason: 'Popty check skipped (--no-popty)' }
    }
  } else if (toScreen.length) {
    gaps.push('Sonnet pass skipped (--no-llm).')
  }

  const highest = posts.length ? Math.max(...posts.map(p => p.id)) : afterId
  const postsById = new Map(live.map(p => [p.id, p]))
  const dateLabel = now.toISOString().slice(0, 10)
  const windowLabel = posts.length
    ? `Posts ${posts[0].created_at.slice(0, 10)} to ${posts[posts.length - 1].created_at.slice(0, 10)} (ids ${posts[0].id}–${highest})`
    : 'No new posts'
  const stats = { read: posts.length, learner: learner.length, candidates: candidates.length, sonnet }
  const result = { posts: posts.length, mentions: mentions.length, candidates: candidates.length, findings, gaps, highest, url: null, doc: null }

  if (mentions.length || findings.length) {
    result.doc = renderDoc({ dateLabel, windowLabel, mentions, findings, postsById, stats, gaps })
    if (opts.dryRun) log('dry run: doc not published')
    else result.url = await publish({ content: result.doc, title: `Forum reader — ${dateLabel}`, convId: opts.convId })
  } else log('nothing for Kai today: no doc')

  // a --days read-back never moves the state backwards; it only seeds or advances it
  if (!opts.dryRun && !opts.fixture) {
    const prev = readState(opts.state)
    if (!prev || highest > prev.lastPostId) writeState(opts.state, { lastPostId: highest, lastRunAt: now.toISOString(), lastUrl: result.url })
  }
  return result
}

module.exports = { fetchNewPosts, isStaff, mentionsKai, cheapCandidate, triage, buildPrompt, parseFindings, checkInPopty, renderDoc, run, parseArgs, readState, writeState }

if (require.main === module) {
  const opts = parseArgs(process.argv.slice(2))
  run(opts).then(r => {
    if (r.doc && opts.dryRun) console.log(r.doc)
    console.log(JSON.stringify({ posts: r.posts, mentions: r.mentions, candidates: r.candidates, findings: r.findings.length, highest: r.highest, url: r.url, gaps: r.gaps }))
  }).catch(e => { console.error(`[forum-reader] FAILED: ${e.stack || e.message}`); process.exit(1) })
}
