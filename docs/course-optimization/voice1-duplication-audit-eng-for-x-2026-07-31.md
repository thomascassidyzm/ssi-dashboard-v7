# Voice-1 duplication audit — eng_for_X family (2026-07-31)

Founder report (2026-07-31, live app): *"English for Kannada speakers seems to have MY voice for
BOTH voice 1 and voice 2 — most of the other English for courses seem to have done it correctly —
voice 1 = female, voice 2 = male."*

Verdict in one line: **confirmed — a 2026-07-05 run of `clone-copy-pass.cjs` filled eng_for_kan
and eng_for_tel target1 (female) slots with Tom's male clone clips because the tool applies ONE
voiceId to every role; the fix is a zero-TTS remap to female clips that already exist across the
family.**

## Root cause

`tools/course-optimization/clone-copy-pass.cjs` takes a single `--voice` (default
`CLONE_VOICE_ID = gfzdpspr5fdp`, Tom's male xAI clone) and applies it to **every slot role it
fills**. For X_for_eng courses that is correct (the clone is the estate-wide English known-side
voice, Tom's ruling). For eng_for_X courses the slot list includes `target1` AND `target2`
(`SLOT_DEFS`, lines 62–67) — so the same male voice was written into the female voice-1 role. The
tool never reads the course's `voice_config` (which correctly said target1 = `bedd6226` "Olivia").

The run: 2026-07-05T00:29–00:32Z (all wrong rows timestamp inside this window), an `--apply` pass
against **eng_for_kan** (2,636 target1 rows) and **eng_for_tel** (1,945). Each inserted row shares
the *identical s3_key* with the course's own target2 row for the same text — voice 1 literally
plays voice 2's file (verified 30/30 sampled). `phase8.linkAudioIds` (called by the tool after
copying) then pointed live FKs at them: kan 4,697 slots (3,722 phrases + 720 legos + 255 seeds),
tel 3,040 (2,246 + 538 + 256). LEGO debuts were hit hardest (257/300 sampled kan legos male),
which is exactly why Tom heard his own voice as voice 1 immediately.

**Phantom-sweep check** (Tom flagged the prior claimed-but-never-ran sweep): this is the inverse
fingerprint. The 07-05 pass REALLY ran and really wrote rows — but left **no ledger at all**
(the tool has no log-writing code; nothing in `docs/audio-sweeps/` or `logs/`). Ran-but-wrong and
unledgered, not claimed-but-never-ran. The 2026-07-27/28 phase8 batch is NOT implicated: its copy
bucket resolves voices per-role from voice_config and wrote correct rows (kan gained 490 correct
female `bedd6226` copies and 9,547 `xai_bedd6226` renders on 07-27).

## Per-course audit table (all 19 eng_for_X courses)

Convention: voice 1 (target1) = female (Olivia `bedd6226` on xAI courses, Sonia on Azure courses);
voice 2 (target2) = male (Tom `gfzdpspr5fdp` / Ryan / Oliver). "Male t1 rows" = course_audio rows
with a male voice in the target1 role; "FK-linked" = live learner-facing slots
(seeds/legos/phrases `target1_audio_id`) actually resolving to a male clip.

| Course | Config t1/t2 | Male t1 rows | FK-linked wrong slots | Verdict |
|---|---|---|---|---|
| eng_for_kan | Olivia/Tom ✓ | **2,636** (07-05 event) | **4,697** | **DUPLICATED — the reported course** |
| eng_for_tel | Olivia/Tom ✓ | **1,945** (07-05 event) | **3,040** | **DUPLICATED — same event, unreported** |
| eng_for_kor | Sonia/Ryan ✓ | 55 | 18 | wrong-gender residue (legacy 04-28 + 07-05) |
| eng_for_fra | Sonia/Ryan ✓ | 14 | 10 | wrong-gender residue |
| eng_for_ita | Sonia/Ryan ✓ | 15 | 10 | wrong-gender residue |
| eng_for_por | Sonia/Ryan ✓ | 13 | 10 | wrong-gender residue |
| eng_for_deu | Sonia/Ryan ✓ | 15 | 8 | wrong-gender residue |
| eng_for_spa | Sonia/Ryan ✓ | 14 | 8 | wrong-gender residue |
| eng_for_ara | Olivia/Tom ✓ | 37 | 0 | debris only, not learner-facing |
| eng_for_ben | Olivia/Tom ✓ | 30 | 0 | debris only |
| eng_for_guj | Olivia/Tom ✓ | 30 | 0 | debris only |
| eng_for_hin | Olivia/Tom ✓ | 30 | 0 | debris only |
| eng_for_jpn | Olivia/Tom ✓ | 37 | 0 | debris only |
| eng_for_mar | Olivia/Tom ✓ | 0 | 0 | OK |
| eng_for_pan | Olivia/Tom ✓ | 30 | 0 | debris only |
| eng_for_sin | Olivia/Tom ✓ | 30 | 0 | debris only |
| eng_for_tam | Olivia/Tom ✓ | 30 | 0 | debris only |
| eng_for_urd | Olivia/Tom ✓ | 30 | 0 | debris only |
| eng_for_zho | Olivia/Tom ✓ | 37 | 0 | debris only |

Voice_config is correct in ALL 19 courses — the defect lives entirely in `course_audio` rows and
the FKs pointing at them. Raw evidence: `scripts/eng-for-x-voice-audit-report.json`,
`scripts/small-course-contamination.json` (gitignored workspace snapshots).

## The fix (zero TTS — Tom's "we MUST have all the content already" verified)

Family-wide female (Olivia) target1 pool = 75,603 unique normalized texts. Coverage of the wrong
rows: kan **2,636/2,636**, tel **1,945/1,945** — every needed female clip already exists in a
sibling course. `tools/course-optimization/voice1-remap-eng-for-x.cjs` (DRY_RUN default,
`--apply` gated):

1. Insert course-owned target1 rows, `voice_id 'bedd6226'`, s3_key shared with the family source
   (the established copy convention — no new physical object, no render).
2. Repoint `target1_audio_id` FKs from each male row to the new female row; the UPDATE's WHERE
   clause (`course_code` + `target1_audio_id = <male row id>`) is the per-row before-state
   assertion.
3. Delete nothing. The now-unlinked male target1 rows (kan 2,636 + tel 1,945 + ~430 debris across
   the family) are logged for a separate approval-gated cleanup.

Per-run logs: `docs/audio-sweeps/voice1-remap-<course>-{dryrun,applied}-<stamp>.json`.

**Apply status (2026-07-31): staged, dry-run-verified, BLOCKED on machine access.** This
investigation ran on watson-1, which is deliberately read-only against Supabase (the `.env`
service key is the anon-key stand-in — the one-writer safety net). The kan `--apply` failed
cleanly on the first insert batch (`permission denied for table course_audio`, zero rows
written, FKs untouched). The apply must run on the Camberley Mac (the one production writer):

```bash
git fetch origin && git checkout fix/eng-for-x-voice1-remap   # or main after merge
node tools/course-optimization/voice1-remap-eng-for-x.cjs eng_for_kan --apply
node tools/course-optimization/voice1-remap-eng-for-x.cjs eng_for_tel --apply
```

Each run re-derives everything from the live DB (no stale state), asserts before-states row by
row, writes an applied log, and is idempotent (re-running finds nothing left to repoint).
Verification after apply: `node tools/course-optimization/audit-voice1-gender-eng-for-x.cjs`
on any machine (read-only) — kan/tel FK columns must resolve 100% female, and the male target1
rows must show 0 FK links.

The six Azure-course residues (64 FK-linked slots) are NOT remapped in this pass: their female
voice is Sonia (Azure), and Azure clips are untrusted as cross-course copy sources (speed baked
into the render — `clone-copy-match.cjs isTrusted1xEngine`). Only ~13 of the 64 texts have a
same-course Sonia row to repoint to. Escalated to Tom rather than half-fixed (see report).

## Prevention

`clone-copy-pass.cjs` should refuse `--apply` on an eng_for_X course whose target1 configured
voice differs from the pass voice — or resolve voice per-role from voice_config like phase8's
copy bucket does. Left as a follow-up flagged in the report (one-line guard).
