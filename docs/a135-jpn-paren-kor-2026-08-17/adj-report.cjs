#!/usr/bin/env node
/** Builds adj-buckets.md from adj-buckets.md.head + computed tables. Read-only. */
const fs = require('fs');
const path = require('path');
const HERE = __dirname;
const R = (f) => JSON.parse(fs.readFileSync(path.join(HERE, f), 'utf8'));
const plan = R('adj-plan.json'), coll = R('adj-collisions.json'), tcoll = R('adj-tile-collisions.json');
const strings = R('adj-strings.json'), tstrings = R('adj-tile-strings.json');
const out = [fs.readFileSync(path.join(HERE, 'adj-buckets.md.head'), 'utf8')];
const w = (s) => out.push(s);
const COURSES = [...new Set(plan.map(p => p.course_code))].sort();
const APPROVAL = R('adj-approval.json');

function table(head, rows) {
  w('| ' + head.join(' | ') + ' |');
  w('|' + head.map(() => '---').join('|') + '|');
  for (const r of rows) w('| ' + r.join(' | ') + ' |');
  w('');
}
const count = (f) => plan.filter(f).length;

// ---------------------------------------------------------------- counts
w('## Counts per bucket per course');
w('');
w('Bucket is decided per parenthetical; a row carrying two of them takes the more serious label,');
w('so MIXED here means "this row has both a keeper and a label in it".');
w('');
table(['course', 'status', 'rows', 'A annotation', 'C content', 'MIXED', 'known-side clips'],
  COURSES.map(c => {
    const rs = plan.filter(p => p.course_code === c);
    return [c, APPROVAL[c].new_app_status, rs.length,
      rs.filter(p => p.bucket === 'A').length, rs.filter(p => p.bucket === 'C').length,
      rs.filter(p => p.bucket === 'MIXED').length, rs.filter(p => p.has_clip).length];
  }).concat([['**TOTAL**', '', plan.length, count(p => p.bucket === 'A'), count(p => p.bucket === 'C'),
    count(p => p.bucket === 'MIXED'), count(p => p.has_clip)].map(x => (x === '' ? '' : '**' + String(x).replace(/\*/g, '') + '**'))]));

w('Split by surface, because the three surfaces have completely different consequences —');
w('`known_text` is drilled and voiced, `component` rows are latent (the app filters them out),');
w('and `card_tile` is displayed but silent:');
w('');
const SURF = { known_text: 'known_text (drilled + voiced)', component_row_latent: 'component row (latent)', card_tile: 'card tile (displayed, silent)' };
table(['course', 'surface', 'rows', 'edit proposed', 'held'],
  COURSES.flatMap(c => Object.keys(SURF).map(s => {
    const rs = plan.filter(p => p.course_code === c && p.surface === s);
    return rs.length ? [c, SURF[s], rs.length, rs.filter(p => p.action !== 'hold').length, rs.filter(p => p.action === 'hold').length] : null;
  }).filter(Boolean)));

w('## Actions per course');
w('');
w('`strip` removes the parenthetical. `rewrite` replaces a person *label* with the course\'s own');
w('person *marker* — an authored change, not a deletion. `partial` keeps the content half of a');
w('mixed parenthetical and drops the grammar half. `hold` splits two ways and the two must not be');
w('confused: **keep** means the row is already right, **blocked** means the fix is unsafe.');
w('');
table(['course', 'strip', 'rewrite', 'partial', 'hold: keep (already right)', 'hold: BLOCKED', 'gated on an author check'],
  COURSES.map(c => {
    const rs = plan.filter(p => p.course_code === c);
    return [c, rs.filter(p => p.action === 'strip').length, rs.filter(p => p.action === 'rewrite').length,
      rs.filter(p => p.action === 'partial').length,
      rs.filter(p => p.hold_kind === 'keep_content_no_edit_needed').length,
      rs.filter(p => p.action === 'hold' && p.hold_kind !== 'keep_content_no_edit_needed').length,
      rs.filter(p => p.needs_author_check).length];
  }).concat([['**TOTAL**', count(p => p.action === 'strip'), count(p => p.action === 'rewrite'),
    count(p => p.action === 'partial'), count(p => p.hold_kind === 'keep_content_no_edit_needed'),
    count(p => p.action === 'hold' && p.hold_kind !== 'keep_content_no_edit_needed'),
    count(p => p.needs_author_check)].map(x => (x === '' ? '' : '**' + String(x).replace(/\*/g, '') + '**'))]));

