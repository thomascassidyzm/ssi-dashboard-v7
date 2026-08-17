/**
 * yid_for_eng — golden decompositions, seeds 1-10.
 *
 * THE VERBAL-COMPLEX RULE (see build-report.md §3 for the full statement).
 *
 * Yiddish is a V2 language whose middle field is filled in a fixed order:
 *
 *     [subject] [FINITE VERB] [זיך] [time adverb] [צו] [INFINITIVE] [objects]
 *
 * The reflexive זיך, the infinitival צו and the time adverb are placed by the
 * CLAUSE, not by the word they belong to. So an English "to learn" does not
 * correspond to any contiguous Yiddish string that is stable across frames.
 * Three rules follow, and they are applied without exception below:
 *
 *   R1. Every infinitive A-LEGO is BARE — רעדן, לערנען, זאָגן, דערקלערן.
 *       Never "צו רעדן". The צו is selected by the governor, not the verb.
 *   R2. צו, זיך and the middle-field time adverb NEVER sit at a LEGO edge and
 *       are never atomised. They appear only INSIDE a frame M-LEGO that spans
 *       from the finite verb (or predicative governor) to the infinitive, and
 *       that M-LEGO is glossed with the whole English intention.
 *   R3. A verb-governed preposition (דערמאָנען זיך אין) travels with its verb
 *       inside the frame, never with the object noun.
 *
 * Consequence: the learner is never asked to decide whether to say צו, and no
 * known text ever maps to two Yiddish forms. See §3.4 of the report.
 *
 * ORTHOGRAPHY: every target below is NFC — Hebrew points as base + combining
 * mark (U+05B7 etc.), never the Alphabetic Presentation Forms (U+FB1D-U+FB4F).
 * This matches all 668 pre-existing seeds. See §2 of the report for why the
 * containment gate makes this load-bearing rather than cosmetic.
 */

