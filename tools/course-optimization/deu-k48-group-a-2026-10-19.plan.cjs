'use strict';
// tools/course-optimization/deu-k48-group-a-2026-10-19.plan.cjs — the per-LEGO plans for deu-k48-group-a-2026-10-19.cjs (job #252).
//
// APPLY: the clear cases (Kai, 19 Oct: "ones that don't break any rules, that are consistent with both the course and
// other fixes we've done in the past"). Each grows to the subordinator its OWN seed uses (K48, L22, L25), taken from the
// seed's own words on both sides (L26), and its basket is re-made so every row holds the whole LEGO (P17, O12).
//   basket: [suffix, role, English, German] — EVERY existing BUILD/USE row of the LEGO is listed (kept as is, or rewritten);
//           a suffix not in the course is inserted. The seed sentence stays a row (P26).
//   slip:   the LEGO's verb in main-clause order, which no row may have (K48).
//   neighbours: same-seed LEGOs re-cut so the grown LEGO does not swallow them (K47 build-up order; never delete a LEGO).
//
// HELD: not applied, each with the rule it would break. Published for Kai with the report.

const APPLY = [
  {
    lego: 'S0344L02', seed: 344,
    old: { known: 'happy to help you', target: 'dir gern hilft' },
    new: { known: "that he's happy to help you", target: 'dass er dir gern hilft' },
    components: [{ known: 'that', target: 'dass' }, { known: "he's", target: 'er' }, { known: 'happy to help you', target: 'dir gern hilft' }],
    demo: "I'm sure that he's happy to help you",
    slip: /\bhilft (er )?dir gern\b|\ber hilft\b/i,
    basket: [
      ['B01', 'build', "I know that he's happy to help you", 'Ich weiß, dass er dir gern hilft'],
      ['B02', 'build', "I think that he's happy to help you", 'Ich denke, dass er dir gern hilft'],
      ['B03', 'build', "she says that he's happy to help you", 'Sie sagt, dass er dir gern hilft'],
      ['U01', 'use', "I know someone who said that he's happy to help you", 'Ich kenne jemanden, der gesagt hat, dass er dir gern hilft'],
      ['U02', 'use', 'I am sure that he is happy to help you', 'ich bin mir sicher, dass er dir gern hilft'],
      ['U03', 'use', "do you think that he's happy to help you?", 'denkst du, dass er dir gern hilft?'],
      ['U04', 'use', 'she has said that he is happy to help you', 'sie hat gesagt, dass er dir gern hilft'],
      ['U05', 'use', 'I met someone who said that he is happy to help you', 'ich habe jemanden getroffen, der gesagt hat, dass er dir gern hilft'],
      ['U06', 'use', "I'm sure that he's happy to help you, because he's your friend", 'Ich bin mir sicher, dass er dir gern hilft, weil er dein Freund ist'],
      ['U07', 'use', "who said that he's happy to help you", 'der gesagt hat, dass er dir gern hilft'],
    ],
  },
];

