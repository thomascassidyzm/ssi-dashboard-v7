/**
 * POST /api/audio/lookup/:courseCode
 * Look up audio UUIDs by text content
 *
 * Body: { knownText: string, targetText: string }
 *
 * Returns: {
 *   success: boolean,
 *   audio: {
 *     sourceId: string (UUID for known/source audio),
 *     target1Id: string (UUID for target voice 1),
 *     target2Id: string (UUID for target voice 2)
 *   }
 * }
 *
 * Looks up audio from the course manifest's samples dictionary
 * using text:role as the key.
 */

import { readCourseFile } from '../../lib/s3-course.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { courseCode } = req.query;
  const { knownText, targetText } = req.body || {};

  if (!courseCode) {
    return res.status(400).json({ error: 'Course code required' });
  }

  if (!knownText && !targetText) {
    return res.status(400).json({ error: 'At least one of knownText or targetText required' });
  }

  try {
    // Load manifest from S3
    const { content: manifest } = await readCourseFile(courseCode, 'course_manifest.json');

    if (!manifest.slices || manifest.slices.length === 0) {
      return res.status(404).json({ error: 'No slices found in manifest' });
    }

    const samples = manifest.slices[0].samples || {};

    // Helper to find UUID by text and role
    const findUuid = (text, role) => {
      if (!text) return null;
      const sampleArray = samples[text];
      if (!sampleArray) return null;
      const sample = sampleArray.find(s => s.role === role);
      return sample?.id || null;
    };

    // Look up UUIDs for each role
    const audio = {
      sourceId: findUuid(knownText, 'source'),
      target1Id: findUuid(targetText, 'target1'),
      target2Id: findUuid(targetText, 'target2')
    };

    // If target2 not found, fall back to target1
    if (!audio.target2Id && audio.target1Id) {
      audio.target2Id = audio.target1Id;
    }

    const hasAudio = !!(audio.sourceId || audio.target1Id);

    console.log(`[AudioLookup] ${courseCode}: known="${knownText?.substring(0, 30)}..." target="${targetText?.substring(0, 30)}..." -> source=${!!audio.sourceId} t1=${!!audio.target1Id} t2=${!!audio.target2Id}`);

    res.json({
      success: hasAudio,
      audio,
      courseCode
    });

  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({
        error: 'Course manifest not found',
        courseCode
      });
    }

    console.error(`[AudioLookup] Error for ${courseCode}:`, err.message);
    res.status(500).json({
      error: 'Failed to lookup audio',
      message: err.message
    });
  }
}
