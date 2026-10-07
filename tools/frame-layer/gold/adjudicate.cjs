#!/usr/bin/env node
/**
 * GOLD ADJUDICATION: Opus reads the codex and decides, row by row, which
 * frames each gold text instantiates, with a one-line note on any borderline
 * call. Blind to every tagger: it sees the text, its course and the target
 * side (a meaning aid for known languages the reader may know less well).
 * The output is the gold set Tom or Kai can overrule on the review sheet.
 *
 * Usage: node adjudicate.cjs selection.json out.json [--batch 20] [--parallel 4]
 */
const fs = require('fs');
const T = require('../frame-tagger.cjs');

const SYSTEM = `You are the adjudicator for a gold set: for each phrase you decide, carefully and exactly by the codex below, which frames the KNOWN side instantiates. Think about every frame's definition and boundary rules; precision matters more than speed. You reply with JSON only.\n\n${T.renderCodex()}`;

function prompt(rows) {
  return `Adjudicate each row. The KNOWN text is what you tag; the target text is only there to help you understand the meaning.

Reply with a JSON array, one object per row, in order:
{"gid": "...", "opener": true|false, "frames": ["P..", ...], "note": "one short line on any borderline call, else empty"}

ROWS:
${rows.map(r => JSON.stringify({ gid: r.gid, course: r.course, known_language: T.knownLanguageName(r.course), kind: r.kind, known: r.known_text, target: r.target_text })).join('\n')}`;
}

async function run(sel, outFile, { batch = 20, parallel = 4 } = {}) {
  const done = fs.existsSync(outFile) ? JSON.parse(fs.readFileSync(outFile, 'utf8')) : [];
  const have = new Set(done.map(d => d.gid));
  const todo = sel.filter(r => !have.has(r.gid));
  const batches = [];
  for (let i = 0; i < todo.length; i += batch) batches.push(todo.slice(i, i + batch));
  let next = 0, tokens = 0;
  const worker = async () => {
    while (next < batches.length) {
      const b = batches[next++];
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const r = await T.callModel(prompt(b), { model: 'opus', system: SYSTEM, timeoutMs: 900000 });
          const txt = r.text.slice(r.text.indexOf('['), r.text.lastIndexOf(']') + 1);
          const arr = JSON.parse(txt);
          for (const a of arr) {
            const row = b.find(x => x.gid === a.gid);
            if (!row) continue;
            done.push({ ...row, gold: { opener: !!a.opener, frames: [...new Set(a.frames)].filter(f => T.FRAME_IDS.includes(f)).sort((x, y) => +x.slice(1) - +y.slice(1)), note: a.note || '' } });
          }
          tokens += r.usage.total;
          fs.writeFileSync(outFile, JSON.stringify(done, null, 1));
          console.log(`batch of ${b.length}: ${arr.length} adjudicated, ${r.usage.total} tokens, ${Math.round(r.usage.ms / 1000)}s`);
          break;
        } catch (e) { console.log(`batch attempt ${attempt} failed: ${e.message}`); }
      }
    }
  };
  await Promise.all(Array.from({ length: parallel }, worker));
  console.log(`done: ${done.length}/${sel.length} rows, ${tokens} tokens`);
}

if (require.main === module) {
  const [selFile, outFile] = process.argv.slice(2);
  run(JSON.parse(fs.readFileSync(selFile, 'utf8')), outFile).catch(e => { console.error(e); process.exit(1); });
}
module.exports = { run, SYSTEM };
