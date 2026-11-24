# Nightly course scan {{NIGHT}}: hand-check tonight's candidates and write Kai's morning tables ({{COURSES}})

READ-ONLY. No writes to any course, no renders, no TTS dry runs, no transcription, no tests, no fixes, no dispatches.

## PURPOSE / PRICE
Kai rules Y/N each morning on what to fix next in his live courses. You give him ONE plain-English table per course:
the fault families a person has READ, real examples, a recommended fix. Approved fixes are commissioned separately.
Failure here = handing Kai detector counts that are mostly false positives. Budget: about 30-45 minutes, local file reads only.
The live database is not touched by you at all; the nightly QA copy was already read by the scanner.

## WHAT IS WAITING FOR YOU
The scanner (tools/nightly-course-scan/scan.cjs, on Popty main) has run on the nightly QA copy {{COPY}}. For each course, in {{DIR}}:
- `<course>.sheet.md` — the reading sheet: every family, its candidate count, a 20-row spread sample with the seed. START HERE.
- `<course>.hits.json` — every candidate (read more rows from here when 20 is not enough to judge).
- `<course>.dump.json` — the whole course as read (seeds, LEGOs, every phrase with its audio slot ids), to check context.
Families: untaught_target / untaught_known (P1, K29, K6/K7), gloss_absent + qmark/digits/lex:* (English does not say what the
target says), garble_* (generator garbage; garble_tail = one ending bolted onto many unrelated rows), empty_audio + silent_lego
(slot with no clip linked), lego_absent_absent / lego_absent_near (P17/K8: LEGO not in its own phrase). What each detector does and
does NOT flag is in the header of tools/nightly-course-scan/detectors.cjs — read it once.

## HOW TO JUDGE (the canon is the rulebook: course-methodology-canon.md at the Popty repo root — grep the entry, do not read it all)
- P1 + K29: a phrase may use any word, in that exact form, taught by a LEGO earlier in running order — including its OWN seed's
  LEGOs up to its own LEGO (Kai, 24 Nov: "a seed's own LEGOs are where its words get taught, at that seed"). Welsh: soft mutation
  is the same word. A word met only inside a chunk counts as taught.
- K6/K7: the known side is controlled by LEXEME, not form; a known-side hit is never serious by definition — ask "can the
  learner still produce the answer?" (`target_also_untaught:true` rows are the strong tier).
- P7 + "Open-ended BUILD phrases are legit" (23 Nov): a fragment BUILD is fine; the defect is a prompt not mirroring its open end.
- P14: "unlikely to come up" is not a defect. R0.12: a check that flags Welsh is more likely a wrong check than a defect.
- K8: target LEGO words in the exact taught form; a multi-word LEGO may be split by an inserted word.
- Silent slots are facts (a null pointer), but say what kind: learner-played rows vs components, known vs target, one block vs scattered.
- Audio quality is NOT judged by you: no transcript is evidence (r-2026-11-07). A listening question gets served clip ids or a
  listening page (node ~/command-surface/tools/clip-page.cjs) for Kai's ear.

For EVERY family you put in a table: read at least 20 candidates (all, if fewer) and say how many were real ("about 14 of 20
sampled are real, so roughly 70% of the 212 candidates"). A family you did not read does not go in the table. A family that read
mostly false goes in a short "checked and dismissed" line with the reason, so the detector can be tightened. NEVER report a raw count.

## THE TABLE (one published doc per course)
Plain English, for Kai on a phone. Title: "<course>: what the nightly scan found (<date>)". Columns:
family in plain words · how many (estimate from your sample) · two or three real examples (row id, English | target, what is wrong)
· recommended fix (one line; follow the canon's remedy: P1 -> reword the phrase downward or delete it, K15; L27 for coverage gaps;
silent -> link an existing clip or queue the audio pass, never render) · your confidence. Then one line "checked and dismissed".
Then: "Kai: Y/N per row" — he rules, you never act.

Publish each table (your own token is in your preamble; conv_id routes Kai's replies to his room):
curl -s -X POST http://localhost:4317/api/publish-doc -H 'Content-Type: application/json' -H 'x-cs-conv: <your token>' \
  -d '{"path":"<your $CS_SCRATCH>/<course>.md","title":"<course>: nightly scan (<date>)","conv_id":"9ee96cbd-470d-4215-97d1-7f60b527a03f"}'

## 16 NOV ITEMS AND COURSE NOTES FOR TONIGHT
{{FOLD}}

## WHEN DONE
1. Advance the queue: append each course you PUBLISHED a table for, one per line, to ~/.cs-long/nightly-course-scan/scanned.txt
   (a course you could not finish stays out, so tomorrow's run scans it again — say so).
2. Append `<date>\t<course>\t<url>` lines to ~/.cs-long/nightly-course-scan/published.tsv.
3. Post a /api/job-progress note per course as it lands (keeps the watchdog from mistaking reading for idling).
4. Report to Kai's room: one paragraph — the table urls, the one or two findings most worth his Y/N first, and any gap.
   End with the landing line "no commits" (you commit nothing).
