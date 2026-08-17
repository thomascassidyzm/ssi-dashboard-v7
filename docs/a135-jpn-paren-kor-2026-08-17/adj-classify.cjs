#!/usr/bin/env node
/**
 * A-135 adjudication: classify every parenthetical in the 1,193 jpn-known-side rows,
 * propose a row-level plan, then detect post-strip ZUT collisions.
 *
 * READ + JUDGE ONLY. Writes nothing but adj-*.json / adj-*.md in this directory.
 */
const fs = require('fs');
const path = require('path');
const HERE = __dirname;
const rows = JSON.parse(fs.readFileSync(path.join(HERE, 'census-paren-rows.json'), 'utf8'));

// ---------------------------------------------------------------- lexicons
// A parenthetical ATOM is one of four things. Split on ・ and 、 first.
//
// Rule 1 (message vs form): CONTENT names part of the MESSAGE the learner intends
//   (who the subject is, which sense of the known word, which register).
//   ANNOTATION names a property of the TARGET FORM (its person/tense/mood/case/gender
//   morphology, its part of speech, its lemma, its phonological environment).
// Rule 2 (producibility, ralph "Conservative Suppression & Honest Glosses"):
//   if the learner needs grammar terminology to act on it, it is ANNOTATION.

// --- person/subject markers already used by these courses: CONTENT
const MARKER = /^(私たちは|私たちが|私たち|私は|私が|私に|私を|私|あなたは|あなたが|あなたには|あなたに|あなた|君は|君が|君を|君と|君|きみは|きみが|彼らは|彼らが|彼は|彼が|彼女は|彼女が|彼女を|彼女に|彼に|彼らに|私たちに|彼女|彼|それは|それらを|自分を|複数の人が|もし〜したら、あなたは)$/;

// --- semantic sense / register glosses: CONTENT
const SENSE = new Set([
  // sense-of-the-known-word disambiguators
  '耳で','面識','理解する','考えた','道','アイデア','他の','場所','方向','選択',
  '時間','一時間','60分','1時間','時間単位','時間の単位','時間的に早い','時間的に後','期間',
  '書籍','ほん','少し','とても','テレビ','完了する','〜を取り戻す','本当','期待','理由',
  '状態','人・場所','人','人を','無生物','遠い場所','遠くの場所','一般的に','一つの','もし〜したら',
  '気にする？','あなたは気になりますか？','相手に許可','義務的な動作','強い義務','同意',
  '自分で','自分が去る','希望','する','について','強調',
  // register / politeness: the learner intends it
  '丁寧','口語','改まった',
]);

// --- person features that are stated as GRAMMAR LABELS (annotation, but load-bearing)
//     -> candidate for an authored rewrite into the course's own person marker
const PERSON_LABEL = [
  [/(一人称複数|1人称複数)/, '1pl'],
  [/(二人称複数|2人称複数)/, '2pl'],
  [/(三人称複数|3人称複数)/, '3pl'],
  [/(一人称|1人称)/, '1sg'],
  [/(二人称|2人称|tu形)/, '2sg'],
  [/(三人称単数現在|三単現|三人称単数|3人称単数)/, '3sg'],
  [/(三人称|3人称)/, '3sg'],
  [/複数の人/, '3pl'],
];
function personOf(atom) {
  for (const [re, p] of PERSON_LABEL) if (re.test(atom)) return p;
  return null;
}

const CANON = { '1sg': '私', '2sg': 'あなた', '3sg': '彼・彼女', '1pl': '私たち', '2pl': 'あなたたち', '3pl': '彼ら' };
const PRONOUN_IN_KNOWN = { // pronoun already visible in the Japanese outside the parens?
  '1sg': /私(?!たち)/, '1pl': /私たち/, '2sg': /(あなた|君|きみ)/, '2pl': /(あなたたち|君たち)/,
  '3sg': /(彼|彼女)(?!ら)/, '3pl': /彼ら/,
};

const isLatin = (s) => /[A-Za-z]/.test(s);

