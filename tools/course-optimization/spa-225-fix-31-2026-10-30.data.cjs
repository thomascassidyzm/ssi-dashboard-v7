'use strict';
// tools/course-optimization/spa-225-fix-31-2026-10-30.data.cjs — spa_for_eng: the rows audit #225·AB (d/7528fbc9) found
// where an applied fix (#425 Deborah 129, #164 held 49) CAUSED or KEPT a canon problem, settled under Kai's rule of
// 30 Oct: reword with taught material if the reword is valid for the LEGO (LEGO on both sides, English points to
// everything in the target, no basket duplicate, no ZUT clash), else delete (basket floor respected). Patterns a fix
// applied unevenly (items 50, 67, "this evening", one "pienso") are carried to the rows they missed.
// Every row is [id, known, target] AFTER the change (null keeps that side); [id] alone deletes it. The tool reads the
// live course for the BEFORE text and refuses a row that has drifted.
// NOT here, by the brief: the audit's 31 older breaks (#11), stale tiling data, Kai's open calls ("you think"
// pensar/crees; the S0125L02 / S0151L02 fue/era baskets), anything #223/#237 changed.

const COURSE = 'spa_for_eng';
const APPROVAL = 'kai:2026-10-30:Kai ruled reword-if-valid-else-delete; audit #225 fixes';

// #3: #425 made seed 115 / S0115L04 "no me siento listo…" but kept the English "as if I'm" (= como si, taught at 26).
const NEW_115 = "I don't feel ready to have a conversation";
const SEEDS = [[115, 3, NEW_115, null]];
const LEGOS = [{ item: 3, lego_id: 'S0115L04', set: { known_text: NEW_115 } }];
const AS_IF_115 = ['B01', 'B02', 'B03', 'B04', 'B05', 'U01', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07', 'U08', 'U09', 'U10', 'U12', 'U13', 'U14', 'U15']
  .map((s) => `S0115L04${s}`);

const PHRASES = {
  // #1 a pronoun joined to a verb before the course teaches it (-la never; las + verb only from 183)
  1: [
    ['S0181L04U05'], // "…because the doctor wants to see her · quiere verla": "ver a mi madre" again is stilted; 14 USE → 13
    ['S0132L03U18', 'This was less exciting than what I thought when I was trying to listen', 'Esto fue menos emocionante de lo que pensé cuando estaba intentando escuchar'],
    ['S0182L02U09'], // also two sentences (#2); not-new LEGO, not played; "can you see them" would need -las again
    // English "them" → Spanish "mis llaves" is this basket's own convention (U07, U08, U13)
    ['S0182L02U15', null, 'Mi amigo va a encontrar mis llaves porque necesito mis llaves hoy'],
  ],
  // #2 two sentences in one phrase (P20), joined into one in the shape Deborah accepted for S0161L01U15
  2: [
    ['S0061L02U13', 'We want to practise, could you explain that?', 'Queremos practicar, ¿podrías explicar eso?'],
    ['S0161L01U12', 'I want to listen, can you talk about what you want?', 'Quiero escuchar, ¿puedes hablar de lo que quieres?'],
    ['S0185L02U05', 'Before you leave, can I ask you where you left your book at work?', 'Antes de que te vayas, ¿puedo preguntarte dónde dejaste tu libro en el trabajo?'],
  ],
  3: AS_IF_115.map((id) => [id, 'replace-as-if', null]),
  // #4 #164's reword lost its LEGO "that was not | eso no era"
  4: [['S0151L02U05', 'That was not possible before I started learning', 'Eso no era posible antes de empezar a aprender']],
  // #5 pienso→creo left "no creo que" + indicative/conditional; the negation moves to the verb instead.
  // "we should not" (not "shouldn't") so the English still holds the LEGO "we should".
  5: [
    ['S0275L01U07', 'I think I do not need longer because I am already ready', 'Creo que no necesito más tiempo porque ya estoy listo'],
    ['S0403L01U02', 'I think we should not go', 'creo que no deberíamos ir'],
  ],
  // #6 item 50: "we … what I want to say" — #425 removed six; the same pattern carried to the eight it missed
  50: [
    ['S0106L01U02', 'I think we need to feel happy with what we want to say', 'Creo que necesitamos sentirnos contentos con lo que queremos decir'],
    ['S0106L02U09', 'I think we just need to remember what we want to say', 'Creo que solo necesitamos recordar lo que queremos decir'],
    ['S0106L03U08', 'We want to work to understand what we want to say', 'Queremos trabajar para entender lo que queremos decir'],
    ['S0107L01U04', 'We were hoping to understand what we want to say', 'Esperábamos entender lo que queremos decir'],
    ['S0107L01U08', 'I think we were hoping to remember what we want to say', 'Creo que esperábamos recordar lo que queremos decir'],
    ['S0107L02U06', 'I think we need to see what we want to say', 'Creo que necesitamos ver lo que queremos decir'],
    ['S0107L02U10', 'We need to see what we want to say in Spanish', 'Necesitamos ver lo que queremos decir en español'],
    ['S0107L02U13', 'We just need to see what we want to say here', 'Solo necesitamos ver lo que queremos decir aquí'],
  ],
  // #7 item 67: conocía for a fact/way — #164 deleted three; deleting these too would leave 3 USE (< 4), so they now
  // know a PERSON (the LEGO's own sense: B04/B05 "someone I used to know"), with sabía (105) for the knowing-how.
  67: [
    ['S0128L04U02', 'She used to know someone who knew what she wanted to say', 'Ella conocía a alguien que sabía lo que quería decir'],
    ['S0128L04U03', 'I used to know someone who knew how to do this well', 'Conocía a alguien que sabía cómo hacer esto bien'],
    ['S0128L04U09', 'He used to know someone who was very good at this, and I want to learn from him', 'Él conocía a alguien que era muy bueno en esto, y quiero aprender de él'],
  ],
  // #8 "this evening" is esta tarde in 41 rows; these three kept esta noche, so their English becomes "tonight"
  // (as #425 did for the S0052 rows)
  8: [
    ['S0181L01U01', 'I need to take my friend to the restaurant tonight', null],
    ['S0182L01U11', 'I would like to take my things to the restaurant tonight', null],
    ['S0243L03U07', "He said he didn't want to eat anything tonight", null],
  ],
  // #9 the one "I think · pienso" the swap missed (a trailing space hid it)
  9: [['S0197L03U04', null, 'Él trabaja de una manera muy interesante, creo']],
};

// The S0115L04 English edit replaces only the "as if I'm" span; everything else in each row stays as it is.
const replaceAsIf = (known) => known.replace(/\bI don't feel as if I'm ready\b/, "I don't feel ready");

module.exports = { COURSE, APPROVAL, SEEDS, LEGOS, PHRASES, replaceAsIf, AS_IF_115 };
