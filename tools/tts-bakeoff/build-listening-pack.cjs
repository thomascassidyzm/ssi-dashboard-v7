#!/usr/bin/env node
/**
 * Blind-listening pack builder.
 *
 *   node tools/tts-bakeoff/build-listening-pack.cjs \
 *     --in out/azure --in out/xai --in out/elevenlabs \
 *     --out packs/welsh-round-1 [--key packs/welsh-round-1-KEY.json] \
 *     [--pack-seed 7] [--no-grouping] [--max-repeats 3]
 *
 * What "blind" means here, precisely:
 *   - clip filenames are clip-0001.<ext> and carry no provider string
 *   - ID3 tags (v2 header, v1 footer) and non-essential WAV chunks are stripped
 *     from the copied bytes, because a vendor's encoder happily writes its name
 *     into a comment frame
 *   - the key file is written OUTSIDE the pack directory. If you put the key in
 *     the pack, the pack is not blind. The builder refuses to do it.
 *   - each system gets an anonymous letter (System A, System B …). The letter is
 *     needed for the aggregate axes: you cannot score "intra-voice consistency"
 *     or "repeatability" without knowing which clips came from one system.
 *     --no-grouping removes even that, at the cost of axes D-G.
 *
 * Ordering is randomised from --pack-seed with a small deterministic PRNG, so a
 * pack can be rebuilt identically and a disputed result re-listened to.
 *
 * Note for whoever hosts the result: evidence pages on this estate need an
 * explicit /index.html in the URL — link .../welsh-round-1/index.html, not
 * .../welsh-round-1/.
 */
const fs = require('fs');
const path = require('path');
const { writeScoringCsv } = require('./lib/scoring.cjs');

function parseArgs(argv) {
  const out = { in: [], packSeed: 1, grouping: true, maxRepeats: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--in': out.in.push(next()); break;
      case '--out': out.out = next(); break;
      case '--key': out.key = next(); break;
      case '--pack-seed': out.packSeed = Number(next()); break;
      case '--no-grouping': out.grouping = false; break;
      case '--max-repeats': out.maxRepeats = Number(next()); break;
      case '--help': case '-h': out.help = true; break;
      default: if (a.startsWith('--')) throw new Error(`unknown flag ${a}`);
    }
  }
  return out;
}

