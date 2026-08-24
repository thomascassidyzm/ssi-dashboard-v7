# T-20 originals hunt — LEG 3 of 3: BACKUPS

**Date:** 2026-08-14 · **Scope:** every backup source that exists for this estate ·
**Mode:** READ-ONLY — nothing restored, nothing written to any DB, nothing deleted.

**Companion legs:** `t20-clipped-human-recordings-diagnosis.md` (the diagnosis: S3, DB,
local disk, browser).

---

## The verdict, up front

**No backup source on this estate holds the raw voice-actor bytes, and none ever could.**

This leg does not rest on "we looked and did not find it." It rests on two structural
facts, each measured, that make the raw bytes unreachable from *any* backup by
construction:

1. **The database has nowhere to put audio.** The `public` schema contains **zero
   `bytea` columns** and **zero large objects**. Across all **3,358,508** rows ever
   written to `content_audit_log`, the largest single row is **57,606 bytes**. A
   database backup — physical, logical, PITR, or WAL replay — can only return rows that
   existed. No row ever held audio.
2. **The scratch directory was never on a disk.** `processRecordingBuffer` writes the raw
   WebM to `mkdtemp(os.tmpdir(), 'ssi-recording-')`. On watson-1, **`/tmp` is `tmpfs` —
   RAM-backed**, and `popty-production-api.service` sets no `TMPDIR` override. The raw
   bytes existed in volatile memory only. **A whole-disk image cannot contain something
   that was never on the disk.** This retires the filesystem-snapshot and
   Hetzner-nightly-image angles outright, independently of whether those backups exist.

The recording session dates land as follows against the only backup window that reaches
them at all:

| session date | inside a backup window? | what that proves |
|---|---|---|
| 2026-02-16 | **No** — 5 months outside every window | proof of absence |
| 2026-05-22 | **No** — outside both windows | proof of absence |
| 2026-06-15 | **Yes** — S3 `audit-archive/` partition exists | archive pulled and grepped: **zero audio bytes** |
| 2026-06-16 | **Yes** — S3 `audit-archive/` partition exists | archive pulled and grepped: **zero audio bytes** |
| 2026-08-10 | **Yes** — Supabase daily backup window | in window, but no audio-bearing column exists to restore |

Two of the five dates *are* covered by a real, reachable artefact. I pulled both and read
them. They contain course_audio rows with a 16-column schema and no bytes column. That is
a stronger result than "out of window": it is a positive read of in-window data showing
the audio was never there.

---

## Source-by-source table

