// Shared CLI pod-slug parsing for pod tooling (breakdown-flat/fine, audit-fine-seams).
// `--pod=<slug>` selects a pod; omitted → 'pod-1', every course's core listening pod
// (Tom, 2026-09-13: there is only pod-1 now, then pods by topic).
function parsePod(argv, def = 'pod-1') {
  const flag = argv.find((a) => a.startsWith('--pod='))
  return flag ? flag.slice('--pod='.length) : def
}

module.exports = { parsePod }
