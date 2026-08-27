#!/usr/bin/env node
/**
 * Assemble the v3 phrase prompt for one real LEGO of one real course.
 *
 * doctrine (prompts/phrase-prompt-v3-zut-edges.md)
 *   + the two specimens, PULLED FROM THE DATABASE rather than retyped
 *   + the actual per-seed inventory: what is available, and what is blocked
 *   = the prompt a building agent is handed.
 *
 * SPECIMENS BEAT RULES. Builders imitate a worked example far better than they
 * follow a rule, so the positive and negative specimens are the live spa rows
 * Tom hand-graded on 2026-08-27 — spa 358 "la cima" as the good one, spa 206 L1
 * "disfruto" as the bad one. They are read fresh from `course_practice_phrases`
 * every time, so if the estate repairs them the prompt follows.
 *
 * Every arm of the model comparison is assembled by THIS function against the
 * SAME inventory object. That is the only thing that makes the comparison about
 * the generator rather than about the material.
 *
 * READ-ONLY.
 *
 * Usage:
 *   node tools/phrase-lab/build-prompt.cjs spa_for_eng 358 1
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { buildInventory } = require('./inventory.cjs');

const DOCTRINE = path.join(__dirname, '../../prompts/phrase-prompt-v3-zut-edges.md');

// The specimens are ALWAYS the Spanish rows, for every course. There is no
// Tom-graded specimen in any other course, and the live content in all of them
// clears the floors essentially never — so there is no honest in-course positive
// to substitute. Holding them constant is also what keeps the arms comparable
// ACROSS courses, which is the point of the five-language replication. The
// prompt labels them as another course's Spanish, shown for the SHAPE of the
// set: the English known side is what carries the lesson and it is common to
// all six courses (the English seed corpus is shared estate-wide).
//
// KNOWN CONFOUND, flagged in every report: a Spanish specimen may help a Romance
// course more than it helps Japanese. If the cross-course numbers show exactly
// that gradient, it is a caveat, not a finding about the language.
const SPECIMEN_COURSE = 'spa_for_eng';

// Language names come from the course-builder's own table, not from a six-entry
// map local to the lab. The lab only ever ran six courses; the builder runs 149,
// and a course whose target was not in the local map was handed its raw ISO code
// as the name of the language it was being asked to write.
// getLanguageName reads the target half. The known half has no helper of its own
// that resolves names — briefs/shared.cjs uses the LANG_MAP export, which is a
// DEPRECATED EMPTY OBJECT at runtime, so it returns the raw ISO code. Go through
// the same CSV service getLanguageName uses, by flipping the course code.
const { getLanguageName, DIALECT_NAMES } = require('../../services/course-builder/lib/language-config.cjs');

function knownLanguageName(courseCode) {
  const known = String(courseCode || '').split('_for_')[1] || 'eng';
  return DIALECT_NAMES[known] || getLanguageName(`${known}_for_x`);
}

const SPECIMENS = {
  spa_for_eng: {
    positive: { seed: 358, lego: 1, note: 'four genuinely different pattern moves. Honestly short on position — 100% end. Your job is to do what this does AND put the LEGO at the start and in the filling.' },
    negative: { seed: 206, lego: 1, note: '100% start position, 100% first person, zero negation, zero questions, zero filling, and the tails redraw the same reassurance clause over and over. One of them smuggles "con mis amigos" into a target whose prompt never asks for it.' }
  }
};

async function fetchSpecimen(supabase, courseCode, seedNumber, legoIndex) {
  const { data: lego } = await supabase
    .from('course_legos')
    .select('lego_id,type,known_text,target_text')
    .eq('course_code', courseCode).eq('seed_number', seedNumber).eq('lego_index', legoIndex).single();
  const { data: rows } = await supabase
    .from('course_practice_phrases')
    .select('id,phrase_role,known_text,target_text')
    .eq('course_code', courseCode).eq('seed_number', seedNumber).eq('lego_index', legoIndex).order('id');
  return { lego, rows: (rows || []).filter((r) => r.phrase_role === 'build' || r.phrase_role === 'use') };
}

function renderSpecimen(s) {
  if (!s) return '(withheld — this is the LEGO you are being asked to write, so you are not being shown an answer)';
  if (!s.lego) return '(specimen unavailable)';
  const lines = [`LEGO: "${s.lego.known_text}" -> "${s.lego.target_text}"  [${s.lego.type}]`];
  for (const r of s.rows) lines.push(`  ${r.phrase_role.toUpperCase().padEnd(5)} ${r.known_text}  ->  ${r.target_text}`);
  return lines.join('\n');
}

/** Available vocabulary, most recent first — the order the doctrine tells them to read it in. */
function renderAvailable(inv, limit = 900) {
  const sorted = [...inv.available].sort((a, b) => b.seedNumber - a.seedNumber || a.legoIndex - b.legoIndex);
  const shown = sorted.slice(0, limit);
  const lines = shown.map((i) => `${i.seedNumber}\t${i.known}\t${i.target}\t${i.kind === 'component' ? i.legoId + '#c' : i.legoId}`);
  const truncated = sorted.length - shown.length;
  return { text: lines.join('\n'), truncated, total: sorted.length };
}

function renderBlocked(inv, limit = 400) {
  const seen = new Set();
  const out = [];
  for (const b of [...inv.blocked].sort((a, b2) => b2.seedNumber - a.seedNumber)) {
    const k = String(b.known || '').toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(`${b.known}\t[${b.reason}] ${b.detail}`);
    if (out.length >= limit) break;
  }
  return { text: out.join('\n'), total: seen.size };
}

