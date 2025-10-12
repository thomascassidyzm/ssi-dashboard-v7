/**
 * Quality Review Dashboard - Component Exports
 *
 * Central export point for all quality review components and utilities
 */

// Core Components
export { default as QualityDashboard } from './QualityDashboard.vue'
export { default as SeedQualityReview } from './SeedQualityReview.vue'
export { default as PromptEvolutionView } from './PromptEvolutionView.vue'
export { default as CourseHealthReport } from './CourseHealthReport.vue'

// Mock Data Generator
export { default as mockData } from './mockData.js'
export {
  generateSeed,
  generateSeeds,
  generateAttempts,
  generateQualityOverview,
  generateLearnedRules,
  generateExperimentalRules,
  generateHealthReport
} from './mockData.js'

/**
 * Example usage:
 *
 * import { QualityDashboard, mockData } from '@/components/quality'
 *
 * // Use in component
 * <QualityDashboard courseCode="spanish_668seeds" />
 *
 * // Generate test data
 * const seeds = mockData.generateSeeds(668)
 */
