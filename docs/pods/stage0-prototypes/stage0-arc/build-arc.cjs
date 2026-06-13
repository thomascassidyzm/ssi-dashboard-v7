/**
 * stage0-arc/build-arc.cjs — render ONE listenable demo MP3 of the full
 * "Stage 0" five-exposure introduction arc for a single Irish pod sentence
 * (gle_for_eng:pod-0 global_order 3), so the founder can hear the ramp end
 * to end.
 *
 * READ-ONLY against the DB (SELECT only). No commits, no DB writes.
 * Reuses the production composite's conventions exactly:
 *   - cast (target/chunk) voice = the sentence's existing target clip voice
 *     (ga-IE-ColmNeural, Azure), used for ALL target/chunk audio
 *   - known (gloss/translation) voice = en-GB-SoniaNeural
 *   - every TTS piece re-encoded through ffmpeg→lame with EDGE_TRIM_FILTER
 *     (silenceremove keeping 40ms each side) — same as the composite
 *   - pieces cached by (voice, text); TTS budget kept ≤20 Azure calls
 *
 * ffmpeg 7.1.1 HAZARD: its threaded acrossfade nondeterministically drops
 * segments. We do NOT use acrossfade. Everything is joined with the concat
 * demuxer (single re-encode), and the final duration is ffprobe-verified
 * against the sum of parts.
 */

const path = require('path');
require('dotenv').config({ path: '.env' });

const fs = require('fs');
const os = require('os');
const { promisify } = require('util');
const { exec } = require('child_process');
const execAsync = promisify(exec);
const { createClient } = require('@supabase/supabase-js');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');

const ttsService = require(path.join(process.cwd(), 'services/tts-service.cjs'));
const audioProcessor = require(path.join(process.cwd(), 'services/audio-processor.cjs'));

// ── config ────────────────────────────────────────────────────────────────
const COURSE = 'gle_for_eng';
const POD_ID = `${COURSE}:pod-0`;
const GLOBAL_ORDER = 3;
const KNOWN_VOICE = 'en-GB-SoniaNeural'; // brief: gloss/translation voice

const OUT_DIR = path.join(os.homedir(), 'Desktop', 'explainer-audio-demo');
const OUT_FILE = path.join(OUT_DIR, 'Irish-g3-stage0-arc.mp3');

// Pacing (ms) — matches the composite's calibrated constants.
const GAP_TGT_MEANING = 240; // within a unit: target → meaning
const GAP_PAIR_REPEAT = 360;  // between the two repeats inside 0:1's doubled pair
const GAP_BETWEEN_UNITS = 620; // between successive units in a tier
const GAP_BETWEEN_TIERS = 900; // longer break between tiers (exposures)
const GAP_PAIR_FUSION = 140;   // small gap drawing two atoms together (0:3)
const GAP_WHOLE_FUSION = 70;   // tiny gap chunking the four atoms (0:4)

// Same edge-trim the composite uses: strip provider edge-padding, keep 40ms.
const EDGE_TRIM_FILTER = [
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04',
  'areverse',
  'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04',
  'areverse',
].join(',');

