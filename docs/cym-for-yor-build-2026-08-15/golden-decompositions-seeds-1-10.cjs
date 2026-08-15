/**
 * cym_for_yor — Welsh for Yoruba speakers. Golden decompositions, seeds 1-10.
 *
 * KNOWN side = Yoruba (tonal; tone is lexical). TARGET side = North Welsh.
 *
 * Authored against the live seed corpus (668 rows, created 2026-04-27, untouched).
 * The 668 Yoruba known texts are the SAME translation corpus as yor_for_eng's
 * target side (654/668 byte-identical, 668/668 identical modulo the language
 * name). Yoruba chunk boundaries here deliberately mirror the yor_for_eng
 * golden calibration (commit 3c1efc6c) so one speaker review serves both courses.
 *
 * GATES:
 *   - The server gates (tiling, untaught-word, ZUT, BUILD recombination) all run
 *     on the WELSH side. The Yoruba known side is UNGATED by the server — see
 *     verify-known-side.cjs, which is our own tone-exact known-side tiler.
 *   - Every Yoruba string here is compared diacritic-exact. Nothing is deduped,
 *     merged or matched on a tone-stripped form.
 *
 * TONE-CRITICAL PAIR IN THIS RANGE:
 *   kọ́ (high tone, "learn")   → dysgu     — seed 2
 *   kọ  (mid tone,  "practise") → ymarfer  — seed 5
 *   These are different verbs. They are one combining mark apart and any
 *   normalisation stripping U+0300-U+036F merges them.
 */

