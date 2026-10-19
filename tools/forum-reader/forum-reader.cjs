#!/usr/bin/env node
/**
 * Daily learner-forum reader for Kai (design: job #152·T, approved by Kai).
 *
 * Reads every public post on the SSi Discourse forum (en.forum.saysomethingin.com) newer than the
 * last run, and posts ONE message into Kai's own chat on days that have something for him:
 *   1. any post that @-mentions Kai — always, at the top, whatever it says, whoever wrote it;
 *   2. learner reports of a content problem in any course, found by a cheap keyword filter, then ONE
 *      Sonnet pass (only on days the filter keeps anything), then a READ-ONLY scan of the live course
 *      in Popty (GET learning-journey/search on :3470) for the UNDERLYING issue — used before taught,
 *      introduced twice, missing audio — reported separately from whether the post looked like it was
 *      about the legacy app. Nothing is dismissed for seeming legacy or for wording not found verbatim
 *      (Kai, 2026-10-19).
 * Quiet days send nothing.
 *
 * Delivery (Kai, 2026-10-19: he does not use the Review shelf): POST /api/surface-notice with
 * toPerson:'kai', exactly as the Deborah check does (tools/deborah/basecamp-column-watch.cjs), so it
 * reaches Kai's CURRENT Watson room even after the room is cleared. FORUM_READER_WATSON_JOB pins a room;
 * FORUM_READER_SESSION names Kai's session file, else the cron fleet's ~/.cs-cron-session is used.
 *
 * It never fixes course content, never posts to the forum, never drafts replies, and writes nothing
 * except its own state file and the message.
 *
 * Staff are dropped by Discourse's own staff/moderator/admin flags on each post — no name list.
 *
 * State: the highest post id seen, in a file OUTSIDE git (default
 * ~/.local/state/popty-forum-reader/state.json, override with FORUM_READER_STATE or --state). It is
 * advanced only after the message (if any) has been accepted, so a failed run is re-read next time.
 *
 * Usage:
 *   node tools/forum-reader/forum-reader.cjs                  # the daily run
 *   node tools/forum-reader/forum-reader.cjs --dry-run        # print the message, send nothing, keep state
 *   node tools/forum-reader/forum-reader.cjs --days 14        # read back 14 days instead of from state
 *   options: --no-llm  --no-popty  --state <file>  --fixture <posts.json>
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
  'not right', 'isn.?t right', 'doesn.?t make sense', 'mismatch', 'duplicate',
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

// COURSE CONTENT ONLY (Kai, 2026-10-19): wording, words used before taught, items introduced twice, wrong
// translations, bad or mismatched audio of a phrase. App, playback and UI complaints (loops, crashes, buttons,
// sync, games) are not reported at all; Sonnet labels them NOT_CONTENT and parseFindings drops them, so a
// slip in the prompt still cannot put one in Kai's message. The keyword filter carries no app-only words.
const ISSUES = ['used_before_taught', 'introduced_twice', 'wrong_translation', 'audio_or_voice', 'other']
const NOT_CONTENT = 'app_not_content'

function buildPrompt(posts, courses) {
  const courseLines = courses.map(c => `${c.code}: ${c.name}`).join('\n')
  const postBlocks = posts.map(p => [
    `=== post ${p.id} | topic "${p.topic_title}" | by ${p.username} | ${p.created_at.slice(0, 10)}`,
    clip(p.raw, 2500),
  ].join('\n')).join('\n\n')
  return `You are screening posts from the SaySomethingin learner forum for ONE purpose: finding learner reports of a PROBLEM IN COURSE CONTENT, in any course and any language — a word or structure used before it was taught, an item introduced twice, a wrong or unnatural translation, a prompt that doesn't match its answer, a wrong word, gender, tense or spelling, bad or mismatched audio of a phrase or item (mispronounced, cut off, wrong voice for that line, audio that doesn't match the text), a duplicated or mislabelled item.

ONLY COURSE CONTENT. Do NOT report app, playback or interface complaints of any kind — stuck in a loop, repeating the same prompt, crashes, freezing, buttons, menus, login, sync, progress lost, speed settings, downloads, the vocabulary game or other games, notifications — nor general dislike of a voice that is not about a specific line, general questions, praise, chat, meet-ups, or requests for new languages. If a post is mainly an app complaint, leave it out. If you include one by mistake, give it issue "${NOT_CONTENT}" and it will be dropped.

NEVER leave a post out because it seems to be about the legacy app or an older version of a course (Levels, Challenges, the old website, old lesson numbering), or because the learner's wording might not match the course word for word. The same underlying problem may exist in our current course, and we will check our course for it. Report the post and say whether it looks like the legacy app in "legacy_app".

Be inclusive about content: if a post plausibly reports a content problem, include it, even if vague.

Popty course codes (known language last, e.g. hin_for_eng = Hindi for English speakers; cym_n_for_eng / cym_s_for_eng = North / South Welsh for English speakers):
${courseLines}

For each post that reports a content problem, give:
- post_id (number)
- course_codes: up to 3 codes from the list above that the post could be about, most likely first — when the language is clear but the variant is not (e.g. North or South Welsh), list each plausible one; [] only if even the language is unclear
- seed: the sentence/seed number the learner names in OUR numbering, as a number; null if none (a legacy "Level 2 Challenge 5" is not a seed number)
- complaint: what the learner says is wrong, ONE plain sentence of at most 25 words
- issue: the underlying kind of problem, one of ${ISSUES.map(i => `"${i}"`).join(' | ')}
- target_words: up to 3 target-language words or short phrases at the heart of the problem, spelled as the course would write them (e.g. the word used before it was taught; the item introduced twice); [] if none
- known_words: up to 3 known-language (e.g. English) words or short phrases at the heart of the problem; [] if none
- search_terms: up to 3 short substrings (2–6 words) most likely to appear verbatim in the course's known_text or target_text; [] if none
- legacy_app: "likely" | "unlikely" | "unclear" — does the post seem to be about the legacy app / older course versions rather than the current app?
- legacy_reason: a few words saying why (e.g. "mentions Level 1 Challenge 12"), or ""
- confidence: "high" | "medium" | "low"

Answer with ONLY a JSON array (no prose, no code fence). [] if no post reports a content problem.

POSTS:
${postBlocks}`
}

const strList = (v, n) => Array.isArray(v) ? v.map(String).map(x => x.trim()).filter(Boolean).slice(0, n) : []

function parseFindings(text) {
  let t = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  const a = t.indexOf('['), b = t.lastIndexOf(']')
  if (a < 0 || b < a) throw new Error(`Sonnet answer had no JSON array: ${t.slice(0, 200)}`)
  const arr = JSON.parse(t.slice(a, b + 1))
  if (!Array.isArray(arr)) throw new Error('Sonnet answer was not an array')
  return arr.filter(f => f && Number.isFinite(Number(f.post_id)) && f.issue !== NOT_CONTENT).map(f => ({
    post_id: Number(f.post_id),
    course_codes: [...new Set([...strList(f.course_codes, 3), ...(f.course_code ? [String(f.course_code)] : [])])].slice(0, 3),
    seed: Number.isFinite(Number(f.seed)) && f.seed !== null && f.seed !== '' ? Number(f.seed) : null,
    complaint: String(f.complaint || f.summary || ''),
    issue: ISSUES.includes(f.issue) ? f.issue : 'other',
    target_words: strList(f.target_words, 3),
    known_words: strList(f.known_words, 3),
    search_terms: strList(f.search_terms, 3),
    legacy_app: ['likely', 'unlikely', 'unclear'].includes(f.legacy_app) ? f.legacy_app : 'unclear',
    legacy_reason: String(f.legacy_reason || ''),
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

const norm = s => String(s || '').normalize('NFC').toLowerCase().replace(/[.,!?¿¡;:"“”«»()…]/g, ' ').replace(/\s+/g, ' ').trim()
// scripts written without spaces between words: a substring is the best word test there is
const NO_SPACES = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]/u
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Whole-word (or whole-phrase) containment, Unicode-aware, so "con" does not match "conmigo". */
function containsWord(text, word) {
  const t = norm(text), w = norm(word)
  if (!w) return false
  if (NO_SPACES.test(w)) return t.includes(w)
  return new RegExp(`(?<![\\p{L}\\p{M}\\p{N}'’])${escapeRe(w)}(?![\\p{L}\\p{M}\\p{N}])`, 'u').test(t)
}

