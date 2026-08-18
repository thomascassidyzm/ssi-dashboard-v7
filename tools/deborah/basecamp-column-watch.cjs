#!/usr/bin/env node
/**
 * basecamp-column-watch.cjs — the standing morning read of Deborah's review column.
 *
 * WHY THIS EXISTS
 * ---------------
 * On 2026-08-17 Deborah left ten findings on the Lebanese Arabic card of the
 * Creu Cyrsiau board. Two reached our queue. The other eight sat unread — one of
 * them a raw template token ("b+people") showing in a learner-facing English
 * prompt — until someone happened to go looking a day later. Nothing watched that
 * column. This watches it.
 *
 * WHAT IT DOES
 *   1. Reads the Content-checking column of the Creu Cyrsiau card table, every
 *      card, every comment, fully paginated.
 *   2. Diffs against durable state so it reports what is NEW since the last run
 *      rather than the same list every morning.
 *   3. Writes each new finding into the review queue (docs/deborah/queue/), and
 *      records her "Checked to S0055, R146" progress markers per course.
 *
 * READ-ONLY AT SOURCE, BY CONSTRUCTION
 * Every Basecamp call goes through command-surface/ops/basecamp.js, whose HTTP
 * layer is GET-only and takes no method argument. There is no write path here and
 * none should be added — the board is Deborah and Kai's, not ours to edit.
 *
 * THE TWO TRAPS THIS CODE IS BUILT AROUND
 *   - Every Basecamp collection pages. The default listing is page one only; that
 *     is how this board stayed invisible. Everything here loops until a page comes
 *     back empty (fetchAllPages).
 *   - project.updated_at is NOT an activity signal. Deborah's board reads as
 *     touched on 17 Aug only because she archived some lists. Freshness here is
 *     judged from comment created_at/updated_at, never from the project record.
 *
 * USAGE
 *   node tools/deborah/basecamp-column-watch.cjs              # the morning read
 *   node tools/deborah/basecamp-column-watch.cjs --dry-run    # show, write nothing
 *   node tools/deborah/basecamp-column-watch.cjs --replay     # ignore state, show everything
 *   node tools/deborah/basecamp-column-watch.cjs --json       # machine-readable digest
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

// ── Configuration ────────────────────────────────────────────────────────────
// The board Kai runs with Deborah. Zero to-do lists, zero message-board posts —
// all 39 cards live on the card table, so anything asking Basecamp for "todos"
// here finds nothing, forever.
const PROJECT_ID = 26277678;                 // Creu Cyrsiau
const CARD_TABLE_ID = 7038571695;
const ACCOUNT_ID = 5304789;
const COLUMN_MATCH = /content\s*check/i;     // "Content checking + audio gen"

// Whose lines become queue items. Other people's comments are still reported in
// the digest (so nothing is invisible) but are not queued as findings — Kai's
// checklists restate Deborah's notes and would otherwise double-queue them.
const REVIEWERS = [/deborah/i];

const BASECAMP_CLI = '/home/tomcassidy/command-surface/ops/basecamp.js';
const BASECAMP_USER = 'kai';

const REPO = path.resolve(__dirname, '..', '..');
// Overridable because the scheduled run and an interactive run execute from different
// checkouts of this repo, and the queue must accumulate in ONE place rather than
// scattering a copy into whichever tree happened to run it.
const QUEUE_DIR = process.env.DEBORAH_WATCH_QUEUE_DIR || path.join(REPO, 'docs', 'deborah', 'queue');
const PROGRESS_FILE = process.env.DEBORAH_WATCH_PROGRESS || path.join(REPO, 'docs', 'deborah', 'review-progress.json');
const DEFAULT_STATE = path.join(os.homedir(), '.local', 'state', 'deborah-watch', 'state.json');

// ── CLI ──────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const opt = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : d; };

const DRY_RUN = has('--dry-run');
const REPLAY = has('--replay');
const AS_JSON = has('--json');
// Seed state / rehearse without putting a card on anyone's board.
const NO_NOTIFY = has('--no-notify');
const STATE_FILE = opt('--state', DEFAULT_STATE);

// ── Basecamp read layer ──────────────────────────────────────────────────────
function bcGet(url) {
  const out = execFileSync(
    'node', [BASECAMP_CLI, '--user', BASECAMP_USER, 'get', url, '--json'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }
  );
  return JSON.parse(out);
}

/**
 * Walk every page of a Basecamp collection. Basecamp pages its collections and
 * the default response is page one only — the single trap that hid this whole
 * board and left a document of Aran's unread for six months. Never call bcGet
 * directly on a collection; always come through here.
 */
