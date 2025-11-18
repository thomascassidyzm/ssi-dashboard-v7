const fs = require('fs');

const inputPath = 'public/vfs/courses/cmn_for_eng/lego_baskets_clean.json';
const outputPath = 'public/vfs/courses/cmn_for_eng/lego_baskets_v10_clean.json';
const backupPath = 'public/vfs/courses/cmn_for_eng/lego_baskets_backup.json';

console.log('Loading lego_baskets.json...');
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

/**
 * Transform old practice_phrases array format to v10 slot structure
 * Old: [["English", "中文", null, count], ...]
 * New: {short_1_to_2_legos: {slots: [{phrase: {english, mandarin}, lego_count_used}]}, ...}
 */
function transformPracticePhrases(oldPhrases) {
  const phrases = Array.isArray(oldPhrases) ? oldPhrases : [];

  // Sort by lego count (4th element in array)
  const sorted = phrases
    .filter(p => Array.isArray(p) && p.length >= 4)
    .map(p => ({
      english: p[0] || "",
      mandarin: p[1] || "",
      count: p[3] || 1
    }))
    .sort((a, b) => a.count - b.count);

  // Distribute into categories based on lego count
  const short = sorted.filter(p => p.count <= 2);
  const medium = sorted.filter(p => p.count === 3);
  const longer = sorted.filter(p => p.count === 4);
  const longest = sorted.filter(p => p.count >= 5);

  // Helper to create slot
  const createSlot = (slotId, phrase, count) => ({
    slot_id: slotId,
    phrase: {
      english: phrase?.english || "",
      mandarin: phrase?.mandarin || ""
    },
    lego_count_used: phrase ? count : null
  });

  return {
    short_1_to_2_legos: {
      description: "Short phrases using 1-2 LEGOs (fill 2 slots)",
      target_count: 2,
      slots: [
        createSlot("short_1", short[0], short[0]?.count),
        createSlot("short_2", short[1], short[1]?.count)
      ]
    },
    medium_3_legos: {
      description: "Medium phrases using exactly 3 LEGOs (fill 2 slots)",
      target_count: 2,
      slots: [
        createSlot("medium_1", medium[0], medium[0]?.count),
        createSlot("medium_2", medium[1], medium[1]?.count)
      ]
    },
    longer_4_legos: {
      description: "Longer phrases using exactly 4 LEGOs (fill 2 slots)",
      target_count: 2,
      slots: [
        createSlot("longer_1", longer[0], longer[0]?.count),
        createSlot("longer_2", longer[1], longer[1]?.count)
      ]
    },
    longest_5_legos: {
      description: "Longest phrases using 5+ LEGOs (fill 4 slots)",
      target_count: 4,
      slots: [
        createSlot("longest_1", longest[0], longest[0]?.count),
        createSlot("longest_2", longest[1], longest[1]?.count),
        createSlot("longest_3", longest[2], longest[2]?.count),
        createSlot("longest_4", longest[3], longest[3]?.count)
      ]
    },
    bonus_optional: {
      description: "OPTIONAL bonus phrases for extra practice or refinement (0-2 slots)",
      target_count: 0,
      max_count: 2,
      slots: [
        createSlot("bonus_1", longest[4], longest[4]?.count),
        createSlot("bonus_2", longest[5], longest[5]?.count)
      ]
    }
  };
}

/**
 * Transform components array to v10 format
 * Old: [[chinese, english], ...] or [{chinese, english}, ...]
 * New: [{mandarin: chinese, english: english}, ...]
 */
function transformComponents(oldComponents) {
  if (!oldComponents) return undefined;

  return oldComponents.map(comp => {
    if (Array.isArray(comp)) {
      return {
        mandarin: comp[0] || "",
        english: comp[1] || ""
      };
    } else if (comp && typeof comp === 'object') {
      // Handle various field name possibilities
      return {
        mandarin: comp.mandarin || comp.chinese || comp.target || comp[0] || "",
        english: comp.english || comp.known || comp[1] || ""
      };
    }
    return { mandarin: "", english: "" };
  });
}

