-- Migration: Generic global config table (app_config) + seed pod_voice_pools.
-- Date: 2026-05-05
--
-- Purpose: Provide a single source of truth for ranked TTS voice pools per
-- (language, gender), used by listening-pod audio generation.
--
-- Policy (locked 2026-05-05):
--   1. xAI dedicated voices when the language has them (Tom/Olivia/Henry for eng).
--   2. Azure regional voices for everything xAI doesn't cover.
--   3. NO xAI multilingual fallback (sal/eve/ara/leo/rex retired).
--   4. NO ElevenLabs.
--
-- Pod-sync assigns each speaker the lowest-rank voice for their gender, then
-- rotates through ranks for additional same-gender characters.

CREATE TABLE IF NOT EXISTS app_config (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_config (key, value) VALUES (
  'pod_voice_pools',
  $${
    "eng": {
      "f": [
        {"provider": "xai",   "voice_id": "bedd6226",            "name": "Olivia"},
        {"provider": "azure", "voice_id": "en-GB-SoniaNeural",   "name": "Sonia"},
        {"provider": "azure", "voice_id": "en-GB-LibbyNeural",   "name": "Libby"},
        {"provider": "azure", "voice_id": "en-GB-HollieNeural",  "name": "Hollie"},
        {"provider": "azure", "voice_id": "en-GB-MaisieNeural",  "name": "Maisie"}
      ],
      "m": [
        {"provider": "xai",   "voice_id": "gfzdpspr5fdp",        "name": "Tom"},
        {"provider": "xai",   "voice_id": "f15c6a6a",            "name": "Henry"},
        {"provider": "azure", "voice_id": "en-GB-RyanNeural",    "name": "Ryan"},
        {"provider": "azure", "voice_id": "en-GB-ThomasNeural",  "name": "Thomas"},
        {"provider": "azure", "voice_id": "en-GB-AlfieNeural",   "name": "Alfie"}
      ]
    },
    "hrv": {
      "f": [
        {"provider": "azure", "voice_id": "hr-HR-GabrijelaNeural", "name": "Gabrijela"}
      ],
      "m": [
        {"provider": "azure", "voice_id": "hr-HR-SreckoNeural",    "name": "Srecko"}
      ]
    }
  }$$::jsonb
)
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      updated_at = now();
