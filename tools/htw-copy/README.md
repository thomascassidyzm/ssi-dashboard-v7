# The Copy area — every learner-facing surface, editable in place

Anyone with a Popty login can edit the words a learner reads, at **https://popty.app/copy**.
No token in the URL, no file to download: the normal OTP gate is the authentication.
Adding the next surface is a row in a registry plus one seeding command — not a new page.

Nothing an editor types goes live in the app. Saves are versioned; a worker maps the edits
back into code under the founder content guardrails.

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
| `api/copy.js` | `GET ?doc=<id>` current + original, `POST ?doc=<id>` a new version, `GET ?list=1` the index. Bearer Supabase JWT, verified by `verifySupabaseJWT` |
| `api/htw-copy.js` | the permanent thin alias for `doc=htw` |
| `src/views/CopyEditor.vue` | full-height 16px textarea, debounced autosave (2s), honest save status, "What has changed" diff panel, close-with-unsaved-work warning |
| `src/views/CopyIndex.vue` | the list of surfaces |
| `public.htw_copy_versions` | append-only store, keyed by `doc_id`: one `original` row (frozen seed) + one `save` row per save |
| `tools/htw-copy/diff.cjs` | unified diff, original → current; takes a doc id, `--list`, `--export`, `--history` |
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

## Seeing the edits

```bash
node tools/htw-copy/diff.cjs                    # How This Works, original -> live text
node tools/htw-copy/diff.cjs learner-walks      # any surface, by doc id
node tools/htw-copy/diff.cjs --list             # every surface, with save counts
node tools/htw-copy/diff.cjs <doc> --export     # writes the current text out to a file
node tools/htw-copy/diff.cjs <doc> --history    # every save: time, who, size
```

Tom can also see the changes without a terminal: open the page and press **What has changed**
— the same diff, rendered in the page.

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
5. Deploy. The page and the index pick it up from the registry — there is nothing else to build.

What to do next, and what each surface is worth, is in
`docs/copy-surfaces/learner-facing-copy-inventory-2026-08-19.md`.

Needs `.env.psql` at the repo root for the CLI tools; the deployed API uses the Vercel
`SUPABASE_SERVICE_ROLE_KEY`.
