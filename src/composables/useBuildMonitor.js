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
  const messages = ref([])
  const isConnected = ref(false)
  const lastRefresh = ref(null)

  let realtimeChannel = null
  let fallbackInterval = null

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
      const { data, error } = await supabase
        .from('course_seeds')
        .select('seed_number, decomposed_at, approved_at')
        .eq('course_code', code)
        .order('seed_number', { ascending: true })
      if (!error && data) {
        seedGrid.value = data
      }
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

      const activeJob = activeJobs?.[0] || null
      buildStatus.value = {
        active: !!activeJob,
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
          is_running: data.quality_rules?.build_log?.is_running || false
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
      fetchBuildStatus(code),
      fetchPipeline(code),
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
        fetchMessages(c)
      }
    }, 30000)
  }

  function stopFallbackPolling() {
    if (fallbackInterval) {
      clearInterval(fallbackInterval)
      fallbackInterval = null
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
    messages,
    isConnected,
    lastRefresh,

    // Actions
    refresh,
    start,
    stop
  }
}
