/** Saved summary only: opening the dashboard never queries the database. */
const fs = require('fs/promises')
const { SUMMARY_PATH } = require('../shared/voice-coverage.cjs')
function handler(file = SUMMARY_PATH) {
  return async (req, res) => {
    try {
      const data = JSON.parse(await fs.readFile(file, 'utf8'))
      res.json({ ...data, stale: Date.now() - Date.parse(data.generatedAt) > 12 * 60 * 60 * 1000 })
    } catch (e) {
      res.status(503).json({ error: e.code === 'ENOENT' ? 'Coverage has not been measured yet.' : 'Coverage summary is unavailable.' })
    }
  }
}
module.exports = { handler }
