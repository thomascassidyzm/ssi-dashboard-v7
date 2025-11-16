/**
 * PUT /api/courses/:courseCode/translations/:uuid
 *
 * Updates a translation in seed_pairs.json
 * Writes directly to VFS (public/vfs/courses/{courseCode}/seed_pairs.json)
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

  const { courseCode, uuid } = req.query;
  const { source, target } = req.body;

  // Validate
  if (!courseCode || !uuid || !source || !target) {
    return res.status(400).json({
      error: 'Missing required fields',
      required: ['courseCode', 'uuid', 'source', 'target']
    });
  }

  try {
    // Path to seed_pairs.json
    const vfsPath = path.join(process.cwd(), 'public', 'vfs', 'courses', courseCode);
    const seedPairsPath = path.join(vfsPath, 'seed_pairs.json');

    // Read existing file
    const content = await fs.readFile(seedPairsPath, 'utf-8');
    const data = JSON.parse(content);

    // Find and update the translation
    let found = false;
    if (data.translations && typeof data.translations === 'object') {
      // Format: { "S0001": ["target", "known"], ... }
      for (const [seedId, translation] of Object.entries(data.translations)) {
        // Match by checking if translation matches (uuid is typically the seedId)
        if (seedId === uuid || (Array.isArray(translation) && translation[0] === source)) {
          data.translations[seedId] = [target, source]; // [target, known/source]
          found = true;
          console.log(`[API] ✅ Updated translation ${seedId}: "${source}" → "${target}"`);
          break;
        }
      }
    }

    if (!found) {
      return res.status(404).json({
        error: 'Translation not found',
        uuid
      });
    }

    // Update metadata
    data.updated = new Date().toISOString();
    data.updated_by = 'manual_edit';

    // Write back to file
    await fs.writeFile(seedPairsPath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`[API] ✅ Saved seed_pairs.json for ${courseCode}`);

    res.status(200).json({
      success: true,
      message: 'Translation updated successfully',
      updated: {
        uuid,
        source,
        target
      }
    });

  } catch (error) {
    console.error('[API] Error updating translation:', error);
    res.status(500).json({
      error: 'Failed to update translation',
      message: error.message
    });
  }
}