/**
 * @param {object} [opts]
 * @param {object} [opts.proposedLego] {known, target, type} — a LEGO the builder
 *   has decided on but has NOT yet submitted. `POST /api/seed/complete` writes a
 *   seed's LEGOs and its phrases in one atomic call, so during a live build the
 *   LEGO being authored is by definition not in the database yet. The inventory
 *   is unaffected — it is built from seeds 1..N-1 plus the EARLIER LEGOs of seed
 *   N, none of which is this one. Only the "here is what you are writing for"
 *   line needs the proposal. Omit it and the LEGO is read from the database, as
 *   the lab does when it re-authors existing content.
 */
async function buildPrompt(supabase, courseCode, seedNumber, legoIndex, opts = {}) {
  const inv = await buildInventory(supabase, courseCode, seedNumber, legoIndex);
  if (!inv.targetLego && opts.proposedLego) {
    const p = opts.proposedLego;
    if (!p.known || !p.target) throw new Error('proposedLego needs both known and target');
    inv.targetLego = {
      lego_id: `S${String(seedNumber).padStart(4, '0')}L${String(legoIndex).padStart(2, '0')}`,
      type: p.type || 'A',
      known_text: p.known,
      target_text: p.target,
      proposed: true,
    };
  }
  if (!inv.targetLego) throw new Error(`no LEGO at ${courseCode} seed ${seedNumber} L${legoIndex} — pass lego_known/lego_target if it has not been submitted yet`);

  const { data: seed } = await supabase
    .from('course_seeds').select('known_text,target_text')
    .eq('course_code', courseCode).eq('seed_number', seedNumber).single();

  const spec = SPECIMENS[SPECIMEN_COURSE];
  // Never show a builder the answer to its own question. When the LEGO being
  // authored IS one of the specimens, the specimen is withheld and the omission
  // is stated in the prompt rather than silently dropped.
  const isSelf = (sp) => courseCode === SPECIMEN_COURSE && sp.seed === seedNumber && sp.lego === legoIndex;
  const pos = isSelf(spec.positive) ? null : await fetchSpecimen(supabase, SPECIMEN_COURSE, spec.positive.seed, spec.positive.lego);
  const neg = isSelf(spec.negative) ? null : await fetchSpecimen(supabase, SPECIMEN_COURSE, spec.negative.seed, spec.negative.lego);

  const targetLangName = getLanguageName(courseCode);
  const knownLangName = knownLanguageName(courseCode);
  const englishKnown = knownLangName === 'English';
  // The specimen's known side is English. For an English-known course that is
  // the lesson and it transfers for free. For cym_for_yor it does not: the
  // builder is writing Yoruba prompts, and a silent English specimen is exactly
  // how a known-side language leak gets authored. Say so instead of hiding it.
  const foreignSpecimenNote = courseCode === SPECIMEN_COURSE ? '' :
    `*This specimen is from the Spanish course, not yours. It is here for the SHAPE of the phrase set — how the new LEGO is moved around, what it is made to touch, how the pattern changes phrase to phrase. Do NOT copy its Spanish; write ${targetLangName}.*${englishKnown ? '' : `
*Its known side is English. YOURS IS ${knownLangName.toUpperCase()}. Read the specimen for shape only — every \`known\` you write must be ${knownLangName}, never English.*`}
`;

  const avail = renderAvailable(inv);
  const blocked = renderBlocked(inv);
  const L = inv.targetLego;

  const prompt = `${fs.readFileSync(DOCTRINE, 'utf8')}

---

# YOUR TASK

Course: **${courseCode}** — the learner's known language is ${knownLangName}, the
target language is ${targetLangName}. Every \`known\` you write is ${knownLangName};
every \`target\` you write is ${targetLangName}.

Seed ${seedNumber}: "${seed?.known_text}" -> "${seed?.target_text}"

**The new LEGO you are writing phrases for:**

    ${L.lego_id}  [${L.type}]  "${L.known_text}"  ->  "${L.target_text}"

Write **at least 4 BUILD and at least 5 USE phrases** for it.

---

## SPECIMEN — do what this does

${foreignSpecimenNote}
${renderSpecimen(pos)}

${pos ? `*${spec.positive.note}*` : ''}

## SPECIMEN — do not do what this does

${foreignSpecimenNote}
${renderSpecimen(neg)}

${neg ? `*${spec.negative.note}*` : ''}

---

## AVAILABLE — every mapping you may reach for, MOST RECENT FIRST

${avail.total} items. Columns: seed / known / target / lego id. The recency axis
is measured against this ordering, so the top of this list is where the value is.
${avail.truncated ? `\n(showing the ${avail.total - avail.truncated} most recent of ${avail.total}; the oldest ${avail.truncated} are omitted and you should not be reaching for them anyway)\n` : ''}
\`\`\`
${avail.text}
\`\`\`

## BLOCKED — NOT YET. Do not reach for any of these.

${blocked.total} known glosses whose mapping is not deterministic at this point in
the course. Each will unlock later; none of them is usable now. Using one is a
gate failure, exactly as if the word had never been introduced.

\`\`\`
${blocked.text}
\`\`\`

---

Return JSON only. No prose, no code fence, no commentary. Begin with \`{\`.
`;

  return { prompt, inventory: inv, lego: L, seed };
}

async function main() {
  const [courseCode, seedArg, legoArg] = process.argv.slice(2);
  if (!courseCode || !seedArg) {
    console.error('usage: node tools/phrase-lab/build-prompt.cjs <course> <seed> [legoIndex]');
    process.exit(1);
  }
  const { supabase } = require('../../services/supabase-client.cjs');
  const { prompt } = await buildPrompt(supabase, courseCode, Number(seedArg), Number(legoArg || 1));
  process.stdout.write(prompt);
}

module.exports = { buildPrompt, renderAvailable, renderBlocked };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
