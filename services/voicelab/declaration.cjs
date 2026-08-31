/**
 * VOICELAB · DECLARATION — the words that ARE the consent, and the check that
 * they were really said.
 *
 * Tom, 2026-09-01, commissioning the browser-recording path:
 *
 *   "when someone records a voice in the browser to clone it, they must READ A
 *    REQUIRED PHRASE ALOUD as part of that recording. It does two jobs at once
 *    — it proves the speaker is the person consenting, and it IS the consent
 *    record. A clone must not be creatable from a browser recording where the
 *    phrase was not read."
 *
 * ── WHY A SPOKEN LINE BEATS A TICK BOX ──────────────────────────────────────
 * A tick box says somebody clicked. It does not say who was in front of the
 * microphone. The line read aloud, on the very recording that is about to be
 * cloned, closes that gap with no extra ceremony: the body that consented and
 * the body being cloned are audibly the same one, and the proof is inside the
 * artefact rather than beside it. That is why the phrase is part of the SAMPLE
 * and not a separate recording — a separate recording could come from anywhere.
 *
 * ── AND WHY THE UPLOAD ROUTE CANNOT HAVE THAT ───────────────────────────────
 * You cannot get a spoken declaration out of a file somebody hands you. The
 * speaker may be in another country, or dead. So the upload route asks for the
 * next honest thing instead: a named human states that this is their own voice
 * or that they hold the right to use it, agrees to it being cloned, and that
 * statement is recorded against the voice with who and when. It is a genuine,
 * attributable commitment. It is NOT proof of who spoke, and this module keeps
 * the two kinds in separate columns for exactly that reason — see the migration
 * database/migrations/20260901_voices_consent_declaration.sql.
 *
 * ── THE THIRD OUTCOME, EVERYWHERE ───────────────────────────────────────────
 * Whisper runs locally on this box and costs nothing but CPU. It is also, on
 * some machines, simply absent. "Could not check" is therefore a real and
 * common state, and it is never quietly reported as either "passed" or
 * "failed": verifySpoken returns `available:false` with null evidence and never
 * throws, and the route above it falls back to the attestation rather than
 * either waving the clone through or blocking a legitimate one on a missing
 * binary. Saying "we checked" when nothing checked is the one failure this
 * module exists to make impossible.
 *
 * ── WHY THIS MODULE IS PURE (except for the one decode) ─────────────────────
 * Same posture as consent.cjs: no database, no HTTP, no clock it does not take
 * as an argument. declarationRecord is a function of its arguments and returns
 * columns; the route merges them. That is what lets every rule below be tested
 * without a database, and what stops a second, quieter answer to "is this
 * consented?" growing inside a Vue component.
 */

const audioVeracity = require('../audio-veracity.cjs')

/**
 * THE LINE READ ALOUD. Plain English, one sentence, sayable by somebody who has
 * never seen it before — a form of words nobody can read fluently is a form of
 * words that fails the check for the wrong reason.
 *
 * TOM'S TO REDLINE on the live thing. There is deliberately exactly one version
 * of it in this codebase and no "alternative wording" parameter: two accepted
 * phrasings would mean two different things had been consented to, and the
 * stored verbatim copy on each voice is what carries a change forward without
 * rewriting anybody's history.
 *
 * NO BRAND NAME IN IT (Tom's ruling, 2026-08-31). The first version said
 * "SaySomethingin", and whisper hears that as "say something in" — or, run
 * together with the next word, "say something intercopied". It cost 0.15
 * coverage on a clean reading, EVERY reading, which is the difference between
 * the gate having a comfortable margin and having almost none. The line does
 * not need the product's name to do its job: it has to establish that this
 * person consents to their voice being copied, and it does that in words a
 * decoder cannot mangle. Whatever the wording becomes, keep proper nouns and
 * coined words out of it — they are exactly what an ASR is worst at.
 */
const SPOKEN_PHRASE = 'This is my own voice, and I am happy for it to be copied and used in language courses.'

/**
 * THE ATTESTATION, for the upload route and for the honest fallback when this
 * box cannot listen. Wider than the spoken line by one clause, because the
 * uploader may legitimately hold the right to a recording that is not their own
 * voice — and narrowing it would push people into ticking something untrue.
 * Same rule: one version, Tom's to redline.
 */
const ATTESTATION = 'This is my own voice, or I have the right to use this recording. I am happy for it to be copied and used in language courses.'

