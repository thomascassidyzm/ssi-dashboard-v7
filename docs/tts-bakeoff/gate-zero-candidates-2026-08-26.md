# Gate zero — the four candidates

**Slice 1a of phase 1. Compiled 2026-08-26 from vendor documentation fetched today.**
Machine-readable per provider: `coverage-cartesia.json`, `coverage-chatterbox.json`,
`coverage-minimax.json`, `coverage-openai.json` in this directory.

Nothing here was measured. There is no Cartesia key, no MiniMax key and no OpenAI key on this box,
phase 1 spends zero, and Chatterbox cannot run here at all. Every claim below carries the URL that
established it, and where a vendor will not say, this document says that the vendor will not say.

---

## The headline

**Exactly one of the four candidates admits to Welsh, and it admits to it on borrowed evidence.**

OpenAI names Welsh in its supported-language list. It is the only one that does. But the same
sentence that names it says the list is inherited from **Whisper** — a speech-*recognition* model —
and that the voices are "optimized for English". Being able to transcribe Welsh is not evidence of
being able to speak it. So the honest reading is: OpenAI clears gate zero on paper, and the real
gate is a Welsh speaker listening to a clip.

The other three exclude Welsh from **closed, enumerated** language lists. That is an explicit
absence, not an omission, and it makes all three **dead as stock-Welsh providers**. They stay alive
only on one question that no vendor document can answer:

> **Does zero-shot cloning generalise to a language the model does not list?**

That is an empirical question for phase 2, and it is the same question for all three. It is also the
only route to the dialect problem, because **no vendor addresses north versus south Welsh and none
ever will**. Aran is north, Catrin is south, and no supported-language list will ever have that
distinction in it. The only mechanism that can carry it is a clone or a fine-tune, where the dialect
lives in the speaker's own audio rather than in a vendor's language pack. Chatterbox, being
fine-tunable on weights we hold, has the strongest version of that story; the hosted cloners have
the weakest.

---

## Coverage table — Welsh first

