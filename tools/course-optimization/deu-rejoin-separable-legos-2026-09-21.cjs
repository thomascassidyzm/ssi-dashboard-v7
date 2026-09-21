#!/usr/bin/env node
// tools/course-optimization/deu-rejoin-separable-legos-2026-09-21.cjs
//
// deu_for_eng: NINE LEGOs built before Kai's separable-verb ruling introduce
// their verb SPLIT. Kai ruled (2026-09-21, job #499) that they are REJOINED:
// clause 8 of the ruling as encoded in services/course-builder/lib/separable-verbs.cjs
// — "every separable verb introduced after seed 83 is introduced JOINED; joined
// is the one canonical shape." The nine, as they stood live:
//
//   S0122L01  it is starting            es fängt an
//   S0133L01  you get to know           man lernt kennen
//   S0155L01  I don't mind              es macht mir nichts aus
//   S0190L01  do you mind               macht es dir etwas aus
//   S0281L01  do you mind if            macht es dir etwas aus wenn
//   S0288L02  like watching television  sehen gern fern
//   S0496L01  not planning to           habe nicht vor
//   S0524L05  I call back               rufe zurück
//   S0540L04  makes out                 macht aus
//
// KAI'S TWO CONSTRAINTS, and how each is met here:
//
//   1. DO NOT DROP WORDS. Every non-verb word of an old LEGO (es, man, mir,
//      nichts, dir, etwas, wenn, gern) is either KEPT in the new LEGO or is
//      already a taught chunk of an earlier seed (es S0027L01, man S0056L03,
//      mir S0025L03, nichts S0035L02, dir S0001L05, etwas S0004L01, wenn
//      S0034L04, gern S0051L01, nicht S0010L01, habe S0037L01). The shape
//      chosen per LEGO follows the course's own precedents: the bare joined
//      infinitive where seed 83 set it ("zustimmen"), and the verb-final
//      subordinate chunk where seed 63 set it ("es dir nichts ausmacht").
//      The finite stem forms (fängt, lernt, macht, sehen, habe, rufe) are
//      not lexemes of their own — they are the conjugated verb, and they are
//      drilled SPLIT in every basket below.
//
//   2. DRILL BOTH SHAPES, HEAVILY. Every basket carries 4 BUILD + 8 USE with
//      six split and six joined realisations, judged by separableVerbsIn(),
//      and every row passed the real gate (tools/phrase-gate/gate-check.cjs,
//      which replays /api/seed/complete) with the OLD LEGO's chunks removed
//      from the seed's vocabulary — so nothing here leans on the text it
//      replaces. `--dry-run` re-runs that gate; `--apply` refuses on any failure.
//
// WHAT AN EDIT DOES, and why that is accepted (the brief says so): the row's
// text change fires trg_null_lego_audio_on_text_change, which drops the three
// lego clips and the presentation clip; the seed is unapproved here explicitly
// (approved_at = NULL, as build.cjs does); the old basket rows are deleted and
// the new ones inserted under the same lego_id, so learner progress filed under
// the lego_id is untouched and no round moves. Audio is QUEUED (audio-pass
// queue), never rendered here.
//
// Every write carries an editor identity (serviceIdentity + recordContentEdit)
// as CLAUDE.md requires of a tools/ sweep that writes over SQL.
//
//   node tools/course-optimization/deu-rejoin-separable-legos-2026-09-21.cjs --dry-run
//   node tools/course-optimization/deu-rejoin-separable-legos-2026-09-21.cjs --apply

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
const { requestRoundIndexRefresh } = require('../../services/shared/round-index-refresh.cjs');
const { extractVocab, normalizeForContainment } = require('../../services/course-builder/lib/text-normalization.cjs');
const { computeLegoPosition } = require('../../services/course-builder/lib/phrase-structure.cjs');
const SV = require('../../services/course-builder/lib/separable-verbs.cjs');
const G = require('../phrase-gate/gate-check.cjs');

const COURSE = 'deu_for_eng';
const SURFACE = 'tools:deu-rejoin-separable-legos-2026-09-21';
const RULING = "Kai 2026-09-21 (job #499): separable verbs introduced after seed 83 are introduced JOINED; rejoin the nine pre-ruling split LEGOs, drop no words, drill both shapes";

