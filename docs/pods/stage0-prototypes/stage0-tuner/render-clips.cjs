/**
 * stage0-tuner/render-clips.cjs — render the atomic + intention audio pieces the
 * Stage-0 tuner panel needs, then emit a clips.json manifest of base64 data URIs
 * that gets inlined into the self-contained tuner HTML.
 *
 * READ-ONLY against the DB (SELECT only). No commits, no DB writes.
 *
 * MODEL (2026-06-13 upgrade): granularity tops out at the INTENTION, not the
 * whole row. The demo row is TWO distinct intentions / learnt chunk-units:
 *   I1 "I'm very well, thank you."   atoms: Táim go maith · go raibh maith agat
 *   I2 "Are you going to work?"      atoms: An bhfuil tú ag dul · chun oibre
 * Atoms fuse ONLY within their own intention; the two intentions are NEVER
 * fused into one whole-row unit, and there is NO whole-row tier.
 *
 * The top granularity unit = the INTENTION, played as its OWN NATURAL full
 * utterance take — NOT atoms concatenated (the founder heard the chunked "are
 * you going to work?" as markedly less natural than the whole utterance). So we
 * RENDER two NEW Colm clips of the full intentions and use those as the
 * intention-tier target audio. The old whole-row naturalTake + wholeTranslation
 * are DROPPED. Intention translations = the existing pair glosses.
 *
 * Voices (one consistent voice per side throughout):
 *   - known / gloss / translation / cue  = en-GB-SoniaNeural (Azure)
 *   - cast / target (every atom + every intention take) = ga-IE-ColmNeural (Azure)
 *
 * Reuse: clips already present in clips.json (by text+voice) are kept as-is —
 * only NEW clips (the two intention takes) hit Azure. Budget: ≤16 Azure calls;
 * this run makes 2.
 *
 * Every fresh TTS piece is edge-trimmed (silenceremove keeping 40ms each side)
 * and re-encoded through ffmpeg→lame (48k mono CBR) — same as the production
 * composite, so pieces splice cleanly when scheduled back-to-back in the browser.
 */

const path = require('path');
require('dotenv').config({ path: '.env' });

const fs = require('fs');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');

const ttsService = require(path.join(process.cwd(), 'services/tts-service.cjs'));
const audioProcessor = require(path.join(process.cwd(), 'services/audio-processor.cjs'));

// ── config ────────────────────────────────────────────────────────────────
const COURSE = 'gle_for_eng';
const POD_ID = `${COURSE}:pod-0`;
const GLOBAL_ORDER = 3;
const KNOWN_VOICE = 'en-GB-SoniaNeural'; // gloss / translation / cue
const OUT_DIR = path.join(process.cwd(), 'scripts/experiments/stage0-tuner');
const CLIPS_PATH = path.join(OUT_DIR, 'clips.json');

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

let azureCalls = 0;

function azureConfig(voiceName) {
  return {
    subscriptionKey: process.env.AZURE_SPEECH_KEY,
    region: process.env.AZURE_SPEECH_REGION || 'westeurope',
    voiceName,
    speed: 1.0,
  };
}

/** Render one TTS piece (Azure), edge-trimmed + re-encoded to 48k mono lame,
 *  returned as a base64 data URI. */
async function renderDataUri(tempDir, idx, text, voiceName) {
  const { audioBuffer } = await ttsService.generateWithRetry(text, 'azure', azureConfig(voiceName));
  azureCalls++;
  if (!audioBuffer || audioBuffer.length === 0) throw new Error(`empty TTS piece (${voiceName}: "${text.slice(0, 40)}")`);
  const rawFile = path.join(tempDir, `raw-${idx}.mp3`);
  fs.writeFileSync(rawFile, audioBuffer);
  const file = path.join(tempDir, `piece-${idx}.mp3`);
  await audioProcessor.ffmpegFilterToLameMp3(rawFile, file, { filterChain: EDGE_TRIM_FILTER });
  return `data:audio/mpeg;base64,${fs.readFileSync(file).toString('base64')}`;
}

