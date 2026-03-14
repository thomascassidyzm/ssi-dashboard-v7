/**
 * useBuildMonitor — Direct Supabase queries + Realtime subscriptions
 *
 * Replaces 5 polling endpoints that previously routed through ngrok:
 *   /api/stats/:code, /api/build/status/:code, /api/build/seed-grid/:code,
 *   /api/build/pipeline/:code, /api/orchestrator/messages/:code
 *
 * Zero polling when Realtime is connected. Falls back to 30s polling on disconnect.
 */

import { ref, watch, onUnmounted, toValue } from 'vue'
import { supabase, isConfigured, getCourseStats } from '@/services/supabase'

export function useBuildMonitor(courseCodeRef) {
  // Reactive state
  const stats = ref({ seeds: 0, completeSeeds: 0, legos: 0, practicePhrases: 0, audio: 0 })
  const seedGrid = ref([])
  const buildStatus = ref({ active: false, progress: null, build: null, parallel: null })
  const pipeline = ref({ stage: null, is_running: false })
  const phaseStatus = ref({ translate: null, 'build-team': null, 'final-pass': null, 'gender-prep': null })
  const messages = ref([])
  const isConnected = ref(false)
  const lastRefresh = ref(null)

  let realtimeChannel = null
  let fallbackInterval = null
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
      // Fetch seeds, legos (with is_new + index), and phrases (with role + index) in parallel
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

      // Count legos and phrases per seed
      const legosBySeed = {}
      for (const l of legosRes.data || []) legosBySeed[l.seed_number] = (legosBySeed[l.seed_number] || 0) + 1
      const phrasesBySeed = {}
      for (const p of phrasesRes.data || []) phrasesBySeed[p.seed_number] = (phrasesBySeed[p.seed_number] || 0) + 1

      // Build USE phrase counts per seed:lego for new LEGOs (data-driven threshold check)
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
      // Seeds where any new LEGO has < 4 USE phrases
      const underThreshold = new Set()
      for (const key of newLegos) {
        if ((useCounts[key] || 0) < 4) underThreshold.add(parseInt(key.split(':')[0]))
      }

      // Format seed grid — data-driven status distinguishes flagged from under-threshold
      seedGrid.value = seedsRes.data.map(s => {
        const legos = legosBySeed[s.seed_number] || 0
        const phrases = phrasesBySeed[s.seed_number] || 0
        let status
        if (s.flagged_at) status = 'flagged'                                        // explicitly flagged — needs redo
        else if (s.decomposed_at && underThreshold.has(s.seed_number)) status = 'under-threshold' // needs phrase backfill
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

  async function fetchBuildStatus(code) {
    if (!supabase || !code) return
    try {
      // Count decomposed seeds
      const { count: decomposedCount } = await supabase
        .from('course_seeds')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', code)
        .not('decomposed_at', 'is', null)

      const { count: totalCount } = await supabase
        .from('course_seeds')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', code)

      // Check for active build jobs
      const { data: activeJobs } = await supabase
        .from('build_jobs')
        .select('status, pass, total_seeds, created_at')
        .eq('course_code', code)
        .in('status', ['running', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)

      // Check for completed final-pass jobs
      const { count: completedFinalPass } = await supabase
        .from('build_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', code)
        .eq('pass', 'final-pass')
        .eq('status', 'complete')

      const activeJob = activeJobs?.[0] || null
      buildStatus.value = {
        active: !!activeJob,
        finalPassCompleted: (completedFinalPass || 0) > 0,
        progress: {
          completed: decomposedCount || 0,
          total: totalCount || 0,
          isComplete: decomposedCount >= totalCount && totalCount > 0
        },
        build: activeJob ? {
          status: activeJob.status,
          pass: activeJob.pass,
          total_seeds: activeJob.total_seeds
        } : null,
        parallel: null
      }
    } catch (e) {
      console.warn('[BuildMonitor] fetchBuildStatus error:', e.message)
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

  async function fetchPhaseStatus(code) {
    if (!supabase || !code) return
    try {
      // Get all build_jobs for this course, most recent per pass
      const { data: jobs, error } = await supabase
        .from('build_jobs')
        .select('pass, status, created_at')
        .eq('course_code', code)
        .order('created_at', { ascending: false })

      if (error || !jobs) return

      // No data from DB (e.g. RLS blocks anon reads) — keep existing state
      if (jobs.length === 0) return

      // Most recent job per pass
      const latest = {}
      for (const job of jobs) {
        if (!latest[job.pass]) latest[job.pass] = job.status
      }

      phaseStatus.value = {
        translate: latest['translate'] || null,
        'build-team': latest['build-team'] || null,
        'final-pass': latest['final-pass'] || null,
        'backfill-phrases': latest['backfill-phrases'] || null,
        'component-backfill': latest['component-backfill'] || null,
        'gender-prep': latest['gender-prep'] || null
      }
    } catch (e) {
      console.warn('[BuildMonitor] fetchPhaseStatus error:', e.message)
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
      fetchBuildStatus(code),
      fetchPipeline(code),
      fetchPhaseStatus(code),
      fetchMessages(code)
    ])
    lastRefresh.value = new Date().toISOString()
  }

  // ── Realtime subscriptions ──

  function subscribe(code) {
    if (!supabase || !code) return
    unsubscribe()

    realtimeChannel = supabase
      .channel(`build-monitor:${code}`)
      // Seed changes → refresh grid + stats + build status
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'course_seeds',
        filter: `course_code=eq.${code}`
      }, () => {
        fetchSeedGrid(code)
        fetchStats(code)
        fetchBuildStatus(code)
      })
      // New LEGOs → refresh stats
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'course_legos',
        filter: `course_code=eq.${code}`
      }, () => {
        fetchStats(code)
      })
      // New messages → append
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orchestrator_messages',
        filter: `course_code=eq.${code}`
      }, (payload) => {
        if (payload.new) {
          messages.value = [...messages.value, payload.new]
        }
      })
      // Course updates → refresh pipeline
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'courses',
        filter: `course_code=eq.${code}`
      }, () => {
        fetchPipeline(code)
      })
      // Build job changes → refresh build status
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'build_jobs',
        filter: `course_code=eq.${code}`
      }, () => {
        fetchBuildStatus(code)
        fetchPhaseStatus(code)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          isConnected.value = true
          stopFallbackPolling()
          console.log('[BuildMonitor] Realtime connected')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          isConnected.value = false
          startFallbackPolling(code)
          console.warn('[BuildMonitor] Realtime disconnected, falling back to 30s poll')
        }
      })
  }

  function unsubscribe() {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
      isConnected.value = false
    }
  }

  // ── Fallback polling (30s) ──

  function startFallbackPolling(code) {
    if (fallbackInterval) return
    fallbackInterval = setInterval(() => {
      const c = code || toValue(courseCodeRef)
      if (c) {
        fetchStats(c)
        fetchSeedGrid(c)
        fetchBuildStatus(c)
        fetchPipeline(c)
        fetchPhaseStatus(c)
        fetchMessages(c)
      }
    }, pollIntervalMs)
  }

  function stopFallbackPolling() {
    if (fallbackInterval) {
      clearInterval(fallbackInterval)
      fallbackInterval = null
    }
  }

  // Switch between fast (5s) and normal (30s) polling — e.g. when chat panel is open
  function setFastPolling(fast) {
    const newInterval = fast ? 5000 : 30000
    if (newInterval === pollIntervalMs) return
    pollIntervalMs = newInterval
    // Restart polling with new interval
    if (fallbackInterval) {
      stopFallbackPolling()
      const code = toValue(courseCodeRef)
      if (code) startFallbackPolling(code)
    }
  }

  // ── Lifecycle ──

  function start() {
    const code = toValue(courseCodeRef)
    if (!code || !isConfigured()) return
    refresh()
    // Skip Realtime (requires replication config per table in Supabase dashboard).
    // Just poll every 30s — reliable and sufficient for a dashboard.
    startFallbackPolling(code)
  }

  function stop() {
    unsubscribe()
    stopFallbackPolling()
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
    // Reactive state
    stats,
    seedGrid,
    buildStatus,
    pipeline,
    phaseStatus,
    messages,
    isConnected,
    lastRefresh,

    // Actions
    refresh,
    start,
    stop,
    setFastPolling
  }
}
