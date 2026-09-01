// Where a tool's machine-generated evidence goes: OUT of the repo tree.
// Tom's ruling 2026-09-01 — 278 MB of tracked logs under docs/ made every
// `git worktree add` cost ~300 MB, which was the estate's disk churn (job #625).
// Rationale and the store layout: docs/EVIDENCE.md.
const path = require('path')
const fs = require('fs')
const os = require('os')

const ROOT = process.env.SSI_EVIDENCE_ROOT ||
  path.join(os.homedir(), 'ssi-evidence', 'ssi-dashboard-v7')

// evidencePath('docs/pods/foo-applied-log.json') -> absolute path in the store,
// with the directory created. Pass the path the file WOULD have had in the repo,
// so the store mirrors the repo and MANIFEST.tsv keeps meaning.
function evidencePath(repoRelative) {
  const out = path.join(ROOT, repoRelative)
  fs.mkdirSync(path.dirname(out), { recursive: true })
  return out
}

module.exports = { ROOT, evidencePath }
