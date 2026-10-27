'use strict';
// Aran's ruling of 2026-10-27 on the esgusodwch-fi review page (job #114 drafts, commit 06bccd15c), as data.
// The drafts themselves are ops/esgusodwch-fi-139/drafts-{n,s}.tsv (copied verbatim from that commit).
// EVERY DRAFT NOT NAMED HERE IS ACCEPTED AS DRAFTED. Aran is the Welsh methodology lead; his word decides.
//   unchanged   — he did not answer: the course row is left exactly as it is
//   own         — his own wording replaces the draft: [known, target]
//   remove      — the phrase is removed from the course
//   deleteLego  — the LEGO goes (cascade); its accepted phrases cannot stand without it and are LISTED for him
// Straight apostrophes in his text are written as the course's curly ’ (phrases, LEGOs, Welsh seeds); English seed
// sentences in these courses use the straight ' and the tool converts them there.

const RULING = {
  cym_nv2_for_eng: {
    unchanged: ['S1642L03U01'],
    own: {
      'seed:1647': ['excuse me, do you speak Welsh?', "esgusodwch fi, dach chi'n siarad Cymraeg?"],
      'lego:S1647L01': ['excuse me, do you speak Welsh?', "esgusodwch fi, dach chi'n siarad Cymraeg?"],
      S1644L01B01: ['excuse me, could you say that again, please?', 'esgusodwch fi, fedrwch chi ddeud hynna eto, os gwelwch yn dda?'],
      S1644L01B04: ['excuse me, could you say that again? right now?', 'esgusodwch fi, fedrwch chi ddeud hynna eto? rŵan hyn?'],
      S1644L01B02: ['excuse me, could you say that again now?', 'esgusodwch fi, fedrwch chi ddeud hynna eto rŵan?'],
      S1644L01B03: ['but excuse me, could you say that again?', 'ond esgusodwch fi, fedrwch chi ddeud hynna eto?'],
      S1644L01U06: ['excuse me, could you say that again now? I need to make sure', 'esgusodwch fi, fedrwch chi ddeud hynna eto rŵan? dw i angen gwneud yn siŵr'],
      S1644L01U03: ['excuse me, could you say that again? I need to make sure', 'esgusodwch fi, fedrwch chi ddeud hynna eto? dw i angen gwneud yn siŵr'],
      S1647L01U01: ["excuse me, do you speak Welsh? I'm trying, but I'm tired", "esgusodwch fi, dach chi'n siarad Cymraeg? dw i'n trio, ond dw i wedi blino"],
    },
    remove: ['S1639L02U04', 'S1643L01B04', 'S1643L01U06', 'S1643L01U02', 'S1643L01U03', 'S1644L01U02', 'S1644L01U04', 'S1644L01U05',
      'S1644L01U01', 'S1645L02U06', 'S1645L02U10', 'S1645L02U07', 'S1645L02U01', 'S1646L01U02', 'S1646L01U07', 'S1646L01U03',
      'S1647L01B03', 'S1647L01U03', 'S1647L01U04', 'S1647L01U05', 'S1647L01U06', 'S1647L01U02', 'S1648L01B04', 'S1648L01U04',
      'S1649L01B02', 'S1649L01U02', 'S1649L01U04', 'S1653L01B01', 'S1653L01B04', 'S1653L01B02', 'S1653L01U01', 'S1653L01U04',
      'S1653L01U02', 'S1653L01U03', 'S1653L01U05', 'S1653L01U06', 'S1653L01U07'],
    deleteLego: [],
  },
  cym_sv2_for_eng: {
    unchanged: [],
    own: {
      'seed:1647': ['excuse me, do you speak Welsh?', "esgusodwch fi, ŷch chi'n siarad Cymraeg?"],
      // His note: lego:S1647L01 was accepted as drafted ("siarad hi"); it no longer matches his own-worded seed, so it is
      // aligned to the seed.
      'lego:S1647L01': ['excuse me, do you speak Welsh?', "esgusodwch fi, ŷch chi'n siarad Cymraeg?"],
      S1644L01B01: ['excuse me, could you say that again, please?', 'esgusodwch fi, allech chi ddweud hynny eto, os gwelwch yn dda?'],
      S1644L01B04: ['but excuse me, could you say that again?', 'ond esgusodwch fi, allech chi ddweud hynny eto?'],
      S1644L01B02: ['excuse me, could you say that again? thank you', 'esgusodwch fi, allech chi ddweud hynny eto? diolch'],
      S1644L01U02: ['so excuse me, could you say that again?', 'felly esgusodwch fi, allech chi ddweud hynny eto?'],
      S1644L01U06: ['but excuse me, could you say that again? thank you', 'ond esgusodwch fi, allech chi ddweud hynny eto? diolch'],
      S1644L01U01: ['great, but excuse me, could you say that again? thank you', 'bendigedig, ond esgusodwch fi, allech chi ddweud hynny eto? diolch'],
      S1647L01B03: ['so excuse me, do you speak Welsh?', "felly esgusodwch fi, ŷch chi'n siarad Cymraeg?"],
      S1647L01B01: ['excuse me, do you speak Welsh?', "esgusodwch fi, ŷch chi'n siarad Cymraeg?"],
    },
    remove: ['S1639L01U03', 'S1639L01U04', 'S1639L01U07', 'S1643L01U02', 'S1643L01U03', 'S1643L01U05', 'S1644L01B03', 'S1644L01U03',
      'S1644L01U05', 'S1644L01U04', 'S1645L01U03', 'S1646L01B02', 'S1646L01U02', 'S1646L01U04', 'S1646L01U06', 'S1646L01U03',
      'S1647L01B02', 'S1647L01U02', 'S1647L01U03', 'S1648L01U02', 'S1648L01U04', 'S1649L01B04', 'S1649L01U06', 'S1649L01U03',
      'S1649L01U02', 'S1650L01B03', 'S1650L01U05', 'S1650L01U01', 'S1650L01U04', 'S1650L01U07', 'S1651L01B04', 'S1651L01U04',
      'S1651L01U05', 'S1651L01U07', 'S1651L01U03', 'S1651L01U02', 'S1652L01B04', 'S1652L01U04', 'S1652L01U03', 'S1652L01U01',
      'S1652L01U06', 'S1652L01U05', 'S1653L01U02', 'S1654L03B02', 'S1654L03U01', 'S1654L03U07', 'S1657L01U03', 'S1657L01U02',
      'S1657L01U01', 'S1664L01U06'],
    // "we need every 'chi' to be tied to 'esgusodwch fi'"
    deleteLego: ['S1655L02'],
  },
};