/**
 * Transform current_seed_legos_available to current_seed_earlier_legos
 */
function transformEarlierLegos(oldLegos) {
  if (!oldLegos || !Array.isArray(oldLegos)) return [];

  return oldLegos.map(lego => {
    if (Array.isArray(lego)) {
      return {
        id: "unknown",
        english: lego[0] || "",
        mandarin: lego[1] || "",
        type: "A"
      };
    } else if (lego && typeof lego === 'object') {
      return {
        id: lego.id || "unknown",
        english: lego.english || lego.known || lego[0] || "",
        mandarin: lego.mandarin || lego.target || lego[1] || "",
        type: lego.type || "A"
      };
    }
    return { id: "unknown", english: "", mandarin: "", type: "A" };
  });
}

/**
 * Transform a single basket to v10 format
 */
function transformBasket(basketId, oldBasket) {
  // Handle lego field (array or object)
  let lego = { english: "", mandarin: "" };
  if (Array.isArray(oldBasket.lego)) {
    lego = {
      english: oldBasket.lego[0] || "",
      mandarin: oldBasket.lego[1] || ""
    };
  } else if (oldBasket.lego && typeof oldBasket.lego === 'object') {
    lego = {
      english: oldBasket.lego.english || oldBasket.lego.known || "",
      mandarin: oldBasket.lego.mandarin || oldBasket.lego.target || ""
    };
  }

  // Transform practice phrases
  const practicePhrases = transformPracticePhrases(oldBasket.practice_phrases);

  // Build v10 basket
  const v10Basket = {
    lego_id: basketId,
    lego: lego,
    type: oldBasket.type || "A",
    is_final_lego: oldBasket.is_final_lego || false,
    current_seed_earlier_legos: transformEarlierLegos(
      oldBasket.current_seed_legos_available ||
      oldBasket.current_seed_earlier_legos ||
      []
    ),
    practice_phrases: practicePhrases,
    total_required_phrases: 10,
    total_optional_phrases: 2,
    _metadata: {
      lego_id: basketId,
      seed_context: oldBasket._metadata?.seed_context || {
        english: "",
        mandarin: ""
      }
    }
  };

  // Add components if they exist
  if (oldBasket.components) {
    v10Basket.components = transformComponents(oldBasket.components);
  }

  return v10Basket;
}

// Transform all baskets
console.log('Transforming baskets to v10 format...');
const transformedBaskets = {};
let transformCount = 0;
let errorCount = 0;

for (const [basketId, basket] of Object.entries(data.baskets)) {
  try {
    transformedBaskets[basketId] = transformBasket(basketId, basket);
    transformCount++;

    if (transformCount % 100 === 0) {
      console.log(`  Transformed ${transformCount} baskets...`);
    }
  } catch (error) {
    console.error(`ERROR transforming ${basketId}:`, error.message);
    errorCount++;
  }
}

console.log(`\n✅ Transformation complete!`);
console.log(`   Transformed: ${transformCount} baskets`);
console.log(`   Errors: ${errorCount}`);

// Create output with metadata
const output = {
  metadata: {
    version: "v10.0_explicit_slot_categories",
    transformed_at: new Date().toISOString(),
    total_baskets: transformCount,
    format: "Phase 5 v10 explicit slot structure",
    languages: {
      source: "english",
      target: "mandarin",
      course: "cmn_for_eng"
    },
    original_metadata: data.metadata
  },
  baskets: transformedBaskets
};

// Backup original
console.log(`\nBacking up original to: ${backupPath}`);
fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));

// Write v10 version
console.log(`Writing v10 format to: ${outputPath}`);
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log('\n✅ Done!');
console.log(`\nNext steps:`);
console.log(`1. Review: ${outputPath}`);
console.log(`2. If good, replace original: mv ${outputPath} ${inputPath}`);
