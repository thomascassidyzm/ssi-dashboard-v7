'use strict';
// ita_for_eng — Kai's final rulings (3 Nov 2026) on the 30 rows job #36 held (review page d/c43bac16), applied by job #650
// through the #36 engine:  DATA=tools/course-optimization/ita-held-650-2026-11-03.data.cjs node tools/course-optimization/ita-mismatch-36-2026-11-02.cjs check|apply|render|verify <seeds.json>
// Rows: [id, class, [known now, target now], [known fix | null, target fix | null] | null (= delete), why]. Every row was read in full.
// NOT here: seeds 71 and 311 (re-cut and resubmitted through POST /api/course/ita_for_eng/edit-cascade — new LEGO order / new LEGO),
// S0526L02 (made not-new, its rows rehomed), and the KEEP rulings (160 U01/U06, 292 L02U01, 629 U01/U04/U07), which change nothing.
const AGENT = 'ita-held-30-apply (job #650)';
const PURPOSE = "job #650 ita_for_eng: Kai's 3 Nov rulings on the 30 held #36 rows — refill of the slots these edits emptied";

// Seed 358 (ruling 8): -lo is heard attached to an infinitive from S0061L02 dirlo on (farlo 92, cercarlo 171, scoprirlo 251,
// metterlo 314); -li never is before 358 (only averle, feminine, at 183) — so "reach it" becomes raggiungerlo and the two
// "reach them" rows are deleted, per Kai's "if truly never heard, DELETE".
const STEM_CLITIC = { raggiungerlo: { infinitive: 'raggiungere', taughtAt: 'S0061L02' } };

const SEED_FIXES = [
  [26, 'kai-650', ["I like feeling as if I'm nearly ready to go", 'mi piace sentirmi quasi pronto ad andare'], ['I like feeling nearly ready to go', null], 'ruling 1: the English had no "come se" in the Italian; Italian unchanged'],
  // ruling 14: "very" is not in the Italian (una buona idea); very | molto is taught from S0071L03 on (la verità è molto importante…)
  [571, 'kai-650', ["I'm not convinced that would be a very good idea", 'non sono convinto che sarebbe una buona idea'], ["I'm not convinced that would be a good idea", null], 'ruling 14: drop "very" (S0571L02U01 already reads without it)'],
];

const LEGO_FIXES = [
  // ruling 17: "since when" is a question in English; da quando here is the conjunction "since" (cf. S0146L02 since we tried… | da quando…)
  ['S0619L02', 'kai-650', ['since when', 'da quando'], ['since', null], 'ruling 17: gloss since when → since'],
];

const FIXES = [
  // ruling 4 (d/297ed867): B03 had "about it" with no extra Italian — it now carries "now | adesso"
  ['S0238L01B03', 'kai-650', ['he wanted you to tell me about it', 'voleva che tu me lo dicessi'], ['he wanted you to tell me now', 'voleva che tu me lo dicessi adesso'], 'ruling 4'],
  ['S0237L01B03', 'kai-650', ['he wanted me to tell you about it', 'voleva che te lo dicessi'], ['he wanted me to tell you now', 'voleva che te lo dicessi adesso'], 'ruling 4'],
  // ruling 6
  ['S0302L01U01', 'kai-650', ["she doesn't want to live somewhere else", 'non vuole vivere da qualche parte'], null, 'ruling 6: somewhere else ≠ da qualche parte — delete'],
  ['S0302L02U06', 'kai-650', ['do you want to live in a city or somewhere else?', 'vuoi vivere in una città o da qualche parte?'], null, 'ruling 6: delete'],
  // ruling 8
  ['S0358L01U04', 'kai-650', ["I'm sure she couldn't reach it", 'sono sicuro che non poteva raggiungere'], [null, 'sono sicuro che non poteva raggiungerlo'], 'ruling 8: -lo heard attached before 358'],
  ['S0358L01U05', 'kai-650', ['she said she needed to run to reach them', 'ha detto che doveva correre per raggiungere'], null, 'ruling 8: -li never heard attached before 358 — delete'],
  ['S0358L01U06', 'kai-650', ["even if she wanted to, she couldn't reach them", 'anche se volesse, non potrebbe raggiungere'], null, 'ruling 8: -li never heard attached before 358 — delete'],
  // rulings 9-12
  ['S0387L01B03', 'kai-650', ["I didn't think she would", 'non pensavo che lei'], null, 'ruling 9: delete'],
  ['S0413L04U02', 'kai-650', ['she said we could fall if too close to the edge', 'ha detto che potevamo cadere troppo vicino al bordo'], null, 'ruling 10: delete'],
  ['S0464L02U05', 'kai-650', ['I told her once but she was somewhere else', 'le ho detto una volta ma lei era da qualche parte'], null, 'ruling 11: delete'],
  ['S0501L04B03', 'kai-650', ['trust you to play without arguing', 'fidarmi che giocare senza litigare'], null, 'ruling 12: delete'],
  // ruling 13: the LEGO gloss "any longer" is right in its basket (every row is negated or a question); only U05 was positive.
  // A negated frame keeps the LEGO as taught: non è possibile is heard from S0526L03U05 on.
  ['S0563L02U05', 'kai-650', ["it's important to keep going a little longer", 'è importante continuare ancora a lungo'], ["it's not possible to keep going any longer", 'non è possibile continuare ancora a lungo'], 'ruling 13: positive "any longer" → a negated frame; LEGO kept'],
  // ruling 15: appena = just is taught before 590 (S0224L01 ha appena cominciato, S0589L02 aveva appena visto). "leaving" (not
  // Kai's "leave") so the English still holds the L02 LEGO "I saw leaving".
  ['S0590L02U02', 'kai-650', ['I saw the last bus leaving just now', "ho visto l'ultimo autobus partire adesso"], ['I just saw the last bus leaving', "ho appena visto l'ultimo autobus partire"], 'ruling 15'],
  ['S0597L04U04', 'kai-650', ['there were a hundred people', 'erano cento persone'], [null, "c'erano cento persone"], 'ruling 16'],
  // ruling 17 + its knock-on: every row under S0619L02 that said "since when"
  ['S0619L02U04', 'kai-650', ['how long since when we first met', 'da quando ci siamo visti per la prima volta'], ['since we first met', null], 'ruling 17'],
  ['S0619L02B01', 'kai-650', ['since when', 'da quando'], ['since', null], 'ruling 17 knock-on (LEGO row)'],
  ['S0619L02B02', 'kai-650', ['since when we saw each other', 'da quando ci siamo visti'], ['since we saw each other', null], 'ruling 17 knock-on'],
  ['S0619L02B03', 'kai-650', ["it's been a long time since when", 'è passato molto tempo da quando'], ["it's been a long time since", null], 'ruling 17 knock-on'],
  ['S0619L02U02', 'kai-650', ["it's been a long time since when we spoke", 'è passato molto tempo da quando abbiamo parlato'], ["it's been a long time since we spoke", null], 'ruling 17 knock-on'],
  ['S0619L02U03', 'kai-650', ["I've been here since when you left", 'sono qui da quando sei andato via'], ["I've been here since you left", null], 'ruling 17 knock-on'],
  ['S0619L02U05', 'kai-650', ["it's been a long time since when we started learning", 'è passato molto tempo da quando abbiamo cominciato a imparare'], ["it's been a long time since we started learning", null], 'ruling 17 knock-on'],
];

module.exports = { AGENT, PURPOSE, STEM_CLITIC, SEED_FIXES, LEGO_FIXES, FIXES };
