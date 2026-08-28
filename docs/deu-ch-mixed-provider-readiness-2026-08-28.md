# deu_ch mixed-provider run — the split works, but two things must be decided first

**Short version.** The single most important check passed: **the pipeline genuinely does honour a
per-role provider split**, so Azure-for-Swiss and Cartesia-for-English is expressible and will
render as two different vendors inside one course. The full 39,500-clip run is **not started**,
because a run begun today would produce a course with **two different English voices** and would
have to speak them in **Tom's personal voice clone**, which is the only Cartesia voice that
exists in the estate. Both are decisions, not obstacles — neither is mine to make.

---

## 1. The provider split — VERIFIED, not a blocker

In the bulk generation path the provider is not a course-level setting at all. Each item carries
its own voice id and the provider is read off its prefix:

```
services/phases/phase8-audio-v13.cjs — the bulk render path
const [provider, voiceName] = item.voiceId.split('_', 2)
```

`azure_de-CH-LeniNeural` → Azure; `cartesia_<uuid>` → Cartesia. Every render path in phase 8
carries an explicit `else if (provider === 'cartesia')` branch (six of them), and
`services/tts-service.cjs` has a matching `case 'cartesia'` in its dispatch. Per-role voices are
read as `course.voice_config?.voices?.[role]?.provider`.

So mixing vendors within one course is supported **by construction** — it is not a special case
somebody has to add. That said, one honest limit: **no course anywhere has ever rendered through
`voice_config` on Cartesia.** The only Cartesia clips in the estate (91, on `spa_for_eng` Pod 1)
came through the pod path. deu_ch would be the first course to exercise this, so it wants a
pilot batch before the full run — which is exactly what the brief asked for, and what the
decisions below are blocking.

## 2. Blocker A — there is no Cartesia English voice to switch to

Researched against the database and the bake-off docs (full evidence:
<https://watson-1.tail4968cb.ts.net/d/733441f4>):

- The `voices` table contains **zero** Cartesia entries.
- No course `voice_config` names Cartesia anywhere.
- The only Cartesia voice in `course_audio` is `cartesia_8fef4d59-…` — **Tom's personal voice
  clone**, 91 clips, scoped to his own dialogue lines on one pod.

`docs/tts-language-coverage-gap-map-2026-08-27.md` lists "Cartesia (Tom clone)" against every
Cartesia-eligible language, English included. Taken at face value that table would put **Tom's
voice on all 12,154 English clips of the Swiss German course**. That is almost certainly not
what anyone means, and it is the reason this is stopping here rather than proceeding on a guess.

**Needed:** a stock Cartesia English voice, picked by ear the same way Leni and Jan were. It has
never been chosen and no stock Cartesia voice has ever been rendered here.

## 3. Blocker B — 2,346 English clips already exist in Azure, and the pipeline will skip them

The set phase 8 uses to decide what still needs rendering is keyed on text, language and role —
**voice is not in the key**:

```
services/phases/phase8-audio-v13.cjs — getExistingAudioSet()
const key = `${normalizeText(a.text)}|${a.language}|${a.role}`
```

deu_ch already has 2,346 English known-side clips in Azure Sonia, left by a bulk render that ran
before this work started. Switching the config to Cartesia and running would **not** re-render
them — they already satisfy the key, so they are skipped and stay linked. The result is one
course whose English narrator changes voice partway through, with no error raised anywhere.

`forceGenerate` does not solve it: it only reclassifies *unlinked* items, and these are linked.
The route that does solve it is the per-role regenerate path, which reads `voices[role]` and
re-renders that role — so this is fixable, it just has to be asked for.

**Needed:** a ruling. Either re-render those 2,346 onto Cartesia (make-before-break: render,
relink, delete nothing), or leave the English side on Azure for this course. Note this sits
against Tom's standing 2026-08-27 ruling that Cartesia adoption is **forward-only**; the case for
an exception here is that these clips are two days old, the course is unreleased, and they came
from a run that was never approved.

## 4. Fixed along the way — the service was running stale code

The phase-8 service had been up since 2026-08-27 20:50 and had therefore loaded
`services/tts-service.cjs` **as of commit 74059e41e**, which pins `modelId = 'sonic-3'`. The
sonic-3.6 pin landed at 23:52 that night, after the process started, so it was on disk but not in
memory. A Cartesia run started before this would have rendered every English clip on **sonic-3**,
silently, while everyone believed it was 3.6.

Service restarted 2026-08-28 12:32 while idle; it is back up, healthy, and now running the
current code. Nothing was mid-render.

## 5. Watch item — a live job is changing how providers are chosen

A worker is landing "TTS provider policy: Cartesia default, Azure fallback, xAI retired", whose
own brief states that afterwards *"every new render the dashboard produces chooses its provider
by policy rather than by whatever a per-course `voice_config` row happens to say."* If that
policy defaults German to Cartesia, it would override Kai's ruling that the Swiss German side
stays on Azure. A 39,500-clip run takes roughly ten hours at observed throughput, so it would be
running while that policy lands. Worth sequencing the two deliberately rather than by accident.

## 6. What the run would cost, and what it should produce

Measured from deu_ch's own rows — English known 24.4 chars average, presentation 67.3, Swiss
German target 23.7 — against Cartesia ≈$30/1M chars (Startup tier) and Azure $15/1M
pay-as-you-go: **roughly $21 total, about $12 Cartesia and $9 Azure.** Small enough that cost is
not the reason to hesitate.

Counts to check the finished run against, computed from distinct texts rather than row counts
(clips dedupe by text, so row counts overstate the work):

| Role | Should exist | Exists now | Provider under Kai's ruling |
|---|---:|---:|---|
| known (English) | 12,154 | 2,346 | Cartesia — *blocked, no voice* |
| target1 (Leni) | 12,161 | 1,368 | Azure ✓ |
| target2 (Jan) | 12,161 | 228 | Azure ✓ |
| presentation (English) | 1,390 | 26 | Cartesia — *blocked, no voice* |
| **Total** | **37,866** | **3,968** | |

## 7. The refusal ledger is armed

The checker's refusals are recorded durably, with the audio kept, in
`scripts/audio-veracity-quarantine/` — a `quarantine.jsonl` line per refusal carrying the text,
the voice, every attempt's transcript and its CER, plus the rejected mp3 on disk. Baseline taken
before any further run: **109 lines total, 5 of them deu_ch.** Every refusal from here is
countable by difference, and none can become a silent gap. The four deu_ch refusals so far are
already published, audible, on the listening page.