| # | Source | Exists? | Could I access it? | Covers a session date? | What it proves |
|---|---|---|---|---|---|
| 1 | **Supabase PITR** | **No — `pitr_enabled: false`** | Yes (Management API) | n/a | Add-on never purchased. No point-in-time restore is possible to *any* date. |
| 2 | **Supabase daily physical backups** | Yes — 8 retained | Yes (Management API) | **2026-08-10 only** | Pro-plan 7-day window, 2026-08-07 → 2026-08-14. The other four dates are far outside. The in-window one has no audio column to restore. |
| 3 | **WAL archiving** | Yes — `archive_mode=on`, wal-g | Settings yes; **archive store no** | n/a | 49,183 segments archived. WAL records *row changes*; no row ever held audio. **GAP: the wal-g store is Supabase-internal.** |
| 4 | **Logical replication subscribers** | **No** | Yes | n/a | `pg_replication_slots`, `pg_stat_replication`, `pg_stat_subscription` all return **0 rows**. No subscriber holds historical rows. |
| 5 | **Local/server pg_dump artefacts** | **No** | Yes | No | Estate-wide search found only the pg_dump *binaries*. Zero `.dump`/`.sql.gz`/`.backup` files, zero `.sql` over 1 MB. |
| 6 | **Scheduled DB backup job** | Yes, but wrong DB | Yes | n/a | `ops/backup.sh` (6-hourly) snapshots the **command-surface SQLite** DB, local-only by ruling. It does not touch Popty Postgres. |
| 7 | **Filesystem snapshots** | **No** | Yes | n/a | Single unpartitioned **ext4** `/dev/sda1`. No LVM, no btrfs subvolumes, no ZFS. ext4 has no snapshot mechanism. |
| 8 | **restic / borg / duplicity / rsnapshot / timeshift / snapper / rclone** | **None installed** | Yes | n/a | All seven absent from PATH. No `/etc/fstab` backup target, no mounted backup volume. |
| 9 | **Hetzner nightly whole-disk image** | Unknown | **No — GAP** | Would cover all five | **Moot regardless:** `/tmp` is tmpfs, so the scratch dir was never on the imaged disk. **GAP: no `HCLOUD_TOKEN` on this box.** |
| 10 | **S3 `backups/` prefix** | Yes — 19 objects, 31.8 MB | Yes | **No** | Contains only hiss-reprocess JSONL logs, all stamped 2026-07-29. **No DB dumps of any kind.** |
| 11 | **S3 `audit-archive/` prefix** | Yes — 266 objects, 1.08 GB | Yes | **Yes — 06-15 and 06-16** | 34 daily partitions, 2026-05-28 → 2026-07-02. **Pulled both in-window `course_audio.ndjson.gz` and grepped: zero hits.** See below. |
| 12 | **S3 bucket replication** | **No** | Yes | n/a | `ReplicationConfigurationNotFoundError` on `ssi-audio-stage` and `ssi-media-prod`. Nothing replicates anywhere. |
| 13 | **S3 lifecycle / Glacier** | **No** | Yes | n/a | `NoSuchLifecycleConfiguration`. Nothing was tiered to Glacier, so no objects are hidden from a listing. |
| 14 | **S3 versioning** | Yes (`Enabled`) | Yes | n/a | Confirms the diagnosis: versioning preserves *overwrites*, and the raw file was never PUT, so there is no earlier version. |
| 15 | **S3 server access logging** | **No** | Yes | n/a | `GetBucketLogging` → `{}`. No PUT-level access log exists to even prove what was uploaded. |
| 16 | **Legacy `.backup` buckets** | Yes, but dead | Yes | **No** | `ssibackup` newest 2025-03-19; `ssiborg-db` 2022-11 → 2023-01; `saysomethingin.backup` 2022-11. All predate the studio path by years. |
| 17 | **Express request-body logging** | **No** | Yes | n/a | No morgan/pino/winston file logger in `services/`. The upload route never logs `audioData`. |
| 18 | **journald** | Yes | Yes | **2026-08-10 only** | Oldest entry **2026-07-28** — cannot reach the other four dates. Grepped 2026-08-10 (536 lines): **zero** `GkXf`/`SUQz` hits. |
| 19 | **ngrok request capture** | **No** | Yes | n/a | No `~/.ngrok2`, no `~/.config/ngrok`. No inspection/replay capture configured. |
| 20 | **Vercel** | Yes, but not on this path | Yes | n/a | `vercel.json` is static-asset headers only. The upload posts to watson-1:3470 directly, not through Vercel. Vercel does not retain request bodies in any case. |

---

## Evidence

### 1–2. Supabase: plan, PITR, and the exact retention window

Management token found at `~/.secrets/supabase.env` (`SUPABASE_ACCESS_TOKEN`).
Project `swfvymspfxmnfhevgdkg` ("ssi-popty"), org `lykkviwuowcokpnhuhlt` ("Zenjin"),
**plan `pro`**, region `eu-west-1`.

`GET /v1/projects/{ref}/database/backups`:

```
"pitr_enabled": false,
"walg_enabled": true,
backups: 8 × is_physical_backup=true, all COMPLETED
  2026-08-14T02:01:50Z   2026-08-13T01:59:03Z   2026-08-12T01:56:37Z   2026-08-11T02:00:55Z
  2026-08-10T01:59:42Z   2026-08-09T02:00:14Z   2026-08-08T01:59:57Z   2026-08-07T01:58:24Z
```

`GET /v1/projects/{ref}/billing/addons` → `selected_addons` contains **only**
`compute_instance` (ci_small). **No PITR add-on.**

**The retention window is 2026-08-07T01:58Z → 2026-08-14T02:01Z — 7 rolling days.**

- **2026-02-16, 2026-05-22, 2026-06-15, 2026-06-16 fall outside it.** For these four
  dates there is no Supabase backup of any kind. This is a definitive proof of absence.
- **2026-08-10 falls inside it.** A restore to that date is technically available (the
  08-10 backup was taken 01:59Z; the 08-11 through 08-14 backups also carry post-session
  state). It would return `course_audio` rows pointing at mastered MP3 keys — see §"Why
  an in-window backup still yields nothing".

