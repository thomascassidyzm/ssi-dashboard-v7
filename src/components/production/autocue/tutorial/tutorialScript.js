// src/components/production/autocue/tutorial/tutorialScript.js
/**
 * EVERY WORD OF TEACHING COPY IN THE TUTORIAL LIVES HERE, AND ONLY HERE.
 *
 * Nothing in this file may be imported by a component on the live recording
 * path. It reaches the screen through `TutorialCoach.vue`, which is inert
 * unless `TUTORIAL_MODE` was provided — see `tutorialMode.js` for the gate and
 * why it is shaped that way. A real recordist working their queue must never
 * see any of this.
 *
 * ── The teaching order, and why it is this order ─────────────────────────────
 *
 * QUEUE MODE FIRST, then SCRIPT MODE. Both are real modes of the recorder
 * (`useAutocueState.js` header: queue = regeneration, phrase-by-phrase with
 * manual advance; script = new-course, continuous with VAD auto-advance).
 *
 * Queue mode first because the recordist holds the boundary themselves: they
 * decide when a take is finished and press to move on. That is the only setting
 * in which they can hear what a slow read IS before also having to worry about
 * a machine judging when they have stopped talking. Teaching neutrality and
 * auto-advance at the same time means a failure has two possible causes and the
 * recordist cannot tell which one they hit.
 *
 * Script mode second, because it is where the skill is actually tested — and
 * where it can fail silently. The autocue moves on off your voice. Trail off,
 * or take a breath in the middle of a phrase, and it advances while you are
 * still speaking; you are now reading line four into line three's slot and
 * nothing on screen says so.
 *
 * ── The number that makes script mode teachable ──────────────────────────────
 *
 * There is a WINDOW, and it is the single most useful fact in this tutorial:
 *
 *   - the splitter needs at least SILENCE_MIN_MS (150 ms) of silence between
 *     pieces or it cannot tell where one ended (align-audio.cjs / takeSplice.js);
 *   - the VAD ends the take after silenceDuration (800 ms) of silence and
 *     advances the autocue (useContinuousRecorder.ts).
 *
 * So in script mode a beat must be comfortably over 150 ms and comfortably
 * under 800 ms. "About half a second." A full second — which is the right
 * instruction in queue mode, where nothing is listening for the end — will end
 * the take mid-phrase in script mode. The tutorial makes the recordist feel
 * both, rather than telling them a number.
 */

/** The window, kept here as the numbers rather than as prose, so it cannot rot. */
export const BEAT_WINDOW = {
  minMs: 150,   // SPLICE_CONFIG.SILENCE_MIN_MS — below this, pieces merge
  maxMs: 800,   // useContinuousRecorder silenceDuration — above this, it advances
  aimMs: 500,   // what to actually ask for in script mode
}

/**
 * Copy blocks, keyed by the tutorial step that shows them.
 *
 * `tone: 'do'` — what to do next (green).
 * `tone: 'why'` — what we are looking for and why (neutral).
 * `tone: 'watch'` — the consequence to notice (amber).
 */
