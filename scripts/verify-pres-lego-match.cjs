const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Get all presentations
  const { data: pres } = await supabase
    .from("course_audio")
    .select("id, lego_id, text, created_at")
    .eq("course_code", "zho_for_eng")
    .eq("role", "presentation")
    .order("lego_id")
    .order("created_at", { ascending: false });

  // Get LEGO known_texts
  const { data: legos } = await supabase
    .from("lego_cycles")
    .select("lego_id, known_text")
    .eq("course_code", "zho_for_eng");

  const legoKnown = new Map();
  for (const l of legos) {
    legoKnown.set(l.lego_id, l.known_text.toLowerCase().trim());
  }

  // Group presentations by lego_id and check if they match
  const byLego = new Map();
  for (const p of pres) {
    if (!byLego.has(p.lego_id)) byLego.set(p.lego_id, []);
    byLego.get(p.lego_id).push(p);
  }

  // Check duplicates
  let mismatches = 0;
  const examples = [];

  for (const [legoId, presentations] of byLego) {
    if (presentations.length > 1) {
      const expectedKnown = legoKnown.get(legoId);

      // Extract known_text from each presentation
      const extracted = presentations.map(p => {
        const startIdx = p.text.indexOf("for '");
        if (startIdx === -1) return null;
        const afterFor = p.text.slice(startIdx + 5);
        let endIdx = afterFor.indexOf("', as in");
        if (endIdx === -1) endIdx = afterFor.indexOf("', is:");
        if (endIdx === -1) endIdx = afterFor.indexOf("' is:");
        if (endIdx === -1) return null;
        return afterFor.slice(0, endIdx).toLowerCase().trim();
      });

      // Check if all match expected
      const allMatch = extracted.every(e => e === expectedKnown);
      if (!allMatch) {
        mismatches++;
        if (examples.length < 5) {
          examples.push({
            legoId,
            expectedKnown,
            presentations: presentations.map((p, i) => ({
              extracted: extracted[i],
              date: p.created_at.split('T')[0],
              text: p.text.substring(0, 80)
            }))
          });
        }
      }
    }
  }

  console.log("LEGOs with multiple presentations:", [...byLego.values()].filter(v => v.length > 1).length);
  console.log("Mismatches (different known_text):", mismatches);

  if (examples.length > 0) {
    console.log("\nMismatch examples:");
    for (const ex of examples) {
      console.log("\n  LEGO:", ex.legoId, "| Expected:", ex.expectedKnown);
      for (const p of ex.presentations) {
        console.log("    ", p.date, "| Extracted:", p.extracted);
        console.log("      ", p.text);
      }
    }
  } else {
    console.log("\n✓ All duplicates have matching known_text - safe to dedupe");
  }
})();
