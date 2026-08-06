/**
 * GET /api/courses/:courseCode/script
 * Generate a playable script from the course manifest
 *
 * Query params:
 *   startSeed: number (default 1)
 *   endSeed: number (default 10)
 *
 * Returns script items for the Spotify-style player
 */

import { readCourseFile } from '../../lib/s3-course.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { courseCode } = req.query;
  const startSeed = parseInt(req.query.startSeed) || 1;
  const endSeed = parseInt(req.query.endSeed) || 10;

  if (!courseCode) {
    return res.status(400).json({ error: 'Course code required' });
  }

  try {
    // Load manifest from S3
    const { content: manifest } = await readCourseFile(courseCode, 'course_manifest.json');

    if (!manifest.slices || manifest.slices.length === 0) {
      return res.status(404).json({ error: 'No slices found in manifest' });
    }

    const slice = manifest.slices[0];
    const seeds = slice.seeds || [];
    const samples = slice.samples || {};

    // Build lookup: text -> sample info by role
    const sampleLookup = {};
    for (const [text, sampleArray] of Object.entries(samples)) {
      for (const sample of sampleArray) {
        const key = `${text}:::${sample.role}`;
        if (!sampleLookup[key]) {
          sampleLookup[key] = sample;
        }
      }
    }

    // Helper to find audio UUID for a text/role combo
    const findAudioId = (text, role) => {
      const sample = sampleLookup[`${text}:::${role}`];
      return sample?.id || null;
    };

    // Generate script items from seeds
    const items = [];
    let cycleNum = 0;
    let seedIndex = 0;

    for (const seed of seeds) {
      seedIndex++;

      // Filter by seed range (1-indexed)
      if (seedIndex < startSeed || seedIndex > endSeed) continue;

      const seedId = `S${String(seedIndex).padStart(4, '0')}`;

      // Process introduction_items (LEGOs being introduced in this seed)
      const introItems = seed.introduction_items || [];

      for (const intro of introItems) {
        // Each intro has a presentation (the LEGO being taught)
        // and nodes (the practice phrases)

        // First: the introduction/presentation itself
        // LEGO COMPLETENESS (Tom, 2026-08-06): a LEGO plays only with ALL THREE
        // of intro + target voice 1 + target voice 2. Missing any one drops the
        // LEGO, drops its whole round, and breaks every later LEGO contingent on
        // it — course-breaking, not cosmetic. The known-side clip is not in the
        // triple, and `source || target1` (the old gate) passed a LEGO carrying
        // neither an intro nor a second voice.
        const introLegoTarget = intro.node?.target?.text || '';
        const legoComplete = !!(findAudioId(intro.presentation, 'presentation')
          && findAudioId(introLegoTarget, 'target1')
          && findAudioId(introLegoTarget, 'target2'));

        if (intro.presentation) {
          cycleNum++;
          const presentationAudioId = findAudioId(intro.presentation, 'presentation');

          items.push({
            uuid: intro.id || `${seedId}-intro-${cycleNum}`,
            cycleNum,
            type: 'introduction',
            seedId,
            legoKey: intro.node?.target?.text || '',
            knownText: intro.presentation,
            targetText: intro.node?.target?.text || '',
            sourceId: presentationAudioId, // Presentation plays in source slot
            target1Id: findAudioId(intro.node?.target?.text, 'target1'),
            target2Id: findAudioId(intro.node?.target?.text, 'target2'),
            hasAudio: !!presentationAudioId,
            legoComplete
          });
        }

        // Then: the component/debut for this LEGO
        if (intro.node) {
          cycleNum++;
          const knownText = intro.node.known?.text || '';
          const targetText = intro.node.target?.text || '';

          items.push({
            uuid: intro.node.id || `${seedId}-debut-${cycleNum}`,
            cycleNum,
            type: 'debut',
            seedId,
            legoKey: targetText,
            knownText,
            targetText,
            sourceId: findAudioId(knownText, 'source'),
            target1Id: findAudioId(targetText, 'target1'),
            target2Id: findAudioId(targetText, 'target2'),
            // Both voices, not source-or-voice-1: a voice-2-only gap kills the round.
            hasAudio: !!(findAudioId(targetText, 'target1') && findAudioId(targetText, 'target2')),
            legoComplete
          });
        }

        // Practice nodes for this LEGO
        const nodes = intro.nodes || [];
        for (const node of nodes) {
          // Skip the node that matches the intro (already added as debut)
          if (node.id === intro.node?.id) continue;

          cycleNum++;
          const knownText = node.known?.text || '';
          const targetText = node.target?.text || '';

          items.push({
            uuid: node.id || `${seedId}-practice-${cycleNum}`,
            cycleNum,
            type: 'practice',
            seedId,
            legoKey: intro.node?.target?.text || '',
            knownText,
            targetText,
            sourceId: findAudioId(knownText, 'source'),
            target1Id: findAudioId(targetText, 'target1'),
            target2Id: findAudioId(targetText, 'target2'),
            hasAudio: !!(findAudioId(knownText, 'source') || findAudioId(targetText, 'target1'))
          });
        }
      }

      // Finally: the seed sentence itself (the full sentence for this seed)
      if (seed.node) {
        cycleNum++;
        const knownText = seed.node.known?.text || seed.seed_sentence?.canonical || '';
        const targetText = seed.node.target?.text || '';

        items.push({
          uuid: seed.node.id || seed.id,
          cycleNum,
          type: 'practice',
          seedId,
          legoKey: 'SEED',
          knownText,
          targetText,
          sourceId: findAudioId(knownText, 'source'),
          target1Id: findAudioId(targetText, 'target1'),
          target2Id: findAudioId(targetText, 'target2'),
          hasAudio: !!(findAudioId(knownText, 'source') || findAudioId(targetText, 'target1'))
        });
      }
    }

    console.log(`[Script] Generated ${items.length} items for ${courseCode} (seeds ${startSeed}-${endSeed})`);

    res.json({
      items,
      courseCode,
      seedRange: { start: startSeed, end: endSeed },
      totalCycles: items.length,
      sampleCount: Object.keys(samples).length
    });

  } catch (err) {
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({
        error: 'Course manifest not found',
        courseCode
      });
    }

    console.error(`[Script] Error for ${courseCode}:`, err.message);
    res.status(500).json({
      error: 'Failed to generate script',
      message: err.message
    });
  }
}