module.exports = [

// ═══════════════════════════════════════════════════════════════════════
{
  seed_number: 1,
  known_text: 'Mo fẹ́ láti sọ èdè Welsh pẹ̀lú rẹ báyìí',
  target_text: 'Dw i isio siarad Cymraeg efo chdi rŵan.',
  english_pivot: 'I want to speak Welsh with you now',
  legos: [
    { idx: 1, type: 'M', known: 'Mo fẹ́', target: 'dw i isio',
      components: [ { known: 'mo', target: 'dw i', introduce: false }, { known: 'fẹ́', target: 'isio' } ],
      reasoning: 'North Welsh "dw i isio" is the released cym_n_for_eng mapping for "I want". The Yoruba subject pronoun is split out as a silent component so that "isio" is available as a chunk for fragment BUILD phrases.',
      build: [], use: [] },

    { idx: 2, type: 'M', known: 'láti sọ', target: 'siarad',
      components: [ { known: 'sọ', target: 'siarad' } ],
      reasoning: 'The Yoruba infinitive marker láti is enclosed with the verb, and the bare verb is exposed as a component so the Yoruba PROMPT side can also tile (Yoruba drops láti after lè, máa etc.). sọ is glossed to siarad, never to deud — see the ZUT note at seed 4.',
      build: [ { known: 'fẹ́ láti sọ', target: 'isio siarad' } ],
      use: [ { known: 'Mo fẹ́ láti sọ', target: 'dw i isio siarad', score: 7 } ] },

    { idx: 3, type: 'A', known: 'èdè Welsh', target: 'Cymraeg',
      reasoning: 'The Yoruba corpus names the language "èdè Welsh" (èdè = language) throughout. Unmutated Cymraeg; the mutated Gymraeg is taught separately inside "yn Gymraeg" at seed 4.',
      build: [ { known: 'láti sọ èdè Welsh', target: 'siarad Cymraeg' } ],
      use: [ { known: 'Mo fẹ́ láti sọ èdè Welsh', target: 'dw i isio siarad Cymraeg', score: 8 } ] },

    { idx: 4, type: 'M', known: 'pẹ̀lú rẹ', target: 'efo chdi',
      components: [ { known: 'pẹ̀lú', target: 'efo' }, { known: 'rẹ', target: 'chdi' } ],
      reasoning: 'efo/chdi are the North Welsh forms (South: gyda/ti). Yoruba rẹ is the post-prepositional 2sg; enclosing it with the preposition fixes the form.',
      build: [ { known: 'láti sọ pẹ̀lú rẹ', target: 'siarad efo chdi' } ],
      use: [ { known: 'Mo fẹ́ láti sọ èdè Welsh pẹ̀lú rẹ', target: 'dw i isio siarad Cymraeg efo chdi', score: 8 } ] },

    { idx: 5, type: 'A', known: 'báyìí', target: 'rŵan',
      reasoning: 'North Welsh rŵan (South: nawr). Unambiguous time adverb on both sides.',
      build: [ { known: 'láti sọ báyìí', target: 'siarad rŵan' } ],
      use: [ { known: 'Mo fẹ́ láti sọ èdè Welsh pẹ̀lú rẹ báyìí', target: 'dw i isio siarad Cymraeg efo chdi rŵan', score: 9 } ] },
  ],
},

// ═══════════════════════════════════════════════════════════════════════
{
  seed_number: 2,
  known_text: 'Mo ń gbìyànjú láti kọ́',
  target_text: "Dw i'n trio dysgu.",
  english_pivot: "I'm trying to learn",
  legos: [
    { idx: 1, type: 'M', known: 'Mo ń gbìyànjú', target: "dw i'n trio",
      components: [ { known: 'mo ń', target: "dw i'n", introduce: false }, { known: 'gbìyànjú', target: 'trio' } ],
      reasoning: 'Yoruba progressive ń carries no standalone meaning; absorbed into the person+aspect chunk, mirroring Welsh "dw i\'n". The bare verb component gbìyànjú→trio is the unmutated citation form; the mutated drio is taught whole at seed 8.',
      build: [ { known: 'Mo ń gbìyànjú láti sọ', target: "dw i'n trio siarad" } ],
      use: [ { known: 'Mo ń gbìyànjú láti sọ èdè Welsh pẹ̀lú rẹ', target: "dw i'n trio siarad Cymraeg efo chdi", score: 8 } ] },

    { idx: 2, type: 'M', known: 'láti kọ́', target: 'dysgu',
      components: [ { known: 'kọ́', target: 'dysgu' } ],
      reasoning: 'TONE-CRITICAL. kọ́ (high tone) = learn. It is a minimal pair with kọ (mid tone) = practise, taught at seed 5 as ymarfer. They are different verbs and must never be merged by any diacritic-stripping comparison.',
      build: [ { known: 'Mo ń gbìyànjú láti kọ́', target: "dw i'n trio dysgu" } ],
      use: [ { known: 'Mo fẹ́ láti kọ́ èdè Welsh pẹ̀lú rẹ', target: 'dw i isio dysgu Cymraeg efo chdi', score: 8 } ] },
  ],
},

// ═══════════════════════════════════════════════════════════════════════
{
  seed_number: 3,
  known_text: 'bí mo ṣe máa sọ lóòrèkóòrè tó bá ṣeé ṣe',
  target_text: 'sut i siarad mor aml â phosib',
  english_pivot: 'how to speak as often as possible',
  legos: [
    { idx: 1, type: 'M', known: 'bí mo ṣe máa sọ', target: 'sut i siarad',
      components: [ { known: 'bí', target: 'sut' }, { known: 'mo ṣe máa', target: 'i', introduce: false } ],
      reasoning: 'Yoruba has no bare infinitive after "how": the bí…ṣe frame requires an overt subject, so the whole frame maps onto Welsh "sut i". NOTE the Yoruba embeds a 1sg subject (mo), i.e. literally "how I speak" — speaker question 5.',
      build: [ { known: 'bí mo ṣe máa sọ èdè Welsh', target: 'sut i siarad Cymraeg' } ],
      use: [ { known: 'Mo ń gbìyànjú láti kọ́ bí mo ṣe máa sọ èdè Welsh', target: "dw i'n trio dysgu sut i siarad Cymraeg", score: 8 } ] },

    { idx: 2, type: 'M', known: 'lóòrèkóòrè tó bá ṣeé ṣe', target: 'mor aml â phosib',
      components: [ { known: 'lóòrèkóòrè', target: 'mor aml' }, { known: 'tó bá ṣeé ṣe', target: 'â phosib' } ],
      reasoning: 'Welsh builds this as mor + ADJ + â phosib. Taught whole so the discontinuous frame is never assembled wrongly, with the two halves exposed as components so "mor galed â phosib" (seed 7) is recognisable.',
      build: [ { known: 'bí mo ṣe máa sọ lóòrèkóòrè tó bá ṣeé ṣe', target: 'sut i siarad mor aml â phosib' } ],
      use: [ { known: 'Mo fẹ́ láti sọ èdè Welsh lóòrèkóòrè tó bá ṣeé ṣe', target: 'dw i isio siarad Cymraeg mor aml â phosib', score: 8 } ] },
  ],
},

// ═══════════════════════════════════════════════════════════════════════
{
  seed_number: 4,
  known_text: 'bí mo ṣe máa sọ nǹkan ní èdè Welsh',
  target_text: 'sut i ddeud rhywbeth yn Gymraeg',
  english_pivot: 'how to say something in Welsh',
  lego_order_note: '"something" is introduced before "how to say something" so the larger chunk lands on a piece the learner already holds (non-greedy introduction).',
  zut_note: 'Yoruba sọ covers BOTH speak and say; Welsh splits them (siarad / deud). The two are kept ZUT-clean by never teaching a bare sọ→deud mapping: "say something" is only ever reachable through the whole chunk sọ nǹkan → ddeud rhywbeth. See speaker question 1.',
  legos: [
    { idx: 1, type: 'A', known: 'nǹkan', target: 'rhywbeth',
      reasoning: 'Indefinite pronoun, unambiguous on both sides.',
      build: [
        { known: 'Mo fẹ́ nǹkan', target: 'dw i isio rhywbeth' },
        { known: 'nǹkan báyìí', target: 'rhywbeth rŵan' },
        { known: 'Mo ń gbìyànjú láti kọ́ nǹkan', target: "dw i'n trio dysgu rhywbeth" },
      ],
      use: [
        { known: 'Mo fẹ́ nǹkan báyìí', target: 'dw i isio rhywbeth rŵan', score: 8 },
        { known: 'Mo ń gbìyànjú láti kọ́ nǹkan báyìí', target: "dw i'n trio dysgu rhywbeth rŵan", score: 8 },
        { known: 'Mo fẹ́ láti kọ́ nǹkan pẹ̀lú rẹ', target: 'dw i isio dysgu rhywbeth efo chdi', score: 8 },
        { known: 'Mo ń gbìyànjú láti kọ́ nǹkan lóòrèkóòrè tó bá ṣeé ṣe', target: "dw i'n trio dysgu rhywbeth mor aml â phosib", score: 7 },
        { known: 'Mo fẹ́ láti kọ́ nǹkan pẹ̀lú rẹ báyìí', target: 'dw i isio dysgu rhywbeth efo chdi rŵan', score: 8 },
      ] },

    { idx: 2, type: 'M', known: 'bí mo ṣe máa sọ nǹkan', target: 'sut i ddeud rhywbeth',
      components: [ { known: 'bí', target: 'sut' }, { known: 'nǹkan', target: 'rhywbeth' } ],
      reasoning: 'Taught whole. ddeud is the soft-mutated form of deud after "i"; the mutation stays inside the chunk rather than being atomised, so the learner never has to choose a mutation.',
      build: [
        { known: 'bí mo ṣe máa sọ nǹkan báyìí', target: 'sut i ddeud rhywbeth rŵan' },
        { known: 'láti kọ́ bí mo ṣe máa sọ nǹkan', target: 'dysgu sut i ddeud rhywbeth' },
        { known: 'bí mo ṣe máa sọ nǹkan pẹ̀lú rẹ', target: 'sut i ddeud rhywbeth efo chdi' },
      ],
      use: [
        { known: 'Mo fẹ́ láti kọ́ bí mo ṣe máa sọ nǹkan', target: 'dw i isio dysgu sut i ddeud rhywbeth', score: 8 },
        { known: 'Mo ń gbìyànjú láti kọ́ bí mo ṣe máa sọ nǹkan báyìí', target: "dw i'n trio dysgu sut i ddeud rhywbeth rŵan", score: 8 },
        { known: 'Mo fẹ́ láti kọ́ bí mo ṣe máa sọ nǹkan pẹ̀lú rẹ', target: 'dw i isio dysgu sut i ddeud rhywbeth efo chdi', score: 8 },
        { known: 'Mo ń gbìyànjú láti kọ́ bí mo ṣe máa sọ nǹkan lóòrèkóòrè tó bá ṣeé ṣe', target: "dw i'n trio dysgu sut i ddeud rhywbeth mor aml â phosib", score: 7 },
        { known: 'Mo fẹ́ láti sọ èdè Welsh pẹ̀lú rẹ, bí mo ṣe máa sọ nǹkan', target: 'dw i isio siarad Cymraeg efo chdi, sut i ddeud rhywbeth', score: 6 },
      ] },

    { idx: 3, type: 'M', known: 'ní èdè Welsh', target: 'yn Gymraeg',
      components: [ { known: 'ní', target: 'yn', introduce: false } ],
      reasoning: 'Gymraeg is the mutated form of Cymraeg after yn. It is deliberately NOT given its own component gloss — that would collide with èdè Welsh→Cymraeg (seed 1) and would ask the learner to choose a mutation. The whole chunk carries it silently.',
      build: [
        { known: 'bí mo ṣe máa sọ nǹkan ní èdè Welsh', target: 'sut i ddeud rhywbeth yn Gymraeg' },
        { known: 'láti kọ́ ní èdè Welsh', target: 'dysgu yn Gymraeg' },
        { known: 'ní èdè Welsh báyìí', target: 'yn Gymraeg rŵan' },
      ],
      use: [
        { known: 'Mo fẹ́ láti kọ́ bí mo ṣe máa sọ nǹkan ní èdè Welsh', target: 'dw i isio dysgu sut i ddeud rhywbeth yn Gymraeg', score: 9 },
        { known: 'Mo ń gbìyànjú láti kọ́ nǹkan ní èdè Welsh', target: "dw i'n trio dysgu rhywbeth yn Gymraeg", score: 8 },
        { known: 'Mo fẹ́ láti kọ́ ní èdè Welsh pẹ̀lú rẹ', target: 'dw i isio dysgu yn Gymraeg efo chdi', score: 8 },
        { known: 'Mo ń gbìyànjú láti kọ́ bí mo ṣe máa sọ nǹkan ní èdè Welsh báyìí', target: "dw i'n trio dysgu sut i ddeud rhywbeth yn Gymraeg rŵan", score: 8 },
        { known: 'Mo fẹ́ láti kọ́ ní èdè Welsh lóòrèkóòrè tó bá ṣeé ṣe', target: 'dw i isio dysgu yn Gymraeg mor aml â phosib', score: 8 },
      ] },
  ],
},

// ═══════════════════════════════════════════════════════════════════════
{
  seed_number: 5,
  known_text: 'Mo máa kọ sísọ pẹ̀lú ẹlòmíràn',
  target_text: "Dw i'n mynd i ymarfer siarad efo rhywun arall.",
  english_pivot: "I'm going to practise speaking with someone else",
  legos: [
    { idx: 1, type: 'A', known: 'sísọ', target: 'siarad',
      reasoning: 'Yoruba nominalised sísọ ("speaking") converges on the same Welsh word as láti sọ ("to speak"). Convergence — many knowns onto one target — is allowed and teaches the unification cheaply.',
      build: [
        { known: 'sísọ èdè Welsh', target: 'siarad Cymraeg' },
        { known: 'sísọ pẹ̀lú rẹ', target: 'siarad efo chdi' },
        { known: 'sísọ lóòrèkóòrè tó bá ṣeé ṣe', target: 'siarad mor aml â phosib' },
      ],
      use: [
        { known: 'Mo fẹ́ sísọ èdè Welsh pẹ̀lú rẹ', target: 'dw i isio siarad Cymraeg efo chdi', score: 7 },
        { known: 'Mo ń gbìyànjú láti kọ́ sísọ èdè Welsh', target: "dw i'n trio dysgu siarad Cymraeg", score: 7 },
        { known: 'Mo fẹ́ sísọ èdè Welsh lóòrèkóòrè tó bá ṣeé ṣe', target: 'dw i isio siarad Cymraeg mor aml â phosib', score: 8 },
        { known: 'Mo fẹ́ sísọ èdè Welsh pẹ̀lú rẹ báyìí', target: 'dw i isio siarad Cymraeg efo chdi rŵan', score: 8 },
        { known: 'Mo ń gbìyànjú sísọ pẹ̀lú rẹ báyìí', target: "dw i'n trio siarad efo chdi rŵan", score: 8 },
      ] },

    { idx: 2, type: 'M', known: 'Mo máa kọ', target: "dw i'n mynd i ymarfer",
      components: [ { known: 'kọ', target: 'ymarfer' } ],
      reasoning: 'TONE-CRITICAL. kọ (mid tone) = practise, a minimal pair with kọ́ (high tone) = learn from seed 2. Taught whole with the future/intentive máa so the Welsh periphrastic "dw i\'n mynd i" is never assembled from parts.',
      build: [
        { known: 'Mo máa kọ sísọ', target: "dw i'n mynd i ymarfer siarad" },
        { known: 'Mo máa kọ báyìí', target: "dw i'n mynd i ymarfer rŵan" },
        { known: 'Mo máa kọ pẹ̀lú rẹ', target: "dw i'n mynd i ymarfer efo chdi" },
      ],
      use: [
        { known: 'Mo máa kọ sísọ èdè Welsh', target: "dw i'n mynd i ymarfer siarad Cymraeg", score: 9 },
        { known: 'Mo máa kọ sísọ pẹ̀lú rẹ báyìí', target: "dw i'n mynd i ymarfer siarad efo chdi rŵan", score: 9 },
        { known: 'Mo máa kọ sísọ èdè Welsh lóòrèkóòrè tó bá ṣeé ṣe', target: "dw i'n mynd i ymarfer siarad Cymraeg mor aml â phosib", score: 8 },
        { known: 'Mo máa kọ bí mo ṣe máa sọ nǹkan ní èdè Welsh', target: "dw i'n mynd i ymarfer sut i ddeud rhywbeth yn Gymraeg", score: 7 },
        { known: 'Mo máa kọ sísọ èdè Welsh pẹ̀lú rẹ', target: "dw i'n mynd i ymarfer siarad Cymraeg efo chdi", score: 9 },
      ] },

    { idx: 3, type: 'M', known: 'pẹ̀lú ẹlòmíràn', target: 'efo rhywun arall',
      components: [ { known: 'ẹlòmíràn', target: 'rhywun arall' } ],
      reasoning: 'pẹ̀lú→efo is already established at seed 1; only ẹlòmíràn is new, so it is the sole introduced component.',
      build: [
        { known: 'sísọ pẹ̀lú ẹlòmíràn', target: 'siarad efo rhywun arall' },
        { known: 'Mo máa kọ pẹ̀lú ẹlòmíràn', target: "dw i'n mynd i ymarfer efo rhywun arall" },
        { known: 'pẹ̀lú ẹlòmíràn báyìí', target: 'efo rhywun arall rŵan' },
      ],
      use: [
        { known: 'Mo máa kọ sísọ pẹ̀lú ẹlòmíràn', target: "dw i'n mynd i ymarfer siarad efo rhywun arall", score: 9 },
        { known: 'Mo fẹ́ láti sọ èdè Welsh pẹ̀lú ẹlòmíràn', target: 'dw i isio siarad Cymraeg efo rhywun arall', score: 9 },
        { known: 'Mo ń gbìyànjú láti sọ èdè Welsh pẹ̀lú ẹlòmíràn báyìí', target: "dw i'n trio siarad Cymraeg efo rhywun arall rŵan", score: 8 },
        { known: 'Mo fẹ́ láti kọ́ nǹkan pẹ̀lú ẹlòmíràn', target: 'dw i isio dysgu rhywbeth efo rhywun arall', score: 8 },
        { known: 'Mo máa kọ sísọ pẹ̀lú ẹlòmíràn lóòrèkóòrè tó bá ṣeé ṣe', target: "dw i'n mynd i ymarfer siarad efo rhywun arall mor aml â phosib", score: 7 },
      ] },
  ],
},

// ═══════════════════════════════════════════════════════════════════════
{
  seed_number: 6,
  known_text: 'Mo ń gbìyànjú láti rántí ọ̀rọ̀ kan',
  target_text: "Dw i'n trio cofio gair.",
  english_pivot: "I'm trying to remember a word",
  legos: [
    { idx: 1, type: 'M', known: 'láti rántí', target: 'cofio',
      components: [ { known: 'rántí', target: 'cofio' } ],
      reasoning: 'láti enclosed with the verb, with the bare verb exposed as a component for known-side tiling, matching the seed-1 treatment. Unmutated cofio; the mutated gofio appears only inside the whole chunk at seed 10.',
      build: [
        { known: 'Mo ń gbìyànjú láti rántí', target: "dw i'n trio cofio" },
        { known: 'láti rántí nǹkan', target: 'cofio rhywbeth' },
        { known: 'Mo fẹ́ láti rántí báyìí', target: 'dw i isio cofio rŵan' },
      ],
      use: [
        { known: 'Mo ń gbìyànjú láti rántí nǹkan báyìí', target: "dw i'n trio cofio rhywbeth rŵan", score: 8 },
        { known: 'Mo fẹ́ láti rántí bí mo ṣe máa sọ nǹkan ní èdè Welsh', target: 'dw i isio cofio sut i ddeud rhywbeth yn Gymraeg', score: 9 },
        { known: 'Mo máa kọ láti rántí lóòrèkóòrè tó bá ṣeé ṣe', target: "dw i'n mynd i ymarfer cofio mor aml â phosib", score: 7 },
        { known: 'Mo ń gbìyànjú láti rántí nǹkan pẹ̀lú rẹ', target: "dw i'n trio cofio rhywbeth efo chdi", score: 7 },
        { known: 'Mo fẹ́ láti rántí bí mo ṣe máa sọ èdè Welsh', target: 'dw i isio cofio sut i siarad Cymraeg', score: 9 },
      ] },

    { idx: 2, type: 'A', known: 'ọ̀rọ̀ kan', target: 'gair',
      reasoning: 'Yoruba kan ("a/one") has no Welsh counterpart here — Welsh has no indefinite article — so the pair is taught as a whole chunk rather than mapped word-for-word.',
      build: [
        { known: 'Mo ń gbìyànjú láti rántí ọ̀rọ̀ kan', target: "dw i'n trio cofio gair" },
        { known: 'láti rántí ọ̀rọ̀ kan báyìí', target: 'cofio gair rŵan' },
        { known: 'Mo fẹ́ láti kọ́ ọ̀rọ̀ kan', target: 'dw i isio dysgu gair' },
      ],
      use: [
        { known: 'Mo ń gbìyànjú láti rántí ọ̀rọ̀ kan báyìí', target: "dw i'n trio cofio gair rŵan", score: 8 },
        { known: 'Mo fẹ́ láti kọ́ ọ̀rọ̀ kan ní èdè Welsh', target: 'dw i isio dysgu gair yn Gymraeg', score: 9 },
        { known: 'Mo máa kọ ọ̀rọ̀ kan pẹ̀lú ẹlòmíràn', target: "dw i'n mynd i ymarfer gair efo rhywun arall", score: 7 },
        { known: 'Mo ń gbìyànjú láti rántí ọ̀rọ̀ kan pẹ̀lú rẹ báyìí', target: "dw i'n trio cofio gair efo chdi rŵan", score: 7 },
        { known: 'Mo fẹ́ láti kọ́ ọ̀rọ̀ kan lóòrèkóòrè tó bá ṣeé ṣe', target: 'dw i isio dysgu gair mor aml â phosib', score: 6 },
      ] },
  ],
},

// ═══════════════════════════════════════════════════════════════════════
{
  seed_number: 7,
  known_text: 'Mo fẹ́ láti gbìyànjú gidigidi bí mo ṣe lè lónìí',
  target_text: 'Dw i isio trio mor galed â phosib heddiw.',
  english_pivot: 'I want to try as hard as I can today',
  lego_order_note: 'L1 "láti gbìyànjú" → trio exists for a KNOWN-SIDE reason, not a target-side one: Welsh trio was already available as a component from seed 2, but Yoruba "láti gbìyànjú" was not, so without it this seed could not be reconstructed from its own decomposition on the Yoruba side. Reconstructability holds in both languages (Principle 1). Our known-side tiler caught this; no server gate can.',
  legos: [
    { idx: 1, type: 'M', known: 'láti gbìyànjú', target: 'trio',
      components: [ { known: 'gbìyànjú', target: 'trio' } ],
      reasoning: 'Convergence: "Mo ń gbìyànjú" (seed 2) and "láti gbìyànjú" both reach Welsh trio. Many knowns onto one target is allowed and teaches the unification for free.',
      build: [
        { known: 'Mo fẹ́ láti gbìyànjú báyìí', target: 'dw i isio trio rŵan' },
        { known: 'Mo fẹ́ láti gbìyànjú pẹ̀lú rẹ', target: 'dw i isio trio efo chdi' },
        { known: 'Mo máa kọ láti gbìyànjú', target: "dw i'n mynd i ymarfer trio" },
      ],
      use: [
        { known: 'Mo fẹ́ láti gbìyànjú pẹ̀lú ẹlòmíràn báyìí', target: 'dw i isio trio efo rhywun arall rŵan', score: 8 },
        { known: 'Mo fẹ́ láti gbìyànjú lóòrèkóòrè tó bá ṣeé ṣe', target: 'dw i isio trio mor aml â phosib', score: 9 },
        { known: 'Mo fẹ́ láti gbìyànjú láti sọ èdè Welsh', target: 'dw i isio trio siarad Cymraeg', score: 8 },
        { known: 'Mo fẹ́ láti gbìyànjú láti rántí ọ̀rọ̀ kan', target: 'dw i isio trio cofio gair', score: 8 },
        { known: 'Mo fẹ́ láti gbìyànjú láti kọ́ nǹkan ní èdè Welsh', target: 'dw i isio trio dysgu rhywbeth yn Gymraeg', score: 8 },
      ] },

    { idx: 2, type: 'M', known: 'gidigidi bí mo ṣe lè', target: 'mor galed â phosib',
      components: [ { known: 'gidigidi', target: 'mor galed' }, { known: 'bí mo ṣe lè', target: 'â phosib' } ],
      reasoning: 'Second rung of the mor…â phosib ladder begun at seed 3. The learner has already met "mor aml â phosib"; seeing "mor galed â phosib" with only the adjective changed is what makes the frame visible without it being explained.',
      build: [
        { known: 'Mo fẹ́ láti gbìyànjú gidigidi bí mo ṣe lè', target: 'dw i isio trio mor galed â phosib' },
        { known: 'láti sọ gidigidi bí mo ṣe lè', target: 'siarad mor galed â phosib' },
        { known: 'Mo máa kọ gidigidi bí mo ṣe lè', target: "dw i'n mynd i ymarfer mor galed â phosib" },
      ],
      use: [
        { known: 'Mo fẹ́ láti kọ́ gidigidi bí mo ṣe lè', target: 'dw i isio dysgu mor galed â phosib', score: 8 },
        { known: 'Mo ń gbìyànjú láti kọ́ gidigidi bí mo ṣe lè', target: "dw i'n trio dysgu mor galed â phosib", score: 8 },
        { known: 'Mo máa kọ sísọ gidigidi bí mo ṣe lè', target: "dw i'n mynd i ymarfer siarad mor galed â phosib", score: 8 },
        { known: 'Mo fẹ́ láti rántí ọ̀rọ̀ kan gidigidi bí mo ṣe lè', target: 'dw i isio cofio gair mor galed â phosib', score: 6 },
        { known: 'Mo máa kọ sísọ èdè Welsh gidigidi bí mo ṣe lè', target: "dw i'n mynd i ymarfer siarad Cymraeg mor galed â phosib", score: 8 },
      ] },

    { idx: 3, type: 'A', known: 'lónìí', target: 'heddiw',
      reasoning: 'Time adverb, unambiguous on both sides, and it recombines with everything taught so far.',
      build: [
        { known: 'Mo fẹ́ láti sọ èdè Welsh lónìí', target: 'dw i isio siarad Cymraeg heddiw' },
        { known: 'láti kọ́ nǹkan lónìí', target: 'dysgu rhywbeth heddiw' },
        { known: 'Mo máa kọ lónìí', target: "dw i'n mynd i ymarfer heddiw" },
      ],
      use: [
        { known: 'Mo fẹ́ láti sọ èdè Welsh pẹ̀lú rẹ lónìí', target: 'dw i isio siarad Cymraeg efo chdi heddiw', score: 9 },
        { known: 'Mo máa kọ sísọ pẹ̀lú ẹlòmíràn lónìí', target: "dw i'n mynd i ymarfer siarad efo rhywun arall heddiw", score: 9 },
        { known: 'Mo ń gbìyànjú láti rántí ọ̀rọ̀ kan lónìí', target: "dw i'n trio cofio gair heddiw", score: 8 },
        { known: 'Mo fẹ́ láti kọ́ bí mo ṣe máa sọ nǹkan ní èdè Welsh lónìí', target: 'dw i isio dysgu sut i ddeud rhywbeth yn Gymraeg heddiw', score: 9 },
        { known: 'Mo fẹ́ láti gbìyànjú gidigidi bí mo ṣe lè lónìí', target: 'dw i isio trio mor galed â phosib heddiw', score: 9 },
      ] },
  ],
},

// ═══════════════════════════════════════════════════════════════════════
{
  seed_number: 8,
  known_text: 'Mo máa gbìyànjú láti ṣàlàyé ohun tí mo túmọ̀ sí',
  target_text: "Dw i'n mynd i drio esbonio be dw i'n feddwl.",
  english_pivot: "I'm going to try to explain what I mean",
  legos: [
    { idx: 1, type: 'M', known: 'Mo máa gbìyànjú', target: "dw i'n mynd i drio",
      components: [ { known: 'Mo máa', target: "dw i'n mynd i" } ],
      reasoning: 'drio is the soft-mutated trio after "i". The mutation is kept INSIDE the chunk: minting a component gbìyànjú→drio would collide with gbìyànjú→trio from seed 2 and would make the learner choose a mutation, which the method never asks.',
      build: [
        { known: 'Mo máa gbìyànjú láti sọ', target: "dw i'n mynd i drio siarad" },
        { known: 'Mo máa gbìyànjú báyìí', target: "dw i'n mynd i drio rŵan" },
        { known: 'Mo máa gbìyànjú láti rántí ọ̀rọ̀ kan', target: "dw i'n mynd i drio cofio gair" },
      ],
      use: [
        { known: 'Mo máa gbìyànjú láti sọ èdè Welsh pẹ̀lú rẹ', target: "dw i'n mynd i drio siarad Cymraeg efo chdi", score: 9 },
        { known: 'Mo máa gbìyànjú láti rántí ọ̀rọ̀ kan lónìí', target: "dw i'n mynd i drio cofio gair heddiw", score: 9 },
        { known: 'Mo máa gbìyànjú gidigidi bí mo ṣe lè lónìí', target: "dw i'n mynd i drio mor galed â phosib heddiw", score: 8 },
        { known: 'Mo máa gbìyànjú láti sọ èdè Welsh pẹ̀lú ẹlòmíràn', target: "dw i'n mynd i drio siarad Cymraeg efo rhywun arall", score: 9 },
        { known: 'Mo máa gbìyànjú láti kọ́ nǹkan ní èdè Welsh lónìí', target: "dw i'n mynd i drio dysgu rhywbeth yn Gymraeg heddiw", score: 8 },
      ] },

    { idx: 2, type: 'M', known: 'láti ṣàlàyé', target: 'esbonio',
      components: [ { known: 'ṣàlàyé', target: 'esbonio' } ],
      reasoning: 'láti enclosed, with the bare verb exposed as a component for known-side tiling, consistent with seeds 1, 2 and 6.',
      build: [
        { known: 'Mo máa gbìyànjú láti ṣàlàyé', target: "dw i'n mynd i drio esbonio" },
        { known: 'láti ṣàlàyé nǹkan', target: 'esbonio rhywbeth' },
        { known: 'Mo fẹ́ láti ṣàlàyé báyìí', target: 'dw i isio esbonio rŵan' },
      ],
      use: [
        { known: 'Mo fẹ́ láti ṣàlàyé nǹkan ní èdè Welsh', target: 'dw i isio esbonio rhywbeth yn Gymraeg', score: 9 },
        { known: 'Mo ń gbìyànjú láti ṣàlàyé ọ̀rọ̀ kan lónìí', target: "dw i'n trio esbonio gair heddiw", score: 8 },
        { known: 'Mo máa gbìyànjú láti ṣàlàyé nǹkan pẹ̀lú rẹ', target: "dw i'n mynd i drio esbonio rhywbeth efo chdi", score: 8 },
        { known: 'Mo fẹ́ láti ṣàlàyé gidigidi bí mo ṣe lè', target: 'dw i isio esbonio mor galed â phosib', score: 6 },
        { known: 'Mo máa kọ láti ṣàlàyé pẹ̀lú ẹlòmíràn', target: "dw i'n mynd i ymarfer esbonio efo rhywun arall", score: 8 },
      ] },

    { idx: 3, type: 'M', known: 'ohun tí mo túmọ̀ sí', target: "be dw i'n feddwl",
      components: [ { known: 'ohun tí', target: 'be' }, { known: 'mo túmọ̀ sí', target: "dw i'n feddwl" } ],
      reasoning: 'Welsh "be" heads the free relative; feddwl is the mutated meddwl inside the fixed frame, so it is never presented as a choosable form.',
      build: [
        { known: 'láti ṣàlàyé ohun tí mo túmọ̀ sí', target: "esbonio be dw i'n feddwl" },
        { known: 'láti rántí ohun tí mo túmọ̀ sí', target: "cofio be dw i'n feddwl" },
        { known: 'ohun tí mo túmọ̀ sí báyìí', target: "be dw i'n feddwl rŵan" },
      ],
      use: [
        { known: 'Mo máa gbìyànjú láti ṣàlàyé ohun tí mo túmọ̀ sí', target: "dw i'n mynd i drio esbonio be dw i'n feddwl", score: 9 },
        { known: 'Mo fẹ́ láti ṣàlàyé ohun tí mo túmọ̀ sí ní èdè Welsh', target: "dw i isio esbonio be dw i'n feddwl yn Gymraeg", score: 9 },
        { known: 'Mo ń gbìyànjú láti ṣàlàyé ohun tí mo túmọ̀ sí pẹ̀lú rẹ', target: "dw i'n trio esbonio be dw i'n feddwl efo chdi", score: 8 },
        { known: 'Mo fẹ́ láti rántí ohun tí mo túmọ̀ sí lónìí', target: "dw i isio cofio be dw i'n feddwl heddiw", score: 8 },
        { known: 'Mo máa gbìyànjú láti ṣàlàyé ohun tí mo túmọ̀ sí pẹ̀lú ẹlòmíràn', target: "dw i'n mynd i drio esbonio be dw i'n feddwl efo rhywun arall", score: 8 },
      ] },
  ],
},

// ═══════════════════════════════════════════════════════════════════════
{
  seed_number: 9,
  known_text: 'Mo sọ èdè Welsh díẹ̀ báyìí',
  target_text: "Dw i'n siarad chydig o Gymraeg rŵan.",
  english_pivot: 'I speak a little Welsh now',
  legos: [
    { idx: 1, type: 'M', known: 'Mo sọ', target: "dw i'n siarad",
      components: [ { known: 'sọ', target: 'siarad' } ],
      reasoning: 'This is the one place bare sọ is glossed, and it is glossed to siarad — NOT deud — so the mapping stays deterministic course-wide. "Say something" remains reachable only through the whole chunk sọ nǹkan → ddeud rhywbeth (seed 4). Flagged for a speaker: question 1.',
      build: [
        { known: 'Mo sọ èdè Welsh', target: "dw i'n siarad Cymraeg" },
        { known: 'Mo sọ pẹ̀lú rẹ báyìí', target: "dw i'n siarad efo chdi rŵan" },
        { known: 'Mo sọ pẹ̀lú ẹlòmíràn', target: "dw i'n siarad efo rhywun arall" },
      ],
      use: [
        { known: 'Mo sọ èdè Welsh pẹ̀lú rẹ báyìí', target: "dw i'n siarad Cymraeg efo chdi rŵan", score: 9 },
        { known: 'Mo sọ èdè Welsh pẹ̀lú ẹlòmíràn lónìí', target: "dw i'n siarad Cymraeg efo rhywun arall heddiw", score: 9 },
        { known: 'Mo sọ èdè Welsh lóòrèkóòrè tó bá ṣeé ṣe', target: "dw i'n siarad Cymraeg mor aml â phosib", score: 9 },
        { known: 'Mo sọ èdè Welsh pẹ̀lú rẹ lóòrèkóòrè tó bá ṣeé ṣe', target: "dw i'n siarad Cymraeg efo chdi mor aml â phosib", score: 8 },
        { known: 'Mo sọ èdè Welsh pẹ̀lú ẹlòmíràn lóòrèkóòrè tó bá ṣeé ṣe', target: "dw i'n siarad Cymraeg efo rhywun arall mor aml â phosib", score: 8 },
      ] },

    { idx: 2, type: 'M', known: 'èdè Welsh díẹ̀', target: 'chydig o Gymraeg',
      components: [ { known: 'díẹ̀', target: 'chydig o' } ],
      reasoning: 'Taught as a whole chunk because Welsh puts the quantifier BEFORE the noun and mutates it (chydig o Gymraeg) while Yoruba postposes díẹ̀. Assembling it from parts would produce the wrong order and the wrong mutation.',
      build: [
        { known: 'Mo sọ èdè Welsh díẹ̀', target: "dw i'n siarad chydig o Gymraeg" },
        { known: 'láti kọ́ èdè Welsh díẹ̀', target: 'dysgu chydig o Gymraeg' },
        { known: 'èdè Welsh díẹ̀ báyìí', target: 'chydig o Gymraeg rŵan' },
      ],
      use: [
        { known: 'Mo sọ èdè Welsh díẹ̀ báyìí', target: "dw i'n siarad chydig o Gymraeg rŵan", score: 9 },
        { known: 'Mo fẹ́ láti kọ́ èdè Welsh díẹ̀ lónìí', target: 'dw i isio dysgu chydig o Gymraeg heddiw', score: 9 },
        { known: 'Mo máa kọ èdè Welsh díẹ̀ pẹ̀lú ẹlòmíràn', target: "dw i'n mynd i ymarfer chydig o Gymraeg efo rhywun arall", score: 8 },
        { known: 'Mo ń gbìyànjú láti sọ èdè Welsh díẹ̀ pẹ̀lú rẹ', target: "dw i'n trio siarad chydig o Gymraeg efo chdi", score: 9 },
        { known: 'Mo sọ èdè Welsh díẹ̀ lóòrèkóòrè tó bá ṣeé ṣe', target: "dw i'n siarad chydig o Gymraeg mor aml â phosib", score: 8 },
      ] },
  ],
},

// ═══════════════════════════════════════════════════════════════════════
{
  seed_number: 10,
  known_text: 'Mi ò rò pé mo lè rántí gbogbo gbólóhùn náà',
  target_text: "Dw i ddim yn siŵr fedra i gofio'r frawddeg gyfan.",
  english_pivot: "I'm not sure if I can remember the whole sentence",
  translation_concern: 'INHERITED DEFECT. The Yoruba "Mi ò rò pé" back-translates as "I don\'t think that", which is a stronger and different claim from the English "I\'m not sure if" and from the Welsh "dw i ddim yn siŵr". The same defect was independently flagged on the same Yoruba string in yor_for_eng. See speaker question 6.',
  lego_order_note: 'Introduction order is deliberately NOT surface order. "fedra i" comes first, and the negative frame "dw i ddim yn siŵr" comes LAST, so that by the time the frame arrives the learner has a complete clause to embed under it. Building the frame first would have forced its practice phrases into "dw i ddim yn siŵr dw i\'n siarad…", which is not how the construction is used.',
  mutation_note: 'Welsh soft mutation after "fedra i" (cofio→gofio, dysgu→ddysgu, trio→drio) is the constraint shaping L1\'s phrases: they use only verbs that do not mutate (siarad, esbonio, ymarfer) or chunks already taught in their mutated form (gofio\'r frawddeg). The server\'s untaught-word gate cannot see this — it would have accepted the UNMUTATED, ungrammatical "fedra i cofio". See Welsh review point W1.',
  legos: [
    { idx: 1, type: 'M', known: 'mo lè', target: 'fedra i',
      components: [ { known: 'lè', target: 'fedra', introduce: false } ],
      reasoning: 'North Welsh fedra i ("I can"), the released cym_n_for_eng form. Taught as a unit because the Welsh verb is inflected, not periphrastic.',
      build: [
        { known: 'mo lè sọ èdè Welsh', target: 'fedra i siarad Cymraeg' },
        { known: 'mo lè sọ pẹ̀lú rẹ báyìí', target: 'fedra i siarad efo chdi rŵan' },
        { known: 'mo lè ṣàlàyé nǹkan', target: 'fedra i esbonio rhywbeth' },
      ],
      use: [
        { known: 'mo lè sọ èdè Welsh díẹ̀ báyìí', target: 'fedra i siarad chydig o Gymraeg rŵan', score: 9 },
        { known: 'mo lè sọ èdè Welsh pẹ̀lú ẹlòmíràn lónìí', target: 'fedra i siarad Cymraeg efo rhywun arall heddiw', score: 9 },
        { known: 'mo lè ṣàlàyé ohun tí mo túmọ̀ sí ní èdè Welsh', target: "fedra i esbonio be dw i'n feddwl yn Gymraeg", score: 9 },
        { known: 'mo lè sọ èdè Welsh lóòrèkóòrè tó bá ṣeé ṣe', target: 'fedra i siarad Cymraeg mor aml â phosib', score: 8 },
        { known: 'mo lè ṣàlàyé nǹkan pẹ̀lú rẹ lónìí', target: 'fedra i esbonio rhywbeth efo chdi heddiw', score: 8 },
      ] },

    { idx: 2, type: 'M', known: 'rántí gbogbo gbólóhùn náà', target: "gofio'r frawddeg gyfan",
      components: [ { known: 'gbólóhùn náà', target: 'frawddeg' }, { known: 'gbogbo', target: 'gyfan' } ],
      reasoning: "Taught as ONE chunk because three separate Welsh things happen inside it that the learner must never have to choose: gofio is the mutated cofio after fedra i; 'r is the definite article fused onto the verb as a single token; and frawddeg is feminine so gyfan carries a soft mutation. An earlier draft split this as 'rántí gbólóhùn náà' + 'gbogbo', which our own span check rejected — that known side is DISCONTINUOUS in the seed prompt (gbogbo sits between rántí and gbólóhùn), and a discontinuous slice is exactly how a LEGO ends up holding a sibling's material.",
      build: [
        { known: 'mo lè rántí gbogbo gbólóhùn náà', target: "fedra i gofio'r frawddeg gyfan" },
        { known: 'rántí gbogbo gbólóhùn náà báyìí', target: "gofio'r frawddeg gyfan rŵan" },
        { known: 'Mo fẹ́ láti rántí gbogbo gbólóhùn náà', target: "dw i isio gofio'r frawddeg gyfan" },
      ],
      use: [
        { known: 'mo lè rántí gbogbo gbólóhùn náà báyìí', target: "fedra i gofio'r frawddeg gyfan rŵan", score: 9 },
        { known: 'Mo ń gbìyànjú láti rántí gbogbo gbólóhùn náà lónìí', target: "dw i'n trio gofio'r frawddeg gyfan heddiw", score: 8 },
        { known: 'Mo máa gbìyànjú láti rántí gbogbo gbólóhùn náà báyìí', target: "dw i'n mynd i drio gofio'r frawddeg gyfan rŵan", score: 8 },
        { known: 'mo lè rántí gbogbo gbólóhùn náà ní èdè Welsh', target: "fedra i gofio'r frawddeg gyfan yn Gymraeg", score: 7 },
        { known: 'Mo fẹ́ láti rántí gbogbo gbólóhùn náà pẹ̀lú rẹ', target: "dw i isio gofio'r frawddeg gyfan efo chdi", score: 7 },
      ] },

    { idx: 3, type: 'M', known: 'Mi ò rò pé', target: 'dw i ddim yn siŵr',
      components: [ { known: 'Mi ò', target: 'dw i ddim', introduce: false } ],
      reasoning: 'Only the negative frame is exposed as a component. rò ("think") is deliberately NOT glossed to siŵr ("sure") — that would be a dishonest gloss, and it is precisely the mismatch flagged in translation_concern above. Introduced last so every practice phrase can embed a whole "fedra i …" clause, which is how the construction actually behaves.',
      build: [
        { known: 'Mi ò rò pé mo lè sọ èdè Welsh', target: 'dw i ddim yn siŵr fedra i siarad Cymraeg' },
        { known: 'Mi ò rò pé mo lè sọ pẹ̀lú ẹlòmíràn', target: 'dw i ddim yn siŵr fedra i siarad efo rhywun arall' },
        { known: 'Mi ò rò pé mo lè ṣàlàyé nǹkan', target: 'dw i ddim yn siŵr fedra i esbonio rhywbeth' },
      ],
      use: [
        { known: 'Mi ò rò pé mo lè rántí gbogbo gbólóhùn náà', target: "dw i ddim yn siŵr fedra i gofio'r frawddeg gyfan", score: 9 },
        { known: 'Mi ò rò pé mo lè sọ èdè Welsh díẹ̀ báyìí', target: 'dw i ddim yn siŵr fedra i siarad chydig o Gymraeg rŵan', score: 8 },
        { known: 'Mi ò rò pé mo lè ṣàlàyé ohun tí mo túmọ̀ sí', target: "dw i ddim yn siŵr fedra i esbonio be dw i'n feddwl", score: 9 },
        { known: 'Mi ò rò pé mo lè sọ èdè Welsh pẹ̀lú ẹlòmíràn lónìí', target: 'dw i ddim yn siŵr fedra i siarad Cymraeg efo rhywun arall heddiw', score: 8 },
        { known: 'Mi ò rò pé mo lè rántí gbogbo gbólóhùn náà ní èdè Welsh', target: "dw i ddim yn siŵr fedra i gofio'r frawddeg gyfan yn Gymraeg", score: 7 },
      ] },
  ],
},

];
