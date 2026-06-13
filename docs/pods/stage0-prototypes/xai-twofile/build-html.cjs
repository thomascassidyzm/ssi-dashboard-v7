#!/usr/bin/env node
// Builds a self-contained LISTEN-two-file-model.html with all audio base64-embedded.
const fs = require('fs');
const path = require('path');
const DEMO = path.join(process.env.HOME, 'Desktop', 'explainer-audio-demo');

function b64(file) {
  const p = path.join(DEMO, file);
  const buf = fs.readFileSync(p);
  return 'data:audio/mpeg;base64,' + buf.toString('base64');
}
function dur(file) {
  const { execSync } = require('child_process');
  const p = path.join(DEMO, file);
  const d = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${p}"`).toString().trim();
  return (Math.round(parseFloat(d) * 100) / 100).toFixed(2) + 's';
}

// player card
function card(title, desc, file, opts = {}) {
  const fn = opts.fn || file;
  const accent = opts.accent || '';
  return `<div class="card${accent}"><div class="title">${title}</div>` +
    (desc ? `<div class="desc">${desc}</div>` : '') +
    `<audio controls preload=metadata src="${b64(file)}"></audio>` +
    `<div class=fn>${fn} &middot; ${dur(file)}</div></div>`;
}
function ladderCard(title, desc, file, rungs) {
  const r = rungs.map(x => `<span class="rung">${x}</span>`).join('<span class="arr">→</span>');
  return `<div class="card ladder"><div class="title">${title}</div>` +
    `<div class="desc">${desc}</div>` +
    `<div class="rungs">${r}</div>` +
    `<audio controls preload=metadata src="${b64(file)}"></audio>` +
    `<div class=fn>${file} &middot; ${dur(file)}</div></div>`;
}

const css = `
body{font:15px/1.55 -apple-system,system-ui,sans-serif;background:#e8e3dd;color:#2a2722;margin:0;padding:34px}
h1{font-size:21px;font-weight:650;margin:0 0 4px}
.sub{color:#6b6258;margin:0 0 8px;font-size:13.5px;max-width:720px}
.note{color:#7a4a1e;background:#f5ece1;border:1px solid #e2d4c2;border-radius:10px;padding:11px 14px;font-size:13px;max-width:720px;margin:0 0 26px}
h2{font-size:15px;font-weight:650;color:#7a4a1e;margin:30px 0 4px;max-width:720px;border-bottom:1px solid #d8d0c6;padding-bottom:6px}
.h2sub{color:#6b6258;font-size:13px;max-width:720px;margin:0 0 14px}
.card{background:#fff;border:1px solid #d8d0c6;border-radius:14px;padding:16px 20px;margin:0 0 14px;max-width:720px;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.card.ab-old{border-color:#d9b9a0;background:#fbf3ec}
.card.ab-new{border-color:#b6c9a8;background:#f4f8ef}
.title{font-weight:650;font-size:15.5px;color:#7a4a1e;margin-bottom:5px}
.desc{color:#5c554c;font-size:13.5px;margin-bottom:11px}
audio{width:100%;height:38px}
.fn{font:11px ui-monospace,monospace;color:#a89e92;margin-top:8px}
.ladder .rungs{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin-bottom:11px}
.rung{font:11.5px ui-monospace,monospace;background:#f1e9dd;border:1px solid #ddd2c2;border-radius:6px;padding:3px 7px;color:#6b5a44}
.arr{color:#b5a892;font-size:13px;margin:0 1px}
.atoms{display:flex;flex-wrap:wrap;gap:8px}
.atoms .card{flex:1 1 150px;min-width:140px;padding:11px 13px;margin:0}
.atoms .title{font-size:13px}
.atoms audio{height:34px}
.es{color:#7a4a1e;font-weight:600}
.gl{color:#8a8378;font-size:12px}
footer{color:#a89e92;font-size:11.5px;max-width:720px;margin:30px 0 0;font:11.5px ui-monospace,monospace}
`;

let h = `<!doctype html><meta charset=utf-8><title>xAI two-file model — listen</title><style>${css}</style>`;
h += `<h1>The two-file intention model — xAI Spanish</h1>`;
h += `<p class=sub>Each intention is recorded as <b>two files</b>: File&nbsp;1 (natural conversation speed) and File&nbsp;2 (slower, with recorded gaps at the atom seams). Early tiers derive from File&nbsp;2; the final tier is File&nbsp;1; a speed ramp bridges. Atoms are <b>sliced from File&nbsp;2's clean gap-seams</b>, never synthesized alone. Voice: xAI clone <code>yis75yfp</code> (Spanish).</p>`;
h += `<div class=note><b>End-chop fix (this build):</b> atom slicing now trims only the dead silence <i>before</i> a word and keeps the word's natural decay tail (~150–230&nbsp;ms of fade). The old slicer cut into the decay — hear it in the A/B at the bottom: the final atom now finishes the word instead of clipping it.</div>`;

