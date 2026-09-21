// The single-LEGO presentation render must apply the language cast.
//
// Tom's ruling, 2026-08-29: "the language cast is applied once, here" — at the
// point a handler fetches the course, so everything downstream reads one
// resolved voice_config. /regenerate-lego has carried that line since; its
// sibling /regenerate-presentation never did, and read the voice frozen into
// courses.voice_config at build time instead.
//
// What that cost, found live on 2026-09-21 while adding LEGO S0001L06 to
// deu_for_eng: the stored presentation voice is "gfzdpspr5fdp" (provider xai,
// retired), so the provider policy refused the render —
//   "the configured voice ... cannot be carried onto azure ... Re-cast this
//    role's voice in voice_config."
// — while voice_language_roles had held the right answer (eng/presentation
// rank 0, Tom's Cartesia clone) the whole time. Every xAI-era course was in the
// same position: no new LEGO could ever get a presentation clip, and an intro
// cycle with no presentation audio plays with an empty prompt.
//
// This asserts the rule where it is made rather than describing it elsewhere.

const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert');

const SRC = fs.readFileSync(path.join(__dirname, 'phase8-audio-v13.cjs'), 'utf8');

/** The body of one express route, from its app.post line to the next app.<verb>. */
function routeBody(signature) {
  const start = SRC.indexOf(signature);
  assert.notStrictEqual(start, -1, `route not found: ${signature} — did it move or get renamed?`);
  const rest = SRC.slice(start + signature.length);
  const end = rest.search(/\napp\.(get|post|put|patch|delete)\(/);
  return end === -1 ? rest : rest.slice(0, end);
}

test('/regenerate-presentation resolves the language cast before choosing a voice', () => {
  const body = routeBody("app.post('/regenerate-presentation/:courseCode/:legoId'");
  assert.match(
    body,
    /voiceConfigService\.resolveVoiceConfig\(/,
    'the single-LEGO presentation render reads course.voice_config directly. '
    + 'It must call voiceConfigService.resolveVoiceConfig() first, like /regenerate-lego does, '
    + 'or every course whose stored voice is a retired provider can never get a presentation clip.'
  );
  const resolveAt = body.indexOf('resolveVoiceConfig(');
  const readAt = body.indexOf('voiceConfig.voices?.presentation');
  assert.ok(readAt === -1 || resolveAt < readAt,
    'the cast must be resolved BEFORE the presentation voice is read off voice_config');
});

test('/regenerate-lego still resolves the language cast (the reference implementation)', () => {
  const body = routeBody("app.post('/regenerate-lego/:courseCode/:legoId'");
  assert.match(body, /voiceConfigService\.resolveVoiceConfig\(/);
});
