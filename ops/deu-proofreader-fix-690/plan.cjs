'use strict';
// cs #690·AI — deu_for_eng: the LAST 3 proofreader items Kai passed on 18 Nov (best effort, apply; cap 1,500 TTS chars).
// The plan, as data. run.cjs renders from it; build-batches.cjs turns it + out/audio.json into edit-batch ops.
//
// ITEM 1 · S0654 "I'm not sure if I can help you, sir" = "Ich bin mir nicht sicher, ob ich Ihnen helfen kann, mein Herr".
//   Live before: L01 = the WHOLE seed (new, M, ~17 syllables), L02 = "sure"/"sicher" (not new); L01's builds drilled "mir".
//   The cut (shortest new LEGO, every other part already taught):
//     L01 NEW  "I can help you, sir" = "ich Ihnen helfen kann, mein Herr"   (8 syllables: ich·Ih·nen·hel·fen·kann·mein·Herr)
//     L02 old  "I'm not sure if"     = "ich bin mir nicht sicher, ob"       (exact pair taught at S0062L01; not new)
//   Why: S0062L01 already teaches "I'm not sure if" as one chunk, so the only new thing in 654 is polite Ihnen + helfen in
//   the verb-last clause, with the "sir" marker the 639-654 polite block uses for Ihnen (S0639L01, S0643-S0653).
//   Verb-last chunk glossed in plain English has course precedent: S0616L02 "you thought that" = "du das gedacht hast"
//   (#519·AI), S0008L02 "what I mean" = "was ich meine", S0171L02 "me to help you" = "dass ich dir helfe".
//   "if I can help you, sir" = "ob ich Ihnen helfen kann, mein Herr" would be 9 syllables, past the canon's 8 (L3).
// ITEM 2 · S0657L02 "all" intro (proofreader R1334): re-record the deu-owned intro clip in place, British /ɔːl/ spelled out.
// ITEM 3 · S0660L01 "I can help you all" = "Ich kann euch allen helfen": builds that contain the whole LEGO.
const C = 'deu_for_eng';
const L654 = { known: "I can help you, sir", target: 'ich Ihnen helfen kann, mein Herr' };
// Phrases written for the cut. Every word is taught before the seed it sits in (ob S0010, dass S0047, weil S0022,
// ich weiß S0059 / ich weiß nicht S0135, ich denke S0047, ich hoffe (also hoffe ich S0149; "ich hoffe, …" phrase 656U13),
// ja S0097, Ihnen + mein Herr S0639, helfen S0025/S0645, euch allen S0656).
const P654 = {
  B01: ['if I can help you, sir', 'ob ich Ihnen helfen kann, mein Herr'],
  B02: ['that I can help you, sir', 'dass ich Ihnen helfen kann, mein Herr'],
  B03: ['because I can help you, sir', 'weil ich Ihnen helfen kann, mein Herr'],
  U01: ["I don't know if I can help you, sir", 'ich weiß nicht, ob ich Ihnen helfen kann, mein Herr'],
  U02: ['I hope that I can help you, sir', 'ich hoffe, dass ich Ihnen helfen kann, mein Herr'],
  U03: ['I think that I can help you, sir', 'ich denke, dass ich Ihnen helfen kann, mein Herr'],
  U04: ['I know that I can help you, sir', 'ich weiß, dass ich Ihnen helfen kann, mein Herr'],
};
const P660 = {
  B01: ['yes, I can help you all', 'ja, ich kann euch allen helfen'],
  B02: ['I think I can help you all', 'ich denke, ich kann euch allen helfen'],
  B03: ['I hope I can help you all', 'ich hoffe, ich kann euch allen helfen'],
};
const INTRO_654 = `The German for: '${L654.known}', is: <break time="300ms"/> <break time="10ms"/>`;
// Item 2: the live intro clip and its text (read 18 Nov from GET /api/production/deu_for_eng/presentation/S0657L02).
const INTRO_657 = { id: 'db568f85-daee-4e20-b3fb-8dfd16d67e05',
  text: "The German for: 'all', as in — 'she also said they are all here', is: <break time=\"300ms\"/> <break time=\"10ms\"/>" };
// Cartesia custom pronunciation (same form #519·AI used for "do"): British "all" /ɔːl/.
const IPA_ALL = '<<ˈ|ɔː|l>>';
INTRO_657.spoken = INTRO_657.text.replace(/\ball\b/g, IPA_ALL);
module.exports = { C, L654, P654, P660, INTRO_654, INTRO_657 };