const HELD = [
  // L3 — the seed's clause from its trigger to the verb is over the 8-syllable cap; no smaller contiguous cut carries the trigger.
  { lego: 'S0010L02', now: 'I can | Ich kann', proposed: 'if I can remember the whole sentence | ob ich mich an den ganzen Satz erinnern kann', rule: 'L3', why: '12 syllables; "ich … kann" is not contiguous in the seed, so no smaller cut starts with ob' },
  { lego: 'S0084L02', now: 'he said | er gesagt hat', proposed: 'what he said about my friend | was er über meinen Freund gesagt hat', rule: 'L3', why: '10 syllables; "was er … gesagt hat" is gapped by über meinen Freund (L01)' },
  { lego: 'S0117L05', now: 'we talked | wir geredet haben', proposed: 'when we talked to each other | als wir miteinander geredet haben', rule: 'L3 + L26', why: '11 syllables; and the seed English ("last time we talked to each other") has no "when" to carry als' },
  { lego: 'S0190L03', now: 'ask you | dir stelle', proposed: 'if I ask you some questions | wenn ich dir ein paar Fragen stelle', rule: 'L3', why: '9 syllables; also L02/L03 carry each other\'s components (data fault, listed not changed)' },
  { lego: 'S0235L01', now: 'wanted to tell you | dir etwas sagen wollte', proposed: 'that he wanted to tell you something | dass er dir etwas sagen wollte', rule: 'L3', why: '9 syllables' },
  { lego: 'S0616L02', now: 'you thought that | du das gedacht hast', proposed: 'to say you thought that | zu sagen, dass du das gedacht hast', rule: 'L3', why: '9 syllables (review page proposal); the smaller "you thought that | dass du das gedacht hast" has no English word for dass — see the L26 group' },
  // L26 — the seed's English has no word for the trigger (a dropped "that", a zero relative, "next time we meet"), so the census
  // proposal adds an English word the seed never says. The rule-safe cut keeps the English as the seed says it and grows only the
  // German (the course already does this: S0249L01 "you to help me | dass du mir hilfst", S0205L03 "I was trying to say | das ich
  // sagen wollte") — but whether a LEGO whose English shows nothing of dass is "clear" under K48 ("on both sides") is Kai's call.
  { lego: 'S0063L02', now: "you don't mind | es dir nichts ausmacht", proposed: "that you don't mind | dass es dir nichts ausmacht", rule: 'L26', why: 'seed: "are you sure you don\'t mind" — no "that"', alternative: "you don't mind | dass es dir nichts ausmacht, or sure you don't mind | sicher, dass es dir nichts ausmacht (8 syllables, overlaps L01)" },
  { lego: 'S0116L02', now: 'I could make | ich treffen könnte', proposed: 'that I could make | die ich treffen könnte', rule: 'L26', why: 'seed: "the best choice I could make" — no relative word in English', alternative: 'I could make | die ich treffen könnte, or choice I could make | Wahl, die ich treffen könnte (overlaps L01)' },
  { lego: 'S0291L02', now: 'I will be able to | ich kann', proposed: 'that I will be able to speak better soon | dass ich bald besser sprechen kann', rule: 'L26', why: 'seed: "I hope I\'ll be able to speak better soon" — no "that"', alternative: "I'll be able to speak better soon | dass ich bald besser sprechen kann (8 syllables)" },
  { lego: 'S0292L01', now: 'you will be able to | du kannst', proposed: 'that you will be able to come to the party | dass du zur Party kommen kannst', rule: 'L26 + K47', why: 'seed: "I hope you\'ll be able to come to the party" — no "that"; and it swallows L02 "to the party", a LATER LEGO (needs a re-order)', alternative: "you'll be able to come to the party | dass du zur Party kommen kannst, after a rotation of L01/L02" },
  { lego: 'S0427L01', now: 'you think | du denkst', proposed: 'that you think | dass du denkst', rule: 'L26', why: 'seed: "they wouldn\'t like you to think that they\'re bored" — the first dass is English "you to"', alternative: 'you to think | dass du denkst (the S0249L01 "you to help me | dass du mir hilfst" shape)' },
  { lego: 'S0533L05', now: 'you say | du sagst', proposed: 'that you say | das du sagst', rule: 'L26', why: 'seed: "every word you say" — no relative word in English', alternative: 'you say | das du sagst, or word you say | Wort, das du sagst (overlaps L01)' },
  { lego: 'S0568L04', now: 'to meet each other | uns treffen', proposed: 'when we meet | wenn wir uns treffen', rule: 'L26', why: 'seed: "next time we meet" — no "when"; "next time we meet | beim nächsten Mal, wenn wir uns treffen" is 9 syllables', alternative: 'we meet | wenn wir uns treffen' },
  // K47 — the grown LEGO would take in a LATER LEGO of its seed; the edit door cannot re-index, so it needs a two-LEGO rotation.
  { lego: 'S0118L02', now: 'we were | wir waren', proposed: 'when we were in the pub | als wir in der Kneipe waren', rule: 'K47', why: 'swallows L03 "in the pub", which is taught AFTER L02; a clean fix rotates L02/L03 (L02 becomes "in the pub", L03 the grown LEGO), as deu-s0534-reorder did' },
  { lego: 'S0139L02', now: 'I need to leave | ich gehen muss', proposed: 'that I need to leave so early | dass ich so früh gehen muss', rule: 'K47', why: 'swallows L03 "so early", which is taught AFTER L02; needs the same L02/L03 rotation' },
  // Not this shape, or Kai's call.
  { lego: 'S0159L02', now: "I'm trying to say | ich versuche zu sagen", proposed: "what I'm trying to say | was ich versuche zu sagen", rule: 'K48 does not reach', why: 'not verb-final: the infinitive is extraposed, so "ich versuche zu sagen" reads the same in a main clause and no phrase can slip; growing it would be a German judgement (was ich versuche zu sagen / was ich zu sagen versuche)' },
  { lego: 'S0263L02', now: 'you mean | du meinst (not new)', proposed: 'who you mean | wen du meinst', rule: 'L27 duplicate / never delete a LEGO', why: 'grown, it would duplicate L01 "who you mean | wen du meinst" on both sides; it is already not new (basket never played) — re-cut or merge is Kai\'s call' },
];

module.exports = { APPLY, HELD };
