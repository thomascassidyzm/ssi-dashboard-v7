/**
 * talk-bollocks-edits — every editorial decision between Tom's Talk Bollocks transcripts and the
 * canonical English (tools/pods/talk-bollocks-canon.cjs builds from this). Line numbers are the
 * transcript file's own (archive/docs-retired-2026-09-03/corpus/talk-bollocks/part-N.md).
 *
 * WHAT AN EDIT MAY DO (Tom, 2026-10-20): split the transcript cleanly into the two voices, fixing
 * Descript's speaker mislabels by sense; drop Descript headings, stray markup and false starts
 * that are pure noise. Never paraphrase, never polish, never add a word.
 *
 *   drop      lines left out: the front matter, Descript's inline headings, noise
 *   speaker   a line Descript filed under the wrong voice, moved to the right one
 *   split     a line holding both voices, cut where the speaker changes (words kept in order)
 *   text      a line whose square-bracket note was SPOKEN, kept with the brackets taken off
 *             (every other square-bracket note is the transcript editor's and is dropped)
 *   chapters  where a chapter starts; the titles are the transcript's own headings
 *
 * Consecutive lines in one voice join into one turn, which is how a sentence Descript cut across
 * a label ("There's so" / "many different ones!") becomes whole again.
 */
'use strict'

// Spellings corrected, whole word, everywhere: typing slips and Descript mishearings where the
// word meant is not in doubt. Nothing else is changed.
const CORRECTIONS = [
  ['Alison Ray', 'Alison Wray'],
  ['acquistion', 'acquisition'],
  ['infinitessimal', 'infinitesimal'],
  ['differnet', 'different'],
  ['spacedrepetition', 'spaced repetition'],
  ['Iost', 'I lost'],
  ['the lag', 'the leg'],
  ['Wlesh', 'Welsh'],
  ['evdence', 'evidence'],
  ['differentyl', 'differently'],
  ['relationshipships', 'relationships'],
  ['smashthis', 'smash this'],
  ['learn monks', 'learn Manx'],
  ['Melissa it\'s physics', 'molecular physics'],
  ['local concurrency', 'local currency'],
  ['around a lo', 'around a lot'],
  ['Synopsyes', 'Synopses'],
  ['after read', 'after red'], // Part 1: "a list of all things after red" — Aran's example is the word red
  ['the reach stimulation', 'the restimulation'], // Part 1: Tom has just said "the restimulating"
  ['theyre', "they're"], // Part 2, line 48
  ['roots and guidance', 'routes and guidance'], // Part 2: the satnav routes that follow
  ['six formers', 'sixth formers'], // Part 2: "the 16 year old, sixth formers"
  ['through and education', 'through an education'], // Part 2, line 313
  ['just decided to leave', 'just decide to leave'], // Part 2, line 260
  ['a helping him', 'a helping hand'], // Part 4, line 408
]

