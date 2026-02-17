/**
 * Fix binding for nld_for_eng LEGOs that have audio but aren't bound.
 * Matches by text content rather than lego_id.
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
  console.log(`Fixing unbound nld_for_eng LEGOs${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  // Get LEGOs missing audio bindings
  const { data: legos } = await sb
    .from('course_legos')
    .select('id, seed_number, lego_index, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
    .eq('course_code', 'nld_for_eng')
    .eq('is_new', true)
    .is('presentation_audio_id', null)
    .order('seed_number');

  if (!legos || legos.length === 0) {
    console.log('No unbound LEGOs found.');
    return;
  }

  console.log(`Found ${legos.length} LEGOs with missing presentation_audio_id\n`);

  // Get ALL audio for this course, indexed by normalized text + role
  const { data: allAudio } = await sb
    .from('course_audio')
    .select('id, text, text_normalized, role, lego_id')
    .eq('course_code', 'nld_for_eng')
    .in('role', ['known', 'target1', 'target2', 'presentation']);

  // Build lookup maps
  const norm = (t) => t.toLowerCase().replace(/[.,!?;:'"¿¡]/g, '').trim();

  // For known/target, exact text match on the LEGO text itself
  const knownByText = new Map();
  const target1ByText = new Map();
  const target2ByText = new Map();
  const presByKnown = new Map(); // presentation audio keyed by known_text in the intro

  for (const a of (allAudio || [])) {
    const n = a.text_normalized || norm(a.text || '');
    if (a.role === 'known') {
      // Only match exact LEGO text (not phrase text)
      if (!knownByText.has(n)) knownByText.set(n, a.id);
    } else if (a.role === 'target1') {
      if (!target1ByText.has(n)) target1ByText.set(n, a.id);
    } else if (a.role === 'target2') {
      if (!target2ByText.has(n)) target2ByText.set(n, a.id);
    } else if (a.role === 'presentation') {
      // Extract known text from presentation: "the dutch for 'X', ..."
      const match = (a.text_normalized || '').match(/the dutch for '([^']+)'/);
      if (match) {
        const key = match[1].toLowerCase().trim();
        presByKnown.set(key, a.id);
      }
    }
  }

  let fixed = 0;
  for (const l of legos) {
    const legoId = `S${String(l.seed_number).padStart(4,'0')}L${String(l.lego_index).padStart(2,'0')}`;
    const knownNorm = norm(l.known_text);
    const targetNorm = norm(l.target_text);

    const updates = {};

    // Find presentation audio
    if (!l.presentation_audio_id) {
      const presId = presByKnown.get(knownNorm);
      if (presId) updates.presentation_audio_id = presId;
    }

    // Find known audio (exact match on LEGO text)
    if (!l.known_audio_id) {
      const kid = knownByText.get(knownNorm);
      if (kid) updates.known_audio_id = kid;
    }

    // Find target1 audio
    if (!l.target1_audio_id) {
      const tid = target1ByText.get(targetNorm);
      if (tid) updates.target1_audio_id = tid;
    }

    // Find target2 audio
    if (!l.target2_audio_id) {
      const t2id = target2ByText.get(targetNorm);
      if (t2id) updates.target2_audio_id = t2id;
    }

    const updateKeys = Object.keys(updates);
    if (updateKeys.length > 0) {
      console.log(`${legoId}: "${l.known_text}" → "${l.target_text}"`);
      for (const k of updateKeys) {
        console.log(`  ${k}: ${updates[k]}`);
      }

      if (!DRY_RUN) {
        const { error } = await sb
          .from('course_legos')
          .update(updates)
          .eq('id', l.id);
        if (error) console.log(`  ERROR: ${error.message}`);
      }
      fixed++;
    } else {
      console.log(`${legoId}: "${l.known_text}" → no matching audio found`);
    }
  }

  console.log(`\n${fixed} LEGOs ${DRY_RUN ? 'would be' : ''} fixed`);
})();
