# TTS bake-off — phase 1 report

**2026-08-26. Watson, with seven worker sessions. Total spend: £0.00.**

The question: SSi is leaving xAI voices — a founding-team ethical choice, Aran will not feed the
Musk universe. What replaces them, at ~95% of xAI's perceived quality with near-Azure repeatability?

Phase 1 was free by design. Nothing was heard. Every verdict below is documentary or measured
locally, and where something could not be established it is named as a gap rather than smoothed over.

---

## The three findings that changed the decision

### 1. Coverage decides nothing

Every provider — all four candidates and all three controls — covers the xAI migration scope
**completely, 10/10**. The decision does not turn on language support at all. It turns on version
pinning, exit cost and quality.

This only became visible after two corrections. Counting "of 68 languages" flattered vendors with
breadth we don't use; and `pdc` was being scored as a universal miss when it is a language we have
**ruled we will never synthesise**. Strip both distortions and the candidates are level on coverage.

A corollary worth stating: **xAI is the narrowest option on the table**, covering 20 of 43 languages
against Azure's 43. Leaving it costs nothing in breadth.

### 2. Azure — the consistency benchmark — has no version pinning

The target was "near-Azure repeatability", on the assumption that Azure sets a high bar. It doesn't.
Microsoft, in writing: *"Azure Speech does not provide version pinning for standard neural or
multilingual voices"* and *"Once the backend model is replaced, the older version is retired and
becomes inaccessible"* — with no guaranteed notice. The HD voices nominally version in the voice id,
but every documented id is the `…LatestNeural` form, defined as always-latest.

The only genuine pin in the Azure line is the self-hosted container — and that container ships 60
locales covering **30 of our 68 languages**, missing Welsh, Basque, Irish, Greek, Catalan, Croatian
and fifteen more.

So roughly 40 of our 43 TTS languages currently rest on Microsoft's goodwill about not swapping a
voice model under us. **Azure's repeatability is a track record, not a guarantee.** The bar for
candidates is therefore lower than assumed: a vendor offering a real pinnable snapshot would be
*better* than the incumbent on the axis that matters most.

### 3. Chatterbox is byte-for-byte reproducible, measured on this box

Run locally on CPU, no GPU, nothing spent. Twenty renders of one sentence at a fixed seed produced
**one sha256**. The 20-utterance corpus rendered twice was **20/20 byte-identical**. Independently
re-hashed by Watson against the worker's claim: it holds exactly.

The load-bearing part is the 2×2 that rules out the obvious objection — that low temperature had
simply collapsed sampling to greedy decoding:

| Condition | Result |
|---|---|
| Fixed seed, temperature **0.8** (library default), twice | **identical** |
| Different seeds, temperature 0.8 | different takes, durations differ by 0.24 s |
| Different seeds, temperature 0.1 | different takes |
| **No seed set**, temperature 0.8 | **diverges** — the control fires |

**Chatterbox is fully stochastic by default and fully reproducible when seeded.** Store the seed
with the text and a phrase re-renders identically in three years. Nothing else on the shortlist can
currently make that claim with evidence behind it.

---

## Gate zero: who survives

Gate zero was originally "can it do Welsh convincingly". **That gate is withdrawn.** Welsh is done
by human recording — verified in the data: of the 43 languages with 10,000+ clips, all are ~100%
synthetic **except Welsh at 96.4% human**. It is also already code: `human-voice-courses.cjs`
hard-blocks TTS for Welsh, Breton and Pennsylvania Dutch, with deliberately no runtime bypass.

The replacement gate is **coverage of the languages that actually use TTS**, and everyone clears it.
So the candidates are separated below on what remains.