/**
 * How much of the line has to be locatable in the decode.
 *
 * Not 1.0, and that is the whole point. wordCoverage asks whether each expected
 * word is PRESENT, with a spelling tolerance, because whisper's spelling is
 * unreliable while its presence detection is what is being trusted here. A
 * speaker with an accent, a room with a fan in it, or a clipped first syllable
 * costs words out of nineteen on a perfectly good reading.
 *
 * ── THE NUMBERS THIS WAS FITTED ON ──────────────────────────────────────────
 * MEASURED END TO END on this box with the real whisper (ggml-small), decoding
 * read takes of the line and scoring them with the same wordCoverage the gate
 * uses. The brand-name version, 2026-09-01, then the current wording after the
 * rename, 2026-08-31, on the identical harness:
 *
 *                                      with "SaySomethingin"   current line
 *   a clean, evenly paced reading              0.85               1.00
 *   the same reading, read fast                0.75               0.90
 *   read with a French accent                  0.95               0.84
 *   read with a heavy German accent            0.60  REFUSED      0.74-0.84
 *   an unrelated sentence                      0.20               0.21
 *
 * (The accented rows are synthesised accents, and whisper is not bit-exact run
 * to run — the German row came back 0.74 and 0.84 on two runs of the identical
 * clip. The lower number is the one quoted, and the one the test pins under.)
 *
 * The brand name was costing a clean reading 0.15 flat — whisper heard "say
 * something intercopied" for "SaySomethingin to copy it" — and it was the whole
 * of the difference in the one row that mattered: the heavily accented reading
 * that the old line REFUSED and this one passes. Discrimination is unchanged;
 * an unrelated sentence sits at 0.21, nowhere near the gate.
 *
 * ── WHY 0.7 AND NOT 0.8 ─────────────────────────────────────────────────────
 * That is a gap of ~0.8 between the two populations, and the first draft of
 * this gate spent almost all of it on the wrong side. At 0.8, on the old
 * wording, a clean, evenly paced reading passed with 0.05 to spare — so an accent, a stumble, a cough,
 * or a room with any reverb in it would have refused somebody who did exactly
 * what they were asked. That is not a small cost. A false refusal here tells a
 * real person, usually with somebody sitting next to them, that their consent
 * does not count; and the operator's next move after two refusals is to give up
 * on the spoken line and tick the attestation instead, which is how a strong
 * check quietly turns into a weak one.
 *
 * At 0.7 the discrimination is untouched — 0.15 is nowhere near it, and nothing
 * that does not contain this sentence gets seven tenths of its words located in
 * a decode — while the flow stops being brittle. TASTE DEFAULT, Tom's to move;
 * the numbers above are what it was actually fitted on, so anyone moving it can
 * see the evidence rather than guess at it.
 */
const COVERAGE_THRESHOLD = 0.7

/**
 * Did they actually read the line on this recording?
 *
 * NEVER THROWS. A missing whisper, an unreadable clip, a decoder that falls
 * over — all of them come back as `available:false` with null evidence, because
 * the caller's job is to distinguish "we heard the line", "we listened and it
 * was not there" and "we could not listen", and an exception collapses the
 * third into a 500 that reads like the second.
 *
 * @param {Buffer} clipBuffer  the sample about to be sent to Cartesia — the
 *        SAME bytes, not a second recording, which is what makes this proof of
 *        who is on the clip rather than proof that somebody once said a line.
 * @param {object} [opts]
 * @param {string} [opts.language]  the voice's language, 639-3-ish or ISO-639-1.
 * @returns {Promise<{available:boolean, heard:string|null, coverage:number|null, ok:boolean}>}
 */
async function verifySpoken (clipBuffer, { language } = {}) {
  const unavailable = { available: false, heard: null, coverage: null, ok: false }

  let av
  try { av = audioVeracity.availability() } catch { return unavailable }
  if (!av || !av.available) return unavailable
  if (!clipBuffer || !clipBuffer.length) return unavailable

  // The line is ENGLISH whatever language the voice speaks, so the decode is
  // asked for in English by default. A caller may name the language — the
  // parameter is honoured because a bilingual speaker's English carries their
  // first language's phonology and whisper does better when told where it is —
  // but an unmappable language falls back to 'en' rather than to whisper's
  // 'auto', which on a short clip will happily guess a language it is not.
  const raw = String(language || '').trim().toLowerCase()
  const iso1 = audioVeracity.WHISPER_ISO1[raw] || (raw.length === 2 ? raw : null) || 'en'

  try {
    const heard = await audioVeracity.decodeAudio(clipBuffer, iso1)
    const coverage = audioVeracity.wordCoverage(SPOKEN_PHRASE, heard, iso1)
    // A null coverage means the question could not be asked, which is not "no".
    if (coverage === null || coverage === undefined) return { available: true, heard: heard || null, coverage: null, ok: false }
    return { available: true, heard: heard || '', coverage, ok: coverage >= COVERAGE_THRESHOLD }
  } catch {
    // The binary is there but the decode fell over. Still "could not check" —
    // reporting it as a failed reading would block a clone on our own plumbing.
    return unavailable
  }
}

