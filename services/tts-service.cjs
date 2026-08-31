/**
 * TTS Service Integration
 *
 * Supports multiple TTS providers:
 * - ElevenLabs (multilingual, high quality)
 * - Azure Speech Services (Microsoft TTS)
 * - xAI TTS (cheap, 5 voices, 20+ languages, expressive markup)
 *
 * Usage:
 *   const tts = require('./services/tts-service.cjs');
 *   const audioBuffer = await tts.generate('Ciao', 'elevenlabs', config);
 */

const fetch = require('node-fetch');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { buildAzureSSMLBody } = require('./shared/ellipsis-ssml.cjs');
const { isHumanVoiceCourse } = require('./shared/human-voice-courses.cjs');
const { assertSelectableProvider } = require('./shared/tts-provider-policy.cjs');
const consentGate = require('./shared/voice-consent-gate.cjs');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const { applyRegenerationVariation, applyShortWordHint } = require('./azure-tts-service.cjs');

// Shared keep-alive agent for REST TTS providers (xAI, ElevenLabs). Without it
// every clip opens a fresh TLS connection — a 14k-clip run churns 14k+
// handshakes through the router's NAT table, which is what produced the
// evening-long ECONNRESET/socket-hang-up windows of 2026-06-07 (provider-
// agnostic; Azure REST hit the same). A handful of pooled sockets carries the
// whole run instead.
const ttsKeepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 32,
  maxFreeSockets: 8,
});

// Hard abort for REST TTS fetches. A caller-side Promise.race timeout (phase8's
// 120s withTimeout) abandons the promise but the fetch keeps running — during
// the eng_for_guj passes of 2026-07-25/26, hours of mass 120s timeouts (plus
// their retries) accumulated zombie in-flight xAI requests until the machine
// kernel-panicked (watchdogd starvation, 3 panics, each mid-guj). AbortSignal
// actually tears the request down and frees the socket and buffers.
const TTS_FETCH_TIMEOUT_MS = Number(process.env.TTS_FETCH_TIMEOUT_MS || 90_000);

// Bounded xAI concurrency: phase8 fans out at up to 20 clips, which xAI's
// /v1/tts answers by queueing until requests blow the timeout (the guj passes
// ran at ~50%+ "Timed out after 120s"). A few at a time keeps each request
// inside the timeout instead of timing out en masse and re-stampeding.
const XAI_MAX_CONCURRENT = Number(process.env.XAI_TTS_CONCURRENCY || 4);
let xaiActive = 0;
const xaiQueue = [];
function xaiSlotAcquire() {
  if (xaiActive < XAI_MAX_CONCURRENT) { xaiActive++; return Promise.resolve(); }
  return new Promise(resolve => xaiQueue.push(resolve));
}
function xaiRelease() {
  const next = xaiQueue.shift();
  if (next) next(); else xaiActive--;
}

// ---- Empty-response gate ---------------------------------------------------
// The 2026-08-03 French batch wrote 567 target2 + ~75 known clips that are
// 2,016-byte MP3 stubs of pure silence (144/168/192 ms = 6/7/8 MP3 frames, the
// encoder's minimum output). Cause: on a long, high-volume xAI run the provider
// degrades and starts answering with empty-or-near-empty HTTP 200 bodies —
// measured stub rate inside that one run climbed 0.11% → 5.26% and fell back to
// 0.00% as the run tailed off, while Azure days of 20k+ clips are spotless.
//
// `response.ok` was the ONLY gate, so an empty 200 sailed through; the mastering
// chain (denoise → compress → limit → fade + silence pad) then LAUNDERED it into
// a well-formed playable MP3, and duration_ms was computed from that file, so the
// DB row and the object agreed perfectly and every consistency check passed.
// Nothing in the pipeline had ever asked "is there speech in this clip".
//
// This gate asks the cheapest possible version of that question at the one place
// it costs nothing: the response boundary, before mastering can launder it.
//
// The floor is expressed in MILLISECONDS of audio, not bytes, because the
// providers use very different bitrates (xAI 128 kbps = 16,000 B/s; Azure's
// Audio16Khz32KBitRateMonoMp3 = 4,000 B/s). One byte number would be either
// useless on xAI or lethal to legitimate short Azure clips.
//
// 250 ms is picked from measurement, not taste. Real xAI/leo French renders of
// the shortest words in the course: "tout" 7,296 B (456 ms), "ma" 7,680 B
// (480 ms), "oui" 9,216 B (576 ms). The live DB agrees — across fra/deu the
// legitimate duration distribution starts around 480 ms with nothing between the
// stub band (≤192 ms) and it. So 250 ms sits comfortably above every known stub
// and comfortably below every legitimate clip: on xAI that is a 4,000-byte floor
// versus a 2,016-byte artefact and a 7,296-byte real clip.
const TTS_MIN_AUDIO_MS = Number(process.env.TTS_MIN_AUDIO_MS || 250);

/**
 * Reject a TTS response too small to contain speech.
 *
 * Throws with a "(503)" marker so isRetriableTtsError classifies it as a
 * transient server-side failure: generateWithRetry then re-rolls it inside the
 * existing retry budget, exactly like the phonology gate, and the final failure
 * throws so the caller never persists a silent clip.
 *
 * @param {Buffer} buffer - the raw provider response
 * @param {object} meta - { provider, bytesPerSecond, text, voiceId }
 */