// atom classes: 'content' | 'gram' | 'personlabel' | 'lemma'
function classifyAtom(atom) {
  const a = atom.trim();
  if (!a) return { cls: 'gram', reason: 'empty atom' };
  if (MARKER.test(a)) return { cls: 'content', reason: 'person/subject marker — Japanese is pro-drop, the target form is person-inflected, so the marker is the only thing that fixes one known prompt to one target form' };
  if (SENSE.has(a)) return { cls: 'content', reason: 'semantic sense or register selector — names part of the message the learner intends, not a property of the target form' };
  const p = personOf(a);
  if (p) return { cls: 'personlabel', person: p, lemma: isLatin(a), reason: `person stated as a grammar label${isLatin(a) ? ' with a target-language lemma leaked in' : ''} — the information is load-bearing but the wording is metalinguistic` };
  if (isLatin(a)) return { cls: 'lemma', reason: 'target-language lemma / orthography leaked into the Japanese prompt' };
  return { cls: 'gram', reason: 'grammar metadata (person/tense/mood/case/gender/number/part-of-speech/construction label) — a learner can produce nothing from it' };
}

// ---------------------------------------------------------------- per-course marker convention
const PAREN = /[（(]([^）)]*)(?:[）)]|$)/g;
const markerFreq = {}; // course -> person -> marker -> n
function personOfMarker(m) {
  if (/^私たち/.test(m)) return '1pl';
  if (/^私/.test(m)) return '1sg';
  if (/^彼ら/.test(m)) return '3pl';
  if (/^(彼|彼女)/.test(m)) return '3sg';
  if (/^(あなた|君|きみ)/.test(m)) return '2sg';
  return null;
}
for (const r of rows) {
  PAREN.lastIndex = 0; let m;
  while ((m = PAREN.exec(r.known_text))) for (const atom of m[1].split(/[・、]/)) {
    if (!MARKER.test(atom)) continue;
    const p = personOfMarker(atom); if (!p) continue;
    markerFreq[r.course_code] = markerFreq[r.course_code] || {};
    markerFreq[r.course_code][p] = markerFreq[r.course_code][p] || {};
    markerFreq[r.course_code][p][atom] = (markerFreq[r.course_code][p][atom] || 0) + 1;
  }
}
const COURSE_PARTICLE = {}; // dominant particle per course
for (const c of Object.keys(markerFreq)) {
  let wa = 0, ga = 0;
  for (const p of Object.keys(markerFreq[c])) for (const [mk, n] of Object.entries(markerFreq[c][p])) {
    if (/は$/.test(mk)) wa += n; else if (/が$/.test(mk)) ga += n;
  }
  COURSE_PARTICLE[c] = ga > wa ? 'が' : (wa > 0 ? 'は' : '');
}
function markerFor(course, person, atom) {
  // tu形 means specifically the Portuguese tu addressee; por's own informal marker is 君
  if (course === 'por_for_jpn' && atom && /tu形/.test(atom)) return '君は';
  const f = markerFreq[course] && markerFreq[course][person];
  if (f) {
    const cand = Object.entries(f)
      // a bare 3sg label is gender-neutral: never adopt a gendered 彼女／彼 precedent for it
      .filter(([mk]) => person !== '3sg' || /^彼・彼女/.test(mk))
      // a subject marker needs a subject particle; 私を／私に are object markers, not subjects
      .filter(([mk]) => !/[をに]$/.test(mk))
      .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0];
    if (cand) return cand[0];
  }
  return CANON[person] + (COURSE_PARTICLE[course] || '');
}

// ---------------------------------------------------------------- per-row proposal
function spans(text) {
  const out = []; PAREN.lastIndex = 0; let m;
  while ((m = PAREN.exec(text))) out.push({ full: m[0], inner: m[1], index: m.index, closed: /[）)]$/.test(m[0]) });
  return out;
}

const plan = [];
const stringTable = new Map(); // distinct inner string -> record