const TEACHING = new Set(['intro', 'debut'])
const NOT_FOUND = w => `"${w}" is not in our course in that spelling (it may be spelt differently, or be another dialect's form)`
const ref = r => `seed ${Number(String(r.seedId || '').replace(/\D/g, '')) || '?'} (${r.legoId}, round ${r.roundNumber})`

/**
 * What our course does with one target-language word, from the course's own round order
 * (learning-journey/search returns every round that holds the word, in the order the learner meets them).
 * Pure: takes the search answer, returns facts — the verdicts are drawn from these in checkInPopty.
 */
function wordFacts(word, journey) {
  const rounds = [...((journey && journey.rounds) || [])].sort((a, b) => a.roundNumber - b.roundNumber)
  let firstUse = null
  const taught = []           // new-LEGO rounds whose own LEGO text holds the word
  for (const r of rounds) {
    const lego = (r.items || []).find(i => TEACHING.has(i.type))
    if (r.isNew && lego && containsWord(lego.target_text, word)) taught.push({ round: r, known: lego.known_text, target: lego.target_text })
    if (!firstUse) {
      const it = (r.items || []).find(i => containsWord(i.target_text, word))
      if (it) firstUse = { round: r, item: it }
    }
  }
  // the same LEGO taught as new more than once: identical target text on two new rounds
  const byTarget = new Map()
  for (const t of taught) { const k = norm(t.target); byTarget.set(k, [...(byTarget.get(k) || []), t]) }
  const twice = [...byTarget.values()].filter(v => v.length > 1)
  return { word, found: !!firstUse, firstUse, firstTaught: taught[0] || null, taught, twice }
}

