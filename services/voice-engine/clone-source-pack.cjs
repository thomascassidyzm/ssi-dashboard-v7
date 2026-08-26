/**
 * clone-source-pack.cjs — the recording PACKS: authored scripts that are read
 * on the recordist surface but are NOT course content and must never become it.
 *
 * WHY THIS EXISTS. Tom, 2026-08-26: "Where do I DO the actual recording? Is
 * there a page on Popty yet?" The voice-clone recording pack for the TTS
 * bake-off was a document to read, not a queue to work. Popty already has the
 * screen — /r/:voiceId, the one Aran and Catrin use — and that screen is by far
 * the best thing on the estate for reading a script into a phone. So a pack
 * rides that surface by presenting itself as a voice id, and the router branches
 * on it before it ever consults language_recording_policy.
 *
 * THE ISOLATION IS STRUCTURAL, NOT A TAG. A clone source that leaked into a
 * course would be a learner hearing Tom read an OpenAI consent form. So this
 * path touches NO database table at all — not course_audio, not
 * listening_pod_sentences, not recording_provenance. A take is bytes at an S3
 * key under `clone-source/`, and nothing in the audio pipeline reads that
 * prefix. There is no row for an autolinker to find, no text_normalized for a
 * clip-identity lookup to collide with, and no course_code anywhere in the
 * write path. You cannot leak what you never wrote.
 *
 * RAW, NEVER MASTERED. The ordinary take path archives the original and then
 * masters the clip a learner hears. A clone source must skip the mastering
 * entirely: trim, gain and normalisation are exactly the things a voice-cloning
 * model would learn as Tom's voice. The bytes the microphone gave us are the
 * deliverable, and they are stored untouched.
 *
 * THE PACK IS A FILE, NOT A TABLE. Its content is authored prose that changes
 * by someone editing it and having the edit reviewed — which is what git is.
 * A table would need a migration, an admin UI and a reviewer, to hold four
 * paragraphs that a diff shows better.
 *
 * Source document: docs/tts-bakeoff/tom-clone-recording-pack-2026-08-26.md,
 * published at /d/d6dd5951. Every vendor constraint below is quoted from it.
 */

'use strict'

/** A pack id is a voice id with this prefix. Checked before any policy lookup. */
const PACK_VOICE_PREFIX = 'pack-'

/**
 * BLOCK 4 IS ONE ITEM, DELIBERATELY.
 *
 * The brief asked for the cloning sample "chunked into recordable items", and
 * for this block that would destroy the thing being built. All three candidates
 * are given ONE continuous sample; OpenAI's cap is on that single file
 * ("The audio samples must be 30 seconds or less") and Cartesia's instant clone
 * cuts its 10-second window out of the front of it. Four chunks recorded
 * separately are four files with four different room tones and four attacks,
 * and no vendor takes four. The chunking that IS real is between blocks — and
 * that is what every item boundary below is.
 */
