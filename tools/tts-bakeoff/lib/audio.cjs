/**
 * Placeholder audio for dry runs.
 *
 * A dry run spends nothing, so there are no real bytes. But the listening-pack
 * builder and the scoring sheet need SOMETHING to chew on before phase 2, and
 * more importantly the sha256 story needs to be demonstrable today: identical
 * request -> identical bytes -> identical hash; one changed field -> different
 * hash. So the placeholder is DERIVED FROM THE REQUEST, deterministically.
 *
 * It is 16-bit mono PCM WAV, and it is a faint tone rather than digital silence
 * so a human who accidentally opens a dry-run pack hears immediately that it is
 * not speech. Every sidecar carries audio_is_placeholder: true. Nothing here is
 * ever to be scored.
 */
const crypto = require('crypto');

const SAMPLE_RATE = 16000;

function wavHeader(dataBytes) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + dataBytes, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);      // PCM chunk size
  h.writeUInt16LE(1, 20);       // format = PCM
  h.writeUInt16LE(1, 22);       // channels
  h.writeUInt32LE(SAMPLE_RATE, 24);
  h.writeUInt32LE(SAMPLE_RATE * 2, 28);  // byte rate
  h.writeUInt16LE(2, 32);       // block align
  h.writeUInt16LE(16, 34);      // bits per sample
  h.write('data', 36);
  h.writeUInt32LE(dataBytes, 40);
  return h;
}

/**
 * @param {string} seedString canonical request JSON — the determinism source
 * @param {string} text used only to pick a plausible duration
 */
function placeholderWav(seedString, text) {
  const digest = crypto.createHash('sha256').update(seedString).digest();
  // Duration tracks text length so a pack "feels" like the real thing.
  const seconds = Math.min(8, Math.max(0.6, (String(text || '').length / 14)));
  const samples = Math.round(seconds * SAMPLE_RATE);
  const data = Buffer.alloc(samples * 2);
  // Frequency derived from the digest: different request -> audibly different tone.
  const freq = 220 + (digest[0] / 255) * 440;
  for (let i = 0; i < samples; i++) {
    const env = Math.min(1, i / 800, (samples - i) / 800);  // de-click ramps
    const v = Math.round(Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE) * 3000 * env);
    data.writeInt16LE(v, i * 2);
  }
  return Buffer.concat([wavHeader(data.length), data]);
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

module.exports = { placeholderWav, sha256, SAMPLE_RATE };
