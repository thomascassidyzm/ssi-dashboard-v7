# Bologna readiness — reconnaissance, 31 Aug 2026

**Verdict: no, not today.**

Not because Popty is broken — the console is in better shape than I expected, and the methodology is written down three times over. It is no because **the thing named in the brief does not exist.** The talk is billed as showcasing "the community course-building tool". There is no community course-building tool. Popty is an internal production console: a hand-maintained allowlist of 23 people, no signup, and — checked in the live database tonight — **zero community courses. All 150 rows carry `course_type: 'official'` and `is_community = false`.** The one estate reference to the idea calls it *"the future where community members create courses."*

That is the biggest single risk, and it is not a bug you fix in November. It is a decision about what the second half of the talk claims. Everything below assumes you make it first.

There is also no conference preparation of any kind: `estate-search "Polyglot Conference"` returns one ledger line — *"Bologna Polyglot Conference 18-20 Nov — methodology deep dive + Popty showcase."* Eleven weeks out, that is all of it.


## 1. Driving the tool as a stranger

**The demo's best asset** is the per-course pipeline screen: five numbered steps, plain English, locks that explain themselves — Translate → Build Team → Final Pass → Verify Components → ZUT → Gender Prep. **ZUT is a first-class named gate, captioned "One English prompt → one answer."** For a room of polyglots that line does more work than any slide. Presentable as it stands.