| | **Cartesia Sonic** | **Chatterbox (OSS)** | **MiniMax Speech** | **OpenAI TTS** |
|---|---|---|---|---|
| **WELSH (cym)** | **absent** — not in the closed 42 | **absent** — not in the closed 23 | **absent** — not in the closed 41 | **listed** — named explicitly |
| **Gate zero** | **CONDITIONAL** | **CONDITIONAL** | **CONDITIONAL** | **SURVIVES** |
| Welsh confidence | high (that it's absent) | high (that it's absent) | high (that it's absent) | medium (that it works) |
| Coverage of 68 SSi languages | 33 | 22 | 33 | **45** |
| Coverage of the 11 xAI-scope languages | 10 / 11 | 10 / 11 | 10 / 11 | 10 / 11 |
| Dated snapshot pinning | **yes**, but snapshots get sunset | **N/A — we hold the weights** | no dated snapshots | **yes**, plus a written notice policy |
| Deprecation policy in writing | dates published, no notice floor | none needed | **none at all** | **≥6 months, GA models** |
| Consent mechanism | terms clause only | none needed — self-hosted | **none at all** | **first-class consent API** |
| Seed | no | **yes, via local inference** | no | no |
| Temperature | no | **yes, via local inference** | no | no |
| Pronunciation override | **IPA + dictionaries + SSML** | **none** | dictionary | **none** (prose only) |
| Self-host | no | **yes, MIT** | no | no |
| Price, order of magnitude | ~$30 / M chars | GPU cost only | ~$100 / M chars (HD, *unverified*) | ~$0.015 / min (~$15/hr) |
| Concurrency / rate ceiling | 15 concurrent (Scale) | **unbounded — our hardware** | 10–800 RPM by tier | 500–10,000 RPM by tier |

**All four cover 10 of the 11 xAI-scope languages.** The missing one is **pdc** (Pennsylvania
Dutch), and it is missing everywhere — said once here rather than repeated four times. So on the
actual migration scope the four are indistinguishable, and gate zero is decided entirely on Welsh,
repeatability and consent.

**Twenty of the 68 target codes are covered by none of the four** (`zzz` is the test placeholder, so
nineteen real languages): bre, cor, eus, fur, gla, gle, hak, lmo, mlt, nan, nap, rgn, roh, scn, sme,
vec, yid, yor — plus pdc. That is the whole minority-language tail of the estate, **including both
Basque courses** and Irish, Cornish, Breton and Scottish Gaelic. No candidate is the estate's single
answer. Twenty-one languages are covered by all four.

---

## Cartesia Sonic — CONDITIONAL

**Welsh: absent.** The Sonic 3.5 docs enumerate a closed 42-language list; Welsh is not in it. The
marketing page says "40+ languages" without enumerating and does not name Welsh either. The API's
`language` field takes an ISO code from that list, so there is no `cy` to pass.

**Why it stays conditional.** Cartesia's own cloning guide says "if you want the cloned voice to
speak Spanish, speak Spanish in the recording" — the clone inherits the reference language. Whether
that extends to a language with no enum value is exactly the unanswered question. Phase-2 probe:
clone Aran from ~10s of north-Welsh audio, render 20 Welsh course seeds, have a Welsh speaker judge.

**Version pinning — the best of the hosted three on paper, and not open-ended.** Three model-id
forms: an immutable dated snapshot (`sonic-3.5-2026-05-04`, documented as "immutable for production
evals"), a floating alias, and a preview. So we can pin, and we would. But the api-changes page is
blunt: snapshots get sunset. `sonic`/`sonic-english`/`sonic-multilingual` died 2026-06-01;
`sonic-2`, `sonic-turbo` and a `sonic-3` snapshot die 2026-10-20; "Requests to sunsetted models will
return an error." Observed lifetime 8–17 months. **That is a re-render cliff, not drift.** A cliff is
at least loud — better than silent drift, worse than Azure.

**Consent — read this bit.** Cartesia publishes no consent workflow: no consent recording, no
verification, no approval. The only obligation is a terms clause forbidding cloning "any other
person's voice without that person's express permission" — enforcement is entirely on us. And the
thing to put in front of Aran before he records anything: **by default Cartesia uses inputs and
outputs "to train, enhance, evolve and improve its machine learning models."** There is an opt-out
form. Given why this project exists, filing that opt-out is a precondition of any Cartesia contract,
not an afterthought. Audio needed: 10s instant clone, or 30+ minutes (2 hours preferred) professional.

**Controls.** No seed, no temperature. `generation_config` gives volume, speed and 50+ emotions.
Pronunciation is its strongest suit and the best of the four: server-side pronunciation dictionaries
created via API, applied per request, accepting IPA or "sounds-like" spellings, plus SSML and
text-normalisation controls. For course work — where a word must be said one exact way — that matters.

---

## Resemble: Chatterbox (open source) and Resemble Ultra (hosted) — two different verdicts

These are two products and they land in opposite places. Reporting them as one thing would be wrong.

### Resemble Ultra, the hosted platform: DEAD — and not on Welsh

It dies on repeatability, before Welsh is even reached. The docs say models **cannot be pinned** —
"the synthesis API automatically uses the model associated with your `voice_uuid`, so you do not need
to select a model in the request" — and that **"All previous Resemble text-to-speech models have
reached end of life"**, with older voices unable to generate at all until upgraded to Resemble Ultra.
No notice period is published. A provider that has already force-migrated every existing voice and
offers no version to name cannot deliver near-Azure repeatability by construction. Welsh is moot; the
hosted platform's "100 languages and regional dialects" claim is unenumerated anyway, so Welsh there
is *unstated* rather than absent — and an unenumerated marketing number is not evidence.

### Chatterbox, the open-source model: CONDITIONAL — and the most interesting one here

**Welsh: absent** from the closed 23-language list, and language is a required tagged input.
But Chatterbox is the one candidate where **Welsh is not a permission we ask for — it is an
engineering job we can do.** The weights are MIT-licensed and downloadable. Two routes: zero-shot
clone with the language tag set to a phonetically nearby listed language, or genuinely **fine-tune on
Aran's and Catrin's existing human recordings**, of which we already hold hundreds across two
300-seed live courses.

That second route is the best answer anyone has to the dialect question. Train on Aran, get north
Welsh. Train on Catrin, get south Welsh. The dialect is in the training data, not in a vendor's
language pack, and no vendor has to have heard of the distinction.

**Pinning is better than Azure, not merely near it** — because it stops being a vendor promise and
becomes a file we hold. A checkpoint plus a pinned inference stack plus a fixed seed reproduces
indefinitely, and nobody can sunset it.

**Consent is the cleanest of the four.** Nothing to sign, no third party, audio never leaves our
infrastructure. We are moving off xAI precisely so Aran's voice does not feed someone else's model —
self-hosted Chatterbox is the only shortlisted option where that is *structurally* guaranteed rather
than promised. Two things Aran and Catrin should still be told: every output carries an inaudible
Perth watermark (permanent, and a feature), and we would hold the weights of their voice
indefinitely, so deletion-on-request belongs in the conversation.

**The weaknesses are real.** No pronunciation override of any kind — no lexicon, no IPA, no SSML. For
a course that teaches pronunciation, that is a genuine functional gap the hosted vendors do not have.
And Resemble publishes two mutually contradictory "23 languages" lists (GitHub says Malay, Greek,
Chinese; the marketing page says Slovak, Vietnamese, Mandarin). GitHub is treated as authoritative
here; the contradiction is unresolved.

---

## MiniMax Speech — CONDITIONAL

**Welsh: absent** from the closed 41-value `language_boost` enum, and absent from the Speech 2.5
launch post's list of added languages.

**One wrinkle in its favour, one against.** In favour: `language_boost` accepts `auto`, so unlike a
hard language field there is a documented way to submit text without asserting a language — exactly
the shape a Welsh probe needs. And MiniMax's cross-lingual cloning claim is the most aggressive of
the four: "cross-lingual cloning is no longer a challenge." Against: that is a launch-post assertion
with no benchmark behind it, and `auto` detection on a language the model never saw will most likely
fall back to English phonetics and produce Welsh with an English mouth.

**Version pinning is de facto, not policy, and the distinction matters.** Eight model ids are
simultaneously live — `speech-2.8-hd` down to `speech-01-turbo` — and `model` is an explicit request
parameter, so old generations stay callable. `speech-01` still answering while 2.8 ships is the best
empirical longevity signal any of the four gives. But there are **no dated snapshots**, so
`speech-2.8-hd` is a floating name MiniMax can retrain underneath us without changing the identifier
and without announcing it, and **no deprecation policy, notice period or stability guarantee exists
anywhere in the documentation**. Probably stable; provably nothing. For a system whose entire
requirement is that next year's re-render sounds like the same person, "probably" is the wrong word.

**Consent: none. At all.** No consent requirement, no verification, no statement about the right to
clone another person's voice appears anywhere in the cloning documentation. Of the four this is the
only one with *no* consent obligation, and that should read as a risk rather than as convenience.
Technically it wants 10s–5min of audio, mp3/m4a/wav, ≤20 MB. **What to tell Aran and Catrin: MiniMax
will not ask them for anything.** No form, no recording, no identity check — we upload audio and a
voice exists. The consent record would be entirely ours to create and keep. They should also be told
their voice would go to a Chinese-platform API whose terms on training-data reuse and voice deletion
I could not verify from the documentation. Given why this project exists, that unverified position is
a substantive objection, not a paperwork gap.

**Controls.** No seed, no temperature. `voice_setting` gives speed, volume, pitch and nine emotions.
A pronunciation dictionary exists, which puts it ahead of Chatterbox and level with Cartesia.

---

## OpenAI TTS + Custom Voices — SURVIVES

**Welsh: listed.** The list ends "…Turkish, Ukrainian, Urdu, Vietnamese, and **Welsh**". The only
candidate that names it.

**And now the caveat, because it is the finding rather than a footnote.** The same page says "The TTS
model generally follows the Whisper model in terms of language support" and introduces the list as
performing well "*despite voices being optimized for English*". That is a **speech-recognition**
language list borrowed for a synthesis product. The realistic expectation is intelligible Welsh
spoken with an anglophone accent — and for a course whose learners take their pronunciation *from
these clips*, that is closer to a disqualification than to a blemish. OpenAI clears gate zero on
paper. A Welsh speaker with headphones decides whether it clears it in fact.

**Pinning: the best written position of the four.** Dated snapshots are real and callable —
`gpt-4o-mini-tts-2025-03-20` and `gpt-4o-mini-tts-2025-12-15` — and the March snapshot still
answering nine months after a newer default shipped is evidence the pins are honoured. Behind it sits
an actual published policy: **≥6 months notice for GA models**, ≥3 for specialised variants, as
little as 2 weeks for previews, with safety able to accelerate. No TTS model currently carries a
deprecation notice. What still does not exist — anywhere, at any vendor — is a written guarantee that
the same text plus voice plus version renders identically next year. A pinned snapshot plus a
6-month notice floor is the closest thing on the market to Azure's behaviour, and it is still a
notice period rather than a determinism promise.

**Consent: the only real mechanism of the four.** Consent is a first-class API resource with
create/retrieve/update/list endpoints, and a custom voice **cannot** be created without referencing a
previously uploaded consent recording id.

> **Words Tom could forward to Aran and Catrin.** OpenAI will not let us create your voice unless you
> personally record a short consent statement. You read one specific approved phrase, word for word —
> any deviation from the script and the upload is rejected. The approved phrases are published in
> sixteen languages and Welsh is not one of them, so you would record it in English. Separately you
> give us a voice sample of 30 seconds or less (mpeg, wav, ogg, aac, flac, webm or mp4, up to 10 MiB),
> tagged with its language, e.g. `en-GB`. That is the whole ask: one scripted sentence and half a
> minute of speech. Our organisation can hold at most 20 custom voices in total, and the consent
> record stays on file and is retrievable and updatable — so withdrawing it has somewhere to live.

**The gating catch on that route:** Custom Voices are "limited to eligible customers" and sit behind a
sales conversation. It is not self-serve. Until Tom opens that conversation, the entire OpenAI clone
route is theoretical — **this is the single clearest action item in this slice**.

**Controls are its weakest axis.** No seed, no temperature. No pronunciation dictionary, no IPA, no
phoneme tags, no SSML — the only lever is `instructions`, free-text prose steering "accent, emotional
range, intonation, impressions, speed of speech, tone, whispering". Powerful, and for our purposes
dangerous: a natural-language control has no version, and nothing guarantees the same instruction
string maps to the same delivery after a model update. It is the opposite of repeatability. If we
use it at all, pin the exact string and treat it as content.

---

## Verdicts

| Candidate | Verdict | The one sentence |
|---|---|---|
| **OpenAI TTS** | **SURVIVES** | The only one that names Welsh, with the best pinning and the only real consent mechanism — but the Welsh claim is borrowed from an ASR model, the voices are admittedly English-optimised, and Custom Voices are locked behind a sales call. |
| **Chatterbox (OSS)** | **CONDITIONAL** on hardware | No Welsh in the list, but MIT weights make Welsh an engineering job rather than a vendor's permission, gives the best dialect story and the best repeatability story of all four — and cannot be touched from this box. |
| **Cartesia Sonic** | **CONDITIONAL** on a clone probe | Dead on stock Welsh; strong pinning with a sunset cliff, the best pronunciation controls, cheapest of the hosted three — and it will train on Aran's voice by default unless we opt out. |
| **MiniMax Speech** | **CONDITIONAL** on a clone probe | Dead on stock Welsh; the boldest cross-lingual cloning claim with nothing behind it, no dated snapshots, no deprecation policy and no consent mechanism whatsoever. |

**Ranked for phase 2, on gate zero alone:** OpenAI first (only documented Welsh, and the consent
conversation must start now because it is slow). Chatterbox second (highest ceiling, but blocked on a
GPU, and free to evaluate once one exists). Cartesia third (best hosted engineering, needs the clone
probe and an opt-out filed). MiniMax fourth (best raw clone reputation, worst governance story, and
the governance story is *why this project exists*).

Resemble's hosted platform should come **off** the list.

---

## GAPS

Reported as gaps rather than papered over.

**Credentials — nothing was measured.** No Cartesia key, no MiniMax key, no OpenAI key on this box.
Expected; Tom is signing up. Every figure in this document is documentation, not observation. No
audio was generated, by anyone, for any candidate.

**Hardware — the biggest blocker in this slice.** watson-1 has **no GPU** (Virtio paravirtual display
only, no CUDA, no `nvidia-smi`), and Python 3.14.4 has **no pip, no ensurepip, no torch, no numpy**;
`venv` works but cannot bootstrap packages. **Chatterbox is the one candidate whose evaluation costs
nothing, and it is the one candidate we are hardware-blocked from touching.** That needs a GPU box,
not a budget.

**Welsh is unheard.** Four vendors, zero seconds of Welsh audio. Three of the four exclude it from a
closed list, and the fourth's claim is inherited from a recognition model. The whole gate turns on a
listening test nobody has run.

**North/south Welsh is addressed by nobody.** No vendor has the concept. The only mechanism is
cloning or fine-tuning from Aran's and Catrin's own audio, and whether that carries dialect is
untested at every candidate.

**Basque and the minority tail.** Nineteen real target languages are covered by **none** of the four:
bre, cor, **eus**, fur, gla, gle, hak, lmo, mlt, nan, nap, pdc, rgn, roh, scn, sme, vec, yid, yor.
Both Basque courses and Irish, Cornish, Breton and Scottish Gaelic are in that list. No single
candidate is the estate's answer, and this slice's brief did not ask what covers them — it is an
open question for whoever holds the estate-wide plan.

**MiniMax pricing is not vendor-verified.** The official pricing page publishes subscription tiers
but **no per-character rate and no clone cost**. The ~$100/M (HD) and ~$60/M (Turbo) figures in
circulation are third-party and are labelled as such throughout. MiniMax TPM ceilings are undocumented
— only the error code exists — so a bulk re-render cannot be sized from published information.

**Resemble's hosted per-character pricing** was not found on any documentation page and is
deliberately not quoted.

**Resemble contradicts itself** on which 23 languages Chatterbox supports. GitHub is treated as
authoritative; unresolved.

**Cartesia's docs are auth-walled** on the versioned HTML paths. The `.md` suffix serves them
publicly and is what was used. Anything reachable only through the auth-walled route was not read.

**Cartesia's default is to train on our data.** The opt-out is a form, not an API flag, and whether
it applies retroactively is unverified.

**MiniMax's cloning terms** — training reuse, voice deletion, ownership — could not be verified from
documentation at all.

**No candidate exposes a seed**, except Chatterbox via local inference. Run-to-run variation is
therefore unmeasurable from the API surface at Cartesia, MiniMax and OpenAI; only repeated paid
renders would show it. Phase-2 item, and it bears directly on axis E.

**OpenAI Custom Voices eligibility** — whether SSi qualifies, what it costs, how long approval takes
— is entirely unknown and requires a sales conversation to find out.

---

*Slice: `gz-candidates`. Sources are recorded per claim in the four `coverage-*.json` files.*
