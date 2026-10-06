'use strict';
// fra_for_eng job #329 — the PASS=sweep table: the forum findings and the hand-checked high-confidence rows of the
// known/target meaning sweep. Each entry: { from: [known, target], to: [known, target], rule, why } or
// { delete: true, from: [known, target], why }. Every row was read by hand against its seed and LEGOs.
module.exports = {
  // ── forum (learner spragga, posts 76/79; d/855c4751) ──
  S0114L03U04: { delete: true, from: ["I'm doing better than yesterday", "j'ai l'impression de faire mieux qu'hier"], why: 'forum: the French says "I feel as if I\'m doing better"; with the English fixed it is S0114L03U05 word for word, so the row goes' },
  S0114L03U08: { from: ["we learned something new, it's better than yesterday", "nous apprenons quelque chose de nouveau, c'est mieux qu'hier"], to: ["we're learning something new, it's better than yesterday", "nous apprenons quelque chose de nouveau, c'est mieux qu'hier"], rule: 'tense', why: 'past English over present French (nous apprenons)' },
  S0134L03B04: { from: ['I was working at something difficult', 'je travaille sur quelque chose de difficile'], to: ["I'm working at something difficult", 'je travaille sur quelque chose de difficile'], rule: 'tense', why: 'forum: past English over present French (je travaille); the French is the taught form' },
};
