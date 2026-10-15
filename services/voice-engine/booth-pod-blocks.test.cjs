/**
 * booth-pod-blocks.test.cjs — the booth's blocks are the pods with lines for
 * this voice, in course order (job #682). Run: node --test services/voice-engine/booth-pod-blocks.test.cjs
 */
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { podBlocksFor } = require('./booth-pod-blocks.cjs')

const line = (podId, recorded = false) => ({ podId, recorded })

test('pods are ordered by pod_order, and counted per pod', () => {
  const pods = [
    { id: 'c:pod-2', slug: 'pod-2', pod_type: 'core', pod_order: 2 },
    { id: 'c:pod-1', slug: 'pod-1', pod_type: 'core', pod_order: 1 },
  ]
  const blocks = podBlocksFor([line('c:pod-2'), line('c:pod-1', true), line('c:pod-1')], pods)
  assert.deepStrictEqual(blocks.map((b) => [b.slug, b.total, b.recorded]), [['pod-1', 2, 1], ['pod-2', 1, 0]])
})

test('a pod with no line for this voice is not a block of theirs', () => {
  const pods = [
    { id: 'c:pod-1', slug: 'pod-1', pod_type: 'core', pod_order: 1 },
    { id: 'c:gated', slug: 'gated-2026-08-06', pod_type: 'core', pod_order: 0 },
  ]
  assert.deepStrictEqual(podBlocksFor([line('c:pod-1')], pods).map((b) => b.slug), ['pod-1'])
})

test('without pod_order: core before others, then slugs with numbers read as numbers', () => {
  const pods = [
    { id: 'c:guess', slug: 'guess-i-love-you', pod_type: 'choice', pod_order: null },
    { id: 'c:pod-10', slug: 'pod-10', pod_type: 'core', pod_order: null },
    { id: 'c:pod-2', slug: 'pod-2', pod_type: 'core', pod_order: null },
  ]
  const blocks = podBlocksFor([line('c:guess'), line('c:pod-10'), line('c:pod-2')], pods)
  assert.deepStrictEqual(blocks.map((b) => b.slug), ['pod-2', 'pod-10', 'guess-i-love-you'])
})

test('a pod with a pod_order comes before one without', () => {
  const pods = [
    { id: 'c:pod-1', slug: 'pod-1', pod_type: 'core', pod_order: null },
    { id: 'c:health', slug: 'health', pod_type: 'choice', pod_order: 5 },
  ]
  assert.deepStrictEqual(podBlocksFor([line('c:pod-1'), line('c:health')], pods).map((b) => b.slug), ['health', 'pod-1'])
})