function fetchAllPages(baseUrl, { maxPages = 200 } = {}) {
  const rows = [];
  for (let page = 1; page <= maxPages; page++) {
    const sep = baseUrl.includes('?') ? '&' : '?';
    const batch = bcGet(`${baseUrl}${sep}page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) return rows;
    rows.push(...batch);
  }
  throw new Error(`fetchAllPages hit its ${maxPages}-page ceiling on ${baseUrl} — refusing to report a partial read as complete`);
}

const bucket = (suffix) => `https://3.basecampapi.com/${ACCOUNT_ID}/buckets/${PROJECT_ID}/${suffix}`;

// ── HTML → lines ─────────────────────────────────────────────────────────────
const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&apos;': "'", '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
  '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”',
};
function decodeEntities(s) {
  return s
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp|mdash|ndash|hellip|rsquo|lsquo|ldquo|rdquo);/g, (m) => ENTITIES[m])
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/**
 * UPSTREAM DEFECT, flagged not fixed (command-surface is outside this repo's scope):
 * basecamp.js's HTTP reader does `let data = ""; res.on("data", d => data += d)` with no
 * res.setEncoding("utf8"), so every chunk Buffer is stringified independently and any
 * multi-byte character straddling a chunk boundary is destroyed into U+FFFD. Seen live on
 * 2026-08-18 (an em-dash in one comment). It corrupts characters at random offsets, so it
 * cannot hide a finding, but it CAN corrupt "her words, verbatim". Until the one-line fix
 * (res.setEncoding("utf8")) lands upstream, we mark the damage rather than pass it off as
 * her typing. Fix is in command-surface/ops/basecamp.js request().
 */
const hasLostChars = (s) => s.includes('�');

/** Basecamp comment bodies are HTML. Block boundaries are the line breaks. */
function htmlToLines(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<\s*(br|\/div|\/li|\/p|\/h[1-6]|\/tr)\s*\/?\s*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// ── Parsing her notes ────────────────────────────────────────────────────────
// Her lines look like:
//   "S001, R3 - Build 4 uses 'a lot' which hasn't been introduced yet"
//   "R75, S0026 - needs an example sentence in the INTRO"
//   "S0041, R109 - Builds 3, 4 & 7, Cons 1 & 2 use 'I feel' introduced in R110"
// Seed and round come in either order, with or without leading zeros. A checkbox
// prefix appears when someone has restated her notes as a checklist.
// Separators between refs vary: "S001, R3", "R75, S0026", "S0016; R46", "S0004, R11, R12, R14 etc".
const REF_PREFIX = /^\s*(?:\[[ xX]?\]\s*)?(?:[-*•]\s*)?((?:S\s*\d+|R\s*\d+)(?:\s*(?:[,;/&+]|and)\s*(?:S\s*\d+|R\s*\d+))*)\s*(?:etc\.?\s*)?(?:[-–—:]|\s)\s*(.+)$/i;

// "Checked to S0055, R146" / "checked up to S0050/R136" — how far a human has read.
const PROGRESS_RE = /\bchecked\s+(?:up\s+)?to\b[\s:]*(.+)$/i;

// "17-08 content checking", "20/05 - Content Checking", "11/06 - Checking above points",
// "06/08" — a dated section header in her running log, not a finding. Headers matter for
// more than noise suppression: in a card description the container timestamp is the card's
// creation date, so the section label is the only clue to when a line was actually written.
const DATE_HEADER_RE = /^(\d{1,2}\s*[-/.]\s*\d{1,2})\b\s*(?:[-–—:]\s*)?(.{0,60})$/;

// "[Fixed]", "[Fixed apart from LEGO]", "[No sound files]" — her own status markers, written
// against a line after the fact. A line she has already marked fixed must not be re-queued as
// open work; a partial marker ("Fixed apart from…") leaves work outstanding, so it still queues.
const STATUS_RE = /\[([^\]]*\bfixed\b[^\]]*)\]/i;