w('The blocked holds, by what blocks them:');
w('');
const HK = {
  blocked_zut_collision: 'ZUT: the stripped prompt would carry more than one target form',
  blocked_no_gloss_to_fall_back_on: 'the known side is NOTHING BUT the label — a strip leaves an empty card',
  blocked_row_corrupt: 'known_text is truncated mid-parenthesis — the row is corrupt',
  blocked_wrong_language: 'known_text is English, not Japanese',
};
table(['blocker', 'rows'], Object.entries(HK).map(([k, v]) => [v, count(p => p.hold_kind === k)]));

// ---------------------------------------------------------------- severity
w('## Severity — would the learner notice it, would it derail them');
w('');
const clipped = plan.filter(p => p.has_clip);
const audible = clipped.filter(p => p.surface !== 'component_row_latent');
const spokenLabel = audible.filter(p => p.bucket !== 'C');
w('The audio finding decides this section, so here it is as a number first. Of the ' + clipped.length +
  ' rows with a known-side clip, ' + clipped.filter(p => p.surface === 'component_row_latent').length +
  ' are component rows the app never fetches, leaving **' + audible.length + ' clips that a learner can actually hear**. Of those, **' +
  spokenLabel.length + ' speak a grammar label aloud inside the prompt**, all of them in courses that are `beta` right now.');
w('');
w('| bucket | notices it? | derails them? | verdict |');
w('|---|---|---|---|');
w('| **A — annotation** (' + count(p => p.bucket === 'A') + ' rows) | Yes. It is printed on the card, and on ' +
  spokenLabel.length + ' of them the TTS reads it out — the word_boundaries show 708ms of speech on 不定詞 alone, so it is not a footnote, it is part of the utterance. | **Yes, on the voiced ones.** A prompt clip is the thing the learner is producing against. An extra Japanese noun inside it is indistinguishable from part of the phrase to be translated, so the learner tries to translate 不定詞. On print-only rows: noticed, confusing, not derailing. | Real defect. Fix. |');
w('| **C — content** (' + count(p => p.bucket === 'C') + ' rows) | Yes, and correctly so. | No — and *removing* it would. Japanese is pro-drop; 「〜と思っています」 with no marker maps to `acho`/`achas`/`acha`/`achamos`/`acham`. | Not a defect. Leave it. |');
w('| **MIXED** (' + count(p => p.bucket === 'MIXED') + ' rows) | Yes. | As bucket A for the label half. | Partial rewrite: keep the person, drop the label. |');
w('');
w('One severity qualifier that matters for scheduling: **por_for_jpn is not learner-reachable**');
w('(`new_app_status = not_available`) and has zero known-side audio, and it is ' +
  plan.filter(p => p.course_code === 'por_for_jpn').length + ' of the ' + plan.length +
  ' rows here — the single largest course in the census is also the only one with no live exposure at all.');
w('');

// ---------------------------------------------------------------- ZUT
w('## The ZUT trap — the part that can sink the fix');
w('');
const prod = coll.filter(c => c.tier === 'production');
w('I built the post-strip corpus as **the whole course**, not just the affected rows: all ' +
  '50,843 lego and practice-phrase rows in the seven courses, with the 1,193 carrying their');
w('proposed text. That matters — a stripped prompt collides just as easily with a row that never');
w('had a parenthesis, and grouping only the census rows against each other misses most of it.');
w('');
w('- **' + coll.length + ' collision groups** in total.');
w('- **' + prod.length + ' of them are on the production surface** (legos + build/use phrases). These hold ' +
  count(p => p.hold_kind === 'blocked_zut_collision') + ' rows.');
