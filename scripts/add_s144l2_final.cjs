require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function makePhraseId(courseCode, seedNum, legoIdx, role, num) {
  const s = String(seedNum).padStart(4, '0');
  const l = String(legoIdx).padStart(2, '0');
  const n = String(num).padStart(2, '0');
  const r = role === 'build' ? 'B' : role === 'use' ? 'U' : 'C';
  return `${courseCode}:S${s}L${l}${r}${n}`;
}

function computeLegoPosition(phraseTargetText, legoTargetText) {
  if (!phraseTargetText || !legoTargetText) return null;
  const phrase = phraseTargetText.trim();
  const lego = legoTargetText.trim();
  const index = phrase.indexOf(lego);
  if (index === -1) return null;
  const phraseLength = phrase.length;
  const legoLength = lego.length;
  const legoEndIndex = index + legoLength;
  const startPercent = index / phraseLength;
  const endPercent = legoEndIndex / phraseLength;
  const centerPercent = (startPercent + endPercent) / 2;
  if (centerPercent < 0.33) return 'start';
  if (centerPercent > 0.67) return 'end';
  return 'middle';
}

async function addFinalPhrase() {
  const p = {
    known: "my friend arrived at work earlier than I wanted to yesterday",
    target: "mein freund ist gestern früher als ich wollte bei der arbeit angekommen"
  };
  
  const lego_target = "früher als ich wollte";
  const legoPos = computeLegoPosition(p.target, lego_target);
  
  if (!legoPos) {
    console.log('ERROR: LEGO not found in target');
    return;
  }
  
  // Get max position
  const { data: existing } = await supabase
    .from('course_practice_phrases')
    .select('position')
    .eq('course_code', 'deu_for_eng')
    .eq('seed_number', 144)
    .eq('lego_index', 2)
    .order('position', { ascending: false })
    .limit(1);
  
  const maxPos = existing && existing[0] ? existing[0].position : 0;
  const id = makePhraseId('deu_for_eng', 144, 2, 'use', 9);
  
  const { error } = await supabase
    .from('course_practice_phrases')
    .insert({
      id,
      course_code: 'deu_for_eng',
      seed_number: 144,
      lego_index: 2,
      position: maxPos + 1,
      known_text: p.known,
      target_text: p.target,
      word_count: p.target.split(/\s+/).length,
      lego_count: 1,
      phrase_role: 'use',
      connected_lego_ids: [],
      lego_position: legoPos,
      metadata: { format: 'build_use', source: 'manual', score: 8 },
      status: 'draft',
      version: 1
    });
  
  if (error) {
    console.log(`ERROR: ${error.message}`);
  } else {
    console.log(`✓ ${id}: "${p.target}" (${legoPos})`);
  }
}

addFinalPhrase();
