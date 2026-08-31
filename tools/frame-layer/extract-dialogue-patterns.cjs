#!/usr/bin/env node
/**
 * Mine the DIALOGUE frame inventory from the pod corpus — the sibling of
 * `extract-patterns.cjs`, which mines the seed corpus.
 *
 * Two passes, both deterministic (regex matchers + one adjacency join). No LLM
 * anywhere at runtime; the matcher list in `dialogue-patterns.cjs` is
 * hand-maintained, exactly as `patterns.cjs` is.
 *
 *   PASS 1, sentence grain. Every canon row's English text is run against the
 *   31 SEED matchers (to record what the pod corpus attests of the frames we
 *   already have, and with which POSITION — many are responses, which no seed
 *   is) and against the 12 D matchers (the delta).
 *   PASS 2, exchange grain. Each row is joined to its predecessor within one
 *   scene; a scene boundary breaks adjacency, because two unrelated
 *   conversations touching in `global_order` are not an exchange.
 *
 * KEYED BY known_language, NEVER BY "the estate". The inventory is a function
 * of the KNOWN-side corpus alone. One inventory, TWO KEYINGS, and which one
 * applies is decided by whether the source corpus CUTS. Seed-derived frames
 * key to the COURSE'S KNOWN TEXT and are per-pair at the generation layer: the
 * seed set itself is canonical and identical by definition, but a LEGO is a
 * cut, and the cut's character-exact disambiguation reaches back and
 * differentiates the English — which is what the 664/668 deu and 619/668 zho
 * figures measure, known texts and not seeds. Pod-derived frames key to the
 * CANONICAL POD TEXT and ARE pair-invariant, because pod sentences are not cut
 * into LEGOs: no cut, no disambiguation pressure, no divergence.
 *
 * DOUBLE-COUNTING RULE. A row attested by a D-frame and also sitting inside an
 * X-frame attestation is counted once at each grain and NEVER summed across
 * grains. D-counts and X-counts answer different questions.
 *
 * READ-ONLY against the database. Writes two files under docs/frame-layer/.
 *
 * Usage:
 *   node tools/frame-layer/extract-dialogue-patterns.cjs
 *   node tools/frame-layer/extract-dialogue-patterns.cjs --pods pod-0,pod-1 --no-sector
 *   node tools/frame-layer/extract-dialogue-patterns.cjs --json out.json --md out.md
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const PATTERNS = require('./patterns.cjs');
const { SENTENCE_FRAMES, EXCHANGE_FRAMES } = require('./dialogue-patterns.cjs');

const ROOT = path.join(__dirname, '..', '..');
const DOCS = path.join(ROOT, 'docs', 'frame-layer');
/**
 * The three LEARNER-FACING pods. `method-pod-*` and `learning-flagship` are the
 * Method Pod — Aran and Tom talking ABOUT the method — which is a different
 * register and a different audience, and folding it in here would put
 * meta-conversation frames into a learner's practice pool. It is a CLI switch,
 * not a hard exclusion: `--pods` takes any list.
 */
const DEFAULT_PODS = ['pod-0', 'pod-0.5', 'pod-1'];
const SECTOR_SOURCES = ['docs/sector-pods/source/health-sector-conversations-v3.md'];

/**
 * Register comes MECHANICALLY from the attesting row — never hand-assigned.
 *
 * The design proposed reading it from `scene_title` alone. The corpus refutes
 * that on its own data: pod-0's counter transaction with the Barista ("Here's
 * your coffee.", row SC03-S09) sits inside the scene titled "A Day of Greetings
 * (iii) - 3 pm", so a title-only rule tags a service encounter as social. The
 * SPEAKER is the second mechanical signal and it is the reliable one: a ROLE
 * name (Barista, Waiter, Receptionist, Driver) is a service encounter; a
 * personal name is a social one. Both signals are read off the attesting row,
 * so nothing here is a judgement call.
 */
const SERVICE_SCENES = /coffee|pub|restaurant|shop|hotel|chemist|direction|taxi|ticket|bank|market/i;
const SERVICE_ROLES = /^(barista|waiter|waitress|bartender|receptionist|assistant|driver|shopkeeper|pharmacist|clerk|cashier|host|staff|local|guest|customer|passenger)\b/i;
function registerOf(row) {
  if (row.source === 'sector') return 'clinical';
  if (SERVICE_ROLES.test(row.speaker || '')) return 'service';
  if (SERVICE_SCENES.test(row.scene_title || '')) return 'service';
  return 'social';
}

