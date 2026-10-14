'use strict';
// deu_for_eng job #489 — Kai's could rule for German (14 Oct 2026; canon K45, after K35/K40).
// könnte vs konnte is MEANING, not gender: "could" alone (possibility, request, "if", "I think / I'm sure / do you
// think … could") → könnte; konnte only for could reporting the past, and then ALWAYS with an explicit past marker in
// the same sentence ("he said he couldn't", "yesterday", "last week", "when (als)", "I thought", "had to", "wanted").
// THE konnte LEGO is S0311L01, grown in Kai's shape: "he said he couldn't | er hat gesagt, er konnte nicht".
// Pronouns are swapped in some rows (er/ich/du with könnte, sie/ich with konnte) so neither form reads as gendered.
//
// Each entry: [id, tranche, action, to, rule, why]
//   id       'seed:311' | LEGO id (S0311L01) | phrase id (S0311L01B02, components S0311L01C01)
//   tranche  1 = applied by job #489 (seeds 310, 311, 313, 315, 316 — the debut, inside the 5k-char cap)
//            2 = planned, same rule, waiting on the next spend OK (seeds 148, 312, 314 and rows after seed 318 — tranche 1
//                alone came to ~4.9k chars, tranche 1+these to 6.3k, over the job's 5k stop)
//   action   fix (to = [english, german]; null keeps a side) | delete (practice phrase only, never a LEGO)
//   LEGO fixes may carry extra fields as a 7th element: { components, intro }
// Rows that need Kai's ruling are NOT here: they are in HELD below, and the review page lists them one at a time.
const T1 = 1, T2 = 2;
const ROWS = [
  // ── seed 311: THE konnte LEGO (K40 — the frame that selects konnte goes inside the LEGO) ──
  ['seed:311', T1, 'fix', ["he said he couldn't believe the three most important facts", 'er hat gesagt, er konnte die drei wichtigsten Fakten nicht glauben'], 'K45/K40', 'Kai 14 Oct: "he said he could" is THE LEGO, shaped to the seed — the seed now carries the frame. V2 report (no dass) keeps the LEGO inside the 8-syllable cap (L3); er hat gesagt, dass er nicht konnte is 9'],
  ['S0311L01', T1, 'fix', ["he said he couldn't", 'er hat gesagt, er konnte nicht'], 'K45/K40/L25', 'was "he could not | er konnte nicht" next to S0310L01 "she could | sie könnte" — the pair learners read as gendered. Grown to the frame that selects konnte; new intro (O13)',
    { components: [{ known: 'he said', target: 'er hat gesagt' }, { known: "he couldn't", target: 'er konnte nicht' }],
      intro: "The German for: 'he said he couldn't', as in — 'he said he couldn't believe the three most important facts', is:" }],
  ['S0311L01C01', T1, 'fix', ['he said', 'er hat gesagt'], 'K45', 'component tile follows the grown LEGO'],
  ['S0311L01C02', T1, 'fix', ["he couldn't", 'er konnte nicht'], 'K45', 'component tile follows the grown LEGO (the K35 precedent keeps the modal tile)'],
  ['S0311L01B01', T1, 'fix', ["he said he couldn't", 'er hat gesagt, er konnte nicht'], 'K45', 'build carries the LEGO'],
  ['S0311L01B02', T1, 'fix', ["he said he couldn't go", 'er hat gesagt, er konnte nicht gehen'], 'K45', 'frame added'],
  ['S0311L01B03', T1, 'fix', ["he said he couldn't speak German", 'er hat gesagt, er konnte nicht Deutsch sprechen'], 'K45', 'frame added'],
  ['S0311L01U01', T1, 'fix', ["he said he couldn't speak German with you", 'er hat gesagt, er konnte nicht mit dir Deutsch sprechen'], 'K45', 'frame added'],
  ['S0311L01U02', T1, 'fix', ["he said he couldn't work from home yesterday", 'er hat gesagt, er konnte gestern nicht von zu Hause aus arbeiten'], 'K45', 'frame + time (gestern R100)'],
  ['S0311L01U03', T1, 'fix', ["he said he couldn't say that", 'er hat gesagt, er konnte das nicht sagen'], 'K45', '"konnte nichts" did not contain the LEGO\'s konnte … nicht; "that" keeps nicht'],
  ['S0311L01U04', T1, 'fix', ["he said he couldn't live here", 'er hat gesagt, er konnte hier nicht leben'], 'K45', 'frame added; hier before nicht (natural order)'],
  ['S0311L01U05', T1, 'fix', ["he said he couldn't show you that", 'er hat gesagt, er konnte dir das nicht zeigen'], 'K45', 'frame added; "nichts" → "das … nicht" so the LEGO is contained'],
  ['S0311L01U06', T1, 'fix', ["he said he couldn't write the story", 'er hat gesagt, er konnte die Geschichte nicht schreiben'], 'K45', 'frame added; "keine Geschichte" → "die Geschichte … nicht" so the LEGO is contained'],
  ['S0311L02B03', T1, 'fix', ["he said he couldn't believe it", 'er hat gesagt, er konnte es nicht glauben'], 'K45/K40', 'a build that isolated "nicht glauben konnte" is re-anchored on the frame'],
  ['S0311L02U01', T1, 'fix', ["she said she couldn't believe that", 'sie hat gesagt, sie konnte das nicht glauben'], 'K45', 'frame added; she + konnte (pronoun swap)'],
  ['S0311L03U03', T1, 'fix', ["I said I couldn't believe the three most important", 'ich habe gesagt, ich konnte die drei wichtigsten nicht glauben'], 'K45', 'frame added; ich + konnte (pronoun swap; ich habe gesagt R581)'],
  ['S0311L04U01', T1, 'delete', null, 'G', 'uncontracted twin of the seed-sentence row U07 in the same basket, same meaning'],
  ['S0311L04U02', T1, 'fix', ["yesterday I couldn't believe these facts", 'gestern konnte ich diese Fakten nicht glauben'], 'K45', 'past marker gestern (another past frame, ich)'],
  ['S0311L04U07', T1, 'fix', ["he said he couldn't believe the three most important facts", 'er hat gesagt, er konnte die drei wichtigsten Fakten nicht glauben'], 'P26', 'the seed-sentence row follows the seed'],
  // ── seed 310: könnte, with other persons ──
  ['S0310L03U04', T1, 'fix', ['I think he could write a story', 'ich denke, dass er eine Geschichte schreiben könnte'], 'K45', 'pronoun swap: he + könnte'],
  ['S0310L04B03', T1, 'fix', ['he could write something about that man', 'er könnte etwas über diesen Mann schreiben'], 'K45', 'pronoun swap: he + könnte'],
  // ── seed 312 ──
  ['S0312L01U01', T2, 'fix', ['I could make use of this', 'ich könnte das benutzen'], 'K45', 'pronoun swap: ich + könnte'],
  ['S0312L01U06', T2, 'fix', ["she said she couldn't make use of this", 'sie hat gesagt, sie konnte das nicht benutzen'], 'K45', 'frame added; she + konnte'],
  ['S0312L02B03', T2, 'fix', ['he could use the other room', 'er könnte das andere Zimmer benutzen'], 'K45', 'pronoun swap: he + könnte'],
  ['S0312L02U03', T2, 'fix', ["yesterday she couldn't use the other room", 'gestern konnte sie das andere Zimmer nicht benutzen'], 'K45', 'past marker; a said-frame here would stand against seed 312\'s held "she said that she could … tomorrow night | könnte"'],
  ['S0312L03U06', T2, 'fix', ['I could use it tomorrow night', 'ich könnte es morgen Abend benutzen'], 'K45/K9', '"she couldn\'t believe this tomorrow night | konnte" mixed a past form with a future time; now könnte + future, ich'],
  // ── seed 313 ──
  ['S0313L01B02', T1, 'fix', ["he said he couldn't watch", 'er hat gesagt, er konnte nicht schauen'], 'K45/K40', 'build that isolated "nicht schauen konnte" re-anchored on the frame'],
  ['S0313L01B03', T1, 'fix', ["she said she couldn't watch", 'sie hat gesagt, sie konnte nicht schauen'], 'K45', 'frame added; she + konnte'],
  ['S0313L01U01', T1, 'fix', ["yesterday he couldn't watch that", 'gestern konnte er das nicht schauen'], 'K45', 'past marker'],
  ['S0313L01U06', T1, 'fix', ["last week I couldn't watch this", 'letzte Woche konnte ich das nicht schauen'], 'K45', 'past marker (letzte Woche R152); ich + konnte'],
  ['S0313L02B02', T1, 'fix', ["he said he couldn't watch all five games", 'er hat gesagt, er konnte nicht alle fünf Spiele schauen'], 'K45/K40', 'build that isolated konnte re-anchored on the frame'],
  ['S0313L02B03', T1, 'fix', ["she said she couldn't watch all five games", 'sie hat gesagt, sie konnte nicht alle fünf Spiele schauen'], 'K45', 'frame added; she + konnte'],
  ['S0313L02U01', T1, 'delete', null, 'G', 'uncontracted twin of the seed-sentence row U07 in the same basket, same meaning'],
  ['S0313L02U04', T1, 'fix', ["yesterday she couldn't watch all five games", 'gestern konnte sie nicht alle fünf Spiele schauen'], 'K45/K9', '"she could not believe all five games" was not a sentence; past marker added'],
  ['S0313L02U06', T1, 'fix', ["last week I couldn't watch all five games", 'letzte Woche konnte ich nicht alle fünf Spiele schauen'], 'K45', 'past marker'],
  // ── seed 314 ──
  ['S0314L01U01', T2, 'fix', ['he could lay something there', 'er könnte etwas dort legen'], 'K45', 'pronoun swap: he + könnte'],
  ['S0314L01U06', T2, 'fix', ["yesterday she couldn't lay it there", 'gestern konnte sie es dort nicht legen'], 'K45', 'past marker'],
  ['S0314L02U03', T2, 'fix', ['you could lay the facts on the table', 'du könntest die Fakten auf den Tisch legen'], 'K45', 'pronoun swap: du + könntest (taught S0061L01)'],
  ['S0314L02U06', T2, 'fix', ["he said he couldn't lay it on the table", 'er hat gesagt, er konnte es nicht auf den Tisch legen'], 'K45', 'frame added'],
  // ── seed 315: I think + could → könnte (Kai) ──
  ['seed:315', T1, 'fix', [null, 'Ich denke, dass er sich das Auto, das er wollte, nicht leisten könnte'], 'K45', 'Kai: "I think + could → könnte". English unchanged'],
  ['S0315L03U07', T1, 'fix', [null, 'Ich denke, dass er sich das Auto, das er wollte, nicht leisten könnte'], 'P26', 'the seed-sentence row follows the seed'],
  ['S0315L03U01', T1, 'delete', null, 'G', 'uncontracted twin of the seed-sentence row U07 in the same basket, same meaning'],
  ['S0315L01B02', T1, 'fix', ["couldn't afford", 'sich nicht leisten könnte'], 'K45', 'bare could(n\'t) → könnte, as the seed now says'],
  ['S0315L01B03', T1, 'fix', ["he couldn't afford it", 'er könnte sich das nicht leisten'], 'K45', 'bare could(n\'t) → könnte'],
  ['S0315L01U01', T1, 'fix', ["last week she couldn't afford this", 'letzte Woche konnte sie sich das nicht leisten'], 'K45', 'kept konnte, past marker added; she + konnte'],
  ['S0315L01U02', T1, 'fix', ["I think he couldn't afford it", 'ich denke, dass er sich das nicht leisten könnte'], 'K45', 'I think + could → könnte'],
  ['S0315L02B03', T1, 'fix', ["couldn't afford the car", 'sich das Auto nicht leisten könnte'], 'K45', 'bare could(n\'t) → könnte'],
  ['S0315L02U01', T1, 'fix', ["he said he couldn't afford the car", 'er hat gesagt, er konnte sich das Auto nicht leisten'], 'K45', 'kept konnte, frame added'],
  ['S0315L03B03', T1, 'fix', ["he couldn't afford the car that he wanted", 'er könnte sich das Auto, das er wollte, nicht leisten'], 'K45', 'bare could(n\'t) → könnte, as the seed now says'],
  ['S0315L03U05', T1, 'fix', ["she said she couldn't afford the car that he wanted", 'sie hat gesagt, sie konnte sich das Auto, das er wollte, nicht leisten'], 'K45/K9', '"I could not believe the car that he wanted" was not a sentence; frame + she + konnte'],
  // ── seed 316: do you think + could → könnte ──
  ['S0316L01U02', T1, 'fix', ["do you think that he couldn't believe it?", 'denkst du, dass er das nicht glauben könnte?'], 'K45', 'do you think + could → könnte (one frame, one form — S0316L01U01 already says könnte)'],
  ['S0316L01U04', T1, 'fix', [null, 'denkst du, dass er sich das Auto leisten könnte?'], 'K45', 'do you think + could → könnte; he + könnte'],
  ['S0316L01U06', T1, 'fix', [null, 'denkst du, dass er das andere Zimmer benutzen könnte?'], 'K45', 'do you think + could → könnte; he + könnte'],
  ['S0316L02U01', T1, 'fix', ['he could bring along something', 'er könnte etwas mitbringen'], 'K45', 'pronoun swap: he + könnte'],
  ['S0316L02U06', T2, 'fix', ["yesterday she couldn't bring anything along", 'gestern konnte sie nichts mitbringen'], 'K45', 'past marker; English made natural'],
  ['S0316L03U04', T1, 'fix', ["she said she couldn't bring her brother", 'sie hat gesagt, sie konnte ihren Bruder nicht mitbringen'], 'K45', 'frame added'],
  ['S0316L04U06', T1, 'delete', null, 'K9', '"I could not believe she could bring her brother on Monday" mixes both forms in one garbled sentence; 7 other USE rows stay'],
  // ── seed 148: "when I couldn't answer | als ich nicht antworten konnte" is already K40-shaped (als); its basket is not ──
  ['S0148L02B01', T2, 'fix', ["when I couldn't", 'als ich nicht konnte'], 'K45/K40', 'bare "I could not | konnte" → the LEGO\'s own trigger als'],
  ['S0148L02B02', T2, 'fix', ['when I could do it', 'als ich es machen konnte'], 'K45/K40', 'bare positive "I could do it | konnte" → als'],
  ['S0148L02B03', T2, 'fix', ['when I could see it', 'als ich es sehen konnte'], 'K45/K40', 'bare positive "I could see it | konnte" → als'],
  ['S0148L02U10', T2, 'fix', ["yesterday she couldn't explain it", 'gestern konnte sie es nicht erklären'], 'K45', 'past marker'],
  ['S0148L02U11', T2, 'fix', ["he couldn't help me yesterday", 'er konnte mir gestern nicht helfen'], 'K45', 'past marker'],
  ['S0148L02U13', T2, 'fix', ["I couldn't speak with you yesterday", 'ich konnte gestern nicht mit dir sprechen'], 'K45', '"I could speak with you | konnte" had no past marker and positive one-off "could" is not natural English'],

  // ═══ TRANCHE 2 — same rule, after seed 318; waits for the next spend OK ═══
  ['S0212L01U16', T2, 'fix', ["yesterday he couldn't explain to me why asking for it is better than waiting", 'gestern konnte er mir nicht erklären, warum bitten besser ist als warten'], 'K45', 'past marker'],
  ['S0319L02U04', T2, 'fix', ["I couldn't believe that she had to move", 'ich konnte nicht glauben, dass sie ziehen musste'], 'K45', 'past marker (musste R551)'],
  ['S0320L02U05', T2, 'fix', ["I couldn't believe that he didn't want another television", 'ich konnte nicht glauben, dass er keinen anderen Fernseher wollte'], 'K45', 'past marker'],
  ['S0326L02U06', T2, 'fix', ["I couldn't believe that she wanted to sell the company", 'ich konnte nicht glauben, dass sie die Firma verkaufen wollte'], 'K45', 'past marker'],
  ['S0358L01U04', T2, 'fix', [null, 'ich bin mir sicher, dass deine Freundin die Tür nicht öffnen könnte'], 'K45', "I'm sure + could → könnte"],
  ['S0358L02U03', T2, 'fix', [null, 'ich bin mir sicher, dass sie nicht an der Spitze sein könnte'], 'K45', "I'm sure + could → könnte"],
  ['S0359L01U05', T2, 'fix', [null, 'ich bin mir sicher, dass dein Freund die Tür nicht öffnen könnte'], 'K45', "I'm sure + could → könnte"],
  ['S0358L03B02', T2, 'fix', ["she said she couldn't reach the top", 'sie hat gesagt, sie konnte die Spitze nicht erreichen'], 'K45/K40', 'build that isolated konnte re-anchored on the frame'],
  ['S0358L03B03', T2, 'fix', ["yesterday she couldn't reach the top", 'gestern konnte sie die Spitze nicht erreichen'], 'K45', 'past marker'],
  ['S0358L03U01', T2, 'delete', null, 'G', 'uncontracted twin of the seed-sentence row U07, same basket'],
  ['S0359L03B02', T2, 'fix', ['he said he could turn left', 'er hat gesagt, er konnte links abbiegen'], 'K45/K40', 'Kai\'s positive shape "he said he could"'],
  ['S0359L03B03', T2, 'fix', ['she said she could turn left', 'sie hat gesagt, sie konnte links abbiegen'], 'K45', 'frame added; she + konnte'],
  ['S0384L02B02', T2, 'fix', ["I said I couldn't agree with it", 'ich habe gesagt, ich konnte dem nicht zustimmen'], 'K45/K40', 'build that isolated konnte re-anchored on the frame'],
  ['S0384L02B03', T2, 'fix', ["yesterday I couldn't agree with it", 'gestern konnte ich dem nicht zustimmen'], 'K45', 'past marker'],
  ['S0384L02U01', T2, 'delete', null, 'G', 'uncontracted twin of the seed-sentence row U05, same basket'],
  ['S0395L02B03', T2, 'fix', ["she said she couldn't turn at the next corner", 'sie hat gesagt, sie konnte an der nächsten Ecke nicht abbiegen'], 'K45', 'frame added'],
  ['S0433L02U02', T2, 'fix', [null, 'ich dachte, dass wir nicht herausfinden konnten, wann'], 'K45', 'past frame + couldn\'t (inability) → konnte, as S0412L01U06 "I knew we could not go | konnten"'],
  ['S0433L02U03', T2, 'fix', [null, 'sie hat mir gesagt, dass wir nicht herausfinden konnten, wann'], 'K45', 'as above'],
  ['S0433L02U04', T2, 'fix', [null, 'ich wusste, dass wir nicht herausfinden konnten, wann'], 'K45', 'as above'],
  ['S0433L03U02', T2, 'fix', [null, 'ich dachte, dass wir nicht herausfinden konnten, wann der Film'], 'K45', 'as above'],
  ['S0433L03U03', T2, 'fix', [null, 'sie hat mir gesagt, dass wir nicht herausfinden konnten, wann der Film'], 'K45', 'as above'],
  ['S0433L03U04', T2, 'fix', [null, 'ich wusste, dass wir nicht herausfinden konnten, wann der Film'], 'K45', 'as above'],
  ['S0433L04U03', T2, 'fix', [null, 'ich dachte, dass wir nicht herausfinden konnten, wann der Film anfing'], 'K45', 'as above'],
  ['S0433L04U04', T2, 'fix', [null, 'sie hat mir gesagt, dass wir nicht herausfinden konnten, wann der Film anfing'], 'K45', 'as above'],
  ['S0433L04U06', T2, 'fix', [null, 'ich wusste, dass wir nicht herausfinden konnten, wann der Film anfing'], 'K45', 'as above'],
  ['S0433L04U01', T2, 'delete', null, 'G', 'uncontracted twin of the seed-sentence row U07, same basket'],
  ['S0446L02U03', T2, 'fix', [null, 'ich dachte, dass wir dieses Fenster nicht einschlagen konnten'], 'K45', 'past frame + couldn\'t → konnte'],
  ['S0446L02U04', T2, 'fix', [null, 'sie hat mir gesagt, dass wir dieses Fenster nicht einschlagen konnten'], 'K45', 'as above'],
  ['S0446L02U06', T2, 'fix', [null, 'ich wusste, dass wir dieses Fenster nicht einschlagen konnten'], 'K45', 'as above'],
  ['S0525L02U03', T2, 'fix', ['were you able to see it?', null], 'K45', 'bare "could you" over konntest; the LEGO says "were able"'],
];

