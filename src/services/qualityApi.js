import axios from 'axios'

// API Base URL - set this to your ngrok URL when running locally
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:54321'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  }
})

/**
 * Quality & Regeneration API Client
 *
 * Provides methods for interacting with the self-healing regeneration system:
 * - Quality reporting and analysis
 * - SEED-level regeneration and attempt tracking
 * - Prompt evolution and experimental rules
 */
export default {
  /**
   * Get quality report for entire course
   * Returns: quality scores, flagged SEEDs, attempt history
   */
  async getCourseQuality(courseCode) {
    const response = await api.get(`/api/courses/${courseCode}/quality`)
    return response.data
  },

  /**
   * Get detailed review for specific SEED
   * Returns: all attempts, quality scores, LEGOs, agent concerns
   */
  async getSeedReview(courseCode, seedId) {
    const response = await api.get(`/api/courses/${courseCode}/seeds/${seedId}/review`)
    return response.data
  },

  /**
   * Trigger regeneration for specific SEED(s)
   * @param {string} courseCode - Course identifier
   * @param {string[]} seedIds - Array of seed IDs to regenerate
   * @param {object} options - Additional options
   * @param {string} options.reason - Reason for regeneration (e.g., "low_quality", "iron_rule_violation")
   * @param {string} options.prompt_version - Prompt version to use (defaults to latest)
   * @returns {Promise} Job details for tracking
   */
  async regenerateSeeds(courseCode, seedIds, options = {}) {
    const response = await api.post(`/api/courses/${courseCode}/seeds/regenerate`, {
      seed_ids: seedIds,
      reason: options.reason || 'manual_regeneration',
      prompt_version: options.prompt_version
    })
    return response.data
  },

  /**
   * Get status of regeneration job
   * @param {string} courseCode - Course identifier
   * @param {string} jobId - Job ID returned from regenerateSeeds
   * @returns {Promise} Job status and results
   */
  async getRegenerationStatus(courseCode, jobId) {
    const response = await api.get(`/api/courses/${courseCode}/regeneration/${jobId}`)
    return response.data
  },

  /**
   * Accept current extraction attempt
   * Marks SEED as reviewed and accepted by human
   */
  async acceptSeed(courseCode, seedId) {
    const response = await api.post(`/api/courses/${courseCode}/seeds/${seedId}/accept`)
    return response.data
  },

  /**
   * Remove SEED from corpus
   * Marks as excluded, updates course metadata
   * @param {string} courseCode - Course identifier
   * @param {string} seedId - Seed to exclude
   * @param {string} reason - Reason for exclusion
   */
  async excludeSeed(courseCode, seedId, reason) {
    const response = await api.delete(`/api/courses/${courseCode}/seeds/${seedId}`, {
      data: { reason: reason || 'manual_removal' }
    })
    return response.data
  },

  /**
   * Get prompt evolution data
   * Returns: learned rules, versions, success rates
   */
  async getPromptEvolution(courseCode) {
    const response = await api.get(`/api/courses/${courseCode}/prompt-evolution`)
    return response.data
  },

  /**
   * Test experimental rule on subset of seeds
   * @param {string} courseCode - Course identifier
   * @param {string} rule - The new rule to test
   * @param {string[]} testSeedIds - Seeds to test on
   * @param {string} description - Human-readable description of the rule
   * @returns {Promise} Experiment details and job ID
   */
  async testExperimentalRule(courseCode, rule, testSeedIds, description) {
    const response = await api.post(`/api/courses/${courseCode}/experimental-rules`, {
      rule,
      test_seed_ids: testSeedIds,
      description
    })
    return response.data
  },

  /**
   * Commit experimental rule to active prompt
   * @param {string} courseCode - Course identifier
   * @param {string} rule - The rule to commit
   * @param {object} testResults - Results from experimental testing
   * @param {number} testResults.success_rate - Success rate (0-1)
   * @param {array} testResults.examples - Example improvements
   * @returns {Promise} Updated evolution data with new version
   */
  async commitRule(courseCode, rule, testResults) {
    const response = await api.post(`/api/courses/${courseCode}/prompt-evolution/commit`, {
      rule,
      test_results: testResults
    })
    return response.data
  },

  /**
   * Helper: Regenerate all flagged seeds in a course
   * @param {string} courseCode - Course identifier
   * @param {object} qualityReport - Quality report from getCourseQuality()
   * @returns {Promise} Job details
   */
  async regenerateAllFlagged(courseCode, qualityReport) {
    const flaggedSeedIds = qualityReport.flagged_seeds.map(s => s.seed_id)

    if (flaggedSeedIds.length === 0) {
      throw new Error('No flagged seeds to regenerate')
    }

    return this.regenerateSeeds(courseCode, flaggedSeedIds, {
      reason: 'auto_regeneration_flagged'
    })
  },

  /**
   * Helper: Regenerate seeds with specific issue type
   * @param {string} courseCode - Course identifier
   * @param {object} qualityReport - Quality report from getCourseQuality()
   * @param {string} issueType - Issue type to filter (e.g., "iron_rule_violation")
   * @returns {Promise} Job details
   */
  async regenerateByIssueType(courseCode, qualityReport, issueType) {
    const seedsWithIssue = qualityReport.flagged_seeds.filter(seed =>
      seed.issues.some(issue => issue.type === issueType)
    ).map(s => s.seed_id)

    if (seedsWithIssue.length === 0) {
      throw new Error(`No seeds found with issue type: ${issueType}`)
    }

    return this.regenerateSeeds(courseCode, seedsWithIssue, {
      reason: `fix_${issueType}`
    })
  },

  /**
   * Helper: Poll regeneration job until complete
   * @param {string} courseCode - Course identifier
   * @param {string} jobId - Job ID to poll
   * @param {function} onProgress - Optional callback for progress updates
   * @param {number} pollInterval - Polling interval in ms (default: 3000)
   * @returns {Promise} Final job result
   */
  async pollRegenerationJob(courseCode, jobId, onProgress = null, pollInterval = 3000) {
    let attempts = 0
    const maxAttempts = 200 // 10 minutes max at 3s intervals

    while (attempts < maxAttempts) {
      const status = await this.getRegenerationStatus(courseCode, jobId)

      if (onProgress) {
        onProgress(status)
      }

      if (status.job.status === 'completed' || status.job.status === 'failed') {
        return status
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval))
      attempts++
    }

    throw new Error('Regeneration job timeout - exceeded maximum polling time')
  }
}