for (const r of rows) {
  const sp = spans(r.known_text);
  let newText = r.known_text;
  const buckets = new Set(); const actions = new Set(); const reasons = []; const notes = [];
  // rebuild right-to-left so indices stay valid
  for (const s of [...sp].reverse()) {
    const atoms = s.inner.split(/[・、]/).map(a => a.trim());
    const cl = atoms.map(classifyAtom);
    const contentAtoms = atoms.filter((a, i) => cl[i].cls === 'content');
    const personAtoms = atoms.filter((a, i) => cl[i].cls === 'personlabel');
    const hasA = cl.some(c => c.cls !== 'content');
    let bucket, replacement, why;
    if (!hasA) {
      bucket = 'C'; replacement = s.full; why = cl.map(c => c.reason).join(' + ');
      actions.add('keep');
    } else if (contentAtoms.length) {
      bucket = 'MIXED';
      replacement = '（' + contentAtoms.join('・') + '）';
      why = 'carries both: ' + cl.map((c, i) => `${atoms[i]}=${c.cls}`).join(', ');
      actions.add('partial');
    } else if (personAtoms.length) {
      // person stated as a grammar label: rewrite into the course's own marker,
      // unless the pronoun is already visible in the Japanese (then it is redundant -> strip)
      const person = cl.find(c => c.cls === 'personlabel').person;
      const outside = r.known_text.replace(/[（(][^）)]*(?:[）)]|$)/g, '');
      bucket = 'A';
      if (PRONOUN_IN_KNOWN[person] && PRONOUN_IN_KNOWN[person].test(outside)) {
        replacement = ''; actions.add('strip');
        why = cl.map(c => c.reason).join(' + ') + ` — redundant here: the ${person} pronoun is already in the Japanese outside the parenthesis`;
      } else {
        const mk = markerFor(r.course_code, person, s.inner);
        replacement = '（' + mk + '）'; actions.add('rewrite');
        why = cl.map(c => c.reason).join(' + ') + ` — authored rewrite to this course's own ${person} marker （${mk}）`;
        notes.push(`rewrite ${person}→（${mk}）`);
      }
    } else {
      bucket = 'A'; replacement = ''; actions.add('strip');
      why = cl.map(c => c.reason).join(' + ');
    }
    buckets.add(bucket); reasons.push(s.inner + ': ' + why);
    newText = newText.slice(0, s.index) + replacement + newText.slice(s.index + s.full.length);
    if (!stringTable.has(s.inner)) stringTable.set(s.inner, { inner: s.inner, bucket, atomClasses: cl.map(c => c.cls), reason: why, n: 0, courses: new Set(), examples: [] });
    const st = stringTable.get(s.inner); st.n++; st.courses.add(r.course_code);
    if (st.examples.length < 2) st.examples.push(`${r.row_key} 「${r.known_text}」→ ${r.target_text}`);
  }
  newText = newText.replace(/\s+/g, ' ').trim();

  const bucket = buckets.has('MIXED') ? 'MIXED' : (buckets.size > 1 ? 'MIXED' : [...buckets][0]);
  let action = actions.has('partial') ? 'partial'
    : actions.has('rewrite') ? 'rewrite'
    : actions.has('strip') ? 'strip' : 'hold';
  if (!actions.has('partial') && !actions.has('rewrite') && !actions.has('strip')) action = 'hold';

  let hold_reason = null;
  if (action === 'hold') hold_reason = 'bucket-C content: the parenthetical is load-bearing, leave the row exactly as it is';

  // degenerate results: nothing but a label was in the known side
  const degenerate = /^([〜～]|)$/.test(newText) || newText.length === 0;
  if (degenerate) { action = 'hold'; hold_reason = `strip would leave the known side empty or a bare particle ("${newText}") — the row has no authored gloss at all and needs one written, which is authoring, not a strip`; newText = r.known_text; }

  // known side is not Japanese at all
  const outsideParens = r.known_text.replace(/[（(][^）)]*(?:[）)]|$)/g, '').trim();
  if (outsideParens.length > 0 && !/[ぁ-んァ-ヶ一-龯〜～]/.test(outsideParens)) {
    action = 'hold'; hold_reason = 'known_text is not Japanese (English leaked into a jpn-known course) — a separate corruption defect, out of scope for a paren strip'; newText = r.known_text;
  }
  // unclosed parenthesis = truncated text
  if (sp.some(s => !s.closed)) {
    action = 'hold'; hold_reason = 'known_text is TRUNCATED (unclosed parenthesis) — the row is corrupt and must be repaired by an author, not stripped'; newText = r.known_text;
  }

  plan.push({
    table: r.src === 'lego' ? 'course_legos' : 'course_practice_phrases',
    phrase_role: r.src.startsWith('phrase:') ? r.src.split(':')[1] : null,
    course_code: r.course_code, seed_number: r.seed_number, row_key: r.row_key, row_uuid: r.row_uuid,
    old_known_text: r.known_text, new_known_text: newText, target_text: r.target_text,
    bucket, action, hold_reason, notes: notes.length ? notes.join('; ') : null,
    paren_reasons: reasons.reverse(),
    has_clip: !!r.known_audio_id, clip_id: r.known_audio_id || null,
  });
}

