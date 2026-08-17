// A-131 blind raw-TTS test — 10 sentences straight from the provider APIs, with
// ZERO post-processing. No compressor, no limiter, no loudness normalisation, no
// resample, no trim, no fades, no de-click. The bytes written to S3 are byte-for-byte
// the bytes the provider returned; ffmpeg is never invoked and services/audio-processor
// is never loaded.
//
// The providers are called DIRECTLY here rather than through services/tts-service.cjs,
// because that module applies input-side transforms of its own (short-word hints,
// ellipsis->SSML <break> rewriting) that would make "raw" a lie.
//
// Scratch only: staging bucket under a throwaway prefix, no DB write, no live clip
// touched, nothing enters the render pipeline.
//
// Spend: 10 short renders across xAI / Azure / ElevenLabs ~ pennies. Pre-authorised
// as an A-131 verification render (brief, 2026-08-17).
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');

const OUT_DIR = process.env.OUT_DIR || '/tmp/a131-blind';
const BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';
const REGION = process.env.AWS_REGION || 'eu-west-1';
// Public read on this bucket is granted to `mastered/*` only (bucket policy, verified
// 2026-08-17), so a listening prefix has to live under it — same convention as the
// earlier naked-2026-08-05 / voicelab listening sets. These are scratch objects in
// their own folder; no live clip key is anywhere near them.
const PREFIX = 'mastered/blind-raw-a131-2026-08-17';

// The cast. Mixed providers, mixed voices, mixed languages — every one of them a
// voice or provider actually in use on the estate, so the test can separate
// "our chain clicks" from "this provider clicks at source".
const CAST = [
  { provider: 'xai',        voice: 'leo',                    lang: 'en',    text: "I'd like a glass of water, please." },
  { provider: 'azure',      voice: 'en-GB-SoniaNeural',      lang: 'en-GB', text: 'The train leaves in about ten minutes.' },
  { provider: 'xai',        voice: 'eve',                    lang: 'es',    text: '¿Puedes ayudarme con esto, por favor?' },
  { provider: 'xai',        voice: '247783ebdd51',           lang: 'nl',    text: 'Ik wil graag een glas bitter, alstublieft.' },
  { provider: 'azure',      voice: 'af-ZA-AdriNeural',       lang: 'af-ZA', text: 'Ek wil graag more met jou praat.' },
  { provider: 'xai',        voice: 'rex',                    lang: 'fr',    text: "Je voudrais un café, s'il vous plaît." },
  { provider: 'xai',        voice: 'bedd6226',               lang: 'en',    text: 'That was a really good idea, I think.' },
  { provider: 'azure',      voice: 'ar-EG-SalmaNeural',      lang: 'ar-EG', text: 'من فضلك، هل يمكنك مساعدتي؟' },
  { provider: 'xai',        voice: 'sal',                    lang: 'de',    text: 'Ich möchte gern einen Kaffee, bitte.' },
  // Was an ElevenLabs slot; the ELEVENLABS_API_KEY in .env is a key *ID*, not a key
  // ("API keys start with 'sk_'"), so that provider could not be reached at all
  // (2026-08-17). Replaced with a second, male Azure voice that is in live use, which
  // keeps the ten-slot set and the provider contrast intact.
  { provider: 'azure',      voice: 'en-GB-RyanNeural',       lang: 'en-GB', text: 'We can talk about it tomorrow if you like.' },
];

// Deterministic shuffle (no Math.random — the key must be reproducible from this file).
// Fixed permutation, hand-picked so no two adjacent slots share a provider run.
const ORDER = [6, 1, 9, 3, 7, 0, 4, 8, 2, 5];

async function renderXai({ voice, lang, text }) {
  const res = await fetch('https://api.x.ai/v1/tts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.XAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voice_id: voice,
      language: lang,
      output_format: { codec: 'mp3', sample_rate: 24000, bit_rate: 128000 },
    }),
  });
  if (!res.ok) throw new Error(`xAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function renderAzure({ voice, lang, text }) {
  const key = process.env.AZURE_SPEECH_KEY || process.env.AZURE_TTS_KEY;
  const region = process.env.AZURE_SPEECH_REGION || process.env.AZURE_TTS_REGION;
  const esc = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Minimal SSML: the REST endpoint requires a document, so this is the smallest one
  // that names a voice. No prosody, no breaks, no text rewriting.
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}"><voice name="${voice}">${esc}</voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-160kbitrate-mono-mp3',
      'User-Agent': 'ssi-a131-blind',
    },
    body: ssml,
  });
  if (!res.ok) throw new Error(`Azure ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

async function renderElevenLabs({ voice, text }) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

const RENDERERS = { xai: renderXai, azure: renderAzure, elevenlabs: renderElevenLabs };

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: REGION,
  });

  const key = [];
  for (let slot = 1; slot <= ORDER.length; slot++) {
    const item = CAST[ORDER[slot - 1]];
    const nn = String(slot).padStart(2, '0');
    const local = path.join(OUT_DIR, `${nn}.mp3`);
    let buf;
    try {
      // Re-run safety: a slot already rendered is never re-rendered (no repeat spend,
      // and the published bytes stay the ones the answer key describes).
      buf = fs.existsSync(local) ? fs.readFileSync(local) : await RENDERERS[item.provider](item);
    } catch (e) {
      console.error(`slot ${nn} FAILED (${item.provider}/${item.voice}): ${e.message}`);
      key.push({ slot, ...item, error: e.message });
      continue;
    }
    fs.writeFileSync(local, buf);           // raw bytes, untouched
    const s3key = `${PREFIX}/${nn}.mp3`;
    await s3.putObject({
      Bucket: BUCKET, Key: s3key, Body: buf,
      ContentType: 'audio/mpeg', CacheControl: 'public, max-age=3600',
    }).promise();
    const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${s3key}`;
    console.log(`slot ${nn}: ${item.provider}/${item.voice} [${item.lang}] ${buf.length}B -> ${url}`);
    key.push({ slot, ...item, bytes: buf.length, url });
  }

  const keyPath = path.join(OUT_DIR, 'ANSWER-KEY.json');
  fs.writeFileSync(keyPath, JSON.stringify(key, null, 2));
  console.log('\nanswer key (NOT for publication):', keyPath);
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
