# German: slower global speed + first presentation clip replaced

2026-08-06, on Kai's ruling.

## 1. Speed

`deu_for_eng` course global speed **0.95 → 0.90**. Nothing else touched.

| | |
|---|---|
| white-belt ramp (seed 1) | 0.80 |
| course global | **0.90** (was 0.95) |
| learner default | 1.00 |
| **effective seed-1 rate** | **0.72x** (was 0.76x) |

Read back from the DB after the write: `deu_for_eng.voice_config.target_speed = {belt_ramp: true, global_speed: 0.9}`.

**Not touched:** `fra_for_eng` is also on 0.95. It is the only other course with a global speed set. Left alone — French is Kai's call, not mine.

**To revert:** set `global_speed` back to `0.95` on `deu_for_eng`.

## 2. First presentation clip — S0001L01

The "The German for: 'I want' …" clip.

### Listen

- **NEW (live now):** https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/9A8F4AC1-4DB2-4909-A2AA-ED84DFE9FDCA.mp3
- **OLD (kept, not deleted):** https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered/7EAE3EA1-95CC-45B6-9EFF-0C0B600D5781.mp3

### Measured, old vs new

Tail measured over the 50 ms **before** the trailing silence pad, not the last 50 ms of the file — the pad would otherwise read as a clean clip.

| | old | new |
|---|---|---|
| duration | 4872 ms | **4944 ms** |
| trailing pad | 95 ms | 20 ms |
| RMS in 50 ms before pad | −25.8 dB | **−32.1 dB** |
| peak in 50 ms before pad | −11.0 dB | **−16.4 dB** |
| largest sample step at the cut | 0.0476 | **0.0290** |
| integrated loudness | −15.5 LUFS | −15.5 LUFS |
| ASR transcript | full sentence | full sentence |
| digital clipping / dropouts | none | none |

The old clip stopped with real energy still in the signal and a step discontinuity at the cut — that is the abrupt-ending signature. The new one decays ~6 dB further before the pad and cuts with a 40% smaller discontinuity, and is 72 ms longer.

**Honest limit:** ASR reads the same full sentence off both, so this was never word loss — no word was missing from the old clip. What changed is measurable tail behaviour, not content. Kai should confirm by ear from the two links above; I cannot listen.

### How it was chosen

8 takes rendered through the normal pipeline (xai/eve → `masterAudio`). All 8 passed veracity (CER 0.057, the same score the shipped clip had — whisper always drops the trailing "is:"). Take 4 selected: gentlest tail decay and smallest discontinuity at the cut of the 8. The longest take (5472 ms) was **rejected** — it had the worst click signature at the cut (step 0.117).

### Rollback

The old row and the old S3 object were **both kept** — the usual repair tool deletes the old row at the end; that step was deliberately skipped.

1. `lego_introductions` id `871370dd-3b38-4538-ae66-4ae9360b6e01` → set `presentation_audio_id` and `audio_uuid` back to `7eae3ea1-95cc-45b6-9eff-0c0b600d5781`
2. `course_legos` id `83cc017d-3268-4523-869a-715e9f579ed0` → set `presentation_audio_id` back to the same
3. `course_audio` `7eae3ea1-…` → strip the ` ::superseded-2026-08-06-tail-artefact` suffix from `text`
4. optionally delete `course_audio` `9a8f4ac1-4db2-4909-a2aa-ed84dfe9fdca`

Caveat: audio is served `immutable, max-age=1y` and cached in IndexedDB by id, so a device that has already fetched the new id keeps it until the id changes again. That is why the replacement got a new id rather than fresh bytes under the old one.

## 3. Found, not touched

- **`fra_for_eng` is on global 0.95** — same value German had. Not changed.
- **This clip had already been repaired once**, on 2026-08-05, by `tools/repair-presentation-clips.cjs`. Its ratio gate would have passed it again today: the shipped clip was 4872 ms against fresh renders averaging ~5000 ms, a ratio of ~0.97, well above the 0.85 replace threshold. The gate only catches gross truncation, not an abrupt tail. Flagging it; not changing the tool.
- **The other seed-1 presentations were not inspected or touched.** Kai scoped this to the first one.