w('- ' + (coll.length - prod.length) + ' exist only among `phrase_role=component` rows. Not a production fork — see the next section.');
w('- Of the ' + prod.length + ' production groups, **' + prod.filter(c => !c.pre_existing).length +
  ' would be manufactured by this fix** and ' + prod.filter(c => c.pre_existing).length +
  ' land on a prompt that **already** carries several target forms today.');
w('');
w('That second number is the finding I did not expect and it changes the shape of the job.');
w('These courses are not ZUT-clean underneath the parentheses. deu_for_jpn maps a bare 「友達」');
w('to `freund`, `freunde`, `Freund` and `ein Freund`, and a bare 「する」 to `machen`, `tue`, `tut`');
w('and `tun`, with no parenthetical involved anywhere. So a good part of what the authors were');
w('doing with these labels was patching a prompt space that does not discriminate. Stripping the');
w('label does not create that problem; it removes the patch. Either way those rows are held.');
w('');
w('The canonical case from the brief reproduces exactly, and it is worse than a pair:');
w('');
const kn = coll.find(c => c.course_code === 'deu_for_jpn' && /知っていた/.test(c.proposed_known_text));
if (kn) {
  w('> deu_for_jpn 「知っていた」 → ' + kn.distinct_targets_production_only.join(' / '));
  for (const m of kn.members.filter(m => m.learner_surface)) w('> - `' + m.row_key + '` 「' + m.old_known_text + '」 → ' + m.target_text + (m.affected ? '  ← affected' : ''));
  w('');
  w('Three rows, two of them a `wissen`/`kennen` **sense** split rather than a tense split — so no');
  w('amount of tense rewriting fixes this one; 「知っていた」 has to be split by meaning first');
  w('(acquaintance vs knowledge of a fact). Held.');
  w('');
}
w('**Where an authored Japanese rewrite is available, I proposed one rather than holding.** That is');
w('the ' + count(p => p.action === 'rewrite') + ' `rewrite` rows: every person label becomes the person marker the same course');
w('already uses elsewhere, per course and per person, taken from its own precedent —');
w('');
const mk = new Map();
for (const p of plan.filter(p => p.action === 'rewrite' && p.notes)) {
  for (const n of p.notes.split('; ').filter(s => s.startsWith('rewrite '))) {
    const k = p.course_code + ' ' + n.replace('rewrite ', '');
    mk.set(k, (mk.get(k) || 0) + 1);
  }
}
table(['course', 'label → marker', 'rows'], [...mk.entries()].sort().map(([k, v]) => {
  const i = k.indexOf(' ');
  return [k.slice(0, i), '`' + k.slice(i + 1) + '`', v];
}));
w('So 「始める（一人称）」→`anfange` becomes 「始める（私が）」, which is the same information in the');
w('form the method wants and the form the course already uses 8 rows away. Particle choice (は vs');
w('が) follows each course\'s own dominant usage; for a bare third person I use 彼・彼女 rather than');
w('adopting a gendered precedent. **This family is an authoring proposal and wants a Japanese');
w('speaker\'s sign-off before it is applied** — it is ' + count(p => p.action === 'rewrite') +
  ' rows of new Japanese, not a deletion.');
w('');
w('### The residual risk the collision test cannot see');
w('');
const nac = plan.filter(p => p.needs_author_check);
w(nac.length + ' of the ' + count(p => p.action !== 'hold') + ' proposed edits drop a tense/mood/aspect label — ' +
  nac.filter(p => /接続法/.test(p.author_check_reason || '')).length + ' of them the subjunctive. None of them collides,');
w('so ZUT holds by the operative test: no two prompts end up sharing a form. What the fork test');
w('cannot tell you is whether the Japanese carries the distinction *by itself* on a card seen in');
w('isolation. 「終わる（あなたが）」→`acabes` has no subjunctive trigger in it once 接続法 is gone —');
w('though neither does any subjunctive LEGO in these courses, so this is a pre-existing property');
w('of the design rather than something the strip introduces. I flagged all ' + nac.length + ' rows');
w('`needs_author_check: true` in the plan and I recommend they land as a second batch, after the ' +
  count(p => p.action !== 'hold' && !p.needs_author_check) + ' clean ones — not because ZUT fails, but because I cannot settle it from data.');