/** mulberry32 — tiny, seeded, good enough to shuffle a listening pack. */
function prng(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Remove ID3v2 header and ID3v1 footer from an mp3 buffer. */
function stripId3(buf) {
  let start = 0, end = buf.length;
  if (buf.length > 10 && buf.toString('latin1', 0, 3) === 'ID3') {
    const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    start = 10 + size;
  }
  if (end - start > 128 && buf.toString('latin1', end - 128, end - 125) === 'TAG') end -= 128;
  return buf.subarray(start, end);
}

/** Keep only fmt/data in a RIFF WAV — drops LIST/INFO/ISFT ("encoded by …"). */
function stripWavChunks(buf) {
  if (buf.length < 12 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') return buf;
  const keep = [];
  let p = 12;
  while (p + 8 <= buf.length) {
    const id = buf.toString('latin1', p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    const chunk = buf.subarray(p, Math.min(buf.length, p + 8 + size + (size % 2)));
    if (id === 'fmt ' || id === 'data') keep.push(chunk);
    p += 8 + size + (size % 2);
  }
  if (!keep.length) return buf;
  const body = Buffer.concat(keep);
  const head = Buffer.alloc(12);
  head.write('RIFF', 0); head.writeUInt32LE(4 + body.length, 4); head.write('WAVE', 8);
  return Buffer.concat([head, body]);
}

function anonymise(buf, ext) {
  if (ext === 'mp3') return stripId3(buf);
  if (ext === 'wav') return stripWavChunks(buf);
  return buf;   // opus/flac/aac: pass through; note it in the key so it can be checked
}

const SYSTEM_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.in.length || !args.out) {
    console.log(`usage: --in <runDir> [--in <runDir> …] --out <packDir> [--key <path>] [--pack-seed N] [--no-grouping] [--max-repeats N]`);
    process.exit(args.help ? 0 : 2);
  }

  const packDir = path.resolve(args.out);
  const clipsDir = path.join(packDir, 'clips');
  const keyPath = path.resolve(args.key || `${packDir}-KEY.json`);
  if (keyPath.startsWith(packDir + path.sep)) {
    throw new Error(`the key file must NOT live inside the pack directory — that defeats the whole point. Got ${keyPath}`);
  }
  fs.mkdirSync(clipsDir, { recursive: true });

  // 1. Load every render's metadata.
  const runs = args.in.map((dir) => {
    const d = path.resolve(dir);
    const manifest = JSON.parse(fs.readFileSync(path.join(d, 'run-manifest.json'), 'utf8'));
    const metaDir = path.join(d, 'metadata');
    const metas = fs.readdirSync(metaDir).filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(metaDir, f), 'utf8')))
      .filter((m) => m.output_file);
    return { dir: d, manifest, metas };
  });

  const rnd = prng(args.packSeed);
  // 2. Anonymous system letters, assigned in RANDOMISED provider order so that
  //    "System A" is not simply the first --in argument.
  const systems = shuffle(runs.map((r) => r.manifest.provider), rnd)
    .map((provider, i) => ({ provider, letter: SYSTEM_LETTERS[i] }));
  const letterOf = new Map(systems.map((s) => [s.provider, s.letter]));

  // 3. Build the clip list.
  let n = 0;
  const clips = [];
  const anyPlaceholder = runs.some((r) => r.manifest.dry_run);
  for (const run of runs) {
    for (const m of run.metas) {
      if (args.maxRepeats && m.repeat_index > args.maxRepeats) continue;
      const src = path.join(run.dir, m.output_file);
      const ext = path.extname(src).replace('.', '') || 'mp3';
      const realExt = ext === 'wav' || src.endsWith('.placeholder.wav') ? 'wav' : ext;
      const name = `clip-${String(++n).padStart(4, '0')}.${realExt}`;
      fs.writeFileSync(path.join(clipsDir, name), anonymise(fs.readFileSync(src), realExt));
      clips.push({
        clip: name,
        system: letterOf.get(m.provider),
        utterance_id: m.utterance_id,
        utterance_text: m.utterance_text,
        utterance_category: m.utterance_category,
        language: m.utterance_language,
        repeat_index: m.repeat_index,
        repeat_total: m.repeat_total,
        // key-only fields:
        _provider: m.provider,
        _voice_id: m.voice_id,
        _model: m.product_model,
        _snapshot: m.model_version_or_snapshot_id,
        _audio_sha256: m.audio_sha256,
        _is_placeholder: m.audio_is_placeholder,
        _source: path.relative(process.cwd(), src),
      });
    }
  }

  // 4. Order. Grouped: utterances shuffled, systems shuffled within each
  //    utterance, so like-for-like sits back to back. Ungrouped: one flat shuffle.
  let ordered;
  if (args.grouping) {
    const byUtt = new Map();
    for (const c of clips) {
      const k = `${c.utterance_id}|${c.repeat_index}`;
      if (!byUtt.has(k)) byUtt.set(k, []);
      byUtt.get(k).push(c);
    }
    ordered = shuffle([...byUtt.keys()], rnd).flatMap((k) => shuffle(byUtt.get(k), rnd));
  } else {
    ordered = shuffle(clips, rnd);
  }

  // 5. Pack-side manifest — everything the listener may see, nothing more.
  const packManifest = {
    pack_seed: args.packSeed,
    grouping: args.grouping ? 'by-utterance' : 'none',
    built_at: new Date().toISOString(),
    contains_placeholder_audio: anyPlaceholder,
    system_count: systems.length,
    clips: ordered.map((c) => ({
      clip: c.clip,
      system: args.grouping ? c.system : null,
      utterance_id: args.grouping ? c.utterance_id : null,
      utterance_text: args.grouping ? c.utterance_text : null,
      utterance_category: args.grouping ? c.utterance_category : null,
      language: c.language,
      repeat_index: args.grouping ? c.repeat_index : null,
    })),
  };
  fs.writeFileSync(path.join(packDir, 'pack-manifest.json'), JSON.stringify(packManifest, null, 2));

  // 6. The key — outside the pack.
  fs.writeFileSync(keyPath, JSON.stringify({
    pack_dir: packDir,
    pack_seed: args.packSeed,
    grouping: packManifest.grouping,
    built_at: packManifest.built_at,
    warning: 'DO NOT give this file to the listener. It maps every anonymous clip back to its provider.',
    systems,
    clips: ordered.map((c) => ({
      clip: c.clip, system: c.system, provider: c._provider, voice_id: c._voice_id,
      model: c._model, model_version_or_snapshot_id: c._snapshot,
      utterance_id: c.utterance_id, repeat_index: c.repeat_index,
      audio_sha256: c._audio_sha256, is_placeholder: c._is_placeholder, source: c._source,
    })),
  }, null, 2));

  // 7. Scoring sheet + player.
  const csvPath = path.join(packDir, 'scoring-sheet.csv');
  writeScoringCsv(csvPath, packManifest, systems.map((s) => s.letter), args.grouping);
  fs.writeFileSync(path.join(packDir, 'index.html'), renderHtml(packManifest, systems.map((s) => s.letter), args.grouping, anyPlaceholder));

  console.log(`pack     : ${packDir}/index.html   (link it WITH the explicit /index.html)`);
  console.log(`clips    : ${ordered.length} from ${systems.length} systems, grouping=${packManifest.grouping}`);
  console.log(`csv      : ${csvPath}`);
  console.log(`KEY      : ${keyPath}   <- keep this away from the listener`);
  if (anyPlaceholder) console.log(`WARNING  : this pack contains DRY-RUN PLACEHOLDER TONES, not speech. Do not score it.`);
}

