/**
 * Simple test endpoint for debugging
 */

import { readFromGitHub, getGitHubConfig } from './lib/github.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Check if GITHUB_TOKEN exists
    const hasToken = !!process.env.GITHUB_TOKEN;
    const tokenLength = process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.length : 0;

    // Try to read from GitHub
    const config = getGitHubConfig();
    let readResult = null;
    let readError = null;

    try {
      const result = await readFromGitHub('public/vfs/courses/bre_for_eng/seed_pairs.json');
      readResult = {
        contentLength: result.content.length,
        sha: result.sha
      };
    } catch (err) {
      readError = err.message;
    }

    res.status(200).json({
      success: true,
      hasToken,
      tokenLength,
      config,
      readResult,
      readError
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
