READ-ONLY LANGUAGE READ for job #248·AD (Kai approved 4 Nov 13:16Z; recording plan approved with the condition that every batch is read in full before it is rendered): rebuilding the practice-phrase baskets of seeds 301-668 in COURSE_CODE. You are the independent (cross-family) reader of phrases the Opus phrase-v4 generator wrote. You write NO database rows, run NO tests, call NO audio, and touch nothing in Popty. Your only output is one JSON file committed to your branch.

PURPOSE: learners on seeds 301+ currently drill broken phrases (job #240 found ~90% of the June generator's rows padded: Japanese って言ってた / と思う / から / ことがある tails the English does not say; Korean phantom 교회가 "the church", dangling 있어요, an "I heard about / trust about" template). New baskets were generated and passed every Popty gate (taught vocabulary, LEGO containment, ZUT). Gates cannot judge meaning or naturalness — that is your job, row by row. PRICE: one careful read of about 1,000 short rows; no fan-out, no tools beyond the one below.

SETUP (your worktree is off origin/main; the data lives on the parent's branch):
  git fetch origin cs/248-jpn-kor-rebuild-301-668
  git checkout origin/cs/248-jpn-kor-rebuild-301-668 -- tools/course-optimization/jpn-kor-rebuild-248-2026-11-04.cjs ops/jpn-kor-rebuild-248
  node tools/course-optimization/jpn-kor-rebuild-248-2026-11-04.cjs read LANG RANGE ~/ssi-evidence/ssi-dashboard-v7/ops/jpn-kor-rebuild-248/LANG-dump-start.json > $CS_SCRATCH/read.txt
The output lists, per LEGO, the LEGO pair, the seed, the OLD rows and the NEW rows ("NEW B" = build, "NEW U" = use). Read ONLY the NEW rows, every one, in full. Ignore any "<<PAD" marks (the plan step re-checks padding itself) and any LEGO showing "not generated" or "BLOCKED" (out of scope).

REFUSE a NEW row when (and only when) one of these is true:
 1. The English and the target do not mean the same thing: content added or dropped (a noun, a person — e.g. English "my son" with no 息子/아들 —, a time, a negation, a tense or polarity flip, a question turned into a statement in meaning, a wrong gloss such as "hoped" for 〜たかった/싶었어요 "wanted"). NOT a defect: natural omission of pronouns and possessives that Japanese/Korean leave unsaid (he/she/I/me/his/that), a dropped particle in casual speech, a missing question mark.
 2. The English is unnatural or stilted — not something an English speaker would say (e.g. "I'm not sure if I have never seen that person", "the young dog"), or a fragment that reads as broken English, or a verb missing its required object/place ("can put it at work").
 3. The target is ungrammatical or unnatural for a native speaker, or carries a padding tail the English does not support (the #240 list above).
 4. The target says something different from what the English means in context (wrong sense of a word, e.g. バッグに置く for "put in a bag").
Rare but natural is FINE ("unlikely to come up is not a defect"). Do not refuse for vocabulary, for which words are taught, or for duplicates — the gates own those. When in doubt about meaning, refuse; when in doubt only about taste, keep.
LANGUAGE_NOTE

OUTPUT: write ops/jpn-kor-rebuild-248/LANG/reads/RANGE.json exactly like
  {"course":"COURSE_CODE","range":"RANGE","reader":"<your job label>","legos_read":<n>,"rows_read":<n>,"drops":{"S0312L02|<the English EXACTLY as printed on the NEW line, same case and punctuation>":"<one-line reason>"}}
The key is the LEGO id from the ### header, a pipe, then the known text byte-for-byte as printed (the plan matches on it). rows_read must equal the number of NEW lines you read. Commit ONLY that file (git add that one path), push your branch. Do not commit the checked-out tool or other ops files. Do not merge anything. Scratch goes in $CS_SCRATCH.

REPORT (one paragraph + landing line): rows read, rows refused, the 3-5 commonest reasons with one example each, and your branch name. If anything stopped you (a missing file, an unreadable range), say so plainly as a gap.
