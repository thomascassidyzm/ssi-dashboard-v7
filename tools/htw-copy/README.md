# The Copy area — every learner-facing surface, editable in place

Anyone with a Popty login can edit the words a learner reads, at **https://popty.app/copy**.
No token in the URL, no file to download: the normal OTP gate is the authentication.
Adding the next surface is a row in a registry plus one seeding command — not a new page.

**Save and Publish are two different acts.** Typing saves a draft every couple of seconds and
reaches nobody. Pressing **Publish** marks that version as the live text, and the learner app
reads it straight from the database — no branch, no deploy, no code change. Explainer copy
therefore goes to learners as data, on the editor's own timing.

Every version is kept forever, so **rolling back is just publishing an older version** — the
older row gets a newer publish stamp and becomes the live one. Nothing is ever deleted or
overwritten, which is why coming forward again is the same single click.

## The surfaces today

| Page | What it is |
|---|---|
| `popty.app/copy` | the index — every surface, with how much editing has happened to each |
| `popty.app/copy/htw` | How This Works — the walkthrough pack (also at `popty.app/htw-copy`) |
| `popty.app/copy/learner-walks` | the six guided walks a learner can ask for in the Library |
| `popty.app/copy/onboarding` | the seven onboarding messages — five emails and two in-app tips |

`popty.app/htw-copy` is a permanent alias for the first one. That link is already in an
editor's inbox — **never remove it.**

## The pieces

| Piece | What it does |
|---|---|
| `api/lib/copy-docs.js` | the registry. An unregistered doc id is refused, so no client can invent a document |
| `api/copy.js` | `GET ?doc=<id>` draft + original + publication state, `POST ?doc=<id>` a new version, `POST ?doc=<id>&publish=1` publish one, `GET ?list=1` the index. Bearer Supabase JWT, verified by `verifySupabaseJWT` |
| `api/copy-published.js` | **the learner read path.** `GET /api/copy-published?doc=<id>` — no auth, published rows only |
| `api/lib/copy-publish.js` | the publication rules as pure functions: what is live, the version list, the next publish stamp |
| `api/htw-copy.js` | the permanent thin alias for `doc=htw` |
| `src/views/CopyEditor.vue` | full-height 16px textarea, debounced autosave (2s), honest save status, the live line, **Publish**, **Earlier versions** (the rollback), diff against the original *or* against what learners see |
| `src/views/CopyIndex.vue` | the list of surfaces, each flagged live / edited-since-published / nothing-live-yet |
| `public.htw_copy_versions` | append-only store, keyed by `doc_id`: one `original` row (frozen seed) + one `save` row per save, each optionally stamped `published_at` / `published_by` |
| `tools/htw-copy/diff.cjs` | unified diff; takes a doc id, `--list`, `--export`, `--history`, `--published` |
| `tools/htw-copy/setup-publish.cjs` | idempotent DDL adding `published_at` / `published_by` and the live-lookup index |
| `tools/htw-copy/seed-doc.cjs` | seeds a surface byte-identically and refuses to touch an existing frozen original |
| `tools/htw-copy/build-learner-walks.cjs` | regenerates the learner-walks seed from the app's walkthrough pack |
| `tools/htw-copy/build-onboarding.cjs` | regenerates the onboarding seed from the `onboarding_messages` table |
| `tools/htw-copy/setup-table.cjs` | one-off DDL (RLS on, no policies = service-role only) |

The frozen originals are never overwritten — saves only ever append.

| Doc | Seeded from | md5 |
|---|---|---|
| `htw` | `docs/htw-copy-for-aran.md` @ `270edaf6` in ssi-learning-app | `4b86893e64b674745900fd13dbf9f9bf` |
| `learner-walks` | `packages/player-vue/src/walkthrough/pack.json` @ `281e8dea` in ssi-learning-app, flattened by `build-learner-walks.cjs` | `f6f2127ec7e406cc7aa2ed7ab5a1c927` |
| `onboarding` | `public.onboarding_messages`, flattened by `build-onboarding.cjs` | `609ecdaf729c4d55823ac830ceaed854` |

## How publishing works

One rule decides everything: **the live text is the version with the most recent publish
stamp.** Publishing stamps a version. Rolling back stamps an *older* version, which thereby
becomes the most recent — so a rollback is a stamp, never a delete and never a rewrite.

| Act | What happens | What a learner sees |
|---|---|---|
| Typing | a `save` row is appended every 2s, unpublished | no change |
| **Publish** | that version gets `published_at` = now, `published_by` = you | the new words, within about a minute |
| **Publish this version** on an older one | that older version gets a *newer* stamp | those older words, within about a minute |

Publish takes the same gate as editing — signed in to Popty. Every publish is stamped with
the publisher's email and every one is reversible in a click, so attribution and undo do the
work a narrower gate would have done. If that should be narrowed to a named list, it is one
predicate in `api/copy.js`.

The learner app reads `GET /api/copy-published?doc=<id>`, which returns published rows only
and `404`s when nothing has been published — which is the honest state of a surface nobody has
published yet, and the learner app answers it with the words built into its own code. **A
draft is unreachable without a Popty JWT.** Responses are cached
`public, s-maxage=60, stale-while-revalidate=300`, so a publish reaches learners inside about
a minute without the learner path touching the database on every read.

## Seeing the edits

```bash
node tools/htw-copy/diff.cjs                     # How This Works, original -> current draft
node tools/htw-copy/diff.cjs learner-walks       # any surface, by doc id
node tools/htw-copy/diff.cjs --list              # every surface: saves, and whether anything is live
node tools/htw-copy/diff.cjs <doc> --published   # DRAFT vs WHAT LEARNERS SEE — what is written but not yet live
node tools/htw-copy/diff.cjs <doc> --export      # writes the current draft out to a file
node tools/htw-copy/diff.cjs <doc> --history     # every version: time, who, size, and which one is live
```

Tom can also see all of this without a terminal: open the page and press **What has changed**
(which can compare against the original *or* against what learners are reading) or **Earlier
versions** for the whole history with a Publish button on each.

## Adding the next surface

1. Add a row to `api/lib/copy-docs.js` — `id`, `title`, `blurb`, `seedPath`, `sourceRef`.
2. Produce the seed file. If the strings sit in one place, export them as-is. If they are
   scattered across components, flatten them into markdown with **one heading and one stable
   key per string**, so mapping the edits back is mechanical rather than a guess — see
   `build-learner-walks.cjs` for the pattern.
3. Put the founder content laws in the seed's own header, in the "edit freely, but these come
   back to Tom" spirit: Easy/Fast, the no-streaks framing, the honest thirty-hours arc, no
   learner-facing "lego" or "seed", British English.
4. Seed it: `node tools/htw-copy/seed-doc.cjs <id> <file> "<source-ref>"`.
5. Deploy. The page, the index and the publish machinery pick it up from the registry — there
   is nothing else to build. Publishing works for every registered surface from the moment it
   is seeded.
6. **Wire the consumer**, which is the separate half. Publishing only reaches learners once
   something reads `/api/copy-published?doc=<id>` and maps the markdown back into the strings
   the app renders. Today `htw` is the one wired surface. `learner-walks` maps to the player's
   walkthrough pack and `onboarding` maps to `public.onboarding_messages` — for those two,
   publishing records an intent that nothing yet acts on, so say so rather than implying the
   words are live.

What to do next, and what each surface is worth, is in
`docs/copy-surfaces/learner-facing-copy-inventory-2026-08-19.md`.

Needs `.env.psql` at the repo root for the CLI tools; the deployed API uses the Vercel
`SUPABASE_SERVICE_ROLE_KEY`.