function knownFacts(word, journey) {
  const rounds = [...((journey && journey.rounds) || [])].sort((a, b) => a.roundNumber - b.roundNumber)
  const taught = []
  for (const r of rounds) {
    const lego = (r.items || []).find(i => TEACHING.has(i.type))
    if (r.isNew && lego && containsWord(lego.known_text, word)) taught.push({ round: r, known: lego.known_text, target: lego.target_text })
  }
  const byKnown = new Map()
  for (const t of taught) { const k = norm(t.known); byKnown.set(k, [...(byKnown.get(k) || []), t]) }
  return { word, twice: [...byKnown.values()].filter(v => v.length > 1) }
}

/** The verdict for "was it used before it was taught?" on one word, as a plain sentence. */
function usedBeforeTaught(f) {
  // a word we cannot find is not evidence the fault is absent: the learner (or Sonnet) may spell it
  // another way, or a dialect form (Kai, 2026-10-19: never dismiss on wording not found verbatim)
  if (!f.found) return { exists: "can't tell", say: NOT_FOUND(f.word) }
  // a phrase built from several LEGOs is the course working, not a fault: only a single item can be
  // "never taught"; for a phrase we say where it first appears and leave the judgement to Kai
  if (!f.firstTaught && /\s/.test(norm(f.word))) return { exists: "can't tell", say: `"${f.word}" is not a LEGO of its own; it first appears in ${ref(f.firstUse.round)} ("${f.firstUse.item.target_text}"), so check its words were taught by then` }
  if (!f.firstTaught) return { exists: 'yes', say: `"${f.word}" is used (first in ${ref(f.firstUse.round)}: "${f.firstUse.item.known_text}" = "${f.firstUse.item.target_text}") but no new LEGO teaches it` }
  if (f.firstUse.round.roundNumber < f.firstTaught.round.roundNumber) return { exists: 'yes', say: `"${f.word}" is first used in ${ref(f.firstUse.round)} ("${f.firstUse.item.target_text}") but only taught in ${ref(f.firstTaught.round)}` }
  return { exists: 'no', say: `"${f.word}" is taught in ${ref(f.firstTaught.round)} before any use` }
}

