require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Helper to create deterministic phrase ID
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

async function addUsePhrases() {
  const newPhrases = [
    // S144L2 - needs 6 more USE (currently has 2)
    {
      seed: 144, lego: 2, startNum: 3,
      lego_target: "früher als ich wollte",
      phrases: [
        {known: "I woke up earlier than I wanted to this morning", target: "ich bin heute früh früher als ich wollte aufgewacht"},
        {known: "we started the meeting earlier than I wanted to yesterday", target: "wir haben das treffen gestern früher als ich wollte angefangen"},
        {known: "he went home earlier than I wanted to yesterday evening", target: "er ist gestern abend früher als ich wollte nach hause gegangen"},
        {known: "she finished her work earlier than I wanted to today", target: "sie hat heute ihre arbeit früher als ich wollte fertig gemacht"},
        {known: "you stopped talking earlier than I wanted to last week", target: "du hast letzte woche früher als ich wollte aufgehört zu reden"},
        {known: "the bus arrived earlier than I wanted to this morning", target: "der bus ist heute früh früher als ich wollte angekommen"}
      ]
    },
    // S151L2 - needs 4 more USE (currently has 4)
    {
      seed: 151, lego: 2, startNum: 13,
      lego_target: "ich hatte gehofft",
      phrases: [
        {known: "I had hoped to talk with you about this yesterday", target: "ich hatte gehofft gestern mit dir darüber zu reden"},
        {known: "I had hoped the meeting would start later today", target: "ich hatte gehofft das treffen fängt heute später an"},
        {known: "I had hoped my friend could help me with that problem", target: "ich hatte gehofft mein freund könnte mir mit dem problem helfen"},
        {known: "I had hoped you could meet me at the pub tonight", target: "ich hatte gehofft du könntest mich heute abend in der kneipe treffen"}
      ]
    },
    // S154L1 - needs 4 more USE (currently has 4)
    {
      seed: 154, lego: 1, startNum: 11,
      lego_target: "willst du dich treffen",
      phrases: [
        {known: "do you want to meet at the pub tomorrow evening", target: "willst du dich treffen morgen abend in der kneipe"},
        {known: "do you want to meet before work tomorrow morning", target: "willst du dich treffen morgen früh vor der arbeit"},
        {known: "do you want to meet my new friend this weekend", target: "willst du dich treffen mit meinem neuen freund"},
        {known: "when do you want to meet to talk about this problem", target: "wann willst du dich treffen um über das problem zu reden"}
      ]
    }
  ];

  for (const entry of newPhrases) {
    console.log(`\nAdding USE phrases for S${entry.seed}L${entry.lego}...`);
    
    // Get current max position
    const { data: existing } = await supabase
      .from('course_practice_phrases')
      .select('position')
      .eq('course_code', 'deu_for_eng')
      .eq('seed_number', entry.seed)
      .eq('lego_index', entry.lego)
      .order('position', { ascending: false })
      .limit(1);
    
    let maxPos = existing && existing[0] ? existing[0].position : 0;
    
    for (let i = 0; i < entry.phrases.length; i++) {
      const p = entry.phrases[i];
      const phraseNum = entry.startNum + i;
      const id = makePhraseId('deu_for_eng', entry.seed, entry.lego, 'use', phraseNum);
      
      // Compute lego position
      const legoPos = computeLegoPosition(p.target, entry.lego_target);
      
      if (!legoPos) {
        console.log(`  ⚠ SKIP ${id}: target doesn't contain LEGO`);
        console.log(`    Target: "${p.target}"`);
        console.log(`    LEGO: "${entry.lego_target}"`);
        continue;
      }
      
      const { error } = await supabase
        .from('course_practice_phrases')
        .insert({
          id,
          course_code: 'deu_for_eng',
          seed_number: entry.seed,
          lego_index: entry.lego,
          position: ++maxPos,
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
        console.log(`  ✗ ${id}: ${error.message}`);
      } else {
        console.log(`  ✓ ${id}: "${p.target}" (${legoPos})`);
      }
    }
  }
  
  console.log('\nDone!');
}

addUsePhrases();
