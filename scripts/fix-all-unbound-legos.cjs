/**
 * Fix unbound LEGO audio across ALL courses.
 * Finds LEGOs missing known/target1/target2/presentation audio IDs
 * and binds them by matching on text content.
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const DRY_RUN = process.argv.includes('--dry-run');

const norm = (t) => (t || '').toLowerCase().replace(/[.,!?;:'"¿¡。、！？「」『』]/g, '').trim();

async function fixCourse(courseCode) {
  // Get LEGOs missing ANY audio binding
  const { data: legos } = await sb
    .from('course_legos')
    .select('id, seed_number, lego_index, known_text, target_text, is_new, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
    .eq('course_code', courseCode)
    .eq('is_new', true);

  if (!legos || legos.length === 0) return { fixed: 0, total: 0 };

  // Find LEGOs missing at least one binding
  const missing = legos.filter(l =>
    !l.known_audio_id || !l.target1_audio_id || !l.target2_audio_id || !l.presentation_audio_id
  );

  if (missing.length === 0) return { fixed: 0, total: legos.length };

  // Get all audio for this course
  const { data: allAudio } = await sb
    .from('course_audio')
    .select('id, text, text_normalized, role')
    .eq('course_code', courseCode)
    .in('role', ['known', 'target1', 'target2', 'presentation']);

  // Build lookup maps by normalized text
  const knownByText = new Map();
  const target1ByText = new Map();
  const target2ByText = new Map();
  const presByKnown = new Map();

  // Detect target language name for presentation matching
  const langNames = {
    'deu_for_eng': 'german', 'fra_for_eng': 'french', 'spa_for_eng': 'spanish',
    'ita_for_eng': 'italian', 'por_for_eng': 'portuguese', 'nld_for_eng': 'dutch',
    'jpn_for_eng': 'japanese', 'zho_for_eng': 'chinese', 'kor_for_eng': 'korean',
    'ara_for_eng': 'arabic', 'cym_s_for_eng': 'welsh', 'cym_n_for_eng': 'welsh',
    'swe_for_eng': 'swedish', 'fin_for_eng': 'finnish', 'tur_for_eng': 'turkish',
    'gle_for_eng': 'irish', 'bre_for_eng': 'breton', 'cat_for_spa': 'catalan',
    'eus_for_spa': 'basque', 'eng_for_kor': 'english', 'eng_for_spa': 'english',
    'eng_for_fra': 'english', 'eng_for_deu': 'english', 'eng_for_por': 'english',
    'eng_for_ara': 'english', 'eng_for_zho': 'english', 'eng_for_jpn': 'english',
  };
  const langName = langNames[courseCode] || '';

  for (const a of (allAudio || [])) {
    const n = a.text_normalized || norm(a.text || '');
    if (a.role === 'known' && !knownByText.has(n)) knownByText.set(n, a.id);
    else if (a.role === 'target1' && !target1ByText.has(n)) target1ByText.set(n, a.id);
    else if (a.role === 'target2' && !target2ByText.has(n)) target2ByText.set(n, a.id);
    else if (a.role === 'presentation') {
      const pattern = new RegExp(`the ${langName} for '([^']+)'`);
      const match = (a.text_normalized || n).match(pattern);
      if (match) {
        const key = match[1].toLowerCase().trim();
        if (!presByKnown.has(key)) presByKnown.set(key, a.id);
      }
    }
  }

  let fixed = 0;
  const details = [];

  for (const l of missing) {
    const knownNorm = norm(l.known_text);
    const targetNorm = norm(l.target_text);
    const updates = {};

    if (!l.presentation_audio_id) {
      const pid = presByKnown.get(knownNorm);
      if (pid) updates.presentation_audio_id = pid;
    }
    if (!l.known_audio_id) {
      const kid = knownByText.get(knownNorm);
      if (kid) updates.known_audio_id = kid;
    }
    if (!l.target1_audio_id) {
      const tid = target1ByText.get(targetNorm);
      if (tid) updates.target1_audio_id = tid;
    }
    if (!l.target2_audio_id) {
      const t2id = target2ByText.get(targetNorm);
      if (t2id) updates.target2_audio_id = t2id;
    }

    if (Object.keys(updates).length > 0) {
      if (!DRY_RUN) {
        await sb.from('course_legos').update(updates).eq('id', l.id);
      }
      fixed++;
      details.push({
        lego: `S${String(l.seed_number).padStart(4,'0')}L${String(l.lego_index).padStart(2,'0')}`,
        known: l.known_text,
        target: l.target_text,
        bound: Object.keys(updates)
      });
    }
  }

  // Count still missing after fix
  const stillMissing = missing.length - fixed;

  return { fixed, total: legos.length, missing: missing.length, stillMissing, details };
}

(async () => {
  console.log(`Fixing unbound LEGO audio for ALL courses${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  const { data: courses } = await sb
    .from('courses')
    .select('course_code')
    .not('course_code', 'is', null);

  let grandFixed = 0;

  for (const { course_code } of (courses || [])) {
    const result = await fixCourse(course_code);
    if (result.total === 0) continue;

    if (result.fixed > 0) {
      console.log(`${course_code}: FIXED ${result.fixed} / ${result.missing} unbound (${result.total} total LEGOs)`);
      for (const d of result.details.slice(0, 5)) {
        console.log(`  ${d.lego}: "${d.known}" → ${d.bound.join(', ')}`);
      }
      if (result.details.length > 5) console.log(`  ... and ${result.details.length - 5} more`);
      if (result.stillMissing > 0) console.log(`  ⚠ ${result.stillMissing} still unbound (no matching audio found)`);
      grandFixed += result.fixed;
    } else if (result.missing > 0) {
      console.log(`${course_code}: ${result.missing} unbound but NO matching audio found`);
    } else {
      console.log(`${course_code}: OK (${result.total} LEGOs, all bound)`);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`TOTAL: ${grandFixed} LEGOs ${DRY_RUN ? 'would be' : ''} fixed`);
})();
