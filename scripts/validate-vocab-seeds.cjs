const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const COURSE = process.argv[2] || "fra_for_eng";
const MAX_SEED = parseInt(process.argv[3] || "10");

// Normalize for substring containment check
function normalize(t) {
  return (t || '').toLowerCase().replace(/[.,!?;:¡¿'"()\-–—…«»]/g, '').replace(/\s+/g, ' ').trim();
}

function substringCheck(phraseTarget, legoTarget) {
  return normalize(phraseTarget).includes(normalize(legoTarget));
}

// Tokenize for vocab check — split on whitespace, strip punctuation, lowercase
function tokenize(text) {
  return (text || '').toLowerCase()
    .replace(/[.,!?;:¡¿'"()\-–—…«»]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

async function run() {
  // Load LEGOs for seeds 1-MAX_SEED, ordered
  const { data: legos, error: legoErr } = await supabase
    .from("course_legos")
    .select("id, seed_number, lego_index, target_text, known_text, type, is_new")
    .eq("course_code", COURSE)
    .lte("seed_number", MAX_SEED)
    .order("seed_number")
    .order("lego_index");

  if (legoErr) { console.error("LEGO query error:", legoErr); return; }
  console.log(`Loaded ${legos.length} LEGOs for ${COURSE} seeds 1-${MAX_SEED}\n`);

  // Load all phrases for these seeds
  const { data: phrases, error: phraseErr } = await supabase
    .from("course_practice_phrases")
    .select("id, seed_number, lego_index, position, phrase_role, target_text, known_text")
    .eq("course_code", COURSE)
    .lte("seed_number", MAX_SEED)
    .order("seed_number")
    .order("lego_index")
    .order("position");

  if (phraseErr) { console.error("Phrase query error:", phraseErr); return; }
  console.log(`Loaded ${phrases.length} phrases\n`);

  // Build cumulative vocabulary as we go through LEGOs in order
  const cumulativeVocab = new Set();
  let totalIssues = 0;
  let containmentFails = 0;
  let vocabFails = 0;

  for (const lego of legos) {
    // Add this LEGO's words to vocabulary
    const legoWords = tokenize(lego.target_text);
    legoWords.forEach(w => cumulativeVocab.add(w));

    // Get phrases for this LEGO
    const legoId = lego.id;
    const legoPhrases = phrases.filter(p =>
      p.seed_number === lego.seed_number && p.lego_index === lego.lego_index
    );

    if (legoPhrases.length === 0) continue;

    const issues = [];

    for (const p of legoPhrases) {
      // Skip component phrases for containment check (they CAN'T contain full LEGO)
      const isComponent = p.phrase_role === 'component';

      // Containment check (build + use only)
      if (!isComponent && !substringCheck(p.target_text, lego.target_text)) {
        issues.push({
          type: 'CONTAINMENT',
          role: p.phrase_role,
          pos: p.position,
          phrase: p.target_text,
          known: p.known_text
        });
        containmentFails++;
      }

      // Vocab check — every word in phrase should be in cumulative vocabulary
      // (component phrases are also checked — they should only use known words)
      const phraseWords = tokenize(p.target_text);
      const unknownWords = phraseWords.filter(w => !cumulativeVocab.has(w));
      if (unknownWords.length > 0) {
        issues.push({
          type: 'VOCAB',
          role: p.phrase_role,
          pos: p.position,
          phrase: p.target_text,
          known: p.known_text,
          unknown: unknownWords
        });
        vocabFails++;
      }
    }

    // Report
    const label = `S${String(lego.seed_number).padStart(4,'0')}L${String(lego.lego_index).padStart(2,'0')}`;
    const typeLabel = lego.type || 'A';
    if (issues.length > 0) {
      console.log(`${label} [${typeLabel}] "${lego.target_text}" (${lego.known_text}) — ${legoPhrases.length} phrases, ${issues.length} issues:`);
      for (const iss of issues) {
        if (iss.type === 'CONTAINMENT') {
          console.log(`  ❌ CONTAINMENT [${iss.role}] pos=${iss.pos}: "${iss.phrase}" (${iss.known})`);
        } else {
          console.log(`  ⚠️  VOCAB [${iss.role}] pos=${iss.pos}: "${iss.phrase}" — unknown: ${iss.unknown.join(', ')}`);
        }
      }
      totalIssues += issues.length;
      console.log();
    } else {
      console.log(`${label} [${typeLabel}] "${lego.target_text}" — ${legoPhrases.length} phrases ✓`);
    }
  }

  console.log("\n=== SUMMARY ===");
  console.log(`Course: ${COURSE}, Seeds: 1-${MAX_SEED}`);
  console.log(`LEGOs: ${legos.length}, Phrases: ${phrases.length}`);
  console.log(`Containment failures: ${containmentFails}`);
  console.log(`Vocab failures: ${vocabFails}`);
  console.log(`Total issues: ${totalIssues}`);
  console.log(`Vocabulary at end of seed ${MAX_SEED}: ${cumulativeVocab.size} words`);
}
run().catch(e => console.error(e));