// ---------------------------------------------------------------- ZUT collision pass
// The post-fix corpus is the WHOLE course (every lego + practice-phrase row in the seven
// courses), with the 1,193 affected rows carrying their PROPOSED known_text. A strip can
// just as easily collide with a row that never had a parenthesis, so grouping only the
// affected rows against each other would miss most of the trap.
function norm(s) { return String(s == null ? '' : s).replace(/\s/g, '').replace(/[～]/g, '〜'); }
const corpus = JSON.parse(fs.readFileSync(path.join(HERE, 'adj-corpus.json'), 'utf8'));
const byUuid = new Map(plan.map(p => [p.row_uuid, p]));
const groups = new Map();
for (const c of corpus) {
  const p = byUuid.get(c.uuid);
  const kt = p ? p.new_known_text : c.known_text;
  const key = c.course_code + ' ' + norm(kt);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push({
    table: c.src === 'lego' ? 'course_legos' : 'course_practice_phrases',
    phrase_role: c.phrase_role, row_key: c.row_key, row_uuid: c.uuid,
    old_known_text: c.known_text, proposed_known_text: kt, target_text: c.target_text,
    affected: !!p, action: p ? p.action : null, has_clip: p ? p.has_clip : null,
    learner_surface: c.phrase_role !== 'component',
  });
}
const collisions = [];
for (const [key, members] of groups) {
  const course = key.split(' ')[0];
  const changed = members.filter(m => m.affected && m.proposed_known_text !== m.old_known_text);
  if (!changed.length) continue;               // nobody moved into this group -> not our doing
  const rawByNorm = new Map(); for (const m of members) if (!rawByNorm.has(norm(m.target_text))) rawByNorm.set(norm(m.target_text), m.target_text);
  const allTargets = new Set([...rawByNorm.keys()].map(k => rawByNorm.get(k)));
  if (allTargets.size < 2) continue;
  // ZUT is a rule about PRODUCTION prompts. Component rows are not a production surface
  // (docs/introduce-directive-strip-2026-08-11/REPORT.md: the app filters phrase_role
  // 'component' out at all three fetch points) — their text is only ever a card tile.
  const prodNorm = new Map(); for (const m of members) if (m.learner_surface && !prodNorm.has(norm(m.target_text))) prodNorm.set(norm(m.target_text), m.target_text);
  const prodTargets = new Set(prodNorm.values());
  const tier = prodTargets.size > 1 ? 'production' : 'component_rows_only';
  // was some known_text in this group ALREADY carrying several targets before we touched it?
  const preTargets = new Map();
  for (const m of members) {
    const k = norm(m.old_known_text);
    if (!preTargets.has(k)) preTargets.set(k, new Set());
    preTargets.get(k).add(norm(m.target_text));
  }
  const pre_existing = [...preTargets.values()].some(s2 => s2.size > 1);
  collisions.push({
    course_code: course,
    proposed_known_text: changed[0].proposed_known_text,
    tier,
    distinct_targets: [...allTargets],
    distinct_targets_production_only: [...prodTargets],
    pre_existing,
    verdict: tier === 'component_rows_only'
      ? 'collision exists only among phrase_role=component rows, which are not a production surface — strip applied, flagged for review'
      : (pre_existing
        ? 'production fork that ALREADY exists at this prompt — the strip would add more members to a prompt the course cannot already discriminate; HOLD and redesign upstream'
        : 'production fork MANUFACTURED by the strip — the label is currently the only disambiguator; HOLD'),
    affected_rows: changed.length,
    members,
  });
}