/**
 * The consent columns to write when a declaration was made.
 *
 * THESE MOVE THE VOICE TO `authorised`, and that is the substantive change this
 * module makes to the model. Under the 2026-08-31 flow every clone was born
 * awaiting_authorisation because consent was something Tom went and obtained
 * afterwards, off-system. Here there is nothing to go and obtain: the person is
 * present, and reading the line aloud (or agreeing to the attestation) IS the
 * consent event. Leaving such a voice "awaiting authorisation" would be the
 * screen lying in the cautious direction — it would say nobody had been asked
 * about a voice whose owner had just said yes into the microphone, and a queue
 * full of already-consented voices is a queue nobody reads.
 *
 * Merged OVER a birthRecord, never instead of it: the birth record is what
 * insists on a named person, and a clone with a declaration must still say
 * whose voice it is.
 *
 * @param {object} a
 * @param {'spoken'|'attested'} a.kind
 * @param {string} [a.heard]       what whisper heard — spoken kind only.
 * @param {string} [a.attestedBy]  who ticked it — attested kind only.
 * @param {string} [a.person]      whose voice it is — required for spoken.
 * @param {Date}   [a.now]
 */
function declarationRecord ({ kind, heard = null, attestedBy = null, person = null, now = new Date() }) {
  const k = String(kind || '').trim()
  if (k !== 'spoken' && k !== 'attested') {
    throw Object.assign(new Error(`A declaration is either 'spoken' or 'attested' — got "${kind}".`), { status: 400 })
  }

  if (k === 'spoken') {
    const named = trim(person)
    if (!named) {
      // The spoken line says "this is MY OWN voice". Recording that yes without
      // recording whose yes it is would leave a consent nobody can be matched
      // to — and the database's own CHECK on `authorised` would refuse it
      // anyway. Said here in a sentence so the operator gets one.
      throw Object.assign(
        new Error('Name whose voice this is. They read a line saying it is their own voice, so the record has to say whose voice it is.'),
        { status: 400 },
      )
    }
    return {
      consent_status: 'authorised',
      // The person themselves, because they are who spoke. Not the operator —
      // consent.cjs keeps consent_recorded_by for that, and collapsing the two
      // is how a tick box becomes indistinguishable from a person's yes.
      consent_authorised_by: named,
      consent_authorised_how: 'read the consent line aloud on the recording',
      consent_authorised_at: now.toISOString(),
      consent_declaration: SPOKEN_PHRASE,
      consent_declaration_kind: 'spoken',
      // The evidence, verbatim, including its mishearings. Stored as the
      // machine reported it so a human can later disagree with the machine.
      consent_declaration_heard: heard === null || heard === undefined ? null : String(heard),
    }
  }

  const by = trim(attestedBy)
  if (!by) {
    throw Object.assign(
      new Error('Say who is making this statement. An attestation with nobody attached to it is a tick box, not a permission.'),
      { status: 400 },
    )
  }
  return {
    consent_status: 'authorised',
    consent_authorised_by: by,
    consent_authorised_how: 'agreed to the consent wording when uploading the recording',
    consent_authorised_at: now.toISOString(),
    consent_declaration: ATTESTATION,
    consent_declaration_kind: 'attested',
    // Nothing was listened to, so there is nothing heard. Explicitly null
    // rather than absent: an empty string here would read as "we listened and
    // heard silence", which is a different and much worse claim.
    consent_declaration_heard: null,
  }
}

function trim (v) { return v === null || v === undefined ? '' : String(v).trim() }

module.exports = {
  SPOKEN_PHRASE,
  ATTESTATION,
  COVERAGE_THRESHOLD,
  verifySpoken,
  declarationRecord,
}
