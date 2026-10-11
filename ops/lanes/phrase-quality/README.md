# Phrase-quality lane (command-surface standing lane `phrase-quality`, job #415, Tom 2026-10-11)

A continuous two-family sweep of SSi course practice phrases for grammar, naturalness and seed consistency. **Codex does the labour and Opus reviews it** (r-2026-10-11-codex-astra-works-under-opus-direction).

## The rule (Tom 2026-10-11, 20:54 / 20:55 / 20:57)

1. Both models must judge a phrase bad. Agreement is necessary, but it is not sufficient.
2. Both models try ONE agreed replacement. It must pass **the strict Popty course-builder gate**: `tools/phrase-gate/gate-check.cjs` → `checkPhraseSet`, the replay of `/api/seed/complete`. That gate covers ZUT, allowed vocabulary only, must contain the LEGO, known side, bare-LEGO, BUILD/USE floors and recombination. Nothing here re-implements any of it.
   - **Pass:** REPLACE.
   - **Fail, or no agreed replacement:** DELETE. "We have plenty of phrases in the course."
3. **Hard floor:** no LEGO may end up with fewer than **4 USE** phrases. If a delete would break that floor, the phrase is KEPT.
4. Only BUILD/USE practice phrases are changed. **Seeds and LEGOs are never changed**, and component rows are left alone.
5. There is no Aran list.
6. Scope: released and beta courses. **Never Welsh**: North and South are handwritten, and Welsh production is Aran's. Arabic course content is ours.

## Files

| Path | What it is |
|---|---|
| `queue.json` | in-scope courses cut into 20-seed windows (`make-queue.cjs`) |
| `RUBRIC.md` | what counts as bad |
| `lib.cjs` | env, read client, `zutKey` (= course-builder `normalizeForZUT`), scope, floor |
| `export-window.cjs <course> <from> <to> <out.json>` | read-only export of a window and its ZUT groups |
| `gate-change.cjs <course> <agreed.jsonl> <decisions.jsonl>` | the gate step: replace / delete / keep for each agreed line, read-only |
| `apply-staged.cjs <course> [--apply]` | the ONLY writer. Dry run by default. Re-checks drift, the gate and the floor on live rows. Writes the undo ledger BEFORE every write. A replaced side loses its audio ids, so the normal render voices it. |
| `undo.cjs <course> [--row id] [--apply]` | restores rows from the ledger |
| `phrase-quality.test.cjs` | regression for ZUT keying (Arabic tashkeel, review #420), plus the floor and decision rules |

## Data, on Popty branch `lanes/phrase-quality` (never main: each main push redeploys Popty)

- `runs/<course>/<from>-<to>.codex.jsonl`: Codex's findings.
- `runs/<course>/<from>-<to>.verdicts.jsonl`: Opus's verdicts.
- `runs/<course>/<from>-<to>.agreed.jsonl`: both say bad, plus the agreed replacement if any.
- `staged/<course>.jsonl`: the gate's decisions, appended per window.
- `undo/<course>.jsonl`: the undo ledger, one full before-row per write.

Finding / agreed line: `{"row_id","seed_number","lego_index","role","before":{"known","target"},"after":{"known"?,"target"?}|null,"problem","evidence"}`.
Run tools from a worktree with `ln -s /home/tomcassidy/SSi/ssi-dashboard-v7-clean/node_modules node_modules`. The tools read the shared checkout's `.env`.
