/**
 * The registry of editable copy surfaces.
 *
 * One entry per learner-facing document that someone can edit at popty.app/copy/<id>.
 * A doc id that is not in here does not exist: the API refuses it, so a client can
 * never conjure an arbitrary doc_id into the append-only store.
 *
 * All of them share one table (public.htw_copy_versions, keyed by doc_id) and one
 * shape: a frozen kind='original' row plus one kind='save' row per save.
 *
 * To add a surface: add a row here, then seed it byte-identically from code with
 *   node tools/htw-copy/seed-doc.cjs <id> <path-to-seed-file> <source-ref>
 */

export const COPY_DOCS = [
  {
    id: 'htw',
    title: 'How This Works — the walkthrough pack',
    blurb: 'Every word a learner reads across the "How this works" system, in the order they meet it.',
    seedPath: '../ssi-learning-app/docs/htw-copy-for-aran.md',
    sourceRef: 'ssi-learning-app @ 270edaf6'
  },
  {
    id: 'player-voice',
    title: 'The player’s own voice — what the app says while you learn',
    blurb: 'The lines the player itself shows a learner mid-lesson: the phase prompts, the listening and pronunciation overlays, the end-of-session screen and the end-of-preview screen.',
    seedPath: 'docs/copy-surfaces/player-voice.md',
    sourceRef: 'ssi-learning-app @ dev (see the header of each section)'
  }
];

export function findCopyDoc(id) {
  return COPY_DOCS.find(d => d.id === id) || null;
}