const PARTS = {
  1: {
    slug: 'talk-bollocks-1',
    title: 'Aran & Tom Talk Bollocks Part 1',
    corpus: 'docs/pods/talk-bollocks-1-2026-10-20.md',
    edits: {
      // front matter (the --- fences vanish with the bullets); Descript headings 16 21 44 65 195 231 290 382; the [SLA … Acquisition]
      // editor's gloss (36 38 40); 332 a lone "if" (Aran's false start, under Tom's label);
      // 375 Descript noise ("Manx Stuff - Tommy gated, Jacob, out of open culture, academic track, then")
      drop: [2, 5, 6, 7, 8, 9, 16, 21, 36, 38, 40, 44, 65, 195, 231, 290, 332, 375, 382],
      speaker: {
        26: 'ARAN', // "There's so" + "many different ones!" — one sentence, Aran's
        60: 'TOM', 61: 'TOM', 62: 'TOM', 63: 'TOM', 64: 'TOM', 66: 'TOM', // Tom's question, under Aran's label
        67: 'ARAN', // "Yep. Okay." — Aran taking the question
        109: 'ARAN', // "exactly. Now over a period of time…" answers Tom
        176: 'ARAN', // "I've been saying it recently." — one of Aran's reasons, before "You might've said it earlier"
        181: 'ARAN', // "and" + "also just the sort of simple mathematics"
        216: 'ARAN', // "Yeah, exactly." — Aran, answering Tom's description of his chair-banging
        343: 'TOM', // "Is just after!" — Tom finishing Aran's sentence; Aran: "Exactly."
        354: 'TOM', // "zero" + "apparent recall, …" — Tom's sentence
        360: 'TOM', // "From that prompt?" — Tom's question; Aran: "No."
      },
      text: {
        213: "It's a pity that the recordings can't pick up my pathetic attempts to act this out. Isn't it?",
        322: "so now here's the interesting thing - there's another idea which is not directly connected, but they end up moving up instead of meshed. and this is much more recent, piece of thought from a guy called Dr. Robert Bjork, who. Certainly used to work in the university of California may still and this is the idea of desirable difficulty.",
      },
      chapters: {
        10: 'On Demand/Streaming Tech',
        60: 'Traditional Methods & AI',
        196: "There's No Such Thing as Words",
        232: 'Holy Dickhead Batman',
        291: 'Spaced Repetition',
        371: 'Time versus Efficiency',
      },
    },
  },
  2: {
    slug: 'talk-bollocks-2',
    title: 'Aran & Tom Talk Bollocks Part 2',
    corpus: 'docs/pods/talk-bollocks-2-2026-10-20.md',
    edits: {
      // front matter (the --- fences vanish with the bullets); Descript headings 46 76 233 272 282 356
      drop: [2, 5, 6, 7, 8, 9, 46, 76, 233, 272, 282, 356],
      speaker: {
        28: 'ARAN', // "that's a good" + "one"
        37: 'TOM', // "Well," + "we want to make it easier…"
        67: 'TOM', // "I see" + "that connection point."
        81: 'TOM', // "then in terms of your - what's your road to learning?" — Tom's question
        92: 'TOM', 94: 'TOM', 96: 'TOM', // one Tom sentence Descript cut into four
        122: 'TOM',
        143: 'TOM', // "So what I'd like to" + "do"
        160: 'TOM', // "Why was that?"
        175: 'TOM', 179: 'TOM', // "Of course. And in fact, … as you say, group formation."
        196: 'TOM', // "In a school context typically" + "you don't have."
        239: 'TOM', // "it's the road" + "trip!"; Aran: "Trip. Yeah."
        290: 'TOM', // "Talk to me about, so any" + "thoughts you've got on that?"
        338: 'TOM', // "Of" + "course. Yeah."
        347: 'TOM', // "And you" + "get 20 hours done…"
      },
      split: {
        90: [['ARAN', '10 days.'], ['TOM', 'Yeah. Maybe the']],
        120: [['ARAN', 'so we say 10 days.'], ['TOM', '10']],
        128: [['TOM', 'say 10.'], ['ARAN', "I was 10 hours. And that was a day. I'd say, if you're going to spend this day,"]],
        132: [['TOM', '100 hours.'], ['ARAN', "It's a hundred hours. Chop them how you want, but that's going to get you there."]],
        208: [['ARAN', "Initially I think with a lot of very positive intentions to try and encourage her. And by the end of the session, he'd become equally negative."], ['TOM', "Oh my God. That's"]],
        210: [['TOM', 'literally how cancer works.'], ['ARAN', 'Exactly. Yeah.']],
        371: [['ARAN', "but it's there's a crowd control thing going on, if you're doing that with a group of a hundred. Then yeah, you're going to get clusters of people falling out of target language, unless they've got their, the nudge happening. You'd have to talk with teenagers."], ['TOM', 'so with']],
      },
      chapters: {
        10: 'The Myth of Talking Welsh in A Pub When English People Come In',
        77: 'Language Learning Can Bridge Gaps',
        234: 'Intensive Sprints as Road Trips',
        283: 'Your Own Tribe v The Facebook Algorithm',
        357: 'Ideal Way For Chinese Students To Learn English',
      },
    },
  },
  4: {
    slug: 'talk-bollocks-4',
    title: 'Aran & Tom Talk Bollocks Part 4',
    corpus: 'docs/pods/talk-bollocks-4-2026-10-20.md',
    edits: {
      // front matter (the --- fences vanish with the bullets); Descript headings 16 36 88 128 142 170 212 235 267 276 292 317 343 361 365
      // 372 383 415 427 463 (375 "A Full-Stack Remote-School" stays: Tom said it — Aran answers "Completely")
      drop: [2, 4, 6, 7, 8, 9, 16, 36, 88, 128, 142, 170, 212, 235, 267, 276, 292, 317, 343, 361, 365, 372, 383, 415, 427, 463],
      speaker: {
        166: 'TOM', // "Correct." — Tom, between two Aran lines
        187: 'ARAN', // "Yeah. Distributed." — Aran agreeing
      },
      text: {
        // Aran said "Game B" here (the audio has it; the transcript editor bracketed it)
        21: "The broad picture, I think is, that it's part of the whole thing, Game B, it isn't something that happens in isolation.",
      },
      chapters: {
        12: 'The Future of Life, The Universe and Education',
        89: 'Local Currency Universal Basic Income (UBI)',
        143: "The Activist's Dilemma",
        236: 'Business Models To Improve Learning & Generate Money',
        293: 'How Would The Local Currency Actually Work?',
        366: "But First Let's Create The Education Layer",
      },
    },
  },
}

module.exports = { PARTS, CORRECTIONS }
