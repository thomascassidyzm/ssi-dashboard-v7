# Fleet deepening campaign — 2026-08

**Status:** **CAMPAIGN COMPLETE (2026-08-03).** 647 new deepening USE phrases across 9 courses,
all reviewer-verified (25 fixes, 0 deletes), all **draft / no-audio**. **TTS = Kai's click** (pending).

**Full living state:** `docs/course-optimization/deepening-campaign-2026-08.md` (tracker — fleet
orphan ranking, per-course disposition table, guardrails). Committed on kai-stage (`b7cd7c6e` + updates).

## Goal (Kai 2026-08-02)

Get the 9 paid for-English courses + variants in good shape: a deepening pass (lego-spread backfill)
+ fix repetitive USE phrases. **Read a lot of seeds to confirm quality FIRST**, then deepen only
where the base is clean. Fully delegated, sequential, Kai's order, no per-step approval. Deletions
listed for Kai (paid live courses).

## What was produced

- **Phase 1 (thin/repetitive):** kor 52, zho 145, ara_eg 73, ara 17, ara_lb 127.
- **Phase 2 (big-9 base orphan-spread, selective):** por 24, fra 62, ita 41, deu 106.
- All 9 big-9 BASE courses deepened (spa in July + these 8) **except jpn** (repair-first).
- yue/hak/nan **HELD** for native review. deu_at/fra_ca/deu_ch draft (deu_ch/fra_ca low-value).

## Method (proven — reuse this)

Deepening **assumes a clean base**. Backfilling onto broken LEGOs propagates the defect (the writer
reuses broken phrases as "attested" ZUT renderings). So per course:

1. `local-tooling/sample.cjs <course>` (or `scripts/deepening/sample.cjs`) → read to find broken/HELD
   regions + the degradation boundary. **TRUST THE DB READ over stale course memory** (kor's
   "301–548 repaired" note was wrong; real degradation onset ~S460).
2. Scope deepening to confirmed-clean seeds only; degraded tail = separate repair-first track.
3. `tools/backfill-spread/analyze.cjs --max-seed <clean-end> --out` → **ONE** Opus writer →
   `tools/backfill-spread/validate.cjs` → register-aware Opus reviewer (ZUT-drift is the main defect).
   **One writer per course** (never two writers on the same course — DB race).
4. Writer discipline: anchor to attested renderings, **never force**.

Tooling: `tools/backfill-spread/{analyze,validate}.cjs` (committed) + the playbook
`docs/course-optimization/lego-spread-backfill-playbook.md` (committed; SOV-known veins added this
session). Scan helpers: `local-tooling/sample.cjs`, `fleet-scan.cjs`. course-builder API =
`http://localhost:3471` (pm2 `course-builder`) — **this is local to Kai's machine**; on watson-1 the
course-builder service will be at its own host/port, check the running services.

## Pending Kai

1. **TTS for the 647 new phrases** (414 cited in one place, 647 total across the campaign — reconcile
   against the tracker; all draft/no-audio).
2. **Repair backlog** (the never-final-passed 301–668 back-thirds): jpn S451–668 + S301–325
   unlicensed-tags, kor 451–668, por 562–668, ara 163–300.
3. Two lego-target prereqs to unblock two more deepens: spa_mx "that is" = esa→**eso**;
   por_br ouviste/perguntaste→**você**.

## Fleet orphan ranking (worst → best, for prioritising future deepening)

hak 69.5 · kor 54.9 · por 48.8 · ara_lb 47.7 · ara 46.9 · por_br 46.1 · fra 44.7 · ara_eg 43.3 ·
fra_ca 41.5 · nan 39.7 · deu_at 39 · spa_mx 38.2 · jpn 37.3 · deu 35.8 · deu_ch 35.5 · ita 33.2 ·
yue 32 · zho 26.9 · spa 22.8. (Gold = Welsh 6–9%. ara has worst <10-use starvation at 81%.)
