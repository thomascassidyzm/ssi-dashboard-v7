#!/usr/bin/env node
/**
 * COULD-OCCUPY SEED TAGGING — the seed corpus as the metagraph's material
 * supply, indexed by shape position.
 *
 * THE CONSTRAINT THAT DECIDES THE SCHEMA. A seed CANNOT ATTEST A SHAPE. A move
 * is a position inside a shape, which is a property of a TURN — it is defined
 * relative to the turn before it ("the responder supplies exactly what the
 * prior turn asked for") — and a seed is a single sentence with no turn around
 * it. So every tag here is a COULD-OCCUPY: *if* a turn were built around this
 * sentence, which position could it fill? The field is named `could_occupy`,
 * the doc says could-occupy, and nothing in this file may ever be read as
 * attestation. Attestation lives in the pod corpus and nowhere else.
 *
 * WHAT IT IS FOR. An author or a generator needing a hedge, a
 * can't-comply-with-reason or a read-back should draw on the pair's own worn
 * forms rather than inventing one. 2,174 attested English sentences indexed by
 * shape position is that pool.
 *
 * KEYED BY known_language, TEXT-KEYED WITHIN IT. There is ONE canonical SEED
 * set and it is identical by definition. A course's KNOWN TEXT is a different
 * object: derived from the seed, and legitimately differentiated per pair,
 * because the known side is a teaching instrument. That is what the counts
 * here measure — across the 83 eng-known courses there are 2,174 distinct
 * normalised known texts, of which only ~653 appear in most courses and 1,143
 * appear in exactly one; seed 1 alone has 116 distinct known texts across 130
 * courses. Divergence in the known side is CAUSED BY CUTTING: a LEGO is a cut,
 * character-exactness has to enforce the disambiguation with no gloss, so the
 * pair's cuts reach back and differentiate the English. So a tag is filed against the
 * TEXT and carries the seed numbers it is known by — a course inherits a tag by
 * matching text, never by matching seed number.
 *
 * A MODEL CLASSIFIES, NEVER A REGEX (Tom, 2026-10-07,
 * r-2026-10-07-never-use-regex-to-classify-language). This file used to say
 * "DETERMINISTIC, NO LLM" and match position classes with regexes over the
 * surface form; that is overruled. The classes are now DEFINED in
 * could-occupy-codex.json and CLASSIFIED by frame-tagger.cjs, a Haiku-family
 * model reading those definitions, cached per known text, so a run is
 * repeatable from the cache. What did NOT change: every tag is a
 * COULD-OCCUPY, never attestation, and the codex is written CONSERVATIVE —
 * a class fires on evidence in the sentence itself. An untagged sentence is
 * an honest hole in a filler pool; a wrongly-tagged one is poison in it.
 *
 * C0 "any turn" is a WORD COUNT (three words or more), not a classification
 * of language, so it is computed here and is not in the codex.
 */
const { framesOf, ensureTagged } = require('./frame-tagger.cjs');
const C_CODEX = require('./could-occupy-codex.json');

const T = (s) => String(s || '').trim();
const wordCount = (s) => T(s).split(' ').filter(Boolean).length;

/**
 * POSITION CLASSES. Each is a property of ONE sentence, mapped to the shape
 * positions that property could fill. The mapping is read off
 * `services/shared/metagraph/nodes.json` position names, never invented:
 * `positions` lists `NODE#index` exactly as the store spells them. The
 * mapping is DATA and stays here; what a class MEANS is its codex definition.
 *
 * `test` is a cache lookup (throws for an untagged text): run
 * `ensureCouldOccupyTagged(texts)` first.
 */
const POSITIONS = {
  C1: ['N3#1', 'N2#1'],
  C2: ['N9#1', 'N4#1'],
  C3: ['N4#1', 'N2#2'],
  C4: ['N5#1', 'N13#1', 'N12#2', 'N8#1'],
  C5: ['N6#2'],
  // NOT N5#2 "A+return": that position is an answer PLUS the reciprocal
  // return, and no seed carries return material. Leaving it empty is the
  // honest reading; filling it with plain answers would be the frame error
  // the whole design exists to prevent.
  C6: ['N3#2', 'N12#3'],
  C7: ['N3#2', 'N9#2', 'N12#3'],
  C8: ['N7#2', 'N9#2', 'N15#2'],
  C9: ['N7#2', 'N15#2', 'N11#2'],
  C10: ['N7#1', 'N306#1'],
  C11: ['N7#4', 'N8#3', 'N4#4', 'N11#6'],
  C12: ['N4#2', 'N12#4', 'N12#6'],
  C13: ['N4#3', 'N2#7'],
  C14: ['N10#2', 'N2#7'],
  C15: ['N10#1', 'N11#2'],
  C16: ['N11#1', 'N11#3'],
  C17: ['N12#1', 'N908#1'],
  C18: ['N13#2'],
  C19: ['N14#1', 'N15#1', 'N303#1'],
  C20: ['N909#1', 'N302#2'],
  C21: ['N1#1', 'N1#2'],
  C22: ['N2#6'],
  C24: ['N13#1'],
  C23: ['N15#4', 'N17#3'],
};

