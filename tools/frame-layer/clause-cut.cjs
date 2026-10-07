/**
 * CLAUSE CUT: where does a phrase's MATRIX clause end? A Haiku-family model
 * decides, cached per text (Tom, 2026-10-07, r-2026-10-07-never-use-regex-to-
 * classify-language).
 *
 * pattern-diversity.cjs needs two readings of a known-side phrase: its matrix
 * clause (what the frame signature is taken from) and its skeleton (first
 * words of the matrix clause | the connective + first words of what it opens).
 * Both used to cut at the first match of a regex of subordinators and
 * coordinators, which cut "bread and butter" at "and" and "I know that man" at
 * "that". The judgement "a second CLAUSE starts here" is about language, so the
 * model makes it, reading numbered words, and answers with one number:
 *   the position of the connective word that opens the first subordinate or
 *   coordinate clause, or 0 when the phrase has no second clause.
 * Splitting the text into words on spaces is plumbing; only the cut is judged.
 *
 * ensureCut(texts) is async and fills the cache; cutOf(text) is a sync lookup
 * that throws for an uncut text, exactly like frame-tagger tagOf.
 */
const fs = require('fs');
const path = require('path');
const T = require('./frame-tagger.cjs');

const VERSION = '2026-10-07.1';
const words = (s) => String(s || '').replaceAll('\t', ' ').replaceAll('\n', ' ').split(' ').filter(Boolean);

const SYSTEM = `You find where the MAIN (matrix) clause of a phrase ends. You reply with the requested lines only.

Each phrase is given with its words numbered. Find the FIRST word that opens a second clause: a subordinating or coordinating connective that introduces a clause with its own verb (if, because, when, while, before, after, until, although, though, unless, so that, but, and, or, so, that, who, which, where, as soon as, since, in English; the equivalent words in any other language, e.g. French si / parce que / quand / mais / et / que / qui). Give the NUMBER of that connective word. Give 0 when there is no second clause.

Rules:
- A connective joining two nouns, adjectives or adverbs is NOT a cut ("bread and butter", "slowly but surely", "small but nice" -> 0 unless a second clause follows).
- "that" as a demonstrative ("that man", "like that") is NOT a cut; "that" opening a clause ("I think that he left", "the book that I read") IS.
- A to-infinitive or -ing chunk is not a second clause ("I want to go", "before leaving" -> 0 for "to"/"leaving"; but "before you leave" -> the number of "before").
- When the clause has no connective ("I think he left", "the man I saw"), answer 0: only a connective word can be the cut.
- A leading connective with nothing before it ("but I want to go", "and then") is not a cut; look for the next one.

Reply with one line per phrase: <number>: <a few words of reasoning> => <word number or 0>
Example: 4: matrix 'I'd have driven', 'if' opens a clause => 4`;

function render(items) {
  return `PHRASES:\n${items.map((t, i) => `${i + 1}. ${words(t).map((w, j) => `${w}(${j + 1})`).join(' ')}`).join('\n')}`;
}

/** Reads "n: ... => k" by string slicing; the reply format is ours, not language. */
function parseCuts(text, n) {
  const out = new Array(n).fill(null);
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    const colon = line.indexOf(':');
    if (colon < 1) continue;
    const num = Number(line.slice(0, colon).trim());
    if (!Number.isInteger(num) || num < 1 || num > n) continue;
    const arrow = line.lastIndexOf('=>');
    if (arrow < 0) continue;
    const k = Number(line.slice(arrow + 2).trim());
    if (Number.isInteger(k) && k >= 0) out[num - 1] = k;
  }
  return out;
}

class CutCache {
  constructor({ dir = path.dirname(new T.TagCache({}).file) } = {}) {
    this.file = path.join(dir, `cuts-${VERSION}-haiku.jsonl`);
    this.map = new Map();
    if (fs.existsSync(this.file)) for (const line of fs.readFileSync(this.file, 'utf8').split('\n')) {
      if (!line) continue;
      try { const r = JSON.parse(line); this.map.set(r.k, r.cut); } catch { /* torn last line */ }
    }
  }
  has(t) { return this.map.has(T.keyOf(t)); }
  get(t) { return this.map.has(T.keyOf(t)) ? this.map.get(T.keyOf(t)) : null; }
  put(entries) {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const lines = entries.map(([t, cut]) => { this.map.set(T.keyOf(t), cut); return JSON.stringify({ k: T.keyOf(t), text: t, cut }); });
    if (lines.length) fs.appendFileSync(this.file, lines.join('\n') + '\n');
  }
}
/** In-memory cache for tests: { text: cut }. */
class MemoryCutCache {
  constructor(m = {}) { this.map = new Map(Object.entries(m).map(([t, c]) => [T.keyOf(t), c])); }
  has(t) { return this.map.has(T.keyOf(t)); }
  get(t) { return this.map.has(T.keyOf(t)) ? this.map.get(T.keyOf(t)) : null; }
  put(entries) { for (const [t, c] of entries) this.map.set(T.keyOf(t), c); }
}

let CACHE = null;
const cache = () => (CACHE ||= new CutCache());
const useCutCache = (c) => (CACHE = c);

async function ensureCut(texts, { batch = 60, parallel = 4, call = T.callModel, log = (s) => process.stderr.write(s + '\n') } = {}) {
  const c = cache();
  const todo = [...new Set(texts.map(t => String(t || '').trim()).filter(Boolean))].filter(t => !c.has(t));
  const batches = [];
  for (let i = 0; i < todo.length; i += batch) batches.push(todo.slice(i, i + batch));
  let next = 0;
  const untagged = [];
  const runOne = async (items, attempt) => {
    const r = await call(render(items), { model: 'haiku', system: SYSTEM });
    const cuts = parseCuts(r.text, items.length);
    // a cut beyond the phrase's last word is an answer we cannot use: treat it as missing
    const ok = items.map((t, i) => [t, cuts[i]]).filter(([t, k]) => k !== null && k <= words(t).length);
    c.put(ok);
    const gaps = items.filter(t => !ok.some(([u]) => u === t));
    log(`  cut ${ok.length}/${items.length}`);
    if (gaps.length && attempt === 1) await runOne(gaps, 2); else untagged.push(...gaps);
  };
  const worker = async () => {
    while (next < batches.length) {
      const b = batches[next++];
      try { await runOne(b, 1); } catch (e) { log(`  cut batch failed: ${e.message}`); untagged.push(...b); }
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, batches.length) }, worker));
  return { missing: todo.length, untagged };
}

function cutOf(text) {
  if (!String(text || '').trim()) return 0;
  const k = cache().get(text);
  if (k === null) throw new Error(`clause-cut: "${String(text).slice(0, 80)}" has not been cut; call ensureCut first`);
  return k;
}

/** { matrix, connective, rest } — the phrase split at the model's cut. */
function splitAtCut(text) {
  const w = words(text), k = cutOf(text);
  if (!k || k === 1) return { matrix: w.join(' '), connective: null, rest: '' };
  return { matrix: w.slice(0, k - 1).join(' '), connective: w[k - 1], rest: w.slice(k).join(' ') };
}

module.exports = { ensureCut, cutOf, splitAtCut, parseCuts, render, words, CutCache, MemoryCutCache, useCutCache, SYSTEM, VERSION };