function assertAudibleResponse(buffer, { provider, bytesPerSecond, text, voiceId }) {
  const bytes = buffer ? buffer.length : 0;
  const floorBytes = Math.round((TTS_MIN_AUDIO_MS / 1000) * bytesPerSecond);
  if (bytes >= floorBytes) return;
  throw new Error(
    `TTS empty-response gate (503): ${provider} returned ${bytes} bytes, ` +
    `below the ${floorBytes}-byte floor (${TTS_MIN_AUDIO_MS} ms at ${bytesPerSecond} B/s) ` +
    `for voice=${voiceId || '?'} text="${String(text || '').slice(0, 40)}" — ` +
    `provider returned silence, not a render`
  );
}

// ---- xAI adaptive pacing ---------------------------------------------------
// The concurrency cap above bounds INSTANTANEOUS load. The 08-03 signature was
// different: degradation climbing with SUSTAINED run length and recovering when
// the run tailed off. A concurrency cap alone cannot see that, so we watch the
// gate's own failure rate and slow down exactly when the provider is misbehaving
// — free on a healthy run, and the only signal we have, since we cannot see
// xAI's side.
//
// We stay on xAI deliberately (Tom 2026-08-04: the cost and the voices are worth
// it). The job of this code is to make xAI's bad minutes survivable, NEVER to
// route around xAI.
const XAI_STUB_WINDOW = Number(process.env.XAI_STUB_WINDOW || 50);
const XAI_STUB_RATE_LIMIT = Number(process.env.XAI_STUB_RATE_LIMIT || 0.04);
const XAI_COOLDOWN_MS = Number(process.env.XAI_COOLDOWN_MS || 60_000);
const XAI_MIN_GAP_MS = Number(process.env.XAI_MIN_GAP_MS || 0);

const xaiOutcomes = [];          // rolling window of booleans: true = audible
let xaiCooldownUntil = 0;
let xaiNextSlotAt = 0;
const xaiHealth = { requests: 0, stubs: 0, cooldowns: 0 };

/** Record one xAI response outcome and trip a cooldown if the stub rate spikes. */
function recordXaiOutcome(audible) {
  xaiHealth.requests++;
  if (!audible) xaiHealth.stubs++;
  xaiOutcomes.push(!!audible);
  if (xaiOutcomes.length > XAI_STUB_WINDOW) xaiOutcomes.shift();
  if (xaiOutcomes.length < XAI_STUB_WINDOW) return;

  const stubs = xaiOutcomes.filter(ok => !ok).length;
  const rate = stubs / xaiOutcomes.length;
  if (rate < XAI_STUB_RATE_LIMIT || Date.now() < xaiCooldownUntil) return;

  xaiCooldownUntil = Date.now() + XAI_COOLDOWN_MS;
  xaiHealth.cooldowns++;
  // Clear the window so the same spike can't re-trip the cooldown immediately —
  // the next window is measured on post-cooldown behaviour.
  xaiOutcomes.length = 0;
  console.warn(
    `[xAI TTS] stub rate ${(rate * 100).toFixed(1)}% over the last ${XAI_STUB_WINDOW} responses ` +
    `— provider is degrading. Pausing xAI renders for ${Math.round(XAI_COOLDOWN_MS / 1000)}s.`
  );
}

/** Health counters for a batch report. */
function getXaiHealth() {
  return { ...xaiHealth, stubRate: xaiHealth.requests ? xaiHealth.stubs / xaiHealth.requests : 0 };
}

/**
 * Acquire an xAI request slot, honouring the concurrency cap, the optional
 * inter-request gap, and any active degradation cooldown.
 *
 * The waits happen while HOLDING the slot, which is the point: during a cooldown
 * every slot sleeps, so the whole run pauses rather than queueing more load onto
 * a provider that is already failing.
 */
async function xaiAcquire() {
  await xaiSlotAcquire();
  for (;;) {
    const now = Date.now();
    const waitUntil = Math.max(xaiCooldownUntil, XAI_MIN_GAP_MS ? xaiNextSlotAt : 0);
    if (waitUntil <= now) {
      if (XAI_MIN_GAP_MS) xaiNextSlotAt = now + XAI_MIN_GAP_MS;
      return;
    }
    await new Promise(resolve => setTimeout(resolve, waitUntil - now));
  }
}

// Child voices are NEVER allowed (Tom 2026-07-24: no kids' voices, ever — a
// child voice reached staging on alcohol phrases via a stale pod cast). Voice
// params come from DB state (pod casts, voice_config) that can outlive pool
// fixes, so the block lives here, at the one chokepoint every provider path
// passes through. The "(403)" makes isRetriableTtsError treat it as a client
// error — fail fast, never retry.
const CHILD_VOICE_IDS = new Set([
  'en-GB-MaisieNeural',
  'en-US-AnaNeural',
  'de-DE-GiselaNeural',
  'fr-FR-EloiseNeural',
  'zh-CN-XiaoshuangNeural',
  'zh-CN-XiaoyouNeural',
]);

function assertNotChildVoice(config) {
  const requested = String(config?.voiceName || config?.voiceId || '').replace(/^azure_/, '');
  if (CHILD_VOICE_IDS.has(requested)) {
    throw new Error(`Child voice blocked (403): ${requested} — kids' voices are never allowed. Fix the caller's voice params (pod cast / voice_config).`);
  }
}