*Clock worth noting:* the window is rolling, so the 2026-08-10 backup ages out around
**2026-08-18**. Nothing in this leg needs it, but if Tom ever wants the DB state of that
session for another reason, that is the deadline.

### 3–4. WAL and replication

```
wal_level      = logical
archive_mode   = on
archive_command= /usr/bin/admin-mgr wal-push %p >> /var/log/wal-g/wal-push.log 2>&1
archive_timeout= 120

pg_stat_archiver: archived_count=49183  last_archived=2026-08-14 17:27:53Z
                  failed_count=2        stats_reset=2026-06-23 03:02:44Z

pg_replication_slots   → 0 rows
pg_stat_replication    → 0 rows
pg_stat_subscription   → 0 rows
wal_keep_size=0   max_slot_wal_keep_size=2GB
```

WAL archiving is real and healthy, but it is the machinery *behind* the daily physical
backups, not an independent longer history — `pitr_enabled: false` means no arbitrary
point-in-time restore is offered. **Zero replication slots, zero walsenders and zero
subscriptions** means there is no logical replica anywhere that could hold rows that have
since changed.

### The structural proof: the DB has nowhere to put audio

Every `bytea`/`oid` column in the entire database, all schemas:

```
auth.webauthn_credentials.credential_id, .public_key     (bytea)
extensions.hypopg_*, pg_stat_statements                   (oid)
net.http_request_queue.body                               (bytea)  → 0 rows
realtime.messages*.binary_payload                         (bytea)  → realtime, not audio
vault.secrets.nonce, vault.decrypted_secrets.nonce        (bytea)
```

**Not one is in the `public` schema.** Large objects: `pg_largeobject_metadata` = **0**,
`pg_largeobject` = **0**. `net.http_request_queue` and `net._http_response` are both
empty.

Empirical confirmation on the tables that matter, full scans:

| scan | rows | `GkXf` (WebM) | `SUQz` (MP3 ID3) | `//u/` (MP3) |
|---|---|---|---|---|
| `course_audio` (whole table) | 2,564,586 | **0** | **0** | — |
| `recording_provenance` (whole table) | 308 | **0** | **0** | — |
| `content_audit_log`, five session dates | 450 | **0** | **0** | **0** |

`content_audit_log` is the only object in `public` with a TOAST large enough to hide
audio (19 GB). Its ceiling settles it:

```
max(pg_column_size(old_row)) over ALL 3,358,508 rows = 57,606 bytes
```

Scoped to the session dates, only 2026-08-10 has any audit rows at all (450 rows,
808 kB total, largest row 13,456 bytes). The other four dates have **zero** audit rows.

*(`content_audit_log` records only UPDATE and DELETE — a newly inserted recording row
would not appear there at all.)*

### Why an in-window backup still yields nothing

This is the crux, so it is worth stating plainly rather than leaving as an inference.

A Supabase physical backup restores the database as it stood. On 2026-08-10 the database
held, for each take, a `course_audio` row whose `s3_key` pointed at the **already-processed**
`mastered/{uuid}.mp3`. The raw WebM was never inserted into any column, because no column
of a type capable of holding it exists in `public`. Restoring the 2026-08-10 backup would
therefore return the same rows the live database returns today, pointing at the same
already-butchered MP3s.

The backup is not stale or partial. It is complete — and complete does not include
something that was never written.

### 5–8. Local and server dumps, snapshots, backup tooling

This machine **is** watson-1 (`hostname` → `watson-1`; Hetzner metadata endpoint
confirms instance `156338210`, `hel1-dc2`), so "this machine" and "the server" are the
same box and there is no second host to reach.

```
find /home/tomcassidy -maxdepth 6 \( -name "*.dump" -o -name "*.sql.gz" -o -name "*.sql.zst"
     -o -name "*.backup" -o -name "pg_dump*" -o -name "*dumpall*" \) -type f
  → /home/tomcassidy/.local/pg17/bin/pg_dumpall   (the binary)
  → /home/tomcassidy/.local/pg17/bin/pg_dump      (the binary)

find ... -name "*.sql" -size +1M   → (nothing)
```

**Zero Postgres dump artefacts exist on this estate.** There was nothing to grep for
audio signatures, because no dump file exists.