| Candidate | Tier A (live) | Migration scope | All TTS langs | Pinning | Exit | Verdict |
|---|---|---|---|---|---|---|
| **Chatterbox** (OSS) | 7/10 | **10/10** | 22/43 | **Best possible** — we hold the weights | **EASY** — MIT code + weights | **SURVIVES**, needs a GPU |
| **OpenAI** | 9/10 | **10/10** | 40/43 | Dated snapshots | **EASY** — only exit written down | **SURVIVES**, needs sales contact |
| **Cartesia** | 9/10 | **10/10** | 29/43 | Pinnable dated snapshots | **HARD** — legal question | **SURVIVES**, pending legal read |
| **MiniMax** | 8/10 | **10/10** | 31/43 | — | **HARD, worst** | **RECOMMEND DROP** — see below |
| Resemble *hosted* | — | — | — | **None** | — | **DEAD** — no pinning, all prior models EOL'd |

Controls, for calibration: **Azure** 43/43 but no pinning; **ElevenLabs** 42/43, the known-variable
benchmark; **xAI** 20/43, the narrowest, and no `model_id` to pin at all — so leaving it costs us
nothing on axes E or F.

### Why MiniMax should be dropped

Its terms take a *"royalty-free, perpetual, irrevocable, worldwide, non-exclusive"* licence over
uploaded content, **surviving termination**. Uploading Aran's voice under that hands a company a
perpetual irrevocable licence to it, and deleting the voice id does not undo a licence attached to
the audio. That is the same objection that is moving us off xAI, in different words.

**Gap, stated plainly:** the MiniMax *API platform* terms could not be read — the page renders
client-side and returned only a header. This verdict rests on the App/Web terms, which may not
govern an API contract. The recommendation is sound on available evidence and the evidence has a
hole in it. Keeping MiniMax alive requires a human with a browser to read that page.

---

## What was built

- **Benchmark utterance sets: 396 utterances across four languages** — English, Welsh, Spanish,
  Chinese. 99 each, ten categories each, every one traced to a real DB row. One utterance per
  language carries `repeat_count: 20` for the repeatability probe.
  Spanish is variety-tagged (peninsular / Mexican); Chinese minimal pairs are **heteronyms** — 11
  kept of 29 probed, only those where both readings are attested in real course rows.
- **A generator that travels.** Chinese broke it exactly as hoped: `words()` split on whitespace, so
  every Chinese string scored one token and five size-banded categories would have come out empty or
  wrong **while appearing to build successfully**. Tokenisation and size bands are now pack-supplied.
- **A provider-independent harness** — seven adapters, dry-run by default with a spend gate,
  full generation metadata including a sha256 per render, a blind-listening pack builder that
  randomises and strips provider identity, and an A–G scoring sheet.
- **Axis G now scores exit as well as entry** (G1/G2), because TTS is a bridge, not the destination.

Verified end-to-end today: the harness runs the real Chinese pack at 118 renders, 0 failures, with
the 20× repeat probe intact.

---

## What phase 2 needs from Tom

**Signups (unblocks all measurement):**
1. **Cartesia** — self-serve.
2. **OpenAI** — Custom Voices sits behind a **sales conversation nobody has opened**. It is the
   broadest-coverage candidate; nothing can be measured until that starts.
3. **MiniMax** — only if you overrule the drop recommendation.

**A decision only you can make:**
4. **Which voice are we cloning, and for what?** The original brief said consent recordings from
   Aran and Catrin as cloning sources. With Welsh out of TTS scope, that needs rethinking: the
   migration scope is English, German, French, Italian, Japanese, Korean, Spanish, Portuguese,
   Chinese and Finnish. Cloning a Welsh speaker to read Spanish is not obviously the intent. Options
   as we see them: (a) clone Aran/Catrin for **English** courses only, where their voices are
   already the SSi sound; (b) clone nobody and evaluate stock voices per language; (c) clone
   per-language native readers. **This changes what consent we ask for and from whom**, so it wants
   answering before recordings are made.
5. **MiniMax: drop or keep?** Recommend drop, on ethical grounds identical to the xAI decision.