const CLASSES = [
  ...C_CODEX.frames.map(f => ({ id: f.id, name: f.name, definition: f.definition,
    positions: POSITIONS[f.id] || [],
    test: (s) => !!T(s) && framesOf(s, C_CODEX).includes(f.id) })),
  { id: 'C0', name: 'any turn — the generic first position',
    // N6/N17/N907 all open with a bare "turn": any utterance can be the thing
    // that later gets repaired, interrupted or misread. TRUE, and vacuous on
    // its own, so it is marked generic alongside C6 and never counted as
    // coverage.
    positions: ['N6#1', 'N17#1', 'N907#1'],
    test: (s) => wordCount(s) >= 3 },
];

/** Tag every known text the could-occupy classes will read (Haiku, cached). */
const ensureCouldOccupyTagged = (texts, opts = {}) => ensureTagged(texts, { ...opts, codex: C_CODEX });

/** Tag one known-side sentence. Returns [] when nothing fires — an honest hole. */
function tag(text) {
  const classes = CLASSES.filter(c => c.test(text));
  const seen = new Set();
  const could_occupy = [];
  for (const c of classes) {
    for (const pos of c.positions) {
      const [shape, index] = pos.split('#');
      const key = shape + '#' + index;
      if (seen.has(key)) continue;
      seen.add(key);
      could_occupy.push({ shape, position: +index, via: c.id });
    }
  }
  return { classes: classes.map(c => c.id), could_occupy };
}

/**
 * `C6 plain answer` and `C0 any turn` fire on almost every declarative, which is
 * TRUE and also useless on its own: a filler pool whose "answer" bucket is
 * 1,400 sentences long has not indexed anything. They are kept because those
 * slots are real, and reported separately so nobody mistakes their size for
 * coverage.
 */
const GENERIC = new Set(['C6', 'C0']);
const isSpecific = (t) => t.classes.some(c => !GENERIC.has(c));

function tagCorpus(entries) {
  const rows = entries.map(e => ({ ...e, ...tag(e.known_text) }));
  const byPosition = new Map();
  for (const r of rows) {
    for (const co of r.could_occupy) {
      const k = `${co.shape}#${co.position}`;
      if (!byPosition.has(k)) byPosition.set(k, []);
      byPosition.get(k).push({ key: r.key, known_text: r.known_text, via: co.via,
                               course_count: r.course_count, seed_numbers: r.seed_numbers });
    }
  }
  return { rows, byPosition };
}

module.exports = { CLASSES, POSITIONS, C_CODEX, tag, tagCorpus, isSpecific, GENERIC, ensureCouldOccupyTagged };

