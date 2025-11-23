/**
 * Simple test endpoint for debugging
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Check if GITHUB_TOKEN exists
    const hasToken = !!process.env.GITHUB_TOKEN;
    const tokenLength = process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.length : 0;

    res.status(200).json({
      success: true,
      hasToken,
      tokenLength,
      env: {
        GITHUB_OWNER: process.env.GITHUB_OWNER || 'default',
        GITHUB_REPO: process.env.GITHUB_REPO || 'default',
        GITHUB_BRANCH: process.env.GITHUB_BRANCH || 'default'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
}
