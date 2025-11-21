/**
 * PUT /api/courses/:courseCode/introductions/:legoId
 *
 * Updates an introduction/presentation in introductions.json
 * Writes to local VFS and commits to GitHub for persistence
 */

import fs from 'fs/promises';
import path from 'path';
import { commitToGitHub, isGitHubConfigured } from '../../lib/github.js';

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
    // Path to introductions.json
    const vfsPath = path.join(process.cwd(), 'public', 'vfs', 'courses', courseCode);
    const introsPath = path.join(vfsPath, 'introductions.json');

    // Read existing file
    const content = await fs.readFile(introsPath, 'utf-8');
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
    data.updated_by = 'manual_edit';

    // Write back to file
    const jsonContent = JSON.stringify(data, null, 2);
    await fs.writeFile(introsPath, jsonContent, 'utf-8');

    console.log(`[API] Saved introductions.json locally for ${courseCode}`);

    // Commit to GitHub for persistence
    let githubCommit = null;
    if (isGitHubConfigured()) {
      try {
        const result = await commitToGitHub({
          path: `public/vfs/courses/${courseCode}/introductions.json`,
          content: jsonContent,
          message: `Update introduction ${legoId}`
        });
        githubCommit = result.commit;
        console.log(`[API] Committed to GitHub: ${githubCommit.sha.substring(0, 7)}`);
      } catch (err) {
        console.error(`[API] GitHub commit failed (local save succeeded):`, err.message);
      }
    } else {
      console.log(`[API] GitHub not configured - local save only`);
    }

    res.status(200).json({
      success: true,
      message: githubCommit
        ? 'Introduction updated and committed to GitHub'
        : 'Introduction updated locally (GitHub not configured)',
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
