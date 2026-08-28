# The provider ladder, and what a coverage-driven fallback still needs

2026-08-28. What landed, and — the part worth your time — the honest list of what a coverage-driven fallback needs that does not exist yet.

---

## The ladder, as built

Five rungs, in one module (`services/shared/tts-provider-policy.cjs`), which every caller now asks instead of defaulting for itself.

1. **Human recording wins wherever it exists.** A stop, not a preference. Checked first and unconditionally — ahead of every explicit request — so there is no input that makes the function answer a synthetic provider for Welsh, Breton or Pennsylvania Dutch. Four tests hold that door, including one that tries to force it.
2. **Cartesia** is the standing default for synthesis.
3. **Azure** is the fallback for anything Cartesia does not cover.
4. **ElevenLabs** is reachable only when a caller names it. Never a fallback, never a silent promotion. Tested as a sweep — 45 languages × 5 stored configs — none of which yields it.
5. **xAI** is retired from selection. Historic clips play untouched.

**Retirement is not deletion.** `PROVIDER_ALIASES` keeps `xai`, both voice-id spellings still canonicalise to one voice, and no row and no S3 object was touched. Two tests assert the read paths directly rather than asserting it in prose.

---

## The finding that shaped it: coverage is two questions, not one

"Can Cartesia speak this language?" and "do we have a Cartesia voice cast for it?" are different questions, and only the first is answered by a vendor doc.

Measured against the live `voices` table today:

| Engine | Active voices |
|---|---|
| Azure | 165 |
| xAI | 118 |
| ElevenLabs | 2 |
| human | 17 |
| **Cartesia** | **0** |

The only Cartesia voice anywhere in the estate is your clone — 91 clips, English only, `spa_for_eng` Pod 1 — and it is not in the `voices` table at all.

So a policy that answered "cartesia" off the vendor's 42-language list alone would hand an Azure voice **name** (`es-ES-AlvaroNeural`) to Cartesia's API, which wants a bare UUID. That is a hard failure mid-build, in a language that reads as covered. The ladder therefore selects Cartesia only when a Cartesia **voice** is resolvable, and where it is not it falls to Azure and says so.

**In practice, today, that means Cartesia is selected only where a config already names a Cartesia voice.** Casting — not language coverage — is what is actually blocking Cartesia from becoming the estate's default. Turning it on for a language is one line in the registry (or one `voices` row with `tts_engine='cartesia'`), and it is deliberately a human's line to write.

Your clone is registered `autoCast: false` on purpose: pointing your voice at every English line in 67 courses is a casting decision with your name on it, not a routing default.

---

## Tom's ruling, 2026-08-28 — a preference, deliberately not a rule

Replying on the gap map, Tom closed the coverage thread:

> "We will in general allow Kai or whoever, to choose the voice configs for each course on a case by case basis. We don't need to redo anything necessarily. I think Azure voices should generally NOT be used for any courses that have Cartesia voices.
>
> But we can leave that flexible."

Three things follow, and only three:

1. **Voice config per course is the course builder's call, case by case.** Kai, or whoever is building. Not a central policy and not an estate sweep.
2. **Prefer Cartesia over Azure where a Cartesia voice exists for that language** — guidance for the human or agent making the casting decision.
3. **Nothing gets re-rendered.** No remediation programme; the gap map is research, not a work queue.

"But we can leave that flexible" is load-bearing. **This preference is not enforced anywhere in code and must not be** — no validator, no lint, no config gate, no CI check, no warning. The ladder in this document is unchanged by the ruling: Cartesia is already the standing default where a Cartesia voice resolves, and casting (§3 below) is still what actually gates that. Also recorded in `CLAUDE.md` under *Standing preferences*.

---

## The honest gap — what a coverage-driven fallback needs that does not exist

Written as findings, not as a wish list. Each one is either confirmed or explicitly unverified.

**1. There is no live coverage query. The language list is a hardcoded snapshot.** 42 ISO codes, transcribed from Cartesia's model docs, fetched 2026-08-26. Cartesia publishes no coverage API we call. If they add or drop a language, this file is wrong until a human edits it. The module says so in its own metadata and a test asserts it stays honest about it. **This is a real answer to the question, not a placeholder** — but it is a snapshot, and it will rot silently.

**2. The list is sonic-3.5's; production runs sonic-3.6. Unverified.** The only list published in a transcribable form was 3.5's. Production is pinned to `sonic-3.6`. Whether the lists match is **not verified** — confirming it needs a doc fetch or a live API call, and a live call renders billable audio, which is your approval gate. The conservative reading is safe in one direction only: a language 3.6 added and 3.5 lacked just keeps going to Azure. A language 3.6 **dropped** would route to Cartesia and fail.