// Human-voiced courses are NEVER synthesised (Tom 2026-07-25: the Welsh courses
// cym_n_for_eng / cym_s_for_eng are human-recorded only — a synthesised Welsh
// clip reaching a learner is a defect). Same defence pattern as the child-voice
// block: the guard lives here at the one chokepoint every provider path passes
// through, and the "(403)" makes isRetriableTtsError treat it as a client error
// (fail fast, never retry). Callers thread the course code via config.courseCode
// (see services/shared/human-voice-courses.cjs); pipeline entry points skip
// these courses up front, so this is defence-in-depth, not the first line.
/**
 * NO CONSENT, NO SPEECH (Tom's ruling, 2026-08-31).
 *
 *   "we are never going to use a voice without consent"
 *
 * Same defence pattern as the two guards above and here for the same reason:
 * this is the one chokepoint every provider path passes through — phase8, the
 * pod path, the Voice Lab runner, the tools, production-api — so one line here
 * refuses an unconsented voice everywhere at once, rather than five copies of a
 * check that drift apart. Fails as a client error ("(403)"), so
 * isRetriableTtsError does not retry it: a missing consent record is not a
 * transient failure, and retrying it eight times helps nobody.
 *
 * ONLY WHERE THE QUESTION IS REAL. A vendor's stock voice has no person behind
 * it to ask; the gate applies to clones this estate made, to human recordists,
 * and to any voice somebody has already recorded a consent state for. See
 * services/shared/voice-consent-gate.cjs.
 *
 * The voice id is read from the same place every provider branch reads it, so
 * there is no branch where the guard sees a different voice from the one that
 * ends up speaking.
 */
async function assertConsentedVoice(config, provider = null) {
  const voiceId = config?.voiceId || config?.voice_id || config?.voiceName;
  if (!voiceId) return;
  // ONE NARROW EXCEPTION (Tom, 2026-08-31): the person hearing their own clone
  // so they can confirm or reject it. Without it the confirmation step
  // deadlocks — the clone cannot be rendered until it is confirmed, and cannot
  // be confirmed until it has been heard. The flag does not weaken anything on
  // its own: assertHearableForDecision opens only for a voice that has a
  // recorded declaration and is waiting to be heard, and refuses a refused,
  // withdrawn or never-declared voice exactly as the ordinary door does. Set by
  // one caller: the Voice Lab's confirmation audition.
  if (config?.consentAudition) {
    await consentGate.assertHearableForDecision(String(voiceId), {
      provider: provider || config?.provider || null,
      context: 'clone confirmation audition',
    });
    return;
  }
  await consentGate.assertConsentedForRender(String(voiceId), {
    provider: provider || config?.provider || null,
    context: 'tts-service.generate',
  });
}

function assertNotHumanVoiceCourse(config) {
  const courseCode = config?.courseCode;
  if (courseCode && isHumanVoiceCourse(courseCode)) {
    throw new Error(`Human-voice course blocked (403): ${courseCode} is human-voiced only — no TTS may ever be generated (Tom's ruling 2026-07-25). Skip this course at the pipeline entry point.`);
  }
}

/**
 * Generate speech using ElevenLabs API
 * @param {string} text - Text to synthesize
 * @param {object} config - ElevenLabs configuration
 * @param {string} config.apiKey - ElevenLabs API key
 * @param {string} config.voiceId - Voice ID to use
 * @param {number} config.stability - Voice stability (0-1)
 * @param {number} config.similarityBoost - Similarity boost (0-1)
 * @param {number} config.speed - Speech speed multiplier (0.25-4.0)
 * @returns {Promise<{audioBuffer: Buffer, wordBoundaries: Array|null}>} Audio data + word boundary timing
 */
