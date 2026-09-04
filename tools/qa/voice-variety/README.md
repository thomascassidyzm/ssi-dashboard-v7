# The voice-variety standing check

**What it answers, in two numbers, every night:**
1. How many target-side pairings have a voice speaking a variety the course does not claim to teach?
2. How many pairs of counts that must agree no longer do?

Both read-only. Neither recasts anything, renders anything or deletes anything. Which native voice replaces a wrong one is Tom's ear and Tom's alone.

## The rule

Tom's ruling, carried by 環 RBF on 2026-09-03:

> **THE VOICE IS A CLAIM ABOUT THE CONTENT.** It asserts: this is how a speaker of THIS variety says THIS. … **TARGET-SIDE AUDIO MUST BE NATIVE TO THE VARIETY THE COURSE CLAIMS TO TEACH. Known-side may be anyone, because there is nothing there to acquire.**

and upstream of it, Tom's dialect ruling already in the code (`services/shared/cast-language-key.cjs`): *dialects are different LANGUAGES in this product.* So a voice tagged `cym_north` has no business in a `cym_south` course, and Gulf-accented TTS has no business on Modern Standard Arabic. That is a checkable constraint on a join, not a taste call.

## Why nothing already saw this

| Existing check | What it compares | Why the Saudi-MSA case is invisible to it |
|---|---|---|
| `tools/audio/voice-mismatch-census.cjs` | a clip's voice against the course's **own** `voice_config` | a course configured with the wrong variety is consistent with itself |
| `services/voicelab/registry.cjs` | `voices.languages` against a language **"on the two-letter base"** (its own comment) | `ar-SA` matches `ara`, so nothing fires |

The violation is **inside a single language**, which is why it went unnoticed: nobody was looking for a mismatch that did not cross a language boundary.

## Check 1 — variety against variety

`check-voice-variety.cjs`, logic in `variety.cjs`.

**The variety the course claims** comes from `castKeyForCourse()` — Tom's own definition in code, reading `courses.voice_pool_key` and `courses.dialect`, never the course code.

**The variety the voice carries** comes from its locale (`voices.tts_locale`, or the locale baked into an Azure id), mapped to an estate cast key by a **hand-written snapshot** in `variety.cjs` — `REGION_VARIETY` and `HOME_REGION`. When a pairing cannot be mapped it is **UNKNOWN**, in its own bucket: never counted as a mismatch and never counted as clean.

### Three layers, because they disagree

| Layer | What it is | Why it is judged |
|---|---|---|
| `clips` | voices actually linked to the course's target-side rows | **what the learner hears today** |
| `stored` | `courses.voice_config` | what the course renders in, and what the existing clips came from |
| `resolved` | `services/shared/language-voice-cast.cjs`, the one reader on the render path | what the next render would choose |

Judging only `resolved` would have missed the calibration specimen entirely: job #446's draft cast overlays `ara_for_eng`'s Azure Saudi config with Cartesia voices, so the Saudi voices are invisible there while every Saudi clip still sits in the course a learner opens.

### Roles in scope

`target1` and `target2` only. `known` is exempt (there is nothing there to acquire); `instruction` and `encouragement` are the guide roles and resolve against the **known** language — the app talking to the learner; `presentation` is the intro/clone voice and is already excluded from the language cast.

### The two defaults chosen on 2026-09-04, for Tom to overrule in one line

1. **A locale is a variety claim only where something distinguishes varieties** — the estate teaches two or more varieties of that base, *or* the provider publishes more than one locale for it. A `fi-FI` voice on Finnish claims nothing controversial. Without this, Finnish, Afrikaans and Dutch rows are noise.
2. **The base language is its own variety, and it is not the home country's** — `ara` here means Modern Standard Arabic, MSA has no country, so *every* regional Arabic locale is a mismatch against it. `spa` means European Spanish, so `es-ES` matches it. That is what `HOME_REGION` records, one line per language.

A third rule keeps Welsh and Irish honest: where a locale **cannot express** the distinction the estate makes (every Welsh locale is `cy-GB`; the estate teaches `cym_north` and `cym_south`), every pairing on that language is UNKNOWN rather than judged. Convicting a Northern Welsh course on `cy-GB` would be the check inventing a claim the data never made.

