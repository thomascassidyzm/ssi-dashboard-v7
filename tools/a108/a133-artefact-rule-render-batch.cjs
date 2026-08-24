// A-133 — THE VALIDATION RENDER BATCH for the trailing-artefact rule.
//
// The 55-clip sweep proves the rule is surgical on takes we already have. It
// cannot prove the one thing the diagnosis named as UNTESTED, because no clip in
// that batch has the shape: a line that genuinely ends in a SHORT TAG AFTER A
// PAUSE — "..., toch?", "..., hè?", "..., oder?", "..., right?". To this rule a
// real tag and an artefact cluster look alike, and the difference has to be
// measured on fresh bytes, not argued.
//
// TWO SETS, one question each.
//
//   TAG   — does the rule EAT A REAL TAG? Eight languages, tags chosen for
//           shortness, each rendered twice: once with a comma before the tag
//           (what a course line actually looks like) and once with an ellipsis,
//           which makes the provider leave a LONGER pause and so pushes the case
//           deliberately into the rule's firing zone. If the comma version never
//           reaches a 200ms gap the test is weak, so the ellipsis version exists
//           to make sure the rule is genuinely exercised rather than dodged.
//           Verdict instrument is ASR on the AFTER clip, not arithmetic: the
//           2026-08-05 German amputation was invisible to every physical probe
//           and visible only to a transcript.
//
//   NOOR  — does the rule REMOVE THE CLICK on a fresh take? p1 and p3, the two
//           lines Tom failed, four independent renders each. Four, not one,
//           because A-133 already measured this voice's click as intermittent
//           per render (#948: 5 of 6 repeats). A single clean render would prove
//           nothing either way, and would be a dishonest way to claim a pass.
//
// EVIDENCE PER CLIP: raw / before / after, the guard's own decision, what the
// artefact rule dropped, the gap it measured, and an independent ASR read.
//   BEFORE = audioProcessor.normalizeAudioClean(raw)  — the old chain
//   AFTER  = phase8.masterAudio(raw)                  — the real wired chain,
//            one call, with the rule under test inside it. If the wiring is
//            wrong this tool renders untrimmed clips and says so.
//
// SPEND: ~30 short renders across xAI and Azure, single-figure cents, inside the
// ~$0.20 Tom approved for this validation batch. REUSE=1 re-masters existing
// raws with no spend. Touches no course_audio row, no pod, no S3 object, no DB.
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs'), path = require('path'), cp = require('child_process');
// phase8 starts its own listener on require; we only want the module.
process.env.PHASE8_NO_LISTEN = '1';
const ttsService = require('../../services/tts-service.cjs');
const audioProcessor = require('../../services/audio-processor.cjs');
const phase8 = require('../../services/phases/phase8-audio-v13.cjs');

const OUT = process.argv[2] || '/tmp/a133-artefact-validation';
const SR = 44100;

// ── The batch ────────────────────────────────────────────────────────────────
const TAG_LINES = [
  // Dutch first — it is the language of both failures and of the tag the
  // diagnosis named by name.
  { lang: 'nl', tag: 'toch', voice: { provider: 'xai', voiceId: '247783ebdd51', label: 'Noor — xAI, the clicker' },
    comma: 'Je komt morgen ook mee, toch?', ellipsis: 'Je komt morgen ook mee … toch?' },
  { lang: 'nl', tag: 'hè', voice: { provider: 'xai', voiceId: '58d27475085e', label: 'Femke — xAI, measured clean' },
    comma: 'Het is prachtig weer vandaag, hè?', ellipsis: 'Het is prachtig weer vandaag … hè?' },
  { lang: 'nl', tag: 'toch', voice: { provider: 'xai', voiceId: 'a13662ba951c', label: 'Thijs — xAI Dutch male' },
    comma: 'Dat had je me eerder kunnen vertellen, toch?', ellipsis: 'Dat had je me eerder kunnen vertellen … toch?' },
  { lang: 'nl', tag: 'hè', voice: { provider: 'azure', voiceName: 'nl-NL-FennaNeural', label: 'Fenna — Azure Dutch' },
    comma: 'We gaan straks samen eten, hè?', ellipsis: 'We gaan straks samen eten … hè?' },
  // English — "right?" is the shortest tag the known side ever uses.
  { lang: 'en', tag: 'right', voice: { provider: 'xai', voiceId: 'eve', label: 'Eve — xAI, 162,906 clips' },
    comma: "You've already finished the whole thing, right?", ellipsis: "You've already finished the whole thing … right?" },
  { lang: 'en', tag: 'right', voice: { provider: 'azure', voiceName: 'en-GB-SoniaNeural', label: 'Sonia — Azure, heaviest voice in the estate' },
    comma: 'We said we would meet at about six, right?', ellipsis: 'We said we would meet at about six … right?' },
  // German, French, Spanish, Welsh, Japanese — one each, all short tags.
  { lang: 'de', tag: 'oder', voice: { provider: 'azure', voiceName: 'de-DE-KatjaNeural', label: 'Katja — Azure, heaviest German voice' },
    comma: 'Das machen wir morgen zusammen, oder?', ellipsis: 'Das machen wir morgen zusammen … oder?' },
  { lang: 'de', tag: 'ne', voice: { provider: 'azure', voiceName: 'de-DE-ConradNeural', label: 'Conrad — Azure German male' },
    comma: 'Du wolltest doch heute noch anrufen, ne?', ellipsis: 'Du wolltest doch heute noch anrufen … ne?' },
  { lang: 'fr', tag: 'hein', voice: { provider: 'azure', voiceName: 'fr-FR-CelesteNeural', label: 'Céleste — Azure, heaviest metropolitan French voice' },
    comma: 'Tu vas quand même y aller, hein ?', ellipsis: 'Tu vas quand même y aller … hein ?' },
  { lang: 'es', tag: 'no', voice: { provider: 'azure', voiceName: 'es-ES-ElviraNeural', label: 'Elvira — Azure, heaviest Spanish voice' },
    comma: 'Vamos a llegar antes de las ocho, ¿no?', ellipsis: 'Vamos a llegar antes de las ocho … ¿no?' },
  { lang: 'cy', tag: 'yndê', voice: { provider: 'azure', voiceName: 'cy-GB-NiaNeural', label: 'Nia — Azure Welsh, the house language' },
    comma: "Mae'n well gen ti aros yma, yndê?", ellipsis: "Mae'n well gen ti aros yma … yndê?" },
  { lang: 'ja', tag: 'ね', voice: { provider: 'azure', voiceName: 'ja-JP-ShioriNeural', label: 'Shiori — Azure, heaviest Japanese voice' },
    comma: '明日の朝はちょっと早いですよ、ね？', ellipsis: '明日の朝はちょっと早いですよ … ね？' },
];