const supabase = createClient(
  (process.env.SUPABASE_URL || '').trim(),
  (process.env.SUPABASE_SERVICE_KEY || '').trim(),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const s3 = new S3Client({
  region: (process.env.AWS_REGION || 'eu-west-1').trim(),
  credentials: {
    accessKeyId: (process.env.AWS_ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || '').trim(),
  },
});
const S3_BUCKET = (process.env.S3_BUCKET || '').trim();

// ── helpers ─────────────────────────────────────────────────────────────────
let azureCalls = 0;
const cache = new Map(); // key -> file path

function azureConfig(voiceName) {
  return {
    subscriptionKey: process.env.AZURE_SPEECH_KEY,
    region: process.env.AZURE_SPEECH_REGION || 'westeurope',
    voiceName,
    speed: 1.0,
  };
}

/** Render one TTS piece (Azure), edge-trimmed + re-encoded to the common
 *  format (48k mono lame). Cached by (voice, text). */
async function renderPiece(tempDir, text, voiceName) {
  const key = `tts|${voiceName}|${text}`;
  if (cache.has(key)) return cache.get(key);
  const { audioBuffer } = await ttsService.generateWithRetry(text, 'azure', azureConfig(voiceName));
  azureCalls++;
  if (!audioBuffer || audioBuffer.length === 0) throw new Error(`empty TTS piece (${voiceName}: "${text.slice(0, 40)}")`);
  const rawFile = path.join(tempDir, `raw-${cache.size}.mp3`);
  fs.writeFileSync(rawFile, audioBuffer);
  const file = path.join(tempDir, `piece-tts-${cache.size}.mp3`);
  await audioProcessor.ffmpegFilterToLameMp3(rawFile, file, { filterChain: EDGE_TRIM_FILTER });
  cache.set(key, file);
  return file;
}

/** A silence piece via lavfi, re-encoded to the common format. Cached by ms. */
async function ensureSilence(tempDir, ms) {
  const key = `silence|${ms}`;
  if (cache.has(key)) return cache.get(key);
  const file = path.join(tempDir, `sil-${ms}.mp3`);
  await audioProcessor.ffmpegFilterToLameMp3(null, file, {
    ffmpegInputArgs: ['-f', 'lavfi', '-t', String(ms / 1000)],
    inputOverride: 'anullsrc=r=48000:cl=mono',
  });
  cache.set(key, file);
  return file;
}

/** Download an existing mastered clip from S3 and re-encode to the common
 *  format (48k mono lame). NO edge-trim — these are already mastered takes
 *  with clean edges; trimming risks clipping natural breath. Cached by key. */
async function s3Piece(tempDir, s3Key) {
  const ck = `s3|${s3Key}`;
  if (cache.has(ck)) return cache.get(ck);
  const r = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }));
  const chunks = []; for await (const c of r.Body) chunks.push(c);
  const buf = Buffer.concat(chunks);
  const rawFile = path.join(tempDir, `s3raw-${cache.size}.mp3`);
  fs.writeFileSync(rawFile, buf);
  const file = path.join(tempDir, `piece-s3-${cache.size}.mp3`);
  await audioProcessor.ffmpegFilterToLameMp3(rawFile, file, {}); // re-encode only
  cache.set(ck, file);
  return file;
}

/** ffprobe duration (ms) of a file (container metadata; carries MP3 padding). */
async function durationMs(file) {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${file}"`,
  );
  return Math.round(parseFloat(stdout.trim()) * 1000);
}

/** TRUE audio length (ms) by decoding to raw mono s16le @48k and counting
 *  bytes — free of MP3 encoder-delay/padding ambiguity. This is the honest
 *  measure for the corruption check: a real segment drop shows here, MP3
 *  framing padding does not. */
async function trueMs(file) {
  const { stdout } = await execAsync(
    `ffmpeg -v error -i "${file}" -f s16le -ac 1 -ar 48000 - | wc -c`,
  );
  const bytes = parseInt(stdout.trim(), 10);
  return Math.round(bytes / (48000 * 2) * 1000);
}

let concatSeq = 0;
/** Join a list of files into one via the concat demuxer (single re-encode).
 *  No acrossfade — avoids the ffmpeg 7.1.1 segment-drop hazard. */
async function concatFiles(tempDir, files, outName) {
  const listPath = path.join(tempDir, `concat-${concatSeq}.txt`);
  const out = path.join(tempDir, outName || `concat-${concatSeq}.mp3`);
  concatSeq++;
  const list = files.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(listPath, list);
  await audioProcessor.ffmpegFilterToLameMp3(null, out, {
    ffmpegInputArgs: ['-f', 'concat', '-safe', '0'],
    inputOverride: listPath,
    channels: 1,
    sampleRate: 48000,
  });
  return out;
}