// hold every affected row that lands in a PRODUCTION-tier collision group
const held = new Map();
for (const c of collisions) {
  if (c.tier !== 'production') continue;
  for (const m of c.members) if (m.affected) held.set(m.row_uuid, c);
}
for (const p of plan) {
  const c = held.get(p.row_uuid);
  if (!c) continue;
  if (p.action === 'hold') continue;
  p.action = 'hold';
  p.collision_tier = 'production';
  p.collision_pre_existing = c.pre_existing;
  p.hold_reason = 'ZUT: the proposed known_text ' + JSON.stringify(p.new_known_text) + ' would carry ' +
    c.distinct_targets_production_only.length + ' distinct target forms on the production surface of this course (' +
    c.distinct_targets_production_only.join(' / ') + '). ' +
    (c.pre_existing ? 'That fork already exists at this prompt, so the strip would deepen an existing ZUT break rather than create it.'
                    : 'The label is currently the ONLY disambiguator, so stripping it MANUFACTURES a ZUT violation.');
  p.suggested_direction = 'needs a non-metalinguistic Japanese rewrite that distinguishes the intentions naturally (e.g. 聞いた vs 聞いていた), authored and checked against what the seed has already taught — not a strip';
  p.new_known_text = p.old_known_text;
}
// annotate the tiles-only rows without holding them
const tilesOnly = new Set();
for (const c of collisions) if (c.tier === 'component_rows_only') for (const m of c.members) if (m.affected) tilesOnly.add(m.row_uuid);
for (const p of plan) if (tilesOnly.has(p.row_uuid) && p.action !== 'hold') {
  p.collision_tier = 'component_rows_only';
  p.notes = [p.notes, 'after the strip this card tile shares its Japanese with another tile carrying a different target — a display inconsistency on the decomposition card, not a production fork'].filter(Boolean).join('; ');
}

// ================================================================ SURFACE 2
// course_legos.components — the decomposition TILES printed on the LEGO card.
// The app SERVES and DISPLAYS these (docs/introduce-directive-strip-2026-08-11/REPORT.md:
// the 2026-08-11 fix found 4,209 tiles were the real learner surface while the
// phrase_role='component' ROWS were latent). Editing a tile changes no audio at all —
// the card's clip belongs to the lego's own known_text, which a tile edit never touches.
const tiles = JSON.parse(fs.readFileSync(path.join(HERE, 'census-component-tiles.json'), 'utf8'));

// The eng_for_jpn tiles carry their labels on the ENGLISH (target) side instead — the
// mirror image of the same defect. Judged by the same two tests, string by string.
const ENG_A = new Map([
  ['object marker', 'names a particle\'s grammatical function — ralph P4 names this exact string as the canonical dishonest gloss'],
  ['subject marker', 'particle-function label — banned as a gloss by ralph P4'],
  ['topic marker', 'particle-function label — banned as a gloss by ralph P4'],
  ['location marker: on/at', 'particle-function label — banned as a gloss by ralph P4'],
  ['question marker', 'particle-function label — banned as a gloss by ralph P4'],
  ['marker', 'particle-function label — banned as a gloss by ralph P4'],
  ['object', 'case label'],
  ['progressive: are ~ing', 'aspect metadata — the learner produces nothing from the word \'progressive\''],
  ['progressive: -ing / are ~ing', 'aspect metadata'],
  ['potential', 'verb-form metadata'],
  ['from 探す, to search', 'dictionary-form etymology — an authoring note about where the inflected form came from'],
  ['from やる, to do', 'dictionary-form etymology — an authoring note'],
  ['part 1', 'authoring bookkeeping for a word split across two tiles (もち/ろん) — pure internal metadata'],
  ['part 2', 'authoring bookkeeping for a word split across two tiles (もち/ろん) — pure internal metadata'],
]);
const ENG_C = new Map([
  ['→ turn out', 'honest sense gloss: it says what いく MEANS in this idiom, in plain words'],
  ['the ... one', 'plain-words paraphrase of the fragment, not terminology'],
  ['polite', 'register — the learner intends politeness'],
  ['not', 'part of the gloss itself (\'(not) very\') — stripping it would leave a gloss that means the opposite'],
]);