**Resources:**
6. **A GPU box** for a proper Chatterbox run. On CPU here it manages a real-time factor of 4.0×
   — four seconds of compute per second of audio — fine for a benchmark, useless at estate scale.
   Chatterbox is the only candidate with proven byte-identical reproducibility, so this is worth
   pricing rather than dismissing.
7. **A legal read on Cartesia's terms** — §5.3(b) and §4.1 gate commercial use of output on a
   *current* subscription with no survival clause. If that reading is right, we could not keep
   serving Cartesia clips after we stop paying, which would make it a very expensive bridge to leave.
8. **Listening time — one blind pack, an hour.** This is the whole of phase 2's real question.
   Phase 1 proves coverage doesn't discriminate; only your ears can say which sounds human.
9. **A native Mandarin reviewer, under an hour.** The pinyin, tone assignments and sandhi rules in
   the Chinese pack are agent-authored and unchecked.

---

## Gaps — the honest list

- **Nothing has been heard.** No provider was called. Quality — the actual question — is entirely
  unmeasured.
- **No Cartesia, MiniMax or OpenAI credentials exist**, so those three produced no audio at all.
- **Chatterbox's Chinese path is untestable on this box.** `spacy-pkuseg` has no Python 3.14 wheel
  and building it needs dev headers, which needs root. A deliberately loud stub was installed so a
  Chinese render **crashes rather than silently producing a wrong result**. Chinese is in the
  migration scope, so this must be tested somewhere with root.
- **The hard-pronunciation cases are rule-derived, not defect-nominated.** The brief assumed the
  estate's re-record queues would nominate them. They can't: `rerecord_wanted` is empty estate-wide
  and `course_audio` has no `quality_notes` column. Its veracity block covers 86/21/12 rows across
  the three courses and **none failed**. So the hard cases rest on phonological reasoning matched
  against real corpus strings — the same standing as the Welsh pack, but a weaker claim than
  "the estate has already re-recorded this", and not reported as one.
- **24 kHz ceiling.** OpenAI and Chatterbox are fixed at 24 kHz, band-limited near 12 kHz, then
  upsampled into our 44.1 kHz house master. Invisible in a fully synthetic course; audible-adjacent
  in exactly the **part-migrated** course the bridge frame creates. Cartesia and MiniMax are 44.1 kHz
  native.
- **Only Azure emits `word_boundaries`** — xAI and ElevenLabs return null by design, and component
  splicing depends on it. `fra_for_eng` holds 58 boundary rows of 67,369 after its xAI re-render;
  Azure-era `spa_for_eng` holds 33,420 of 79,722. An already-incurred cost of the xAI era.
- **No digits in the Spanish or Welsh seed corpora**; English digit coverage is thin.
- **A whole-table `word_boundaries` census timed out** (2,593,092 rows) — boundary figures are
  per-course samples, not estate-wide.
- **An operational finding worth carrying:** `POST /api/reply` does **not** redirect a running
  worker. Four workers returned `ok: true`, stayed `running`, and finished on their original brief
  regardless — one committing superseded work seven minutes after the correction was sent.
  Corrections must be reconciled at merge, not trusted mid-flight.

---

## Incidental defect found

Two `cym_n_for_eng` legos carry a **Cyrillic `е` (U+0435)** where a Latin `e` belongs — `problеm`
(S0264L02) and `hеr` (S0271L01). `cym_s_for_eng` is clean. It has propagated into audio: two clips
under the corrupt spelling and one under the correct one for each, all `legacy_import` from
2026-01-04. The practice phrases are clean and fully voiced, so **no learner is hearing silence** —
this is duplicated clips and a latent text-matching bug. Left untouched: editing `target_text`
mutates audio links, and this is human-recorded Welsh content.

Also found: two genuine wrong-language rows — `"to be quiet"` sitting in Chinese `target1`/`target2`
slots, voiced by Mandarin voices.
