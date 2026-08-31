# course-editor

The **only** sanctioned writer to course-content tables
(`course_legos`, `course_practice_phrases`, `course_seeds`, `course_audio`).

Born from the [2026-06-17 cross-course corruption incident](../../docs/incidents/2026-06-17-cross-course-lego-corruption.md):
an ad-hoc `UPDATE course_legos WHERE lego_id='S0524L01'` hit 79 courses because
`lego_id` is not globally unique. This library makes that class of write
*impossible to express*. Full design: [`docs/architecture/COURSE_EDITOR_TOOL_SCOPE.md`](../../docs/architecture/COURSE_EDITOR_TOOL_SCOPE.md).

## Use it

```js
const { createCourseEditor } = require('./services/course-editor')
const { ops, editor } = createCourseEditor()          // real Supabase client
await ops.editLego('spa_for_eng', 'S0001L01', { known_text: 'I want' })
await ops.editPhrase('spa_for_eng', 'spa_for_eng:S0001L01B01', { target_text: 'quieres' })
await ops.resolveZutDuplicate('spa_for_eng', 'S0042L03', { known_text: 'to read (verb)' })
const report = await ops.stripParensFromCourse('spa_for_eng', { dryRun: true })
```

Inject a client for tests / sandboxes: `createCourseEditor({ client })`.

## The four invariants (enforced, not documented-and-hoped)

1. **Course-scoped writes only.** Every write needs `course_code` **and** a
   within-course unique key (`id`, `lego_id`, or `seed_number+lego_index`).
   `assertScope()` throws *before* any DB call. (`scoping.cjs`)
2. **Dry-run + blast-radius circuit-breaker.** `{ dryRun: true }` returns the
   exact before→after plan and writes nothing. Real writes over
   `confirmThreshold` (default 25) rows require `{ confirm: true }`. Cross-course
   writes require explicit `{ crossCourse: true }`. (`editor.cjs`)
3. **Audit-backed undo.** Every mutation goes through tables captured by the
   `content_audit_log` triggers → restorable via the Maintenance page.
4. **Side-effects owned by the tool.** `editPhrase` carries the audio chain: a
   real text change nulls audio for regen; a cosmetic change (trailing period /
   case) preserves the pointer. (`operations.cjs` + `text-ops.cjs`)

## Layout

| File | Role |
|---|---|
| `scoping.cjs` | table rules + `assertScope` / `assertEditableFields` (the incident guard) |
| `editor.cjs` | primitives: `update` / `remove` / `insert` / `bulkUpdateByPk` / `relinkAudio` |
| `operations.cjs` | methodology ops: `editLego`, `editPhrase`, `resolveZutDuplicate`, `stripParensFromCourse`, `findSlashesInCourse`, `applyQuestionMark` |
| `text-ops.cjs` | pure transforms (strip parens, slash options, language-aware `?`, audio-impact) |
| `errors.cjs` | typed errors with stable `.code` |
| `cli.cjs` | **sandbox-only** harness (fake DB in a JSON file) for humans / red-team agents |
| `__tests__/` | vitest suite + faithful in-memory Supabase fake + incident fixtures |

## Test

```bash
npx vitest run services/course-editor/__tests__/      # unit + incident reproduction
node tools/ci/check-no-adhoc-db-writes.mjs             # CI guard: no new ad-hoc writes
```

## Sandbox (try to break it, safely)

```bash
CLI=services/course-editor/cli.cjs SB=/tmp/ce/sb.json
node $CLI --sandbox $SB seed-incident 79
node $CLI --sandbox $SB raw-update course_legos --where lego_id=S0524L01 --set known_text=three
#   → REFUSED [SCOPE_ERROR]  (the incident write, blocked)
```

## Still TODO (per scope doc)

- MCP server face (the decided primary agent interface) over this library.
- Migrate `production-api` / `qa.cjs` write sites to delegate here (shrink the CI baseline).
- Manifest editor: read/write `course-configs/Courses/{id}.json` with diff/version
  gates + DB-drift tracking.
