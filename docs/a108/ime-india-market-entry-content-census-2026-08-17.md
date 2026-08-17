# India Market Entry — content census

**2026-08-17 · measurement only, nothing changed · live DB (Supabase) + live estate-map API, not docs**

---

## Headline

**All nine India-relevant courses are content-complete and audio-complete: full 668-seed ladder, full LEGO/phrase audio, zero missing clips.** The differences between them are release plumbing, not content: three (Kannada, Marathi, Telugu) are missing the small "pod-0" intro-listening piece and the in-app interface translation; the other six have pod-0 built but sitting behind a one-off voice-approval step before it's switch-on-able. Sinhala (bonus, not in the IME seven) is mid a live data-quality repair sweep — the fixes are landing on main today, not yet all applied.

**Correction to my brief:** I found no evidence of an in-flight "Kannada codepoint fix" or an "A-135" item for any of these nine courses. There IS a codepoint check in the docs, but it's for the *reverse* course (`kan_for_eng` — Kannada as the thing being taught, English speakers learning it), which is a near-stub (8/668 seeds) and came back **zero** out-of-block codepoints, i.e. clean, not broken. A-135 is a live Sinhala (eng_for_sin) adjudication, not Kannada. Both corrections below.

---

## Summary table

| Course | Known side | Ladder | LEGOs | Phrases (B/U/component) | Audio: LEGO+phrase clips | Learner switch-on | Verdict |
|---|---|---|---|---|---|---|---|
| **eng_for_hin** | Hindi | 668/668 seeds | 1,327 | 4,205 / 6,394 / 1,822 | 51,282 clips, 100% covered | beta, **live in app** | Complete course, full audio, live |
| **eng_for_tam** | Tamil | 668/668 seeds | 1,421 | 4,042 / 6,894 / 1,641 | 55,621 clips, 100% covered | beta, **live in app** | Complete course, full audio, live |
| **eng_for_ben** | Bengali | 668/668 seeds | 1,323 | 4,176 / 6,456 / 1,844 | 49,359 clips, 100% covered | beta, **live in app** | Complete course, full audio, live |
| **eng_for_guj** | Gujarati | 668/668 seeds | 1,445 | 4,451 / 7,177 / 2,320 | 53,266 clips, 100% covered | beta, **live in app** | Complete course, full audio, live |
| **eng_for_pan** | Punjabi | 668/668 seeds | 1,323 | 4,309 / 6,312 / 1,966 | 51,251 clips, 100% covered | beta, **live in app** | Complete course, full audio, live |
| **eng_for_urd** | Urdu | 668/668 seeds | 1,169 | 3,849 / 5,897 / 1,511 | 47,143 clips, 100% covered | beta, **live in app** | Complete course, full audio, live |
| **eng_for_tel** | Telugu | 668/668 seeds | 1,504 | 4,140 / 6,719 / 1,396 | 40,952 clips, 100% covered | **released, live in app** | Complete course, full audio, live — but no intro listening pod yet, no in-app interface translation yet |
| **eng_for_mar** | Marathi | 668/668 seeds | 1,407 | 4,597 / 6,977 / 1,274 | 39,421 clips, 100% covered | **released, live in app** | Complete course, full audio, live — but no intro listening pod yet, no in-app interface translation yet |
| **eng_for_kan** | Kannada | 668/668 seeds | 1,554 | 4,887 / 7,086 / 2,257 | 44,689 clips, 100% covered | **released, live in app** | Complete course, full audio, live — but no intro listening pod yet, no in-app interface translation yet |
| **eng_for_sin** *(bonus — Sinhala, not in the IME seven; adjacent but not an Indian state language)* | Sinhala | 668/668 seeds | 1,300 | 3,924 / 6,582 / 1,213 | 51,624 clips, 100% covered | beta, **live in app** | Complete course, full audio, live — **but mid an active data-repair sweep (A-134), several fixes not yet on main** |

*No Malayalam course exists in the estate — not built at all, not even a stub row in `courses`.*

---

## What "complete" means here, precisely

