# How This Works copy — editable inside Popty

The learner-facing "How this works" copy, editable by anyone with a Popty login at
**https://popty.app/htw-copy**. No token in the URL, no file to download: the normal OTP
gate is the authentication.

## The pieces

| Piece | What it does |
|---|---|
| `src/views/HtwCopyEditor.vue` | full-height textarea, debounced autosave (2s), honest save status, "What has changed" diff panel |
| `api/htw-copy.js` | `GET` current + original, `POST` a new version. Bearer Supabase JWT, verified by `verifySupabaseJWT` |
| `public.htw_copy_versions` | append-only store: one `original` row (frozen seed) + one `save` row per save |
| `tools/htw-copy/diff.cjs` | unified diff, original → current; `--export`, `--history` |
| `tools/htw-copy/setup-table.cjs` | one-off DDL (RLS on, no policies = service-role only) |

The frozen original is `docs/htw-copy-for-aran.md` @ `270edaf6` in `ssi-learning-app`,
seeded byte-identically (md5 `4b86893e64b674745900fd13dbf9f9bf`). It is never overwritten —
saves only ever append.

## Seeing the edits

```bash
node tools/htw-copy/diff.cjs            # unified diff, original -> live text
node tools/htw-copy/diff.cjs --export   # same, plus writes ../ssi-learning-app/docs/htw-copy-for-aran.edited.md
node tools/htw-copy/diff.cjs --history  # every save: time, who, size
```

Tom can also see the changes without a terminal: open the editor and press
**What has changed** — the same diff, rendered in the page.

Needs `.env.psql` at the repo root for the CLI tools; the deployed API uses the Vercel
`SUPABASE_SERVICE_ROLE_KEY`.