/** The human read beside the machine-readable companion, per this directory's convention. */
function renderMd(out) {
  const L = [];
  const fp = out.filler_pool;
  const filled = Object.entries(fp).filter(([, v]) => v.specific_fillers > 0)
    .sort((a, b) => b[1].specific_fillers - a[1].specific_fillers);
  const empty = Object.entries(fp).filter(([, v]) => v.specific_fillers === 0);
  L.push(`# Could-occupy tagging (known language: ${out.known_language})`);
  L.push('');
  L.push(`Generated ${out.generated.slice(0, 10)} from \`course_seeds\` across ${out.source.courses_read} ${out.known_language}-known courses (${out.source.seed_rows_read} rows → **${out.source.distinct_known_texts} distinct known texts**), tagged against the shape store \`${out.source.shape_store}\`. Read-only; classes tagged by a Haiku-family model from \`could-occupy-codex.json\` (${out.source.classifier}).`);
  L.push('');
  L.push(`**COULD-OCCUPY, NEVER ATTESTATION.** ${out.what_this_is}`);
  L.push('');
  L.push(`**Keyed by TEXT, not by seed number.** ${out.source.keying}. Only ~653 of the ${out.source.distinct_known_texts} texts appear in most courses; 1,143 appear in exactly one. That measures COURSE KNOWN TEXTS, not seeds: the seed set is canonical and identical by definition, and the known side is a teaching instrument that each pair renders for itself — seed 1 alone has 116 distinct known texts across 130 courses.`);
  L.push('');
  L.push(`**Coverage:** ${out.counts.tagged_specifically} texts carry a specific tag, ${out.counts.generic_only} carry only a generic one (\`${out.generic_classes.join('\`, \`')}\` — true of nearly every declarative and therefore no index at all), ${out.counts.untagged} carry none (single-word fragments: "An idea.", "Woman.", "Badly."). Of the ${out.counts.positions_in_store} positions in the shape store, **${out.counts.positions_with_a_SPECIFIC_filler} have a specific filler and ${empty.length} have none.**`);
  L.push('');
  L.push('## The filler pool — positions the seed corpus can supply');
  L.push('');
  L.push('| position | shape / slot | specific fillers | worn form, quoted |');
  L.push('|---|---|---:|---|');
  for (const [k, v] of filled) {
    const ex = v.examples[0];
    L.push(`| \`${k}\` | ${v.node_name} / ${v.position} | ${v.specific_fillers} | ${ex ? '"' + String(ex.known_text).replaceAll('|', '\\|') + '"' : '—'} |`);
  }
  L.push('');
  L.push(`## The ${empty.length} positions with no specific filler — the honest holes`);
  L.push('');
  L.push('Two kinds, and only one of them is a gap worth closing. **Response-relative positions** (read-back, reformulate, ratify-the-completion, "the partner completes it rather than answering") cannot be supplied by a seed corpus at all, because they are defined against a prior turn and a seed has none — no amount of tagging will fill them, and pod material is where they live. **Deep-conversation positions** (`N301`–`N306`, `N9xx`, `N501`) are Method-Pod and sector material, not beginner-course material, and their emptiness here says the corpora are doing their separate jobs.');
  L.push('');
  L.push('One entry is worth reading twice: `N3#2 Availability enquiry / answer` shows zero SPECIFIC fillers while the corpus holds 1,685 plain declaratives that could fill it. That is the generic/specific split working as intended, not an absence.');
  L.push('');
  for (const [k, v] of empty) L.push(`- \`${k}\` — ${v.node_name} / ${v.position}`);
  L.push('');
  L.push('## Position classes');
  L.push('');
  L.push('| id | class | fires on | maps to |');
  L.push('|---|---|---:|---|');
  for (const c of out.classes) L.push(`| ${c.id}${c.generic ? ' *(generic)*' : ''} | ${c.name} | ${c.hits} | ${c.positions.join(' ')} |`);
  L.push('');
  L.push(`Machine-readable companion with every tagged sentence and the full pool: \`could-occupy-${out.known_language}.json\`. Regenerate: \`node tools/frame-layer/could-occupy.cjs\` (\`--sample\` prints a 40-row probe and writes nothing).`);
  return L.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
if (require.main === module) {
  require('dotenv').config({ quiet: true });
  const fs = require('fs'), path = require('path');
  const { createClient } = require('@supabase/supabase-js');
  const { pageAll } = require('./corpus.cjs');
  const mg = require(path.join(__dirname, '..', '..', 'services', 'shared', 'metagraph', 'index.cjs'));
  const ROOT = path.join(__dirname, '..', '..');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { norm } = require('./availability.cjs'); // the frame layer's one text normaliser (plumbing, not classification)
  const args = process.argv.slice(2);
  const arg = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
  const KNOWN = arg('--known', 'eng');
  const SAMPLE = args.includes('--sample');

  (async () => {
    // READ-ONLY. The known side of every course whose KNOWN language is `eng`.
    // Not "spa_for_eng's 668 known texts": the seed set is canonical and
    // identical, but the KNOWN TEXTS are per-pair renderings — across the 83
    // eng-known courses there are 2,174 distinct normalised ones, only ~653
    // of them shared widely,
    // and the artefact is keyed by known_language so it must read the corpus
    // that key names.
    const rows = await pageAll(sb, 'course_seeds', 'course_code,seed_number,known_text',
      q => q.like('course_code', `%_for_${KNOWN}`).order('course_code').order('seed_number'));
    const by = new Map();
    for (const r of rows) {
      const k = norm(r.known_text);
      if (!k) continue;
      if (!by.has(k)) by.set(k, { key: k, known_text: r.known_text, courses: new Set(), seeds: new Set() });
      const e = by.get(k); e.courses.add(r.course_code); e.seeds.add(r.seed_number);
    }
    const entries = [...by.values()].map(e => ({
      key: e.key, known_text: e.known_text, course_count: e.courses.size,
      seed_numbers: [...e.seeds].sort((a, b) => a - b),
    })).sort((a, b) => b.course_count - a.course_count || a.key.localeCompare(b.key));

    const { knownLanguageName } = require('./frame-tagger.cjs');
    const lang = knownLanguageName(`x_for_${KNOWN}`);
    const toTag = SAMPLE ? entries.filter((_, i) => i % Math.max(1, Math.floor(entries.length / 40)) === 0) : entries;
    const ledger = await ensureCouldOccupyTagged(toTag.map(e => e.known_text), { knownLanguage: lang });
    console.error(`tagged ${ledger.missing} new text(s) in ${ledger.calls} call(s), $${ledger.cost_usd.toFixed(3)}`);
    if (ledger.untagged.length) throw new Error(`${ledger.untagged.length} text(s) came back untagged; refusing to write a pool with holes the model left`);

    if (SAMPLE) {
      const step = Math.max(1, Math.floor(entries.length / 40));
      for (let i = 0; i < entries.length; i += step) {
        const t = tag(entries[i].known_text);
        console.log((t.classes.join(',') || '—').padEnd(14) + '| ' + entries[i].known_text.slice(0, 80));
      }
      return;
    }

    const { rows: tagged, byPosition } = tagCorpus(entries);
    const store = mg.load();
    const posName = new Map();
    for (const n of store.nodes) for (const p of n.positions || []) {
      posName.set(`${n.id}#${p.index}`, { node: n.id, node_name: n.name, position: p.name, family: p.family || null });
    }
    const allPositions = [...posName.keys()];

    const out = {
      generated: new Date().toISOString(),
      known_language: KNOWN,
      what_this_is: 'COULD-OCCUPY, never attestation. A seed is one sentence with no turn around it, so it cannot attest a shape — a move is a position defined relative to the turn before it. Each row says only: if a turn were built around this sentence, which shape positions could it fill.',
      source: {
        table: 'course_seeds',
        courses_read: [...new Set(rows.map(r => r.course_code))].length,
        seed_rows_read: rows.length,
        distinct_known_texts: entries.length,
        shape_store: 'services/shared/metagraph/nodes.json (docs/pods/shape-graph-2026-08-30.md)',
        classifier: `${C_CODEX.id} codex ${C_CODEX.version}, haiku`,
        keying: 'by normalised known TEXT, never by seed number — there is ONE canonical seed set, identical by definition, but a course’s KNOWN TEXT is derived and legitimately differentiated per pair, so a course inherits a tag by matching text',
      },
      counts: {
        tagged_specifically: tagged.filter(isSpecific).length,
        generic_only: tagged.filter(r => r.classes.length && !isSpecific(r)).length,
        untagged: tagged.filter(r => !r.classes.length).length,
        positions_in_store: allPositions.length,
        positions_with_at_least_one_filler: byPosition.size,
        positions_with_a_SPECIFIC_filler: [...byPosition.entries()]
          .filter(([, v]) => v.some(x => !GENERIC.has(x.via))).length,
      },
      generic_classes: [...GENERIC],
      classes: CLASSES.map(c => ({ id: c.id, name: c.name, positions: c.positions,
        generic: GENERIC.has(c.id), hits: tagged.filter(r => r.classes.includes(c.id)).length })),
      // THE FILLER POOL, indexed by shape position — the point of the artefact
      filler_pool: Object.fromEntries(allPositions.map(k => [k, {
        ...posName.get(k),
        fillers: (byPosition.get(k) || []).length,
        specific_fillers: (byPosition.get(k) || []).filter(x => !GENERIC.has(x.via)).length,
        examples: (byPosition.get(k) || []).filter(x => !GENERIC.has(x.via)).slice(0, 25)
          .map(x => ({ known_text: x.known_text, via: x.via, courses: x.course_count, seeds: x.seed_numbers.slice(0, 6) })),
      }])),
      seeds: tagged.map(r => ({ key: r.key, known_text: r.known_text, course_count: r.course_count,
        seed_numbers: r.seed_numbers, classes: r.classes,
        could_occupy: r.could_occupy.map(c => ({ shape: c.shape, position: c.position,
          position_name: (posName.get(`${c.shape}#${c.position}`) || {}).position, via: c.via })) })),
    };
    const at = path.join(ROOT, 'docs', 'frame-layer', `could-occupy-${KNOWN}.json`);
    fs.writeFileSync(at, JSON.stringify(out, null, 1));
    fs.writeFileSync(at.slice(0, -'.json'.length) + '.md', renderMd(out));
    console.log(`${out.source.seed_rows_read} seed rows across ${out.source.courses_read} ${KNOWN}-known courses → ${entries.length} distinct known texts`);
    console.log(`specifically tagged ${out.counts.tagged_specifically}, generic-only ${out.counts.generic_only}, untagged ${out.counts.untagged}`);
    console.log(`shape positions: ${out.counts.positions_with_a_SPECIFIC_filler} of ${out.counts.positions_in_store} have a specific filler`);
    const empty = allPositions.filter(k => !(byPosition.get(k) || []).some(x => !GENERIC.has(x.via)));
    console.log(`EMPTY (no specific filler anywhere in the corpus): ${empty.length}`);
    console.log(`wrote ${at}`);
  })().catch(e => { console.error(e.message); process.exit(1); });
}
