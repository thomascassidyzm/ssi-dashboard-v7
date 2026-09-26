/**
 * POST /api/voices/preview
 * Generate a preview audio sample using Azure TTS, through the one TTS door
 *
 * Body:
 *   - text: Text to synthesize (required)
 *   - voiceId: Azure voice short name, e.g., 'es-ES-ElviraNeural' (required)
 *   - style: Speaking style (optional, if voice supports it)
 *   - rate: Speech rate, e.g., '0.9' for slower (optional, default '1.0')
 *
 * Returns: audio/mpeg stream
 */

import consentGate from '../../services/shared/voice-consent-gate.cjs';
import tts from '../../services/tts-service.cjs';
import { getSupabase } from '../lib/supabase.js';

const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'westeurope';
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Check credentials
  if (!AZURE_SPEECH_KEY) {
    return res.status(500).json({
      error: 'Azure Speech not configured',
      message: 'AZURE_SPEECH_KEY environment variable is not set'
    });
  }

  try {
    const { text, voiceId, style, rate } = req.body;

    // Validation
    if (!text) {
      return res.status(400).json({ error: 'Missing required field: text' });
    }
    if (!voiceId) {
      return res.status(400).json({ error: 'Missing required field: voiceId' });
    }
    if (text.length > 1000) {
      return res.status(400).json({ error: 'Text too long (max 1000 characters for preview)' });
    }

    // NO CONSENT, NO SPEECH (Tom, 2026-08-31). This route synthesises straight
    // from a voice id in the request body — no session, no auth, its own hand-
    // built SSML and its own fetch — so nothing upstream can protect it. Azure
    // only ever speaks stock voices, so this passes in practice; it is here
    // because "the provider happens not to hold a clone today" is not a guard.
    try {
      await consentGate.assertConsented(String(voiceId), { db: getSupabase(), provider: 'azure', context: 'api/voices/preview' });
    } catch (err) {
      return res.status(409).json({ error: err.message, code: err.code || 'NO_RECORDED_CONSENT' });
    }

    console.log('[Preview] Generating:', { voiceId, textLength: text.length, rate });

    // Through the one TTS door (services/tts-service.cjs speak), as an
    // audition: the door answers with an existing clip when this voice has
    // already said these words, and never lets anything call Azure directly.
    // `style` is no longer honoured — the door's Azure renderer emits no
    // mstts:express-as, and a preview claiming a style it did not apply would lie.
    let out;
    try {
      out = await tts.speak(text, 'azure', {
        subscriptionKey: AZURE_SPEECH_KEY,
        region: AZURE_SPEECH_REGION,
        voiceName: voiceId,
        speed: Number(rate) > 0 ? Number(rate) : 1.0,
        door: { audition: true },
      }, 1);
    } catch (err) {
      console.error('[Preview] TTS door refused or failed:', err.message);
      return res.status(502).json({ error: 'TTS error', message: err.message });
    }
    const audioBuffer = out.audioBuffer;

    // Stream audio back to client

    console.log('[Preview] Generated', audioBuffer.length, 'bytes of audio', out.existingClip ? '(existing clip)' : '');

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.send(audioBuffer);

  } catch (err) {
    console.error('[Preview] Error:', err.message);
    res.status(500).json({
      error: 'Failed to generate preview',
      message: err.message
    });
  }
}