const CONTENT = [
  {
    seed: 122,
    index: 1,
    oldKnown: "it is starting",
    oldTarget: "es fängt an",
    known: "it is starting",
    target: "es anfängt",
    type: "M",
    components: [
      {
        known: "it",
        target: "es"
      },
      {
        known: "is starting",
        target: "anfängt"
      }
    ],
    build: [
      [
        "it is starting now",
        "es fängt jetzt an"
      ],
      [
        "when it is starting",
        "wenn es anfängt"
      ],
      [
        "I think it is starting",
        "ich denke, es fängt an"
      ],
      [
        "I'm not sure whether it is starting",
        "ich bin mir nicht sicher, ob es anfängt"
      ]
    ],
    use: [
      [
        "I think it is starting, and I want to see how it is going",
        "ich denke, es fängt an, und ich will sehen, wie es läuft"
      ],
      [
        "you know that it is starting",
        "du weißt, dass es anfängt"
      ],
      [
        "it is starting, but we have time",
        "es fängt an, aber wir haben Zeit"
      ],
      [
        "I want to be here when it is starting",
        "ich will hier sein, wenn es anfängt"
      ],
      [
        "it is starting, and I have time",
        "es fängt an, und ich habe Zeit"
      ],
      [
        "I'm not sure whether it is starting today",
        "ich bin mir nicht sicher, ob es heute anfängt"
      ],
      [
        "it is starting now and I want to work",
        "es fängt jetzt an und ich will arbeiten"
      ],
      [
        "I can speak German when it is starting",
        "ich kann Deutsch sprechen, wenn es anfängt"
      ]
    ]
  },
  {
    seed: 133,
    index: 1,
    oldKnown: "you get to know",
    oldTarget: "man lernt kennen",
    known: "to get to know",
    target: "kennenlernen",
    type: "A",
    components: null,
    build: [
      [
        "I want to get to know you",
        "ich will dich kennenlernen"
      ],
      [
        "you get to know people",
        "man lernt Leute kennen"
      ],
      [
        "you get to know someone",
        "man lernt jemanden kennen"
      ],
      [
        "we want to get to know your friend",
        "wir wollen deinen Freund kennenlernen"
      ]
    ],
    use: [
      [
        "you get to know people when you work together",
        "man lernt Leute kennen, wenn man zusammen arbeitet"
      ],
      [
        "I would like to get to know your friend",
        "ich möchte deinen Freund kennenlernen"
      ],
      [
        "you get to know someone well when you learn together",
        "man lernt jemanden gut kennen, wenn man zusammen lernt"
      ],
      [
        "I want to get to know more people here",
        "ich will hier mehr Leute kennenlernen"
      ],
      [
        "you get to know something new when you work together",
        "man lernt etwas Neues kennen, wenn man zusammen arbeitet"
      ],
      [
        "I think you want to get to know my friend",
        "ich denke, du willst meinen Freund kennenlernen"
      ],
      [
        "you get to know this language better when you speak it",
        "man lernt diese Sprache besser kennen, wenn man sie spricht"
      ],
      [
        "I'm not sure whether I want to get to know your friend",
        "ich bin mir nicht sicher, ob ich deinen Freund kennenlernen will"
      ]
    ]
  },
  {
    seed: 155,
    index: 1,
    oldKnown: "I don't mind",
    oldTarget: "es macht mir nichts aus",
    known: "I don't mind",
    target: "es mir nichts ausmacht",
    type: "M",
    components: [
      {
        known: "it",
        target: "es"
      },
      {
        known: "to me",
        target: "mir"
      },
      {
        known: "nothing",
        target: "nichts"
      },
      {
        known: "matters",
        target: "ausmacht"
      }
    ],
    build: [
      [
        "I don't mind helping",
        "es macht mir nichts aus zu helfen"
      ],
      [
        "if I don't mind",
        "wenn es mir nichts ausmacht"
      ],
      [
        "I don't mind working",
        "es macht mir nichts aus zu arbeiten"
      ],
      [
        "you know that I don't mind",
        "du weißt, dass es mir nichts ausmacht"
      ]
    ],
    use: [
      [
        "I don't mind helping you tomorrow morning",
        "es macht mir nichts aus, dir morgen früh zu helfen"
      ],
      [
        "I think you know that I don't mind",
        "ich denke, du weißt, dass es mir nichts ausmacht"
      ],
      [
        "I don't mind if we speak German",
        "es macht mir nichts aus, wenn wir Deutsch sprechen"
      ],
      [
        "I can help you because I don't mind",
        "ich kann dir helfen, weil es mir nichts ausmacht"
      ],
      [
        "I don't mind working a few minutes more",
        "es macht mir nichts aus, ein paar Minuten mehr zu arbeiten"
      ],
      [
        "I hope you know that I don't mind",
        "ich hoffe, du weißt, dass es mir nichts ausmacht"
      ],
      [
        "I don't mind, but I want to go soon",
        "es macht mir nichts aus, aber ich will bald gehen"
      ],
      [
        "I want to learn German because I don't mind working",
        "ich will Deutsch lernen, weil es mir nichts ausmacht zu arbeiten"
      ]
    ]
  },
  {
    seed: 190,
    index: 1,
    oldKnown: "do you mind",
    oldTarget: "macht es dir etwas aus",
    known: "you mind",
    target: "es dir etwas ausmacht",
    type: "M",
    components: [
      {
        known: "it",
        target: "es"
      },
      {
        known: "to you",
        target: "dir"
      },
      {
        known: "something",
        target: "etwas"
      },
      {
        known: "matters",
        target: "ausmacht"
      }
    ],
    build: [
      [
        "do you mind?",
        "macht es dir etwas aus?"
      ],
      [
        "if you mind",
        "wenn es dir etwas ausmacht"
      ],
      [
        "do you mind if we speak German?",
        "macht es dir etwas aus, wenn wir Deutsch sprechen?"
      ],
      [
        "whether you mind",
        "ob es dir etwas ausmacht"
      ]
    ],
    use: [
      [
        "I don't know whether you mind",
        "ich weiß nicht, ob es dir etwas ausmacht"
      ],
      [
        "do you mind if I have a few questions today?",
        "macht es dir etwas aus, wenn ich heute ein paar Fragen habe?"
      ],
      [
        "I want to know whether you mind",
        "ich will wissen, ob es dir etwas ausmacht"
      ],
      [
        "do you mind if I speak German with you?",
        "macht es dir etwas aus, wenn ich mit dir Deutsch spreche?"
      ],
      [
        "I'm not sure whether you mind",
        "ich bin mir nicht sicher, ob es dir etwas ausmacht"
      ],
      [
        "do you mind if he speaks German?",
        "macht es dir etwas aus, wenn er Deutsch spricht?"
      ],
      [
        "she wants to know whether you mind",
        "sie will wissen, ob es dir etwas ausmacht"
      ],
      [
        "do you mind if we have a few questions?",
        "macht es dir etwas aus, wenn wir ein paar Fragen haben?"
      ]
    ]
  },
  {
    seed: 281,
    index: 1,
    oldKnown: "do you mind if",
    oldTarget: "macht es dir etwas aus wenn",
    known: "you mind if",
    target: "es dir etwas ausmacht wenn",
    type: "M",
    components: [
      {
        known: "you mind",
        target: "es dir etwas ausmacht"
      },
      {
        known: "if",
        target: "wenn"
      }
    ],
    build: [
      [
        "do you mind if we wait?",
        "macht es dir etwas aus, wenn wir warten?"
      ],
      [
        "would you mind if we stay?",
        "würde es dir etwas ausmachen, wenn wir bleiben?"
      ],
      [
        "do you mind if I ask you something?",
        "macht es dir etwas aus, wenn ich dich etwas frage?"
      ],
      [
        "would you mind if we speak German?",
        "würde es dir etwas ausmachen, wenn wir Deutsch sprechen?"
      ]
    ],
    use: [
      [
        "I don't know whether you mind if we wait here",
        "ich weiß nicht, ob es dir etwas ausmacht, wenn wir hier warten"
      ],
      [
        "do you mind if we wait a few minutes before you start?",
        "macht es dir etwas aus, wenn wir ein paar Minuten warten, bevor du anfängst?"
      ],
      [
        "would you mind if I have a few questions?",
        "würde es dir etwas ausmachen, wenn ich ein paar Fragen habe?"
      ],
      [
        "do you mind if we stay here a few minutes?",
        "macht es dir etwas aus, wenn wir hier ein paar Minuten bleiben?"
      ],
      [
        "I'm not sure whether you mind if I speak German",
        "ich bin mir nicht sicher, ob es dir etwas ausmacht, wenn ich Deutsch spreche"
      ],
      [
        "do you mind if he speaks German with you?",
        "macht es dir etwas aus, wenn er mit dir Deutsch spricht?"
      ],
      [
        "would you mind if we go before you start?",
        "würde es dir etwas ausmachen, wenn wir gehen, bevor du anfängst?"
      ],
      [
        "do you mind if we speak German before you start?",
        "macht es dir etwas aus, wenn wir Deutsch sprechen, bevor du anfängst?"
      ]
    ]
  },
  {
    seed: 288,
    index: 2,
    oldKnown: "like watching television",
    oldTarget: "sehen gern fern",
    known: "like watching television",
    target: "gern fernsehen",
    type: "M",
    components: [
      {
        known: "like",
        target: "gern"
      },
      {
        known: "watching television",
        target: "fernsehen"
      }
    ],
    build: [
      [
        "they like watching television",
        "sie sehen gern fern"
      ],
      [
        "because we like watching television",
        "weil wir gern fernsehen"
      ],
      [
        "we like watching television at the weekend",
        "wir sehen am Wochenende gern fern"
      ],
      [
        "people who like watching television",
        "Leute, die gern fernsehen"
      ]
    ],
    use: [
      [
        "most people I know like watching television at the weekend",
        "die meisten Leute, die ich kenne, sehen am Wochenende gern fern"
      ],
      [
        "I don't know whether they like watching television",
        "ich weiß nicht, ob sie gern fernsehen"
      ],
      [
        "they like watching television on Sunday",
        "sie sehen am Sonntag gern fern"
      ],
      [
        "I think that most people I know like watching television",
        "ich denke, dass die meisten Leute, die ich kenne, gern fernsehen"
      ],
      [
        "I have friends who like watching television",
        "ich habe Freunde, die gern fernsehen"
      ],
      [
        "they like watching television, but we want to read",
        "sie sehen gern fern, aber wir wollen lesen"
      ],
      [
        "I think that they like watching television when they have time",
        "ich denke, dass sie gern fernsehen, wenn sie Zeit haben"
      ],
      [
        "we like watching television when we are together",
        "wir sehen gern fern, wenn wir zusammen sind"
      ]
    ]
  },
  {
    seed: 496,
    index: 1,
    oldKnown: "not planning to",
    oldTarget: "habe nicht vor",
    known: "planning to",
    target: "vorhaben",
    type: "A",
    components: null,
    build: [
      [
        "I'm not planning to lose",
        "ich habe nicht vor zu verlieren"
      ],
      [
        "what he is planning",
        "was er vorhat"
      ],
      [
        "I'm planning to learn more",
        "ich habe vor, mehr zu lernen"
      ],
      [
        "because I'm not planning to lose",
        "weil ich nicht vorhabe zu verlieren"
      ]
    ],
    use: [
      [
        "I'm not planning to say anything about it",
        "ich habe nicht vor, etwas darüber zu sagen"
      ],
      [
        "I don't know what he is planning",
        "ich weiß nicht, was er vorhat"
      ],
      [
        "I'm really not planning to lose today",
        "ich habe heute wirklich nicht vor zu verlieren"
      ],
      [
        "I think that he is planning to stay",
        "ich denke, dass er vorhat zu bleiben"
      ],
      [
        "I'm planning to go home soon",
        "ich habe vor, bald nach Hause zu gehen"
      ],
      [
        "if he is not planning to help, I want to go",
        "wenn er nicht vorhat zu helfen, will ich gehen"
      ],
      [
        "we are planning to learn more German",
        "wir haben vor, mehr Deutsch zu lernen"
      ],
      [
        "I want to know what she is planning",
        "ich will wissen, was sie vorhat"
      ]
    ]
  },
  {
    seed: 524,
    index: 5,
    oldKnown: "I call back",
    oldTarget: "rufe zurück",
    known: "to call back",
    target: "zurückrufen",
    type: "A",
    components: null,
    build: [
      [
        "I'll call you back",
        "ich rufe dich zurück"
      ],
      [
        "I can call you back",
        "ich kann dich zurückrufen"
      ],
      [
        "I'll call you back in three minutes",
        "ich rufe dich in drei Minuten zurück"
      ],
      [
        "I want to call you back later",
        "ich will dich später zurückrufen"
      ]
    ],
    use: [
      [
        "I'll call you back in a few minutes",
        "ich rufe dich in ein paar Minuten zurück"
      ],
      [
        "you can call me back tonight",
        "du kannst mich heute Abend zurückrufen"
      ],
      [
        "I'll call you back tomorrow morning",
        "ich rufe dich morgen früh zurück"
      ],
      [
        "I have to call her back",
        "ich muss sie zurückrufen"
      ],
      [
        "I'll call you back when I have time",
        "ich rufe dich zurück, wenn ich Zeit habe"
      ],
      [
        "I don't know if I can call you back today",
        "ich weiß nicht, ob ich dich heute zurückrufen kann"
      ],
      [
        "I'll call everyone back later",
        "ich rufe später alle zurück"
      ],
      [
        "do you want to call me back in four minutes?",
        "willst du mich in vier Minuten zurückrufen?"
      ]
    ]
  },
  {
    seed: 540,
    index: 4,
    oldKnown: "makes out",
    oldTarget: "macht aus",
    known: "to mind",
    target: "ausmachen",
    type: "A",
    components: null,
    build: [
      [
        "she doesn't mind",
        "es macht ihr nichts aus"
      ],
      [
        "if you don't mind",
        "wenn es dir nichts ausmacht"
      ],
      [
        "I don't mind at all",
        "es macht mir überhaupt nichts aus"
      ],
      [
        "would you mind?",
        "würde es dir etwas ausmachen?"
      ]
    ],
    use: [
      [
        "I don't mind if we go without the car",
        "es macht mir nichts aus, wenn wir ohne das Auto gehen"
      ],
      [
        "I think that he doesn't mind",
        "ich denke, dass es ihm nichts ausmacht"
      ],
      [
        "do you mind if I want the car?",
        "macht es dir etwas aus, wenn ich das Auto will?"
      ],
      [
        "I don't know whether she would mind",
        "ich weiß nicht, ob es ihr etwas ausmachen würde"
      ],
      [
        "we don't mind if you want to go",
        "es macht uns nichts aus, wenn du gehen willst"
      ],
      [
        "he said that he doesn't mind",
        "er hat gesagt, dass es ihm nichts ausmacht"
      ],
      [
        "does he mind if we go without the car?",
        "macht es ihm etwas aus, wenn wir ohne das Auto gehen?"
      ],
      [
        "would you mind if I want the car?",
        "würde es dir etwas ausmachen, wenn ich das Auto will?"
      ]
    ]
  }
];