module.exports = [
  // ───────────────────────────────────────────────────────── SEED 1
  {
    seed_number: 1,
    known_text: 'I want to speak Yiddish with you now.',
    target_text: 'איך וויל איצט רעדן ייִדיש מיט דיר',
    note: 'איצט lands immediately after the finite verb, not at the end as in English. '
        + 'It is taught only inside the L4 frame — the first half of the contrastive '
        + 'twin debut whose second half is הײַנט in seed 7. L1 debuts as the whole '
        + 'verbal complex (finite verb + infinitive) rather than as two LEGOs, because '
        + 'with zero prior vocabulary a bare second LEGO admits exactly one phrase and '
        + 'cannot fill BUILD and USE distinctly — its parts are carried as components.',
    legos: [
      {
        idx: 1, type: 'M', known: 'I want to speak', target: 'איך וויל רעדן',
        components: [
          { known: 'I want', target: 'איך וויל' },
          { known: 'to speak', target: 'רעדן' },
        ],
        build: [],
        use: [],
      },
      {
        idx: 2, type: 'A', known: 'Yiddish', target: 'ייִדיש',
        build: [{ known: 'to speak Yiddish', target: 'רעדן ייִדיש' }],
        use: [{ known: 'I want to speak Yiddish', target: 'איך וויל רעדן ייִדיש', score: 8 }],
      },
      {
        // Preposition enclosure: דיר is the dative of דו. A bare "you" would
        // fail ZUT (דו / דיר / דיך), so the preposition carries the form.
        idx: 3, type: 'M', known: 'with you', target: 'מיט דיר',
        components: [
          { known: 'with', target: 'מיט', introduce: false },
          { known: 'you', target: 'דיר', introduce: false },
        ],
        build: [{ known: 'to speak with you', target: 'רעדן מיט דיר' }],
        use: [
          { known: 'I want to speak with you', target: 'איך וויל רעדן מיט דיר', score: 8 },
          { known: 'I want to speak Yiddish with you', target: 'איך וויל רעדן ייִדיש מיט דיר', score: 8 },
        ],
      },
      {
        // FRAME LEGO (R2). Reveals the middle-field adverb slot. Bare "now" is
        // deliberately NOT introduced here — it debuts in seed 9, after the
        // learner has seen the slot twice (איצט here, הײַנט in seed 7).
        idx: 4, type: 'M', known: 'I want to speak now', target: 'איך וויל איצט רעדן',
        components: [
          { known: 'I want', target: 'איך וויל', introduce: false },
          { known: 'now', target: 'איצט', introduce: false },
          { known: 'to speak', target: 'רעדן', introduce: false },
        ],
        build: [{ known: 'I want to speak Yiddish now', target: 'איך וויל איצט רעדן ייִדיש' }],
        use: [
          { known: 'I want to speak with you now', target: 'איך וויל איצט רעדן מיט דיר', score: 8 },
          { known: 'I want to speak Yiddish with you now', target: 'איך וויל איצט רעדן ייִדיש מיט דיר', score: 8 },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────── SEED 2
  {
    seed_number: 2,
    known_text: "I'm trying to learn.",
    target_text: 'איך פּרוּוו זיך צו לערנען',
    note: 'The זיך belongs to לערנען זיך but surfaces after the finite verb פּרוּוו. '
        + 'The corpus proves the attachment: seed 8 has the same governor with a '
        + 'non-reflexive infinitive (פּרוּוון צו דערקלערן) and NO זיך. So זיך cannot '
        + 'be bundled into "I\'m trying" — it is absorbed into the frame (R2).',
    legos: [
      {
        idx: 1, type: 'A', known: 'to learn', target: 'לערנען',
        build: [{ known: 'to learn Yiddish', target: 'לערנען ייִדיש' }],
        use: [
          { known: 'I want to learn Yiddish', target: 'איך וויל לערנען ייִדיש', score: 8 },
          { known: 'I want to learn Yiddish with you', target: 'איך וויל לערנען ייִדיש מיט דיר', score: 8 },
        ],
      },
      {
        idx: 2, type: 'M', known: "I'm trying to learn", target: 'איך פּרוּוו זיך צו לערנען',
        components: [
          { known: "I'm trying", target: 'איך פּרוּוו' },
          { known: 'to learn', target: 'לערנען', introduce: false },
        ],
        build: [{ known: "I'm trying to learn with you", target: 'איך פּרוּוו זיך צו לערנען מיט דיר' }],
        use: [
          { known: "I'm trying to learn Yiddish", target: 'איך פּרוּוו זיך צו לערנען ייִדיש', score: 7 },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────── SEED 3
  {
    seed_number: 3,
    known_text: 'how to speak as often as possible.',
    target_text: 'ווי אַזוי צו רעדן וואָס עפֿטער',
    note: 'ווי אַזוי is a predicative governor and takes צו, so the צו is absorbed '
        + 'into the frame exactly as after a lexical verb (R2). וואָס עפֿטער is '
        + 'idiomatic and non-derivable — taught whole (methodology principle 6).',
    legos: [
      {
        idx: 1, type: 'M', known: 'how to speak', target: 'ווי אַזוי צו רעדן',
        components: [
          { known: 'how', target: 'ווי אַזוי' },
          { known: 'to speak', target: 'רעדן', introduce: false },
        ],
        build: [{ known: 'how to speak Yiddish', target: 'ווי אַזוי צו רעדן ייִדיש' }],
        use: [
          { known: 'I want to learn how to speak Yiddish', target: 'איך וויל לערנען ווי אַזוי צו רעדן ייִדיש', score: 8 },
          { known: "I'm trying to learn how to speak Yiddish", target: 'איך פּרוּוו זיך צו לערנען ווי אַזוי צו רעדן ייִדיש', score: 7 },
        ],
      },
      {
        idx: 2, type: 'M', known: 'as often as possible', target: 'וואָס עפֿטער',
        components: [
          { known: 'what', target: 'וואָס', introduce: false },
          { known: 'more often', target: 'עפֿטער', introduce: false },
        ],
        build: [{ known: 'how to speak as often as possible', target: 'ווי אַזוי צו רעדן וואָס עפֿטער' }],
        use: [
          { known: 'I want to speak Yiddish as often as possible', target: 'איך וויל רעדן ייִדיש וואָס עפֿטער', score: 8 },
          { known: 'I want to speak with you as often as possible', target: 'איך וויל רעדן מיט דיר וואָס עפֿטער', score: 8 },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────── SEED 4
  {
    seed_number: 4,
    known_text: 'how to say something in Yiddish',
    target_text: 'ווי אַזוי צו זאָגן עפּעס אויף ייִדיש',
    note: 'CORPUS-CONSTRAINED COLLOCATION: אויף ייִדיש occurs in the 668-seed corpus '
        + 'only with זאָגן (seeds 4, 160), never with רעדן — "speak Yiddish" is bare '
        + 'רעדן ייִדיש (seeds 1, 15, 22). So אויף ייִדיש is NOT taught as a free '
        + 'preposition+language chunk; it debuts inside the attested collocation L4.',
    legos: [
      {
        idx: 1, type: 'A', known: 'something', target: 'עפּעס',
        build: [
          { known: 'to learn something', target: 'לערנען עפּעס' },
          { known: 'I want something', target: 'איך וויל עפּעס' },
          { known: "I'm trying to learn something", target: 'איך פּרוּוו זיך צו לערנען עפּעס' },
        ],
        use: [
          { known: 'I want to learn something', target: 'איך וויל לערנען עפּעס', score: 8 },
          { known: 'I want to learn something with you', target: 'איך וויל לערנען עפּעס מיט דיר', score: 8 },
          { known: 'I want to learn something as often as possible', target: 'איך וויל לערנען עפּעס וואָס עפֿטער', score: 7 },
          { known: 'I want to learn something now', target: 'איך וויל איצט לערנען עפּעס', score: 7 },
          { known: "I'm trying to learn something with you", target: 'איך פּרוּוו זיך צו לערנען עפּעס מיט דיר', score: 7 },
        ],
      },
      {
        idx: 2, type: 'A', known: 'to say', target: 'זאָגן',
        build: [
          { known: 'to say something', target: 'זאָגן עפּעס' },
          { known: 'I want to say', target: 'איך וויל זאָגן' },
          { known: 'I want to say something', target: 'איך וויל זאָגן עפּעס' },
        ],
        use: [
          { known: 'I want to say something with you', target: 'איך וויל זאָגן עפּעס מיט דיר', score: 7 },
          { known: 'I want to say something now', target: 'איך וויל איצט זאָגן עפּעס', score: 8 },
          { known: 'I want to say something as often as possible', target: 'איך וויל זאָגן עפּעס וואָס עפֿטער', score: 7 },
          { known: 'I want to say something with you now', target: 'איך וויל איצט זאָגן עפּעס מיט דיר', score: 7 },
          { known: 'I want to say something with you as often as possible', target: 'איך וויל זאָגן עפּעס מיט דיר וואָס עפֿטער', score: 6 },
        ],
      },
      {
        idx: 3, type: 'M', known: 'how to say', target: 'ווי אַזוי צו זאָגן',
        components: [
          { known: 'how', target: 'ווי אַזוי', introduce: false },
          { known: 'to say', target: 'זאָגן', introduce: false },
        ],
        build: [
          { known: 'how to say something', target: 'ווי אַזוי צו זאָגן עפּעס' },
          { known: 'I want to learn how to say', target: 'איך וויל לערנען ווי אַזוי צו זאָגן' },
          { known: "I'm trying to learn how to say", target: 'איך פּרוּוו זיך צו לערנען ווי אַזוי צו זאָגן' },
        ],
        use: [
          { known: 'I want to learn how to say something', target: 'איך וויל לערנען ווי אַזוי צו זאָגן עפּעס', score: 8 },
          { known: "I'm trying to learn how to say something", target: 'איך פּרוּוו זיך צו לערנען ווי אַזוי צו זאָגן עפּעס', score: 7 },
          { known: 'I want to learn how to say something now', target: 'איך וויל איצט לערנען ווי אַזוי צו זאָגן עפּעס', score: 7 },
          { known: 'I want to learn how to say something with you', target: 'איך וויל לערנען ווי אַזוי צו זאָגן עפּעס מיט דיר', score: 7 },
          { known: 'I want to learn how to say something as often as possible', target: 'איך וויל לערנען ווי אַזוי צו זאָגן עפּעס וואָס עפֿטער', score: 6 },
        ],
      },
      {
        idx: 4, type: 'M', known: 'to say something in Yiddish', target: 'זאָגן עפּעס אויף ייִדיש',
        components: [
          { known: 'to say', target: 'זאָגן', introduce: false },
          { known: 'something', target: 'עפּעס', introduce: false },
          { known: 'in Yiddish', target: 'אויף ייִדיש' },
        ],
        build: [
          { known: 'I want to say something in Yiddish', target: 'איך וויל זאָגן עפּעס אויף ייִדיש' },
          { known: 'how to say something in Yiddish', target: 'ווי אַזוי צו זאָגן עפּעס אויף ייִדיש' },
          { known: "I'm trying to learn how to say something in Yiddish", target: 'איך פּרוּוו זיך צו לערנען ווי אַזוי צו זאָגן עפּעס אויף ייִדיש' },
        ],
        use: [
          { known: 'I want to say something in Yiddish now', target: 'איך וויל איצט זאָגן עפּעס אויף ייִדיש', score: 8 },
          { known: 'I want to say something in Yiddish with you', target: 'איך וויל זאָגן עפּעס אויף ייִדיש מיט דיר', score: 7 },
          { known: 'I want to say something in Yiddish as often as possible', target: 'איך וויל זאָגן עפּעס אויף ייִדיש וואָס עפֿטער', score: 7 },
          { known: 'I want to learn how to say something in Yiddish', target: 'איך וויל לערנען ווי אַזוי צו זאָגן עפּעס אויף ייִדיש', score: 8 },
          { known: 'I want to say something in Yiddish with you now', target: 'איך וויל איצט זאָגן עפּעס אויף ייִדיש מיט דיר', score: 7 },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────── SEED 5
  {
    seed_number: 5,
    known_text: "I'm going to practise speaking with someone else.",
    target_text: 'איך וועל זיך געניטן אין רעדן מיט עמעצן אַנדערש',
    note: 'וועל is a modal-type auxiliary and takes a BARE infinitive — no צו — which '
        + 'is why the block here is זיך געניטן אין and not זיך צו געניטן. The governed '
        + 'preposition אין travels with the verb (R3), never with רעדן.',
    legos: [
      {
        idx: 1, type: 'M', known: "I'm going to", target: 'איך וועל',
        components: [
          { known: 'I', target: 'איך', introduce: false },
          { known: 'will', target: 'וועל', introduce: false },
        ],
        build: [
          { known: "I'm going to speak", target: 'איך וועל רעדן' },
          { known: "I'm going to learn", target: 'איך וועל לערנען' },
          { known: "I'm going to say something", target: 'איך וועל זאָגן עפּעס' },
        ],
        use: [
          { known: "I'm going to speak Yiddish", target: 'איך וועל רעדן ייִדיש', score: 8 },
          { known: "I'm going to speak Yiddish with you", target: 'איך וועל רעדן ייִדיש מיט דיר', score: 8 },
          { known: "I'm going to say something in Yiddish", target: 'איך וועל זאָגן עפּעס אויף ייִדיש', score: 8 },
          { known: "I'm going to learn how to say something", target: 'איך וועל לערנען ווי אַזוי צו זאָגן עפּעס', score: 7 },
          { known: "I'm going to speak Yiddish as often as possible", target: 'איך וועל רעדן ייִדיש וואָס עפֿטער', score: 7 },
        ],
      },
      {
        idx: 2, type: 'M', known: 'to practise speaking', target: 'זיך געניטן אין רעדן',
        components: [
          { known: 'to practise', target: 'זיך געניטן אין' },
          { known: 'to speak', target: 'רעדן', introduce: false },
        ],
        build: [
          { known: "I'm going to practise speaking", target: 'איך וועל זיך געניטן אין רעדן' },
          { known: 'I want to practise speaking', target: 'איך וויל זיך געניטן אין רעדן' },
          { known: 'to practise speaking Yiddish', target: 'זיך געניטן אין רעדן ייִדיש' },
        ],
        use: [
          { known: "I'm going to practise speaking Yiddish", target: 'איך וועל זיך געניטן אין רעדן ייִדיש', score: 8 },
          { known: 'I want to practise speaking Yiddish with you', target: 'איך וויל זיך געניטן אין רעדן ייִדיש מיט דיר', score: 8 },
          { known: 'I want to practise speaking as often as possible', target: 'איך וויל זיך געניטן אין רעדן וואָס עפֿטער', score: 8 },
          { known: "I'm going to practise speaking Yiddish as often as possible", target: 'איך וועל זיך געניטן אין רעדן ייִדיש וואָס עפֿטער', score: 7 },
          { known: "I'm going to practise speaking with you", target: 'איך וועל זיך געניטן אין רעדן מיט דיר', score: 8 },
        ],
      },
      {
        idx: 3, type: 'M', known: 'with someone else', target: 'מיט עמעצן אַנדערש',
        components: [
          { known: 'with', target: 'מיט', introduce: false },
          { known: 'someone', target: 'עמעצן', introduce: false },
          { known: 'else', target: 'אַנדערש', introduce: false },
        ],
        build: [
          { known: 'to speak with someone else', target: 'רעדן מיט עמעצן אַנדערש' },
          { known: 'I want to speak with someone else', target: 'איך וויל רעדן מיט עמעצן אַנדערש' },
          { known: 'to practise speaking with someone else', target: 'זיך געניטן אין רעדן מיט עמעצן אַנדערש' },
        ],
        use: [
          { known: 'I want to speak Yiddish with someone else', target: 'איך וויל רעדן ייִדיש מיט עמעצן אַנדערש', score: 8 },
          { known: "I'm going to practise speaking with someone else", target: 'איך וועל זיך געניטן אין רעדן מיט עמעצן אַנדערש', score: 8 },
          { known: 'I want to speak with someone else now', target: 'איך וויל איצט רעדן מיט עמעצן אַנדערש', score: 7 },
          { known: 'I want to say something in Yiddish with someone else', target: 'איך וויל זאָגן עפּעס אויף ייִדיש מיט עמעצן אַנדערש', score: 7 },
          { known: "I'm going to speak Yiddish with someone else", target: 'איך וועל רעדן ייִדיש מיט עמעצן אַנדערש', score: 8 },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────── SEED 6
  {
    seed_number: 6,
    known_text: "I'm trying to remember a word.",
    target_text: 'איך פּרוּוו זיך צו דערמאָנען אין אַ וואָרט',
    note: 'דערמאָנען זיך אין is a three-part verb frame; אין is verb-governed, not a '
        + 'preposition on וואָרט, so it stays inside the frame (R3). Corpus seed 113 '
        + 'shows אין DROPS before a clause (זיך נישט דערמאָנען וואָס דו האָסט געזאָגט), '
        + 'so every phrase below keeps a NOUN object. Note also the remember fork '
        + 'against seed 10 — speaker question 1.',
    legos: [
      {
        idx: 1, type: 'M', known: 'a word', target: 'אַ וואָרט',
        components: [
          { known: 'a', target: 'אַ', introduce: false },
          { known: 'word', target: 'וואָרט', introduce: false },
        ],
        build: [
          { known: 'to say a word', target: 'זאָגן אַ וואָרט' },
          { known: 'to learn a word', target: 'לערנען אַ וואָרט' },
          { known: 'I want to say a word', target: 'איך וויל זאָגן אַ וואָרט' },
        ],
        use: [
          { known: 'I want to say a word in Yiddish', target: 'איך וויל זאָגן אַ וואָרט אויף ייִדיש', score: 8 },
          { known: 'I want to learn a word with you', target: 'איך וויל לערנען אַ וואָרט מיט דיר', score: 7 },
          { known: 'I want to say a word now', target: 'איך וויל איצט זאָגן אַ וואָרט', score: 7 },
          { known: "I'm going to say a word in Yiddish", target: 'איך וועל זאָגן אַ וואָרט אויף ייִדיש', score: 8 },
          { known: 'I want to learn how to say a word in Yiddish', target: 'איך וויל לערנען ווי אַזוי צו זאָגן אַ וואָרט אויף ייִדיש', score: 8 },
        ],
      },
      {
        idx: 2, type: 'M', known: "I'm trying to remember", target: 'איך פּרוּוו זיך צו דערמאָנען אין',
        components: [
          { known: "I'm trying", target: 'איך פּרוּוו', introduce: false },
          { known: 'to remember', target: 'דערמאָנען', introduce: false },
          { known: 'in', target: 'אין', introduce: false },
        ],
        build: [
          { known: "I'm trying to remember a word", target: 'איך פּרוּוו זיך צו דערמאָנען אין אַ וואָרט' },
          { known: "I'm trying to remember something", target: 'איך פּרוּוו זיך צו דערמאָנען אין עפּעס' },
          { known: "I'm trying to remember a word in Yiddish", target: 'איך פּרוּוו זיך צו דערמאָנען אין אַ וואָרט אויף ייִדיש' },
        ],
        use: [
          { known: "I'm trying to remember something in Yiddish", target: 'איך פּרוּוו זיך צו דערמאָנען אין עפּעס אויף ייִדיש', score: 6 },
          { known: "I'm trying to remember a word with you", target: 'איך פּרוּוו זיך צו דערמאָנען אין אַ וואָרט מיט דיר', score: 6 },
          { known: "I'm trying to remember a word as often as possible", target: 'איך פּרוּוו זיך צו דערמאָנען אין אַ וואָרט וואָס עפֿטער', score: 5 },
          { known: "I'm trying to remember something with you", target: 'איך פּרוּוו זיך צו דערמאָנען אין עפּעס מיט דיר', score: 6 },
          { known: "I'm trying to remember a word in Yiddish with you", target: 'איך פּרוּוו זיך צו דערמאָנען אין אַ וואָרט אויף ייִדיש מיט דיר', score: 5 },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────── SEED 7
  {
    seed_number: 7,
    known_text: 'I want to try as hard as I can today.',
    target_text: 'איך וויל הײַנט פּרוּוון אַזוי שטאַרק ווי איך קען',
    note: 'SECOND HALF OF THE CONTRASTIVE TWIN DEBUT. הײַנט occupies exactly the slot '
        + 'איצט occupied in seed 1 — immediately after the finite verb, before the '
        + 'infinitive. Two frames, same slot, different adverb: the learner infers the '
        + 'middle-field rule by triangulation, with nothing explained. Corpus seed 20 '
        + '(דו ווילסט זיך גיך לערנען זײַן נאָמען) independently confirms the slot.',
    legos: [
      {
        idx: 1, type: 'A', known: 'to try', target: 'פּרוּוון',
        build: [
          { known: 'I want to try', target: 'איך וויל פּרוּוון' },
          { known: "I'm going to try", target: 'איך וועל פּרוּוון' },
          { known: 'I want to try now', target: 'איך וויל איצט פּרוּוון' },
        ],
        use: [
          { known: "I'm going to try with you", target: 'איך וועל פּרוּוון מיט דיר', score: 7 },
          { known: 'I want to try as often as possible', target: 'איך וויל פּרוּוון וואָס עפֿטער', score: 7 },
          { known: "I'm going to try with someone else", target: 'איך וועל פּרוּוון מיט עמעצן אַנדערש', score: 7 },
          { known: 'I want to try with you now', target: 'איך וויל איצט פּרוּוון מיט דיר', score: 7 },
          { known: "I'm going to try as often as possible", target: 'איך וועל פּרוּוון וואָס עפֿטער', score: 7 },
        ],
      },
      {
        idx: 2, type: 'M', known: 'I want to try today', target: 'איך וויל הײַנט פּרוּוון',
        components: [
          { known: 'I want', target: 'איך וויל', introduce: false },
          { known: 'today', target: 'הײַנט', introduce: false },
          { known: 'to try', target: 'פּרוּוון', introduce: false },
        ],
        build: [
          { known: 'I want to try today with you', target: 'איך וויל הײַנט פּרוּוון מיט דיר' },
          { known: 'I want to try today as often as possible', target: 'איך וויל הײַנט פּרוּוון וואָס עפֿטער' },
          { known: 'I want to try today with someone else', target: 'איך וויל הײַנט פּרוּוון מיט עמעצן אַנדערש' },
        ],
        use: [
          { known: 'I want to try to practise speaking today', target: 'איך וויל הײַנט פּרוּוון זיך געניטן אין רעדן', score: 6 },
          { known: 'I want to try today with you as often as possible', target: 'איך וויל הײַנט פּרוּוון מיט דיר וואָס עפֿטער', score: 6 },
          { known: 'I want to try to practise speaking Yiddish today', target: 'איך וויל הײַנט פּרוּוון זיך געניטן אין רעדן ייִדיש', score: 6 },
          { known: 'I want to try to practise speaking today with someone else', target: 'איך וויל הײַנט פּרוּוון זיך געניטן אין רעדן מיט עמעצן אַנדערש', score: 6 },
          { known: 'I want to try to practise speaking Yiddish today with you', target: 'איך וויל הײַנט פּרוּוון זיך געניטן אין רעדן ייִדיש מיט דיר', score: 6 },
        ],
      },
      {
        idx: 3, type: 'M', known: 'as hard as I can', target: 'אַזוי שטאַרק ווי איך קען',
        components: [
          { known: 'as hard', target: 'אַזוי שטאַרק' },
          { known: 'as I can', target: 'ווי איך קען' },
        ],
        build: [
          { known: 'to try as hard as I can', target: 'פּרוּוון אַזוי שטאַרק ווי איך קען' },
          { known: 'I want to try as hard as I can', target: 'איך וויל פּרוּוון אַזוי שטאַרק ווי איך קען' },
          { known: 'to speak as hard as I can', target: 'רעדן אַזוי שטאַרק ווי איך קען' },
        ],
        use: [
          { known: 'I want to try as hard as I can today', target: 'איך וויל הײַנט פּרוּוון אַזוי שטאַרק ווי איך קען', score: 8 },
          { known: "I'm going to try as hard as I can", target: 'איך וועל פּרוּוון אַזוי שטאַרק ווי איך קען', score: 8 },
          { known: 'I want to speak Yiddish as hard as I can', target: 'איך וויל רעדן ייִדיש אַזוי שטאַרק ווי איך קען', score: 6 },
          { known: "I'm going to practise speaking as hard as I can", target: 'איך וועל זיך געניטן אין רעדן אַזוי שטאַרק ווי איך קען', score: 6 },
          { known: 'I want to try as hard as I can with you', target: 'איך וויל פּרוּוון אַזוי שטאַרק ווי איך קען מיט דיר', score: 6 },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────── SEED 8
  {
    seed_number: 8,
    known_text: "I'm going to try to explain what I mean.",
    target_text: 'איך וועל פּרוּוון צו דערקלערן וואָס איך מיין',
    note: 'THE DECISIVE CORPUS EVIDENCE FOR R2. The same governor פּרוּוון takes צו here '
        + 'but carries NO זיך, because דערקלערן is not reflexive — whereas seed 2 '
        + '(פּרוּוו זיך צו לערנען) and seed 6 (פּרוּוו זיך צו דערמאָנען) both do. So the '
        + 'זיך belongs to the embedded verb, not to פּרוּוון, and cannot be bundled '
        + 'into "I\'m trying". "to explain" is therefore stored BARE (R1) and the צו '
        + 'lives only inside the L2 frame.',
    legos: [
      {
        idx: 1, type: 'A', known: 'to explain', target: 'דערקלערן',
        build: [
          { known: 'to explain something', target: 'דערקלערן עפּעס' },
          { known: 'I want to explain', target: 'איך וויל דערקלערן' },
          { known: 'I want to explain something', target: 'איך וויל דערקלערן עפּעס' },
        ],
        use: [
          { known: 'I want to explain something in Yiddish', target: 'איך וויל דערקלערן עפּעס אויף ייִדיש', score: 7 },
          { known: "I'm going to explain a word with you", target: 'איך וועל דערקלערן אַ וואָרט מיט דיר', score: 7 },
          { known: 'I want to explain something now', target: 'איך וויל איצט דערקלערן עפּעס', score: 7 },
          { known: 'I want to explain a word in Yiddish', target: 'איך וויל דערקלערן אַ וואָרט אויף ייִדיש', score: 7 },
          { known: 'I want to explain something as hard as I can', target: 'איך וויל דערקלערן עפּעס אַזוי שטאַרק ווי איך קען', score: 6 },
        ],
      },
      {
        idx: 2, type: 'M', known: "I'm going to try to explain", target: 'איך וועל פּרוּוון צו דערקלערן',
        components: [
          { known: "I'm going to", target: 'איך וועל', introduce: false },
          { known: 'to try', target: 'פּרוּוון', introduce: false },
          { known: 'to explain', target: 'דערקלערן', introduce: false },
        ],
        build: [
          { known: "I'm going to try to explain something", target: 'איך וועל פּרוּוון צו דערקלערן עפּעס' },
          { known: "I'm going to try to explain a word", target: 'איך וועל פּרוּוון צו דערקלערן אַ וואָרט' },
          { known: "I'm going to try to explain it with you", target: 'איך וועל פּרוּוון צו דערקלערן עפּעס מיט דיר' },
        ],
        use: [
          { known: "I'm going to try to explain something in Yiddish", target: 'איך וועל פּרוּוון צו דערקלערן עפּעס אויף ייִדיש', score: 7 },
          { known: "I'm going to try to explain a word in Yiddish", target: 'איך וועל פּרוּוון צו דערקלערן אַ וואָרט אויף ייִדיש', score: 7 },
          { known: "I'm going to try to explain something as hard as I can", target: 'איך וועל פּרוּוון צו דערקלערן עפּעס אַזוי שטאַרק ווי איך קען', score: 6 },
          { known: "I'm going to try to explain a word with you", target: 'איך וועל פּרוּוון צו דערקלערן אַ וואָרט מיט דיר', score: 7 },
          { known: "I'm going to try to explain something with someone else", target: 'איך וועל פּרוּוון צו דערקלערן עפּעס מיט עמעצן אַנדערש', score: 6 },
        ],
      },
      {
        idx: 3, type: 'M', known: 'what I mean', target: 'וואָס איך מיין',
        components: [
          { known: 'what', target: 'וואָס', introduce: false },
          { known: 'I mean', target: 'איך מיין' },
        ],
        build: [
          { known: 'to explain what I mean', target: 'דערקלערן וואָס איך מיין' },
          { known: 'to say what I mean', target: 'זאָגן וואָס איך מיין' },
          { known: 'I want to explain what I mean', target: 'איך וויל דערקלערן וואָס איך מיין' },
        ],
        use: [
          { known: "I'm going to try to explain what I mean", target: 'איך וועל פּרוּוון צו דערקלערן וואָס איך מיין', score: 8 },
          { known: 'I want to say what I mean in Yiddish', target: 'איך וויל זאָגן וואָס איך מיין אויף ייִדיש', score: 8 },
          { known: 'I want to explain what I mean with you', target: 'איך וויל דערקלערן וואָס איך מיין מיט דיר', score: 6 },
          { known: 'I want to say what I mean now', target: 'איך וויל איצט זאָגן וואָס איך מיין', score: 8 },
          { known: 'I want to learn how to say what I mean', target: 'איך וויל לערנען ווי אַזוי צו זאָגן וואָס איך מיין', score: 8 },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────── SEED 9
  {
    seed_number: 9,
    known_text: 'I speak a little Yiddish now.',
    target_text: 'איך רעד איצט אַ ביסל ייִדיש',
    note: 'איך רעד (finite, 1sg) overlaps the infinitive רעדן taught in seed 1 — the '
        + 'learner sees both forms of one lexeme and infers the inflection with '
        + 'nothing explained. Bare "now" debuts here as an A-LEGO, after the '
        + 'middle-field slot has been shown twice inside frames (seeds 1 and 7).',
    legos: [
      {
        idx: 1, type: 'M', known: 'I speak', target: 'איך רעד',
        components: [
          { known: 'I', target: 'איך', introduce: false },
          { known: 'speak', target: 'רעד' },
        ],
        build: [
          { known: 'I speak Yiddish', target: 'איך רעד ייִדיש' },
          { known: 'I speak with you', target: 'איך רעד מיט דיר' },
          { known: 'I speak Yiddish with you', target: 'איך רעד ייִדיש מיט דיר' },
        ],
        use: [
          { known: 'I speak Yiddish with someone else', target: 'איך רעד ייִדיש מיט עמעצן אַנדערש', score: 8 },
          { known: 'I speak Yiddish as often as possible', target: 'איך רעד ייִדיש וואָס עפֿטער', score: 8 },
          { known: 'I speak Yiddish with you as often as possible', target: 'איך רעד ייִדיש מיט דיר וואָס עפֿטער', score: 7 },
          { known: 'I speak Yiddish as hard as I can', target: 'איך רעד ייִדיש אַזוי שטאַרק ווי איך קען', score: 6 },
          { known: 'I speak with someone else as often as possible', target: 'איך רעד מיט עמעצן אַנדערש וואָס עפֿטער', score: 7 },
        ],
      },
      {
        idx: 2, type: 'A', known: 'now', target: 'איצט',
        build: [
          { known: 'I speak now', target: 'איך רעד איצט' },
          { known: 'I speak Yiddish now', target: 'איך רעד איצט ייִדיש' },
          { known: 'I want to try now', target: 'איך וויל איצט פּרוּוון' },
        ],
        use: [
          { known: 'I speak Yiddish with you now', target: 'איך רעד איצט ייִדיש מיט דיר', score: 8 },
          { known: 'I want to say something in Yiddish now', target: 'איך וויל איצט זאָגן עפּעס אויף ייִדיש', score: 8 },
          { known: 'I speak Yiddish with someone else now', target: 'איך רעד איצט ייִדיש מיט עמעצן אַנדערש', score: 7 },
          { known: 'I want to explain what I mean now', target: 'איך וויל איצט דערקלערן וואָס איך מיין', score: 8 },
          { known: 'I want to learn how to say something now', target: 'איך וויל איצט לערנען ווי אַזוי צו זאָגן עפּעס', score: 7 },
        ],
      },
      {
        idx: 3, type: 'M', known: 'a little', target: 'אַ ביסל',
        components: [
          { known: 'a', target: 'אַ', introduce: false },
          { known: 'little', target: 'ביסל', introduce: false },
        ],
        build: [
          { known: 'a little Yiddish', target: 'אַ ביסל ייִדיש' },
          { known: 'I speak a little Yiddish', target: 'איך רעד אַ ביסל ייִדיש' },
          { known: 'to speak a little Yiddish', target: 'רעדן אַ ביסל ייִדיש' },
        ],
        use: [
          { known: 'I speak a little Yiddish now', target: 'איך רעד איצט אַ ביסל ייִדיש', score: 8 },
          { known: 'I want to speak a little Yiddish with you', target: 'איך וויל רעדן אַ ביסל ייִדיש מיט דיר', score: 8 },
          { known: "I'm going to speak a little Yiddish with someone else", target: 'איך וועל רעדן אַ ביסל ייִדיש מיט עמעצן אַנדערש', score: 8 },
          { known: 'I speak a little Yiddish with you', target: 'איך רעד אַ ביסל ייִדיש מיט דיר', score: 8 },
          { known: 'I want to practise speaking a little Yiddish', target: 'איך וויל זיך געניטן אין רעדן אַ ביסל ייִדיש', score: 6 },
        ],
      },
    ],
  },

  // ───────────────────────────────────────────────────────── SEED 10
  {
    seed_number: 10,
    known_text: "I'm not sure if I can remember the whole sentence.",
    target_text: 'איך בין נישט זיכער צי איך קען געדענקען דעם גאַנצן זאַץ',
    note: 'דעם גאַנצן זאַץ bundles the accusative article and the declined adjective '
        + 'with the noun so the learner never computes case (calibrate principle 4). '
        + 'געדענקען is a SECOND Yiddish verb for English "remember" — seed 6 uses '
        + 'דערמאָנען זיך אין. The two knowns are kept distinct ("I\'m trying to '
        + 'remember" vs "if I can remember") so no bare "to remember" LEGO exists in '
        + 'either seed, but a speaker must rule on the split. Speaker question 1.',
    legos: [
      {
        idx: 1, type: 'M', known: "I'm not sure", target: 'איך בין נישט זיכער',
        components: [
          { known: 'I am', target: 'איך בין' },
          { known: 'not', target: 'נישט' },
          { known: 'sure', target: 'זיכער' },
        ],
        build: [
          { known: "I'm not sure now", target: 'איך בין נישט זיכער איצט' },
          { known: "I'm not sure today", target: 'איך בין נישט זיכער הײַנט' },
          { known: "I'm not sure I want to speak", target: 'איך בין נישט זיכער איך וויל רעדן' },
        ],
        use: [
          { known: "I'm not sure I speak Yiddish", target: 'איך בין נישט זיכער איך רעד ייִדיש', score: 6 },
          { known: "I'm not sure I want to try today", target: 'איך בין נישט זיכער איך וויל הײַנט פּרוּוון', score: 7 },
          { known: "I'm not sure I want to speak with someone else", target: 'איך בין נישט זיכער איך וויל רעדן מיט עמעצן אַנדערש', score: 7 },
          { known: "I'm not sure I speak a little Yiddish", target: 'איך בין נישט זיכער איך רעד אַ ביסל ייִדיש', score: 6 },
          { known: "I'm not sure I want to explain what I mean", target: 'איך בין נישט זיכער איך וויל דערקלערן וואָס איך מיין', score: 7 },
        ],
      },
      {
        idx: 2, type: 'M', known: 'if I can remember', target: 'צי איך קען געדענקען',
        components: [
          { known: 'if', target: 'צי' },
          { known: 'I can', target: 'איך קען' },
          { known: 'remember', target: 'געדענקען', introduce: false },
        ],
        build: [
          { known: "I'm not sure if I can remember", target: 'איך בין נישט זיכער צי איך קען געדענקען' },
          { known: 'if I can remember a word', target: 'צי איך קען געדענקען אַ וואָרט' },
          { known: 'if I can remember something', target: 'צי איך קען געדענקען עפּעס' },
        ],
        use: [
          { known: "I'm not sure if I can remember a word", target: 'איך בין נישט זיכער צי איך קען געדענקען אַ וואָרט', score: 8 },
          { known: "I'm not sure if I can remember something in Yiddish", target: 'איך בין נישט זיכער צי איך קען געדענקען עפּעס אויף ייִדיש', score: 7 },
          { known: "I'm not sure if I can remember a word in Yiddish", target: 'איך בין נישט זיכער צי איך קען געדענקען אַ וואָרט אויף ייִדיש', score: 8 },
          { known: "I'm not sure if I can remember what I mean", target: 'איך בין נישט זיכער צי איך קען געדענקען וואָס איך מיין', score: 6 },
          { known: "I'm not sure if I can remember something today", target: 'איך בין נישט זיכער צי איך קען געדענקען עפּעס הײַנט', score: 6 },
        ],
      },
      {
        idx: 3, type: 'M', known: 'the whole sentence', target: 'דעם גאַנצן זאַץ',
        components: [
          { known: 'the whole', target: 'דעם גאַנצן' },
          { known: 'sentence', target: 'זאַץ' },
        ],
        build: [
          { known: 'to say the whole sentence', target: 'זאָגן דעם גאַנצן זאַץ' },
          { known: 'to learn the whole sentence', target: 'לערנען דעם גאַנצן זאַץ' },
          { known: 'I want to say the whole sentence', target: 'איך וויל זאָגן דעם גאַנצן זאַץ' },
        ],
        use: [
          { known: "I'm not sure if I can remember the whole sentence", target: 'איך בין נישט זיכער צי איך קען געדענקען דעם גאַנצן זאַץ', score: 8 },
          { known: 'I want to say the whole sentence in Yiddish', target: 'איך וויל זאָגן דעם גאַנצן זאַץ אויף ייִדיש', score: 8 },
          { known: 'I want to explain the whole sentence', target: 'איך וויל דערקלערן דעם גאַנצן זאַץ', score: 7 },
          { known: 'I want to learn the whole sentence today', target: 'איך וויל הײַנט לערנען דעם גאַנצן זאַץ', score: 7 },
          { known: 'I want to say the whole sentence with you now', target: 'איך וויל איצט זאָגן דעם גאַנצן זאַץ מיט דיר', score: 7 },
        ],
      },
    ],
  },
];
