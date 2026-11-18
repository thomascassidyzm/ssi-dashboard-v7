// services/shared/prometheus-text.cjs
//
// Read a handful of numbers off a Prometheus exposition-format scrape without
// pulling in prom-client. Used by production-api's /api/admin/db-health, which
// scrapes the Supabase Metrics API for the "is the DB healthy right now?" story.
// Pure: text in, samples out.

/**
 * Parse exposition text into [{ name, labels, value }] samples.
 * Comment and blank lines are skipped; a sample whose value is not a finite
 * number (NaN, +Inf) is dropped rather than poisoning a sum.
 */
function parsePrometheusText(text) {
  const samples = []
  const lines = text.split('\n')
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue
    // Metric line: name{label="v",label="v"} 123 [timestamp]
    // Or: name 123
    const m = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+([-+0-9.eEnNaIfF]+)/)
    if (!m) continue
    const name = m[1]
    const labelBlock = m[2] || ''
    const valueStr = m[3]
    const value = Number(valueStr)
    if (!Number.isFinite(value)) continue
    const labels = {}
    if (labelBlock) {
      const re = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\]|\\.)*)"/g
      let lm
      while ((lm = re.exec(labelBlock)) !== null) {
        labels[lm[1]] = lm[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
      }
    }
    samples.push({ name, labels, value })
  }
  return samples
}

/** Sum every sample of `name` (optionally filtered by label predicate); null when none matched. */
function sumMetric(samples, name, labelPredicate = null) {
  let total = 0
  let matched = 0
  for (const s of samples) {
    if (s.name !== name) continue
    if (labelPredicate && !labelPredicate(s.labels)) continue
    total += s.value
    matched++
  }
  return matched > 0 ? { value: total, count: matched } : null
}

/** First sample of `name` — for gauges that have one series; null when absent. */
function firstMetric(samples, name, labelPredicate = null) {
  for (const s of samples) {
    if (s.name !== name) continue
    if (labelPredicate && !labelPredicate(s.labels)) continue
    return s.value
  }
  return null
}

module.exports = { parsePrometheusText, sumMetric, firstMetric }