function statusOf(line) {
  const m = STATUS_RE.exec(line);
  if (!m) return 'open';
  return /^\s*fixed[\s.,]*$/i.test(m[1]) ? 'fixed' : 'partially_fixed';
}

function extractRefs(text) {
  const seedMatch = /\bS\s*0*(\d+)\b/i.exec(text);
  const roundMatch = /\bR\s*0*(\d+)\b/i.exec(text);
  return {
    seed: seedMatch ? Number(seedMatch[1]) : null,
    round: roundMatch ? Number(roundMatch[1]) : null,
  };
}

/**
 * Turn one comment into findings, progress markers, and — crucially — a list of
 * lines we could NOT classify. Silently dropping a line we did not understand is
 * exactly the blindness this tool exists to end, so unclassified lines are
 * carried through to the digest rather than discarded.
 */
function parseComment(lines) {
  const findings = [];
  const progress = [];
  const unclassified = [];
  let section = null; // the most recent dated header, e.g. "11/06"

  for (const line of lines) {
    const prog = PROGRESS_RE.exec(line);
    if (prog) {
      const { seed, round } = extractRefs(prog[1]);
      progress.push({ verbatim: line, seed, round, section });
      continue;
    }

    const m = REF_PREFIX.exec(line);
    if (m) {
      const { seed, round } = extractRefs(m[1]);
      findings.push({ verbatim: line, seed, round, note: m[2].trim(), status: statusOf(line), section });
      continue;
    }

    // Only treat a dated line as a header once we know it carries no finding of
    // its own — otherwise "11/02 - Intro of 'how' gives …" would vanish as noise.
    const h = DATE_HEADER_RE.exec(line);
    if (h) { section = h[1].replace(/\s+/g, ''); continue; }

    unclassified.push(line);
  }
  return { findings, progress, unclassified };
}

// ── Card title → course code ─────────────────────────────────────────────────
// Resolved against the live course list where available; a title we cannot map is
// carried verbatim with course_code null rather than guessed at.
const LANG = {
  arabic: 'ara', basque: 'eus', dutch: 'nld', english: 'eng', french: 'fra',
  german: 'deu', italian: 'ita', japanese: 'jpn', korean: 'kor', portuguese: 'por',
  spanish: 'spa', welsh: 'cym', chinese: 'zho', irish: 'gle', finnish: 'fin',
};
const REGION = { lebanon: 'lb', egypt: 'eg', syria: 'sy', mexico: 'mx', brazil: 'br', castilian: '' };

function courseCodeFromTitle(title, known) {
  const m = /^\s*([a-z]+)\s*(?:\(([^)]+)\))?\s*for\s+([a-z]+)/i.exec(String(title));
  if (!m) return null;
  const tgt = LANG[m[1].toLowerCase()];
  const kn = LANG[m[3].toLowerCase()];
  if (!tgt || !kn) return null;
  const region = m[2] ? REGION[m[2].trim().toLowerCase()] : undefined;
  const candidates = [];
  if (region) candidates.push(`${tgt}_${region}_for_${kn}`);
  candidates.push(`${tgt}_for_${kn}`);
  for (const c of candidates) if (!known || known.has(c)) return c;
  return null;
}

function liveCourseCodes() {
  try {
    require('dotenv').config({ path: path.join(REPO, '.env') });
    const { createClient } = require('@supabase/supabase-js');
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return null;
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    // Synchronous-enough: we only need this once, and a failure is non-fatal.
    return sb.from('courses').select('course_code').then(
      ({ data, error }) => (error || !data ? null : new Set(data.map((r) => r.course_code)))
    );
  } catch {
    return null;
  }
}

