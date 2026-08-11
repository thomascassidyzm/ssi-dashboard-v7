# Spanish, recast Iberian

**11 Aug 2026.** You rejected the PodLab casting sample for `spa_for_eng`: the pronunciation was
Mexican, and this is an Iberian course. It's recast. Nothing was generated, nothing was deleted.

**Page:** https://popty.app/admin/configs/pods → Spanish → **Casting & approval**

---

## What was cast, and why it sounded Mexican

Two separate things, and the second is the one that would have bitten again.

**The voices.** The pod you sampled was cast to **Maria `f2f41225`** and **Pablo `d2313a0d`**, both
xAI. Neither id appears in this repo's voice catalogue, and neither appears in xAI's own live
`/v1/tts/voices` list today. `app_config.pod_voice_pools` holds them with no locale and no accent
tag. **Nobody can say what accent they are without paying to render one** — so they cannot be the
answer to a rejection that was about accent.

**The language handle, which is the real story.** Every character on that pod carried
`target.locale = "es"`. The course's other three Spanish pods carry `es-ES`. Phase-8 hands that
handle straight to xAI as the language, and the codebase has already been bitten by exactly this
once: `por` had to be moved off the bare handle to an explicit `pt-PT`, with the note *"native pt IS
Brazilian"*. A bare `es` gets xAI's default Spanish, and its default Spanish is Latin American.

So the pod PodLab samples was the one pod of four whose handle threw the region away. That is what
your ear caught.

---

## What it's cast to now

**Elvira** (female) and **Alvaro** (male), Azure, locale `es-ES`.

That is not a pick out of a list. Three independent things say it:

- **The provider guarantees it.** Azure's live catalogue returns both as `LocaleName: "Spanish
  (Spain)"`, `VoiceType: Neural`, `Status: GA`. An Azure locale is a hard fact, not an assumption —
  which is the whole problem with the xAI ids.
- **The course already designates them.** `courses.voice_config.voices.target1/target2` for
  `spa_for_eng` is Elvira and Alvaro, and has been since February.
- **The course already speaks in them.** ~24,000 of its Spanish clips are rendered on Elvira and
  Alvaro. This is the voice you have been listening to as Spanish all along. The pods were the
  outlier, not the fix.

All four pods now, target track only:

| Pod | Before | After |
|---|---|---|
| `pod-0-unrecorded` (232 lines — the one sampled) | Maria, Pablo @ `es` | Elvira, Alvaro @ `es-ES` |
| `pod-0` (142 lines) | Eve, Manuel, Ara, Javier, Diego @ `es-ES` | Elvira, Alvaro @ `es-ES` |
| `music` (749 lines) | Manuel, Ara @ `es-ES` | Elvira, Alvaro @ `es-ES` |
| `travel-situations` (72 lines) | Eve, Diego, Ara, Javier, Manuel @ `es-ES` | Elvira, Alvaro @ `es-ES` |

I recast all four, not just the sampled one, because the approval gate fingerprints **every pod of
the course**. Approving one pod's cast while three others kept five unverified xAI voices would have
been approving those too.

The **English track is untouched** everywhere — Olivia, Tom, Sonia, Hollie, Ryan, Libby all stay
exactly as they were. The accent problem was never on that side.

**Four gender mismatches got fixed on the way through**, because a two-hander has nowhere to hide
them: Driver, Learner and Tourist are male characters that were reading in the female voice, and
Barista is a female character that was reading in the male voice.

---

## The thing that would have undone it

Recasting the pods alone would not have held. `pod-sync` always takes **pool index 0** for each
gender, and the front of the `spa` pool was Maria and Pablo — the rejected pair. The next sync would
have quietly put them back.

So the pool is reordered too: `spa.f` is now **Elvira → Maria → Lucia**, `spa.m` is **Alvaro → Pablo
→ Carlos**. Reorder only — nothing added, nothing dropped, and the other 45 pools verified
byte-identical after the write.

---

## Verified with the gate's own logic

Read back through `services/pod-voice-approvals.cjs` — the same module phase-8 and the approval
route use, not a second opinion of my own:

```
pods fingerprinted: 4
distinct TARGET voices across every pod:
    azure:es-ES-AlvaroNeural:es-ES
    azure:es-ES-ElviraNeural:es-ES
cast fingerprint: 3cc02c6ac613d74c → 7ed1d02d6cf3d5d8
```

Two voices, both Spain. Pod line counts and audio links are identical to before the change: 749 /
142+142 / 232+119 / 72, and 78,229 `course_audio` rows — **nothing rendered, nothing relinked,
nothing deleted.** Metadata only, and the full before-state of every pod is in the applied logs,
which is the way back.

---

## What needs you

**A. Listen and approve — or reject again.** There is no approval on record (your rejection left
none), so the gate still refuses bulk generation. Generate a sample from the page and listen. Every
clip currently on the pod was rendered on the OLD cast, so the page will correctly show you very
little that matches — a sample run is what produces the evidence to judge.

**B. One question I could not settle without spending money.** The xAI native Spanish voices
(Manuel, Javier, Diego) have never been heard at an explicit `es-ES` handle — only at the bare `es`
that you rejected. xAI generally sounds more natural than Azure, so if you want that timbre in
Iberian rather than Azure's, it is one sample away. I did not pick it, because "probably fine at the
right handle" is exactly the assumption that produced the rejection. Say the word and it's a sample,
not a rebuild.

**C. `voice_config.podCast` is empty for Spanish, and I left it that way.** That key is the
*human-recording* cast — real people with names and emails, which is how Welsh works. Writing TTS
voices into it would declare `spa_for_eng` a human-recorded course to the recorder and autocue
queue. For a TTS course the cast of record is `listening_pods.speakers`, which is what was recast.
