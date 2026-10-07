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
 * Prints, per codex: suspect answers found, how many came back with frames.
 */
const fs = require('fs');
const path = require('path');
const T = require('./frame-tagger.cjs');

/**
 * Which cached answers might a malformed reply have produced? EVERY answer with
 * no frames, whatever its opener flag: the old parser read "O unable to
 * classify" as {frames:[], opener:true} (review #128), not only as a bare
 * negative. Judged on each key's LATEST row; a row the strict parser wrote
 * (parser >= 2) or a re-ask under it (retag '115'/'115b') is trusted, so
 * running this twice re-asks nothing twice.
 */
function selectSuspects(rows) {
  const latest = new Map();
  for (const r of rows) latest.set(r.k, r);
  return [...latest.values()].filter(r => !r.frames.length && !(r.parser >= 2) && !['115', '115b'].includes(r.retag));
}

async function retag(codex, { dry = false, parallel = 6 } = {}) {
  const cache = T.defaultCache(codex);
  const rows = [];
  if (fs.existsSync(cache.file)) for (const line of fs.readFileSync(cache.file, 'utf8').split('\n')) {
    if (!line) continue;
    try { rows.push(JSON.parse(line)); } catch { /* torn line */ }
  }
  const empties = selectSuspects(rows).map(r => r.text);
  if (dry || !empties.length) return { codex: codex.id, version: codex.version, empties: empties.length, changed: 0 };
  const fresh = new T.MemoryCache();
  const ledger = await T.ensureTagged(empties, { codex, cache: fresh, parallel, log: () => {} });
  let changed = 0;
  const lines = [];
  for (const t of empties) {
    const tag = fresh.get(t);
    if (!tag) continue;
    if (tag.frames.length) changed++;
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
module.exports = { retag, selectSuspects };