// The intro, his own wording. NOT written by the tool: Popty has no route that stores a hand-written intro without
// rendering it (see the tool header). Kept here so the words are not lost. Aran, 2026-10-27: South must NOT say 'chdi'
// (a North form) — "You're used to 'ti' for the friendly, informal you"; North keeps "'ti' or 'chdi'".
const INTRO_NORTH = "Here's a polite way to get someone's attention, and it's going to help us practise using 'you' in a more formal way. You're used to 'ti' or 'chdi' for the friendly, informal you - to make it formal (or plural, as well) you just change it to 'chi'. So, for 'excuse me', we're going to say 'esgusodwch fi' - if you're talking to a friend, you can say 'esgusoda fi', but we're going to practise the formal one - so any time you hear 'excuse me' in the prompt, you need to use 'chi' for you in the response. So, one last time, for 'excuse me' I want you to say:";

// The tiling parts of each M LEGO the drafts rewrite, from the drafts' own "Parts:" notes and the LEGO's existing
// parts (sir/madam swapped for 'excuse me', moved first). South keeps its convention: one part, the whole LEGO.
const INTROS = {
  cym_nv2_for_eng: INTRO_NORTH,
  cym_sv2_for_eng: INTRO_NORTH.replace("You're used to 'ti' or 'chdi' for", "You're used to 'ti' for"),
};
if (INTROS.cym_sv2_for_eng.includes('chdi')) throw new Error('South intro must not say chdi (Aran, 2026-10-27)');

const C = (known, target) => ({ known, target });
const XM = { n: C('excuse me', 'esgusodwch fi'), s: C('excuse me', 'esgusodwch fi') };
const COMPONENTS = {
  cym_nv2_for_eng: {
    S1639L01: [C('excuse', 'esgusodwch'), C('me', 'fi')],
    S1639L02: [XM.n, C('can I', 'ga i'), C('sit', 'eistedd'), C('with you', 'efo chi')],
    S1643L01: [XM.n, C('do you want?', 'dach chi isio?')],
    S1644L01: [XM.n, C('could you?', 'fedrwch chi?'), C('say that', 'ddeud hynna')],
    S1645L02: [XM.n, C('I can', 'mi fedra i'), C('help you', 'helpu chi')],
    S1646L01: [XM.n, C('you’re doing', 'dach chi’n gwneud'), C('something', 'rhywbeth')],
    S1647L01: [XM.n, C('you speak', 'dach chi’n siarad'), C('Welsh', 'Cymraeg')],
    S1648L01: [XM.n, C('what', 'be’'), C('you said', 'ddudoch chi')],
    S1649L01: [XM.n, C('are you ready?', 'dach chi’n barod?')],
    S1653L01: [XM.n, C('do you mind?', 'oes ots gynnoch chi?')],
  },
  cym_sv2_for_eng: {
    S1639L01: [C('excuse', 'esgusodwch'), C('me', 'fi')], // the new 'excuse me' LEGO (drafted split)
    // every other rewritten South M LEGO: one part, the whole LEGO (computed by the tool)
  },
};

module.exports = { RULING, INTROS, COMPONENTS };