function renderHtml(pack, letters, grouping, placeholder) {
  const axes = [
    ['A', 'Similarity to reference voice'],
    ['B', 'Naturalness'],
    ['C', 'Pronunciation accuracy'],
    ['D', 'Intra-voice consistency'],
  ];
  const aggAxes = [
    ['D', 'Intra-voice consistency (whole system)'],
    ['E', 'Repeatability over time'],
    ['F', 'Control — seed / temperature / pronunciation / version pinning'],
    ['G1', 'Operational suitability, ENTRY — rate limits, latency, cost, self-host, consent'],
    ['G2', 'Operational suitability, EXIT — how cleanly this can later be re-recorded human'],
  ];
  const rows = pack.clips.map((c, i) => {
    const label = grouping
      ? `<span class="sys">System ${c.system}</span> <span class="utt">${escapeHtml(c.utterance_id || '')}${c.repeat_index > 1 ? ` · take ${c.repeat_index}` : ''}</span>`
      : `<span class="utt">clip ${i + 1}</span>`;
    const text = grouping && c.utterance_text ? `<div class="text">${escapeHtml(c.utterance_text)}</div>` : '';
    const scores = axes.map(([k]) =>
      `<label class="sc">${k}<input type="number" min="1" max="9" step="1" data-clip="${c.clip}" data-axis="${k}"></label>`
    ).join('');
    return `<tr><td class="lab">${label}${text}</td>
      <td><audio controls preload="none" src="clips/${c.clip}"></audio></td>
      <td class="scores">${scores}</td>
      <td><input class="note" placeholder="note" data-clip="${c.clip}" data-axis="note"></td></tr>`;
  }).join('\n');

  const aggRows = grouping ? letters.map((L) =>
    `<tr><td class="lab"><span class="sys">System ${L}</span></td>` +
    aggAxes.map(([k]) => `<td><input type="number" min="1" max="9" step="1" data-system="${L}" data-axis="${k}"></td>`).join('') +
    `<td><input class="note" data-system="${L}" data-axis="note" placeholder="note"></td></tr>`
  ).join('\n') : '';

  return `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SSi TTS bake-off — blind listening pack</title>
<style>
 body{font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;margin:0;padding:1.2rem;background:#faf9f7;color:#1c1a17}
 h1{font-size:1.3rem;margin:0 0 .3rem} h2{font-size:1.05rem;margin:2rem 0 .5rem}
 .warn{background:#7a1b0f;color:#fff;padding:.7rem 1rem;border-radius:6px;margin:.8rem 0;font-weight:600}
 .meta{color:#5f5952;font-size:.85rem;margin-bottom:1rem}
 table{border-collapse:collapse;width:100%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.08)}
 td,th{border-bottom:1px solid #eae6e0;padding:.5rem .6rem;vertical-align:middle;text-align:left}
 th{background:#f2efe9;font-size:.8rem;text-transform:uppercase;letter-spacing:.04em}
 .sys{display:inline-block;background:#1c1a17;color:#fff;border-radius:3px;padding:.05rem .4rem;font-size:.78rem}
 .utt{color:#5f5952;font-size:.85rem} .text{font-size:.95rem;margin-top:.2rem}
 audio{width:230px;height:32px}
 .scores{white-space:nowrap} .sc{font-size:.78rem;color:#5f5952;margin-right:.35rem}
 input[type=number]{width:3.1rem;padding:.25rem;margin-left:.15rem}
 .note{width:100%;min-width:9rem;padding:.25rem}
 .bar{position:sticky;bottom:0;background:#1c1a17;color:#fff;padding:.7rem 1rem;margin-top:1.5rem;border-radius:6px;display:flex;gap:1rem;align-items:center}
 button{font:inherit;padding:.4rem .9rem;border-radius:4px;border:0;background:#fff;cursor:pointer}
 .axes{font-size:.85rem;color:#3d3934;background:#fff;padding:.8rem 1rem;border-radius:6px}
 .axes li{margin:.15rem 0}
</style></head><body>
<h1>SSi TTS bake-off — blind listening pack</h1>
<div class="meta">${pack.clips.length} clips · ${pack.system_count} systems · grouping: ${pack.grouping} · pack seed ${pack.pack_seed} · built ${pack.built_at}</div>
${placeholder ? '<div class="warn">DRY-RUN PACK — these are synthetic placeholder tones, not speech. Nothing here is scorable. Rebuild from a live run before listening.</div>' : ''}
<div class="axes"><strong>Scale 1-9</strong> (matching the estate's USE-phrase convention: 9 = a native would actually say it; 5-6 = functional/textbook; ≤4 = reject).
<ul>
<li><strong>A</strong> similarity to reference voice · <strong>B</strong> naturalness · <strong>C</strong> pronunciation accuracy — scored <em>per clip</em></li>
<li><strong>D</strong> intra-voice consistency — per clip <em>against the other takes you have just heard</em>, and again per system</li>
<li><strong>E</strong> repeatability · <strong>F</strong> control — <em>per system only</em>; a single clip cannot show them</li>
<li><strong>G</strong> operational suitability, scored as two halves per system: <strong>G1 entry</strong> (rate limits, latency, cost, self-host, consent) and <strong>G2 exit</strong> — how cleanly a course built on this vendor can later be re-recorded with a human voice via the subset/slice-and-dice method. TTS is a <em>bridge</em>, not the destination: word/phoneme boundary data, output format, licensing after we stop paying, and retiring a real person's clone all count. <em>A vendor cheap to enter and expensive to leave is a worse bridge and scores lower here.</em></li>
</ul></div>

<h2>Per-clip scores (axes A-D)</h2>
<table><thead><tr><th>Clip</th><th>Audio</th><th>A · B · C · D</th><th>Note</th></tr></thead><tbody>
${rows}
</tbody></table>

${grouping ? `<h2>Per-system scores (axes D-G)</h2>
<table><thead><tr><th>System</th><th>D consistency</th><th>E repeatability</th><th>F control</th><th>G operational</th><th>Note</th></tr></thead><tbody>
${aggRows}
</tbody></table>` : '<p class="meta">Grouping is off, so the per-system axes (D-G) cannot be scored from this pack. Use a grouped pack for those.</p>'}

<div class="bar"><span id="count">0 scores entered</span><button id="dl">Download CSV</button><span class="meta" style="color:#bdb6ad">Nothing is uploaded; the CSV downloads to this device.</span></div>
<script>
 const q = (s)=>[...document.querySelectorAll(s)];
 const inputs = ()=>q('input[data-axis]');
 function tally(){ document.getElementById('count').textContent = inputs().filter(i=>i.value.trim()).length + ' scores entered'; }
 document.addEventListener('input', tally);
 document.getElementById('dl').addEventListener('click', ()=>{
   const rows=[['row_type','clip_or_system','axis','score','note']];
   const notes={};
   inputs().forEach(i=>{ if(i.dataset.axis==='note' && i.value.trim()) notes[i.dataset.clip||('SYS:'+i.dataset.system)]=i.value.trim(); });
   inputs().forEach(i=>{
     if(i.dataset.axis==='note') return;
     if(!i.value.trim()) return;
     const isSys = !!i.dataset.system;
     const id = isSys ? i.dataset.system : i.dataset.clip;
     rows.push([isSys?'system':'clip', id, i.dataset.axis, i.value.trim(), notes[isSys?('SYS:'+id):id]||'']);
   });
   const csv = rows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\\n');
   const a=document.createElement('a');
   a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
   a.download='bakeoff-scores-seed${pack.pack_seed}.csv'; a.click();
 });
 tally();
</script>
</body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

main();