async function generateElevenLabs(text, config) {
  const {
    apiKey,
    voiceId,
    stability = 0.5,
    similarityBoost = 0.75,
    speed = 1.0
  } = config;

  if (!apiKey) {
    throw new Error('ElevenLabs API key is required');
  }

  if (!voiceId) {
    throw new Error('Voice ID is required');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: 'POST',
    agent: ttsKeepAliveAgent,
    signal: AbortSignal.timeout(TTS_FETCH_TIMEOUT_MS),
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: stability,
        similarity_boost: similarityBoost,
        style: 0,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBuffer = Buffer.from(arrayBuffer);
  // eleven_multilingual_v2 default output is 128 kbps MP3 → 16,000 B/s.
  assertAudibleResponse(audioBuffer, {
    provider: 'elevenlabs', bytesPerSecond: 16000, text, voiceId,
  });
  return { audioBuffer, wordBoundaries: null };
}

/**
 * Generate speech using Azure Speech Services
 * @param {string} text - Text to synthesize
 * @param {object} config - Azure configuration
 * @param {string} config.subscriptionKey - Azure Speech subscription key
 * @param {string} config.region - Azure region (e.g., 'eastus')
 * @param {string} config.voiceName - Voice name (e.g., 'it-IT-IsabellaNeural')
 * @param {number} config.speed - Speech speed multiplier (0.5-2.0)
 * @param {number} config.regenerationAttempt - For flagged regeneration (0 = original)
 * @returns {Promise<{audioBuffer: Buffer, wordBoundaries: Array|null}>} Audio data + word boundary timing
 */
async function generateAzure(text, config) {
  const {
    subscriptionKey,
    region,
    voiceName,
    speed = 1.0,
    regenerationAttempt = 0
  } = config;

  // Apply variation for regeneration (Azure is deterministic), then apply
  // the language-aware short-word hint so single chars / very short words
  // get pronounced as words instead of letter names. Both transforms are
  // TTS-input-only and are NEVER persisted.
  let ttsText = applyRegenerationVariation(text, regenerationAttempt);
  ttsText = applyShortWordHint(ttsText);

  if (!subscriptionKey) {
    throw new Error('Azure subscription key is required');
  }

  if (!region) {
    throw new Error('Azure region is required');
  }

  if (!voiceName) {
    throw new Error('Azure voice name is required');
  }

  return new Promise((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    // Capture word boundary events for component audio splicing
    const wordBoundaries = [];
    synthesizer.wordBoundary = (_, e) => {
      // audioOffset is in 100ns ticks; convert to milliseconds
      wordBoundaries.push({
        text: e.text,
        offset: Math.round(e.audioOffset / 10000),
        duration: Math.round(e.duration / 10000)
      });
    };

    // Build SSML with voice and rate settings
    const speedPercent = Math.round((speed - 1) * 100);
    const rateString = speedPercent >= 0 ? `+${speedPercent}%` : `${speedPercent}%`;

    // Inline-SSML passthrough + ellipsis→<break>: see buildAzureSSMLBody.
    const ssmlBody = buildAzureSSMLBody(ttsText);

    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voiceName}">
          <prosody rate="${rateString}">
            ${ssmlBody}
          </prosody>
        </voice>
      </speak>
    `.trim();

    synthesizer.speakSsmlAsync(
      ssml,
      result => {
        synthesizer.close();

        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          const audioBuffer = Buffer.from(result.audioData);
          // Azure has never produced the empty-200 stub (its 20k-clip days are
          // spotless) and the SDK's own reason check is a real gate — but a
          // "completed" synthesis carrying no audio would launder exactly the
          // same way through mastering, so it gets the same floor.
          // Audio16Khz32KBitRateMonoMp3 → 4,000 B/s.
          try {
            assertAudibleResponse(audioBuffer, {
              provider: 'azure', bytesPerSecond: 4000, text: ttsText, voiceId: voiceName,
            });
          } catch (gateErr) {
            return reject(gateErr);
          }
          resolve({ audioBuffer, wordBoundaries });
        } else {
          reject(new Error(`Azure TTS failed: ${result.errorDetails}`));
        }
      },
      error => {
        synthesizer.close();
        reject(new Error(`Azure TTS error: ${error}`));
      }
    );
  });
}

/**
 * Generate speech using xAI TTS
 * @param {string} text - Text to synthesize (may include expressive markup like [laugh], <whisper>)
 * @param {object} config - xAI configuration
 * @param {string} config.apiKey - xAI API key
 * @param {string} config.voiceId - Preset voice id ('eve' | 'ara' | 'leo' | 'rex' | 'sal', case-insensitive) OR a custom cloned voice_id (e.g. Tom's clones 'gfzdpspr5fdp', 'bedd6226') — xAI accepts both, this is not a fixed enum
 * @param {string} config.language - BCP-47 language code (e.g., 'es', 'en', 'pt-BR', 'ar-EG', 'auto')
 * @param {number} config.speed - Speech speed multiplier (applied client-side via SSML-like wrapping if supported)
 * @param {string} config.codec - Output codec: 'mp3' (default) | 'wav' | 'pcm' | 'mulaw' | 'alaw'
 * @param {number} config.sampleRate - Sample rate in Hz (default: 24000)
 * @param {number} config.bitRate - Bit rate in bps (default: 128000)
 * @returns {Promise<{audioBuffer: Buffer, wordBoundaries: Array|null}>} Audio data. Word boundaries are null — xAI does not provide them.
 */
async function generateXai(text, config) {
  const {
    apiKey,
    voiceId = 'eve',
    codec = 'mp3',
    sampleRate = 24000,
    bitRate = 128000
  } = config;

  if (!apiKey) {
    throw new Error('xAI API key is required');
  }

  if (text.length > 15000) {
    throw new Error(`xAI TTS REST request limited to 15000 characters; got ${text.length}. Use streaming endpoint for longer content.`);
  }

  // A MISSING language is a HARD FAIL, never a warn. The multilingual voices are
  // English-dominant and unsteered they read cross-language words with English
  // phonology ('come stai' → English 'come'; ita pilot 2026-07-10), so a render
  // that forgot to say which language it wanted is a defect, not a default. It
  // used to default to 'auto' and log a warning nobody read — which is how a
  // silently-wrong clip could reach a learner.
  //
  // An EXPLICIT 'auto' is still allowed: it is deliberate, Tom-validated tuning
  // for pod explainers (tools/pod-voice-coverage.cjs resolveExplainerLanguage,
  // 2026-06-07), where the cue is chosen, not forgotten. Warned, not failed.
  if (!config.language) {
    throw new Error(`xAI TTS requires an explicit BCP-47 language (voice ${voiceId}, text: "${String(text).slice(0, 40)}") — pass 'auto' deliberately if that is really what you want`);
  }
  const language = config.language;
  if (language === 'auto') {
    console.warn(`[xAI TTS] explicit language='auto' for voice ${voiceId} — English phonology is possible on cross-language text (text: "${String(text).slice(0, 40)}")`);
  }

  // Note: xAI currently does not document a speed parameter on the /v1/tts endpoint.
  // Speed control is handled downstream via audio-processing (masterAudio stage).
  // Expressive markup ([laugh], [sigh], <whisper>, <emphasis>) passes through text as-is.

  const body = {
    text,
    voice_id: voiceId,
    language,
    output_format: {
      codec,
      sample_rate: sampleRate,
      bit_rate: bitRate
    }
  };

  await xaiAcquire();
  try {
    const response = await fetch('https://api.x.ai/v1/tts', {
      method: 'POST',
      agent: ttsKeepAliveAgent,
      signal: AbortSignal.timeout(TTS_FETCH_TIMEOUT_MS),
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`xAI TTS API error (${response.status}): ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    // Bit rate is ours to set (default 128 kbps), so the floor tracks it rather
    // than assuming a constant.
    const bytesPerSecond = Math.max(1, Math.round(bitRate / 8));
    const audible = audioBuffer.length >= Math.round((TTS_MIN_AUDIO_MS / 1000) * bytesPerSecond);
    recordXaiOutcome(audible);
    assertAudibleResponse(audioBuffer, {
      provider: 'xai', bytesPerSecond, text, voiceId,
    });
    return { audioBuffer, wordBoundaries: null };
  } finally {
    xaiRelease();
  }
}


/**
 * Cartesia's default speed. Pinned, not left unset, and that is a measurement
 * rather than a preference: Cartesia carries no seed parameter and wanders
 * take-to-take on short text — median spread ~26% silence-trimmed, worst case
 * 104% on a three-word LEGO, which is exactly the length the courses drill at.
 * Sending an explicit speed takes the worst case from 104% to 38% for free
 * (determinism run, 2026-08-27). A caller may override per voice; nobody gets
 * to leave it unset by accident.
 */
const CARTESIA_DEFAULT_SPEED = 1.0;

/** Cartesia pins its API to a date, not a semver. */
const CARTESIA_VERSION = '2026-08-14';

/**
 * The model, pinned. `sonic-3.6` went generally available 2026-08-27 and Tom's
 * ear picked it the same day off the eleven-variant listening grid: "sonic-3.6
 * is clearly the better model". It is also Cartesia's own API default now, so
 * this pin is agreement rather than divergence — but it stays an explicit pin,
 * because a floating default is a voice that can change under a course without
 * anyone asking for it.
 *
 * It measures better where the courses live: across four Pod 1 lines, sonic-3
 * came off the API with a 10 dB loudness spread (short line at −30.8 LUFS),
 * sonic-3.6 with a 2 dB one (−21.6). Our mastering therefore lifts ~2 dB
 * instead of up to 13 dB, and that 13 dB lift is what was amplifying room tone
 * and sibilance into the Pod 1 "hissy" defect.
 */
const CARTESIA_MODEL = 'sonic-3.6';

/**
 * Output format, deliberately SMALLER than Cartesia's 44.1 kHz default.
 *
 * Tom's ruling, 2026-08-27, after listening to the full-quality and compressed
 * renders of the same model side by side: "there is ZERO audible difference".
 * If the ear cannot hear it, the smaller file wins on storage, bandwidth and
 * delivery to a phone on a bad connection — so this is not a quality shortfall
 * left unfixed, it is the format chosen on purpose. Do not raise it "for
 * quality" without a fresh ear ruling that hears something.
 */
const CARTESIA_SAMPLE_RATE = 24000;
const CARTESIA_BIT_RATE = 128000;

/**
 * Generate speech with Cartesia (sonic-3.6). Returns raw mp3 bytes.
 *
 * Three settings are baked in here rather than left to callers:
 *
 * 1. `locale`, not `language`. Cartesia's own guidance is to prefer `locale`;
 *    `language` takes base ISO codes only, and a base code is what let xAI read
 *    Italian "come stai" with English phonology in the 2026-07-10 pilot. Phase 8
 *    already has the right value in hand at the call site (toBcp47(item.language)).
 *    On sonic-3.6 the ambiguity that hung over this on sonic-3 is closed at the
 *    documentation end: Cartesia's API reference says `locale` requires Sonic
 *    3.6 or newer, and we now send it to a model that is. A live A/B probe the
 *    same day (2026-08-27, written up in
 *    `docs/pods/cartesia-36-production-2026-08-27.md`) is DIRECTIONAL but not proof — French text steered `fr-FR` leans French to a
 *    language detector, the same text steered `en-GB` leans English, at three
 *    takes a side with no seed to hold the rest still. Read it as corroboration,
 *    not as a measurement; Cartesia gives no way to observe which steer it
 *    applied.
 * 2. `generation_config.speed` — see CARTESIA_DEFAULT_SPEED above.
 * 3. `output_format` — see CARTESIA_SAMPLE_RATE / CARTESIA_BIT_RATE above.
 *
 * Word boundaries are null, as with xAI: this endpoint returns bytes, not
 * timings. Anything that needs word boundaries (component splicing) stays on
 * Azure — see docs, only Azure emits them.
 */
async function generateCartesia(text, config) {
  const {
    apiKey,
    voiceId,
    locale,
    language,
    speed = CARTESIA_DEFAULT_SPEED,
    modelId = CARTESIA_MODEL,
    sampleRate = CARTESIA_SAMPLE_RATE,
    bitRate = CARTESIA_BIT_RATE
  } = config;

  // Cartesia prefers BCP-47; accept `locale` first and fall back to whatever the
  // caller called `language`, because the dispatch sites in the estate assemble
  // a field with that name.
  //
  // A MISSING steer is a HARD FAIL, exactly as on the xAI path since 2026-08-24.
  // Same reason, same exposure: these are English-dominant multilingual clones,
  // and unsteered they read cross-language words with English phonology while
  // looking perfectly correct in the database. A render that forgot to say which
  // language it wanted is a defect, not a default — a warning here would be a
  // warning nobody reads, in front of a clip a learner hears.
  //
  // An EXPLICIT 'auto' is allowed and warned, matching the xAI path's carve-out
  // for deliberate pod-explainer tuning.
  const steer = locale || language;
  if (!steer) {
    throw new Error(`Cartesia TTS requires an explicit BCP-47 locale (voice ${voiceId}, text: "${String(text).slice(0, 40)}") — pass 'auto' deliberately if that is really what you want`);
  }
  if (steer === 'auto') {
    console.warn(`[Cartesia TTS] explicit locale='auto' for voice ${voiceId} — English phonology is possible on cross-language text (text: "${String(text).slice(0, 40)}")`);
  }

  if (!apiKey) {
    throw new Error('Cartesia API key is required');
  }
  if (!voiceId) {
    throw new Error('Cartesia voice id is required');
  }

  const body = {
    model_id: modelId,
    transcript: text,
    voice: { mode: 'id', id: voiceId },
    generation_config: { speed },
    output_format: {
      container: 'mp3',
      sample_rate: sampleRate,
      bit_rate: bitRate
    }
  };
  if (steer && steer !== 'auto') body.locale = steer;

  const response = await fetch('https://api.cartesia.ai/tts/bytes', {
    method: 'POST',
    agent: ttsKeepAliveAgent,
    signal: AbortSignal.timeout(TTS_FETCH_TIMEOUT_MS),
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Cartesia-Version': CARTESIA_VERSION,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cartesia TTS API error (${response.status}): ${errorText}`);
  }

  const audioBuffer = Buffer.from(await response.arrayBuffer());
  const bytesPerSecond = Math.max(1, Math.round(bitRate / 8));
  assertAudibleResponse(audioBuffer, {
    provider: 'cartesia', bytesPerSecond, text, voiceId,
  });
  return { audioBuffer, wordBoundaries: null };
}


/**
 * Generate speech using specified TTS provider
 * @param {string} text - Text to synthesize
 * @param {string} provider - TTS provider ('elevenlabs' | 'azure' | 'xai' | 'cartesia')
 * @param {object} config - Provider-specific configuration
 * @returns {Promise<{audioBuffer: Buffer, wordBoundaries: Array|null}>} Audio data + word boundary timing
 */
async function generate(text, provider, config) {
  if (!text || text.trim() === '') {
    throw new Error('Text cannot be empty');
  }

  assertNotChildVoice(config);
  assertNotHumanVoiceCourse(config);
  // NO CONSENT, NO SPEECH (Tom, 2026-08-31). See assertConsentedVoice above.
  await assertConsentedVoice(config, provider);
  // xAI RETIRED FROM SELECTION (Tom, 2026-08-27). Same defence pattern as the
  // two guards above, and here for the same reason: this switch is the one
  // chokepoint EVERY provider path passes through — the five call sites in
  // phase8, the pod path, the tools, production-api — so one line here retires
  // xAI everywhere at once instead of five copies of a condition that can drift
  // apart. Fails as a client error ("(403)"), so isRetriableTtsError does not
  // retry it: a retired provider is not a transient failure.
  //
  // SELECTION ONLY. This blocks new renders. It does not touch clip identity,
  // voice-id resolution, playback, relink or any read path, and no historic
  // xai_ clip is affected — see services/shared/tts-provider-policy.cjs.
  assertSelectableProvider(provider, 'tts-service.generate');

  switch (provider) {
    case 'elevenlabs':
      return await generateElevenLabs(text, config);

    case 'azure':
      return await generateAzure(text, config);

    case 'xai':
      return await generateXai(text, config);

    case 'cartesia':
      return await generateCartesia(text, config);

    default:
      throw new Error(`Unknown TTS provider: ${provider}`);
  }
}

/**
 * Decide whether a TTS error is worth retrying.
 *
 * Retry on transient/load failures: HTTP 5xx, connection resets, socket hang
 * ups, timeouts, fetch/network errors. These are exactly the intermittent
 * failures xAI's /v1/tts throws under the pod generator's fan-out
 * (e.g. `500 {"error":"TTS synthesis failed: Timeout expired"}`, `ECONNRESET`).
 *
 * Do NOT retry on real client errors (HTTP 4xx — bad key, bad voice id,
 * malformed request): retrying just burns time and money on a request that
 * will never succeed.
 *
 * @param {Error} error - The error thrown by generate()
 * @returns {boolean} True if the failure looks transient and retriable
 */
function isRetriableTtsError(error) {
  const msg = (error && error.message) ? error.message : String(error);

  // Provider error strings embed the HTTP status as "(NNN)". A 4xx is a real
  // client error — never retry it. Treat everything else as potentially
  // transient.
  const statusMatch = msg.match(/\((\d{3})\)/);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    if (status >= 400 && status < 500) return false; // client error → give up
    if (status >= 500) return true;                   // server error → retry
  }

  // Node fetch / socket level transient failures.
  const code = error && error.code ? String(error.code) : '';
  if (/ECONNRESET|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|EPIPE|ENETUNREACH/.test(code)) {
    return true;
  }
  if (/ECONNRESET|socket hang up|timeout|timed out|network|fetch failed|aborted|EAI_AGAIN|ETIMEDOUT/i.test(msg)) {
    return true;
  }

  // Unknown shape → retry once rather than fail hard on a possibly-transient
  // blip. The retry budget (maxRetries) bounds the downside.
  return true;
}

// ---- xAI phonology gate (whisper language auto-detect) --------------------
// xAI's multilingual voices are English-dominant and can render a non-English
// text with English phonology even with an explicit `language` sent
// ('Come stai' → English 'come'; ita pilot 2026-07-10). The gate re-rolls a
// render whose detected spoken language is a suspect (English or an explicit
// config.suspectLanguages entry) instead of the steered language, and fails
// the item after the retry budget — a wrong-language clip must never be
// written (zero-tolerance audio bar). Same measurement as
// tools/render-take-g.cjs; wired here so EVERY xAI call site is covered.
// Skipped when whisper-cli/model are absent (logged once), when the steered
// language is English/auto (no cross-language risk to detect), or when
// XAI_PHONO_GATE=0.
const WHISPER_BIN = process.env.WHISPER
  || (fs.existsSync('/opt/homebrew/bin/whisper-cli') ? '/opt/homebrew/bin/whisper-cli' : 'whisper-cli');
const WHISPER_MODEL = process.env.WHISPER_MODEL
  || path.join(require('os').homedir(), '.local/share/whisper-models/ggml-small.bin');
const FFMPEG_BIN = process.env.FFMPEG || (fs.existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg');
const PHONO_GATE_ON = process.env.XAI_PHONO_GATE !== '0' && fs.existsSync(WHISPER_BIN) && fs.existsSync(WHISPER_MODEL);
let phonoGateWarned = false;

// Bounded whisper concurrency: each detection spawns a multi-threaded
// process; an unbounded fan-out (TTS concurrency can be 20) would thrash the
// box. Two at a time keeps detection off the critical path without stampeding.
const PHONO_MAX_CONCURRENT = Number(process.env.XAI_PHONO_CONCURRENCY || 2);
let phonoActive = 0;
const phonoQueue = [];
function phonoAcquire() {
  if (phonoActive < PHONO_MAX_CONCURRENT) { phonoActive++; return Promise.resolve(); }
  return new Promise(resolve => phonoQueue.push(resolve));
}
function phonoRelease() {
  const next = phonoQueue.shift();
  if (next) next(); else phonoActive--;
}

/**
 * Detect the spoken language of an audio buffer via whisper-cli auto-detect.
 * @returns {Promise<string|null>} ISO 639-1 code, or null when unmeasurable
 *   (ffmpeg/whisper error) — null is treated as a pass, matching take-g's
 *   'unmeasured' outcome: the gate only acts on positive suspect detections.
 */
async function detectSpokenLanguage(audioBuffer) {
  await phonoAcquire();
  const base = path.join(os.tmpdir(), `phono-gate-${crypto.randomUUID()}`);
  const mp3 = `${base}.mp3`;
  const wav = `${base}.wav`;
  try {
    fs.writeFileSync(mp3, audioBuffer);
    return await new Promise(resolve => {
      execFile(FFMPEG_BIN, ['-y', '-i', mp3, '-ar', '16000', '-ac', '1', wav], err => {
        if (err) return resolve(null);
        execFile(WHISPER_BIN, ['-m', WHISPER_MODEL, '-l', 'auto', '-nt', '-t', String(process.env.WHISPER_THREADS || 4), '-f', wav],
          { encoding: 'utf8', maxBuffer: 1 << 22 }, (e, _o, stderr) => {
            const m = /auto-detected language: (\w+)/.exec(stderr || '');
            resolve(m ? m[1] : null);
          });
      });
    });
  } catch {
    return null;
  } finally {
    for (const f of [mp3, wav]) { try { fs.unlinkSync(f); } catch {} }
    phonoRelease();
  }
}

/**
 * Providers whose voices are English-dominant multilingual clones, and which
 * therefore read cross-language words with English phonology when the steer is
 * weak. A SET, not a string equality: this was `provider !== 'xai'`, and wiring
 * a second such provider in without touching it would have silently switched
 * the gate off for that provider — no error, no warning, just an unguarded
 * render path. Cartesia joined on 2026-08-27 with the same exposure that the
 * 2026-07-10 Italian pilot found on xAI ('come stai' read as English 'come').
 */
const PHONOLOGY_GATED_PROVIDERS = new Set(['xai', 'cartesia']);

/**
 * The suspect-language set for a render, or null when the gate doesn't apply.
 * Suspects = English (the voices' dominant language) + any explicit
 * config.suspectLanguages, minus the steered language itself.
 */
function phonologySuspects(provider, config) {
  if (!PHONOLOGY_GATED_PROVIDERS.has(provider) || config.phonologyGate === false) return null;
  // `locale` first: that is the field the Cartesia path steers with, and a gate
  // that read only `language` would find nothing to guard on a Cartesia render.
  const steered = String(config.locale || config.language || '').toLowerCase().split('-')[0];
  if (!steered || steered === 'auto' || steered === 'en') return null;
  const suspects = new Set(['en', ...(config.suspectLanguages || []).map(l => String(l).toLowerCase().split('-')[0])]);
  suspects.delete(steered);
  return suspects.size ? suspects : null;
}

/**
 * Generate speech with retry logic and exponential backoff + jitter.
 *
 * Backoff is exponential (base 1s, doubling) with full jitter, so a fan-out of
 * concurrent pod clips that all hit a transient xAI 5xx don't retry in lockstep
 * and re-stampede the API. Non-retriable (4xx) failures bail immediately.
 *
 * Every provider path additionally passes the empty-response gate
 * (assertAudibleResponse): a body too small to hold speech is thrown as a
 * transient "(503)" failure, so it is re-rolled inside this same retry budget
 * and, if every attempt comes back silent, throws — the caller never persists a
 * stub. This is the fix for the 2026-08-03 French batch.
 *
 * xAI renders steered to a non-English language additionally pass the
 * phonology gate above: a take whose detected spoken language is suspect is
 * re-rolled within the same retry budget, and the final failure throws so the
 * caller never persists a wrong-language clip.
 *
 * @param {string} text - Text to synthesize
 * @param {string} provider - TTS provider
 * @param {object} config - Provider configuration
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<{audioBuffer: Buffer, wordBoundaries: Array|null}>} Audio data + word boundary timing
 */
async function generateWithRetry(text, provider, config, maxRetries = 3) {
  let lastError = null;
  const suspects = phonologySuspects(provider, config);
  if (suspects && !PHONO_GATE_ON && !phonoGateWarned) {
    phonoGateWarned = true;
    console.warn(`[TTS] xAI phonology gate unavailable (${process.env.XAI_PHONO_GATE === '0' ? 'XAI_PHONO_GATE=0' : 'whisper-cli or model missing'}) — non-English xAI renders unchecked for language drift`);
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await generate(text, provider, config);
      if (suspects && PHONO_GATE_ON) {
        const detected = await detectSpokenLanguage(result.audioBuffer);
        if (detected && suspects.has(detected)) {
          throw new Error(`phonology gate: whisper detected '${detected}' instead of '${config.language}' for "${String(text).slice(0, 40)}"`);
        }
      }
      return result;
    } catch (error) {
      lastError = error;
      const retriable = isRetriableTtsError(error);
      console.warn(`[TTS] Attempt ${attempt + 1}/${maxRetries} failed (${retriable ? 'retriable' : 'fatal'}): ${error.message}`);

      // Real client error (4xx etc.) — retrying cannot help, fail fast.
      if (!retriable) {
        throw new Error(`TTS generation failed (non-retriable): ${error.message}`);
      }

      if (attempt < maxRetries - 1) {
        // Exponential backoff with full jitter: pick a random delay in
        // [0, base * 2^attempt]. base=1s → windows of [0,1s], [0,2s], [0,4s].
        // Jitter de-synchronises concurrent retries so they don't re-stampede.
        const ceiling = Math.pow(2, attempt) * 1000;
        const delay = Math.floor(Math.random() * ceiling);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`TTS generation failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Get cadence speed multiplier
 * @param {string} cadence - Cadence type ('natural', 'fast', 'slow')
 * @returns {number} Speed multiplier
 */
function getCadenceSpeed(cadence) {
  switch (cadence) {
    case 'natural':
      return 1.0;
    case 'fast':
      return 1.3;
    case 'slow':
      return 0.7;
    default:
      return 1.0;
  }
}

/**
 * Get voice ID/name for role from voice mapping
 * @param {string} role - Role ('target1', 'target2', 'source')
 * @param {object} voiceMapping - Voice mapping object
 * @returns {string} Voice ID or name
 */
function getVoiceForRole(role, voiceMapping) {
  const voice = voiceMapping[role];
  if (!voice) {
    throw new Error(`No voice mapping found for role: ${role}`);
  }
  return voice;
}

module.exports = {
  assertConsentedVoice,
  generate,
  generateWithRetry,
  isRetriableTtsError,
  generateElevenLabs,
  generateAzure,
  generateXai,
  generateCartesia,
  CARTESIA_DEFAULT_SPEED,
  CARTESIA_VERSION,
  CARTESIA_MODEL,
  CARTESIA_SAMPLE_RATE,
  CARTESIA_BIT_RATE,
  PHONOLOGY_GATED_PROVIDERS,
  getCadenceSpeed,
  getVoiceForRole,
  // phonology gate internals, exported for tests/tools
  detectSpokenLanguage,
  phonologySuspects,
  // empty-response gate + xAI pacing internals, exported for tests/tools
  assertAudibleResponse,
  recordXaiOutcome,
  getXaiHealth,
  TTS_MIN_AUDIO_MS,
  CHILD_VOICE_IDS,
  assertNotHumanVoiceCourse
};