const NOOR = { provider: 'xai', voiceId: '247783ebdd51', label: 'Noor — xai_247783ebdd51, the voice Tom failed' };
const NOOR_LINES = [
  { p: 'p1', text: 'Ik wil graag een glas bitter, alstublieft.' },
  { p: 'p3', text: 'Kun je me vertellen waar het station is, alsjeblieft?' },
];

const SAMPLES = [];
for (const t of TAG_LINES) {
  for (const form of ['comma', 'ellipsis']) {
    SAMPLES.push({
      set: 'tag', key: `tag-${t.lang}-${t.voice.label.split(' ')[0].toLowerCase()}-${t.tag.replace(/[^a-z]/gi, '') || 'ne'}-${form}`,
      text: t[form], lang: t.lang, tag: t.tag, form, ...t.voice,
    });
  }
}
for (const l of NOOR_LINES) {
  for (let i = 1; i <= 4; i++) {
    SAMPLES.push({ set: 'noor', key: `noor-${l.p}-take${i}`, text: l.text, lang: 'nl', take: i, phrase: l.p, ...NOOR });
  }
}

// ── Rendering ────────────────────────────────────────────────────────────────
async function render(v) {
  if (v.provider === 'azure') {
    return (await ttsService.generateWithRetry(v.text, 'azure', {
      subscriptionKey: process.env.AZURE_SPEECH_KEY,
      region: process.env.AZURE_SPEECH_REGION,
      voiceName: v.voiceName,
    })).audioBuffer;
  }
  return (await ttsService.generateWithRetry(v.text, 'xai', {
    apiKey: process.env.XAI_API_KEY, voiceId: v.voiceId, language: v.lang,
  })).audioBuffer;
}

// ── Measurement, through the chain's OWN detector ────────────────────────────
const ap = audioProcessor;
function decode(file) {
  const pcm = cp.execSync(`ffmpeg -v quiet -i "${file}" -ac 1 -ar ${SR} -f s16le -`,
    { maxBuffer: 1 << 28, shell: '/bin/bash' });
  const n = pcm.length >> 1;
  const s = new Int16Array(n);
  for (let i = 0; i < n; i++) s[i] = pcm.readInt16LE(i * 2);
  let peak = 1;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(s[i]));
  return { s, n, peak };
}
function durationMs(file) { const { n } = decode(file); return Math.round(n / SR * 1000); }

const WHISPER = `${process.env.HOME}/.local/bin/whisper-cli`;
const MODEL = `${process.env.HOME}/.local/share/whisper-models/ggml-medium.bin`;
function transcribe(file, lang) {
  if (!fs.existsSync(WHISPER) || !fs.existsSync(MODEL)) return { gap: 'whisper-cli or model absent — ASR NOT run' };
  try {
    const wav = file.replace(/\.mp3$/, '.asr.wav');
    cp.execSync(`ffmpeg -v quiet -y -i "${file}" -ar 16000 -ac 1 "${wav}"`, { shell: '/bin/bash' });
    const out = cp.execSync(`"${WHISPER}" -m "${MODEL}" -f "${wav}" -l ${lang} -nt -np 2>/dev/null || true`,
      { maxBuffer: 1 << 26, shell: '/bin/bash' }).toString().trim();
    fs.unlinkSync(wav);
    return { text: out.replace(/\s+/g, ' ').trim() };
  } catch (e) { return { gap: `ASR failed (${e.message})` }; }
}

