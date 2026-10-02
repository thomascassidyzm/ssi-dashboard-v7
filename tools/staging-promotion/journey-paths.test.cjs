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
  ]) assert.ok(isJourneyPath(f), `${f} should be a journey path`)
})

test('internal tooling is not flagged', () => {
  for (const f of [
    'CLAUDE.md', 'tools/promote-staging.cjs', 'e2e/booth-artists-day/run.sh', 'e2e/booth-artists-day/ensure-staging.sh',
    'services/tts-service.cjs', 'ops/systemd/ssi-auto-deploy.service', 'vite.config.js', 'services/course-builder/lib/validation.cjs',
  ]) assert.ok(!isJourneyPath(f), `${f} should not be a journey path`)
})
