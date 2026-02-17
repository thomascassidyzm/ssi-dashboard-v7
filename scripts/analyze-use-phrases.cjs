const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyze() {
  // Get all USE phrases for zho_for_eng
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('known_text, target_text, seed_number, metadata')
    .eq('course_code', 'zho_for_eng')
    .eq('phrase_role', 'use');

  if (error) { console.error(error); return; }

  console.log(`Total USE phrases: ${phrases.length}\n`);

  // Analyze known_text lengths (English side)
  const lengths = phrases.map(p => p.known_text.length);
  const avgLen = lengths.reduce((a,b) => a+b, 0) / lengths.length;

  // Word count as proxy for syllables
  const wordCounts = phrases.map(p => p.known_text.split(/\s+/).length);
  const avgWords = wordCounts.reduce((a,b) => a+b, 0) / wordCounts.length;
  const estSyllables = avgWords * 1.4; // rough estimate

  console.log(`Average characters: ${avgLen.toFixed(1)}`);
  console.log(`Average words: ${avgWords.toFixed(1)}`);
  console.log(`Estimated avg syllables: ${estSyllables.toFixed(1)}`);

  // Length distribution
  const short = phrases.filter(p => p.known_text.split(/\s+/).length < 5).length;
  const medium = phrases.filter(p => {
    const w = p.known_text.split(/\s+/).length;
    return w >= 5 && w < 10;
  }).length;
  const long = phrases.filter(p => p.known_text.split(/\s+/).length >= 10).length;

  console.log(`\nLength distribution:`);
  console.log(`  Short (<5 words): ${short} (${(short/phrases.length*100).toFixed(1)}%)`);
  console.log(`  Medium (5-9 words): ${medium} (${(medium/phrases.length*100).toFixed(1)}%)`);
  console.log(`  Long (10+ words): ${long} (${(long/phrases.length*100).toFixed(1)}%)`);

  // Show shortest USE phrases (potential issues)
  const sorted = [...phrases].sort((a,b) => a.known_text.length - b.known_text.length);
  console.log(`\n15 SHORTEST USE phrases:`);
  sorted.slice(0, 15).forEach(p => {
    console.log(`  [${p.known_text.length} chars, ${p.known_text.split(/\s+/).length} words] "${p.known_text}"`);
  });

  // Check for scores
  const withScores = phrases.filter(p => p.metadata?.score != null);
  console.log(`\nPhrases with scores: ${withScores.length}/${phrases.length}`);

  if (withScores.length > 0) {
    const scores = withScores.map(p => p.metadata.score);
    const avgScore = scores.reduce((a,b) => a+b, 0) / scores.length;
    console.log(`Average score: ${avgScore.toFixed(2)}`);
  }
}

analyze();