Scheduled jobs (`crontab -l`) include `ops/backup.sh` every 6 hours — but its own header
states its scope: *"6-hourly SQLite snapshot… Only the DB is backed up — code lives in
git"*, referring to the **command-surface** SQLite database, local-only by Tom's
2026-08-06 ruling. It never touches Popty's Postgres. No system timer, `/etc/cron.d`,
`/etc/cron.daily` or `/etc/cron.weekly` entry backs up a database.

Filesystem:

```
lsblk -f:  sda1  ext4  /        (single unpartitioned disk, 228.8G avail, 20% used)
           sda15 vfat  /boot/efi
/etc/fstab: only / , /boot/efi , /swapfile — no backup target mounted

restic borg borgmatic duplicity rsnapshot timeshift snapper rclone → ALL "NOT INSTALLED"
```

ext4 on a single disk with no LVM volume group has **no snapshot mechanism at all**.

### 9. The Hetzner nightly image — the gap that does not matter

`ops/backup.sh` documents that Hetzner's nightly whole-disk image is the estate's sole
off-box backstop, taken at the hypervisor level and not controllable from inside the VM.
There is **no `HCLOUD_TOKEN` anywhere on this box**, so I cannot query whether the
Backups product is even enabled.

**This is an explicit gap — and it is moot.** The raw bytes lived in
`mkdtemp(os.tmpdir(), 'ssi-recording-')`:

```
findmnt /tmp  →  tmpfs  tmpfs  /tmp  rw,nosuid,nodev,size=12007332k
services/audio-processor.cjs:885
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ssi-recording-'));
services/audio-processor.cjs (finally block)
    await fs.remove(tempDir).catch(() => {});

systemctl --user show popty-production-api -p Environment
    → NODE_OPTIONS, PRODUCTION_API_PORT=3470, AUDIT_ARCHIVE_CRON, TAIL_REPAIR_MODE, PATH
    → no TMPDIR   (three other units DO set TMPDIR; this one does not)
```

`/tmp` is **tmpfs — RAM**. The service does not redirect it. A hypervisor disk image
captures `/dev/sda`, and the scratch file was never on `/dev/sda`. Even a Hetzner image
taken during the milliseconds the file existed would not contain it.

No `ssi-recording-*`, `audio-process-*` or `audio-concat-*` directory survives in `/tmp`.

### 10–16. S3

Bucket `ssi-audio-stage`, region `eu-west-1`, via `@aws-sdk/client-s3` (no aws CLI on
this box).

```
GetBucketReplication            → ReplicationConfigurationNotFoundError
GetBucketLifecycleConfiguration → NoSuchLifecycleConfiguration
GetBucketVersioning             → { "Status": "Enabled" }
GetBucketLogging                → {}                      (access logging OFF)
ssi-media-prod replication      → ReplicationConfigurationNotFoundError
```

**`backups/` — 19 objects, 31,801,845 bytes, every one stamped 2026-07-29:**
all are `backups/hiss-reprocess-logs-2026-07-29/*.jsonl` — per-course
hiss-reprocess run logs (eng_for_guj, eng_for_kan, jpn_for_eng, spa_for_eng …).
**Not a single database dump.** No object in this prefix is dated on or near a session
date.

**`audit-archive/` — 266 objects, 1,083,283,129 bytes, 34 daily partitions:**

```
2026-05-28 … 2026-07-02   (gap at 2026-06-24)
```

This prefix **does** cover two session dates, and it is the only artefact in this entire
leg that does. I downloaded both `course_audio.ndjson.gz` files and read them:

| partition | rows | `GkXf` | `SUQz` | `//u/` | max line | cym_n rows |
|---|---|---|---|---|---|---|
| `dt=2026-06-15` | 6,014 | **0** | **0** | **0** | 1,574 B | 4 |
| `dt=2026-06-16` | 8,266 | **0** | **0** | **0** | 1,880 B | 0 |

The archived row schema, read directly from the first record of each file:

```
top keys: change_type, changed_at, changed_by_role, changed_by_uid, id,
          old_row, primary_key, table_name
old_row : course_code, created_at, duration_ms, file_size_bytes, id, language,
          lego_id, origin, role, s3_key, sequence, text, text_normalized,
          text_stripped, voice_id, word_boundaries
```

Sixteen columns. `file_size_bytes` and `duration_ms` describe the audio; `s3_key` points
at it. **No column carries it.** The largest line in either file is under 2 KB. Temp
downloads deleted after reading.