// ── State ────────────────────────────────────────────────────────────────────
function loadState() {
  if (REPLAY) return { comments: {}, findings: {}, runs: [] };
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { comments: {}, findings: {}, runs: [] };
  }
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');
}

const crypto = require('crypto');
const findingKey = (cardId, verbatim) =>
  crypto.createHash('sha1')
    .update(`${cardId}|${verbatim.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()}`)
    .digest('hex').slice(0, 16);

// ── The read ─────────────────────────────────────────────────────────────────
async function morningRead() {
  const known = await liveCourseCodes();

  const table = bcGet(bucket(`card_tables/${CARD_TABLE_ID}.json`));
  const lists = table.lists || [];
  const column = lists.find((l) => COLUMN_MATCH.test(l.title || ''));
  if (!column) {
    throw new Error(
      `No column matching ${COLUMN_MATCH} on card table ${CARD_TABLE_ID}. Columns present: ` +
      lists.map((l) => JSON.stringify(l.title)).join(', ')
    );
  }

  const cards = fetchAllPages(bucket(`card_tables/lists/${column.id}/cards.json`));

  const report = {
    generated_at: new Date().toISOString(),
    board: { project_id: PROJECT_ID, card_table_id: CARD_TABLE_ID, column: column.title, column_id: column.id },
    cards: [],
  };

  for (const card of cards) {
    const entry = {
      card_id: card.id,
      title: card.title,
      course_code: courseCodeFromTitle(card.title, known),
      url: card.app_url,
      comments: [],
    };

    // The card's own description can carry notes too — read it as a pseudo-comment.
    // On this board the card DESCRIPTION is not boilerplate — it is Deborah's running
    // content-check log, months of dated sections per course, and on three of the six
    // cards it is the ONLY place her findings live (those cards have zero comments).
    // Treating it as non-reviewer text is what would keep the Dutch, Basque and Italian
    // logs invisible, so it counts as her material, tagged by source.
    const bodyLines = htmlToLines(card.content);
    if (bodyLines.length) {
      const parsed = parseComment(bodyLines);
      if (parsed.findings.length || parsed.progress.length || parsed.unclassified.length) {
        entry.comments.push({
          comment_id: `card-${card.id}-description`,
          author: 'Deborah (card description log)',
          is_reviewer: true,
          source: 'card description',
          created_at: card.created_at,
          updated_at: card.updated_at,
          url: card.app_url,
          ...parsed,
        });
      }
    }

    for (const c of fetchAllPages(bucket(`recordings/${card.id}/comments.json`))) {
      const author = (c.creator || {}).name || 'unknown';
      entry.comments.push({
        comment_id: String(c.id),
        author,
        is_reviewer: REVIEWERS.some((re) => re.test(author)),
        created_at: c.created_at,
        updated_at: c.updated_at,
        url: c.app_url,
        ...parseComment(htmlToLines(c.content)),
      });
    }
    report.cards.push(entry);
  }
  return report;
}

// ── Diff against state ───────────────────────────────────────────────────────
function diff(report, state) {
  const newFindings = [];
  const newProgress = [];
  const newComments = [];
  const alreadyFixed = [];

  for (const card of report.cards) {
    for (const c of card.comments) {
      const prev = state.comments[c.comment_id];
      const changed = !prev || prev.updated_at !== c.updated_at;
      if (changed) {
        newComments.push({ card: card.title, course_code: card.course_code, ...c });
      }

      // Findings are diffed per line, not per comment: an edited comment must
      // surface only its genuinely new lines, not re-queue the whole thing.
      for (const f of c.findings) {
        const key = findingKey(card.card_id, f.verbatim);
        if (state.findings[key]) continue;
        if (!c.is_reviewer) continue; // reported in the digest, not queued
        // She marks her own lines [Fixed] once they are done. Queueing those back
        // up as open work would hand her corrections back to her as new questions.
        if (f.status === 'fixed') { alreadyFixed.push({ course_code: card.course_code, verbatim: f.verbatim }); continue; }
        newFindings.push({
          key,
          course_code: card.course_code,
          card_title: card.title,
          card_id: card.card_id,
          comment_id: c.comment_id,
          comment_url: c.url,
          author: c.author,
          source: c.source || 'comment',
          date: (c.created_at || '').slice(0, 10),
          section: f.section,
          status: f.status,
          seed: f.seed,
          round: f.round,
          verbatim: f.verbatim,
        });
      }

      for (const p of c.progress) {
        const key = findingKey(card.card_id, 'progress:' + p.verbatim);
        if (state.findings[key]) continue;
        if (!c.is_reviewer) continue;
        newProgress.push({
          key,
          course_code: card.course_code,
          card_title: card.title,
          date: (c.created_at || '').slice(0, 10),
          section: p.section,
          seed: p.seed,
          round: p.round,
          verbatim: p.verbatim,
        });
      }
    }
  }
  return { newFindings, newProgress, newComments, alreadyFixed };
}