**3. There is no Cartesia voice registry.** The gap above. Zero rows, no per-language casting, no discovery endpoint for Cartesia equivalent to the Azure one. Until voices are cast, rung 2 is reachable only by explicit config.

**4. Cartesia has no per-voice language attestation.** "This clone can speak Polish" is a vendor claim (and a *secondary-source* claim at that — the "a clone made in English can speak all 42" line came from a review site, not Cartesia's own docs). Nothing in the estate checks it. Your clone's English-only rule is enforced because you ruled it, not because the vendor told us anything.

**5. There is no per-language quality gate.** Nothing would catch Cartesia producing bad output in a language it nominally supports. The phonology gate (`PHONOLOGY_GATED_PROVIDERS`) checks for cross-language phonology leakage, not for "is this good Polish". The Arabic and Chinese rows in the gap map flag this concretely: Cartesia's `ar` is almost certainly MSA, not Egyptian or Lebanese, and three live courses are on those variants.

**6. `voice_config` records intent, not what was rendered.** Confirmed, and it matters here: "what provider is this course on" is not reliably answerable from config. So the *scale* of the xAI retirement — how many courses would need re-casting on their next render — cannot be stated honestly from `voice_config` alone, and measuring it properly means per-course `course_audio` reads, which time out on this estate.

**7. For the human rung: the code knows human-voiced COURSES and LANGUAGES, not human-voiced SLOTS.** `isHumanVoiceCourse` / `isHumanVoiceLang` are course-code and language-code rules covering `cym_*`, `bre`, `pdc`. They are reliable for exactly what they claim. What does **not** exist is "a human clip exists for this specific slot, so do not synthesise it" — a per-slot check. Today that gap is closed by the blunt instrument: those courses are excluded wholesale. **If a human recording ever exists for a slot in a course that is otherwise synthetic, nothing would stop a synthetic render being chosen for it.** That is the honest limit of rung 1 as implemented, and it is the one I would want your ruling on.

**8. For the ElevenLabs rung: yes, something could reach it automatically, and no, it was not on the render path.** I checked. `AUTOMATIC_LADDER` contains only `cartesia` and `azure`, and the sweep test proves no language/config combination yields ElevenLabs. The paths that *do* call ElevenLabs — welcome, presentation, encouragement services — name it explicitly in their own code, which is the explicit-choice door, not an automatic fallback. **One judgement call to flag:** a stored `voice_config` naming `elevenlabs` is honoured. I read that as a deliberate human choice made at config time rather than an automatic promotion, which is what your rule forbids. If you meant it more strictly — that even a stored config must not reach ElevenLabs without a fresh explicit request — that is a one-line change.

**9. Aran's requirements are still unwritten anywhere in this repo.** You said xAI should go "because of Aran's requirements". A search of `docs/` turns up nothing authoritative under his name about providers or voice policy. **So nobody has checked the new policy against them.** The ruling stands on its own and I have implemented it as briefed, but that check has not happened.

---

## The judgement calls I made, so you can overturn them cheaply

- **Policy wins over per-course config for a retired provider.** A course cast on xAI does not get honoured for a new render. Where there is no replacement voice, the build **refuses** rather than carrying the xAI voice name onto Azure — that would render a course in a voice nobody chose. Re-casting is yours.
- **I did not collapse phase 8's five provider chains into one.** The integration proposal (§2c) recommends it and it is the right eventual fix, but refactoring the live generation path is a bigger blast radius than this policy needs. Four copies of one more branch, and we pay for it later — that is the honest price, named rather than paid quietly. Instead, a decision that would require a voice swap throws with a message pointing at the collapse. Today it never fires.
- **The pod path is left alone.** An xAI-cast pod fails at the chokepoint for free — before any HTTP call — and the *existing* xAI→Azure safety net re-renders it on a properly chosen Azure voice. That is the ladder's own answer, reached by machinery that already picks the right voice for the language.

---

## What was NOT done

- **No audio rendered.** Not one clip. The one remaining proof I cannot give you without spending money is a live confirmation of sonic-3.6's language list (gap 2). Say the word and it is a single short render.
- **No regeneration, no backfill.** Adoption stays forward-only.
- **Nothing deleted** from S3 or the database.
- **The mapping exercise was cancelled** on your correction — course production already runs through Popty. No document exists for it and none is coming.

Companion research: `docs/tts-language-coverage-gap-map-2026-08-27.md` — the 51-language, 79-course gap map, with its own honest caveats (estate-map timed out, so the course count is derived; the vendor column is `voice_config`-derived, not audio-verified).