const twiceSay = (word, groups, side) => groups.map(g => `"${side === 'known' ? g[0].known : g[0].target}" is introduced as new ${g.length} times: ${g.map(t => ref(t.round)).join(', ')}`).join('; ')

/**
 * Does the underlying issue exist in OUR course today? Asked for every complaint, whether or not the
 * post was about the legacy app and whether or not the learner's wording is found verbatim
 * (Kai, 2026-10-19: learners often write about the legacy app; the same fault can still be in ours).
 * Read-only: GET learning-journey/search on Popty. Returns { exists: 'yes'|'no'|"can't tell", says: [..], rows: [..] }.
 */
async function checkInPopty(finding, courseCodes, get = getJson) {
  if (!finding.course_code) return { exists: "can't tell", says: ['no course identified, so nothing to scan'], rows: [] }
  if (!courseCodes.has(finding.course_code)) return { exists: "can't tell", says: [`${finding.course_code} is not a Popty course`], rows: [] }
  const cache = new Map()
  const errors = []
  const journey = async q => {
    const key = norm(q)
    if (!cache.has(key)) {
      cache.set(key, (async () => {
        try {
          const d = await get(`${POPTY}/api/production/${encodeURIComponent(finding.course_code)}/learning-journey/search?q=${encodeURIComponent(q)}`, { timeoutMs: 120000 })
          if (d && d.error) { errors.push(`${q}: ${d.error}`); return null }
          return d
        } catch (e) { errors.push(`${q}: ${e.message}`); return null }
      })())
    }
    return cache.get(key)
  }

  const says = []
  let exists = "can't tell"
  const verdicts = []
  const target = finding.target_words || [], known = finding.known_words || []

  // the scans that need only the course's own data, run for every target word whatever the issue
  const facts = []
  for (const w of target) { const j = await journey(w); if (j) facts.push(wordFacts(w, j)) }
  const kfacts = []
  for (const w of known) { const j = await journey(w); if (j) kfacts.push(knownFacts(w, j)) }

  if (finding.issue === 'used_before_taught') {
    for (const f of facts) { const v = usedBeforeTaught(f); verdicts.push(v.exists); says.push(v.say) }
  } else if (finding.issue === 'introduced_twice') {
    for (const f of facts) {
      if (!f.found) { verdicts.push("can't tell"); says.push(NOT_FOUND(f.word)) }
      else if (f.twice.length) { verdicts.push('yes'); says.push(twiceSay(f.word, f.twice, 'target')) }
      else { verdicts.push('no'); says.push(`"${f.word}" is introduced as new ${f.taught.length === 1 ? `once, in ${ref(f.taught[0].round)}` : f.taught.length ? `${f.taught.length} times but always as different LEGOs` : 'nowhere'}`) }
    }
    for (const k of kfacts) if (k.twice.length) { verdicts.push('yes'); says.push(twiceSay(k.word, k.twice, 'known')) }
  }
  // a fault of the other kind found while looking is worth one line, never a verdict
  if (finding.issue !== 'used_before_taught') for (const f of facts) { const v = usedBeforeTaught(f); if (v.exists === 'yes') says.push(`also: ${v.say}`) }
  if (finding.issue !== 'introduced_twice') for (const f of facts) if (f.twice.length) says.push(`also: ${twiceSay(f.word, f.twice, 'target')}`)

  // the rows the learner's wording (or failing that the key words) points at, as they read today
  const rows = []
  const silent = []           // every matching slot without audio, counted before rows are de-duplicated by text
  const seenRow = new Set()
  const terms = [...(finding.search_terms || []), ...target, ...known]
  for (const term of terms) {
    const d = await journey(term)
    for (const it of (d && d.allItems) || []) {
      if (!containsWord(it.known_text, term) && !containsWord(it.target_text, term)) continue
      const id = it.phrase_id || `${it.legoId}:${it.type}`
      if (it.hasAudio === false && !silent.some(x => x.id === id)) silent.push({ id, target: it.target_text })
      const k = `${norm(it.known_text)}|${norm(it.target_text)}`
      if (seenRow.has(k)) continue
      seenRow.add(k)
      rows.push({ term, id: it.phrase_id || it.legoId, seed: it.seedNumber, known: it.known_text, target: it.target_text })
    }
  }
  if (finding.issue === 'audio_or_voice') {
    if (silent.length) { verdicts.push('yes'); says.push(`${silent.length} matching slot(s) have no audio, e.g. "${silent[0].target}" (${silent[0].id})`) }
    else if (rows.length) says.push(`every matching row has audio; a wrong or bad voice can only be judged by ear`)
  }
  if (finding.seed != null) {
    const d = await journey(String(finding.seed))
    const legos = ((d && d.rounds) || []).filter(r => r.seedId === `S${String(finding.seed).padStart(4, '0')}`)
      .map(r => (r.items || []).find(i => TEACHING.has(i.type)) || (r.items || [])[0]).filter(Boolean)
    if (legos.length) says.push(`seed ${finding.seed} LEGOs now: ${legos.map(i => `${i.known_text} = ${i.target_text}`).join(' | ')}`)
    else if (d) says.push(`seed ${finding.seed} has no rounds in our course`)
  }
  if (!says.length) says.push(rows.length ? 'the rows below are what the course says now; judge whether it is wrong' : `nothing in our course matches ${terms.length ? terms.map(t => `"${t}"`).join(' or ') : '(no words to look up)'}`)
  if (errors.length) says.push(`Popty lookup failed for ${errors.join('; ')}`)

  if (verdicts.includes('yes')) exists = 'yes'
  else if (verdicts.length && verdicts.every(v => v === 'no') && !errors.length) exists = 'no'
  return { exists, says, rows: rows.slice(0, 4), moreRows: Math.max(0, rows.length - 4) }
}

