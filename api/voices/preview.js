/**
 * POST /api/voices/preview
 * Generate a preview audio sample using Azure TTS
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

    console.log('[Preview] Generating:', { voiceId, textLength: text.length, style, rate });

    // Extract locale from voiceId (e.g., 'es-ES' from 'es-ES-ElviraNeural')
    const locale = voiceId.split('-').slice(0, 2).join('-');

    // Build SSML
    let ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${locale}'>`;
    ssml += `<voice name='${voiceId}'>`;

    // Add prosody for rate adjustment if specified
    if (rate && rate !== '1.0' && rate !== '1') {
      ssml += `<prosody rate='${rate}'>`;
    }

    // Add express-as for style if specified
    if (style) {
      ssml += `<mstts:express-as xmlns:mstts='http://www.w3.org/2001/mstts' style='${style}'>`;
      ssml += escapeXml(text);
      ssml += `</mstts:express-as>`;
    } else {
      ssml += escapeXml(text);
    }

    if (rate && rate !== '1.0' && rate !== '1') {
      ssml += `</prosody>`;
    }

    ssml += `</voice></speak>`;

    console.log('[Preview] SSML:', ssml.slice(0, 200) + '...');

    // Call Azure TTS API
    const response = await fetch(
      `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
          'User-Agent': 'SSi-Dashboard-Voice-Preview'
        },
        body: ssml
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Preview] Azure TTS error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Azure TTS error',
        status: response.status,
        message: errorText
      });
    }

    // Stream audio back to client
    const audioBuffer = await response.arrayBuffer();

    console.log('[Preview] Generated', audioBuffer.byteLength, 'bytes of audio');

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.byteLength);
    res.send(Buffer.from(audioBuffer));

  } catch (err) {
    console.error('[Preview] Error:', err.message);
    res.status(500).json({
      error: 'Failed to generate preview',
      message: err.message
    });
  }
}

// Escape special XML characters
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
