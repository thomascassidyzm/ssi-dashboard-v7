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
    id: 'learner-walks',
    title: 'The little walks a learner can ask for',
    blurb: 'The six guided walks in the Library — the words the app says while it points at things on the learner’s own screen. The other half of the How This Works copy: that one is the reading, this one is the pointing.',
    seedPath: 'docs/copy-surfaces/learner-walks.md',
    sourceRef: 'ssi-learning-app packages/player-vue/src/walkthrough/pack.json @ 281e8dea (branch a159-library-htw)'
  }
];

export function findCopyDoc(id) {
  return COPY_DOCS.find(d => d.id === id) || null;
}
