/**
 * Generation Monitor Components
 *
 * Vue 3 components for real-time course generation pipeline monitoring.
 * Provides full visibility into browser spawning, agent execution, and seed completion.
 *
 * Usage:
 *   import { GenerationMonitor } from '@/components/generation'
 *   <GenerationMonitor :course-code="courseCode" />
 *
 * Or import individual components:
 *   import { PipelineProgress, PhaseDetail, BrowserLane, SeedGrid, EventLog } from '@/components/generation'
 */

export { default as GenerationMonitor } from './GenerationMonitor.vue'
export { default as PipelineProgress } from './PipelineProgress.vue'
export { default as PhaseDetail } from './PhaseDetail.vue'
export { default as BrowserLane } from './BrowserLane.vue'
export { default as SeedGrid } from './SeedGrid.vue'
export { default as EventLog } from './EventLog.vue'
