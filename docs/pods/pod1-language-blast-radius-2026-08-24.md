# Pod 1 fleet — how many clips speak English by accident

**Short answer to your question: yes, we did them with proper per-language identification. All of them. Every single Pod 1 course, every xAI-voiced character, carries an explicit language tag — and I checked all 22 casts one by one rather than taking the code's word for it. Nothing was "lost in the mix".**

**But something else was.** The safety net that was supposed to *catch* an English-sounding render has been switched off since 7 August, and nobody knew. It wasn't turned off — it broke silently, in one line of a shell script, and it kept reporting itself healthy.

---

## The number

| | |
|---|---|
| Pod 1 target clips across 22 courses | **5,082** |
| Rendered by an xAI voice (the only voices that can drift) | **2,046** |
| …of those, rendered while the accent safety net was blind | **2,046** |
| Clips I could actually measure as speaking English | **1 in 110 sampled — statistically nothing** |

So: **not "the pods are all messed up".** 2,046 clips are *unverified*, not *wrong*. I found no fleet-wide English cohort. But I also have to be straight with you about the limit of my instrument — see "What I could not measure" below, because it matters for what you're hearing.

---

## What actually explains "the later scenes sound very English"

I think I've found it, and it isn't the language tag.

**From scene 15 on, one voice does almost all the talking.**

| | Average share of lines taken by the single dominant voice |
|---|---|
| Scenes 1–14 | **50%** |
| Scenes 15–22 | **86%** |

Scenes 1–14 are conversations: Barista/Sarah, Waiter/Diner, Narrator. Two or three voices trading lines, so no single voice's character dominates your ear. Scenes 15–21 are drill scenes — "Learner" and "Narrator" — and the Learner takes **10 of every 11 lines**.

In Italian that Learner is `ara`. So from scene 15 onward you hear ten Ara lines in a row with one Narrator line between them, where earlier you heard Ara alternating with the male voice every other line. If Ara has any English-leaning quality, scenes 15–21 are where it stops being masked and becomes the whole texture.

That is a **casting and scene-composition** finding, not a language-parameter one. It fits your report precisely — the later scenes genuinely do sound different, and the reason is that they are almost a monologue in one voice.

## Listen — the same voice, early scene vs late scene

Both of these are Italian, both are the **same voice (`ara`)**, no other difference:

**Control — scene 3, rendered 10 June, conversational context:**

https://saysomethingin.app/api/audio/68d799bc-afbe-4a3a-b506-609ebcae5054

> *Buonasera. Vorrei un caffè, per favore. Con latte.*

**Suspect — scene 15, rendered 22 August, drill context:**

https://saysomethingin.app/api/audio/9b8575ae-5545-4437-9fd3-a9136552a13c

> *Preferisco provare a parlare la tua lingua, per favore.*

And a second scene-15 line from the same batch:

https://saysomethingin.app/api/audio/da55642b-5acb-45d0-80d9-315643019f4d

> *Quanto costa un taxi per andare in centro?*

If the late ones sound American to you and the early one doesn't, that's the finding, and it's about the voice and how much of it you hear in a row — not about a missing language tag. **Your ear decides this one, not my measurement.**

## The one clip my instrument did flag

Swedish, scene 18, `xai_3b312632` — whisper heard this as English:

https://saysomethingin.app/api/audio/5392a664-7673-4b4b-a5f0-2838e61d7b8b

> *Var går bussen ifrån?*

Its control, same voice, scene 6:

https://saysomethingin.app/api/audio/c04465af-0540-468c-bffd-8f6d489c186a

> *Jag heter Anna. … Och du?*

Swedish was the only course with repeated mismatches (5 of 8 sampled clips came back as something other than Swedish — Norwegian, Slovenian, Albanian and one English). All five are short clips of 1.4–2.8 seconds, which is exactly where whisper's language guess is least reliable, so I'd read this as **"Swedish deserves a proper listen"** rather than as proof of anything.

---

## The real defect I found

`services/tts-service.cjs` has a phonology gate. After every xAI render it runs whisper over the audio, asks "what language does this sound like", and if the answer is English when it should be Italian it throws the take away and re-rolls. Built 11 July, wired into every xAI call site, exactly the right idea.

On **7 August** a concurrency wrapper was installed at `~/.local/bin/whisper-cli` — a good piece of work that stops whisper eating the box. It contains this line:

```bash
exec {fd}>"$SEMDIR/slot$i" 2>/dev/null || continue
```

Written on an `exec` with no command, that `2>/dev/null` doesn't apply to that one redirection — it **permanently silences the shell's error output**, and whisper inherits it. So every caller since 7 August has received **zero bytes** of whisper's diagnostics.

The gate reads the answer off exactly that channel. It got nothing, concluded "unmeasurable", and unmeasurable is treated as a pass. **The gate has passed every single xAI render since 7 August without measuring one of them**, while reporting itself perfectly healthy.

I proved it rather than inferred it — ran the gate's own code, verbatim, against prod's own environment:

```
before:  { detected: null, stderrBytes: 0 }
after:   { detected: 'ar', stderrBytes: 2939 }
```

Corroborating: the service log holds 9 gate rejections, every one of them dated on or before 4 August. Not one after. The gate has been silent ever since, and now we know why.

**Fixed and verified live.** The semaphore, the nice level and the idle scheduling are all untouched — whisper is still a well-behaved background citizen.

---

## Per-course table

