/**
 * useBuildMonitor — Direct Supabase queries with polling
 *
 * Replaces 5 polling endpoints that previously routed through ngrok:
 *   /api/stats/:code, /api/build/status/:code, /api/build/seed-grid/:code,
 *   /api/build/pipeline/:code, /api/orchestrator/messages/:code
 *
 * Polls every 30s (5s when chat panel is open). No Realtime/WebSocket.
 */

import { ref, watch, onUnmounted, toValue } from 'vue'
import { supabase, isConfigured, getCourseStats } from '@/services/supabase'

export function useBuildMonitor(courseCodeRef) {
  // Reactive state
  const stats = ref({ seeds: 0, completeSeeds: 0, legos: 0, practicePhrases: 0, audio: 0 })
  const seedGrid = ref([])
  const pipeline = ref({ stage: null, is_running: false })
  const messages = ref([])
  const isConnected = ref(true) // always "connected" — we're polling
  const lastRefresh = ref(null)

  let pollInterval = null
  let pollIntervalMs = 30000

  // ── Fetch functions (direct Supabase queries) ──

  async function fetchStats(code) {
    if (!supabase || !code) return
    try {
      const result = await getCourseStats(code)
      stats.value = result
    } catch (e) {
      console.warn('[BuildMonitor] fetchStats error:', e.message)
    }
  }

  async function fetchSeedGrid(code) {
    if (!supabase || !code) return
    try {
      const [seedsRes, legosRes, phrasesRes] = await Promise.all([
        supabase
          .from('course_seeds')
          .select('seed_number, decomposed_at, approved_at, flagged_at')
          .eq('course_code', code)
          .order('seed_number', { ascending: true }),
        supabase
          .from('course_legos')
          .select('seed_number, lego_index, is_new')
          .eq('course_code', code),
        supabase
          .from('course_practice_phrases')
          .select('seed_number, lego_index, phrase_role')
          .eq('course_code', code)
      ])

      if (seedsRes.error || !seedsRes.data) return

      const legosBySeed = {}
      for (const l of legosRes.data || []) legosBySeed[l.seed_number] = (legosBySeed[l.seed_number] || 0) + 1
      const phrasesBySeed = {}
      for (const p of phrasesRes.data || []) phrasesBySeed[p.seed_number] = (phrasesBySeed[p.seed_number] || 0) + 1

      const newLegos = new Set()
      for (const l of legosRes.data || []) {
        if (l.is_new) newLegos.add(l.seed_number + ':' + l.lego_index)
      }
      const useCounts = {}
      for (const p of phrasesRes.data || []) {
        if (p.phrase_role === 'use') {
          const key = p.seed_number + ':' + p.lego_index
          if (newLegos.has(key)) useCounts[key] = (useCounts[key] || 0) + 1
        }
      }
      const underThreshold = new Set()
      for (const key of newLegos) {
        const seedNum = parseInt(key.split(':')[0])
        if (seedNum > 3 && (useCounts[key] || 0) < 4) underThreshold.add(seedNum)
      }

      seedGrid.value = seedsRes.data.map(s => {
        const legos = legosBySeed[s.seed_number] || 0
        const phrases = phrasesBySeed[s.seed_number] || 0
        let status
        if (s.flagged_at) status = 'flagged'
        else if (s.decomposed_at && underThreshold.has(s.seed_number)) status = 'under-threshold'
        else if (s.approved_at) status = 'complete'
        else if (s.decomposed_at) status = 'drafted'
        else if (legos > 0) status = 'building'
        else status = 'empty'
        return { seed: s.seed_number, status, legos, phrases }
      })
    } catch (e) {
      console.warn('[BuildMonitor] fetchSeedGrid error:', e.message)
    }
  }

  async function fetchPipeline(code) {
    if (!supabase || !code) return
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('status, quality_rules')
        .eq('course_code', code)
        .single()
      if (!error && data) {
        pipeline.value = {
          stage: data.status,
          is_running: data.quality_rules?.build_log?.is_running || false,
          finalPassCompleted: data.quality_rules?.final_pass_completed || false
        }
      }
    } catch (e) {
      console.warn('[BuildMonitor] fetchPipeline error:', e.message)
    }
  }

  async function fetchMessages(code) {
    if (!supabase || !code) return
    try {
      const { data, error } = await supabase
        .from('orchestrator_messages')
        .select('*')
        .eq('course_code', code)
        .order('created_at', { ascending: true })
        .limit(200)
      if (!error && data) {
        messages.value = data
      }
    } catch (e) {
      console.warn('[BuildMonitor] fetchMessages error:', e.message)
    }
  }

  // ── Refresh all data ──

  async function refresh() {
    const code = toValue(courseCodeRef)
    if (!code || !isConfigured()) return
    await Promise.all([
      fetchStats(code),
      fetchSeedGrid(code),
      fetchPipeline(code),
      fetchMessages(code)
    ])
    lastRefresh.value = new Date().toISOString()
  }

  // ── Polling ──

  function startPolling(code) {
    if (pollInterval) return
    pollInterval = setInterval(() => {
      const c = code || toValue(courseCodeRef)
      if (c) {
        fetchStats(c)
        fetchSeedGrid(c)
        fetchPipeline(c)
        fetchMessages(c)
      }
    }, pollIntervalMs)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  function setFastPolling(fast) {
    const newInterval = fast ? 5000 : 30000
    if (newInterval === pollIntervalMs) return
    pollIntervalMs = newInterval
    if (pollInterval) {
      stopPolling()
      const code = toValue(courseCodeRef)
      if (code) startPolling(code)
    }
  }

  // ── Lifecycle ──

  function start() {
    const code = toValue(courseCodeRef)
    if (!code || !isConfigured()) return
    refresh()
    startPolling(code)
  }

  function stop() {
    stopPolling()
  }

  // Watch for courseCode changes
  if (typeof courseCodeRef === 'object' && 'value' in courseCodeRef) {
    watch(courseCodeRef, (newCode, oldCode) => {
      if (oldCode) stop()
      if (newCode) start()
    }, { immediate: true })
  }

  onUnmounted(() => {
    stop()
  })

  return {
    stats,
    seedGrid,
    pipeline,
    messages,
    isConnected,
    lastRefresh,

    refresh,
    start,
    stop,
    setFastPolling
  }
}
