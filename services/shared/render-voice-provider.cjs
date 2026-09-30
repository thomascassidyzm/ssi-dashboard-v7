/**
 * Which provider a /api/audio/render voice belongs to when the caller does not say.
 *
 * Job #944: `voiceId: "en-GB-SoniaNeural"` (bare, as Azure spells it) used to blank the
 * provider, so the automatic ladder chose Cartesia for the covered language and Cartesia
 * refused the Azure name ("voice ID must be a valid UUID"). A voice names its own provider
 * by shape: an Azure neural name is not a UUID, a Cartesia voice is. And the course's OWN
 * cast voice (nothing named) keeps the provider its voice_config row stores.
 */
const AZURE_NAME = /^[a-z]{2,3}-[A-Za-z]{2,4}(-[A-Za-z0-9]+)?-[A-Za-z0-9]+(Neural|Multilingual\w*)$/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** 'azure' | 'cartesia' | undefined (unknown shape → leave it to the policy ladder). */
function providerForVoice(held, settings = {}) {
  if (!held) return undefined
  if (AZURE_NAME.test(held)) return 'azure'
  if (UUID.test(held)) return 'cartesia'
  if (settings.voiceId === held && settings.provider) return String(settings.provider).toLowerCase()
  return undefined
}

module.exports = { providerForVoice }