const TOM_CLONE_PACK = {
  id: 'tom-clone',
  voiceId: 'pack-tom-clone',
  displayName: 'Tom',
  title: "The clone source — TTS bake-off phase 2",
  // Shown on the page, and the reason the surface's usual VAD auto-advance is
  // off here: these are paragraphs with sentence pauses in them, and stopping
  // on the first pause would cut the sample in half.
  autoAdvance: false,
  language: 'eng',
  languageName: 'English',
  items: [
    {
      id: 'b1-slate',
      order: 1,
      title: 'Block 1 — the slate',
      text: 'Tom Cassidy, twenty-sixth of August twenty twenty-six, TTS bake-off phase two, clone source recording, recorded on a phone.',
      note: 'For our records only. This one is never sent to any vendor.',
      why: 'Ten seconds. Read it once and move on.',
      maxSeconds: 45,
    },
    {
      // OPENAI'S RULE, VERBATIM AND ALONE. Their words: "The consent audio
      // recording must only include one of the following phrases. Any
      // divergence from the script will lead to a failure." So this is its own
      // item with nothing else in the file — no slate before it, no run-on
      // after it — and the text below is character-for-character theirs.
      id: 'b2-openai-consent',
      order: 2,
      title: 'Block 2 — the OpenAI consent clip',
      text: 'I am the owner of this voice and I consent to OpenAI using this voice to create a synthetic voice model.',
      note: 'Word-perfect, and nothing else in the recording. Any divergence from this script fails at OpenAI.',
      why: 'Read it once, cleanly, at your normal pace. Do not add "right then" at the front.',
      isolated: true,
      maxSeconds: 30,
    },
    {
      id: 'b3-ssi-consent',
      order: 3,
      title: 'Block 3 — our own consent record',
      text: "I'm Tom Cassidy. This is my own voice, recorded by me on the twenty-sixth of August twenty twenty-six. I consent to SaySomethingin using this recording to create test voice clones with Cartesia, OpenAI and Chatterbox, for evaluation purposes.",
      note: 'Optional, about fifteen seconds. No vendor asks for this — it is for our own file.',
      why: 'Skip it if you would rather. It is belt-and-braces, not a gate.',
      optional: true,
      maxSeconds: 60,
    },
    {
      id: 'b4-cloning-sample',
      order: 4,
      title: 'Block 4 — THE CLONING SAMPLE',
      text: "Right, let's begin. I'm going to say something in English, and then you're going to have a go at saying it back. Don't worry about getting it perfect the first time — nobody does. Take your time, say it out loud, and if you need to hear it again, just ask. Ready? Here's the first one.",
      note: 'The one that matters. One take, straight through, about 25 seconds, no long pauses. This exact file goes to all three candidates.',
      why: "Read the first two sentences especially cleanly — that is the 9-second window Cartesia's instant clone gets cut from. Hard stop at 30 seconds: OpenAI refuses anything longer.",
      maxSeconds: 30,
    },
    // ── Block 5: the optional Cartesia Pro read. Only Cartesia can consume it
    // ("30 minutes is the minimum"), so it tells us Cartesia's ceiling and
    // nothing comparative. Chunked per passage because half an hour is not one
    // take on a phone, and because a fluffed passage should cost one passage.
    {
      id: 'b5-a-narrative',
      order: 5,
      title: 'Block 5 · Passage A — plain narrative',
      text: "The first time someone tries to speak a new language out loud, something odd happens. They know the words. They've read them, they've heard them, they could pick them out on a page without hesitating. And then they open their mouth and nothing arrives in the right order. It isn't a memory problem. It's that knowing a thing and doing a thing sit in different places, and only one of them is built by practice. So we practise the doing. Not the reading, not the recognising, not the quiet confidence of understanding somebody else — the doing. You say it, out loud, badly, and then you say it again slightly less badly, and after a while you stop noticing that you're doing it at all.",
      note: 'Optional — only Cartesia Pro can use block 5. Another day is fine.',
      why: 'Same room, same mic, same delivery as block 4.',
      optional: true,
    },
    {
      id: 'b5-b-questions',
      order: 6,
      title: 'Block 5 · Passage B — questions',
      text: "What would you like to do this evening? Do you think we'll get there before it closes? How long have you been learning? Would you mind saying that again, a bit more slowly? Is it always this busy on a Tuesday? Are you sure you've got enough time? Why does everybody stop at exactly the same point? Shall we try that once more? Can you hear the difference between those two, or do they sound the same to you? Where did you say you were staying?",
      note: 'Optional — block 5.',
      why: 'Let the question intonation land; that is what this passage is for.',
      optional: true,
    },
    {
      id: 'b5-c-short-lines',
      order: 7,
      title: 'Block 5 · Passage C — short lines',
      text: "Not yet. Almost. Try again. That's it. Nearly. Once more, from the top. Good. Stop there. Slower. Louder. Again. Now without looking. Perfect. Now the other one. Don't think about it. Say it.",
      note: 'Optional — block 5.',
      why: 'Short lines, but keep it one continuous read — do not leave long gaps between them.',
      optional: true,
    },
    {
      id: 'b5-d-long-sentences',
      order: 8,
      title: 'Block 5 · Passage D — long sentences',
      text: "If you've spent any time at all trying to learn a language the way most of us were taught it at school, you'll recognise the peculiar feeling of having accumulated a great deal of information about a language without ever having acquired the ability to use it, which is a bit like owning a detailed map of a city you have never once walked through, and being surprised that you get lost the moment you arrive. What we're after is something much less impressive on paper and much more useful in practice: a small number of things you can genuinely say, without hesitating, without translating, without rehearsing them in your head first — and then, slowly and steadily, a larger number of them, until one day somebody asks you a question you weren't expecting and you answer it before you've noticed you've done so.",
      note: 'Optional — block 5.',
      why: 'Long sentences at an even pace. Breathe where you would naturally.',
      optional: true,
    },
    {
      id: 'b5-e-names-numbers',
      order: 9,
      title: 'Block 5 · Passage E — names and numbers',
      text: "Aberystwyth, Caernarfon, Llandudno, Machynlleth. Barcelona, Bordeaux, Bologna, Bruges. Catrin, Aran, Sascha, Noor. It's twenty past four on the fourteenth of March. There were nine hundred and forty-three of them, up from six hundred and eighteen last year. Room 12B, second floor, at half past nine. Call me on oh one two three, four five six, seven eight nine oh. Twenty-five per cent of ninety-six is twenty-four. The 2026 figures aren't out yet. Nineteen eighty-four. Three, seven, eleven, nineteen, twenty-three.",
      note: 'Optional — block 5.',
      why: 'Read the numbers as written here, in words where they are in words.',
      optional: true,
    },
    {
      id: 'b5-f-dialogue',
      order: 10,
      title: 'Block 5 · Passage F — dialogue',
      text: '"Are you coming?" — "In a minute. I\'ve nearly finished." — "You said that twenty minutes ago." — "Did I? It didn\'t feel like twenty minutes." — "It never does. Right, I\'m going without you." — "No, wait, wait. Give me thirty seconds and I\'m there." — "Thirty seconds." — "Thirty seconds, I promise." — "I\'m counting." — "You always count."',
      note: 'Optional — block 5.',
      why: 'Two voices, but stay in your own register — this is range, not characters.',
      optional: true,
    },
    {
      id: 'b5-g-closing',
      order: 11,
      title: 'Block 5 · Passage G — closing',
      text: "That's the whole idea, really. You don't learn a language by understanding it. You learn it by saying it, out loud, before you feel ready, and being wrong often enough that being wrong stops mattering. Everything else is detail.",
      note: 'Optional — block 5. After this, the pack says: just talk for twenty minutes.',
      why: 'Last of the written passages.',
      optional: true,
    },
  ],
}

const PACKS = new Map([[TOM_CLONE_PACK.voiceId, TOM_CLONE_PACK]])

/**
 * The pack a recordist-surface voice id names, or null if it names no pack.
 *
 * Called BEFORE resolveRecordist on every recordist route, so a pack id can
 * never reach the policy table and a policy voice can never reach a pack: the
 * two namespaces are disjoint by the prefix and by this map being explicit.
 */
function resolvePack(voiceId) {
  if (!voiceId || typeof voiceId !== 'string') return null
  if (!voiceId.startsWith(PACK_VOICE_PREFIX)) return null
  return PACKS.get(voiceId) || null
}

/** Whether an id looks like a pack at all — used to shape the 404 message. */
function looksLikePack(voiceId) {
  return typeof voiceId === 'string' && voiceId.startsWith(PACK_VOICE_PREFIX)
}

function findItem(pack, itemId) {
  if (!pack || !itemId) return null
  return pack.items.find((i) => i.id === String(itemId)) || null
}

module.exports = {
  PACK_VOICE_PREFIX,
  TOM_CLONE_PACK,
  resolvePack,
  looksLikePack,
  findItem,
}
