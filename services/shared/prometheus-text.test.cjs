// Characterisation test for the Prometheus scrape reader behind /api/admin/db-health.
// Written against the helpers as they lived inline in production-api.cjs, then
// run against the extracted module: same input, same samples.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { parsePrometheusText, sumMetric, firstMetric } = require('./prometheus-text.cjs')

const SCRAPE = [
  '# HELP pg_stat_database_blks_hit_total Blocks hit',
  '# TYPE pg_stat_database_blks_hit_total counter',
  'pg_stat_database_blks_hit_total{datname="postgres",server="db:5432"} 120 1700000000000',
  'pg_stat_database_blks_hit_total{datname="template1"} 5',
  'pg_settings_max_connections 200',
  'weird_metric{label="say \\"hi\\" \\\\ back"} 1',
  'nan_metric NaN',
  'inf_metric +Inf',
  '',
  'not a metric line at all',
].join('\n')

test('parses names, labels, values; skips comments, blanks, NaN and Inf', () => {
  const samples = parsePrometheusText(SCRAPE)
  assert.deepEqual(samples.map(s => s.name), [
    'pg_stat_database_blks_hit_total',
    'pg_stat_database_blks_hit_total',
    'pg_settings_max_connections',
    'weird_metric',
  ])
  assert.deepEqual(samples[0].labels, { datname: 'postgres', server: 'db:5432' })
  assert.equal(samples[0].value, 120)
  assert.deepEqual(samples[2].labels, {})
  assert.equal(samples[3].labels.label, 'say "hi" \\ back')
})

test('sumMetric sums matching series, honours the label predicate, null when nothing matches', () => {
  const samples = parsePrometheusText(SCRAPE)
  assert.deepEqual(sumMetric(samples, 'pg_stat_database_blks_hit_total'), { value: 125, count: 2 })
  assert.deepEqual(
    sumMetric(samples, 'pg_stat_database_blks_hit_total', l => l.datname === 'postgres'),
    { value: 120, count: 1 },
  )
  assert.equal(sumMetric(samples, 'absent_metric'), null)
})

test('firstMetric returns the first matching value or null', () => {
  const samples = parsePrometheusText(SCRAPE)
  assert.equal(firstMetric(samples, 'pg_settings_max_connections'), 200)
  assert.equal(firstMetric(samples, 'pg_stat_database_blks_hit_total', l => l.datname === 'template1'), 5)
  assert.equal(firstMetric(samples, 'absent_metric'), null)
})