const tilePlan = [];
const tileStrings = new Map();
for (const card of tiles) {
  for (let ti = 0; ti < card.components.length; ti++) {
    const tileObj = card.components[ti];
    for (const field of ['known', 'target']) {
      const orig = tileObj[field] == null ? '' : String(tileObj[field]);
      const sp = spans(orig);
      if (!sp.length) continue;
      let newText = orig;
      const buckets = new Set(); const actions = new Set(); const reasons = []; const notes = [];
      for (const sImpl of [...sp].reverse()) {
        let bucket, replacement, why;
        if (field === 'target') {
          const inner = sImpl.inner;
          if (ENG_C.has(inner)) { bucket = 'C'; replacement = sImpl.full; why = ENG_C.get(inner); actions.add('keep'); }
          else if (ENG_A.has(inner)) { bucket = 'A'; replacement = ''; why = ENG_A.get(inner); actions.add('strip'); }
          else { bucket = 'A'; replacement = ''; why = 'unlisted target-side label — treated as annotation'; actions.add('strip'); }
        } else {
          const atoms = sImpl.inner.split(/[・、]/).map(a => a.trim());
          const cl = atoms.map(classifyAtom);
          const contentAtoms = atoms.filter((a, i2) => cl[i2].cls === 'content');
          const personAtoms = atoms.filter((a, i2) => cl[i2].cls === 'personlabel');
          const hasA = cl.some(c2 => c2.cls !== 'content');
          if (!hasA) { bucket = 'C'; replacement = sImpl.full; why = cl.map(c2 => c2.reason).join(' + '); actions.add('keep'); }
          else if (contentAtoms.length) { bucket = 'MIXED'; replacement = '（' + contentAtoms.join('・') + '）'; why = 'carries both: ' + cl.map((c2, i2) => atoms[i2] + '=' + c2.cls).join(', '); actions.add('partial'); }
          else if (personAtoms.length) {
            const person = cl.find(c2 => c2.cls === 'personlabel').person;
            const outside = orig.replace(/[（(][^）)]*(?:[）)]|$)/g, '');
            bucket = 'A';
            if (PRONOUN_IN_KNOWN[person] && PRONOUN_IN_KNOWN[person].test(outside)) {
              replacement = ''; actions.add('strip');
              why = cl.map(c2 => c2.reason).join(' + ') + ' — redundant: the pronoun is already in the tile text';
            } else {
              const mk = markerFor(card.course_code, person, sImpl.inner);
              replacement = '（' + mk + '）'; actions.add('rewrite');
              why = cl.map(c2 => c2.reason).join(' + ') + ` — authored rewrite to this course's own ${person} marker （${mk}）`;
              notes.push('rewrite ' + person + '→（' + mk + '）');
            }
          } else { bucket = 'A'; replacement = ''; why = cl.map(c2 => c2.reason).join(' + '); actions.add('strip'); }
        }
        buckets.add(bucket); reasons.push(sImpl.inner + ': ' + why);
        newText = newText.slice(0, sImpl.index) + replacement + newText.slice(sImpl.index + sImpl.full.length);
        const sk = field + '|' + sImpl.inner;
        if (!tileStrings.has(sk)) tileStrings.set(sk, { side: field, inner: sImpl.inner, bucket, reason: why, n: 0, courses: new Set(), examples: [] });
        const st = tileStrings.get(sk); st.n++; st.courses.add(card.course_code);
        if (st.examples.length < 2) st.examples.push(card.lego_id + ' tile ' + ti + ': ' + tileObj.known + ' → ' + tileObj.target);
      }
      newText = newText.replace(/\s+/g, ' ').trim();
      const bucket = buckets.has('MIXED') || buckets.size > 1 ? 'MIXED' : [...buckets][0];
      let action = actions.has('partial') ? 'partial' : actions.has('rewrite') ? 'rewrite' : actions.has('strip') ? 'strip' : 'hold';
      let hold_reason = action === 'hold' ? 'bucket-C content: the parenthetical is load-bearing, leave the tile as it is' : null;
      if (newText.length === 0 || /^([〜～]|)$/.test(newText)) {
        action = 'hold';
        hold_reason = 'the tile\'s ' + field + ' side is NOTHING BUT the label — stripping leaves an empty tile. This tile has no honest gloss at all and one must be authored (a bare particle glossed only as its own grammatical function is ralph P3/P4 breakage, not a paren defect)';
        newText = orig;
      }
      tilePlan.push({
        surface: 'card_tile',
        table: 'course_legos.components',
        tile_index: ti, tile_field: field,
        phrase_role: null,
        course_code: card.course_code, seed_number: card.seed_number,
        row_key: card.lego_id + '#tile' + ti + '.' + field, row_uuid: card.row_uuid,
        card_known_text: card.known_text, card_target_text: card.target_text,
        tile_counterpart: field === 'known' ? tileObj.target : tileObj.known,
        old_known_text: orig, new_known_text: newText, target_text: field === 'known' ? tileObj.target : tileObj.known,
        bucket, action, hold_reason, notes: notes.length ? notes.join('; ') : null,
        paren_reasons: reasons.reverse(),
        has_clip: false, clip_id: null,
        audio_impact: 'none — a tile edit does not touch the lego known_text the card clip was rendered from',
      });
    }
  }
}

