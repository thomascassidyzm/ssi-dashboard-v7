#!/usr/bin/env node
/**
 * Job #704: the #409 naturalness judge (Codex gpt-5.6-terra, naturalness-judge.cjs's own prompt and batching) over BOTH arms,
 * blind: each basket gets an opaque id, arms are interleaved and shuffled within a course, the prompt never names an arm.
 * Only baskets that cleared the gate in their arm are judged. Writes verdicts + the key map to --dir. Read-only.
 *   node judge-run.cjs --run <dir with sonnet/> --dir <out dir> [--limit-batches N]
 */
const fs = require('fs'), path = require('path');
const { judgeBaskets } = require('../naturalness-judge.cjs');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };
let s = 704 * 7919; const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const phrasesOf = (r) => [...(r.build || []).map((p) => ({ ...p, role: 'build' })), ...(r.use || []).map((p) => ({ ...p, role: 'use' }))];
(async () => {
  const run = arg('--run'), dir = arg('--dir'); fs.mkdirSync(dir, { recursive: true });
  const sample = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample.json'), 'utf8')).sample;
  const mapFile = path.join(dir, 'keymap.json');
  const map = fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, 'utf8')) : {};
  if (!Object.keys(map).length) {
    let n = 0; const items = [];
    for (const x of sample) {
      const sf = path.join(run, 'sonnet', x.course, `${x.key}.json`);
      const of = x.opusFile;
      for (const [arm, f] of [['opus', of], ['sonnet', sf]]) {
        if (!fs.existsSync(f)) continue;
        const r = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (r.blocked || !phrasesOf(r).length) continue;
        items.push({ course: x.course, arm, lego: x.key, r });
      }
    }
    for (const it of shuffle(items)) { it.id = `J${String(++n).padStart(3, '0')}`; map[it.id] = { course: it.course, arm: it.arm, lego: it.lego }; it.basket = { key: it.id, seed: it.r.seedNumber, legoKnown: it.r.legoKnown, legoTarget: it.r.legoTarget, phrases: phrasesOf(it.r) }; }
    fs.writeFileSync(mapFile, JSON.stringify(map, null, 1));
    fs.writeFileSync(path.join(dir, 'baskets.json'), JSON.stringify(items.map((i) => i.basket)));
    fs.writeFileSync(path.join(dir, 'courses.json'), JSON.stringify(items.map((i) => [i.id, i.course])));
  }
  const baskets = JSON.parse(fs.readFileSync(path.join(dir, 'baskets.json'), 'utf8'));
  const course = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(dir, 'courses.json'), 'utf8')));
  for (const c of ['ita_for_eng', 'spa_for_eng', 'fra_for_eng', 'deu_for_eng']) {
    const bs = baskets.filter((b) => course[b.key] === c);
    console.error(`${c}: ${bs.length} baskets`);
    await judgeBaskets(c, bs, path.join(dir, 'verdicts.jsonl'), { batch: 12, model: 'gpt-5.6-terra' });
  }
  console.error('judge pass complete');
})().catch((e) => { console.error(e); process.exit(1); });