"Unverified" = rendered by an xAI voice while the gate was blind. Azure-voiced courses are structurally immune: their voice names carry the locale, so there is no language cue to lose.

| Course | Pod 1 target clips | xAI-voiced | Unverified | Scenes affected |
|---|---|---|---|---|
| deu_at_for_eng | 231 | 231 | **231** | 1–22 |
| swe_for_eng | 231 | 231 | **229** | 1–22 |
| ita_for_eng | 231 | 231 | **189** | 1–22 |
| fra_for_eng | 231 | 231 | **186** | 2–22 |
| zho_for_eng | 231 | 231 | **179** | 2–22 |
| hin_for_eng | 231 | 231 | **167** | 1–22 |
| deu_for_eng | 231 | 231 | **165** | 1–22 |
| nld_for_eng | 231 | 231 | **164** | 1–22 |
| por_for_eng | 231 | 231 | **162** | 1–21 |
| ara_eg_for_eng | 231 | 231 | **161** | 1–22 |
| por_br_for_eng | 231 | 151 | **120** | 1–22 |
| spa_for_eng | 231 | 80 | **48** | 1–22 |
| kor_for_eng | 231 | 80 | **45** | 2–22 |
| ara_for_eng | 231 | 0 | 0 | — Azure |
| eus_for_eng | 231 | 0 | 0 | — Azure |
| fra_ca_for_eng | 231 | 0 | 0 | — Azure |
| gle_for_eng | 231 | 0 | 0 | — Azure |
| hrv_for_eng | 231 | 0 | 0 | — Azure |
| isl_for_eng | 231 | 0 | 0 | — Azure |
| jpn_for_eng | 231 | 0 | 0 | — Azure |
| ron_for_eng | 231 | 0 | 0 | — Azure |
| spa_mx_for_eng | 231 | 0 | 0 | — Azure |
| **Total** | **5,082** | **2,046** | **2,046** | |

**On "later scenes": refuted as a render-era story.** The unverified cohort spans scenes 1–22 in nearly every course, not scenes 15+. What is genuinely concentrated in the later scenes is the single-voice domination above.

## The acoustic sample

110 clips through the **live learner audio path** (`saysomethingin.app/api/audio/…`, what you actually hear — not S3), across all 13 xAI courses, stratified 5 late-scene / 3 early-scene per course so every course has its own within-course control.

| | |
|---|---|
| Clips measured | 110 |
| Heard as the correct language | **103** |
| Heard as some other non-English language | 6 (5 of them Swedish) |
| Heard as English | **1** |

The 6 non-English mismatches are the instrument's own noise floor — a **5.5% false-positive rate measured on this very sample**, on clips nobody suspects. One English detection sits below that floor. There is no English cohort here.

### What I could not measure — stated plainly

**Whisper identifies the language of the WORDS, not the accent.** An Italian sentence made of correct Italian words, spoken with a thick American accent, comes back as `it` — correctly, and uselessly for our purposes. That is *exactly* the thing you described hearing.

So my sample can only prove the absence of *total language collapse*. It cannot confirm or deny *accent drift*, which means **it cannot check the thing you actually heard**. The same limit applies to the production gate I just repaired: it will catch a clip that reads Italian text in English, and it will happily wave through a clip that reads Italian with an American accent.

If accent drift is what's happening, no instrument we currently own can find it. Your ear is the only detector we have, which is why the contrast pairs above matter more than the table.

---

## What needs you — one decision

**The re-render list exists and is committed** (2,046 clips, per-clip, machine-usable, with course/scene/speaker/voice/text). Nothing has been re-rendered. But I don't think re-rendering is the right next move, and here's why.

**My recommendation: AUDIT, don't re-render.** The gate now works. Running it as a read-only pass over all 2,046 clips costs **nothing** — no TTS, no money, just whisper time on an idle-priority core — and it tells us exactly which clips fail rather than paying to re-render 2,046 clips of which the sample says roughly zero are broken. Then re-render only the failures.

Cheaper, simpler, and better evidence than a blanket re-render. **One word: "audit" and I'll run it.**

Two smaller things, both one-liners for you:

1. **Italian voice** — you said Ara "sounds rubbish… just sounds like American" and the Narrator sounds properly Italian. If the contrast clips above confirm that for you, the fix isn't a re-render with the same voice, it's **recasting the Italian female**. That's a taste call and it's yours. Say the word and I'll bring you candidates.
2. **Austrian German** — `deu_at_for_eng` is steered as plain `de`, not `de-AT`. All 231 clips. Might be entirely deliberate; flagging it rather than acting.

---

## Gaps, honestly

- **No per-clip record of the language cue exists anywhere.** `course_audio.language` records the clip's *identity*, not what was sent to the provider, and the two were deliberately separated in code. I established the cue by tracing the call path and reading all 22 casts' speaker JSON directly, which is solid — but it is inference from configuration, not a stored per-clip fact. Worth storing.
- **Job #317** (the ten Italian scene-15 clips) was **still running** when I finished, so nothing of its findings is folded in here. I deliberately did not re-measure its ten clips.
- **The acoustic sample is 110 clips, ~5% of the cohort**, weighted to later scenes, bounded so as not to starve two other live jobs on this box. It is corroboration, not a census.
- **Azure courses were excluded from the acoustic leg** on the evidence that their voice names carry the locale and cannot lose a language cue — a reasoned exclusion, but an exclusion.

---

*Evidence, per-course counts, the 110-clip acoustic sample and the 2,046-clip candidate list are all committed alongside this document.*
