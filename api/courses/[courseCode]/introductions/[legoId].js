/**
 * PUT /api/courses/:courseCode/introductions/:legoId
 *
 * Updates an introduction/presentation in introductions.json
 * Reads from GitHub and commits back to GitHub
 */

import { readFromGitHub, commitToGitHub } from '../../lib/github.js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { courseCode, legoId } = req.query;
  const { text, edited } = req.body;

  // Validate
  if (!courseCode || !legoId || !text) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['courseCode', 'legoId', 'text']
    });
  }

  try {
    // Read from GitHub
    const githubPath = `public/vfs/courses/${courseCode}/introductions.json`;
    const { content } = await readFromGitHub(githubPath);
    const data = JSON.parse(content);

    // Update the presentation
    if (!data.presentations) {
      data.presentations = {};
    }

    data.presentations[legoId] = {
      text: text.trim(),
      edited: edited !== undefined ? edited : true,
      updated: new Date().toISOString()
    };

    console.log(`[API] Updated introduction ${legoId}: "${text.substring(0, 50)}..."`);

    // Update metadata
    data.updated = new Date().toISOString();
    data.updated_by = 'dashboard_edit';

    // Commit to GitHub
    const jsonContent = JSON.stringify(data, null, 2);
    const result = await commitToGitHub({
      path: githubPath,
      content: jsonContent,
      message: `Update introduction ${legoId}`
    });
    const githubCommit = result.commit;
    console.log(`[API] Committed to GitHub: ${githubCommit.sha.substring(0, 7)}`);

    res.status(200).json({
      success: true,
      message: 'Introduction updated and committed to GitHub',
      updated: {
        legoId,
        text
      },
      github: githubCommit
    });

  } catch (error) {
    console.error('[API] Error updating introduction:', error);
    res.status(500).json({
      error: 'Failed to update introduction',
      message: error.message
    });
  }
}
