# Adversarial verification — 2026-08-05

Measured at 2026-08-05T10:40:47Z (and retried at 10:40:50Z).  The production
database was not reachable from this workspace: the configured Supabase host
`aws-1-eu-west-1.pooler.supabase.com` failed DNS resolution with
`getaddrinfo EAI_AGAIN`.  `psql` is not installed; I used the repository's
`pg` client for the attempted read.  This is an explicit access gap, not a
substitute for live evidence.  No database write or TTS command was run.

## 1. “150 French clips were in the wrong voice and are now corrected” — COULD-NOT-VERIFY

I attempted a live schema read, rather than accepting the stated column names:

```sql
SELECT table_name, column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('course_audio','listening_pod_sentences',
                     'course_practice_phrases','course_legos')
ORDER BY table_name, ordinal_position;
```

It returned no rows because connection establishment failed before SQL was
sent (`EAI_AGAIN`).  Consequently I could not reconstruct and execute the
voice-selection query, count `fra_for_eng` updates in the overnight window, or
obtain S3 keys/URLs for a playable-file sample.  The claimed 150, 142 and zero
are therefore unverified.  To close this, provide working DNS/network access
to the configured production endpoint (or a working read-only database
endpoint); then run the schema query followed by a role/voice query and probe
the returned S3 objects with `curl`, `ffprobe` and `ffmpeg`.

## 2. “26 French defective clips were re-rendered clean; truncation is about 10.5%” — COULD-NOT-VERIFY

`ffprobe` and `ffmpeg` are installed.  I inspected the local gate code: it
uses a 400 ms duration floor, target2/target1 duration ratio below 0.5 and a
speech-rate suspicion threshold of 0.55 of the role median; it does **not**
itself establish a 10.5% acoustic truncation rate.  The proposed independent
test was a fresh random sample of at least 100 `fra_for_eng` S3 objects, each
decoded with `ffmpeg -af volumedetect` and tail-window RMS measured over the
last 50 ms, flagging an abrupt non-decaying terminal signal rather than a
quiet/silent decay.  I could not draw the sample or download any object because
the required live `course_audio` read failed at DNS.

I also could not identify the alleged 26 IDs, test their present files, or
measure a confidence interval.  Therefore neither 26 nor 10.5% is confirmed.
The earlier “4 clips” cannot be compared with 10.5% from the available
evidence: I could not establish that they used the same population, detector,
or denominator.  A successful read-only database connection plus the 26 IDs
and S3 keys is required to close this.

## 3. “449 of 1,107 German repair renders were amputated” — COULD-NOT-VERIFY

I searched repository files outside the interested-party Markdown reports for
`repairTailDefect`, `amputating`, `449`, `282`, `1082`/`1,082` and
`1107`/`1,107`.  No retained run log containing the claimed branch-event
counts was found.  The source does establish a material risk, not the alleged
outcome: `services/audio-processor.cjs` defaults `TAIL_REPAIR_MODE` to
`repair`, and its own comments say a host without Whisper can silently bypass
the text-retention guard.  That is source-code evidence of a hazardous path,
not evidence that 449 production files took it.

There is no independent explanation for the numerical remainder: 1,107 − 449
− 282 = **376**.  I could not verify 905 silent clips disappearing, 1,082 live
replacement IDs, branch counts, or a sampled acoustic consequence because the
database and IDs/S3 keys were unavailable.  Closing this requires the raw run
log (with one event per render and replacement ID), and a live read of those
IDs for an acoustic sample.  The claim must not be represented as established
until then.

## 4. “5 contraction text fixes landed” — COULD-NOT-VERIFY

I could not query live `course_practice_phrases` or `course_legos`, so I could
not count present corrected forms, remaining `que on`/`que il`/`si il` errors,
or inspect update timestamps.  I correctly excluded `si elle` and `si on`
from the intended error patterns.

One reporting issue is independently visible in the committed application log,
but it is not proof of the live state: it lists five asserted changes, only
**one** in `fra_for_eng` (`fra_for_eng:S0289L01U05`) and **four** in
`fra_ca_for_eng`.  Thus “5 French fixes” is misleading if it was heard as five
fixes in the `fra_for_eng` course under audit.  To close the claim, execute
read-only searches for literal forms in both live tables and fetch the five IDs
with `target_text` and `updated_at`; no regular-expression word boundary is
needed or appropriate.

## 5. “118 French and 80 German pod slots reference deleted clips” — COULD-NOT-VERIFY

I could not discover the actual array columns or execute the required
unnest/left-join because the schema read failed before SQL execution.  I
therefore cannot confirm 104/14/118/80, enumerate a third UUID array column,
or count distinct affected dialogue rows.  This is precisely the claim for
which live SQL would be decisive, so no repository report has been used as
evidence.

The closing query must enumerate every `uuid[]` column in
`listening_pod_sentences`, unnest each non-null array with ordinality, left join
each UUID to `course_audio(id)`, then group missing entries by `course_code`,
column and distinct pod row.  Working production DNS/read access is the only
missing input.

## Extra finding

The German amputation headline is both unproved and operationally serious:
the current source retains `repair` as the default mode, while the code comments
say that this path can amputate audio when Whisper is unavailable.  A claim
that 449 clips were damaged needs raw-event and file evidence; source comments
alone cannot supply it.  Separately, the contraction headline conflates
`fra_for_eng` with `fra_ca_for_eng` in its own retained log (1 versus 4).
