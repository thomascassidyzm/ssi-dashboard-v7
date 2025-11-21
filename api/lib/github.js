/**
 * GitHub API Service for Dashboard Editing
 *
 * Commits file changes directly to GitHub repository
 * Uses the GitHub Contents API via Octokit
 */

import { Octokit } from '@octokit/rest';

// Configuration from environment
const GITHUB_CONFIG = {
  owner: process.env.GITHUB_OWNER || 'thomascassidyzm',
  repo: process.env.GITHUB_REPO || 'ssi-dashboard-v7',
  branch: process.env.GITHUB_BRANCH || 'main'
};

// Create Octokit instance (lazy initialization)
let octokit = null;

function getOctokit() {
  if (!octokit) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN environment variable is required for editing');
    }
    octokit = new Octokit({ auth: token });
  }
  return octokit;
}

/**
 * Commit a file to GitHub
 *
 * @param {Object} options
 * @param {string} options.path - File path relative to repo root (e.g., 'public/vfs/courses/spa_for_eng/seed_pairs.json')
 * @param {string} options.content - File content (will be base64 encoded)
 * @param {string} options.message - Commit message
 * @returns {Promise<Object>} - GitHub API response with commit details
 */
export async function commitToGitHub({ path, content, message }) {
  const client = getOctokit();

  try {
    // First, get the current file to obtain its SHA (required for updates)
    let sha = null;
    try {
      const { data: existingFile } = await client.repos.getContent({
        owner: GITHUB_CONFIG.owner,
        repo: GITHUB_CONFIG.repo,
        path,
        ref: GITHUB_CONFIG.branch
      });
      sha = existingFile.sha;
    } catch (err) {
      // File doesn't exist yet (new file) - that's okay
      if (err.status !== 404) {
        throw err;
      }
    }

    // Create or update the file
    const { data } = await client.repos.createOrUpdateFileContents({
      owner: GITHUB_CONFIG.owner,
      repo: GITHUB_CONFIG.repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      branch: GITHUB_CONFIG.branch,
      ...(sha && { sha }) // Include SHA only if updating existing file
    });

    console.log(`[GitHub] Committed ${path}: ${data.commit.sha.substring(0, 7)}`);

    return {
      success: true,
      commit: {
        sha: data.commit.sha,
        message: data.commit.message,
        url: data.commit.html_url
      }
    };
  } catch (error) {
    console.error(`[GitHub] Failed to commit ${path}:`, error.message);
    throw new Error(`GitHub commit failed: ${error.message}`);
  }
}

/**
 * Check if GitHub integration is configured
 * @returns {boolean}
 */
export function isGitHubConfigured() {
  return !!process.env.GITHUB_TOKEN;
}

/**
 * Get the GitHub configuration (for debugging)
 * @returns {Object}
 */
export function getGitHubConfig() {
  return {
    owner: GITHUB_CONFIG.owner,
    repo: GITHUB_CONFIG.repo,
    branch: GITHUB_CONFIG.branch,
    configured: isGitHubConfigured()
  };
}

export default {
  commitToGitHub,
  isGitHubConfigured,
  getGitHubConfig
};