// ── the message into Kai's chat ────────────────────────────────────────────────────────────────

const postUrl = p => `${FORUM}${p.post_url || `/t/${p.topic_slug}/${p.topic_id}/${p.post_number}`}`
const oneLine = (s, n) => { s = String(s || '').replace(/\[quote[^\]]*\][\s\S]*?\[\/quote\]/gi, ' ').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s }
const MESSAGE_FIRST_LINE = '[Automated forum reader — not typed by Kai]'
const LEGACY = { likely: 'probably about the legacy app', unlikely: 'about the current app', unclear: 'not clear which app' }
const EXISTS = { yes: 'YES, the issue is in our course', no: 'NO, not in our course', "can't tell": "CAN'T TELL from the data" }

/**
 * Plain text for a phone: per finding the course, the seed, the learner's complaint in one line, what we
 * found in our course (kept separate from whether the post was about the legacy app), and the post link.
 */
function renderMessage({ dateLabel, mentions, findings, postsById, courseNames = new Map(), stats, gaps }) {
  const L = [MESSAGE_FIRST_LINE, '', `Learner forum, ${dateLabel}: ${[mentions.length && `${mentions.length} mention${mentions.length === 1 ? '' : 's'} of you`, findings.length && `${findings.length} possible content problem${findings.length === 1 ? '' : 's'}`].filter(Boolean).join(', ')}.`]
  if (mentions.length) {
    L.push('', 'MENTIONS OF YOU')
    for (const p of mentions) L.push('', `${p.username} in "${p.topic_title}": ${oneLine(p.raw, 280)}`, postUrl(p))
  }
  if (findings.length) {
    L.push('', 'POSSIBLE CONTENT PROBLEMS')
    findings.forEach((f, n) => {
      const p = postsById.get(f.post_id)
      if (!p) return
      const checks = f.checks || [{ code: null, exists: "can't tell", says: [], rows: [] }]
      const one = checks.length === 1
      const name = code => code ? `${courseNames.get(code) || code} (${code})` : 'course unknown'
      L.push('', `${n + 1}. ${one ? name(checks[0].code) : f.course_codes.join(' or ')}${f.seed != null ? `, seed ${f.seed}` : ''}`)
      L.push(`Learner (${p.username}): ${oneLine(f.complaint, 200)}`)
      L.push(`Post: ${LEGACY[f.legacy_app] || LEGACY.unclear}${f.legacy_reason ? ` (${oneLine(f.legacy_reason, 80)})` : ''}`)
      for (const c of checks) {
        L.push(`${one ? 'Our course' : `In ${name(c.code)}`}: ${EXISTS[c.exists] || EXISTS["can't tell"]}. ${c.says.join('. ')}${c.says.length ? '.' : ''}`.replace(/\.\./g, '.'))
        const rows = (c.rows || []).slice(0, one ? 4 : 2), more = (c.moreRows || 0) + (c.rows || []).length - rows.length
        for (const r of rows) L.push(`  now: ${r.known} = ${r.target} (${r.id})`)
        if (more) L.push(`  …and ${more} more`)
      }
      L.push(postUrl(p))
    })
  }
  if (gaps.length) L.push('', 'GAPS IN THIS RUN', ...gaps.map(g => `- ${g}`))
  L.push('', `Read ${stats.read} posts (${stats.learner} by learners); ${stats.candidates} passed the keyword filter; ${stats.sonnet ? 'one Sonnet pass' : 'no Sonnet pass'}. Read only: nothing was fixed, posted to the forum or drafted.`)
  return L.join('\n')
}

