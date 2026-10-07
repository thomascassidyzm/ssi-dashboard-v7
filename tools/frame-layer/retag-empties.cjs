#!/usr/bin/env node
/**
 * RETAG CACHED EMPTIES (review #115). Until 2026-10-07 the tagger's reply parser
 * read a malformed line ("unable to classify", an analysis with no '=>') as
 * "no frames" and cached it, so a model hiccup became a permanent negative. The
 * cache does not keep the raw reply, so a bad empty cannot be told from a real
 * one after the fact: this re-asks the model about EVERY cached empty answer of a
 * codex, with the fixed parser, and appends the new answer (marked retag:"115").
 * The cache loads last-write-wins, so the new answer replaces the old.
 *
 * Usage: node tools/frame-layer/retag-empties.cjs [codex.json ...] [--dry]
 * Prints, per codex: empties found, how many came back with frames.
 */
const fs = require('fs');
const path = require('path');
const T = require('./frame-tagger.cjs');

async function retag(codex, { dry = false, parallel = 6 } = {}) {
  const cache = T.defaultCache(codex);
  const empties = [];
  if (fs.existsSync(cache.file)) {
    const last = new Map();
    for (const line of fs.readFileSync(cache.file, 'utf8').split('\n')) {
      if (!line) continue;
      try { const r = JSON.parse(line); last.set(r.k, r); } catch { /* torn line */ }
    }
    for (const r of last.values()) if (!r.frames.length && !r.opener) empties.push(r.text);
  }
  if (dry || !empties.length) return { codex: codex.id, version: codex.version, empties: empties.length, changed: 0 };
  const fresh = new T.MemoryCache();
  const ledger = await T.ensureTagged(empties, { codex, cache: fresh, parallel, log: () => {} });
  let changed = 0;
  const lines = [];
  for (const t of empties) {
    const tag = fresh.get(t);
    if (!tag) continue;
    if (tag.frames.length || tag.opener) changed++;
    lines.push(JSON.stringify({ k: T.keyOf(t), text: t, frames: tag.frames, opener: tag.opener, model: 'haiku', retag: '115', parser: 2, at: new Date().toISOString() }));
  }
  fs.appendFileSync(cache.file, lines.join('\n') + '\n');
  return { codex: codex.id, version: codex.version, empties: empties.length, changed, untagged: ledger.untagged.length, tokens: ledger.tokens };
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const files = a.filter(x => x.endsWith('.json'));
  const codexes = files.length ? files.map(f => require(path.resolve(f))) : [T.CODEX];
  (async () => { for (const c of codexes) console.log(JSON.stringify(await retag(c, { dry: a.includes('--dry') }))); })()
    .catch(e => { console.error(e.message); process.exit(1); });
}
module.exports = { retag };