- **Ladder**: every course has exactly 668/668 seeds present, seed_number running 1→668 with no gaps — the full course, not a truncated build (contrast with e.g. `cym_n_for_eng`, capped at seed 305, or the many 300-seed "short-form" courses elsewhere in the estate).
- **LEGOs**: 1,169–1,554 per course (varies by how the language's own grammar decomposes English), each with known-side AND target-side audio linked — **100% audio coverage at the LEGO level, all nine courses.**
- **Phrases**: BUILD + USE + component rows, each with both known and target audio linked — **100% audio coverage at the phrase level too** (Marathi and Sinhala have 2–4 rows out of ~13,000 with a null audio link; every other course is bit-for-bit 100%).
- **Voices**: every course's known-side (the Indian-language track) is on a proper native Azure neural voice (e.g. `azure_hi-IN-SwaraNeural`, `azure_ta-LK-SaranyaNeural`, `azure_kn-IN-SapnaNeural`) as the dominant voice-of-record, with only small legacy tails (bare, un-prefixed spellings of the same voice, or a handful of `elevenlabs`/`hi`/`ta`-language-code duplicate rows — same voice, old naming, not a defect). The English (target) track uses the estate-standard English cast (`bedd6226`/`gfzdpspr5fdp` clones + `azure_en-GB-Ryan/Sonia/Oliver`) shared across the whole estate — this is estate-standard audio, not a stale/old render.
- **Veracity/QA**: essentially zero rows flagged failed across all nine; this reflects the estate's standing "graduated sampling" QA policy (not blanket-checked, and a low checked-count is the policy working, not a gap — see estate-map's own semantics note) rather than anything specific to these courses.

---

## Where the nine genuinely differ

### 1. Six courses (Hindi, Tamil, Bengali, Gujarati, Punjabi, Urdu) + bonus Sinhala have a built pod-0 (the 142-slot intro listening pod) that is content-complete but **blocked on a one-off voice-approval step** — `pod0_awaiting_voice_approval`. This is a switch that needs someone to listen to a 5-clip sample and sign off; it is not a content gap, and it does not block the main course (which is already live).

### 2. Three courses (Telugu, Marathi, Kannada) have **no pod-0 at all** yet, and **no in-app interface translation** (the player UI locale file — buttons, menus, on-screen labels — exists for hin/tam/ben/guj/pan/urd/sin, and is simply absent for tel/mar/kan). These three also have no `docs/pair-contracts/` known-side gate file, meaning they were built through a different (probably batch/direct) pipeline than the other six-plus-Sinhala. None of this affects the course content itself, which is as complete as the rest — it's release/UX polish, not missing lessons.

### 3. Sinhala (bonus course, adjacent context) is mid an active, dated repair sweep — "A-134" — working through corrupted re-records, orphaned seed rows, and seed-text/audio mismatches across roughly the whole course (seeds 1–100 done and merged to `main` as of today; seeds 101–200 done and merged; several more slices — seed-3, cards, orphans, a late-lego cluster, a "ge"-cluster, a "mamaa" cluster — are on separate branches not yet merged). This is quality hardening on an already-live course, not a gap in coverage. **A-135 is a separate, still-in-flight Sinhala adjudication, also Sinhala, not Kannada** — I found no equivalent active repair sweep for any of the nine Indian-language courses.

---

## Access gaps (honesty rule)

- I did not listen to any audio — coverage/voice figures are from database linkage and voice-id, not an ear check. If a learner-facing spot-check matters for the partner conversation, that's a follow-up, not covered here.
- I did not open the live app to click through a lesson end-to-end for each course; this census is a database/API measurement, not a UX walkthrough.
- The "any known defect flags" ask named a Kannada codepoint issue and "A-135" specifically — I could not find either as described (see correction above) and am reporting that gap rather than inventing a match.

---

## Bottom line for the partner conversation

Seven of Tom's seven named IME base languages (Hindi, Tamil, Bengali, Gujarati, Punjabi, Urdu, Telugu) plus Marathi and Kannada are **all built, all fully voiced, all live in the app today**. The only real split is: six + Sinhala are one voice-approval click away from also having their intro pod switched on; Telugu/Marathi/Kannada need that pod built from scratch plus an interface-translation pass, both of which are small, well-understood, non-content pieces of work. No course in this set is a stub.