**[→ Five captioned screenshots of the real tool](https://watson-1.tail4968cb.ts.net/evidence/bologna-readiness-2026-08-31/index.html)**

**What would embarrass us, in the order an audience would meet it:**

**a. The connection light is permanently red.** `EnvironmentSwitcher.vue:257` polls `/api/health`; `services/production-api.cjs:1631` only ever serves `/health`. Nothing is wrong, but the status dot next to the machine name is red on every screen, in every shot linked above. On stage that reads as "their system is down." One-line fix — an `/api/health` alias — but it needs a production-api restart, so the timing is yours.

**b. A valid login can bounce you to the sign-in screen.** Reproduced. `useAuth.js:280–313` restores the session, then fetches the dashboard row in a fire-and-forget `.then()`. With no `popty_dashboard_user` cache — fresh profile, cleared cache, borrowed laptop — `initAuth()` resolves before the row lands, the guard at `router/index.js:852` sees "not authenticated", and you get the login form despite being signed in. Loading again works. First thing that happens on an unrehearsed machine.

**c. On popty.app the language list collapses to six.** popty.app defaults its API to `watson-1.tail4968cb.ts.net:8443` (`api.js:41`) — a private tailnet address. Chrome blocked the fetch as a private-network request. The New Course screen falls back to a hardcoded list: English, German, Spanish, French, Chinese, Japanese. An attendee says "build me Hungarian" and Hungarian is not in the dropdown.

**The mitigation exists and I verified it:** switching the machine selector to *Tom's Machine* (`popty.ngrok.app`) or *SSi Machine* (`ssi-machine.ngrok.app`) — both answered 200 tonight — restores the full 95-language list. A rehearsal item, not a build item. One residual: with the override set, a separate component still failed with "Failed to load courses" against watson-1.

**d. The home page opens with three error banners** — "836 known-side vocabulary flags", "1267", "893". True, useful internally, and the first thing a projector shows.

**e. Smaller things that read as unfinished.** A build-hash badge (`28899ac6`) sits bottom-right in production. `/generate` redirects to `/library`, not a route, so it silently dumps you home. A failed create raises a browser `alert()`. Choosing an existing pair — I picked Maltese, which already has 668 seeds — posts without warning; the dropdown offers "Portuguese (Brazil)" and "(Portugal)", both resolving to code `por`. After Create, the destination page had not rendered 15 seconds later. And New Course itself is two dropdowns on an empty page — thin, for an opening frame.

## 2. Can you actually build one live?

Partly — and the screen will lie to you while it happens.

`seedCount` is a free numeric input (`TextGeneration.vue:659`); the 300/668 buttons are only presets, and since commit `24ffa1b75` (27 Aug) that number reaches the agent's brief, so a five-seed run is settable. `/api/build/translate` spawns exactly one `claude --model opus` CLI session working through seeds sequentially (`services/course-builder/routes/build.cjs:525-570`).

**Two things break the live experience of it:**

- **The progress bar will read wrong.** That same route still hardcodes `total_seeds: 668` in the `build_jobs` row (~line 544) whatever the course's real seed count, and `TextGeneration.vue:838` prefers that number over the local one. A five-seed demo shows `0/668` and a percentage stuck near zero while the build actually completes.
- **It polls, it does not stream.** `useBuildMonitor.js:8` — every 30 seconds, or 5 with the chat panel open, no realtime subscription. A short build finishes between two polls: the audience sees a frozen screen, then a snap to done. No numbers moving — the opposite of what this demo needs to feel like.

**On wall-clock I have to report a gap, not a number.** I derived ~20 s/seed from `course_legos.created_at` on `ind_for_eng` (25 seeds → 75 LEGOs in 8 minutes, 15 Aug), but a second read found translate-side timestamps implausibly fast — `eng_for_kan` shows 668 seeds "completed" in 8 seconds — reading as bulk backfill, not organic generation. **There is no clean timing sample in the estate.** Nobody can promise a seconds-per-seed figure until someone starts a fresh five-seed course and times it. A one-hour job, and it should come first.

Settled either way: `gle_cn_for_eng` took three days elapsed for 300 seeds with human gates and restarts, so building a *whole* course on stage is not a thing. The path has also genuinely stalled — Thai and Sinhala jobs failed at seed 0, Icelandic and Korean stopped mid-run with no auto-resume.

## 2b. The payoff moment — "and here it is on my phone" — does not work today

This is the second hard finding, and it is worse than the first because it is the moment the whole demo builds to. Three separate things block it:

1. **The player's index does not refresh itself.** `round-map.ts:100-125` reads `course_round_index`, a materialised view. `tools/refresh-round-index.cjs` says it plainly:
   *"no trigger/RPC keeps it in sync — nothing auto-refreshes it."* The RPC that would fix it exists as `docs/proposals/refresh-course-round-index-rpc.sql`, marked **"PROPOSAL — NOT APPLIED"** since 14 July. A course built on stage returns 503 to the player until someone runs a script.
2. **No audio means silence, not text.** `cycles.ts` returns cycles regardless of audio; the player's own ruling is "plays what it has", skipping missing clips. A course with no generated audio races to "session complete" in milliseconds having made no sound. There is no text-only path — the payoff needs a **paid TTS run**.
3. **A new course is invisible.** `courses.visibility` defaults to `hidden`, `pricing_tier` to `premium`; RLS shows a row to a stranger only at `public` or `beta`. The audience's phone sees nothing until someone flips it.

For scale: `pdc_for_eng`, the most recently content-built course (30 Aug), has 664 LEGOs, 6,680 phrases and **one row in `course_audio`**. Indexed — and it would play as near-total silence.

Two honest options: (a) build live, then cut to a *pre-built* course for the playing moment and say so out loud — costs nothing, more honest than most conference demos; or (b) do the three fixes — the RPC is already written — so a live build can be heard. Either way it is a decision for now, not November.

## 3. The methodology half — the most valuable thing I found

**A coherent deep-dive account does exist.** Three independent reads converged on the same inventory; I verified every path on `origin/main`:

- **Module 4 of the distinction-physics treatise** — `distinction-physics/src/content/treatise/module-4-learning/`, 14 sections, ~18,000 words, last touched 25 Aug. Two axioms → a cost functional → SSi's design rules read as reductions of it. §4.2.5 states its own falsification conditions and admits one is unmeasured; the ancestry table names Sweller, Vygotsky, Bloom, Doignon–Falmagne. Honest in exactly the way a hostile room tests for — and it assumes Module 0 and variational calculus.
- **The Talk Bollocks transcripts** — `docs/corpus/talk-bollocks/part-{1,2,4}.md`, ~26,500 words, Dec 2020. The origin story, already at talk register: "no such thing as a word, only edges between words"; Pimsleur inverted through Bjork. Marked **PRIVATE, never published**; part 3 is lost; part 4 is Game B futurism, not methodology.
- **The pods** — `docs/pods/learning-flagship-pod-2026-08-30.md` (~22,000 words) and the Method Pod (~28,000): the speakable register. Also private, and the pod's own §13 flags that Aran's side of three chapters is constructed from the estate's reading of his work, not his voice.

**The hole, and it is the finding:** LEGO, ZUT, tiling and BUILD/USE appear in **none of the three** — verified by grep; the Method Pod script says so outright. The machinery that makes SSi different from every other "chunks not grammar" claim lives only in agent-facing operating instructions (`ralph-methodology.md`, `synonym-choice-architecture.md`) and the in-app `/how/pedagogy` page.
**No worked decomposition — one real seed, its LEGOs, ZUT visible on the page — exists in any register you could show a room.** That is exactly what this audience will demand, and it is the one artefact that would make the methodology half and the tool half the *same* demo.

## 4. The gap list

**Blocks the demo**
1. Decide what "the community course-building tool" means on stage. Today the honest version is "the tool we build with", not "the tool you can use". Everything else follows from this.
2. Write the worked decomposition — one seed, end to end, ZUT visible. Nothing else closes the gap between theory and machinery, and nothing else exists.
3. Cut a 45-minute spine. Three registers, none conference-shaped; the flagship pod is closest but leaves four open forks standing.
4. Decide the payoff moment: cut to a pre-built course and say so, or apply the parked `refresh-course-round-index` RPC, budget a TTS run, and default the demo course to visible.
5. Time a real five-seed build. No trustworthy number exists.
6. Rehearse on the conference network, fresh browser profile, machine selector on an ngrok endpoint. Items (a), (b) and (c) all surface in that one rehearsal.

**Weakens it**
7. Fix the hardcoded `total_seeds: 668` so a small build's progress bar tells the truth, and drop the poll interval so the audience sees numbers move.
8. The `/api/health` alias — kill the red light.
9. Fix the login race in `useAuth.js` rather than relying on "load it twice".
10. Suppress the vocabulary-flag banners and the build-hash badge for demo mode.
11. Warn on an existing language pair; fix the two `por` entries.
12. Aran's half of the pod material is modelled, not recorded. A rehearsal item for both of you.
13. Permission ruling on quoting Talk Bollocks, and say plainly that part 3 is lost.

**Nice**
14. `/generate` → dead `/library` route. The `alert()`. The empty New Course page.
15. Engage a rival by name — Michel Thomas, Lewis and Krashen appear nowhere in any of it. This room will make the comparison whether or not you do.

## 5. Gaps in this reconnaissance — stated, not papered over

- **I did not run a build.** No clean timing sample exists in the estate, so the single most useful next hour is starting a fresh five-seed course and timing it with a stopwatch.
- Nobody reproduced the player symptom in a browser; the payoff-moment verdict is read from code and database, not from a phone in someone's hand. Worth ten minutes on a real device.
- Three of my five workers were mis-routed onto the methodology question by session reuse. The upside is three independent, converging reads of it; the cost is that the tool-side evidence came from me and two late probes.
- **I made one write to the estate:** course `ceb_for_eng`, created through the UI at 01:15 UTC to test the real path. Zero seeds, zero LEGOs. Say the word and I will delete it. 