/**
 * PUT /api/courses/:courseCode/introductions/:legoId
 *
 * Updates an introduction/presentation in introductions.json
 * Writes directly to VFS (public/vfs/courses/{courseCode}/introductions.json)
 */

import fs from 'fs/promises';
import path from 'path';

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

    console.log(`[API] ✅ Updated introduction ${legoId}: "${text.substring(0, 50)}..."`);

    // Update metadata
    data.updated = new Date().toISOString();
    data.updated_by = 'manual_edit';

    // Write back to file
    await fs.writeFile(introsPath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`[API] ✅ Saved introductions.json for ${courseCode}`);

    res.status(200).json({
      success: true,
      message: 'Introduction updated successfully',
      updated: {
        legoId,
        text
      }
    });

  } catch (error) {
    console.error('[API] Error updating introduction:', error);
    res.status(500).json({
      error: 'Failed to update introduction',
      message: error.message
    });
  }
}