// ─── helpers ─────────────────────────────────────────────────────────────────
function supa() {
  const envPath = path.join(__dirname, '..', '..', '.env');
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}
const legoIdOf = (l) => `S${String(l.seed).padStart(4, '0')}L${String(l.index).padStart(2, '0')}`;
const phraseIdOf = (l, role, n) => `${COURSE}:${legoIdOf(l)}${role === 'build' ? 'B' : 'U'}${String(n).padStart(2, '0')}`;
const norm = (s) => normalizeForContainment(s || '');

async function pageAll(sb, table, select, extra) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(select).eq('course_code', COURSE).range(from, from + 999);
    if (extra) q = extra(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

function phraseRows(l, eventId) {
  const rows = [];
  let position = 0;
  const push = (role, [known, target], n) => {
    position++;
    rows.push({
      id: phraseIdOf(l, role, n), course_code: COURSE, seed_number: l.seed, lego_index: l.index,
      lego_id: legoIdOf(l), position, known_text: known, target_text: target,
      word_count: target.length, lego_count: known.split(/\s+/).length,
      phrase_role: role, introduce: true, connected_lego_ids: [],
      lego_position: computeLegoPosition(target, l.target), status: 'draft', version: 1,
      metadata: { authored_by: SURFACE, ruling: 'separable-verbs: rejoin, drill both shapes (Kai 2026-09-21)',
        separable: SV.separableVerbsIn(target).map(v => `${v.lemma}:${v.realisation}`) },
      ...(eventId ? { last_edit_event_id: eventId } : {}),
    });
  };
  l.build.forEach((p, i) => push('build', p, i + 1));
  l.use.forEach((p, i) => push('use', p, i + 1));
  return rows;
}

// ─── guard: the course has not moved, ZUT holds course-wide, both shapes present ─
async function guard(sb) {
  const problems = [];
  const legos = await pageAll(sb, 'course_legos', 'lego_id,seed_number,lego_index,known_text,target_text');
  const phrases = await pageAll(sb, 'course_practice_phrases', 'id,seed_number,lego_index,phrase_role,known_text,target_text',
    q => q.in('phrase_role', ['build', 'use']));
  const inBasket = (r) => CONTENT.some(l => l.seed === r.seed_number && l.index === r.lego_index);

  for (const l of CONTENT) {
    const cur = legos.find(x => x.lego_id === legoIdOf(l));
    if (!cur) { problems.push(`${legoIdOf(l)} not found`); continue; }
    if (norm(cur.target_text) !== norm(l.oldTarget) || norm(cur.known_text) !== norm(l.oldKnown)) {
      problems.push(`${legoIdOf(l)} is now "${cur.known_text}" -> "${cur.target_text}", expected "${l.oldKnown}" -> "${l.oldTarget}" — the course moved; nothing to do or re-check`);
    }
    // the ruling's shape: joined, and the verb recognised by the lexicon
    const shapes = SV.separableVerbsIn(l.target);
    if (!shapes.length || shapes.some(v => v.realisation === 'split')) problems.push(`${legoIdOf(l)} "${l.target}" is not a recognised JOINED separable verb`);
    // both shapes, six each across BUILD + USE
    let split = 0, joined = 0;
    for (const [, t] of [...l.build, ...l.use]) for (const v of SV.separableVerbsIn(t)) {
      if (v.lemma !== shapes[0].lemma) continue;
      if (v.realisation === 'split') split++; else joined++;
    }
    if (split < 4 || joined < 4) problems.push(`${legoIdOf(l)}: ${split} split / ${joined} joined — Kai asked for both shapes, heavily`);
  }

  // ZUT, the production direction: one known -> one target, against every row
  // that survives (rows in the nine baskets are replaced, so they are excluded).
  const survivors = [
    ...legos.filter(x => !CONTENT.some(l => legoIdOf(l) === x.lego_id)).map(x => ({ id: x.lego_id, known: x.known_text, target: x.target_text })),
    ...phrases.filter(p => !inBasket(p)).map(p => ({ id: p.id, known: p.known_text, target: p.target_text })),
  ];
  const newRows = CONTENT.flatMap(l => [
    { id: legoIdOf(l), known: l.known, target: l.target },
    ...phraseRows(l).map(p => ({ id: p.id, known: p.known_text, target: p.target_text })),
  ]);
  const byKnown = new Map();
  for (const r of [...survivors, ...newRows]) {
    const k = norm(r.known); if (!k) continue;
    if (!byKnown.has(k)) byKnown.set(k, []);
    byKnown.get(k).push(r);
  }
  for (const n of newRows) {
    for (const o of byKnown.get(norm(n.known)) || []) {
      if (o.id === n.id) continue;
      if (norm(o.target) !== norm(n.target)) problems.push(`ZUT: "${n.known}" -> "${n.target}" (${n.id}) collides with ${o.id} -> "${o.target}"`);
      else if (!newRows.includes(o)) problems.push(`DUPLICATE: ${n.id} repeats existing ${o.id} ("${n.known}")`);
    }
  }
  return problems;
}

// ─── the real gate, with the OLD lego's chunks removed from the seed vocab ───
async function gateAll(sb) {
  const ctx = G.makeCourseCtx(sb, COURSE);
  const results = [];
  for (const l of CONTENT) {
    const v = await G.loadTranslationVocab(sb, COURSE, l.seed);
    const { data: sibs } = await sb.from('course_legos').select('lego_index,target_text,type,components').eq('course_code', COURSE).eq('seed_number', l.seed);
    for (const sl of sibs || []) {
      if (sl.lego_index === l.index) continue; // never let the text being replaced tile a phrase
      extractVocab(sl.target_text, false).forEach(w => v.add(w));
      if (sl.type === 'M' && sl.components) for (const c of sl.components) extractVocab(c.target, false).forEach(w => v.add(w));
    }
    for (const c of l.components || []) extractVocab(c.target, false).forEach(w => v.add(w));
    ctx.vocabCache.set(l.seed, v);
    const r = await G.checkPhraseSet({
      courseCode: COURSE, seedNumber: l.seed, legoIndex: l.index, legoKnown: l.known, legoTarget: l.target,
      components: l.components || undefined,
      phrases: [...l.build.map(([k, t]) => ({ role: 'build', known: k, target: t })), ...l.use.map(([k, t]) => ({ role: 'use', known: k, target: t }))],
    }, ctx);
    results.push(r);
  }
  return results;
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  const apply = process.argv.includes('--apply');
  const sb = supa();

  const problems = await guard(sb);
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) process.exit(1);
  console.log('guard: clean — rows as expected, ZUT holds, no duplicates, both shapes in every basket\n');

  const gate = await gateAll(sb);
  let gateFail = false;
  for (const r of gate) {
    const l = CONTENT.find(x => legoIdOf(x) === r.legoId);
    console.log(`${r.legoId}  "${l.oldKnown}" -> "${l.oldTarget}"   ==>   "${l.known}" -> "${l.target}"  [${l.type}]   gate: ${r.overallPass ? 'PASS' : 'FAIL ' + r.failingGates.join(',')}`);
    for (const line of G.failureFeedback(r)) console.log(`    ${line}`);
    if (!r.overallPass) gateFail = true;
    for (const [k, t] of l.build) console.log(`    BUILD  ${k}  ->  ${t}   (${SV.separableVerbsIn(t).map(v => v.realisation).join(',')})`);
    for (const [k, t] of l.use) console.log(`    USE    ${k}  ->  ${t}   (${SV.separableVerbsIn(t).map(v => v.realisation).join(',')})`);
    console.log('');
  }
  if (gateFail) { console.error('BLOCKED  a basket fails the live gate — nothing written'); process.exit(1); }
  if (!apply) { console.log('DRY RUN — nothing written. Re-run with --apply.'); return; }

  const identity = serviceIdentity(SURFACE);
  let rowsTouched = 0;
  for (const l of CONTENT) {
    const id = legoIdOf(l);
    const rows = phraseRows(l);
    const eventId = await recordContentEdit(sb, {
      identity, courseCode: COURSE, surface: SURFACE, operation: 'separable-lego-rejoin',
      scope: { seed_numbers: [l.seed], lego_ids: [id], phrase_ids: rows.map(p => p.id), rows: 2 + rows.length },
      detail: { ruling: RULING, from: { known: l.oldKnown, target: l.oldTarget }, to: { known: l.known, target: l.target } },
    });
    const { error: lerr } = await sb.from('course_legos')
      .update({ known_text: l.known, target_text: l.target, type: l.type, components: l.components, last_edit_event_id: eventId })
      .eq('course_code', COURSE).eq('seed_number', l.seed).eq('lego_index', l.index);
    if (lerr) throw new Error(`lego update ${id}: ${lerr.message}`);
    const { error: derr, count } = await sb.from('course_practice_phrases').delete({ count: 'exact' })
      .eq('course_code', COURSE).eq('seed_number', l.seed).eq('lego_index', l.index);
    if (derr) throw new Error(`phrase delete ${id}: ${derr.message}`);
    const { error: perr } = await sb.from('course_practice_phrases').insert(phraseRows(l, eventId));
    if (perr) throw new Error(`phrase insert ${id}: ${perr.message}`);
    // An edit unapproves its seed (build.cjs does the same on re-decomposition).
    const { error: serr } = await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId })
      .eq('course_code', COURSE).eq('seed_number', l.seed);
    if (serr) throw new Error(`seed unapprove ${l.seed}: ${serr.message}`);
    rowsTouched += 2 + count + rows.length;
    console.log(`APPLIED ${id}: lego rewritten, ${count} old phrase rows deleted, ${rows.length} inserted, seed ${l.seed} unapproved (edit event ${eventId})`);
  }

  const q = await queueAudioPass(sb, {
    courseCode: COURSE, reason: 'separable-verb rejoin of nine LEGOs (Kai 2026-09-21, job #499)',
    requestedBy: SURFACE, metadata: { rowsTouched, legos: CONTENT.map(legoIdOf) },
  });
  console.log(`audio pass queued: ${JSON.stringify(q)}`);
  const refresh = await requestRoundIndexRefresh(COURSE, { immediate: true, reason: SURFACE });
  console.log(`round map: ${JSON.stringify(refresh)}`);
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
