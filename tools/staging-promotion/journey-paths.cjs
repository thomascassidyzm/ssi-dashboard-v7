'use strict'
// THE COMMUNITY BUILDER JOURNEY, as file paths (Tom, 2026-10-02: a change touching the record /
// proofread / build cards, recording or building is HELD for his look on staging; internal
// tooling moves on the green check alone). This is the ONE list the daily promotion
// (tools/promote-staging.cjs) consults, and it errs on the side of flagging: a false hold costs
// Tom one look, a false pass puts an unseen change in front of community users. Add a pattern
// when a new journey surface appears; the test (journey-paths.test.cjs) pins a sample of each.
const JOURNEY_PATH_PATTERNS = [
  // The booth and recordist surface: /r/:voiceId, /my-recording, /record, the cue/record UI.
  /^src\/views\/(Recordist|Record|MyRecording|AdminRecording|RecordingOptimizer)/,
  /^src\/components\/(RecordDoor|AudioRecorder)/,
  /^src\/components\/production\/autocue\/recording\//,
  /^src\/services\/recordingApi\.js$/,
  // What those views IMPORT is the journey too (review #290: a change to useTapRecorder.js alone
  // promoted past the hold, though RecordistRoom.vue runs on it). The recording composables, the
  // recordist view's own directory, the whole autocue tree, and the small libs/utils the
  // recordist, pod and build views pull in. Re-audit with: grep the imports of the views above.
  /^src\/composables\/(useTapRecorder|useContinuousRecorder|useStoredClip|useRecordistQueue|useAudioUpload|useAutocueState|autocue-)/,
  /^src\/views\/recordist\//,
  /^src\/components\/production\/autocue\//,
  /^src\/lib\/(recordistNames|podDisplayName|servingPod|podPlayQueue|podArcCompose|podAtoms|podEngine)/,
  /^src\/utils\/(textDirection|caretFromPoint|breakdownMarkers|voiceSlots)/,
  /^src\/components\/(PodCastPanel|explainer\/)/,
  // Build cards / pods / proofreading and the builder entrances.
  /^src\/views\/(NetworkBuilder|AppBuilds|PublicAndroidBuild|Pod|CanonicalPod)/,
  /proofread/i,
  // Routing, hosting and the staging/preview wiring decide what the journey even reaches.
  /^src\/router\//,
  /^vercel\.json$/,
  /^src\/services\/machineEnvironment\.js$/,
  // Server side of recording and building.
  /^services\/recording-/,
  /^services\/voice-engine\/recordist/,
  /^services\/shared\/(recordist|human-recorded)/,
  /^services\/(network-builder-api|builds-router|pod-voice-)/,
  /^services\/course-builder\/routes\/(build|seed-complete|translation|phrases-v3)\.cjs$/,
  // The check that guards the booth: its spec changing is the journey changing.
  /^e2e\/(booth-artists-day|recordist-back|pod-recording)\/.*\.spec\.js$/,
]

function isJourneyPath(file) {
  return JOURNEY_PATH_PATTERNS.some((re) => re.test(file))
}

module.exports = { JOURNEY_PATH_PATTERNS, isJourneyPath }
