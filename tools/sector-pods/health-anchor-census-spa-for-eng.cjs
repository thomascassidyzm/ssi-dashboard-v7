#!/usr/bin/env node
/**
 * Read-only census: measure Appendix A ("the assumed-ownership inventory") coverage
 * against spa_for_eng's course_legos + course_practice_phrases (component rows).
 *
 * Run with:
 *   NODE_PATH=/home/tomcassidy/SSi/ssi-dashboard-v7-clean/node_modules node tools/sector-pods/health-anchor-census-spa-for-eng.cjs
 *
 * No writes. No DDL. No content changes.
 */
require('dotenv').config({ path: '.env.psql' });
const { Client } = require('pg');

const COURSE = 'spa_for_eng';

// Appendix A inventory, transcribed mechanically from
// docs/sector-pods/health-general-seed-set-2026-08-31.md, section
// "Appendix A — the assumed-ownership inventory (the anchor's binding contract)"
// (origin/main, commit as of 2026-08-31). Each entry is the KNOWN-side (English) string.
const APPENDIX_A = [
  // From scene 0 (W1201-W1204) — quoted/paraphrased chunks cited by step
  "before we start", "if we get stuck", "if I get properly stuck", "if that's all right",
  "stop me", "I'd rather be stopped", "I'll do the same if I lose you",
  "of course", "yours it is", "no trouble at all",
  "another day, then",
  "on my own, mostly", "a bit every day for about a year", "I still get most of it wrong",
  "right — the reason I came",

  // Core everyday glue and frames, as strings
  "hello", "good morning", "my name's", "what's your name", "of course", "thank you",
  "thank you for telling me", "don't worry", "look", "right", "right then", "so", "then",
  "but", "and", "first", "just", "any time", "at all", "not at all", "no problem",
  "no trouble", "I'm afraid", "I promise", "honestly", "remember", "hold on", "come on",
  "careful", "ready", "anyway", "I need to", "I've got", "I can", "let me just",
  "shall I", "shall we", "can you tell me", "can you … for me", "what would you like",
  "which would you like", "can I get you anything", "before I go", "before we start",
  "before they come", "if that's alright", "if that's possible", "if you can",
  "if you like", "if you need anything", "if you're not sure", "if you're ready",
  "if you forget", "if you're tired", "take your time", "no rush", "well done",
  "good question", "give me a minute", "it won't take a minute", "to be safe",
  "see how you go", "that's all", "that's it", "whatever it is", "where were we",
  "a hard question", "you're alright", "you'll be fine", "you've done nothing wrong",
  "will do you good", "how about",

  // Core time, number and place
  "half past two", "at two", "at twelve", "till eight", "today", "tonight", "yesterday",
  "tomorrow", "this morning", "this evening", "this year", "after lunch", "after tea",
  "after work", "at night", "in the mornings", "later", "now", "a minute", "a second",
  "a while", "in an hour", "an hour or so", "a day or two", "every day", "all day",
  "three years", "about a year", "from now on", "the whole way", "at the moment",
  "at first", "at last", "straight away", "not long now", "here", "there", "at home",
  "this place", "on the left", "by the bed", "next to the bed", "out of the way",
  "the bed", "the table", "the light", "the water", "the food", "the weather",
  "the people",

  // Core comparison and quantity
  "much better", "better or worse", "worse than", "better than", "the same as",
  "more slowly", "a bit more", "a little", "a little bit", "plenty of", "enough",
  "another", "only", "everything", "anything", "anything else", "anyone", "someone",
  "nothing big", "kind", "fine", "quiet", "easy", "safer", "a long day",
  "a long way from here",

  // Core people and daily life
  "family", "home", "water", "lunch", "sleep", "a little sleep", "you can rest",
  "help", "she worries",
  // "personal names as slot content" — not a matchable string, excluded from the census.
];

// De-dup (e.g. "before we start" and "of course" appear twice in the source doc).
const APPENDIX_A_UNIQUE = [...new Set(APPENDIX_A)];