w('');

// ---------------------------------------------------------------- component claim
w('## The "components are not a learner surface" claim, checked');
w('');
w('The brief asked me to check this against `docs/introduce-directive-strip-2026-08-11/REPORT.md`.');
w('**The claim is in that report and it is narrower than it sounds.** What the report establishes');
w('is that `phrase_role=component` *rows* are filtered out at all three of the app\'s fetch points,');
w('so their text and their audio are latent. What the same report then says, in its own correction');
w('section, is that the directive was *also* sitting in a second place — the decomposition tiles on');
w('the LEGO card — and **that** surface is served and displayed, and was missed by the original');
w('search precisely because it is a structured field rather than a plain text column.');
w('');
w('So my conclusion, applied throughout this adjudication:');
w('');
w('- `phrase_role=component` rows: **latent.** ' + count(p => p.surface === 'component_row_latent') +
  ' rows here, ' + plan.filter(p => p.surface === 'component_row_latent' && p.has_clip).length +
  ' of them holding a clip that is voiced and unreachable — a loaded gun, same as August.');
w('- A collision that exists only among component rows is **not** a ZUT fork, because ZUT is a rule');
w('  about production prompts and a component row is never one. ' + (coll.length - prod.length) +
  ' of my ' + coll.length + ' groups are');
w('  of this kind; I report them and do not hold on them.');
w('- The tiles are a different story, and they are surface 2 below.');
w('');

// ---------------------------------------------------------------- tiles
w('## Surface 2 — the decomposition tiles on the LEGO card');
w('');
const tiles = plan.filter(p => p.surface === 'card_tile');
const kt = tiles.filter(p => p.tile_field === 'known'), tt = tiles.filter(p => p.tile_field === 'target');
w('`course_legos.components` carries the same parentheticals in the `.known` field of each tile.');
w('My own count matches the dispatched census exactly: **' + kt.length + ' known-side tiles on 186 cards**');
w('across fra/ita/por/spa/zho — plus eng_for_jpn\'s 16 cards, which are a different thing (below).');
w('Both bracket spellings are in play and the detector takes either: fra_for_jpn uses ASCII');
w('`やっている(私たち)` while por/ita use full-width `〜です（彼らは）`.');
w('');
table(['course', 'cards', 'known-side tiles', 'target-side tiles', 'edit proposed', 'held'],
  COURSES.filter(c => tiles.some(p => p.course_code === c)).map(c => {
    const rs = tiles.filter(p => p.course_code === c);
    return [c, new Set(rs.map(p => p.row_uuid)).size, rs.filter(p => p.tile_field === 'known').length,
      rs.filter(p => p.tile_field === 'target').length, rs.filter(p => p.action !== 'hold').length,
      rs.filter(p => p.action === 'hold').length];
  }));
w('**Two things about this surface make it the cheaper half of the job.** A tile edit touches no');
w('audio at all — the card\'s clip was rendered from the lego\'s own `known_text`, which a tile edit');
w('never touches — and the tiles carry no `phrase_role`, so nothing here is latent: what is on a');
w('tile is on the screen.');
w('');
w('**deu_for_jpn has zero of them, and that is worth a sentence,** because deu is the course with');
w('the *most* known_text rows affected (' + plan.filter(p => p.course_code === 'deu_for_jpn').length +
  '). Only 113 of its legos have a `components` array at all, against 364 in por and 536 in fra:');
