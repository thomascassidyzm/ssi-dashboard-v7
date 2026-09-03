# The reworked Voice Lab — Cartesia in, xAI out, one row per language

**Open it:** https://popty.app/admin/configs/voice

It opens on **Languages** now. One row per language the estate actually teaches,
worst first, showing which voices are configured and which are missing. Play and
Engineering are untouched behind it.

Sample rendered through the reworked lab on Cartesia sonic-3.6:

https://watson-1.tail4968cb.ts.net/evidence/voicelab-cartesia-2026-08-28/voicelab-cartesia-render.mp3

---

## The thing you should know first

**The brief was written against a checkout 844 commits behind `main`.** It said
Cartesia was not in Popty's production render path and that step one was to put
it there. On real `main` that was already done on 2026-08-27 — `generateCartesia`
ships, pinned to **sonic-3.6**, and there is a full provider ladder in
`services/shared/tts-provider-policy.cjs`.

What was actually broken was sharper, and worse:

> **The Voice Lab could not render at all.** Its default config asked for `xai`,
> and `generate()` now refuses `xai` with a 403 because xAI is retired from
> selection. The lab opened on a provider its own render path rejects.

So "prove Cartesia renders" and "remove xAI" were not two steps, they were one.

## What it now does

**Languages (new, the front door).** Every language on live courses, read from
`courses.target_lang`, with its voices read from `voices` and its coverage read
from the *same* policy module the render path uses — so the screen cannot claim
something a render would refuse. Each language wants four voices: a primary and
a backup, male and female. Empty slots are drawn as empty slots.

**Three kinds of "no voice", kept separate, because collapsing them would make
the screen lie:**

| status | meaning |
|---|---|
| `complete` | every slot cast |
| `partial` | some cast, some not |
| `uncast` | a provider could speak it, nobody is cast — **the real blocker** |
| `nocover` | Cartesia does not publish it; the ladder uses Azure |
| `human` | human-recorded only — **not a gap** |

**What the estate actually looks like, measured tonight:**

- **68 languages. 0 complete. 33 uncast. 32 no-Cartesia-coverage. 3 human.**
- The `voices` table held **zero Cartesia rows** before tonight.

That last number is why registering mattered as much as cloning: Cartesia is the
estate's standing default provider, and it was the one provider you could not
choose. Casting a Cartesia voice now auto-registers it.

**Human voices** appear in the same view as a voice *kind*, castable into the
same slots. No separate human screen.

**Cloning** works from the screen: upload a sample, get a voice id, and it is
registered and castable immediately.

## The Welsh gap, stated plainly

Cartesia does not support Welsh. I confirmed this against the **live API**, not
just the docs — `language: "cy"` returns `400 unsupported language 'cy'`.

But Welsh does not render as a red gap, and should not. Welsh, Breton and PDC are
**human-recorded only** by standing ruling — a human recording wins wherever it
exists, and their empty synthetic slots are a recording worklist for their
recordists, not a casting failure. So they show as `human`. Cloning refuses those
languages with a message naming the reason rather than a vendor error.

## The cost ceilings, and exactly where they are enforced

| guard | value | enforced at |
|---|---|---|
| clone audition | **3 clips** | `services/voicelab/cartesia.cjs` `CLONE_AUDITION_MAX_CLIPS` |
| preview | **10 clips** | `services/voicelab/cartesia.cjs` `PREVIEW_MAX_CLIPS` |
| daily ceiling | **60,000 characters** | `services/voicelab/lab.cjs` `LIMITS.dailyCharCeiling` (unchanged) |
| clone upload | **25 MB, one file** | `services/voicelab/router.cjs` `MAX_UPLOAD_BYTES` |

**Neither cloning nor registering renders any speech.** Cloning uploads a sample
and returns an id; registering is one database upsert. There is deliberately no
"render a sample set for the new clone" convenience — that is exactly the shape
that turns one click into a bill.

**The lab no longer claims dollars.** It priced runs at xAI's $15/M — a rate for
a provider it can no longer call — and neither Cartesia nor Azure has a verified
rate anywhere in this repo. It now reports `usd: null` ("not priced"), never `0`
("free"), and meters **characters**, which it can actually count and which is
what the ceiling was always made of. Four Vue panels would have crashed on the
null; each now reads "not priced".

## Two vendor questions settled against live responses

1. **The `Cartesia-Version` header is required.** The adapter recorded that
   Cartesia's own docs disagreed. The same request without it returns **400**.
2. **Cartesia accepts both `fr-FR` and `fr`** as a locale steer on sonic-3.6.

## Still Tom's call

- **Completeness is four voices per language** (primary + one backup, each
  gender). You asked for "2 voices … with backups"; two backups is the reading
  that makes "backups" plural without demanding six voices across 70 languages.
  One env var: `VOICELAB_REQUIRED_RANKS`.
- **Casting is not enforced anywhere yet.** The render path still selects via
  `tts-provider-policy.cjs`, which reads `voices`, not the new table. This landed
  as a registry a human reads and fills. Wiring it into automatic selection is a
  separate decision with a much larger blast radius.
- **Nobody is cast yet.** I deliberately cast nobody — that is Kai's call, not
  mine. I proved the path works and reverted it, leaving the estate as found.