// Held for Kai — one at a time on the review page. Nothing below is written.
const HELD = [
  { seeds: [312], ids: ['seed:312', 'S0312L03U01', 'S0316L02U03', 'S0316L04U04'],
    now: 'she said that she could use the other room tomorrow night | Sie hat gesagt, dass sie morgen Abend das andere Zimmer benutzen könnte',
    why: 'said + could, but the time is FUTURE. konnte with morgen Abend is wrong German; könnte here sits four rounds after the said-frame LEGO teaches konnte, so the frame alone no longer predicts the form.',
    proposal: '(a) keep könnte and accept that "tomorrow night" is what selects it (rule: said + could + a future time → könnte; S0316L02U03/S0316L04U04 "on Monday" follow); (b) "she said that she can use the other room tomorrow night | …benutzen kann"; (c) re-word to a past report.' },
  { seeds: [412], ids: ['seed:412', 'S0412L01', 'S0412L01B01', 'S0412L01B02', 'S0412L01B03', 'S0412L01U04', 'S0412L03B03', 'S0412L05U01', 'S0412L05U07'],
    now: "we couldn't allow them to win everything | wir konnten ihnen nicht erlauben, alles zu gewinnen — LEGO S0412L01 we could | wir konnten",
    why: 'a second bare konnte LEGO, no past marker in the seed. "we said we couldn\'t | wir haben gesagt, wir konnten nicht" is 9 syllables (cap 8).',
    proposal: '(a) seed → "last year we couldn\'t allow them to win everything | letztes Jahr konnten wir ihnen nicht erlauben, alles zu gewinnen", LEGO → "last year we could | letztes Jahr konnten wir" (7 syllables; letztes Jahr R733); (b) seed → "we said we couldn\'t allow them…", LEGO "we said we could | wir haben gesagt, wir konnten" (8); (c) könnten (bare could → könnte), "we couldn\'t allow them to win everything | wir könnten ihnen nicht erlauben…".' },
  { seeds: [518], ids: ['seed:518', 'S0518L06', 'S0518L05U08'],
    now: "I couldn't imagine myself having exactly the same problem | Ich konnte mir nicht vorstellen, genau das gleiche Problem zu haben",
    why: 'no past marker. "Ich könnte mir nicht vorstellen…" is idiomatic German for the same English.',
    proposal: 'seed + seed row → könnte; not-new S0518L06 "could | konnte" → "could | könnte" (as S0310L01\'s component).' },
  { seeds: [479], ids: ['seed:479', 'S0479L02U01', 'S0479L02U03'],
    now: "it's the least I could do | es ist das Wenigste, was ich tun konnte",
    why: 'a fixed expression. Present "it\'s" with past konnte; natives say "das ist das Mindeste, was ich tun kann" or "…tun konnte" (after the act). No marker in the English.',
    proposal: '(a) leave as an idiom exception; (b) "…was ich tun kann"; (c) "that was the least I could do | das war das Wenigste, was ich tun konnte" (past marker "was").' },
  { seeds: [603], ids: ['S0603L03B03', 'S0603L03U03'],
    now: 'I could find it nowhere | ich konnte es nirgendwo finden; she could go nowhere | sie konnte nirgendwo gehen',
    why: 'bare could → konnte, no marker; the LEGO is "nowhere | nirgendwo" so the frame cannot go in the LEGO.',
    proposal: '"yesterday I could find it nowhere | gestern konnte ich es nirgendwo finden", "last week she could go nowhere | letzte Woche konnte sie nirgendwo hingehen".' },
  { seeds: [116, 121, 122, 127, 274, 275, 276, 277, 282, 413, 414, 432, 435, 444, 456, 644, 659], ids: [],
    now: 'e.g. "they thought it could be done more efficiently | sie dachten, es könnte effizienter gemacht werden" (seed 444); "I thought you could stay a bit longer | …könntest"; "she asked me if I could help her | …könnte"',
    why: 'a past frame + could, where "could" is a POSSIBILITY or a REQUEST, not past ability. The rule by meaning says könnte; one-form-per-frame (K35) would say konnte.',
    proposal: 'keep könnte here (meaning), and keep konnte only for past ability/inability. Applied rows (tranche 2) follow this: thought/told/knew + couldn\'t (inability) → konnte at 433/446.' },
  { seeds: [127, 135, 182, 204, 237, 259, 282, 286, 403, 469], ids: [],
    now: 'e.g. "We could go to the restaurant or anywhere else | Wir können…"; "I asked if we could stay as long as possible | …bleiben können"',
    why: '11 rows put English "could" over können (present). Not könnte/konnte, so outside the letter of the ruling.',
    proposal: 'könnte where it is a possibility ("we could go… | wir könnten…" — könnten is only taught at R816), or "can" in the English.' },
];

module.exports = { ROWS, HELD, T1, T2 };