w('deu was decomposed with authored Intro mappings rather than componentisation (ralph: an Intro\'s');
w('`known_gloss_segments` is the primary tile feed and `components[]` is the fallback). Its labels');
w('had nowhere else to leak to. `known_gloss_segments` is clean across all 15 jpn courses — I checked.');
w('');
w('### eng_for_jpn is the mirror image of the defect');
w('');
w('eng_for_jpn\'s ' + tt.length + ' tile parentheticals are on the **English (target) side**, not the');
w('Japanese one, and they are the exact string ralph P4 names as the canonical dishonest gloss:');
w('');
w('> を → `(object marker)`  ·  か → `(question marker)`  ·  は → `(topic marker)`  ·  います → `(progressive: are ~ing)`  ·  探して → `looking for (from 探す, to search)`');
w('');
w('Same defect class — grammar terminology on a displayed card — pointing the other way. I bucketed');
w('them by the same two tests: ' + tt.filter(p => p.bucket === 'A').length + ' annotation, ' +
  tt.filter(p => p.bucket === 'C').length + ' content (`→ turn out`, `polite`, `(not) very`, `the ... one`).');
w('But **' + tt.filter(p => p.hold_kind === 'blocked_no_gloss_to_fall_back_on').length +
  ' of them cannot simply be stripped**: the tile\'s English side is *nothing but* the label, so a');
w('strip leaves an empty tile. A particle glossed only as its own grammatical function has no');
w('honest gloss to fall back on — that is ralph P3/P4 breakage upstream of A-135, and it needs a');
w('gloss written, not removed. Held with that reason.');
w('');
w('### Tile ZUT, kept separate');
w('');
w('Reported in `adj-tile-collisions.json`, never used to hold a row: **' + tcoll.length +
  ' tile groups** (' + tcoll.filter(c => !c.pre_existing).length + ' manufactured, ' +
  tcoll.filter(c => c.pre_existing).length + ' pre-existing), computed over all 3,933 tiles in the');
w('seven courses. A tile is a decomposition fragment, not a prompt anyone produces from, so one');
w('Japanese fragment shown against two target fragments on two different cards is a display');
w('inconsistency, not a ZUT violation. The big ones are the bare-particle tiles — ita 「〜の」 shows');
w('against `del/delle/di/della/la/dei/i` once the article labels come off — which is the same');
w('upstream problem as the paragraph above: a particle should never have been a tile of its own.');
w('');

// ---------------------------------------------------------------- approvals
w('## Approval state — the number you need before applying, not after');
w('');
w('Every affected seed, per course, and how many are approved (`course_seeds.approved_at not null`).');
w('"Seeds with an edit" excludes seeds where every affected row came out `hold`.');
w('');
table(['course', 'seeds touched', 'of those APPROVED', 'seeds with an actual edit', 'of those APPROVED', 'course-wide approved'],
  COURSES.map(c => [c, APPROVAL[c].seeds_touched, APPROVAL[c].touched_approved, APPROVAL[c].seeds_edited,
    APPROVAL[c].edited_approved, APPROVAL[c].approved + ' / ' + APPROVAL[c].seeds]));
const N = (x) => Number(x);
const ta = COURSES.reduce((a, c) => { a.t += N(APPROVAL[c].seeds_touched); a.ta += N(APPROVAL[c].touched_approved); a.e += N(APPROVAL[c].seeds_edited); a.ea += N(APPROVAL[c].edited_approved); return a; }, { t: 0, ta: 0, e: 0, ea: 0 });
w('**' + ta.ea + ' approved seeds must be unapproved to apply the edit set** (' + ta.e +
  ' seeds carry an edit; all but ita_for_jpn\'s are approved). Across everything touched it is ' +
  ta.ta + ' of ' + ta.t + '.');
w('');
w('**ita_for_jpn is approved on zero of its 668 seeds** while sitting at `new_app_status = beta`,');
w('and it is the one course in this set that took a content fix on 2026-08-11. Every other course');
w('here approved 299–300 seeds in a single stamp back in March–June. I have not chased why; it');
w('means ' + APPROVAL.ita_for_jpn.seeds_edited + ' of the ' + ta.e + ' edit-carrying seeds need no unapproval at all, and it is worth');
w('someone confirming that is intentional rather than a fix that unapproved a course and left it.');
w('');
w('(All 15 jpn courses report 668 seeds and ~300 approved. The affected seeds all sit in 1–300;');
w('the rest are empty placeholders, so do not read 668 as a course length.)');
w('');