// ── Writing the queue ────────────────────────────────────────────────────────
function renderQueueMarkdown(report, d) {
  const today = report.generated_at.slice(0, 10);
  const L = [];
  L.push(`# Deborah's review column — new since last run, ${today}`);
  L.push('');
  L.push(`Read automatically from the **${report.board.column}** column of the Creu Cyrsiau`);
  L.push(`card table (Basecamp project ${report.board.project_id}), every card, every comment,`);
  L.push('fully paginated. Basecamp is read-only here — nothing was written back to the board.');
  L.push('');
  L.push(`**${d.newFindings.length} new finding(s)**, **${d.newProgress.length} new progress marker(s)**, across ${report.cards.length} card(s).`);
  if (d.alreadyFixed.length) {
    L.push(`${d.alreadyFixed.length} further line(s) she has already marked \`[Fixed]\` were read and deliberately NOT queued.`);
  }
  L.push('');

  if (!d.newFindings.length && !d.newProgress.length) {
    L.push('No new material this morning.');
    L.push('');
  }

  const byCourse = {};
  for (const f of d.newFindings) (byCourse[f.course_code || f.card_title] ||= []).push(f);

  for (const [course, items] of Object.entries(byCourse)) {
    L.push(`## ${course} — ${items.length} new finding(s)`);
    L.push('');
    L.push('| Seed | Round | Her words, verbatim | Written | Status |');
    L.push('|---|---|---|---|---|');
    for (const f of items) {
      const esc = f.verbatim.replace(/\|/g, '\\|');
      // `section` is her own dated header ("11/06"), day/month with no year — it is the
      // only date a description line carries, so it is shown as written, never inflated
      // into a full date we would be inventing.
      const when = f.source === 'card description'
        ? (f.section ? `${f.section} (her log label, no year)` : `card created ${f.date}`)
        : f.date;
      const flag = [
        f.status === 'partially_fixed' ? 'partly fixed' : 'open',
        hasLostChars(f.verbatim) ? '⚠ char lost in transit' : null,
      ].filter(Boolean).join(', ');
      L.push(`| ${f.seed != null ? 'S' + f.seed : '—'} | ${f.round != null ? 'R' + f.round : '—'} | ${esc} | ${when} | ${flag} |`);
    }
    L.push('');
    const card = report.cards.find((c) => c.card_id === items[0].card_id);
    if (card && card.url) L.push(`Card: ${card.url}`);
    L.push('');
  }

  if (d.newProgress.length) {
    L.push('## How far she has read');
    L.push('');
    L.push('| Course | Checked to | Her words | Date |');
    L.push('|---|---|---|---|');
    for (const p of d.newProgress) {
      const to = [p.seed != null ? `S${p.seed}` : null, p.round != null ? `R${p.round}` : null].filter(Boolean).join(', ') || '—';
      L.push(`| ${p.course_code || p.card_title} | ${to} | ${p.verbatim.replace(/\|/g, '\\|')} | ${p.date} |`);
    }
    L.push('');
  }

  // Anything the parser could not classify, and any non-reviewer comment, is
  // surfaced here rather than dropped — a watcher that quietly discards what it
  // does not understand reports quiet when it is simply blind.
  const unclassified = d.newComments.filter((c) => c.unclassified && c.unclassified.length);
  if (unclassified.length) {
    L.push('## Lines this tool did not classify (read them yourself)');
    L.push('');
    for (const c of unclassified) {
      L.push(`**${c.card}** — ${c.author}, ${(c.created_at || '').slice(0, 10)}:`);
      for (const line of c.unclassified) L.push(`- ${line}`);
      L.push('');
    }
  }
  return L.join('\n') + '\n';
}