async function loadCanon(sb, pods) {
  const { loadPodCanon } = require('./corpus.cjs');
  return loadPodCanon(sb, { pods });
}

/**
 * The sector sources are markdown, not rows. Their dialogue lines are
 * `- **HW:** "text"` / `- **P:** ⚠ "text"`, grouped under `###` flow headings —
 * which give us exactly the two things the join needs: a speaker and a scene.
 * A line that does not parse is COUNTED and reported, never silently dropped.
 */
function loadSectorSource(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return { rows: [], unparsed: 0, missing: relPath };
  // `- **P:** *(breathes)* "Like this?"` — a stage direction may sit between the
  // speaker and the quote. Tolerated and dropped; it is not part of the turn.
  const LINE = /^-\s+\*\*([^:*]+):?\*\*\s*(⚠\s*)?(?:\*\([^)]*\)\*\s*)?["“](.+?)["”]\s*$/;
  let section = '', flow = '', order = 0, unparsed = 0;
  const rows = [];
  for (const line of fs.readFileSync(abs, 'utf8').split(/\r?\n/)) {
    let m;
    if ((m = /^##\s+(.+)/.exec(line))) { section = m[1].trim(); continue; }
    if ((m = /^###\s+(.+)/.exec(line))) { flow = m[1].replace(/\*/g, '').trim(); continue; }
    if (!/^-\s+\*\*/.test(line)) continue;
    if ((m = LINE.exec(line))) {
      order++;
      rows.push({
        id: `${path.basename(relPath, '.md')}:${section} / ${flow}#${order}`,
        pod_slug: path.basename(relPath, '.md'),
        scene_number: `${section} / ${flow}`,
        scene_title: section,
        speaker: m[1].trim(),
        safety_critical: !!m[2],
        english_text: m[3],
        global_order: order,
        source: 'sector',
      });
    } else unparsed++;
  }
  return { rows, unparsed, missing: null };
}

/**
 * NARRATOR ROWS ARE NOT FRAMES. "1. 2. 3. White. Black." is a vocabulary drip —
 * an admission event with no interlocutor, no position and no exchange around
 * it. Counting it would put a number-list "frame" into the pool.
 */
const isDialogue = (r) => (r.speaker || '').toLowerCase() !== 'narrator';

function extract(rows) {
  const dialogue = rows.filter(isDialogue);
  const byId = new Map(dialogue.map((r, i) => [r.id, i]));

  // --- PASS 1a: what the pod corpus attests of the SEED frames ---------------
  const seedAttested = PATTERNS.map(p => {
    const hits = dialogue.filter(r => p.test(r.english_text));
    const responses = hits.filter(r => isResponse(dialogue, r)).length;
    return { id: p.id, name: p.name, pod_rows: hits.length, in_response_position: responses };
  }).filter(p => p.pod_rows > 0).sort((a, b) => b.pod_rows - a.pod_rows);

  // --- PASS 1b: the DELTA — D frames ---------------------------------------
  const sentence_frames = SENTENCE_FRAMES.map(f => {
    const hits = dialogue.filter(r => f.test(r.english_text));
    const registers = [...new Set(hits.map(registerOf))].sort();
    return {
      id: f.id, name: f.name, shape: f.shape, grain: 'sentence',
      position: f.position,
      fixed_material: f.fixed_material,
      register: registers,
      shape_nodes: f.shape_nodes,
      notes: f.notes || undefined,
      count: hits.length,
      by_source: tally(hits.map(r => r.pod_slug)),
      attestation_rows: hits.map(r => r.id),
      attestations: hits.slice(0, 12).map(r => ({
        row: r.id, speaker: r.speaker, scene: r.scene_title, register: registerOf(r),
        text: r.english_text,
        initiating_row: prevInScene(dialogue, r) ? prevInScene(dialogue, r).id : null,
      })),
    };
  });

  // --- PASS 2: exchange grain ----------------------------------------------
  const adjacency = [];
  for (let i = 1; i < dialogue.length; i++) {
    const a = dialogue[i - 1], b = dialogue[i];
    if (sceneKey(a) !== sceneKey(b)) continue;                 // scene boundary breaks adjacency
    const c = dialogue[i + 1] && sceneKey(dialogue[i + 1]) === sceneKey(b) ? dialogue[i + 1] : null;
    adjacency.push([a, b, c]);
  }
  const exchange_frames = EXCHANGE_FRAMES.map(f => {
    const hits = adjacency.filter(([a, b, c]) =>
      f.testPair(a.english_text, b.english_text) &&
      (!f.testTriple || f.testTriple(a.english_text, b.english_text, c && c.english_text)));
    return {
      id: f.id, name: f.name, shape: f.shape, grain: 'exchange',
      positions: f.positions,
      fixed_material: f.fixed_material,
      register: [...new Set(hits.map(([, b]) => registerOf(b)))].sort(),
      sentence_projection: f.sentence_projection,
      shape_nodes: f.shape_nodes,
      notes: f.notes || undefined,
      count: hits.length,
      by_source: tally(hits.map(([, b]) => b.pod_slug)),
      attestations: hits.slice(0, 8).map(([a, b, c]) => ({
        rows: [a.id, b.id, ...(c ? [c.id] : [])],
        texts: [a.english_text, b.english_text, ...(c ? [c.english_text] : [])],
        scene: b.scene_title, register: registerOf(b),
      })),
    };
  });

  // --- the honest residue ---------------------------------------------------
  const residue = dialogue.filter(r =>
    !PATTERNS.some(p => p.test(r.english_text)) && !SENTENCE_FRAMES.some(f => f.test(r.english_text)));

  return { seedAttested, sentence_frames, exchange_frames, residue, dialogue, adjacency, byId };
}

const sceneKey = (r) => `${r.pod_slug}|${r.scene_number}`;
function prevInScene(rows, row) {
  const i = rows.indexOf(row);
  return i > 0 && sceneKey(rows[i - 1]) === sceneKey(row) ? rows[i - 1] : null;
}
/** A row is in RESPONSE position when a turn by someone else precedes it in its scene. */
function isResponse(rows, row) {
  const p = prevInScene(rows, row);
  return !!p && p.speaker !== row.speaker;
}
const tally = (xs) => xs.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {});

function inventory(rows, meta) {
  const r = extract(rows);
  return {
    generated: new Date().toISOString(),
    known_language: 'eng',
    source: {
      table: 'canonical_pod_scenarios',
      pods: meta.pods,
      rows: rows.length,
      dialogue_rows: r.dialogue.length,
      narrator_rows_excluded: rows.length - r.dialogue.length,
      sector_sources: meta.sector_sources,
      sector_rows: rows.filter(x => x.source === 'sector').length,
      sector_unparsed_lines: meta.sector_unparsed,
      canon_max_updated_at: meta.canon_max_updated_at,
    },
    counts: {
      sentence_frames: r.sentence_frames.length,
      exchange_frames: r.exchange_frames.length,
      adjacent_pairs: r.adjacency.length,
      rows_firing_a_seed_frame: r.dialogue.filter(x => PATTERNS.some(p => p.test(x.english_text))).length,
      rows_firing_a_dialogue_frame: r.dialogue.filter(x => SENTENCE_FRAMES.some(f => f.test(x.english_text))).length,
      residue: r.residue.length,
    },
    seed_frames_attested_by_pods: r.seedAttested,
    sentence_frames: r.sentence_frames,
    exchange_frames: r.exchange_frames,
    residue_rows: r.residue.map(x => ({ row: x.id, speaker: x.speaker, text: x.english_text })),
  };
}

function toMarkdown(inv) {
  const L = [];
  const q = (s) => String(s).replace(/\|/g, '\\|');
  L.push(`# Dialogue frame inventory (known language: ${inv.known_language})`);
  L.push('');
  L.push(`Mined from \`${inv.source.table}\` (${inv.source.pods.join(', ')}) plus ${inv.source.sector_sources.length} sector source(s), on ${inv.generated.slice(0, 10)}. ${inv.source.rows} rows read, ${inv.source.dialogue_rows} dialogue rows (${inv.source.narrator_rows_excluded} narrator rows excluded — a vocabulary drip is an admission event, not a frame).`);
  L.push('');
  L.push('**Sibling of `english-pattern-inventory.md`, not a replacement.** That file holds the frames the SEED corpus attests (`P*`); this one holds the delta the POD corpus adds, in two grains: `D*` sentence, `X*` exchange. Provenance is readable from the id in one character.');
  L.push('');
  L.push('**Pods contribute frame ATTESTATION and ZERO VOCABULARY.** Nothing in this file is a source of production material. A frame here is a claim that the corpus says this shape happens — never a claim that any pair can say it. That second question is `instantiableFrameSet()` in `availability.cjs`, and a frame whose fixed material no LEGO has cut is absent from the generator\'s pool and absent from the FRAME denominator.');
  L.push('');
  L.push(`**The delta measured:** ${inv.counts.rows_firing_a_seed_frame}/${inv.source.dialogue_rows} dialogue rows fire at least one of the 31 seed frames; ${inv.counts.rows_firing_a_dialogue_frame} fire at least one dialogue frame; ${inv.counts.residue} rows fire neither and are listed at the bottom as the inventory's honest residue.`);
  L.push('');
  L.push('## Sentence frames (`D*`) — utterance shapes the seed corpus cannot attest');
  L.push('');
  L.push('| id | frame | shape | position | fixed material (the gate\'s input) | register | shape nodes | rows |');
  L.push('|---|---|---|---|---|---|---|---:|');
  for (const f of [...inv.sentence_frames].sort((a, b) => b.count - a.count)) {
    L.push(`| ${f.id} | ${q(f.name)} | \`${q(f.shape)}\` | ${f.position} | ${f.fixed_material.map(a => a.map(c => `"${c}"`).join(' + ')).join(' \\| ')} | ${f.register.join(', ') || '—'} | ${f.shape_nodes.join(' ') || '—'} | ${f.count} |`);
  }
  L.push('');
  L.push('### Specimens, quoted live');
  L.push('');
  for (const f of inv.sentence_frames) {
    if (!f.attestations.length) continue;
    const a = f.attestations[0];
    L.push(`- **${f.id} ${f.name}** — ${a.row} [${a.speaker}, ${a.register}]: "${a.text}"`);
    if (f.notes) L.push(`  - ${f.notes}`);
  }
  L.push('');
  L.push('## Exchange frames (`X*`) — shapes that span a turn boundary');
  L.push('');
  L.push('An exchange frame cannot exist at sentence grain: it is a pattern over an adjacent pair or triple inside one scene. Counts here are NEVER summed with the sentence-grain counts — a row can be attested at both grains and the two columns answer different questions ("how common is this utterance shape" vs "how common is this exchange shape").');
  L.push('');
  L.push(`Adjacency joined within-scene only: ${inv.counts.adjacent_pairs} adjacent pairs.`);
  L.push('');
  L.push('| id | frame | shape | positions | fixed material | sentence projection | shape nodes | pairs |');
  L.push('|---|---|---|---|---|---|---|---:|');
  for (const f of [...inv.exchange_frames].sort((a, b) => b.count - a.count)) {
    L.push(`| ${f.id} | ${q(f.name)} | \`${q(f.shape)}\` | ${f.positions.join(' → ')} | ${f.fixed_material.map(a => a.map(c => `"${c}"`).join(' + ')).join(' \\| ')} | ${f.sentence_projection || '—'} | ${f.shape_nodes.join(' ') || '—'} | ${f.count} |`);
  }
  L.push('');
  L.push('### Exchanges, quoted live');
  L.push('');
  for (const f of inv.exchange_frames) {
    if (!f.attestations.length) continue;
    const a = f.attestations[0];
    L.push(`- **${f.id} ${f.name}** — ${a.scene}: ${a.texts.map(t => `"${t}"`).join(' → ')}`);
  }
  L.push('');
  L.push('## What the pod corpus attests of the SEED frames');
  L.push('');
  L.push('These need no new inventory entry — only new attestation context. The `response` column is the bit the seed corpus structurally cannot give: every seed is a statement with no turn before it.');
  L.push('');
  L.push('| id | frame | pod rows | of which in response position |');
  L.push('|---|---|---:|---:|');
  for (const p of inv.seed_frames_attested_by_pods) L.push(`| ${p.id} | ${q(p.name)} | ${p.pod_rows} | ${p.in_response_position} |`);
  L.push('');
  L.push(`## Residue (${inv.counts.residue}) — no frame in either inventory fires`);
  L.push('');
  L.push('The honest residue, not a claim that these rows are patternless. Each is a candidate for a matcher somebody has not written yet.');
  L.push('');
  for (const r of inv.residue_rows) L.push(`- \`${r.row}\` [${r.speaker}] "${r.text}"`);
  L.push('');
  L.push(`Machine-readable companion: \`dialogue-frame-inventory.json\`. Regenerate with \`node tools/frame-layer/extract-dialogue-patterns.cjs\`.`);
  L.push('');
  L.push(`**Staleness:** the canon's newest \`updated_at\` when this was mined was \`${inv.source.canon_max_updated_at}\`. Consumers compare that against the live canon and warn; four sector-pod authoring jobs are in flight, so a stale inventory is the normal case, not the exception — it must say so rather than lie.`);
  return L.join('\n') + '\n';
}

/** Is this inventory older than the canon it claims to describe? */
function stalenessOf(inv, liveMaxUpdatedAt) {
  const mined = inv && inv.source && inv.source.canon_max_updated_at;
  if (!mined || !liveMaxUpdatedAt) return { known: false, stale: null, mined, live: liveMaxUpdatedAt };
  return { known: true, stale: new Date(liveMaxUpdatedAt) > new Date(mined), mined, live: liveMaxUpdatedAt };
}

module.exports = { extract, inventory, toMarkdown, loadSectorSource, registerOf, stalenessOf, DEFAULT_PODS, SECTOR_SOURCES };

if (require.main === module) {
  const { createClient } = require('@supabase/supabase-js');
  const args = process.argv.slice(2);
  const arg = (name, dflt) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : dflt; };
  const pods = String(arg('--pods', DEFAULT_PODS.join(','))).split(',').map(s => s.trim()).filter(Boolean);
  const sectors = args.includes('--no-sector') ? [] : SECTOR_SOURCES;
  const jsonAt = arg('--json', path.join(DOCS, 'dialogue-frame-inventory.json'));
  const mdAt = arg('--md', path.join(DOCS, 'dialogue-frame-inventory.md'));
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  (async () => {
    const canon = await loadCanon(sb, pods);
    let sectorRows = [], unparsed = 0;
    for (const s of sectors) {
      const r = loadSectorSource(s);
      if (r.missing) { console.error(`sector source not found, skipped: ${r.missing}`); continue; }
      sectorRows.push(...r.rows); unparsed += r.unparsed;
      console.log(`${s}: ${r.rows.length} dialogue lines${r.unparsed ? `, ${r.unparsed} unparsed` : ''}`);
    }
    const maxUpdated = canon.reduce((a, r) => (r.updated_at > a ? r.updated_at : a), '');
    const inv = inventory([...canon, ...sectorRows], {
      pods, sector_sources: sectors, sector_unparsed: unparsed, canon_max_updated_at: maxUpdated,
    });
    fs.writeFileSync(jsonAt, JSON.stringify(inv, null, 2));
    fs.writeFileSync(mdAt, toMarkdown(inv));
    console.log(`${inv.source.rows} rows (${inv.source.dialogue_rows} dialogue), ` +
      `${inv.counts.sentence_frames} D-frames, ${inv.counts.exchange_frames} X-frames, ` +
      `${inv.counts.residue} residue`);
    for (const f of [...inv.sentence_frames].sort((a, b) => b.count - a.count)) {
      console.log(`  ${f.id.padEnd(4)} ${String(f.count).padStart(4)}  ${f.name}`);
    }
    for (const f of inv.exchange_frames) console.log(`  ${f.id.padEnd(4)} ${String(f.count).padStart(4)}  ${f.name}`);
    console.log(`wrote ${jsonAt}\nwrote ${mdAt}`);
  })().catch(e => { console.error(e.message); process.exit(1); });
}