// ── main ─────────────────────────────────────────────────────────────────────
(async () => {
  // Load the prior manifest so we can REUSE already-rendered clips (only the two
  // new intention takes need Azure). Index existing clips by text+voice.
  let prior = null;
  if (fs.existsSync(CLIPS_PATH)) prior = JSON.parse(fs.readFileSync(CLIPS_PATH, 'utf8'));
  const priorByKey = {};
  if (prior && prior.clips) {
    for (const k of Object.keys(prior.clips)) {
      const c = prior.clips[k];
      priorByKey[`${c.voice}|${c.text}`] = c.dataUri;
    }
  }
  const reuse = (text, voice) => priorByKey[`${voice}|${text}`] || null;

  // 1. Fetch the row (READ-ONLY) — for the atom list + intention split.
  const { data: row, error } = await supabase
    .from('listening_pod_sentences')
    .select('id, global_order, speaker, target_text, known_text, explainer_text, explainer_decomposition, target_audio_id, known_audio_id')
    .eq('pod_id', POD_ID)
    .eq('global_order', GLOBAL_ORDER)
    .single();
  if (error) throw new Error(`row: ${error.message}`);

  const CAST_VOICE = 'ga-IE-ColmNeural';
  console.log(`cast voice = ${CAST_VOICE}; known voice = ${KNOWN_VOICE}`);

  // Atoms, in order.
  const atoms = row.explainer_decomposition
    .filter(c => c && c.chunk_target && c.chunk_known && c.first_encounter !== false)
    .map(c => ({ target: c.chunk_target.trim(), known: c.chunk_known.trim() }));
  if (atoms.length !== 4) throw new Error(`expected 4 atoms, got ${atoms.length}`);
  console.log('atoms:', atoms.map(a => `${a.target} = ${a.known}`).join(' | '));

  // ── INTENTIONS — two distinct learnt chunk-units, each owning a slice of atoms.
  // Each intention has: its atom indices, its full natural target utterance
  // (rendered as ONE take), and its translation (= the pair gloss).
  const intentions = [
    {
      id: 'I1',
      atomIdx: [0, 1],
      targetText: 'Táim go maith, go raibh maith agat.',
      translation: "I'm very well, thank you",
    },
    {
      id: 'I2',
      atomIdx: [2, 3],
      targetText: 'An bhfuil tú ag dul chun oibre?',
      translation: 'are you going to work',
    },
  ];

  const cue = 'Breaking it down...';

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stage0-tuner-'));
  let idx = 0;
  const manifestClips = {};

  // helper: register a clip, reusing the prior dataUri when text+voice match.
  const add = async (name, text, voice, role) => {
    let uri = reuse(text, voice);
    let source = 'reused';
    if (!uri) { uri = await renderDataUri(tempDir, idx++, text, voice); source = 'rendered'; }
    manifestClips[name] = { text, voice, role, dataUri: uri };
    console.log(`  ${source.padEnd(8)} ${name} (${voice}) "${text}"`);
  };

  try {
    // cue (Sonia) — reused
    await add('cue', cue, KNOWN_VOICE, 'cue');

    // 4 atom targets (Colm) + 4 atom glosses (Sonia) — reused
    for (let i = 0; i < atoms.length; i++) {
      await add(`atomTarget${i}`, atoms[i].target, CAST_VOICE, 'target');
      await add(`atomGloss${i}`, atoms[i].known, KNOWN_VOICE, 'gloss');
    }

    // 2 intention translations (Sonia) — these ARE the existing pair glosses, reused
    for (let i = 0; i < intentions.length; i++) {
      await add(`intentionGloss${i}`, intentions[i].translation, KNOWN_VOICE, 'intentionGloss');
    }

    // 2 NEW intention natural takes (Colm) — the ONLY new renders this run.
    for (let i = 0; i < intentions.length; i++) {
      await add(`intentionTake${i}`, intentions[i].targetText, CAST_VOICE, 'intentionTake');
    }

    // ── manifest ────────────────────────────────────────────────────────────
    const manifest = {
      meta: {
        course: COURSE,
        pod: POD_ID,
        globalOrder: GLOBAL_ORDER,
        speaker: row.speaker,
        targetText: row.target_text.trim(),
        knownText: row.known_text.trim(),
        castVoice: CAST_VOICE,
        knownVoice: KNOWN_VOICE,
        renderedAt: new Date().toISOString(),
      },
      atoms: atoms.map(a => ({ target: a.target, known: a.known })),
      // intentions[] — the model spine: each owns its atom indices, a natural
      // take clip name, and a translation clip name.
      intentions: intentions.map((it, i) => ({
        id: it.id,
        atomIdx: it.atomIdx,
        targetText: it.targetText,
        translation: it.translation,
        takeClip: `intentionTake${i}`,
        glossClip: `intentionGloss${i}`,
      })),
      clips: manifestClips,
    };

    fs.writeFileSync(CLIPS_PATH, JSON.stringify(manifest, null, 2));

    const sizeBytes = fs.statSync(CLIPS_PATH).size;
    console.log('\n=== RESULT ===');
    console.log('clips.json:', CLIPS_PATH);
    console.log('size:', (sizeBytes / 1024).toFixed(1), 'KB');
    console.log('clip count:', Object.keys(manifestClips).length);
    console.log('azure TTS calls this run:', azureCalls);
    console.log('intentions:', intentions.map(it => `${it.id}[${it.atomIdx.join(',')}] "${it.targetText}"`).join(' | '));
    console.log('embedded clips:', Object.keys(manifestClips).join(', '));
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
})().catch(e => { console.error('FATAL:', e.stack || e.message); process.exit(1); });
