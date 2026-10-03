const test = require('node:test')
const assert = require('node:assert')
const { isJourneyPath } = require('./journey-paths.cjs')

test('journey surfaces are flagged', () => {
  for (const f of [
    'src/views/RecordistRoom.vue', 'src/views/RecordistRoom.coldStart.test.js', 'src/components/RecordDoor.vue',
    'src/components/production/autocue/recording/RecordingControls.vue', 'src/services/recordingApi.js',
    'src/views/NetworkBuilder.vue', 'src/views/PodDetailView.vue', 'src/router/index.js', 'vercel.json',
    'services/voice-engine/recordist-router.cjs', 'services/recording-upload-helpers.cjs',
    'services/course-builder/routes/build.cjs', 'e2e/booth-artists-day/artists-day.spec.js',
    'docs/pods/proofread-notes.md',
    // imports of the journey views (review #290)
    'src/composables/useTapRecorder.js', 'src/composables/useTapRecorder.margins.test.js', 'src/composables/useContinuousRecorder.ts',
    'src/composables/useStoredClip.js', 'src/composables/useRecordistQueue.js', 'src/composables/useAudioUpload.ts',
    'src/composables/useAutocueState.js', 'src/views/recordist/booth-settings.js', 'src/components/production/autocue/AutocueStudio.vue',
    'src/lib/recordistNames.js', 'src/lib/servingPod.js', 'src/utils/textDirection.js',
  ]) assert.ok(isJourneyPath(f), `${f} should be a journey path`)
})

test('internal tooling is not flagged', () => {
  for (const f of [
    'CLAUDE.md', 'tools/promote-staging.cjs', 'e2e/booth-artists-day/run.sh', 'e2e/booth-artists-day/ensure-staging.sh',
    'services/tts-service.cjs', 'ops/systemd/ssi-auto-deploy.service', 'vite.config.js', 'services/course-builder/lib/validation.cjs',
  ]) assert.ok(!isJourneyPath(f), `${f} should not be a journey path`)
})

test('a promotion with a fresh green verdict still holds when only a recording composable changed (review #290)', () => {
  const { decide } = require('../promote-staging.cjs')
  const d = decide({
    mainSha: 'a'.repeat(40), stagingSha: 'b'.repeat(40), mainIsAncestor: true, changedFiles: ['src/composables/useTapRecorder.js'],
    verdict: { sha: 'b'.repeat(40), rc: 0, at: '2026-10-03T02:10:00Z' }, approvedSha: null, now: Date.parse('2026-10-03T06:00:00Z'),
  })
  assert.strictEqual(d.kind, 'journey'); assert.deepStrictEqual(d.journey, ['src/composables/useTapRecorder.js'])
})