function normalize(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/^["'“”‘’.,;:!?()\-–—\s]+/, '')
    .replace(/["'“”‘’.,;:!?()\-–—\s]+$/, '')
    .replace(/\s+/g, ' ');
}

// Chunks containing "…" or placeholders are not literal strings that can appear verbatim
// in course content — flag them separately rather than silently matching nothing.
function isLiteralMatchable(s) {
  return !s.includes('…') && !s.includes('...');
}

const CHECKPOINTS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, Infinity];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const legosRes = await client.query(
    `select seed_number, lego_index, lego_id, known_text
     from course_legos
     where course_code = $1
     order by seed_number, lego_index`,
    [COURSE]
  );
  const compRes = await client.query(
    `select seed_number, lego_index, lego_id, known_text
     from course_practice_phrases
     where course_code = $1 and phrase_role = 'component'
     order by seed_number, lego_index`,
    [COURSE]
  );

  console.log(`spa_for_eng: ${legosRes.rowCount} lego rows, ${compRes.rowCount} component rows`);

  // Build a stream of (seed_number, lego_id, normalized known_text) events in seed order,
  // merging legos and components, so we can compute "owned by end of seed N".
  const events = [];
  for (const row of legosRes.rows) {
    events.push({ seed: row.seed_number, lego_id: row.lego_id, text: normalize(row.known_text || '') });
  }
  for (const row of compRes.rows) {
    events.push({ seed: row.seed_number, lego_id: row.lego_id, text: normalize(row.known_text || '') });
  }
  events.sort((a, b) => a.seed - b.seed);

  const maxSeed = Math.max(...legosRes.rows.map(r => r.seed_number));

  // For each Appendix A entry, find the first seed number at which it is owned
  // (owned = whole-chunk match against normalized known_text of a lego or component row).
  const literalEntries = APPENDIX_A_UNIQUE.filter(isLiteralMatchable);
  const nonLiteralEntries = APPENDIX_A_UNIQUE.filter(e => !isLiteralMatchable(e));

  const normToFirstSeed = new Map(); // normalized known_text -> earliest seed_number
  for (const ev of events) {
    if (!normToFirstSeed.has(ev.text) || ev.seed < normToFirstSeed.get(ev.text)) {
      normToFirstSeed.set(ev.text, ev.seed);
    }
  }

  const firstOwnedSeed = {}; // entry -> seed number or null
  for (const entry of literalEntries) {
    const norm = normalize(entry);
    firstOwnedSeed[entry] = normToFirstSeed.has(norm) ? normToFirstSeed.get(norm) : null;
  }

  // Coverage curve
  console.log('\n--- Coverage curve (cumulative fraction of literal-matchable Appendix A owned) ---');
  const total = literalEntries.length;
  const curve = [];
  for (const cp of CHECKPOINTS) {
    const ownedCount = literalEntries.filter(e => firstOwnedSeed[e] !== null && firstOwnedSeed[e] <= cp).length;
    curve.push({ checkpoint: cp === Infinity ? `end (seed ${maxSeed})` : `seed ${cp}`, owned: ownedCount, total, pct: ((ownedCount / total) * 100).toFixed(1) });
  }
  for (const row of curve) {
    console.log(`${row.checkpoint}: ${row.owned}/${row.total} (${row.pct}%)`);
  }

  // Full coverage point
  const neverOwned = literalEntries.filter(e => firstOwnedSeed[e] === null);
  const maxOwnedSeed = Math.max(...literalEntries.filter(e => firstOwnedSeed[e] !== null).map(e => firstOwnedSeed[e]));
  console.log(`\nFull coverage of everything that IS ever owned arrives by seed ${maxOwnedSeed}.`);
  console.log(`Entries NEVER owned anywhere in the course (${neverOwned.length}):`);
  neverOwned.forEach(e => console.log(`  - "${e}"`));

  console.log(`\nNon-literal entries excluded from matching (contain "…"), reported separately (${nonLiteralEntries.length}):`);
  nonLiteralEntries.forEach(e => console.log(`  - "${e}"`));

  // Shortfall at candidate earliest anchors: try each seed number in ascending order,
  // report the shortfall (chunks not yet owned) at each of a few candidate points.
  console.log('\n--- Shortfall detail at candidate anchors ---');
  const candidates = [1, 5, 10, 20, 30, 50, 100, 150, 200, 250, 300, 400, 500, maxOwnedSeed];
  for (const cand of [...new Set(candidates)].sort((a, b) => a - b)) {
    const shortfall = literalEntries.filter(e => firstOwnedSeed[e] === null || firstOwnedSeed[e] > cand);
    console.log(`at/after seed ${cand}: shortfall = ${shortfall.length}/${total}`);
  }

  // Scene 0 search: W1201-W1204 do not exist as lego content per se (they're walk/turn ids
  // from a different authoring system - "core walks"). Search course_seeds / course_legos /
  // course_practice_phrases for any trace of "W1201" style walk ids, and separately search
  // for the scene-0 hallmark strings across ALL courses.
  console.log('\n--- Scene 0 (W1201-W1204) search ---');
  const walkIdSearch = await client.query(
    `select table_name, count(*) from (
       select 'course_legos' as table_name from course_legos where known_text ilike '%W1201%' or known_text ilike '%W1202%' or known_text ilike '%W1203%' or known_text ilike '%W1204%'
       union all
       select 'course_practice_phrases' from course_practice_phrases where known_text ilike '%W1201%' or known_text ilike '%W1202%' or known_text ilike '%W1203%' or known_text ilike '%W1204%'
       union all
       select 'course_seeds' from course_seeds where known_text ilike '%W1201%' or known_text ilike '%W1202%' or known_text ilike '%W1203%' or known_text ilike '%W1204%'
     ) t group by table_name`
  );
  console.log('Rows literally containing "W1201".."W1204" as text:', walkIdSearch.rows);

  const hallmarkPhrases = [
    "I'd rather be stopped",
    "no trouble at all",
    "on my own, mostly",
    "yours it is",
  ];
  for (const phrase of hallmarkPhrases) {
    const r = await client.query(
      `select course_code, seed_number, lego_index, known_text from course_legos where known_text ilike $1 limit 5`,
      [`%${phrase}%`]
    );
    console.log(`Search for "${phrase}" in course_legos (any course): ${r.rowCount} match(es)`, r.rows.map(x => `${x.course_code} S${x.seed_number}L${x.lego_index}`));
  }

  // Also check whether a "scene 0" / "core walk" concept exists in any table at all.
  const tablesRes = await client.query(
    `select table_name from information_schema.tables where table_schema='public' and (table_name ilike '%walk%' or table_name ilike '%scene%')`
  );
  console.log('\nTables matching %walk% or %scene%:', tablesRes.rows.map(r => r.table_name));

  await client.end();
}

main().catch(err => { console.error(err); process.exit(1); });