// ── main ─────────────────────────────────────────────────────────────────────
(async () => {
  // 1. Fetch the row (READ-ONLY).
  const { data: row, error } = await supabase
    .from('listening_pod_sentences')
    .select('id, global_order, speaker, target_text, known_text, explainer_text, explainer_decomposition, target_audio_id, known_audio_id')
    .eq('pod_id', POD_ID)
    .eq('global_order', GLOBAL_ORDER)
    .single();
  if (error) throw new Error(`row: ${error.message}`);

  const { data: aud, error: ae } = await supabase
    .from('course_audio')
    .select('id, voice_id, s3_key')
    .in('id', [row.target_audio_id, row.known_audio_id]);
  if (ae) throw new Error(`audio: ${ae.message}`);
  const targetAud = aud.find(a => a.id === row.target_audio_id);
  const knownAud = aud.find(a => a.id === row.known_audio_id);
  const CAST_VOICE = targetAud.voice_id; // ga-IE-ColmNeural — cast voice for ALL chunk/target audio
  console.log(`cast voice = ${CAST_VOICE}; known voice = ${KNOWN_VOICE}`);
  console.log(`target clip = ${targetAud.s3_key}; known clip = ${knownAud.s3_key}`);

  // Atoms, in order.
  const atoms = row.explainer_decomposition
    .filter(c => c && c.chunk_target && c.chunk_known && c.first_encounter !== false)
    .map(c => ({ target: c.chunk_target.trim(), known: c.chunk_known.trim() }));
  if (atoms.length !== 4) throw new Error(`expected 4 atoms, got ${atoms.length}`);

  // Construction tail (— so / — literally). None present for this sentence,
  // but honour it if the explainer ever gains one.
  const tailMatch = (row.explainer_text || '').match(/[—–-]\s*(so|literally)\b[\s\S]*$/i);
  const tail = tailMatch ? tailMatch[0].replace(/^[—–\-]\s*/, '').trim().replace(/[.\s]*$/, '.') : null;

  // Pairwise fusions for 0:3.
  const pairs = [
    { atoms: [atoms[0], atoms[1]], translation: 'I\'m very well, thank you' },
    { atoms: [atoms[2], atoms[3]], translation: 'are you going to work' },
  ];

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage0-arc-'));
  const tierLog = []; // { tier, sequence:[...] }
  const tierDurations = {};

  try {
    // Pre-render the cast atom pieces (used everywhere) — cached.
    const castAtom = {};
    for (const a of atoms) castAtom[a.target] = await renderPiece(tempDir, a.target, CAST_VOICE);

    const gapTM = await ensureSilence(tempDir, GAP_TGT_MEANING);
    const gapPR = await ensureSilence(tempDir, GAP_PAIR_REPEAT);
    const gapBU = await ensureSilence(tempDir, GAP_BETWEEN_UNITS);
    const gapTier = await ensureSilence(tempDir, GAP_BETWEEN_TIERS);
    const gapPairFuse = await ensureSilence(tempDir, GAP_PAIR_FUSION);
    const gapChunkFuse = await ensureSilence(tempDir, GAP_WHOLE_FUSION);

    // ONE flat list of leaf pieces. The whole arc is a single concat-demuxer
    // join (one re-encode), which is the cleanest defence against the ffmpeg
    // 7.1.1 acrossfade segment-drop hazard AND avoids the nested-concat MP3
    // padding accumulation that inflates a metadata-based "shortfall". Each
    // fused group (pair_target, grp_target) is expanded into its leaves inline
    // wherever the pattern repeats it.
    const allLeaves = [];
    const tierStartIdx = {}; // tier -> first leaf index (for per-tier duration)
    const push = (...fs_) => { for (const f of fs_) allLeaves.push(f); };

    // ── 0:1 THE EXPLAINER (atoms) ────────────────────────────────────────
    {
      const seq = [];
      tierStartIdx['0:1'] = allLeaves.length;
      push(await renderPiece(tempDir, 'Exposure one', KNOWN_VOICE), gapTM);
      push(await renderPiece(tempDir, 'Breaking it down...', KNOWN_VOICE)); seq.push('marker:"Exposure one" · cue:"Breaking it down..."');
      push(gapBU);
      for (let i = 0; i < atoms.length; i++) {
        const a = atoms[i];
        const tgt = castAtom[a.target];
        const gls = await renderPiece(tempDir, a.known, KNOWN_VOICE);
        push(tgt, gapTM, gls, gapPR, tgt, gapTM, gls); // pair heard twice: T·240·G·360·T·240·G
        seq.push(`[${a.target} | ${a.known}] ×2 (T·240·G·360·T·240·G)`);
        if (i < atoms.length - 1) { push(gapBU); seq.push(`gap ${GAP_BETWEEN_UNITS}`); }
      }
      if (tail) { push(gapBU, await renderPiece(tempDir, tail, KNOWN_VOICE)); seq.push(`tail:"${tail}"`); }
      tierLog.push({ tier: '0:1 — Explainer (atoms)', exposure: 'Exposure one', sequence: seq });
    }

    // ── 0:2 atoms, TRANSLATION drill (no cue, no notes) ──────────────────
    {
      const seq = [];
      push(gapTier, await renderPiece(tempDir, 'Exposure two', KNOWN_VOICE), gapTM);
      tierStartIdx['0:2'] = allLeaves.length;
      seq.push('marker:"Exposure two"');
      for (let i = 0; i < atoms.length; i++) {
        const a = atoms[i];
        const tgt = castAtom[a.target];
        const gls = await renderPiece(tempDir, a.known, KNOWN_VOICE);
        push(tgt, gapTM, gls, gapTM, tgt, gapTM, tgt); // target/translation/target/target
        seq.push(`[${a.target}] T·240·gloss(${a.known})·240·T·240·T`);
        if (i < atoms.length - 1) { push(gapBU); seq.push(`gap ${GAP_BETWEEN_UNITS}`); }
      }
      tierLog.push({ tier: '0:2 — Translation drill (no cue)', exposure: 'Exposure two', sequence: seq });
    }

    // ── 0:3 PAIRS (fuse atoms pairwise) ──────────────────────────────────
    {
      const seq = [];
      push(gapTier, await renderPiece(tempDir, 'Exposure three', KNOWN_VOICE), gapTM);
      tierStartIdx['0:3'] = allLeaves.length;
      seq.push('marker:"Exposure three"');
      for (let p = 0; p < pairs.length; p++) {
        const pr = pairs[p];
        // pair_target = two atoms' cast pieces fused with a 140ms gap (expanded inline)
        const pt = [castAtom[pr.atoms[0].target], gapPairFuse, castAtom[pr.atoms[1].target]];
        const pairTrans = await renderPiece(tempDir, pr.translation, KNOWN_VOICE);
        // pair_target·240·pair_translation·240·pair_target·240·pair_target
        push(...pt, gapTM, pairTrans, gapTM, ...pt, gapTM, ...pt);
        seq.push(`(${pr.atoms[0].target} +140+ ${pr.atoms[1].target}) · trans("${pr.translation}") · pat T/trans/T/T`);
        if (p < pairs.length - 1) { push(gapBU); seq.push(`gap ${GAP_BETWEEN_UNITS}`); }
      }
      tierLog.push({ tier: '0:3 — Pairs (fused, 140ms)', exposure: 'Exposure three', sequence: seq });
    }

    // ── 0:4 WHOLE, slightly chunked (4 atoms, 70ms gaps) ─────────────────
    {
      const seq = [];
      push(gapTier, await renderPiece(tempDir, 'Exposure four', KNOWN_VOICE), gapTM);
      tierStartIdx['0:4'] = allLeaves.length;
      seq.push('marker:"Exposure four"');
      // grp_target = all four atom cast pieces fused with 70ms gaps (expanded inline)
      const grp = [
        castAtom[atoms[0].target], gapChunkFuse, castAtom[atoms[1].target], gapChunkFuse,
        castAtom[atoms[2].target], gapChunkFuse, castAtom[atoms[3].target],
      ];
      const sentTrans = await s3Piece(tempDir, knownAud.s3_key); // existing KNOWN clip
      push(...grp, gapTM, sentTrans, gapTM, ...grp, gapTM, ...grp);
      seq.push(`grp(4 atoms +70+) · sentence_translation(S3 known clip) · pat G/trans/G/G`);
      tierLog.push({ tier: '0:4 — Whole, chunked (70ms)', exposure: 'Exposure four', sequence: seq });
    }

    // ── 0:5 WHOLE, seamless (natural target take from S3) ────────────────
    {
      const seq = [];
      push(gapTier, await renderPiece(tempDir, 'Exposure five', KNOWN_VOICE), gapTM);
      tierStartIdx['0:5'] = allLeaves.length;
      seq.push('marker:"Exposure five"');
      const sentTarget = await s3Piece(tempDir, targetAud.s3_key); // natural take
      const sentTrans = await s3Piece(tempDir, knownAud.s3_key);
      push(sentTarget, gapTM, sentTrans, gapTM, sentTarget, gapTM, sentTarget);
      seq.push(`sentence_target(S3 natural take) · sentence_translation(S3 known) · pat S/trans/S/S`);
      tierLog.push({ tier: '0:5 — Whole, seamless (natural take)', exposure: 'Exposure five', sequence: seq });
    }

    // ── corruption check (PCM/sample domain — no MP3 padding ambiguity) ──
    // Sum every leaf's TRUE decoded length, then compare to the final file's
    // TRUE decoded length. A real concat segment drop shows here; MP3 framing
    // padding does not.
    let sumTrueMs = 0;
    for (const f of allLeaves) sumTrueMs += await trueMs(f);

    fs.mkdirSync(OUT_DIR, { recursive: true });
    const finalTmp = await concatFiles(tempDir, allLeaves, 'final.mp3');
    fs.copyFileSync(finalTmp, OUT_FILE);

    const finalTrue = await trueMs(OUT_FILE);
    const finalMeta = await durationMs(OUT_FILE);
    const drift = sumTrueMs - finalTrue;

    // Per-tier durations: TRUE length of the leaf slice for each tier.
    const tierKeys = ['0:1', '0:2', '0:3', '0:4', '0:5'];
    for (let k = 0; k < tierKeys.length; k++) {
      const start = tierStartIdx[tierKeys[k]];
      const end = k + 1 < tierKeys.length ? tierStartIdx[tierKeys[k + 1]] : allLeaves.length;
      let ms = 0;
      // slice excludes the inter-tier gapTier+marker that precedes the NEXT tier;
      // but the marker that BELONGS to this tier sits just before start, so
      // report the body from start (atoms) onward — markers reported separately.
      for (let j = start; j < end; j++) ms += await trueMs(allLeaves[j]);
      tierDurations[tierKeys[k]] = ms;
    }

    console.log('\n=== RESULT ===');
    console.log('output:', OUT_FILE);
    console.log('total duration (true PCM):', (finalTrue / 1000).toFixed(2), 's', `(${finalTrue} ms)`);
    console.log('total duration (container meta):', (finalMeta / 1000).toFixed(2), 's', `(${finalMeta} ms)`);
    console.log('sum of leaf parts (true PCM):', (sumTrueMs / 1000).toFixed(2), 's', `(${sumTrueMs} ms)`);
    console.log('drift:', drift, 'ms', Math.abs(drift) <= 60 ? '(OK — no segments dropped)' : '*** INVESTIGATE — possible segment drop ***');
    console.log('per-tier body durations (true PCM, ms):', JSON.stringify(tierDurations));
    console.log('leaf count:', allLeaves.length);
    console.log('azure TTS calls:', azureCalls);

    fs.writeFileSync(path.join('scripts/experiments/stage0-arc', 'summary.json'), JSON.stringify({
      output: OUT_FILE,
      totalTrueMs: finalTrue, totalMetaMs: finalMeta, sumOfLeafPartsTrueMs: sumTrueMs, driftMs: drift,
      tierBodyDurationsTrueMs: tierDurations, leafCount: allLeaves.length,
      azureCalls, castVoice: CAST_VOICE, knownVoice: KNOWN_VOICE,
      gaps: { GAP_TGT_MEANING, GAP_PAIR_REPEAT, GAP_BETWEEN_UNITS, GAP_BETWEEN_TIERS, GAP_PAIR_FUSION, GAP_WHOLE_FUSION },
      tierLog,
    }, null, 2));

    if (Math.abs(drift) > 60) {
      console.error('\n*** TRUE-PCM DRIFT EXCEEDS TOLERANCE — possible segment drop, investigate. ***');
      process.exit(2);
    }
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
})().catch(e => { console.error('FATAL:', e.stack || e.message); process.exit(1); });
