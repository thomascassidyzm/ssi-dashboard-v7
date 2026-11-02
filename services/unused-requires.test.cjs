/**
 * unused-requires.test.cjs — no services file carries a require() binding it
 * never uses. The elegance pass of 2026-11-02 found 22 dead imports in nine
 * course-builder route files by hand; this keeps the count from growing.
 *
 * BASELINE below is the debt as of job #101: every name in it was found unused
 * by the scanner and left in place because a require can carry side effects
 * and nobody has yet read why each one is there (Chesterton's fence). The list
 * can only SHRINK: a new unused name anywhere fails at once, and a baseline
 * entry that is no longer unused fails too, telling you to delete the line.
 * Remove a dead name, remove its baseline entry, done.
 *
 * Run: npx vitest run services/unused-requires
 */
import { describe, it, expect } from 'vitest'
const path = require('path')
const { scan, unusedRequires } = require('./shared/unused-requires.cjs')

const BASELINE = {
  'audio-generation-planner.cjs': ['cadenceService'],
  'audio-intelligence/gate-stack.cjs': ['path'],
  'audio-repair-core.cjs': ['canonicalVoiceId'],
  'audio-reuse-planner.cjs': ['PROVIDER_PREFIX'],
  'audio-veracity.cjs': ['SYNTHESIS_CUES'],
  'briefs/backfill-phrases.cjs': ['loadCondensedMethodology'],
  'briefs/final-pass-orchestrator.cjs': ['getGoldenSeedCount', 'buildGrammarChecklist'],
  'briefs/final-pass.cjs': ['getGoldenSeedCount'],
  'briefs/redo.cjs': ['buildCrossCourseSummaries'],
  'course-builder/lib/phrase-structure.cjs': ['getTargetLang'],
  'course-builder/lib/text-normalization.cjs': ['isChinese'],
  'course-builder/lib/validation.cjs': ['getGoldenSeedCount', 'normalizeForZUT'],
  'course-builder/routes/qa.cjs': ['spawnParallelQAAgent'],
  'course-builder/routes/seed-complete.cjs': ['isBlockedByCheckpoint', 'getCheckpointStatus', 'getCheckpointConfig', 'isCheckpointRequired', 'approveCheckpoint', 'isQAPending', 'CHECKPOINT_SEEDS', 'QA_DRIFT_THRESHOLD'],
  'manifest-generator.cjs': ['generateSampleId', 'normalizeText'],
  'phases/phase1-translation/server.cjs': ['execSync', 'getParallelizationPattern'],
  'phases/phase2-conflict-resolution/server.cjs': ['path'],
  'phases/phase3-basket-generation/server.cjs': ['SEED_COUNTS'],
  'phases/phase8-audio-v13.cjs': ['claudeChat', 'HAIKU_MODEL', 'bulkGetRegenerationCounts', 'databaseToManifest', 'tryCanonicalVoiceId'],
  'preview-generation-service.cjs': ['s3Service', 'uuidService'],
  's3-deploy-service.cjs': ['ListObjectsV2Command'],
  'shared/spawn-agent-terminal.cjs': ['path'],
  'shared/voicing-policy.cjs': ['baseLanguageOfCastKey'],
  'supabase-client.cjs': ['uuidNormalizeText'],
  'voice-engine/recordist-queue.cjs': ['normalizeForAudio', 'isCloneStandInCourse'],
  'voice-engine/recordist-router.cjs': ['takeGChunks'],
  'voice-engine/team-router.cjs': ['mintVoiceId'],
  'voicelab/speakers.cjs': ['store'],
}

describe('unused require bindings in services/', () => {
  it('scanner: strings, comments, destructuring, spread, side-effect requires', () => {
    expect(unusedRequires("const a = require('a')\nconst { b, c: d } = require('x')\nconsole.log(b, d)")).toEqual(['a'])
    expect(unusedRequires("const fs = require('fs')\n// fs is mentioned here\nconst s = 'fs'\nconst t = \`\${s} fs\`")).toEqual(['fs'])
    expect(unusedRequires("const fs = require('fs')\nconst t = \`\${fs.x}\`")).toEqual([])
    expect(unusedRequires("const tier = require('t')\nmodule.exports = { ...tier.T }")).toEqual([])
    expect(unusedRequires("const q = require('q')\nconst re = /[\"']/g\nq(re)")).toEqual([])
    expect(unusedRequires("require('./side-effect.cjs')")).toEqual([])
  })

  it('finds no unused require outside the shrinking baseline', () => {
    const found = scan(path.join(__dirname))
    const newOffences = {}
    const staleBaseline = {}
    for (const [file, names] of Object.entries(found)) {
      const allowed = new Set(BASELINE[file] || [])
      const extra = names.filter(n => !allowed.has(n))
      if (extra.length) newOffences[file] = extra
    }
    for (const [file, names] of Object.entries(BASELINE)) {
      const still = new Set(found[file] || [])
      const gone = names.filter(n => !still.has(n))
      if (gone.length) staleBaseline[file] = gone
    }
    expect(newOffences, 'new unused require bindings — use them or remove them').toEqual({})
    expect(staleBaseline, 'baseline entries no longer unused — delete them from BASELINE').toEqual({})
  })
})
