#!/usr/bin/env bash
# A-158 pilot: re-address clips that were swapped in place before commit 254a2f4d.
#
# The bytes at s3_key are ALREADY correct; what is wrong is that the learner's
# address for them (<uuid>.v<audio_revision>, bare uuid at rev<=1) never moved,
# so any device that cached the pre-swap audio keeps it behind
# max-age=31536000, immutable + IndexedDB. Bumping audio_revision re-addresses
# the clip so those devices re-ask the origin. No bytes are written, no TTS.
#
# Usage: DRY_RUN=1 bump.sh <course> <snapshot.csv>   (default is dry run)
#        DRY_RUN=0 bump.sh <course> <snapshot.csv>
set -euo pipefail
COURSE="${1:?course}"; SNAP="${2:?snapshot csv}"; DRY="${DRY_RUN:-1}"
export PATH=$HOME/.local/pg17/bin:$PATH
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo /home/tomcassidy/SSi/ssi-dashboard-v7-clean)"
set -a; . /home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql; set +a
N=$(( $(wc -l < "$SNAP") - 1 ))
echo "course=$COURSE snapshot_rows=$N dry_run=$DRY"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v course="$COURSE" -v n="$N" -v dry="$DRY" <<SQL
set statement_timeout='600s';
BEGIN;
CREATE TEMP TABLE snap (id uuid, s3_key text, audio_revision int, swap_window text, last_swap timestamptz);
\copy snap FROM '$SNAP' CSV HEADER

-- Drift guard: every snapshotted row must still be byte-for-byte the state we
-- triaged. If anything moved under us, this count differs and we roll back.
CREATE TEMP TABLE agreed AS
SELECT s.id, s.s3_key, s.audio_revision AS rev, ca.course_code
FROM snap s JOIN course_audio ca ON ca.id = s.id
WHERE ca.s3_key = s.s3_key AND ca.audio_revision = s.audio_revision
  AND ca.course_code = :'course';
SELECT count(*) AS snapshot_rows, (SELECT count(*) FROM agreed) AS still_agreeing FROM snap;
DO \$\$ BEGIN
  IF (SELECT count(*) FROM agreed) <> (SELECT count(*) FROM snap) THEN
    RAISE EXCEPTION 'DRIFT: % of % snapshot rows no longer match live state',
      (SELECT count(*) FROM snap) - (SELECT count(*) FROM agreed), (SELECT count(*) FROM snap);
  END IF;
END \$\$;

-- Ledger first: an unrecorded re-address is worse than one that did not happen.
-- previous_s3_key = new_s3_key on purpose — this swap moves the ADDRESS, not
-- the bytes, so both revisions resolve to the same object and the old ref keeps
-- playing for anyone who somehow still holds it.
INSERT INTO course_audio_revisions
  (audio_id, course_code, revision, previous_revision, previous_s3_key, new_s3_key,
   source, accepted_by, reason)
SELECT id, course_code, rev + 1, rev, s3_key, s3_key,
       'a158-stale-cache-remediation', 'a158-pilot',
       'cache-bust only: clip was swapped in place before 254a2f4d, bytes already correct, address never moved'
FROM agreed
ON CONFLICT (audio_id, revision) DO NOTHING;

UPDATE course_audio ca SET audio_revision = a.rev + 1
FROM agreed a WHERE ca.id = a.id AND ca.audio_revision = a.rev;

-- Assert the write took, on every row.
DO \$\$ BEGIN
  IF (SELECT count(*) FROM course_audio ca JOIN agreed a ON a.id=ca.id
      WHERE ca.audio_revision = a.rev + 1) <> (SELECT count(*) FROM agreed) THEN
    RAISE EXCEPTION 'write did not take on every row';
  END IF;
END \$\$;
SELECT count(*) AS bumped, min(audio_revision) AS min_rev, max(audio_revision) AS max_rev
FROM course_audio ca JOIN agreed a ON a.id=ca.id;

\if :dry
  \echo '>>> DRY RUN — rolling back'
  ROLLBACK;
\else
  \echo '>>> APPLYING'
  COMMIT;
\endif
SQL
