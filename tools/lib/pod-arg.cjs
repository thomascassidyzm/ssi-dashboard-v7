// Shared CLI pod-slug parsing for pod tooling (breakdown-flat/fine, audit-fine-seams).
// `--pod=pod-1` selects a non-default pod; omitted → 'pod-0' (existing invocations unchanged).
function parsePod(argv, def = 'pod-0') {
  const flag = argv.find((a) => a.startsWith('--pod='))
  return flag ? flag.slice('--pod='.length) : def
}

module.exports = { parsePod }