### One voice, two varieties — the finding that needs no locale

If dialects are different languages, a single voice cast as the primary for two of them claims to be native to both, and at most one of those can be true. This is provable from `voice_language_roles` alone — which matters, because 121 of the estate's voices are Cartesia and Cartesia publishes no locale for any of them.

## Check 2 — two counts that must agree

`count-reconciliation.cjs`. 環 RBF's framing: *clips-against-no-phrases is one specimen of a general shape — two counts that must agree and nothing that compares them.* This **generalises a check that already exists in one corner**: `podCanonReuseTexts` in `services/phases/phase8-audio-v13.cjs` (~line 7480) refuses audio reuse when canon and pod lengths disagree.

**Direction matters.** A course mid-build has more content than audio — ordinary, and already counted every night by `tools/qa/audio-gap`. The direction that *cannot* be true is **audio no content row can reach**.

| Pair | Meaning |
|---|---|
| `content_zero` | zero content rows and content-role clips anyway — nothing can ever reach them |
| `linked_zero` | content and audio both present, nothing linked |
| `pod_canon` | `listening_pod_sentences` against `canonical_pod_scenarios` — phase8's own comparison |

**The role split is not optional.** Only `known`, `target1`, `target2` and `presentation` are ever pointed at by a content row; `welcome`, `instruction`, `encouragement` and every `pod_*` role are unlinked **by design**. Counting them convicted twenty courses whose entire audio holding is one shared `welcome` clip. They are counted separately so nobody re-derives them and believes they are damage.

## Calibration

Both checks reproduce a known positive before reporting anything, and **refuse to be quiet if they miss it**:

* Check 1 — `ara_for_eng`, Modern Standard Arabic wired to Azure Saudi voices.
* Check 2 — `ara_sy_for_eng`, clips against zero content rows.

A check that runs clean over the estate while those sit in it is a broken check that would then be trusted nightly.

## Running it

```
node tools/qa/voice-variety/check-voice-variety.cjs --calibrate     # check 1
node tools/qa/voice-variety/count-reconciliation.cjs                # check 2
node tools/qa/voice-variety/nightly.cjs --no-notice                 # both, snapshot, no notice
npx vitest run tools/qa/voice-variety                               # 23 tests
```

Needs `.env.psql` (gitignored, provisioned per machine — `docs/secrets-vault.md`). Grouped aggregates throughout, never a row walk: ~3 minutes, almost all of it Postgres-side.

## The nightly

A systemd user timer on watson-1 — **no GitHub Actions, that is estate policy**.

```
cp tools/qa/voice-variety/systemd/ssi-voice-variety.{service,timer} ~/.config/systemd/user/
systemctl --user daemon-reload && systemctl --user enable --now ssi-voice-variety.timer
systemctl --user list-timers ssi-voice-variety.timer      # is it armed
journalctl --user -u ssi-voice-variety -n 50 --no-pager   # what happened
tail ~/.local/log/ssi-voice-variety.log                   # one line per night
```

**05:55 Europe/London**, stated in London so DST needs no edit, chosen to miss every neighbour on this box (03:00 SSi CI, 03:50 landing sweep, 04:15 tmp sweep, 04:30 Vue sentinel, 04:40, 05:10 audio-gap, 05:40 events archive).

**It runs from its own checkout, `/home/tomcassidy/SSi/popty-qa-nightly`, refreshed to `origin/main` before every run.** `audio-gap` runs from the shared checkout and that works only while the shared checkout happens to sit on a branch carrying its files — on 2026-09-04 it was on `docs/senedd-s4c-floor-audio-2026-09-03` with a large uncommitted diff and several sessions live in it, so a unit pointed there would have fired into nothing the night this landed.

Doctrine, per `~/command-surface/ops/ci-run.sh`: **quiet is silent, a rise is loud, and a night it cannot run is loud too.** A night where nothing went up writes its snapshot and says nothing. A night where either count rose posts one plain-English notice into the Popty project channel. A night it cannot run — including a night it cannot reproduce its own known positive — says so, because a check that silently stops running is worse than no check: it is a check everyone believes.

Snapshots: `~/.local/state/ssi-voice-variety/YYYY-MM-DD.json`, plus `latest.json`. One per night, so the series is the record.
