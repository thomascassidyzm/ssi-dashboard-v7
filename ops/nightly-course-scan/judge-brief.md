# Nightly course scan: BIG or NOT BIG? Judge the three Italian tables (Thu 26 Nov 2026)

Dispatched once by `cs-long-keep-nightly-scan-judge.timer` (armed by cs #387·AL). You run on watson-1 in the Popty repo.

## PURPOSE
The nightly read-only course scan (`ops/nightly-course-scan/`) scanned ita_for_eng, ita_for_jpn and ita_for_zho on the night of 25 Nov and is now PAUSED: from 26 Nov `night-run.sh` scans nothing unless `~/.cs-long/nightly-course-scan/CONTINUE` exists. You decide whether it resumes. Your verdict is the one thing that sets that flag. The scan resumes with Spanish at 22:20 UTC on the night of the day the flag appears. Kai reads your verdict on Monday 30 Nov. Kai's assistant reads it in this room before then.

Kai's words, verbatim (25 Nov): "If the italian scans don't turn up enough stuff, don't blindly run through everything else. But if there's anything big then it looks like it'll be worth it to scan"

## PRICE
One worker and well under an hour. You read three published tables and two docs, create or leave one flag file, and publish one doc. You make no DB reads, run no scans, no tests and no audio. watson-1 is shared with Kai's night writers and rebuild chains, so run nothing heavy and start or stop no unit except the waker described below.

## Step 1: find the three tables
- Read `~/.cs-long/nightly-course-scan/published.tsv` (tab-separated: date, course, url). You want the rows for ita_for_eng, ita_for_jpn and ita_for_zho, normally dated 2026-11-25 or 2026-11-26.
- Open each table url. If the public url is behind a login, fetch `http://localhost:4317/d/<id>` with your own `x-cs-conv` token.
- If any of the three is missing, look at `~/.cs-long/nightly-course-scan/night-20261125.log` and `night-20261126.log`. The night worker may not have published yet, or the night may have been skipped. Do NOT poll. Arm ONE bounded waker that checks every 15 minutes and gives up at 15:00 UTC, then end your turn. Its timeout branch must still wake you: `systemd-run --user --unit=cs-wake-ita-judge --slice=cs-workers.slice --setenv=CS_CONV_TOKEN bash -lc '<loop checking published.tsv for all three courses, 15 min apart, until 15:00 UTC> ; node ~/command-surface/tools/cs-wake-send.cjs <your own conversation id> "$CS_CONV_TOKEN" "$M"'`. Never put the token on the command line. If any table is still missing at the timeout, decide on the tables that exist and say exactly which were missing and why (quote the log line).

## Step 2: decide BIG or NOT BIG
- **BIG** means a defect family that a learner would notice across many served rows:
  - wrong word or wrong meaning
  - wrong language
  - grammar errors in target or known lines that learners hear
  - broken or silent audio
  - teaching delivered in the wrong order
- **NOT BIG** covers:
  - isolated one-offs
  - cosmetic punctuation
  - issues found only in unserved or draft rows
  - families an earlier fix already covers

  Check what is already fixed before counting a family as BIG:
  - "Every course fix since 1 Nov": https://watson-1.tail4968cb.ts.net/d/fa02bb53
  - ita_for_eng P2/P3/P4 applied + formal sir/madam scan: https://watson-1.tail4968cb.ts.net/d/52cad21a
- One BIG family in any of the three courses is enough to make the verdict BIG. That matches Kai's "if there's anything big".
- If a table row is about audio, the evidence is the served clip id exactly as the table states it. Never transcribe audio and never use Whisper.

## Step 3: act on the verdict (the flag only)
- **If BIG:** run `touch ~/.cs-long/nightly-course-scan/CONTINUE`, then confirm it with `ls -l`. Report why, with 3 to 5 concrete examples. Give each example's course, seed or LEGO id, the row text and what is wrong.
- **If NOT BIG:** leave the scan paused. Do not create the flag. Write a short summary for Kai to read on Monday 30 Nov. End it with the question "Resume the nightly scan? Y/N" and your recommendation.

## Hard limits
- **Never act on table rows.** You make no edits, no deletes and no renders, and you have no DB access at all. Hand-written code against the database is banned outright (Tom, job #384). Any fix needs Kai's Y/N first.
- **Do not message Kai.** He is away until Monday 30 Nov. Use no `toPerson`, send nothing to his Watson inbox and post no needs-you card. Your report goes into this parent room only.
- Do not change the scan queue, `scanned.txt`, `published.tsv` or any unit except the waker above.

## Deliverable
Publish your verdict as a doc via `/api/publish-doc` with `"conv_id":"0771c4ec-a4cd-44f4-b21e-fe0bc5e6a9cc"`, and name its url. Your report is one paragraph containing:
- the verdict
- whether the CONTINUE flag now exists
- what was missing, if anything

Then the landing line: "no commits", unless you committed something.