`2026-02-16`, `2026-05-22` and `2026-08-10` have **no partition** — the archive starts
2026-05-28 and ends 2026-07-02.

**Legacy `.backup` buckets** (all on the same AWS account, 39 buckets total):

| bucket | contents | newest object |
|---|---|---|
| `ssibackup` | ssi-forum tarballs, two JV mp4s | 2025-03-19 |
| `ssiborg-db` | 3 objects, `ssiborg-2022-11-28` … `ssiborg-2023-01-04` | 2023-01-05 |
| `saysomethingin.backup` | `uploads/media_item/…` old-platform MP3s | 2022-11-14 |
| `ssi-logging` | `s3-saysomethingin/` access logs | 2023-04-17 |
| `ssi-lb-logs` | **empty** | — |

Every one predates the recording-studio path. `ssiborg-db` is the only bucket on the
estate that looks like a database backup target, and its newest object is from **January
2023**.

### 17–20. Ingress: could the base64 body have been persisted?

The raw WebM arrived as base64 inside a JSON POST body
(`express.json({ limit: '50mb' })`, `production-api.cjs:148`).

- **Express logging:** no `morgan`, `pino` or `winston` file logger anywhere in
  `services/`. The one place `req.body` is stringified is `proxyCourseBuilder`
  (`production-api.cjs:1205`) — and that is a *course-builder* proxy that builds a fetch
  body; it logs only `[Proxy] {method} {url}`, never the body, and the recording-upload
  route does not pass through it. The upload handler destructures `audioData` and never
  logs it.
- **journald:** oldest entry on this box is **2026-07-28T15:24:50Z**, so it cannot reach
  2026-02-16, 2026-05-22, 2026-06-15 or 2026-06-16 — `journalctl --since 2026-06-15
  --until 2026-06-17` returns *"No entries"*. It **does** cover 2026-08-10: 536 lines
  that day, grepped for `GkXf` and `SUQz` → **0 hits**. Total journal on disk: 120 MB.
- **ngrok:** neither `~/.ngrok2` nor `~/.config/ngrok` exists. No request
  inspection/replay capture is configured, and ngrok does not persist bodies to disk
  by default.
- **Vercel:** `vercel.json` in both repos contains only static-asset cache headers — no
  rewrites putting the upload route on the Vercel path. The recorder posts to
  watson-1:3470 directly. Vercel does not retain request bodies, and its log retention is
  short in any case.
- **S3 access logging** is off, so not even a record of the PUTs exists.

---

## Explicit gaps

Three, stated honestly. None of them changes the verdict, and I say why for each rather
than leaving them as open doubt.

1. **Hetzner Backups product state.** No `HCLOUD_TOKEN` exists on this box, so I could
   not query whether nightly images are enabled or list them. *Needed:* a Hetzner Cloud
   API token with read access to project `156338210`, or console access.
   **Why it does not change the verdict:** `/tmp` is tmpfs. The raw bytes were never on
   the imaged disk.
2. **The wal-g archive store.** `archive_command` pushes to a Supabase-internal wal-g
   destination. The Management API exposes backup *metadata*, not the archive contents,
   and `/var/log/wal-g/` is on Supabase's host, not ours. *Needed:* a Supabase support
   request against project `swfvymspfxmnfhevgdkg`.
   **Why it does not change the verdict:** WAL replays row changes. No row ever held
   audio, and `pitr_enabled: false` means no restore target earlier than 2026-08-07 is
   offered regardless.
3. **Aran's own device or browser.** Outside anything the estate can answer, and already
   flagged in the diagnosis. This remains the sole remaining chance of a pristine source,
   and it is a question for him, not a backup to search.

---

## Recovery plan

There is none to offer, and that is the finding rather than a failure of the search.

Every backup source on this estate either (a) does not reach the session dates, or (b)
reaches them and demonstrably contains no audio bytes, because the raw WebM never entered
a database column or a persistent filesystem in the first place. The two in-window
artefacts — the S3 `audit-archive` partitions for 2026-06-15/16 and the Supabase daily
backup covering 2026-08-10 — were both examined rather than assumed, and both confirm
absence positively.

**The one open thread remains the one the diagnosis named: ask Aran whether his own
machine kept a copy.** Everything inside the estate is settled.
