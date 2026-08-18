/**
 * Shared loader for the known-side gate sweep: contract resolution + introduced-vocab inventory.
 *
 * The inventory is Map(normalisedKnownForm -> earliest seed_number at which the learner has it).
 * It is built from what the course actually TEACHES on the known side: every LEGO's known_text,
 * every component's known gloss, and — critically — the individual words of multi-word glosses,
 * since a learner given the M-LEGO "नहीं जानता" has been given both of its parts.
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { normalizeKnown, segmentKnown, NO_SPACE_SCRIPTS, detectScript } = require('../../services/course-builder/lib/known-side-script.cjs');

const CONTRACT_DIR = path.join(__dirname, '..', '..', 'docs', 'pair-contracts');

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

const knownLangOf = (courseCode) => (courseCode || '').replace(/_v\d+$/, '').split('_for_')[1] || null;
const targetLangOf = (courseCode) => (courseCode || '').replace(/_v\d+$/, '').split('_for_')[0] || null;

/**
 * Resolve a contract for a course, in precedence order:
 *   1. the pair-specific contract        docs/pair-contracts/<course>.contract.cjs
 *   2. the known-LANGUAGE brief          docs/pair-contracts/_known_<lang>.contract.cjs
 *   3. the shared English scaffold       docs/pair-contracts/_default_eng.contract.cjs
 *
 * Step 2 is new. The 2026-06 briefs were filed under a course code (eng_for_hin) but describe a
 * KNOWN LANGUAGE, so they applied to one course when they are valid for every course with that
 * known side — kor_for_hin and zho_for_hin were left contract-less, and therefore unchecked,
 * purely because of where the file was filed.
 */
function loadContract(courseCode) {
  const code = (courseCode || '').replace(/_v\d+$/, '');
  const lang = knownLangOf(code);
  const tries = [
    [`${code}.contract.cjs`, 'pair'],
    [`_known_${lang}.contract.cjs`, 'known-language'],
  ];
  // A known-side BRIEF for the same known language, filed under another course code. Restricted
  // to the brief schema (`freeClass`) so a target-coupled pair contract is never lent sideways,
  // and never for English, which has its own deliberate shared scaffold below.
  if (lang !== 'eng') {
    for (const f of fs.readdirSync(CONTRACT_DIR)) {
      if (!f.endsWith('.contract.cjs') || f.startsWith('_')) continue;
      if (knownLangOf(f.replace('.contract.cjs', '')) !== lang) continue;
      try { if (!Array.isArray(require(path.join(CONTRACT_DIR, f)).freeClass)) continue; } catch (_) { continue; }
      tries.push([f, 'known-language brief (borrowed)']);
    }
  }
  if (lang === 'eng') tries.push(['_default_eng.contract.cjs', 'default-eng']);

  for (const [file, source] of tries) {
    const p = path.join(CONTRACT_DIR, file);
    if (!fs.existsSync(p)) continue;
    try {
      const contract = require(p);
      if (contract.known_lang && lang && contract.known_lang !== lang) continue;
      return { contract, source, file };
    } catch (err) {
      return { contract: null, source: 'load-error', file, error: err.message };
    }
  }
  return { contract: null, source: 'none', file: null };
}

async function pageAll(sb, table, cols, courseCode) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(cols).eq('course_code', courseCode)
      .order('seed_number', { ascending: true }).order('id', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

/** Build Map(form -> first seed) from a course's LEGO known side. */
function buildInventory(legos, script) {
  const inv = new Map();
  const noSpace = NO_SPACE_SCRIPTS.has(script);
  const add = (form, seed) => {
    const f = normalizeKnown(form);
    if (!f) return;
    if (!inv.has(f) || inv.get(f) > seed) inv.set(f, seed);
  };
  for (const l of legos) {
    const seed = l.seed_number;
    add(l.known_text, seed);
    for (const c of l.components || []) add(c.known, seed);
    // Words of a multi-word gloss are individually taught by that gloss.
    if (!noSpace) {
      for (const src of [l.known_text, ...(l.components || []).map((c) => c.known)]) {
        if (!src) continue;
        const seg = segmentKnown(src, { script });
        if (seg.tokens.length > 1) for (const t of seg.tokens) add(t, seed);
      }
    }
  }
  return inv;
}

/** Everything the sweep needs for one course. */
async function loadCourse(sb, courseCode) {
  const legos = await pageAll(sb, 'course_legos', 'lego_id,seed_number,lego_index,known_text,target_text,components', courseCode);
  const phrases = await pageAll(sb, 'course_practice_phrases', 'id,seed_number,lego_index,known_text,target_text,phrase_role', courseCode);
  const { contract, source, file, error } = loadContract(courseCode);
  const sample = [...legos, ...phrases].map((r) => r.known_text).filter(Boolean).slice(0, 400).join(' ');
  const script = (contract && contract.script) || detectScript(sample);
  return {
    courseCode,
    knownLang: knownLangOf(courseCode),
    targetLang: targetLangOf(courseCode),
    contract, contractSource: source, contractFile: file, contractError: error,
    script,
    legos, phrases,
    inventory: buildInventory(legos, script),
  };
}

module.exports = { supa, loadContract, loadCourse, buildInventory, pageAll, knownLangOf, targetLangOf, CONTRACT_DIR };
