// src/utils/tutorialPhrases.js
/**
 * The recordist tutorial's FIXED practice phrases.
 *
 * These are deliberately hard-coded and identical for every recordist. They are
 * NOT drawn from the recording queue, from a course, or from voice casting —
 * that independence is the whole reason the tutorial can exist: the recording
 * tool cannot carry arbitrary text (it carries pod dialogue cast to a voice, or
 * existing clips flagged for re-record), so the tutorial carries its own.
 *
 * ── How a pack has to be shaped, if you add one ──────────────────────────────
 *
 * The tutorial's teaching moment is hearing pieces of YOUR OWN slow read
 * recombined into a phrase you never said. That only works if the two slow
 * reads share a grid:
 *
 *     slow read A:   [ opener A ] [ verb A ] [ tail A ]
 *     slow read B:   [ opener B ] [ verb B ] [ tail B ]
 *
 * and every cross-combination — opener A + verb B + tail B, and so on — is a
 * grammatical, ordinary sentence. Three chunks each gives six combinations, of
 * which two are the phrases actually read; we play three of the remaining four.
 *
 * So a pack needs, per slow read, exactly three chunks that are
 * position-swappable with the other read's. Getting that wrong doesn't crash
 * anything — it just makes the recombined phrase nonsense, and the recordist
 * blames their delivery for the grammar.
 *
 * The recordist picks their pack; nothing here assumes they speak English.
 */

export const PHRASE_PACKS = [
  {
    id: 'eng',
    label: 'English',
    // Two ordinary sentences, read at the speed you'd say them to a person.
    // No chunking — these are never cut up, only played straight back.
    natural: [
      'I’m going to record a few sentences now.',
      'That sounded better than I expected.',
    ],
    // Read with a clear beat between each bracketed piece.
    slow: [
      { chunks: ['I want to', 'learn', 'a little more'] },
      { chunks: ['I’m trying to', 'speak', 'every day'] },
    ],
    // Phrases the recordist did NOT read, built from the pieces above.
    // [read index, chunk index] — chunk index is the SLOT, so the grid holds.
    recombine: [
      { label: 'I want to speak every day', pieces: [[0, 0], [1, 1], [1, 2]] },
      { label: 'I’m trying to learn a little more', pieces: [[1, 0], [0, 1], [0, 2]] },
      { label: 'I want to learn every day', pieces: [[0, 0], [0, 1], [1, 2]] },
    ],
  },
  {
    id: 'fin',
    label: 'Suomi (Finnish)',
    natural: [
      'Nauhoitan nyt muutaman lauseen.',
      'Tuo kuulosti paremmalta kuin odotin.',
    ],
    // haluan / yritän both take a bare A-infinitive, and the tails are an
    // object and an adverbial that attach to either verb — so all six
    // combinations are ordinary Finnish.
    slow: [
      { chunks: ['Minä haluan', 'oppia', 'vähän lisää'] },
      { chunks: ['Minä yritän', 'puhua', 'joka päivä'] },
    ],
    recombine: [
      { label: 'Minä haluan puhua joka päivä', pieces: [[0, 0], [1, 1], [1, 2]] },
      { label: 'Minä yritän oppia vähän lisää', pieces: [[1, 0], [0, 1], [0, 2]] },
      { label: 'Minä haluan oppia joka päivä', pieces: [[0, 0], [0, 1], [1, 2]] },
    ],
  },
  {
    id: 'cym',
    label: 'Cymraeg (Welsh)',
    natural: [
      'Dw i’n mynd i recordio ychydig o frawddegau nawr.',
      'Roedd hwnna’n well nag o’n i’n disgwyl.',
    ],
    slow: [
      { chunks: ['Dw i eisiau', 'dysgu', 'ychydig bach mwy'] },
      { chunks: ['Dw i’n trio', 'siarad', 'bob dydd'] },
    ],
    recombine: [
      { label: 'Dw i eisiau siarad bob dydd', pieces: [[0, 0], [1, 1], [1, 2]] },
      { label: 'Dw i’n trio dysgu ychydig bach mwy', pieces: [[1, 0], [0, 1], [0, 2]] },
      { label: 'Dw i eisiau dysgu bob dydd', pieces: [[0, 0], [0, 1], [1, 2]] },
    ],
  },
]

export function packById(id) {
  return PHRASE_PACKS.find((p) => p.id === id) || PHRASE_PACKS[0]
}
