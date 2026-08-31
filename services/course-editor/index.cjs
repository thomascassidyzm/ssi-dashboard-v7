/**
 * Public entry point for the course-editor library.
 *
 *   const { createCourseEditor } = require('./services/course-editor')
 *   const ed = createCourseEditor()              // uses the shared Supabase client
 *   await ed.ops.editLego('spa_for_eng', 'S0001L01', { known_text: 'I want' })
 *
 * In tests, inject a client:
 *   createCourseEditor({ client: fakeSupabase })
 *
 * This is the ONLY sanctioned writer to course-content tables. A CI guard
 * (scripts/ci/check-no-adhoc-db-writes.mjs) forbids direct .update/.insert/
 * .delete on course_legos/practice_phrases/seeds/audio outside this directory.
 */

const { createEditor } = require('./editor.cjs')
const { createOperations } = require('./operations.cjs')
const errors = require('./errors.cjs')
const scoping = require('./scoping.cjs')
const textOps = require('./text-ops.cjs')

function defaultClient() {
  // Lazy require so tests / the CLI sandbox never need real credentials.
  const supabaseClient = require('../supabase-client.cjs')
  return supabaseClient.getClient ? supabaseClient.getClient() : supabaseClient.supabase
}

function createCourseEditor({ client, logger, confirmThreshold } = {}) {
  const db = client || defaultClient()
  if (!db) throw new Error('No Supabase client available (set SUPABASE_URL / SUPABASE_SERVICE_KEY, or inject a client)')
  const editor = createEditor({ client: db, logger, confirmThreshold })
  const ops = createOperations(editor)
  return { editor, ops, client: db }
}

module.exports = {
  createCourseEditor,
  ...errors,
  scoping,
  textOps,
  TABLE_RULES: scoping.TABLE_RULES,
}
