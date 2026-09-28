#!/usr/bin/env node
'use strict';
// ita_for_eng — LEGOs that are a congiuntivo (or another dependent verb form) cut out of
// the clause that makes them meaningful. Kai's ruling, 2026-09-28 (job #520), on seed 115:
//
//   "fossi pronto" glossed "I'm ready", taken from "come se fossi pronto": "It definitely
//   needs expanding with more context (come se fossi pronto). It can't stand on its own.
//   'fossi pronto' and 'I were ready' don't match that well either. All other cases of this
//   should be fixed as well."
//
// THE FIX IS TO EXPAND THE LEGO TO INCLUDE ITS TRIGGER (come se / se / che / prima che …),
// with an English gloss that matches the expanded chunk. A LEGO grows on both sides.
// Re-glossing the fragment is not a fix. Where the trigger already has its own LEGO the
// two are MERGED (the absorbed row goes, its phrases are re-homed or dropped — a LEGO is
// never deleted for any other reason). Where a neighbour has to be absorbed for the seed
// to stay tiled, it is absorbed and the seed is re-checked.
//
// THE SWEEP (read live 2026-09-28): 1,457 LEGOs read; morphology (imperfect -ssi/-sse/
// -ssimo/-ssero, conditional -rei/-rebbe…, present-subjunctive irregulars) × a trigger in
// the seed before the LEGO and outside it → 29 hits, calibrated on seed 115; a second pass
// over every LEGO that ENDS in a trigger and what follows it added S0419L02 (li apprezzi).
// Hand-check removed: 10 conditionals (a condizionale stands alone: "sarebbe fantastico",
// "avrei fatto"), 1 false positive (S0176L03 "l'anno prossimo"). S0339L01 "si sia fatto"
// IS a hit but seed 339 is being read by job #519·I and is left for later. S0281L05
// "cominci" is a form shared by indicative and subjunctive and its phrases use it as
// indicative "you start" — the trigger LEGO beside it is grown to "prima che tu" instead.
//
// Every phrase under a changed LEGO must still contain the LEGO, every word in every
// phrase of a touched seed must be taught by then, every touched seed must still tile,
// and no new same-English → different-Italian fork may appear (LEGO gate, phrase gate,
// course-wide sweep). All of that runs BEFORE any write and blocks it.
//
// S0261L01 "penso che" = "I think" is re-glossed "I think that" ONLY because S0047L01
// becomes "penso" = "I think"; without it the fix would create the fork it forbids.
//
// Audio: nothing is rendered here. The text-change triggers unlink the clips whose text
// moved (recorded in content_audio_link_drops); the caller renders the empty slots through
// phase8 /generate — Italian in Azure Elsa/Benigno (the course's voice of record; nothing
// is cast for 'ita'). The English side is cast to Cartesia by voice_language_roles and is
// NOT rendered by this job (Azure-only brief) — see the report.
//
// Identity: serviceIdentity + recordContentEdit (SQL-side sweep, outside the HTTP gate).
// Dry run by default; --apply writes. Evidence JSON goes to ~/ssi-evidence.
//
//   node tools/course-optimization/ita-stranded-subjunctive-legos-2026-09-28.cjs
//   node tools/course-optimization/ita-stranded-subjunctive-legos-2026-09-28.cjs --apply

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
const { checkLegoConflict, checkPhraseZUT, checkTiling } = require('../../services/course-builder/lib/validation.cjs');
const { normalizeForContainment, normalizeForStorage } = require('../../services/course-builder/lib/text-normalization.cjs');
const { decoratePhrasesWithDecomposition } = require('../../services/phrase-decomposition-writer.cjs');
const { evidencePath } = require('../lib/evidence-path.cjs');

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-stranded-subjunctive-legos-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-28 (job #520): a subjunctive (or other dependent verb form) LEGO is expanded to include its trigger — "come se fossi pronto" = "as if I were ready" — never re-glossed as a fragment; all cases in ita_for_eng';
const DO_NOT_TOUCH = new Set([116, 376, 403, 410, 478, 618, 642, 343, 519]); // job #519·I

const L = (seed, idx) => ({ seed, idx, legoId: `S${String(seed).padStart(4, '0')}L${String(idx).padStart(2, '0')}` });
const c = (target, known) => ({ target, known });

// ─── THE SPEC ──────────────────────────────────────────────────────────────────────────
// legos.update: { idx, from:{known,target}, to:{known,target,components,is_new?,type?} }
// legos.remove: { idx, from:{known,target} }  (merged into a neighbour; its phrases are listed)
// phrases.update: { idx, pos, from:{known,target}, to:{known,target} }
// phrases.remove: { idx, pos, from:{known,target} }
// phrases.insert: { idx, id, pos, role, known, target }
const SEEDS = [
  { seed: 47,
    legos: { update: [
      { idx: 1, from: { known: 'I think that', target: 'penso che' }, to: { known: 'I think', target: 'penso', components: [c('penso', 'I think')] } },
      { idx: 2, from: { known: "it's a good thing", target: 'sia una buona cosa' }, to: { known: "that it's a good thing", target: 'che sia una buona cosa', components: [c('che sia', 'that it is'), c('una buona cosa', 'a good thing')] } },
    ] },
    phrases: { update: [
      { idx: 2, pos: 1, from: { known: 'it is', target: 'sia' }, to: { known: 'that it is', target: 'che sia' } },
      { idx: 2, pos: 5, from: { known: "it's a good thing", target: 'sia una buona cosa' }, to: { known: "that it's a good thing", target: 'che sia una buona cosa' } },
      { idx: 2, pos: 7, from: { known: "it's a good thing to speak", target: 'sia una buona cosa parlare' }, to: { known: "that it's a good thing to speak", target: 'che sia una buona cosa parlare' } },
    ] } },

  { seed: 261, note: 'knock-on of seed 47: "I think" must not map to both penso and penso che',
    legos: { update: [
      { idx: 1, from: { known: 'I think', target: 'penso che' }, to: { known: 'I think that', target: 'penso che', components: [c('penso che', 'I think that')] } },
    ] } },

  { seed: 114,
    legos: {
      update: [{ idx: 1, from: { known: "I'm doing", target: 'stessi andando' }, to: { known: 'as if I were doing', target: 'come se stessi andando', components: [c('come se', 'as if'), c('stessi andando', 'I were doing')] } }],
      remove: [{ idx: 3, from: { known: 'as if', target: 'come se' } }],
    },
    phrases: {
      update: [
        { idx: 1, pos: 3, from: { known: "I'm doing", target: 'stessi andando' }, to: { known: 'as if I were doing', target: 'come se stessi andando' } },
        { idx: 1, pos: 4, from: { known: "I'm doing", target: 'stessi andando' }, to: { known: 'as if I were doing', target: 'come se stessi andando' } },
        { idx: 1, pos: 5, from: { known: "I'm doing better", target: 'stessi andando meglio' }, to: { known: 'as if I were doing better', target: 'come se stessi andando meglio' } },
        { idx: 1, pos: 6, from: { known: "I'm doing it", target: 'stessi andando' }, to: { known: 'as if I were doing well', target: 'come se stessi andando bene' } },
        { idx: 2, pos: 2, from: { known: "I'm doing worse", target: 'stessi andando peggio' }, to: { known: 'as if I were doing worse', target: 'come se stessi andando peggio' } },
      ],
      remove: [
        { idx: 3, pos: 3, from: { known: 'as if', target: 'come se' } },
        { idx: 3, pos: 4, from: { known: 'as if', target: 'come se' } },
        { idx: 3, pos: 5, from: { known: 'I feel as if', target: 'mi sento come se' } },
        { idx: 3, pos: 6, from: { known: "as if I'm doing worse", target: 'come se stessi andando peggio' } },
        { idx: 3, pos: 7, from: { known: "I feel as if I'm doing better", target: 'mi sento come se stessi andando meglio' } },
        { idx: 3, pos: 12, from: { known: "it's as if it was very difficult", target: 'è come se fosse molto difficile' } },
        { idx: 3, pos: 14, from: { known: "it's as if I was learning something new", target: 'è come se stessi imparando qualcosa di nuovo' } },
        { idx: 3, pos: 15, from: { known: "I feel as if I'm doing worse", target: 'mi sento come se stessi andando peggio' } },
        { idx: 3, pos: 16, from: { known: 'I feel as if I were speaking better', target: 'mi sento come se stessi parlando meglio' } },
        { idx: 3, pos: 17, from: { known: "it's as if it were difficult to speak", target: 'è come se fosse difficile parlare' } },
        { idx: 3, pos: 18, from: { known: "it's as if I were learning more", target: 'è come se stessi imparando di più' } },
      ],
      insert: [
        { idx: 1, id: `${COURSE}:S0114L01U06`, pos: 12, role: 'use', known: 'I feel as if I were doing worse', target: 'mi sento come se stessi andando peggio' },
      ],
    } },

  { seed: 115,
    legos: { update: [{ idx: 1, from: { known: "I'm ready", target: 'fossi pronto' }, to: { known: 'as if I were ready', target: 'come se fossi pronto', components: [c('come se', 'as if'), c('fossi pronto', 'I were ready')] } }] },
    phrases: { update: [
      { idx: 1, pos: 3, from: { known: "I'm ready", target: 'fossi pronto' }, to: { known: 'as if I were ready', target: 'come se fossi pronto' } },
      { idx: 1, pos: 4, from: { known: "I'm ready", target: 'fossi pronto' }, to: { known: 'as if I were ready', target: 'come se fossi pronto' } },
      { idx: 1, pos: 6, from: { known: "I'm ready to speak", target: 'fossi pronto a parlare' }, to: { known: 'as if I were ready to speak', target: 'come se fossi pronto a parlare' } },
      { idx: 2, pos: 5, from: { known: "I'm ready to have a conversation", target: 'fossi pronto a fare una conversazione' }, to: { known: 'as if I were ready to have a conversation', target: 'come se fossi pronto a fare una conversazione' } },
      { idx: 2, pos: 6, from: { known: "I'm not ready to have a conversation", target: 'non fossi pronto a fare una conversazione' }, to: { known: "as if I weren't ready to have a conversation", target: 'come se non fossi pronto a fare una conversazione' } },
    ] } },

  { seed: 119,
    legos: {
      update: [{ idx: 1, from: { known: 'you leave', target: 'tu vada via' }, to: { known: 'before you leave', target: 'prima che tu vada via', components: [c('prima che tu', 'before you'), c('vada via', 'leave')] } }],
      remove: [{ idx: 2, from: { known: 'before you', target: 'prima che tu' } }],
    },
    phrases: {
      update: [
        { idx: 1, pos: 3, from: { known: 'you leave', target: 'tu vada via' }, to: { known: 'before you leave', target: 'prima che tu vada via' } },
        { idx: 1, pos: 4, from: { known: 'you leave', target: 'tu vada via' }, to: { known: 'before you leave', target: 'prima che tu vada via' } },
        { idx: 1, pos: 12, from: { known: 'I think you leave tomorrow', target: 'penso che tu vada via domani' }, to: { known: 'I want to talk with you before you leave', target: 'voglio parlare con te prima che tu vada via' } },
        { idx: 1, pos: 15, from: { known: 'I want you to leave', target: 'voglio che tu vada via' }, to: { known: 'something before you leave', target: 'qualcosa prima che tu vada via' } },
        { idx: 1, pos: 16, from: { known: "I don't want you to leave now", target: 'non voglio che tu vada via adesso' }, to: { known: 'I need to say something before you leave', target: 'ho bisogno di dire qualcosa prima che tu vada via' } },
        { idx: 1, pos: 17, from: { known: 'I think you leave soon', target: 'penso che tu vada via presto' }, to: { known: "I'll wait for you before you leave", target: 'ti aspetto prima che tu vada via' } },
        { idx: 1, pos: 18, from: { known: 'I want you to leave today', target: 'voglio che tu vada via oggi' }, to: { known: 'can I ask you something before you leave?', target: 'posso chiederti qualcosa prima che tu vada via?' } },
        { idx: 1, pos: 19, from: { known: 'I think you leave with someone else', target: 'penso che tu vada via con qualcun altro' }, to: { known: 'I need to talk with you before you leave', target: 'ho bisogno di parlare con te prima che tu vada via' } },
      ],
      remove: [
        { idx: 2, pos: 3, from: { known: 'before you', target: 'prima che tu' } },
        { idx: 2, pos: 4, from: { known: 'before you', target: 'prima che tu' } },
        { idx: 2, pos: 5, from: { known: 'before you leave', target: 'prima che tu vada via' } },
        { idx: 2, pos: 6, from: { known: 'something before you leave', target: 'qualcosa prima che tu vada via' } },
        { idx: 2, pos: 7, from: { known: 'I want to talk with you before you go', target: 'voglio parlare con te prima che tu vada' } },
        { idx: 2, pos: 8, from: { known: 'I need to say something before you leave', target: 'ho bisogno di dire qualcosa prima che tu vada via' } },
        { idx: 2, pos: 9, from: { known: 'can I ask you something before you stop?', target: 'posso chiederti qualcosa prima che tu smetta?' } },
        { idx: 2, pos: 10, from: { known: 'I will wait before you leave', target: 'ti aspetto prima che tu vada via' } },
      ],
    } },

  { seed: 151,
    legos: {
      update: [{ idx: 2, from: { known: 'was hoping', target: 'speravo' }, to: { known: 'I was hoping would happen', target: 'speravo succedesse', components: [c('speravo', 'I was hoping'), c('succedesse', 'would happen')] } }],
      remove: [{ idx: 3, from: { known: 'would happen', target: 'succedesse' } }],
    },
    phrases: {
      update: [
        { idx: 2, pos: 2, from: { known: 'was hoping', target: 'speravo' }, to: { known: 'I was hoping would happen', target: 'speravo succedesse' } },
        { idx: 2, pos: 3, from: { known: 'was hoping', target: 'speravo' }, to: { known: 'I was hoping would happen', target: 'speravo succedesse' } },
        { idx: 2, pos: 4, from: { known: 'I was hoping', target: 'speravo' }, to: { known: 'what I was hoping would happen', target: 'quello che speravo succedesse' } },
        { idx: 2, pos: 5, from: { known: 'I was hoping to do it', target: 'speravo di farlo' }, to: { known: "that wasn't what I was hoping would happen", target: 'non era quello che speravo succedesse' } },
        { idx: 2, pos: 6, from: { known: 'I was hoping to see you', target: 'speravo di vederti' }, to: { known: "that's not what I was hoping would happen", target: 'non è quello che speravo succedesse' } },
        { idx: 2, pos: 7, from: { known: 'I was hoping you would be here', target: 'speravo che fossi qui' }, to: { known: 'it was what I was hoping would happen', target: 'era quello che speravo succedesse' } },
        { idx: 2, pos: 8, from: { known: 'I was hoping to see you yesterday', target: 'speravo di vederti ieri' }, to: { known: "that wasn't what I was hoping would happen yesterday", target: 'non era quello che speravo succedesse ieri' } },
        { idx: 2, pos: 9, from: { known: 'I was hoping it would be easier', target: 'speravo che fosse più facile' }, to: { known: "it's what I was hoping would happen", target: 'è quello che speravo succedesse' } },
        { idx: 2, pos: 10, from: { known: 'I was hoping to finish this morning', target: 'speravo di finire stamattina' }, to: { known: 'what I was hoping would happen today', target: 'quello che speravo succedesse oggi' } },
        { idx: 2, pos: 13, from: { known: 'I was hoping to talk to you about that', target: 'speravo di parlare con te di quello' }, to: { known: "this wasn't what I was hoping would happen", target: 'questo non era quello che speravo succedesse' } },
      ],
      remove: [
        { idx: 3, pos: 2, from: { known: 'would happen', target: 'succedesse' } },
        { idx: 3, pos: 3, from: { known: 'would happen', target: 'succedesse' } },
        { idx: 3, pos: 4, from: { known: 'it would happen', target: 'succedesse' } },
        { idx: 3, pos: 5, from: { known: 'what would happen', target: 'cosa succedesse' } },
        { idx: 3, pos: 7, from: { known: "I didn't think that would happen", target: 'non pensavo che succedesse' } },
        { idx: 3, pos: 11, from: { known: 'I was hoping something else would happen', target: "speravo che succedesse qualcos'altro" } },
        { idx: 3, pos: 12, from: { known: "I didn't believe it would happen like this", target: 'non credevo che succedesse così' } },
        { idx: 3, pos: 13, from: { known: 'I hoped it would happen sooner', target: 'speravo che succedesse prima' } },
      ],
    } },

  { seed: 152,
    legos: { update: [{ idx: 3, from: { known: 'had known', target: 'avessi saputo' }, to: { known: 'if I had known', target: 'se avessi saputo', components: [c('se', 'if'), c('avessi saputo', 'I had known')] } }] },
    phrases: { update: [
      { idx: 3, pos: 3, from: { known: 'had known', target: 'avessi saputo' }, to: { known: 'if I had known', target: 'se avessi saputo' } },
      { idx: 3, pos: 4, from: { known: 'had known', target: 'avessi saputo' }, to: { known: 'if I had known', target: 'se avessi saputo' } },
      { idx: 3, pos: 5, from: { known: 'I had known', target: 'avessi saputo' }, to: { known: 'if I had known before', target: 'se avessi saputo prima' } },
    ] } },

  { seed: 185,
    legos: { update: [{ idx: 1, from: { known: 'you left them', target: 'tu le abbia lasciate' }, to: { known: 'that you left them', target: 'che tu le abbia lasciate', components: [c('che', 'that'), c('tu le abbia lasciate', 'you left them')] } }] },
    phrases: { update: [
      { idx: 1, pos: 3, from: { known: 'you left them', target: 'tu le abbia lasciate' }, to: { known: 'that you left them', target: 'che tu le abbia lasciate' } },
      { idx: 1, pos: 4, from: { known: 'you left them', target: 'tu le abbia lasciate' }, to: { known: 'that you left them', target: 'che tu le abbia lasciate' } },
    ] } },

  { seed: 204,
    legos: { update: [
      { idx: 1, from: { known: 'I wanted her to', target: 'volevo che lei' }, to: { known: 'I wanted', target: 'volevo', is_new: false, components: [c('volevo', 'I wanted')] } },
      { idx: 2, from: { known: 'help', target: 'aiutasse' }, to: { known: 'her to help you', target: 'che lei ti aiutasse', type: 'M', components: [c('che lei', 'that she'), c('ti aiutasse', 'help you')] } },
    ] },
    phrases: { update: [
      { idx: 1, pos: 4, from: { known: 'I wanted her to', target: 'volevo che lei' }, to: { known: 'I wanted', target: 'volevo' } },
      { idx: 1, pos: 5, from: { known: 'I wanted her to', target: 'volevo che lei' }, to: { known: 'I wanted', target: 'volevo' } },
      { idx: 1, pos: 6, from: { known: 'I wanted that she', target: 'volevo che lei' }, to: { known: 'I wanted to help you', target: 'volevo aiutarti' } },
      { idx: 1, pos: 7, from: { known: 'wanted her to', target: 'volevo che lei' }, to: { known: 'I wanted to talk with her', target: 'volevo parlare con lei' } },
      { idx: 1, pos: 11, from: { known: 'I wanted her to know this', target: 'volevo che lei sapesse questo' }, to: { known: 'I wanted to talk with her about this', target: 'volevo parlare con lei di questo' } },
      { idx: 1, pos: 13, from: { known: 'I wanted her to understand what I was saying', target: 'volevo che lei capisse quello che stavo dicendo' }, to: { known: 'I wanted her to be here with me', target: 'volevo che lei fosse qui con me' } },
      { idx: 3, pos: 9, from: { known: 'do you need help dealing with that?', target: 'hai bisogno di aiuto a occuparti di quello?' }, to: { known: 'I want to help you deal with that', target: 'voglio aiutarti a occuparti di quello' } },
      { idx: 2, pos: 1, from: { known: 'help', target: 'aiutasse' }, to: { known: 'her to help you', target: 'che lei ti aiutasse' } },
      { idx: 2, pos: 2, from: { known: 'to help', target: 'aiutasse' }, to: { known: 'her to help you', target: 'che lei ti aiutasse' } },
      { idx: 2, pos: 3, from: { known: 'she help', target: 'aiutasse' }, to: { known: 'I wanted her to help you', target: 'volevo che lei ti aiutasse' } },
      { idx: 2, pos: 4, from: { known: 'I wanted her to help you', target: 'volevo che lei ti aiutasse' }, to: { known: 'I wanted her to help you today', target: 'volevo che lei ti aiutasse oggi' } },
      { idx: 2, pos: 5, from: { known: 'I hoped she would help', target: 'speravo che aiutasse' }, to: { known: 'I was hoping she would help you', target: 'speravo che lei ti aiutasse' } },
      { idx: 2, pos: 6, from: { known: 'I wanted her to help me understand', target: 'volevo che lei mi aiutasse a capire' }, to: { known: 'I wanted her to help you understand', target: 'volevo che lei ti aiutasse a capire' } },
      { idx: 2, pos: 7, from: { known: 'I thought that she would help us learn', target: 'pensavo che lei ci aiutasse a imparare' }, to: { known: 'I thought she would help you learn', target: 'pensavo che lei ti aiutasse a imparare' } },
      { idx: 2, pos: 9, from: { known: 'I hoped that she would help me to finish', target: 'speravo che lei mi aiutasse a finire' }, to: { known: 'I was hoping she would help you to finish', target: 'speravo che lei ti aiutasse a finire' } },
    ] } },

  { seed: 281, note: '"cominci" is indicative-shaped and its phrases use it as "you start"; the trigger LEGO grows to "prima che tu" instead of absorbing it',
    legos: { update: [
      { idx: 4, from: { known: 'before that', target: 'prima che' }, to: { known: 'before you', target: 'prima che tu', components: [c('prima che', 'before'), c('tu', 'you')] } },
      { idx: 5, from: { known: 'start', target: 'cominci' }, to: { known: 'you start', target: 'cominci', components: null } },
    ] },
    phrases: { update: [
      { idx: 4, pos: 1, from: { known: 'before that', target: 'prima che' }, to: { known: 'before you', target: 'prima che tu' } },
      { idx: 4, pos: 6, from: { known: 'I need to talk with you before it finishes', target: 'ho bisogno di parlare con te prima che finisca' }, to: { known: 'I want to finish before you start', target: 'voglio finire prima che tu cominci' } },
      { idx: 4, pos: 7, from: { known: 'I think you should finish before it is too late', target: 'penso che dovresti finire prima che sia troppo tardi' }, to: { known: 'can I finish my coffee before you start?', target: 'posso finire il mio caffè prima che tu cominci?' } },
      { idx: 4, pos: 9, from: { known: 'I see you before it finishes', target: 'ti vedo prima che finisca' }, to: { known: "I'll see you before you start", target: 'ti vedo prima che tu cominci' } },
      { idx: 5, pos: 3, from: { known: 'do you start', target: 'cominci' }, to: { known: 'you start', target: 'cominci' } },
    ] } },

  { seed: 292,
    legos: { update: [{ idx: 2, from: { known: "you'll be able", target: 'tu possa' }, to: { known: "I hope you'll be able to", target: 'spero che tu possa', components: [c('spero che', 'I hope'), c('tu possa', "you'll be able to")] } }] },
    phrases: { update: [
      { idx: 2, pos: 3, from: { known: "you'll be able", target: 'tu possa' }, to: { known: "I hope you'll be able to", target: 'spero che tu possa' } },
      { idx: 2, pos: 4, from: { known: "you'll be able", target: 'tu possa' }, to: { known: "I hope you'll be able to", target: 'spero che tu possa' } },
    ] } },

  { seed: 346,
    legos: { update: [{ idx: 1, from: { known: 'she knew', target: 'sapesse' }, to: { known: 'her to know', target: 'che lei sapesse', components: [c('che lei', 'that she'), c('sapesse', 'knew')] } }] },
    phrases: { update: [
      { idx: 1, pos: 1, from: { known: 'she knew', target: 'sapesse' }, to: { known: 'her to know', target: 'che lei sapesse' } },
    ] } },

  { seed: 419,
    legos: {
      update: [{ idx: 1, from: { known: 'the public', target: 'la gente' }, to: { known: 'people to like them', target: 'che la gente li apprezzi', components: [c('che', 'that'), c('la gente', 'people'), c('li apprezzi', 'like them')] } }],
      remove: [{ idx: 2, from: { known: 'to like them', target: 'li apprezzi' } }],
    },
    phrases: {
      update: [
        { idx: 1, pos: 1, from: { known: 'the public', target: 'la gente' }, to: { known: 'people to like them', target: 'che la gente li apprezzi' } },
        { idx: 1, pos: 2, from: { known: 'people want', target: 'la gente vuole' }, to: { known: 'people to like them', target: 'che la gente li apprezzi' } },
        { idx: 1, pos: 3, from: { known: 'people need to', target: 'la gente deve' }, to: { known: 'they want people to like them', target: 'vogliono che la gente li apprezzi' } },
        { idx: 1, pos: 4, from: { known: 'people want to travel', target: 'la gente vuole viaggiare' }, to: { known: 'if they want people to like them', target: 'se vogliono che la gente li apprezzi' } },
        { idx: 1, pos: 5, from: { known: 'people need to serve the community', target: 'la gente deve servire la comunità' }, to: { known: 'she wants people to like them', target: 'vuole che la gente li apprezzi' } },
        { idx: 1, pos: 6, from: { known: 'people wanted to follow us', target: 'la gente voleva seguirci' }, to: { known: 'we want people to like them', target: 'vogliamo che la gente li apprezzi' } },
        { idx: 1, pos: 7, from: { known: 'people want to lead the way', target: 'la gente vuole guidare il percorso' }, to: { known: 'they need to serve the community if they want people to like them', target: 'devono servire la comunità se vogliono che la gente li apprezzi' } },
        { idx: 1, pos: 8, from: { known: 'people want to win', target: 'la gente vuole vincere' }, to: { known: 'I want people to like them', target: 'voglio che la gente li apprezzi' } },
      ],
      remove: [
        { idx: 2, pos: 1, from: { known: 'them', target: 'li' } },
        { idx: 2, pos: 2, from: { known: 'appreciate', target: 'apprezzi' } },
        { idx: 2, pos: 3, from: { known: 'to like', target: 'li apprezzi' } },
        { idx: 2, pos: 4, from: { known: 'if people like them', target: 'se la gente li apprezza' } },
        { idx: 2, pos: 5, from: { known: 'she wants people to like them', target: 'vuole che la gente li apprezzi' } },
        { idx: 2, pos: 6, from: { known: 'if they want people to like them', target: 'se vogliono che la gente li apprezzi' } },
        { idx: 2, pos: 7, from: { known: 'they need to serve the community if they want people to appreciate them', target: 'devono servire la comunità se vogliono che la gente li apprezzi' } },
        { idx: 2, pos: 8, from: { known: 'we want people to appreciate them', target: 'vogliamo che la gente li apprezzi' } },
        { idx: 2, pos: 9, from: { known: 'the best way for people to appreciate them', target: 'il modo migliore perché la gente li apprezzi' } },
        { idx: 2, pos: 10, from: { known: 'they want people to appreciate them', target: 'vogliono che la gente li apprezzi' } },
      ],
    } },

  { seed: 497,
    legos: { update: [
      { idx: 2, from: { known: 'you seem to need to', target: 'tu abbia bisogno di' }, to: { known: 'that you need to', target: 'che tu abbia bisogno di', components: [c('che', 'that'), c('tu abbia bisogno', 'you need'), c('di', 'to')] } },
      { idx: 3, from: { known: 'that sounds as though', target: 'sembra che' }, to: { known: 'it seems', target: 'sembra', components: [c('sembra', 'it seems')] } },
    ] },
    phrases: {
      update: [
        { idx: 2, pos: 1, from: { known: 'you seem to need', target: 'tu abbia bisogno' }, to: { known: 'that you need', target: 'che tu abbia bisogno' } },
        { idx: 2, pos: 3, from: { known: 'you seem to need to', target: 'tu abbia bisogno di' }, to: { known: 'that you need to', target: 'che tu abbia bisogno di' } },
        { idx: 2, pos: 4, from: { known: 'you seem to need to sleep', target: 'tu abbia bisogno di dormire' }, to: { known: 'that you need to sleep', target: 'che tu abbia bisogno di dormire' } },
        { idx: 2, pos: 10, from: { known: 'he said it seems you need to talk', target: 'ha detto che tu abbia bisogno di parlare' }, to: { known: 'it seems you need to talk', target: 'sembra che tu abbia bisogno di parlare' } },
        { idx: 2, pos: 11, from: { known: 'you need to learn', target: 'tu abbia bisogno di imparare' }, to: { known: 'that you need to learn', target: 'che tu abbia bisogno di imparare' } },
        { idx: 3, pos: 1, from: { known: 'that sounds', target: 'sembra' }, to: { known: 'it seems', target: 'sembra' } },
        { idx: 3, pos: 3, from: { known: 'that sounds as though', target: 'sembra che' }, to: { known: 'it seems', target: 'sembra' } },
        { idx: 3, pos: 4, from: { known: 'that sounds as though you', target: 'sembra che tu' }, to: { known: 'it seems difficult', target: 'sembra difficile' } },
      ],
      remove: [
        { idx: 3, pos: 2, from: { known: 'as though', target: 'che' } },
      ],
    } },

  { seed: 506,
    legos: { update: [{ idx: 2, from: { known: 'we moved', target: 'ci trasferissimo' }, to: { known: 'before we moved', target: 'prima che ci trasferissimo', components: [c('prima che', 'before'), c('ci trasferissimo', 'we moved')] } }] },
    phrases: { update: [
      { idx: 2, pos: 1, from: { known: 'we', target: 'ci' }, to: { known: 'before', target: 'prima che' } },
      { idx: 2, pos: 2, from: { known: 'moved', target: 'trasferissimo' }, to: { known: 'we moved', target: 'ci trasferissimo' } },
      { idx: 2, pos: 3, from: { known: 'we moved', target: 'ci trasferissimo' }, to: { known: 'before we moved', target: 'prima che ci trasferissimo' } },
    ] } },

  { seed: 526,
    legos: { update: [{ idx: 3, from: { known: "you can't manage to", target: 'tu non riesca a' }, to: { known: "that you can't manage to", target: 'che tu non riesca a', components: [c('che', 'that'), c('tu non riesca', "you can't"), c('a', 'manage to')] } }] },
    phrases: { update: [
      { idx: 3, pos: 1, from: { known: "you can't", target: 'non riesca' }, to: { known: "that you can't", target: 'che tu non riesca' } },
      { idx: 3, pos: 3, from: { known: "you can't manage to", target: 'tu non riesca a' }, to: { known: "that you can't manage to", target: 'che tu non riesca a' } },
    ] } },

  { seed: 597,
    legos: { update: [{ idx: 3, from: { known: 'he has heard them', target: 'ne abbia sentite' }, to: { known: 'that he has heard them', target: 'che ne abbia sentite', components: [c('che', 'that'), c('ne', 'about it'), c('abbia sentite', 'has heard')] } }] },
    phrases: {
      update: [
        { idx: 3, pos: 1, from: { known: 'about it', target: 'ne' }, to: { known: 'that', target: 'che' } },
        { idx: 3, pos: 2, from: { known: 'has heard', target: 'abbia sentite' }, to: { known: 'about it', target: 'ne' } },
        { idx: 3, pos: 3, from: { known: 'he has heard them', target: 'ne abbia sentite' }, to: { known: 'that he has heard them', target: 'che ne abbia sentite' } },
      ],
      insert: [
        { idx: 3, id: `${COURSE}:S0597L03C03`, pos: 900, role: 'component', known: 'has heard', target: 'abbia sentite' },
      ],
    } },

  { seed: 655,
    legos: { update: [{ idx: 1, from: { known: 'that you’re doing', target: 'stia andando' }, to: { known: "that you're doing", target: 'che stia andando', components: [c('che', 'that'), c('stia andando', "you're doing")] } }] },
    phrases: { update: [
      { idx: 1, pos: 1, from: { known: 'that you’re doing', target: 'stia andando' }, to: { known: "that you're doing", target: 'che stia andando' } },
      { idx: 1, pos: 2, from: { known: "you're doing well", target: 'stia andando bene' }, to: { known: "that you're doing well", target: 'che stia andando bene' } },
      { idx: 1, pos: 7, from: { known: "I'm not sure how you're doing sir", target: 'non sono sicuro di come stia andando, signore' }, to: { known: "I'm not sure that you're doing well, sir", target: 'non sono sicuro che stia andando bene, signore' } },
    ] } },

  { seed: 668,
    legos: { update: [
      { idx: 1, from: { known: "you'll all be able to go", target: 'possiate andare tutti' }, to: { known: "that you'll all be able to go", target: 'che possiate andare tutti', components: [c('che possiate', 'that you all can'), c('andare', 'go'), c('tutti', 'all')] } },
      { idx: 2, from: { known: 'I hope that', target: 'spero che' }, to: { known: 'I hope', target: 'spero', components: [c('spero', 'I hope')] } },
    ] },
    phrases: {
      update: [
        { idx: 1, pos: 1, from: { known: 'that you all can', target: 'possiate' }, to: { known: 'that you all can', target: 'che possiate' } },
        { idx: 1, pos: 4, from: { known: "you'll all be able to go", target: 'possiate andare tutti' }, to: { known: "that you'll all be able to go", target: 'che possiate andare tutti' } },
        { idx: 1, pos: 7, from: { known: "I believe you'll all be able to go soon", target: 'credo che possiate andare presto tutti' }, to: { known: "I believe you'll all be able to go soon", target: 'credo che possiate andare tutti presto' } },
        { idx: 2, pos: 3, from: { known: 'I hope that', target: 'spero che' }, to: { known: 'I hope', target: 'spero' } },
      ],
      remove: [
        { idx: 2, pos: 2, from: { known: 'that', target: 'che' } },
      ],
    } },
];

const nk = (s) => (s || '').toLowerCase().trim().replace(/[.,!?;:]+$/, '').replace(/[’‘]/g, "'");
const nt = (s) => normalizeForContainment((s || '').replace(/[’‘]/g, "'"));
const words = (s) => normalizeForStorage((s || '').replace(/[’‘]/g, "'"), false).split(' ').filter(Boolean);
const same = (a, b) => nk(a) === nk(b);


// ─── THE SWEEP ─────────────────────────────────────────────────────────────────────────
// A LEGO is STRANDED when it carries a dependent verb form — imperfect subjunctive
// (-ssi/-sse/-ssimo/-ssero), or a present-subjunctive form from the irregular list — and
// its trigger sits in the seed BEFORE the LEGO and OUTSIDE it. Conditionals are detected
// but reported separately: a condizionale stands on its own and Kai's ruling does not reach
// it. This is the detector the 2026-09-28 census ran; it is exported so the test can show it
// naming seed 115 before the fix and silent after.
const TRIGGER = /\b(come se|se|che|prima che|perch[eé]|bench[eé]|sebbene|affinch[eé]|purch[eé]|a meno che|senza che|nel caso|qualora|magari|nonostante|malgrado|chiunque|qualunque|ovunque|dovunque|finch[eé]|dopo che)\b/;
const IMPERFECT_SUBJ = /\b\w+(ssi|sse|ssimo|ssero)\b/;
const CONDITIONAL = /\b\w+(rei|resti|rebbe|remmo|reste|rebbero)\b/;
const PRESENT_SUBJ = /\b(sia|siano|siate|abbia|abbiano|abbiate|faccia|facciano|possa|possano|possiate|debba|debbano|voglia|vogliano|vada|vadano|dica|dicano|stia|stiano|dia|diano|sappia|sappiano|esca|escano|venga|vengano|tenga|tengano|rimanga|riesca|riescano|piaccia|scelga|capisca|finisca|conosca|senta|veda|creda|serva|succeda|accada|apprezzi|arrivi|parli|trovi|pensi|lavori|studi|impari|cambi|aiuti|chiami|mangi|compri|ricordi|aspetti|inizi|cominci|continui|provi|passi|torni|resti|guardi|ascolti|porti|entri|paghi|parta|apra|dorma|scriva|legga|chieda|risponda|decida|perda|viva|corra|prometta|smetta|permetta|offra|preferisca)\b/;
const NOT_A_VERB = new Set(['prossimo', 'prossima', 'stesso', 'stessa', 'interesse', 'classe', 'promesse', 'grosse', 'rosse', 'adesso', 'spesso', 'successo', 'permesso', 'messo']);

/**
 * @param {Array<{seed_number:number,target_text:string}>} seeds
 * @param {Array<{seed_number:number,lego_index:number,target_text:string,known_text:string}>} legos
 * @returns {{read:number, hits:Array, conditionals:Array}}
 */
function findStrandedSubjunctives(seeds, legos) {
  const seedByNum = new Map(seeds.map(s => [s.seed_number, s]));
  const hits = [], conditionals = [];
  for (const l of legos) {
    const s = seedByNum.get(l.seed_number); if (!s) continue;
    const st = nt(s.target_text), lt = nt(l.target_text);
    const pos = (' ' + st + ' ').indexOf(' ' + lt + ' '); if (pos < 0) continue;
    const before = st.slice(0, Math.max(0, pos)).trim();
    if (!TRIGGER.test(before) || TRIGGER.test(lt)) continue;
    const verbish = lt.split(' ').filter(w => !NOT_A_VERB.has(w)).join(' ');
    const row = { legoId: `S${String(l.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`, seed: l.seed_number, target: l.target_text, known: l.known_text, before };
    if (IMPERFECT_SUBJ.test(verbish) || PRESENT_SUBJ.test(verbish)) hits.push(row);
    else if (CONDITIONAL.test(verbish)) conditionals.push(row);
  }
  return { read: legos.length, hits, conditionals };
}

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
}