function updateProgressLedger(newProgress) {
  let ledger = {};
  try { ledger = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch { /* first run */ }
  for (const p of newProgress) {
    const key = p.course_code || p.card_title;
    const prev = ledger[key];
    // Keep the furthest read, not merely the latest comment.
    // Keep the furthest point reached, not merely the most recently seen line.
    if (prev && (prev.checked_to_round || 0) > (p.round || 0)) continue;
    ledger[key] = {
      checked_to_seed: p.seed,
      checked_to_round: p.round,
      verbatim: p.verbatim,
      // `date` is the timestamp of the thing that CONTAINED the line. For a comment that is
      // when she wrote it; for a card-description log it is only when the card was created,
      // and her own "11/06"-style label is the nearest thing to a real date. Both are shown
      // as what they are, because "how far has this course been human-reviewed" is a claim
      // that goes stale, and a wrong date makes stale coverage look current.
      container_date: p.date,
      her_log_label: p.section || null,
      reviewer: 'Deborah',
      source: 'Basecamp Creu Cyrsiau card table, Content checking column',
    };
  }
  fs.mkdirSync(path.dirname(PROGRESS_FILE), { recursive: true });
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(ledger, null, 2) + '\n');
  return ledger;
}

// ── Getting it in front of Kai ───────────────────────────────────────────────
/**
 * Publish the morning digest to the Command Surface so it lands on Kai's 見 Review
 * shelf — a repo path is not a deliverable to someone reading from a phone.
 *
 * IDENTITY IS THE WHOLE DIFFICULTY, and it is why this is env-gated rather than
 * unconditional. publish-doc files the doc under the AUTHENTICATED CALLER's user id.
 * The estate's cron identity (~/.cs-cron-session) is TOM's, so an unattended run that
 * published through it would put Deborah's review material — Kai's alone — onto Tom's
 * shelf. So: publish only when pointed at a Kai session, and otherwise say plainly in
 * the log that it did not publish and why. Silence here would be the same failure this
 * whole tool exists to fix.
 *
 * Mint the Kai session (Tom, once — it writes to the surface's own session store):
 *   CS_CRON_USER=kai CS_SESSION_FILE=/home/tomcassidy/.cs-cron-session-kai \
 *     node /home/tomcassidy/command-surface/ops/cs-cron-session.js
 */