// ---------------------------------------------------------------- contradictions
w('## What in the census contradicts the brief');
w('');
w('Re-derived from the live database rather than trusted. The brief\'s numbers hold — 1,193 rows,');
w('7 of 15 jpn courses, zero `course_seeds`, 724 clips, por_for_jpn 469 with no audio — with these');
w('corrections and additions:');
w('');
w('1. **Six live beta courses, not five.** The brief\'s own rails say "five live beta courses"; the');
w('   status column says `beta` for deu, eng, fra, ita, spa **and** zho. por_for_jpn is the only');
w('   `not_available` one of the seven.');
w('2. **Three rows are truncated, not annotated.** `por S0290L01` 「知っている（彼」, `spa S0128L03`');
w('   「知っていました（1人称」, `spa S0201L01` 「～するつもりだった（ir一人称」 — an unclosed');
w('   parenthesis and the text simply stops. A tolerant regex is needed to see them at all, and a');
w('   strip would silently swallow a corrupt row. Held as corrupt.');
w('3. **Two rows are in English.** `por S0283L02` and its component row: `known_text` is literally');
w('   `your (plural)` in a Japanese-known course. Held as a separate defect.');
w('4. **' + count(p => p.hold_kind === 'blocked_no_gloss_to_fall_back_on') + ' rows have no gloss at all** —');
w('   the known side is only the label: 「（冠詞）」→`il`, 「（定冠詞）」→`a`, 「（完了）」→`he`,');
w('   「（程度）」→`lo`. These read as annotation defects but they are missing-content defects.');
w('5. **The 724 clips are not 724 audible clips.** ' + clipped.filter(p => p.surface === 'component_row_latent').length +
  ' are on component rows the app never fetches.');
w('   The honest exposure number is ' + audible.length + ' audible, of which ' + spokenLabel.length + ' speak a label.');
w('6. **The parenthetical is not always trailing.** 51 rows have text after it —');
w('   「（彼女・彼に）あげる」, 「そういうわけで（理由）〜」, 「（あなたが）私に伝える（接続法）」 —');
w('   and 10 rows carry two parentheses, one of each bucket. A trailing-paren regex mangles those.');
w('7. **A fourth surface exists and is clean:** `known_gloss_segments` has zero parentheses across');
w('   all 15 jpn courses. Checked so nobody has to wonder later.');
w('');

// ---------------------------------------------------------------- held families
w('## The families I held, and why');
w('');
w('### 1. Target-internal agreement — no Japanese message difference exists (largest family)');
w('');
w('German case, Romance gender and number on articles, possessives and adjectives:');
w('「その（男性形）」→`der` vs 「その（与格）」→`dem`; 「あなたの」→`deine`/`deinem`/`deiner`/`deinen`;');
w('「私の」→`minha`/`meu`/`as minhas`; 「新しい（複数女性形）」→`nuevas` vs 「（単数男性形）」→`nuevo`.');
w('**Japanese cannot express these as a message, because they are not messages** — they are');
w('agreement with a governing noun or a preposition. No rewrite exists, in principle, and I did not');
w('invent one. The real fix is upstream and it is ralph Principle 3: agreement is a');
w('construction-feature, taught in context inside an M-LEGO, never a bare debut with a gloss.');
w('These rows should not exist in their present shape at all; a paren strip is the wrong tool.');
w('');
w('### 2. Sense splits wearing a tense label');
w('');
w('「知っていた（過去）」→`wusste` vs 「知っていた（過去形）」→`kannte` is `wissen` vs `kennen`;');
w('「～だった（estar過去形）」→`estaba` vs 「（ser過去形）」→`era`; 「知っている（conocer三人称現在形）」');
w('vs 「（saber三人称現在形）」. The label is doing a job the label cannot name honestly. The fix is a');
w('Japanese sense split (acquaintance vs knowing-a-fact; state vs identity) and it is real authoring');
w('against what each seed has already taught, so I propose the direction and not the string.');
w('');
w('### 3. Tense/aspect pairs where I believe a rewrite exists but will not assert it');
w('');
w('「見た（過去形）」→`sah` vs 「見た（過去分詞）」→`gesehen`, and 「聞いた」/「できた」/「言った」 alike.');
w('The method\'s own answer is 聞いた vs 聞いていた — a Japanese contrast, not a label. I can see the');
w('shape of it; I cannot verify that the contrasting Japanese form is already taught at that seed,');
w('or that it does not collide with a third row. Held with the direction recorded per row in');
w('`suggested_direction`. This is the family most worth a Japanese-speaking author\'s afternoon.');
w('');
w('### 4. The label-only rows (no gloss to fall back on)');
w('');
w('Covered above: ' + count(p => p.hold_kind === 'blocked_no_gloss_to_fall_back_on') + ' rows and tiles where the label *is* the content. Needs a gloss written.');
w('');
w('### 5. Corrupt and wrong-language rows');
w('');
w('The 3 truncated and 2 English rows. Not this defect.');
w('');
w('## Files');
w('');
w('- `adj-plan.json` — ' + plan.length + ' rows, one per affected parenthetical-bearing field, every one with an');
w('  explicit action. ' + count(p => p.surface === 'known_text') + ' known_text + ' +
  count(p => p.surface === 'component_row_latent') + ' component rows + ' + tiles.length + ' card tiles.');
