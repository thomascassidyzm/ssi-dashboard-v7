# spa_mx_for_eng Pod 1 — does it have the ita_for_eng disease?

**2026-08-24. Parallel sweep, one course per worker, triggered by the confirmed `ita_for_eng` split-array defect (`docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md`).**

## Verdict: **INFECTED.** Same mechanism, same scene number, live in production right now.

---

## What was checked

**(1) Text/casting construction** — already covered by the same-day sibling doc `docs/pods/spa-pod1-casting-construction-audit-2026-08-24.md` (commit `94faa6f18`): cast identity, resolution, speaker-stability all PASS for `spa_mx_for_eng:pod-1`. That audit only read `target_audio_id`/`known_audio_id` and the `speakers` map — the same two-of-six-columns blind spot the `ita_for_eng` flip gate had. It did not check `sentence_audio_ids`/`sentence_known_audio_ids` (the split-clip columns), which is where this disease lives.

**(2) Served audio, by bytes, via production** — this worker's addition.

## The defect

`listening_pods` for `spa_mx_for_eng` shows the identical shape to Italian: a `pod-1` (live, created `2026-08-24T08:32:20.767Z`) and a `pod-1-retired-2026-08-24` created at the **exact same timestamp** — a same-day recast. `target_audio_id`/`known_audio_id` (whole-turn columns) differ on 44/231 rows between the two — they were re-derived. **`sentence_audio_ids`/`sentence_known_audio_ids` (split-clip arrays) are byte-identical on all 231/231 rows** — never touched by the recast.

Reading the live pod's scene 15 (11 rows, "Learner" self-assessment drill, target text `¿Cuánto es?`, `¿Me puede decir cuánto es?`, etc.):

**9 of 11 rows' split-clip arrays carry a completely different conversation** — the "practising the language with a friend" dialogue ("¿Le molestaría si intentara practicar hablando español mexicano con usted?" / "Claro, no hay problema. Parece que lo hablas muy bien.") — voiced by `eve` / `rex` / `xai_eve`, **none of which are in the pod-1 cast** (`azure_es-MX-CarlotaNeural` / `azure_es-MX-LucianoNeural` target, `bedd6226`/`gfzdpspr5fdp` known).

That "practising the language" conversation is not a phantom — it's **scene 22's real content**, confirmed by querying scene 22's own `target_audio_id` rows: text matches verbatim, correctly cast to Carlota/Luciano. Exactly the `ita_for_eng` pattern: a conversation's scene number moved between pod builds, the split-clip arrays were carried over positionally/by old scene-slot and never re-derived, so scene 15 now plays scene 22's dialogue in stale, off-cast voices while its own `target_text`/`known_text` and whole-turn clips are correct.

## Served-bytes proof (production path, `https://saysomethingin.app/api/audio/<id>`)

- **Whole-turn clips (6 scenes, 10 lines: 1.1, 4.1-2, 8.1-2, 12.1-2, 17.1-2, 22.1-2): all HTTP 200, correctly cast** (Luciano on Neighbour/Friend/Bartender/Pharmacist/Guest-role lines, Carlota on Sarah/Customer/Learner/Friend-reply lines), text matches DB `target_text` for every row checked, including scene 22 — confirming the "practising the language" conversation's true, correctly-cast home.
- **Scene 15's two split clips fetched directly** (`c8ad6ebf…`, `aa59de19…`): HTTP 200, 104,876 / 140,012 bytes, ffprobe durations 4.3s / 5.8s — consistent with their actual (wrong) text length, not silence or corruption. **This defect is live and audible to a learner today**, not a dead unused DB row.

## Scope note

A broader text-containment sweep of all 91 split-array rows course-wide flagged 18 rows total where split-clip text doesn't obviously relate to the row's own `target_text`; most of the other 17 are consistent with legitimate MX-Spanish paraphrase/localisation differences rather than wrong-conversation swaps (not individually verified — this pass focused on confirming/denying the disease, not a full course audit). **Scene 15 is confirmed disease; the other 17 are unconfirmed and worth the same root-cause crew's attention if they generalise the ita fix.**

## Explicit gaps

- No F0/speaker-clustering pass run (time-boxed at ~20 min) — the text-content mismatch plus off-cast `voice_id` values (`eve`/`rex`/`xai_eng` not in the declared cast) is already conclusive without it.
- Did not check `spa_for_eng` (Castilian sibling course) — out of this worker's scope (`spa_mx_for_eng` only).
- Did not check the other 17 flagged rows individually — see Scope note.
- No fix applied, no pointer touched, no audio generated or deleted, per brief.

## Data

Raw picks, ids, and byte/duration results: ad hoc queries in this session, not saved to a JSON artifact (time-boxed run). Re-run is one query against `listening_pod_sentences` for `pod_id = (SELECT id FROM listening_pods WHERE course_code='spa_mx_for_eng' AND visibility='live')`, `scene_number=15`, joined to `course_audio` on `sentence_audio_ids`.
