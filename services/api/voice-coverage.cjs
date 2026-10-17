/** Saved summary only: opening the dashboard never queries the database.
 * GET /api/admin/voice-coverage                    the whole summary
 * GET /api/admin/voice-coverage?view=languages     by language, by voice (human vs TTS, speech-check flags)
 * GET /api/admin/voice-coverage?course=spa_for_eng by course, by voice (seed bands, offerable)
 */
const fs = require('fs/promises')
const { SUMMARY_PATH } = require('../shared/voice-coverage.cjs')

function slice(data, { view, course } = {}) {
  const head = { schemaVersion: data.schemaVersion, startedAt: data.startedAt, generatedAt: data.generatedAt,
    offerableRule: data.offerableRule, failingSpeechCheck: data.failingSpeechCheck }
  if (view === 'languages') return { ...head, languageCoverage: data.languageCoverage || null, voiceNames: data.voiceNames }
  if (course) {
    const row = (data.courses || []).find(c => c.courseCode === course)
    return row ? { ...head, course: row, voiceNames: data.voiceNames } : null
  }
  return data
}

function handler(file = SUMMARY_PATH) {
  return async (req, res) => {
    try {
      const data = JSON.parse(await fs.readFile(file, 'utf8'))
      const body = slice(data, { view: req.query?.view, course: req.query?.course })
      if (!body) return res.status(404).json({ error: `No coverage measured for ${req.query.course}.` })
      res.json({ ...body, stale: Date.now() - Date.parse(data.generatedAt) > 12 * 60 * 60 * 1000 })
    } catch (e) {
      res.status(503).json({ error: e.code === 'ENOENT' ? 'Coverage has not been measured yet.' : 'Coverage summary is unavailable.' })
    }
  }
}
module.exports = { handler, slice }