export const COACH = {
  welcome: {
    title: 'What this is',
    tone: 'why',
    body: [
      'This is the real recording tool. Same screen, same buttons, same everything — the only differences are that the lines are practice lines, and nothing you record is kept.',
      'You will use BOTH of the ways it records, and you will switch between them yourself, because that switch is one of the things worth knowing before your first real session.',
      'Nothing here is a test. You do a thing, you hear what happened to it, you try again.',
    ],
  },

  pickQueueMode: {
    title: 'The tool has two modes — start with the simpler one',
    tone: 'do',
    body: [
      'This is the screen you land on. Two ways of recording, and you pick one.',
      'Tap MODE 2: REGENERATION. That is the phrase-by-phrase mode: it shows you one line, waits, and does not move until you tell it to. You are in charge of when each take ends.',
      'We will come back to this screen later and take the other one.',
    ],
    nudge: 'Not that one yet — tap Mode 2: Regeneration. We will do Mode 1 in a minute.',
  },

  role: {
    title: 'Which voice you are recording as',
    tone: 'why',
    body: [
      'Every clip is filed under a voice. Known is the language the learner already speaks; Target is the one they are learning. In a real session this is set for you by the link you were sent — you are just seeing where it lives.',
      'Pick any of them and tap BEGIN SESSION.',
    ],
  },

  queueNatural: {
    title: 'Say it, do not read it',
    tone: 'why',
    body: [
      'We are not after a performance. We are after you, talking.',
      'Glance at the line, look up, and say it the way you would say it to a person standing there. If it sounds like you are reading, it will sound like reading to the learner, and that is the single thing most likely to make a course feel dead.',
      'Tap START RECORDING. It stays recording from here on — you do not press record again for each line.',
    ],
    watch: 'Watch what does NOT happen when you finish the line: nothing. It sits there. In this mode the boundary between one take and the next is your finger, and that is what NEXT is for.'
  },

  queueAdvance: {
    title: 'You are recording — now press NEXT',
    tone: 'do',
    body: [
      'Said the line? Press NEXT. That closes this take, files it, and brings the next line up. Press it again after the second one.',
      'This is the whole character of the phrase-by-phrase mode: the microphone is open the entire time, and YOU decide where one take ends and the next begins. The autocue does not move until your finger moves it.',
      'Fluffed it? Press PREVIOUS and say it again — you will record straight over the top. Nothing is lost.',
      'STOP RECORDING ends the pass, not the take.',
    ],
    watch: 'Remember this feeling. In a moment the other mode takes this decision away from you and makes it off the sound of your voice.',
  },

  queueSlow: {
    title: 'Now the slow read — and why we ask for it',
    tone: 'why',
    body: [
      'The line is now in pieces with a marker between them. This is not about speaking slowly. It is about giving us pieces we can lift out and use inside OTHER sentences.',
      'So: leave a clear beat at each marker, and say each piece FLAT AND EVEN. No rising at the end, no leaning on a word, same pitch and pace for all three.',
      'Same gesture as before: you are still recording, and NEXT closes each slow read and brings the next one.',
      'Nothing here is listening for you to finish, so take your time — about a second at each marker is fine in this mode. That changes later, and you will feel it change.',
    ],
    watch: 'A piece that "goes somewhere" sounds wrong everywhere it lands. That is what you are about to hear.',
  },

  queueCuts: {
    title: 'This is where we cut it',
    tone: 'why',
    body: [
      'That is your actual take, with the actual cut lines on it. The shaded blocks are what we keep.',
      'Tap PLAY on any piece. That is exactly what a learner hears if that piece turns up on its own — no context, no run-up, nothing to hide behind.',
    ],
    watch: 'If it found the wrong number of pieces, it will say so and tell you which way it went wrong. That is feedback, not failure. Record it again.',
  },

  queueReview: {
    title: 'The point of all of it',
    tone: 'why',
    body: [
      'Every sentence below is your own voice, cut up and stuck back together. You never said any of them.',
      'If they sound like one person saying one sentence, your slow read was neutral enough. If a word jumps out, or the pitch steps up and down between the pieces, that is the thing to fix.',
      'This is the only feedback that has ever really worked, because it is not an opinion — it is the actual thing the learner will hear.',
    ],
    watch: 'Try the slow ones again and listen to these once more. The difference between a take that works and one that does not is smaller than you would think, and completely audible.',
  },

  switchMode: {
    title: 'Now the other mode — press it yourself',
    tone: 'do',
    body: [
      'Back to the mode screen. This time tap MODE 1: NEW COURSE.',
      'This is continuous recording. You press record ONCE, at the start, and then you just read. The tool listens, and when it hears you stop, it saves that take and moves the autocue on by itself.',
      'That is a real difference in what is being asked of you, and it is worth feeling rather than being told.',
    ],
    nudge: 'This time we want Mode 1: New Course — the continuous one.',
  },

  scriptRun: {
    title: 'Nothing to press — it moves off your voice',
    tone: 'do',
    body: [
      'Press START RECORDING once. Then read each line as it arrives, and stop between them. Do not press anything else.',
      'Watch the meter and the words under it: Speaking… while it hears you, Listening… when it does not. When it has been quiet for long enough, it takes what you just said, keeps it, and moves you on.',
      'Two ordinary lines first, then two slow ones. Read them as they come.',
    ],
    watch: 'Here is the thing to actually notice: it decides when you are finished. Trail off, or take a breath in the middle, and it will move on while you are still talking — and nothing on screen will tell you that it has.',
  },

  scriptConsequence: {
    title: 'What just happened to you',
    tone: 'watch',
    body: [
      'That is the honest count: how many takes the tool kept, and which line each one landed on.',
      'If a line collected more than one take, you paused long enough in the middle of it that the tool thought you had finished — it saved half a phrase and moved you on. If you kept reading, everything after that went into the wrong slot, and you would not have known.',
      'That is how a recordist loses the thread in this mode. Not by doing anything obviously wrong.',
    ],
  },

  beatWindow: {
    title: 'The one number worth carrying',
    tone: 'why',
    body: [
      'The beat you leave has to live between two walls, and they are close together.',
      'Too short and we cannot tell where one piece ended, so two pieces come out fused. Too long and the tool thinks you have finished the whole line and moves on without you.',
      'In the phrase-by-phrase mode only the bottom wall exists, so a generous pause is free. In continuous mode both walls are live — aim for about half a second, and make it definite rather than long.',
    ],
    watch: 'This is the single difference that catches people between the two modes, and it is why we made you do both.',
  },

  done: {
    title: 'That is the whole tool',
    tone: 'why',
    body: [
      'You have used both modes, switched between them yourself, seen where your takes get cut, and heard your own pieces inside sentences you never said.',
      'Two things to carry into a real session: be a person talking, not a person reading; and keep your slow-read pieces flat and even, because they are going to turn up somewhere you did not choose.',
      'Nothing you did here was kept. Close this and open your real recording set.',
    ],
  },
}

/** Small labelled facts the coach can pin next to a control. */
export const HINTS = {
  manualAdvance: 'Phrase-by-phrase: the mic stays open and NEXT closes each take. The autocue waits for you — nothing moves on its own.',
  autoAdvance: 'Continuous: the autocue moves itself when it hears you stop. NEXT and PREVIOUS still work, but you should not need them.',
  calibrating: 'It is measuring your room before it goes live, so a room that cannot be split gets caught now rather than at the end of a session.',
  nothingSaved: 'Practice — nothing is saved',
}
