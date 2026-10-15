# Phrase v4 per LEGO, lego.insert / lego.delete, voice-gap-fill — through Popty's doors (job #544)

For Kai's Watson and any signed agent. Nothing here touches the database by hand (#384): everything is a Popty route.
Every write is **preview by default**, returns an **undo file** on apply, and every gate runs **on the server**.

## 0. How you call Popty (signed agent)

    node tools/agent-admin/call.cjs --agent <your-id> METHOD /api/admin/... '<json>'     # or --body-file f.json

Your agent id is stamped on the content-edit event. `/api/admin/*` is the prefix a signed agent holding `admin:all` reaches.

## 1. Phrases for one LEGO — v4 (builders default to this now)

    POST http://localhost:3471/api/phrases/v4/generate/<course>
    {"seed": 12, "lego": 3, "lego_known": "to go", "lego_target": "aller", "lego_type": "A"}
    # lego_* only when the LEGO is not in the course yet (a builder asks before it submits the seed)

Same body and same answer shape as v3 (`ok`, `blocked`, `build[]`, `use[]`, `gate`, `score`), plus:

- `pipeline: "v4"` and `v4: {frames, frames_available, distinct_frames, per_phrase[]}`. `frames` says `run` or `not run: <why>`. If it says *not run*, the stapled-opener check did **not** run — a gap, not a pass.
- `staged_rows[]` — only when `ok: true`; exactly the row shape `POST /api/admin/phrase-v4/gap-fill` takes.
- It **writes nothing**. A builder puts the `known → target` pairs in its seed submission (every submission gate runs again).
- `ok:false` is a refusal with reasons, not a failure. Welsh answers `409 WELSH_EXCLUDED` (use `/api/phrases/v3/generate`). The v3 door is unchanged and stays as the fallback; the builder brief (`services/briefs/build-team-creator.cjs`) now says v4 first, v3 on two failures.
- What v4 adds to v3: a frame-diversity brief (walk back through taught material), a hard refusal of stapled openers and one-word USE phrases, and the gap-fill door's own gates (`gateStagedRows`: Popty per-phrase gates, known-side, whole-course ZUT) re-run on every attempt — so what passes here is what lands there.

**Land an existing course's LEGO basket:** send `staged_rows` to the gap-fill door.

    node tools/agent-admin/call.cjs --agent <id> POST /api/admin/phrase-v4/gap-fill '{"courseCode":"fra_for_eng","rows":[...staged_rows...]}'

That is a preview (the real insert, rolled back). Add `"apply":true` to land; a beta/released course also needs `"tom_go":"<Tom's words>"`.

## 2. lego.insert / lego.delete (edit-batch ops)

Signed door (new): `POST /api/admin/course-edit/<course>/edit-batch` — same engine and body as `/api/production/<course>/edit-batch`, but the event names **you**. Dry run unless `"apply": true`.

    {"ops":[{"op":"lego.insert","row":{"seed_number":12,"lego_index":4,"known_text":"to go","target_text":"aller","type":"A"}}]}
    {"ops":[{"op":"lego.delete","lego_id":"S0012L04"}]}                          # refused while phrases remain
    {"ops":[{"op":"lego.delete","lego_id":"S0012L04","cascade_phrases":true}]}   # takes its BUILD/USE/component rows too

Gates (server side): the seed must exist; the slot (seed, lego_index) must be free; `type` is A or M and an M needs `components[]`; texts must be plain speakable (no brackets or parentheses); `lego_id` is derived, never sent; `lego.delete` refuses while phrase rows remain unless `cascade_phrases:true`. **On a beta/released course an apply needs `"tom_go"`** (a preview never does) — these ops move the rounds learners walk. Clips are never deleted. The round map refreshes by itself.

Undo: the response's `undo_file` — send `{"undo_file":"<name>","apply":true}` to the same route (a delete's undo re-inserts the LEGO first, then its phrases, ids and clips intact).

Not done by these ops: renumbering the other LEGOs of the seed (preview your own `lego.update`s of `lego_index`), and a new LEGO has no phrases or audio until you give it some (section 1, then section 3).

## 3. voice-gap-fill — voicing new rows through doors

    node tools/frame-layer/v4/voice-gap-fill.cjs <course>                                  # plan: counts and chars per slot, nothing rendered
    V4_AGENT_ID=<your-id> node tools/frame-layer/v4/voice-gap-fill.cjs <course> --go

Reads rows through `GET /api/admin/phrase-v4/course/<course>?audio=1`; renders through the one audio route (`POST /api/audio/render`: library first, spend guard — a refusal stops the run); links through the signed edit-batch door as `audio.link` ops carrying `expect: {<slot>: null}` (**fill-only**: a slot someone filled meanwhile is skipped, never overwritten) plus the door's own gate that the clip speaks the row's words. Each link batch is previewed, then applied; undo file names print at the end and the per-slot log is `~/ssi-evidence/ssi-dashboard-v7/993-apply-v4-fra-ben/voice-log-<course>.jsonl`.

The slot → voice table (`SLOT_VOICES`) knows fra_for_eng and eng_for_ben; another course needs Tom's voice picks added there first.