async function readAll(sb, table, cols, filter) {
  const PAGE = 1000; let all = [], from = 0;
  for (;;) {
    let q = sb.from(table).select(cols).eq('course_code', COURSE).range(from, from + PAGE - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    all = all.concat(data || []);
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

/** Live state matches the spec's `from` on every row, or a list of reasons not to proceed. */
function guard(live) {
  const problems = [];
  for (const S of SEEDS) {
    if (DO_NOT_TOUCH.has(S.seed)) problems.push(`seed ${S.seed} is reserved by job #519·I`);
    const legos = live.legos.filter(l => l.seed_number === S.seed);
    const phrases = live.phrases.filter(p => p.seed_number === S.seed);
    for (const u of (S.legos?.update || [])) {
      const l = legos.find(x => x.lego_index === u.idx);
      if (!l) { problems.push(`${L(S.seed, u.idx).legoId} missing`); continue; }
      if (!same(l.known_text, u.from.known) || !same(l.target_text, u.from.target)) problems.push(`${L(S.seed, u.idx).legoId} is "${l.known_text}" / "${l.target_text}", expected "${u.from.known}" / "${u.from.target}"`);
    }
    for (const r of (S.legos?.remove || [])) {
      const l = legos.find(x => x.lego_index === r.idx);
      if (!l) { problems.push(`${L(S.seed, r.idx).legoId} (to remove) missing`); continue; }
      if (!same(l.known_text, r.from.known) || !same(l.target_text, r.from.target)) problems.push(`${L(S.seed, r.idx).legoId} is "${l.known_text}" / "${l.target_text}", expected "${r.from.known}" / "${r.from.target}"`);
      // every phrase under a LEGO being removed must be named in the spec (removed), or it would be orphaned
      const listed = new Set((S.phrases?.remove || []).filter(x => x.idx === r.idx).map(x => x.pos));
      for (const p of phrases.filter(p => p.lego_index === r.idx)) if (!listed.has(p.position)) problems.push(`${p.id} sits under ${L(S.seed, r.idx).legoId} (being removed) and is not listed`);
    }
    for (const kind of ['update', 'remove']) {
      for (const u of (S.phrases?.[kind] || [])) {
        const p = phrases.find(x => x.lego_index === u.idx && x.position === u.pos);
        if (!p) { problems.push(`seed ${S.seed} L${u.idx} p${u.pos} missing`); continue; }
        if (!same(p.known_text, u.from.known) || !same(p.target_text, u.from.target)) problems.push(`${p.id} is "${p.known_text}" / "${p.target_text}", expected "${u.from.known}" / "${u.from.target}"`);
        u.id = p.id;
      }
    }
    for (const i of (S.phrases?.insert || [])) {
      if (phrases.some(x => x.id === i.id)) problems.push(`${i.id} already exists`);
      if (phrases.some(x => x.lego_index === i.idx && x.position === i.pos)) problems.push(`seed ${S.seed} L${i.idx} p${i.pos} already taken`);
    }
  }
  return problems;
}

/** The course as it will be after the spec is applied (LEGOs and phrases). */
function project(live, spec = SEEDS) {
  const legos = live.legos.map(l => ({ ...l }));
  const phrases = live.phrases.map(p => ({ ...p }));
  for (const S of spec) {
    for (const u of (S.legos?.update || [])) {
      const l = legos.find(x => x.seed_number === S.seed && x.lego_index === u.idx); if (!l) continue;
      l.known_text = u.to.known; l.target_text = u.to.target; l.components = u.to.components;
      if (u.to.is_new !== undefined) l.is_new = u.to.is_new;
      if (u.to.type) l.type = u.to.type;
    }
    for (const r of (S.legos?.remove || [])) {
      const i = legos.findIndex(x => x.seed_number === S.seed && x.lego_index === r.idx); if (i >= 0) legos.splice(i, 1);
    }
    for (const u of (S.phrases?.update || [])) {
      const p = phrases.find(x => x.id === u.id); if (!p) continue; p.known_text = u.to.known; p.target_text = u.to.target;
    }
    for (const r of (S.phrases?.remove || [])) {
      const i = phrases.findIndex(x => x.id === r.id); if (i >= 0) phrases.splice(i, 1);
    }
    for (const ins of (S.phrases?.insert || [])) {
      phrases.push({ id: ins.id, seed_number: S.seed, lego_index: ins.idx, position: ins.pos, phrase_role: ins.role, known_text: ins.known, target_text: ins.target });
    }
  }
  return { legos, phrases };
}

/** The content checks, on the projected course. Returns blocking findings and informational notes. */
function contentChecks(live, proj) {
  const findings = [], notes = [];
  const seedByNum = new Map(live.seeds.map(s => [s.seed_number, s]));
  const touched = SEEDS.map(S => S.seed);

  // Word-level "taught by then": every word of every LEGO/component/seed at seed ≤ N.
  const taughtBy = (N) => {
    const set = new Set();
    for (const s of live.seeds) if (s.seed_number <= N) words(s.target_text).forEach(w => set.add(w));
    for (const l of proj.legos) if (l.seed_number <= N) {
      words(l.target_text).forEach(w => set.add(w));
      for (const comp of (l.components || [])) words(comp.target).forEach(w => set.add(w));
    }
    return set;
  };

  for (const N of touched) {
    const seed = seedByNum.get(N);
    const legos = proj.legos.filter(l => l.seed_number === N).sort((a, b) => a.lego_index - b.lego_index);
    const phrases = proj.phrases.filter(p => p.seed_number === N);
    const taught = taughtBy(N);

    // (1) every non-component phrase under a LEGO contains the LEGO (word-sequence containment)
    for (const l of legos) {
      const lt = ' ' + nt(l.target_text) + ' ';
      for (const p of phrases.filter(p => p.lego_index === l.lego_index && p.phrase_role !== 'component')) {
        if (!(' ' + nt(p.target_text) + ' ').includes(lt)) findings.push(`seed ${N} ${p.id} "${p.target_text}" does not contain its LEGO "${l.target_text}"`);
      }
      // component rows must be slices of their LEGO
      for (const p of phrases.filter(p => p.lego_index === l.lego_index && p.phrase_role === 'component')) {
        if (!lt.includes(' ' + nt(p.target_text) + ' ')) findings.push(`seed ${N} component ${p.id} "${p.target_text}" is not a slice of "${l.target_text}"`);
      }
      for (const comp of (l.components || [])) if (!lt.includes(' ' + nt(comp.target) + ' ')) findings.push(`seed ${N} ${L(N, l.lego_index).legoId} component "${comp.target}" is not a slice of "${l.target_text}"`);
    }
    // (2) no untaught words in any phrase of the seed
    for (const p of phrases) {
      const un = words(p.target_text).filter(w => !taught.has(w));
      if (un.length) findings.push(`seed ${N} ${p.id} "${p.target_text}" uses untaught word(s): ${un.join(', ')}`);
    }
    // (3) the seed still tiles: every seed word is in some LEGO (this seed's, or an earlier one)
    const earlier = new Set();
    for (const l of proj.legos) if (l.seed_number < N) { earlier.add(l.target_text); for (const comp of (l.components || [])) earlier.add(comp.target); }
    const tiling = checkTiling(seed.target_text, legos.map(l => ({ target: l.target_text, type: l.type, components: l.components })), COURSE, [...earlier], { seedNumber: N });
    if (!tiling.valid) findings.push(`seed ${N} no longer tiles: ${tiling.message}`);
    // (3b) this seed's own LEGOs must be contiguous slices of the seed and must not overlap
    const st = ' ' + nt(seed.target_text) + ' ';
    for (const l of legos) if (!st.includes(' ' + nt(l.target_text) + ' ')) findings.push(`seed ${N} ${L(N, l.lego_index).legoId} "${l.target_text}" is not a slice of the seed`);
    for (let i = 0; i < legos.length; i++) for (let j = i + 1; j < legos.length; j++) {
      const a = nt(legos[i].target_text), b = nt(legos[j].target_text);
      if ((' ' + a + ' ').includes(' ' + b + ' ') || (' ' + b + ' ').includes(' ' + a + ' ')) findings.push(`seed ${N} LEGOs overlap: "${legos[i].target_text}" / "${legos[j].target_text}"`);
    }
    notes.push(`seed ${N}: ${legos.length} LEGO(s), ${phrases.length} phrase(s), tiles=${tiling.valid}`);
  }

  // (4) course-wide LEGO ZUT on the projected LEGOs: same English → different Italian, where one side is new
  const changedLegoIds = new Set();
  for (const S of SEEDS) for (const u of (S.legos?.update || [])) changedLegoIds.add(L(S.seed, u.idx).legoId);
  const byKnown = new Map();
  for (const l of proj.legos) { const k = nk(l.known_text); if (!k) continue; if (!byKnown.has(k)) byKnown.set(k, []); byKnown.get(k).push(l); }
  for (const [k, rows] of byKnown) {
    const targets = new Set(rows.map(r => nt(r.target_text)));
    if (targets.size > 1 && rows.some(r => changedLegoIds.has(r.lego_id))) {
      findings.push(`LEGO ZUT fork on "${k}": ${rows.map(r => `${r.lego_id} "${r.target_text}"`).join(' | ')}`);
    }
  }
  return { findings, notes };
}

/** The live gates, on every new LEGO and phrase pair; hits against rows this tool itself replaces are not collisions. */
async function liveGates(sb, live) {
  const findings = [];
  const replacedTargets = new Set();
  for (const S of SEEDS) {
    for (const u of (S.legos?.update || [])) replacedTargets.add(nt(u.from.target));
    for (const r of (S.legos?.remove || [])) replacedTargets.add(nt(r.from.target));
    for (const u of (S.phrases?.update || [])) replacedTargets.add(nt(u.from.target));
    for (const r of (S.phrases?.remove || [])) replacedTargets.add(nt(r.from.target));
  }
  for (const S of SEEDS) {
    for (const u of (S.legos?.update || [])) {
      const live = await checkLegoConflict(sb, COURSE, u.to.known, u.to.target, S.seed);
      if (live.conflict === 'zut' && !replacedTargets.has(nt(live.existingTarget || live.existing_target || ''))) findings.push(`${L(S.seed, u.idx).legoId} "${u.to.known}" → "${u.to.target}": live LEGO gate — ${live.error}`);
    }
    // component rows are exempt from the known-side check (Tom, 2026-07-04) — they are literal glosses, not learner prompts
    const isComp = (id) => (live.phrases.find(p => p.id === id) || {}).phrase_role === 'component';
    const pairs = [...(S.phrases?.update || []).filter(u => !isComp(u.id)).map(u => ({ known: u.to.known, target: u.to.target })), ...(S.phrases?.insert || []).filter(i => i.role !== 'component').map(i => ({ known: i.known, target: i.target }))];
    if (!pairs.length) continue;
    const hits = (await checkPhraseZUT(sb, COURSE, pairs, S.seed)).filter(h => !replacedTargets.has(nt(h.existing_target)));
    for (const h of hits) findings.push(`seed ${S.seed} phrase "${h.known}" → "${h.new_target}": phrase gate — seed ${h.existing_seed} already says "${h.existing_target}"`);
  }
  return findings;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const sb = supa();
  console.log(`\n══════ ${COURSE}: stranded subjunctive LEGOs — ${SEEDS.length} seeds ══════`);

  const live = {
    seeds: await readAll(sb, 'course_seeds', 'seed_number, known_text, target_text, approved_at, status'),
    legos: await readAll(sb, 'course_legos', 'id, lego_id, seed_number, lego_index, type, is_new, known_text, target_text, components, presentation_audio_id, known_audio_id, target1_audio_id, target2_audio_id'),
    phrases: await readAll(sb, 'course_practice_phrases', 'id, seed_number, lego_index, position, phrase_role, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, qa_checked, metadata, lego_position'),
  };
  console.log(`read live: ${live.seeds.length} seeds, ${live.legos.length} LEGOs, ${live.phrases.length} phrases`);

  const sweepLive = findStrandedSubjunctives(live.seeds, live.legos);
  console.log(`sweep (live): ${sweepLive.read} LEGOs read, ${sweepLive.hits.length} stranded dependent-form hit(s), ${sweepLive.conditionals.length} conditional(s) reported not acted on`);
  for (const h of sweepLive.hits) console.log(`    ${h.legoId}  "${h.target}" = "${h.known}"   after "…${h.before.split(' ').slice(-3).join(' ')}"${DO_NOT_TOUCH.has(h.seed) ? '   (seed reserved by #519·I — left for later)' : ''}`);

  const problems = guard(live);
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) { console.error('\nBLOCKED — the live state is not what this tool was written against. Nothing written.'); process.exit(1); }
  console.log('guard: live state is exactly what this tool was written against');

  const proj = project(live);
  const sweepAfter = findStrandedSubjunctives(live.seeds, proj.legos);
  console.log(`sweep (after): ${sweepAfter.read} LEGOs, ${sweepAfter.hits.length} hit(s) remain${sweepAfter.hits.length ? ': ' + sweepAfter.hits.map(h => h.legoId).join(', ') : ''}`);
  const before = new Set(contentChecks(live, { legos: live.legos, phrases: live.phrases }).findings);
  const after = contentChecks(live, proj);
  const notes = after.notes;
  const findings = after.findings.filter(f => !before.has(f));
  const preexisting = after.findings.filter(f => before.has(f));
  for (const n of notes) console.log(`  ${n}`);
  for (const f of preexisting) console.log(`  pre-existing (not blocking, unchanged by this tool)  ${f}`);
  for (const f of findings) console.error(`  CONTENT  ${f}`);
  const gate = await liveGates(sb, live);
  for (const f of gate) console.error(`  ZUT  ${f}`);
  if (findings.length || gate.length) { console.error(`\nBLOCKED — ${findings.length} content finding(s), ${gate.length} gate finding(s). Nothing written.`); process.exit(1); }
  console.log('content checks: clean (containment, untaught words, tiling, overlap, LEGO ZUT); live gates: clean\n');

  // The plan, row by row.
  let nLegoUpd = 0, nLegoDel = 0, nPhrUpd = 0, nPhrDel = 0, nPhrIns = 0;
  for (const S of SEEDS) {
    console.log(`seed ${S.seed}${S.note ? `  (${S.note})` : ''}`);
    for (const u of (S.legos?.update || [])) { nLegoUpd++; console.log(`  ${L(S.seed, u.idx).legoId}  "${u.from.known}" / "${u.from.target}"  →  "${u.to.known}" / "${u.to.target}"`); }
    for (const r of (S.legos?.remove || [])) { nLegoDel++; console.log(`  ${L(S.seed, r.idx).legoId}  "${r.from.known}" / "${r.from.target}"  →  MERGED AWAY`); }
    for (const u of (S.phrases?.update || [])) { nPhrUpd++; console.log(`    ${u.id}  "${u.from.known}" / "${u.from.target}"  →  "${u.to.known}" / "${u.to.target}"`); }
    for (const r of (S.phrases?.remove || [])) { nPhrDel++; console.log(`    ${r.id}  "${r.from.known}" / "${r.from.target}"  →  DROPPED`); }
    for (const i of (S.phrases?.insert || [])) { nPhrIns++; console.log(`    ${i.id}  NEW ${i.role}  "${i.known}" / "${i.target}"`); }
  }
  console.log(`\ntotals: ${nLegoUpd} LEGOs rewritten, ${nLegoDel} merged away, ${nPhrUpd} phrases rewritten, ${nPhrDel} dropped, ${nPhrIns} added; ${SEEDS.length} seeds unapproved`);

  const out = { sweep: SWEEP, apply, at: new Date().toISOString(), ruling: RULING, spec: SEEDS, notes, preexisting, events: [], snapshots: [], drops: [] };
  if (!apply) {
    const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`);
    fs.writeFileSync(ev, JSON.stringify(out, null, 1));
    console.log(`\nDRY RUN — nothing written. Re-run with --apply. evidence: ${ev}`);
    return;
  }

  // ─── apply ────────────────────────────────────────────────────────────────
  const seedNumbers = SEEDS.map(S => S.seed);
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, seedNumbers, { reason: 'stranded-subjunctive-legos', notes: `${RULING}. Sweep ${SWEEP}. Undo: POST /api/build/redo-undo/${COURSE}.` });
  out.snapshots.push(snap);
  const eventId = await recordContentEdit(sb, {
    identity, courseCode: COURSE, surface: SURFACE, operation: 'expand-lego-to-trigger',
    scope: { seed_numbers: seedNumbers, lego_ids: SEEDS.flatMap(S => [...(S.legos?.update || []), ...(S.legos?.remove || [])].map(x => L(S.seed, x.idx).legoId)), rows: nLegoUpd + nLegoDel + nPhrUpd + nPhrDel + nPhrIns + SEEDS.length },
    detail: { ruling: RULING, snapshot_batch: snap.batchId, changes: SEEDS.map(S => ({ seed: S.seed, legos: S.legos, phrases: { update: (S.phrases?.update || []).map(u => ({ id: u.id, from: u.from, to: u.to })), remove: (S.phrases?.remove || []).map(r => ({ id: r.id, from: r.from })), insert: S.phrases?.insert || [] } })) },
  });
  out.events.push(eventId);
  console.log(`\nedit event ${eventId}; snapshot batch ${snap.batchId}`);

  const dropsFor = async (table, rowId, label) => {
    const { data: drops } = await sb.from('content_audio_link_drops').select('column_name, old_audio_id, new_audio_id, old_text, reason')
      .eq('table_name', table).eq('row_id', rowId).order('dropped_at', { ascending: false }).limit(8);
    for (const d of drops || []) if (d.old_audio_id) out.drops.push({ where: `${label}.${d.column_name}`, clip: d.old_audio_id, why: `${d.reason} (spoke "${d.old_text}")${d.new_audio_id ? ` → relinked to ${d.new_audio_id}` : ''}` });
  };

  const insertedRows = [];
  for (const S of SEEDS) {
    // phrases first: drops (frees the FK on a LEGO being merged away), then rewrites, then additions
    for (const r of (S.phrases?.remove || [])) {
      const { error } = await sb.from('course_practice_phrases').delete().eq('course_code', COURSE).eq('id', r.id);
      if (error) throw new Error(`${r.id}: ${error.message}`);
    }
    for (const u of (S.phrases?.update || [])) {
      const { error } = await sb.from('course_practice_phrases').update({
        known_text: u.to.known, target_text: u.to.target, word_count: u.to.target.length, lego_count: words(u.to.target).length,
        qa_checked: null, decomposition: null, display_tiling: null, last_edit_event_id: eventId,
      }).eq('course_code', COURSE).eq('id', u.id);
      if (error) throw new Error(`${u.id}: ${error.message}`);
      await dropsFor('course_practice_phrases', u.id, u.id);
    }
    for (const i of (S.phrases?.insert || [])) {
      const row = {
        id: i.id, course_code: COURSE, seed_number: S.seed, lego_index: i.idx, position: i.pos, phrase_role: i.role,
        known_text: i.known, target_text: i.target, word_count: i.target.length, lego_count: words(i.target).length,
        metadata: i.role === 'component' ? {} : { format: 'build_use' }, status: 'draft', introduce: i.role !== 'component',
        connected_lego_ids: [], lego_position: 'middle', last_edit_event_id: eventId,
      };
      const { error } = await sb.from('course_practice_phrases').insert(row);
      if (error) throw new Error(`${i.id}: ${error.message}`);
      insertedRows.push(row);
    }
    for (const u of (S.legos?.update || [])) {
      const patch = { known_text: u.to.known, target_text: u.to.target, components: u.to.components, last_edit_event_id: eventId };
      if (u.to.is_new !== undefined) patch.is_new = u.to.is_new;
      if (u.to.type) patch.type = u.to.type;
      const { error } = await sb.from('course_legos').update(patch).eq('course_code', COURSE).eq('seed_number', S.seed).eq('lego_index', u.idx);
      if (error) throw new Error(`${L(S.seed, u.idx).legoId}: ${error.message}`);
      const row = live.legos.find(l => l.seed_number === S.seed && l.lego_index === u.idx);
      await dropsFor('course_legos', row.id, L(S.seed, u.idx).legoId);
    }
    for (const r of (S.legos?.remove || [])) {
      const { error } = await sb.from('course_legos').delete().eq('course_code', COURSE).eq('seed_number', S.seed).eq('lego_index', r.idx);
      if (error) throw new Error(`${L(S.seed, r.idx).legoId}: ${error.message}`);
    }
    console.log(`seed ${S.seed} written`);
  }

  const { error: se } = await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).in('seed_number', seedNumbers);
  if (se) throw new Error(`seeds: ${se.message}`);
  console.log(`seeds ${seedNumbers.join(', ')} unapproved`);

  // Decompositions for the rows whose text moved (never blocks; NULL falls back to runtime alignment).
  try {
    const ids = SEEDS.flatMap(S => (S.phrases?.update || []).map(u => u.id)).concat(insertedRows.map(r => r.id));
    const { data: rows } = await sb.from('course_practice_phrases').select('*').eq('course_code', COURSE).in('id', ids);
    if (rows?.length) await decoratePhrasesWithDecomposition(sb, rows);
    console.log(`decompositions refreshed for ${rows?.length || 0} phrase rows`);
  } catch (e) { console.warn(`decomposition refresh skipped: ${e.message}`); }

  await refreshNow();
  console.log('course_round_index refreshed');

  // APPEND to the pending audio-pass request — never create a second, never overwrite.
  const { data: pending } = await sb.from('audio_pass_requests').select('id, reason, metadata').eq('course_code', COURSE).eq('status', 'pending').maybeSingle();
  if (pending) {
    const mine = `stranded-subjunctive LEGOs expanded to their triggers (Kai, job #520, 2026-09-28): ${nLegoUpd} LEGOs + ${nPhrUpd + nPhrIns} phrases re-texted across seeds ${seedNumbers.join(',')}; Italian slots rendered Azure by the job, English (known + presentation) slots left for the pass`;
    const { error: qe } = await sb.from('audio_pass_requests').update({
      reason: `${pending.reason} + ${mine}`,
      metadata: { ...pending.metadata, job520StrandedSubjunctive: { editEventId: eventId, seeds: seedNumbers } },
      updated_at: new Date().toISOString(),
    }).eq('id', pending.id);
    if (qe) throw new Error(`audio-pass append: ${qe.message}`);
    console.log(`audio pass: appended to pending request ${pending.id}`);
  } else {
    console.warn('no pending audio-pass request — queue one by hand with queue-audio-pass.cjs');
  }

  console.log(`\nAUDIO LINKS DROPPED — ${out.drops.length}, listed in full:`);
  for (const d of out.drops) console.log(`    ${d.where}  ${d.clip}  — ${d.why}`);
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`);
  fs.writeFileSync(ev, JSON.stringify(out, null, 1));
  console.log(`evidence: ${ev}`);
}

module.exports = { SEEDS, DO_NOT_TOUCH, guard, project, contentChecks, findStrandedSubjunctives };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