async function publishToShelf(markdown, summary) {
  const surface = process.env.CS_SURFACE || 'http://localhost:4317';
  const out = { published: false, carded: false };

  // A doc is filed under the AUTHENTICATED CALLER's user id, and an unattended cron
  // process on this box carries no identity, so it resolves to Tom. Publishing the
  // digest that way would file Deborah's review material — Kai's alone — as a document
  // of Tom's, and plate-ingest would put it on Tom's plate. So the doc is published
  // ONLY when pointed at a Kai session; otherwise it is deliberately skipped.
  const sessionFile = process.env.DEBORAH_WATCH_SESSION;
  let headers = { 'Content-Type': 'application/json' };
  if (sessionFile) {
    try {
      const cookie = fs.readFileSync(sessionFile, 'utf8').trim();
      if (!cookie.startsWith('v2.')) out.why = `${sessionFile} is not a v2 session — refusing to publish with a stale identity`;
      else headers = { ...headers, Cookie: `cs_user=${cookie}`, Origin: surface };
    } catch (e) { out.why = `cannot read ${sessionFile}: ${e.message}`; }
  } else {
    out.why = 'DEBORAH_WATCH_SESSION not set — no Kai identity, so the digest was NOT published (it would file as Tom\'s); the card and the repo queue file still went out';
  }

  const today = new Date().toISOString().slice(0, 10);
  if (headers.Cookie) {
    try {
      const r = await fetch(`${surface}/api/publish-doc`, {
        method: 'POST', headers, signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ content: markdown, title: `Deborah's review column — ${today}` }),
      }).then((x) => x.json());
      if (r && r.url) { out.published = true; out.url = r.url; }
      else out.why = `publish-doc gave no url: ${JSON.stringify(r).slice(0, 200)}`;
    } catch (e) { out.why = `publish-doc failed: ${e.message}`; }
  }

  // The card is what actually causes work — a file written into the repo is inert until
  // somebody happens to read it, which is precisely how the eight findings went unread.
  // "needs":"kai" addresses it to Kai's board whichever identity the run carries.
  try {
    const r = await fetch(`${surface}/api/needs-you`, {
      method: 'POST', headers, signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ text: summary, needs: 'kai', ...(out.url ? { url: out.url } : {}) }),
    });
    out.carded = r.ok;
    if (!r.ok) out.cardWhy = `needs-you ${r.status}: ${(await r.text()).slice(0, 200)}`;
  } catch (e) { out.cardWhy = `needs-you failed: ${e.message}`; }

  return out;
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const state = loadState();
  const report = await morningRead();
  const d = diff(report, state);
  const markdown = renderQueueMarkdown(report, d);

  if (AS_JSON) {
    console.log(JSON.stringify({ report, ...d }, null, 2));
  } else {
    process.stdout.write(markdown);
  }

  if (DRY_RUN) {
    process.stderr.write('\n[dry-run] nothing written; state not advanced\n');
    return;
  }

  if (d.newFindings.length || d.newProgress.length) {
    fs.mkdirSync(QUEUE_DIR, { recursive: true });
    const out = path.join(QUEUE_DIR, `${report.generated_at.slice(0, 10)}.md`);
    fs.writeFileSync(out, markdown);
    process.stderr.write(`\n[wrote] ${out}\n`);
  }
  if (d.newProgress.length) {
    updateProgressLedger(d.newProgress);
    process.stderr.write(`[wrote] ${PROGRESS_FILE}\n`);
  }

  if (d.newFindings.length || d.newProgress.length) {
    const courses = [...new Set(d.newFindings.map((f) => f.course_code || f.card_title))];
    const summary = `Deborah's review column: ${d.newFindings.length} new finding(s) across ${courses.length} course(s)`
      + `${courses.length ? ' — ' + courses.join(', ') : ''}`
      + `${d.newProgress.length ? `; ${d.newProgress.length} progress marker(s)` : ''}.`;
    if (NO_NOTIFY) {
      process.stderr.write('[no-notify] surface publish and card suppressed by flag\n');
    } else {
      const pub = await publishToShelf(markdown, summary.slice(0, 300));
      process.stderr.write(pub.published ? `[published] ${pub.url}\n` : `[not published] ${pub.why}\n`);
      process.stderr.write(pub.carded ? '[carded] posted to Kai\'s board\n' : `[no card] ${pub.cardWhy || 'unknown'}\n`);
    }
  } else {
    process.stderr.write('[quiet] nothing new — nothing published\n');
  }

  for (const card of report.cards) {
    for (const c of card.comments) {
      state.comments[c.comment_id] = { updated_at: c.updated_at, card_id: card.card_id };
    }
  }
  for (const f of d.newFindings) state.findings[f.key] = { queued_at: report.generated_at, course: f.course_code };
  for (const p of d.newProgress) state.findings[p.key] = { queued_at: report.generated_at, course: p.course_code };
  state.runs = (state.runs || []).slice(-30);
  state.runs.push({ at: report.generated_at, new_findings: d.newFindings.length, new_progress: d.newProgress.length });
  saveState(state);
  process.stderr.write(`[state] ${STATE_FILE}\n`);
})().catch((e) => {
  // Fail loudly. A watcher that dies quietly is worse than none: it reports
  // quiet when it is simply broken.
  console.error(`\nDEBORAH COLUMN WATCH FAILED: ${e.message}\n`);
  process.exit(1);
});