w('  Nothing is silently omitted: a row I could not settle is `hold` with a reason.');
w('- `adj-collisions.json` — the ' + coll.length + ' known_text collision groups, each tagged `production` or');
w('  `component_rows_only`, `pre_existing` or manufactured, with every member row.');
w('- `adj-tile-collisions.json` — the ' + tcoll.length + ' tile groups, kept separate as instructed.');
w('- `adj-strings.json` / `adj-tile-strings.json` — the distinct-string classification, machine-readable.');
w('- `adj-classify.cjs` / `adj-report.cjs` — the classifier and this document\'s generator.');
w('- `adj-corpus.json` / `adj-tile-corpus.json` — the full-course corpora the collision passes ran against.');
w('');
w('---');
w('');
w('# Appendix A — every distinct parenthetical on the Japanese known side');
w('');
w('All ' + strings.length + ' of them, most frequent first, with the reason it landed where it did.');
w('`n` counts occurrences across the 1,193 known_text rows.');
w('');
table(['n', 'parenthetical', 'bucket', 'courses', 'reason', 'example'],
  strings.map(s => [s.n, '`' + s.inner + '`', s.bucket, s.courses.map(c => c.slice(0, 3)).join(' '),
    s.reason.replace(/\|/g, '/'), (s.examples[0] || '').replace(/\|/g, '/')]));
w('# Appendix B — every distinct parenthetical on the card tiles');
w('');
table(['n', 'side', 'parenthetical', 'bucket', 'courses', 'reason'],
  tstrings.map(s => [s.n, s.side, '`' + s.inner + '`', s.bucket, s.courses.map(c => c.slice(0, 3)).join(' '),
    s.reason.replace(/\|/g, '/')]));
w('# Appendix C — every production-surface ZUT collision');
w('');
w('The ' + prod.length + ' groups that hold ' + count(p => p.hold_kind === 'blocked_zut_collision') + ' rows. `M` = manufactured by this fix, `P` = the prompt already carried several forms.');
w('');
table(['course', 'proposed prompt', 'M/P', 'target forms it would carry', 'affected rows'],
  prod.sort((a, b) => a.course_code.localeCompare(b.course_code) || a.proposed_known_text.localeCompare(b.proposed_known_text))
    .map(c => [c.course_code, '「' + c.proposed_known_text + '」', c.pre_existing ? 'P' : 'M',
      c.distinct_targets_production_only.map(t => '`' + t + '`').join(' / '),
      c.members.filter(m => m.affected).map(m => m.row_key + ' 「' + m.old_known_text + '」').join('<br>')]));

fs.writeFileSync(path.join(HERE, 'adj-buckets.md'), out.join('\n'));
console.log('adj-buckets.md written: ' + out.join('\n').split('\n').length + ' lines');