// tile-level ZUT check, kept SEPARATE from the known_text one: over every tile in the
// seven courses (3,933), does one Japanese tile fragment end up shown against more than
// one target fragment? On a tile that is a DISPLAY inconsistency across cards, not a
// production fork — a tile is never a production prompt — so it is reported, never held on.
const tileCorpus = JSON.parse(fs.readFileSync(path.join(HERE, 'adj-tile-corpus.json'), 'utf8'));
const tileProposed = new Map();
for (const t of tilePlan) if (t.tile_field === 'known') tileProposed.set(t.row_uuid + '#' + t.tile_index, t);
const tgroups = new Map();
for (const card of tileCorpus) {
  for (let ti = 0; ti < card.components.length; ti++) {
    const tl = card.components[ti];
    const p = tileProposed.get(card.uuid + '#' + ti);
    const kt = p ? p.new_known_text : (tl.known == null ? '' : String(tl.known));
    const key = card.course_code + ' ' + norm(kt);
    if (!tgroups.has(key)) tgroups.set(key, []);
    tgroups.get(key).push({ lego_id: card.lego_id, seed_number: card.seed_number, tile_index: ti, old_known: tl.known, proposed_known: kt, target: tl.target, affected: !!p, action: p ? p.action : null });
  }
}
const tileCollisions = [];
for (const [key, members] of tgroups) {
  const changed = members.filter(m => m.affected && m.proposed_known !== m.old_known);
  if (!changed.length) continue;
  const targets = new Set(members.map(m => norm(m.target)));
  if (targets.size < 2) continue;
  const pre = new Map();
  for (const m of members) { const k = norm(m.old_known); if (!pre.has(k)) pre.set(k, new Set()); pre.get(k).add(norm(m.target)); }
  tileCollisions.push({
    surface: 'card_tile', course_code: key.split(' ')[0],
    proposed_tile_known: changed[0].proposed_known,
    distinct_tile_targets: [...targets],
    pre_existing: [...pre.values()].some(s2 => s2.size > 1),
    verdict: 'display inconsistency across cards, NOT a production fork — a tile is a decomposition fragment, never a prompt the learner produces from. Reported, not held.',
    affected_tiles: changed.length, members,
  });
}
fs.writeFileSync(path.join(HERE, 'adj-tile-collisions.json'), JSON.stringify(tileCollisions, null, 1));
fs.writeFileSync(path.join(HERE, 'adj-tile-strings.json'), JSON.stringify([...tileStrings.values()].map(s2 => ({ ...s2, courses: [...s2.courses] })).sort((a, b) => b.n - a.n), null, 1));

for (const p of plan) p.surface = p.phrase_role === 'component' ? 'component_row_latent' : 'known_text';
plan.push(...tilePlan);

