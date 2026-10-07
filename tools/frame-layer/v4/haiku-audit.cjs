#!/usr/bin/env node
/**
 * HAIKU FRAME AUDIT — a model reads every practice phrase's KNOWN side and tags
 * the canon frames it instantiates, beside the regex tagger (patterns.cjs via
 * window-coverage framesOf). READ-ONLY on the course; writes evidence only.
 *
 * Tom, 2026-10-07 (#31 French frame-coverage trial): "Haiku does the frame
 * analysis, Opus fills the gaps". The question this tool answers is whether a
 * cheap model is a better frame tagger than the regexes, so the two are scored
 * over the SAME phrases and every disagreement is kept for a hand check.
 *
 * Rules the prompt carries, because the metric depends on them:
 *   - the 31 seed P-frames only ("the 30"); a stapled leading interjection
 *     ("thank you,", "of course", "no,") earns nothing (window-coverage.cjs);
 *   - multi-label: a phrase fires every frame it genuinely instantiates;
 *   - a frame fires on GRAMMATICAL shape, not on a keyword: "I like it" is P31,
 *     "it's like that" is not; "it's Peter" is not P18 (no adjective).
 *
 * Unique known texts only (13.5k of 14.3k fra rows); batches of BATCH strings;
 * every batch is written to disk the moment it returns and skipped on re-run,
 * so a killed run resumes where it stopped and no paid call is ever lost.
 *
 * Usage: node tools/frame-layer/v4/haiku-audit.cjs <course> [--batch 200] [--parallel 4] [--limit N]
 * Output: $V4_EVIDENCE/haiku-audit-<course>/batch-NNNN.json + ledger.json
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const PATTERNS = require('../patterns.cjs');
const { loadCourse } = require('./db.cjs');

const ROOT = path.join(__dirname, '..', '..', '..');
const CLAUDE = '/home/tomcassidy/.local/bin/claude';
const MODEL = process.env.AUDIT_MODEL || 'haiku';

const FRAME_NOTES = {
  P3: 'a be-verb + -ing verb form used progressively ("I am going", "was waiting"); "going to"+verb also counts here AND as P2',
  P9: 'think/believe/reckon used as a verb of opinion',
  P10: 'know / be sure / be certain',
  P13: 'a subordinate clause opened by before/after/when/while/until/as soon as/once; "when" as a question word is NOT this',
  P14: 'an "if" condition; "if" meaning "whether" after ask/know/wonder is P22, not P14',
  P15: 'clauses or phrases joined by because / but / although / even though / so that',
  P16: 'a relative clause modifying a noun (who/that/which/whose); complementiser "that" after think/say/know is NOT a relative',
  P18: '"it is/was" + an adjective or evaluative noun phrase ("it\'s easy", "it was a good idea"), optionally + to-VP or that-clause',
  P20: 'any question (yes/no or wh), with or without "?"',
  P21: 'a question opened by or built on what/where/when/why/who/how/which',
  P22: 'an indirect/embedded question or whether-clause under know/ask/wonder/tell/remember/understand ("I don\'t know where he is")',
  P23: 'any negation: not, n\'t, never, nothing, nobody, no one, nowhere',
  P24: 'comparative or superlative (more/less/-er than/most/best/worst)',
  P26: 'an imperative / command addressed to the listener ("tell me", "don\'t go", "let\'s ...")',
  P28: 'a time adverb or time expression (now, today, tomorrow, yesterday, soon, later, always, never, already, still, yet, next week...)',
  P29: 'a perfect tense: have/has/had + past participle',
  P30: 'a passive: be + past participle (by ...)',
  P31: 'like/love/enjoy/prefer/hate as verbs of liking',
};

function frameList() {
  return PATTERNS.map(p => `${p.id} ${p.name}: ${p.shape}${FRAME_NOTES[p.id] ? ` — ${FRAME_NOTES[p.id]}` : ''}`).join('\n');
}

const SYSTEM = 'You tag English sentences with grammatical frames. You reply with the requested lines only, no prose.';

function buildPrompt(items) {
  return `Below is a fixed inventory of English sentence FRAMES, then a numbered list of English phrases from a language course.

For EACH phrase, list every frame id the phrase genuinely instantiates. Judge the grammar, not keywords: a frame fires only if the phrase actually has that grammatical shape.
- Multi-label: one phrase can fire several frames. Many phrases fire 1-4. Some fire none.
- Ignore any interjection or discourse opener stapled at the front ("thank you,", "of course", "no problem", "yes,", "no,", "well", "so", "sorry", "great"): it earns no frame. Tag only what follows it.
- Fragments are normal (some phrases are short building blocks); tag the shape they have.

FRAMES:
${frameList()}

Reply with exactly one line per phrase, in order, in this form:
<number>: <space-separated frame ids, or - if none>
Example:  12: P1 P23 P28

PHRASES:
${items.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
}

function parseReply(text, n) {
  const out = new Array(n).fill(null);
  for (const line of String(text).split('\n')) {
    const m = line.match(/^\s*(\d+)\s*[:.)]\s*(.*)$/);
    if (!m) continue;
    const i = +m[1] - 1;
    if (i < 0 || i >= n) continue;
    const ids = (m[2].match(/P\d{1,2}/g) || []).filter(id => PATTERNS.some(p => p.id === id));
    out[i] = [...new Set(ids)].sort((a, b) => +a.slice(1) - +b.slice(1));
  }
  return out;
}

function callModel(prompt) {
  const { claudeEnv } = require(path.join(ROOT, 'services', 'shared', 'claude-config.cjs'));
  const args = ['--print', '--model', MODEL, '--output-format', 'json', '--tools', '',
    '--system-prompt', SYSTEM, '--exclude-dynamic-system-prompt-sections'];
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const ch = spawn(CLAUDE, args, { env: claudeEnv(process.env), cwd: process.env.TMPDIR || '/tmp' });
    let so = '', se = '';
    ch.stdout.on('data', d => { so += d; }); ch.stderr.on('data', d => { se += d; });
    const timer = setTimeout(() => ch.kill('SIGTERM'), 600000);
    ch.on('close', () => {
      clearTimeout(timer);
      try {
        const j = JSON.parse(so);
        if (j.is_error) return reject(new Error('model error: ' + String(j.result).slice(0, 300)));
        const u = j.usage || {};
        const usage = { input: u.input_tokens || 0, cache_create: u.cache_creation_input_tokens || 0, cache_read: u.cache_read_input_tokens || 0,
          output: u.output_tokens || 0, cost_usd: j.total_cost_usd || 0, model: Object.keys(j.modelUsage || {})[0] || null, ms: Date.now() - t0 };
        usage.total = usage.input + usage.cache_create + usage.cache_read + usage.output;
        resolve({ text: j.result, usage });
      } catch (e) { reject(new Error('unparseable CLI output: ' + (se || so).slice(0, 300))); }
    });
    ch.stdin.end(prompt);
  });
}

async function run(course, { batch = 200, parallel = 4, limit = Infinity } = {}) {
  const outDir = path.join(process.env.V4_EVIDENCE || path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', '31-fra-frame-coverage'), `haiku-audit-${course}`);
  fs.mkdirSync(outDir, { recursive: true });
  const data = loadCourse(course);
  const uniq = [...new Set(data.phrases.map(p => String(p.known_text || '').trim()).filter(Boolean))];
  const batches = [];
  for (let i = 0; i < uniq.length && batches.length < limit; i += batch) batches.push(uniq.slice(i, i + batch));
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify({ course, model: MODEL, batch, unique_known: uniq.length, rows: data.phrases.length, batches: batches.length }, null, 1));
  const todo = batches.map((b, i) => ({ i, items: b, file: path.join(outDir, `batch-${String(i).padStart(4, '0')}.json`) })).filter(t => !fs.existsSync(t.file));
  console.log(`${course}: ${uniq.length} unique known texts, ${batches.length} batches, ${todo.length} to run, parallel ${parallel}`);
  let next = 0, failed = 0;
  const worker = async () => {
    while (next < todo.length) {
      const t = todo[next++];
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const r = await callModel(buildPrompt(t.items));
          const tags = parseReply(r.text, t.items.length);
          const missing = tags.filter(x => x === null).length;
          fs.writeFileSync(t.file, JSON.stringify({ batch: t.i, usage: r.usage, missing, items: t.items.map((k, j) => ({ known: k, frames: tags[j] })) }));
          console.log(`  batch ${t.i}: ${t.items.length} items, ${missing} unparsed, ${r.usage.total} tokens (${r.usage.output} out), ${Math.round(r.usage.ms / 1000)}s`);
          break;
        } catch (e) {
          console.log(`  batch ${t.i} attempt ${attempt} failed: ${e.message}`);
          if (attempt === 2) failed++;
        }
      }
    }
  };
  await Promise.all(Array.from({ length: parallel }, worker));
  console.log(`done; ${failed} batches failed`);
}

/** Read every batch back: Map known_text → frames (null = untagged). */
function loadAudit(dir) {
  const m = new Map();
  for (const f of fs.readdirSync(dir).filter(f => /^batch-\d+\.json$/.test(f))) {
    const b = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const it of b.items) m.set(it.known, it.frames);
  }
  return m;
}

module.exports = { buildPrompt, parseReply, loadAudit, frameList, callModel };

if (require.main === module) {
  const a = process.argv.slice(2);
  const opt = (k, d) => { const i = a.indexOf(k); return i >= 0 ? +a[i + 1] : d; };
  run(a.find(x => !x.startsWith('--') && isNaN(+x)) || 'fra_for_eng', { batch: opt('--batch', 200), parallel: opt('--parallel', 4), limit: opt('--limit', Infinity) })
    .catch(e => { console.error(e.message); process.exit(1); });
}