// Did the tag survive? Substring, case- and punctuation-insensitive, because the
// question is only ever "is the tag still audible in the file".
// Diacritics are stripped before comparing, and that is not a shortcut: on the
// first run whisper wrote Welsh "ynde" for "yndê" and this check called a
// perfectly intact tag LOST. A false amputation report is as bad as a missed one.
function tagSurvives(asr, tag) {
  if (asr.gap) return { ok: null, note: asr.gap };
  const norm = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[.,!?;:'"«»、。？！…]/g, ' ').replace(/\s+/g, ' ').trim();
  return { ok: norm(asr.text).includes(norm(tag)), heard: asr.text };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const results = [];

  for (const v of SAMPLES) {
    if (only && !only.includes(v.key)) continue;
    const dir = path.join(OUT, v.key);
    fs.mkdirSync(dir, { recursive: true });
    const rawFile = path.join(dir, 'raw.mp3');
    try {
      if (process.env.REUSE === '1' && fs.existsSync(rawFile)) console.log(`[reuse] ${v.key}`);
      else fs.writeFileSync(rawFile, await render(v));

      const beforeFile = path.join(dir, `${v.key}-before.mp3`);
      await audioProcessor.normalizeAudioClean(rawFile, beforeFile, -16.0);

      const afterFile = path.join(dir, `${v.key}-after.mp3`);
      const mastered = await phase8.masterAudio(fs.readFileSync(rawFile), v.text);
      fs.writeFileSync(afterFile, mastered.buffer);

      // The guard's own decision, asked of the same function the chain calls.
      const planPath = path.join(dir, 'plan.wav');
      const plan = await audioProcessor.trimToEndOfSpeech(rawFile, planPath);
      if (fs.existsSync(planPath)) fs.unlinkSync(planPath);

      // Did the rule fire, and on what gap? Read from the chain's own detector.
      const { s, n, peak } = decode(rawFile);
      const env = ap.eosEnvelope ? ap.eosEnvelope(s, n, peak) : null;
      const detail = ap.endOfSpeechWithArtefacts && env ? ap.endOfSpeechWithArtefacts(env) : null;
      const plainEos = ap.endOfSpeech && env ? ap.endOfSpeech(env) : null;
      const fired = !!(detail && detail.artefactStart !== null);
      const gapMs = fired ? Math.round((detail.artefactStart - detail.eos) / SR * 1000) : null;

      const asr = transcribe(afterFile, v.lang);
      const row = {
        ...v,
        rawMs: durationMs(rawFile), beforeMs: durationMs(beforeFile), afterMs: durationMs(afterFile),
        plainEosMs: plainEos === null ? null : Math.round(plainEos / SR * 1000),
        ruleFired: fired, ruleEosMs: detail && detail.eos !== null ? Math.round(detail.eos / SR * 1000) : null,
        gapToClusterMs: gapMs,
        droppedEvents: fired ? detail.dropped.map(e => ({
          startMs: Math.round(e.start / SR * 1000), aboveMs: e.aboveMs, peakDb: +e.peakDb.toFixed(1), kind: e.kind,
        })) : [],
        guard: { refused: plan.refused, removedMs: plan.removedMs, trimmed: plan.trimmed },
        asr: asr.text || null, asrGap: asr.gap || null,
        tagCheck: v.set === 'tag' ? tagSurvives(asr, v.tag) : null,
      };
      results.push(row);
      console.log(`${v.key.padEnd(34)} raw ${String(row.rawMs).padStart(5)} -> after ${String(row.afterMs).padStart(5)}ms` +
        ` | rule ${fired ? `FIRED gap ${gapMs}ms, dropped ${row.droppedEvents.map(d => `${d.aboveMs}ms`).join('+') || '-'}` : 'did not fire'}` +
        (row.tagCheck ? ` | tag "${v.tag}" ${row.tagCheck.ok === null ? '?' : row.tagCheck.ok ? 'SURVIVES' : '*** LOST ***'}` : ''));
    } catch (e) {
      results.push({ ...v, error: e.message });
      console.log(`${v.key.padEnd(34)} ERROR ${e.message}`);
    }
  }

  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 2));

  const tags = results.filter(r => r.set === 'tag' && !r.error);
  const lost = tags.filter(r => r.tagCheck && r.tagCheck.ok === false);
  const firedOnTag = tags.filter(r => r.ruleFired);
  console.log(`\nTAG SET: ${tags.length} clips, rule fired on ${firedOnTag.length}, tags lost: ${lost.length}` +
    (lost.length ? ' — ' + lost.map(r => r.key).join(', ') : ''));
  const noor = results.filter(r => r.set === 'noor' && !r.error);
  console.log(`NOOR SET: ${noor.length} takes, rule fired on ${noor.filter(r => r.ruleFired).length}`);
  console.log(`\nwrote ${path.join(OUT, 'results.json')}`);
}

main().catch(e => { console.error(e); process.exit(1); });