// 'hold' covers two completely different situations and a reader must not confuse them:
// a bucket-C row is held because it is ALREADY RIGHT; the others are held because the fix
// is BLOCKED. Label which.
for (const p of plan) {
  if (p.action !== 'hold') { p.hold_kind = null; continue; }
  const r = p.hold_reason || '';
  p.hold_kind = /load-bearing, leave/.test(r) ? 'keep_content_no_edit_needed'
    : /^ZUT/.test(r) ? 'blocked_zut_collision'
    : /empty/.test(r) ? 'blocked_no_gloss_to_fall_back_on'
    : /TRUNCATED/.test(r) ? 'blocked_row_corrupt'
    : /not Japanese/.test(r) ? 'blocked_wrong_language'
    : 'blocked_other';
}

// An edit that removes a tense/mood/aspect label passes the fork test (no two rows end up
// sharing a prompt) but still leans on the Japanese carrying that distinction by itself.
// The fork test is the operative ZUT test and these pass it — but flag them so they are not
// applied in the same unexamined batch as the rest.
const TENSE_MOOD = /(接続法|仮定法|仮定形|条件|未来|過去|完了|不完全|半過去|進行|分詞|不定詞|不定形)/;
for (const p of plan) {
  p.needs_author_check = false;
  if (p.action === 'hold') continue;
  const before = [...p.old_known_text.matchAll(/[（(]([^）)]*)(?:[）)]|$)/g)].map(m => m[1]).join('・').split(/[・、]/);
  const after = [...p.new_known_text.matchAll(/[（(]([^）)]*)(?:[）)]|$)/g)].map(m => m[1]).join('・').split(/[・、]/);
  const gone = before.filter(x => x && !after.includes(x));
  if (gone.some(x => TENSE_MOOD.test(x))) {
    p.needs_author_check = true;
    p.author_check_reason = 'this edit drops a tense/mood/aspect label (' + gone.filter(x => TENSE_MOOD.test(x)).join(', ') +
      '). No prompt collides, so ZUT holds — but a Japanese-speaking author should confirm the Japanese already carries the distinction before this one is applied.';
  }
}

fs.writeFileSync(path.join(HERE, 'adj-plan.json'), JSON.stringify(plan, null, 1));
fs.writeFileSync(path.join(HERE, 'adj-collisions.json'), JSON.stringify(collisions, null, 1));

// ---------------------------------------------------------------- summary to stdout
const per = {};
for (const p of plan) {
  per[p.course_code] = per[p.course_code] || { n: 0, A: 0, C: 0, MIXED: 0, strip: 0, partial: 0, rewrite: 0, hold: 0, clips: 0 };
  const o = per[p.course_code]; o.n++; o[p.bucket]++; o[p.action]++; if (p.has_clip) o.clips++;
}
console.log('=== per course: bucket / action ===');
console.log(['course', 'rows', 'A', 'C', 'MIXED', 'strip', 'partial', 'rewrite', 'hold', 'clips'].join('\t'));
for (const c of Object.keys(per).sort()) { const o = per[c]; console.log([c, o.n, o.A, o.C, o.MIXED, o.strip, o.partial, o.rewrite, o.hold, o.clips].join('\t')); }
const tot = Object.values(per).reduce((a, o) => { for (const k of Object.keys(o)) a[k] = (a[k] || 0) + o[k]; return a; }, {});
console.log(['TOTAL', tot.n, tot.A, tot.C, tot.MIXED, tot.strip, tot.partial, tot.rewrite, tot.hold, tot.clips].join('\t'));
console.log('\ndistinct parenthetical strings: ' + stringTable.size);
const byB = {}; for (const s of stringTable.values()) byB[s.bucket] = (byB[s.bucket] || 0) + 1;
console.log('distinct by bucket: ' + JSON.stringify(byB));
console.log('collision groups: ' + collisions.length + ', rows held by collision: ' + held.size);
console.log('\n=== collisions ===');
for (const c of collisions.sort((a, b) => b.members.length - a.members.length)) {
  console.log(`${c.course_code} 「${c.proposed_known_text}」 -> ${c.distinct_targets.join(' / ')}  [${c.members.map(m => m.old_known_text + (m.learner_surface ? '' : '(comp)')).join(' | ')}]`);
}
// dump the distinct-string table for the md
fs.writeFileSync(path.join(HERE, 'adj-strings.json'), JSON.stringify([...stringTable.values()].map(s => ({ ...s, courses: [...s.courses] })).sort((a, b) => b.n - a.n), null, 1));
