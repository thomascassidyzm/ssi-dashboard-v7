const path = require('path')

// The probe writes exactly where tools/seed1-listen/server.cjs reads, so a fresh
// measurement re-ranks the live listening page with no copy step. Same env var,
// same default, deliberately — if these two ever disagree the page silently serves
// a stale ranking, which is the failure this shares one constant to prevent.
const REPO = path.join(__dirname, '..', '..', '..')
const DATA_DIR = process.env.SEED1_DATA_DIR || path.join(REPO, 'scripts', 'fra-seed1-listen')

module.exports = {
  REPO,
  DATA_DIR,
  envPath: path.join(REPO, '.env'),
  psqlEnvPath: path.join(REPO, '.env.psql'),
  manifest: c => path.join(DATA_DIR, `manifest-${c}.json`),
  suspicion: c => path.join(DATA_DIR, `suspicion-${c}.json`),
  measurements: c => path.join(DATA_DIR, `measurements-${c}.json`),
  calibration: path.join(DATA_DIR, 'calibration.json')
}