// ── delivery: the same door the Deborah check uses (tools/deborah/basecamp-column-watch.cjs) ───
// POST /api/surface-notice with toPerson:'kai', which the surface resolves to Kai's CURRENT Watson room
// at send time, so clearing or replacing the room never strands it. FORUM_READER_WATSON_JOB, if set,
// pins a specific room instead (the Deborah check's DEBORAH_WATCH_WATSON_JOB, same shape).
const NOTICE_RELAY = 'forum-reader'
function noticeTarget(env = process.env) {
  return env.FORUM_READER_WATSON_JOB ? { jobId: env.FORUM_READER_WATSON_JOB } : { toPerson: 'kai' }
}

/**
 * The identity the notice is sent under, in the Deborah check's order: Kai's own session
 * (FORUM_READER_SESSION) if set, else the cron fleet's session file (the one ops/cs-cron-identity.js reads).
 * The route is loopback-only and refuses an ambient call.
 */
function noticeHeaders(env = process.env) {
  const files = [env.FORUM_READER_SESSION, env.CS_SESSION_FILE || path.join(os.homedir(), '.cs-cron-session')].filter(Boolean)
  for (const file of files) {
    try {
      const c = fs.readFileSync(file, 'utf8').trim()
      if (c.startsWith('v2.')) return { 'Content-Type': 'application/json', Cookie: `cs_user=${c}`, Origin: SURFACE }
    } catch { /* try the next */ }
  }
  return null
}

