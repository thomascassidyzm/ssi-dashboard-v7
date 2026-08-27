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

async function buildPrompt(supabase, courseCode, seedNumber, legoIndex) {
  const inv = await buildInventory(supabase, courseCode, seedNumber, legoIndex);
  if (!inv.targetLego) throw new Error(`no LEGO at ${courseCode} seed ${seedNumber} L${legoIndex}`);

  const { data: seed } = await supabase
    .from('course_seeds').select('known_text,target_text')
    .eq('course_code', courseCode).eq('seed_number', seedNumber).single();

  const spec = SPECIMENS[courseCode] || SPECIMENS.spa_for_eng;
  // Never show a builder the answer to its own question. When the LEGO being
  // authored IS one of the specimens, the specimen is withheld and the omission
  // is stated in the prompt rather than silently dropped.
  const isSelf = (sp) => sp.seed === seedNumber && sp.lego === legoIndex;
  const pos = isSelf(spec.positive) ? null : await fetchSpecimen(supabase, courseCode, spec.positive.seed, spec.positive.lego);
  const neg = isSelf(spec.negative) ? null : await fetchSpecimen(supabase, courseCode, spec.negative.seed, spec.negative.lego);

  const avail = renderAvailable(inv);
  const blocked = renderBlocked(inv);
  const L = inv.targetLego;

  const prompt = `${fs.readFileSync(DOCTRINE, 'utf8')}

---

# YOUR TASK

Course: **${courseCode}** — the learner's known language is English, the target
language is Spanish.

Seed ${seedNumber}: "${seed?.known_text}" -> "${seed?.target_text}"

**The new LEGO you are writing phrases for:**

    ${L.lego_id}  [${L.type}]  "${L.known_text}"  ->  "${L.target_text}"

Write **at least 4 BUILD and at least 5 USE phrases** for it.

---

## SPECIMEN — do what this does

${renderSpecimen(pos)}

${pos ? `*${spec.positive.note}*` : ''}

## SPECIMEN — do not do what this does

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
