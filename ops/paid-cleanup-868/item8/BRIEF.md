PLAN AND PRICE ONLY: paid-cleanup ITEM 8 (female voice reading male forms), for Kai's limbo finish (parent job #868, Popty repo). NOTHING is applied, rendered or linked by you, and you make NO live DB reads: plan on the nightly copy only.

PURPOSE: Kai approved item 8 on 18 Nov; both attempts (#709·AI for 8A, #710·AI for 8B) were cancelled in the 18 Nov DB incidents. Since 19 Nov the render route speaks each seat's gender form for NEW clips (commits 53fe33127, 42ffd77b4, 35080b712: services/shared/render-gender-prep.cjs), but OLD clips are unchanged. The parent (#868) will re-record from your plan on 24-25 Nov through POST /api/audio/render + link-clip replace/expectCurrent. Your deliverable is the slot list it will execute, and its price. PRICE: one Opus worker for a few hours; no audio spend at all.

SCOPE
- 8A target side: spa_mx_for_eng, fra_ca_for_eng, por_br_for_eng, ara_for_eng. A target seat whose voice is female (usually target2; check each course's cast) holding a clip that speaks the MALE form of a gendered target line (e.g. "estoy cansado" where a female form exists). #984·AI already re-recorded 8 spa_mx clips (commit cadb0d3b0, ops/listening-fixes-984/): exclude those.
- 8B known side: eng_for_pan, eng_for_urd, eng_for_guj. Two known voices per gender are now cast (f5f1c367d: pan Gurpreet/Navjot, urd Asad/Uzma; guj Amit/Isha already), so item8b.cjs's VOICES table on branch cs/710-paid-cleanup-item-8b-hindi-two-v is STALE (Azure names): read the live cast from the copy / Popty's voice-config code, not from it. 8B = known lines with speaker gender whose clip is in the other gender's voice. #710's detect.json outputs (guj/pan/urd) and the guj plan are on that branch (unmerged): reuse them where the texts still match the copy, and say which you reused. Do NOT re-run the Claude-CLI detector over whole courses: use #710's detector output and the stored gender pairs (course_gender_expansions) as they sit on the copy.
- Note: the parent fills ~616 empty eng_for_pan and 199 eng_for_guj known slots (item 1 leftovers) through the render route first; those are NOT yours (they are silent, not mis-voiced).

HOW (rules)
- Read CLAUDE.md and course-methodology-canon.md (gender sections) first.
- Database: only committed, merged tools, against the copy env (`set -a; . ~/ssi-restore/qa-copy.env; set +a`; the db-shim maps reads to the copy). Useful readers: ops/paid-cleanup-scan-447/copy-read.cjs (dump / baskets), tools/course-optimization/course-dump-readonly-2026-10-14.cjs, tools/course-optimization/gender-pairs-dump-readonly-2026-10-29.cjs, services/shared/agent-db.cjs clipsById (clip voice + text by id). No hand-written DB code of any kind, read-only included (the guard refuses it). If you need a reader that does not exist, write a tool in ops/paid-cleanup-868/item8/tools/ that only reads JSON files the committed readers produced. If the voice of an existing clip cannot be learned from a committed reader, report that as a gap; never guess.
- No Whisper / transcription. No tests.
- Scratch in $CS_SCRATCH, never /tmp.

OUTPUT (commit to your branch, under ops/paid-cleanup-868/item8/):
- slots.json: `{copy, slots:[{course, target:'phrase'|'lego', id, role:'known'|'target1'|'target2', text (the row text), want_gender:'f'|'m', current_audio_id, current_voice, why}]}`, one entry per slot to re-record, ordered by course in Kai's list order (spa_mx, fra_ca, por_br, ara, pan, urd, guj) then seed.
- README.md: counts per course, chars (text length per slot), what you excluded and why, gaps.
- sample.json: ~10 slot keys per course for Kai's ear (the parent builds the listening page).

Report to the parent in one paragraph with the counts, chars and your branch name. Do not merge to main; the parent lands it.