async function postToKai(text, { env = process.env, fetchImpl = fetch } = {}) {
  const headers = noticeHeaders(env)
  if (!headers) throw new Error('no session cookie (FORUM_READER_SESSION or the cron fleet file) — nothing posted')
  const res = await fetchImpl(`${SURFACE}/api/surface-notice`, {
    method: 'POST', headers, signal: AbortSignal.timeout(30000),
    body: JSON.stringify({ ...noticeTarget(env), text, relay: NOTICE_RELAY }),
  })
  const j = await res.json().catch(() => ({}))
  if (!res.ok || !j.ok) throw new Error(`surface-notice failed: HTTP ${res.status} ${JSON.stringify(j).slice(0, 300)}`)
  return j
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
  const a = { dryRun: false, days: null, llm: true, popty: true, state: process.env.FORUM_READER_STATE || DEFAULT_STATE, fixture: null }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (k === '--dry-run') a.dryRun = true
    else if (k === '--days') a.days = Number(argv[++i])
    else if (k === '--no-llm') a.llm = false
    else if (k === '--no-popty') a.popty = false
    else if (k === '--state') a.state = argv[++i]
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
  const send = deps.send || postToKai
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
  let courses = []
  if (toScreen.length && opts.llm) {
    try { courses = await (deps.listCourses || listCourses)(get) } catch (e) { gaps.push(`Popty course list unavailable (${e.message}); course guesses could not be checked.`) }
    // A failed Sonnet pass fails the run BEFORE the state moves, so tomorrow re-reads these posts
    // rather than Kai losing them; dumping every keyword hit on him instead would be noise.
    findings = await screen(toScreen, courses)
    sonnet = true
    const known = new Set(toScreen.map(p => p.id))
    findings = findings.filter(f => known.has(f.post_id))
    const codes = new Set(courses.map(c => c.code))
    for (const f of findings) {
      if (f.checks) continue
      f.checks = !opts.popty ? [{ code: null, exists: "can't tell", says: ['Popty check skipped (--no-popty)'], rows: [] }]
        : !f.course_codes.length ? [{ code: null, ...(await checkInPopty({ ...f, course_code: null }, codes, get)) }]
        : await Promise.all(f.course_codes.map(async code => ({ code, ...(await checkInPopty({ ...f, course_code: code }, codes, get)) })))
    }
  } else if (toScreen.length) {
    gaps.push('Sonnet pass skipped (--no-llm).')
  }

  const highest = posts.length ? Math.max(...posts.map(p => p.id)) : afterId
  const postsById = new Map(live.map(p => [p.id, p]))
  const dateLabel = now.toISOString().slice(0, 10)
  const stats = { read: posts.length, learner: learner.length, candidates: candidates.length, sonnet }
  const result = { posts: posts.length, mentions: mentions.length, candidates: candidates.length, findings, gaps, highest, message: null, sent: null }

  // nothing on quiet days: no mention and no finding means no message at all
  if (mentions.length || findings.length) {
    const courseNames = new Map(courses.map(c => [c.code, c.name]))
    result.message = renderMessage({ dateLabel, mentions, findings, postsById, courseNames, stats, gaps })
    if (opts.dryRun) log(`dry run: message NOT sent (target ${JSON.stringify(noticeTarget())}, relay ${NOTICE_RELAY})`)
    else result.sent = await send(result.message)
  } else log('nothing for Kai today: no message')

  // a --days read-back never moves the state backwards; it only seeds or advances it
  if (!opts.dryRun && !opts.fixture) {
    const prev = readState(opts.state)
    if (!prev || highest > prev.lastPostId) writeState(opts.state, { lastPostId: highest, lastRunAt: now.toISOString(), sent: !!result.sent })
  }
  return result
}

module.exports = { fetchNewPosts, isStaff, mentionsKai, cheapCandidate, triage, buildPrompt, parseFindings, containsWord, wordFacts, usedBeforeTaught, checkInPopty, renderMessage, noticeTarget, noticeHeaders, postToKai, run, parseArgs, readState, writeState }

if (require.main === module) {
  const opts = parseArgs(process.argv.slice(2))
  run(opts).then(r => {
    if (r.message && opts.dryRun) console.log(r.message)
    console.log(JSON.stringify({ posts: r.posts, mentions: r.mentions, candidates: r.candidates, findings: r.findings.length, highest: r.highest, sent: r.sent, gaps: r.gaps }))
  }).catch(e => { console.error(`[forum-reader] FAILED: ${e.stack || e.message}`); process.exit(1) })
}