// ---- Example A: 3 parts ----
h += `<h2>Example A — "¿Vas a la fiesta mañana?" <span class=gl>(are you going to the party tomorrow?)</span></h2>`;
h += `<p class=h2sub>3 atoms: <span class=es>¿Vas</span> <span class=gl>are you going</span> · <span class=es>a la fiesta</span> <span class=gl>to the party</span> · <span class=es>mañana</span> <span class=gl>tomorrow</span>. File&nbsp;2 seams forced with sentence breaks (commas alone wouldn't split "a la fiesta mañana").</p>`;
h += card('File 1 — natural take', 'Bona-fide conversation speed. One plain xAI call on the whole intention.', 'Spanish-A-party-natural.mp3');
h += card('File 2 — slow, gapped', 'Seam-punctuated text + offline atempo 0.78. Recorded pauses at each atom seam, each sub-phrase closed with phrase-final prosody.', 'Spanish-A-party-slowgapped.mp3');
h += ladderCard('Ladder — atoms → fuse → seamless → natural',
  'Built from the two files. Gaps shrink monotonically; tone between rungs.',
  'Spanish-A-party-ladder.mp3',
  ['atoms (full gaps)','pair-fuse','slow-seamless','File 1 natural']);
h += `<div class=card><div class=title>One atom from File 2 — "mañana" (final atom, tail kept)</div><div class=desc>Sliced at File&nbsp;2's clean seam with the end-chop fix: the word's decay is intact, not clipped.</div><audio controls preload=metadata src="${b64('Spanish-A-party-atom-manana.mp3')}"></audio><div class=fn>Spanish-A-party-atom-manana.mp3 &middot; ${dur('Spanish-A-party-atom-manana.mp3')}</div></div>`;

// ---- Example B: 4 parts ----
h += `<h2>Example B — "Hola, ¿qué tal te va el día hoy?" <span class=gl>(hi there, how's your day going today?)</span></h2>`;
h += `<p class=h2sub>4 atoms: <span class=es>Hola</span> <span class=gl>hi there</span> · <span class=es>¿qué tal te va</span> <span class=gl>how's it going</span> · <span class=es>el día</span> <span class=gl>your day</span> · <span class=es>hoy</span> <span class=gl>today</span>. The ladder shows <b>pairwise fusion</b>: 4 atoms → 2 pairs → whole.</p>`;
h += card('File 1 — natural take', 'Whole intention, conversation speed. One plain xAI call.', 'Spanish-B-day-natural.mp3');
h += card('File 2 — slow, gapped', 'Four recorded seams (greeting + question), offline atempo 0.78.', 'Spanish-B-day-slowgapped.mp3');
h += ladderCard('Ladder — pairwise fusion (4 → 2 pairs → whole)',
  'Tier 2 draws each pair together (Hola+qué-tal-te-va, el-día+hoy) while keeping the two pairs apart, so the assembly is audible; then all four seamless; then natural.',
  'Spanish-B-day-ladder.mp3',
  ['4 atoms (full gaps)','2 fused pairs','slow-seamless','File 1 natural']);
h += `<div class=card><div class=title>One atom from File 2 — "hoy" (final atom, tail kept)</div><div class=desc>Final atom of a 4-part intention, sliced with the end-chop fix — full natural fade to silence.</div><audio controls preload=metadata src="${b64('Spanish-B-day-atom-hoy.mp3')}"></audio><div class=fn>Spanish-B-day-atom-hoy.mp3 &middot; ${dur('Spanish-B-day-atom-hoy.mp3')}</div></div>`;

// ---- A/B: end-chop fix audible ----
h += `<h2>A/B — the end-chop fix, audible</h2>`;
h += `<p class=h2sub>The same word "gracias" sliced two ways. The OLD slice clipped the word's decay (a hard cut to silence ~0.18&nbsp;s early); the FIXED slice keeps the natural fade. Play both — the old one ends abruptly, the fixed one finishes the word.</p>`;
h += `<div style="display:flex;flex-wrap:wrap;gap:14px;max-width:720px">`;
h += `<div class="card ab-old" style="flex:1 1 320px;margin:0"><div class=title>OLD — "gracias" end-chopped</div><div class=desc>Decay cut: jumps to digital silence with ~0.18&nbsp;s of the word still expected.</div><audio controls preload=metadata src="${b64('Spanish-atom-gracias.mp3')}"></audio><div class=fn>Spanish-atom-gracias.mp3 &middot; ${dur('Spanish-atom-gracias.mp3')}</div></div>`;
h += `<div class="card ab-new" style="flex:1 1 320px;margin:0"><div class=title>FIXED — "gracias" tail kept</div><div class=desc>Trims only the leading dead air; the word's natural decay is preserved to the floor.</div><audio controls preload=metadata src="${b64('Spanish-atom-gracias-FIXED.mp3')}"></audio><div class=fn>Spanish-atom-gracias-FIXED.mp3 &middot; ${dur('Spanish-atom-gracias-FIXED.mp3')}</div></div>`;
h += `</div>`;

h += `<footer>xAI voice yis75yfp (Spanish, provider 'xai') · File 2 = seam-punctuated text + offline atempo 0.78 · atoms sliced at clean gap-seams, natural tails kept · 2026-06-13</footer>`;

const out = path.join(DEMO, 'LISTEN-two-file-model.html');
fs.writeFileSync(out, h);
console.log('WROTE', out, '(' + (fs.statSync(out).size / 1024).toFixed(0) + ' KB)');
