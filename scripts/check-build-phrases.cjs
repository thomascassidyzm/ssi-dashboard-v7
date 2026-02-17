const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Strip punctuation for comparison (commas, periods, etc. shouldn't block a match)
function normalize(text) {
  return (text || '').toLowerCase().replace(/[.,!?;:¡¿'"()\-–—]/g, '').replace(/\s+/g, ' ').trim();
}

// Current approach: every unique char from LEGO appears somewhere in phrase
function charCheck(phraseTarget, legoTarget) {
  const phraseLower = phraseTarget.toLowerCase();
  const legoChars = new Set(legoTarget.toLowerCase().replace(/[\s\p{P}]/gu, '').split(''));
  for (const char of legoChars) {
    if (!phraseLower.includes(char)) return false;
  }
  return true;
}

// Proposed approach: LEGO appears as contiguous substring in phrase
function substringCheck(phraseTarget, legoTarget) {
  return normalize(phraseTarget).includes(normalize(legoTarget));
}

async function check() {
  // Load all build+use phrases
  let allPhrases = [];
  let offset = 0;
  const pageSize = 1000;
  while (true) {
    const { data: page } = await supabase
      .from("practice_cycles")
      .select("lego_id, phrase_role, target_text, known_text, seed_number, lego_index, position")
      .eq("course_code", "ita_for_eng")
      .gte("position", 1)
      .in("phrase_role", ["build", "use"])
      .range(offset, offset + pageSize - 1);
    if (!page || page.length === 0) break;
    allPhrases = allPhrases.concat(page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }

  // Load all LEGOs
  const { data: legos } = await supabase
    .from("course_legos")
    .select("seed_number, lego_index, target_text, known_text, type")
    .eq("course_code", "ita_for_eng");

  const legoMap = new Map();
  for (const l of legos) {
    const id = "S" + String(l.seed_number).padStart(4, "0") + "L" + String(l.lego_index).padStart(2, "0");
    legoMap.set(id, l);
  }

  let charPass = 0, charFail = 0;
  let subPass = 0, subFail = 0;
  let charPassSubFail = 0; // false positives of char check
  let charFailSubPass = 0; // false negatives of char check
  let bothFail = 0;

  const substringFailures = [];

  for (const p of allPhrases) {
    const lego = legoMap.get(p.lego_id);
    if (!lego) continue;

    const cPass = charCheck(p.target_text, lego.target_text);
    const sPass = substringCheck(p.target_text, lego.target_text);

    if (cPass) charPass++; else charFail++;
    if (sPass) subPass++; else subFail++;

    if (cPass && !sPass) charPassSubFail++; // char says OK but LEGO not actually present as substring
    if (!cPass && sPass) charFailSubPass++; // char rejects but LEGO IS present (case issue etc)
    if (!cPass && !sPass) bothFail++;

    if (!sPass) {
      substringFailures.push({
        lego_id: p.lego_id,
        lego_target: lego.target_text,
        lego_known: lego.known_text,
        lego_type: lego.type,
        phrase_role: p.phrase_role,
        phrase_target: p.target_text,
        phrase_known: p.known_text,
        charPassed: cPass
      });
    }
  }

  console.log("=== COMPARISON: char check vs substring check ===");
  console.log("Total build+use phrases:", allPhrases.length);
  console.log();
  console.log("CHAR CHECK:      pass=" + charPass + " fail=" + charFail);
  console.log("SUBSTRING CHECK: pass=" + subPass + " fail=" + subFail);
  console.log();
  console.log("Char passes but substring fails (FALSE POSITIVES of char check):", charPassSubFail);
  console.log("  → These phrases have the right letters but DON'T actually contain the LEGO");
  console.log("Char fails but substring passes:", charFailSubPass);
  console.log("  → These are recovered by substring (e.g. case issues)");
  console.log("Both fail:", bothFail);
  console.log("  → Genuinely don't contain the LEGO");

  // Show some false positives (char passes, substring fails)
  const falsePositives = substringFailures.filter(f => f.charPassed);
  console.log("\n--- FALSE POSITIVES (char check says OK, but LEGO not in phrase) — first 20 ---\n");
  for (const f of falsePositives.slice(0, 20)) {
    console.log(`${f.lego_id} [${f.lego_type}] LEGO: "${f.lego_target}" (${f.lego_known})`);
    console.log(`  [${f.phrase_role}] "${f.phrase_target}" (${f.phrase_known})`);
    console.log();
  }

  // Show both-fail by role
  const bothFailByRole = { build: 0, use: 0 };
  for (const f of substringFailures.filter(f => !f.charPassed)) {
    bothFailByRole[f.phrase_role] = (bothFailByRole[f.phrase_role] || 0) + 1;
  }
  console.log("--- BOTH FAIL by role ---");
  console.log("build:", bothFailByRole.build, "use:", bothFailByRole.use);

  // Show both-fail by lego type
  const bothFailByType = {};
  for (const f of substringFailures.filter(f => !f.charPassed)) {
    bothFailByType[f.lego_type] = (bothFailByType[f.lego_type] || 0) + 1;
  }
  console.log("By LEGO type:", JSON.stringify(bothFailByType));
}
check().catch(e => console.error(e));
