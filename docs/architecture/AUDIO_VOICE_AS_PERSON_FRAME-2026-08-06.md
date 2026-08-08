# Audio: what changes when a voice is a person

**2026-08-06 · Fable · frame document, not a design.** This is the independent first-principles
think Tom asked for by name. It is written to be held in one hand while a design document sits in
the other: every numbered proposition below is checkable — a design either honours it, violates it,
or is silent on it, and silence is a finding too. Nothing here is an implementation plan, a schema,
or a migration sequence; those belong to the workers building the concrete designs.

**Settled ground this document stands on and does not re-open:** clip identity is
(language, text, voice); speed is entirely a player concern; German and French are the first two
test cases; xAI is the preferred provider on quality grounds; the long-term target is SSi staff
clones as all the voices, multilingual where capable; Tom's own clone `gfzdpspr5fdp` is the first
VOICELAB test.

---

## The premise flip

Everything the current estate believes about audio rests on one quiet assumption: **a voice is a
provider's synthetic, locale-bound asset, named by a string.** `en-GB-SoniaNeural` is a voice. A
"German female voice" is a configuration value. When that is what a voice is, then:

- a wrong voice on a clip is just a wrong string in a column, and nothing in the system can *hear*
  that it is wrong — on 2026-08-05, 150 English prompts in `fra_for_eng` were found being read by
  French voices, live, learner-facing, and the existing repair tool proposed **2** of them because
  its selector only recognised a wrong *provider*, not a wrong *identity*
  (`docs/overnight-audio-2026-08-05/fra-wrong-known-voice-2026-08-05.md`);
- "the same voice in another language" is a category error — Sonia does not exist in German;
- consistency means "the same config string was used", and nothing more.

Tom's premise is the opposite: **a voice is a person.** SSi staff, cloned, as all the voices; one
person's clone used across several languages where it is capable; the same colleague recognisably
present in a learner's German course and their French course. Under that premise a voice has an
identity that exists *before and outside* any provider, any language, and any rendering — and a
large amount of settled-looking engineering silently becomes an open question.

This document works out which questions open, and what any answer has to satisfy.

One more piece of ground truth before the propositions: **the estate has already met this problem
and answered it halfway, twice.**

1. The human voice engine mints `human_{email}_{targetlang}` voice ids per person *per course
   target language*, and `dashboard_users.voice_id` is a single column that mirrors only the
   latest mint — the code itself documents that a recorder assigned on two courses "no longer
   matches the first course's slot by voice_id alone" (`services/voice-engine/voice-slots.cjs`).
   The person is already trying to be the unit; the identifier scheme keeps cutting them into
   per-language fragments.
2. Tom's clone is already cast: it narrates every `pod_explainer`
   (`services/production-api.cjs`, `EXPLAINER_VOICE_ID = 'gfzdpspr5fdp'`, hardcoded), it is the
   ruled known-side presentation voice for English-known courses
   (`docs/presentation-authoring-redesign.md`), and it appears as a pod character in French. It is
   the most person-like voice in the estate, and the estate stores it as a bare provider string in
   at least three unrelated places.

The frame is not hypothetical. It is a description of pressure the estate is already under.

---

## 1 · Identity: person, clone, rendering — three things, not one

**P1. A person, a clone, and a rendering are three different things, and a design must not let one
identifier stand for more than one of them.**
The *person* is Tom, or Maria — an identity that exists independent of any provider. The *clone*
is a trained model held at a provider — `gfzdpspr5fdp` is a clone id, an xAI asset, an attribute
of Tom's voice-identity and not the identity itself. The *rendering* is bytes, addressed by their
content in the store design now landing. A design honours this proposition if you can point at
where each of the three lives and the pointers run person → clone → rendering, never sideways or
backwards. It violates it if a provider clone id is the primary key of anything except the
provider-resolution layer. **Design test: can the system answer "who is speaking on this clip?"
without asking a provider?** Today it cannot — the answer to "who is `gfzdpspr5fdp`?" lives in
code comments and Tom's memory.

**P2. "Voice" in the settled clip key (language, text, voice) must resolve to a person-owned
identity, of which the provider clone id is one attribute.**
The settled ruling stands untouched: different narrators are distinct clips. This proposition only
fixes what the third element *is*. If "voice" in the key is a raw provider id, then a provider
move, or a re-clone of the same person, silently makes every existing clip belong to "a different
voice" — the store would say Maria-on-xAI and Maria-on-successor are strangers, which is false at
the level the product cares about. If "voice" is the person-owned identity (carrying its
clone-version, see P3), the key stays exactly as ruled and survives the premise flip.

**P3. A re-trained or improved clone is a new *version* of the same voice, and versions must be
visible — never a new voice, never invisible.**
The three candidate answers in the commission's question resolve cleanly: *new voice* is wrong
because it breaks the person's continuity across a learner's journey (the whole point of the
premise); *invisible* is wrong because it recreates, at the voice layer, exactly the bug the
content-addressed store just killed at the byte layer — a change nothing downstream can detect.
That leaves *versioned identity*: the voice is (person, clone-version). A clone-version change is
an event: it is recorded, it re-opens every capability verdict that version earned (P18), and
re-renders under the new version are visible as such. A design that lets a provider retrain a
clone under the same id with nothing in SSi's records changing violates this proposition.

**P4. Per-language capability is a fact about a clone-version, established by evidence, dated —
never a property of the person and never an assumption.**
"Tom's voice is capable in a few non-English languages" and "the clone needs priming to render
target languages reliably — piloted and REJECTED 2026-07-05"
(`docs/presentation-authoring-redesign.md`) are both in the estate right now, about the same clone.
Neither is wrong: capability changes as clones improve, and both were honest readings at their
dates. The proposition is that a design must store capability as *evidence with a date and a
method*, attached to a clone-version, re-openable — not as a boolean on a voice row and not as
tribal knowledge. This is the fact-class VOICELAB exists to manufacture (P18).

**P5. Person identity is global; the per-course-language mint is the wrong shape and must not be
carried forward.**
`human_maria_mkd` makes the language part of *who Maria is*. Under the person model Maria is one
identity; `mkd` is a capability attribute of her clone. Any design that mints or keys identity per
(person × course) or (person × language) — including by inheriting the existing `voice-slots.cjs`
scheme — violates the premise at its root, because cross-course recognisability (P7) is
unbuildable on fragmented identity. The existing mints are a migration fact to absorb, not a
pattern to extend.

---

## 2 · Casting: who speaks, decided in one place

**P6. Casting is a first-class, named, inspectable act: a course has a cast, the cast assigns
persons to roles, and every voice on every clip must be *explainable by the cast*.**
The fra incident is the proof of necessity: the pod builder took the known-side voice from
whichever character the target line used, because "who speaks the known side" existed nowhere as a
stated fact — only as an emergent property of per-row strings. 150 clips drifted, and the sweep
that found them had to encode the casting policy in a one-off query because the system had no
casting record to check against. The check a design must support: for any clip, (course, role) →
cast → person → clone-version → provider id, every arrow readable. A voice on a row that the cast
cannot explain is drift *by definition* — today's estate has 200 course-sides carrying more than
two voices (`AUDIO_PIPELINE_CONTENT_ADDRESSED_DESIGN-2026-08-06.md`) and no way to say which of
them are choices.
Note what this proposition deliberately does **not** say: it does not say one voice per side. Pods
are deliberate multi-speaker casting — the 2026-08-04 German ruling (known side is the narrator's,
target side is the cast's) is a *casting rule*, and a blanket voice sweep that ignored it would
have collapsed cast dialogues into one speaker. Casting must be able to express an ensemble; it
must not be able to be bypassed.

**P7. The same person in two courses is the same cast member, recognisably — cross-course
presence is a product feature and it is only buildable on global identity.**
A learner who moves from the German course to the French course and hears the same colleague is
experiencing the community (P9) through the audio channel. This costs nothing extra under P5 and
is impossible without it. A design honours it if "which courses does Aran appear in?" is one
query; it violates it if answering requires joining per-course configs on a human's memory of
which ids are the same person.

**P8. The known-side narrator is a cast member, not furniture.**
The estate's default cast is two-people-in-a-kitchen, and the temptation is to treat the known
voice as "the system's voice" while only target voices are people. The fra and deu incidents both
happened *on the known side*, and Tom's own clone is already the ruled known-side presentation
voice — the narrator is the person the learner spends the most hours with. Casting covers every
role, known included.

---

## 3 · Community: what staff voices promise, and what they cost

**P9. Staff voices convert the audio channel into a community channel, and that creates a promise
the product must be able to keep: the person is real, and the learner can in principle meet them.**
This is the upside and it is genuinely large — SSi's product is a community as much as a method,
and "the voice teaching you German is Aran, who runs the forum thread you post in" is something no
TTS locale voice can ever be. But the promise has a truthfulness edge: the person did not actually
read the learner's 40,000 clips. The clone did. The frame requirement is honesty about that
boundary: the person *lends their voice*; they do not author or endorse each utterance. A design
(or the product copy above it) that lets a learner believe Maria personally recorded a sentence
Maria has never seen is trading on the community promise falsely — and one bad rendered sentence
in a real person's voice ("Maria said something garbled/offensive to me") lands on *Maria*, not on
a config string. Consequence: some disclosure, at the product level, that voices are cloned with
the person's consent; and the fidelity gates (P12) protect a *person's reputation*, not just a
course's polish. Where exactly disclosure lives is a taste call for Tom; *that* it exists is
frame.

**P10. A departure must cost the company a decision, not cost the course its voice — and the
decision must have been made before it is needed.**
When a member of staff leaves, three separate things could happen to their voice: existing clips
keep playing; new renders continue in their clone; their clone is retired and a recast happens.
Which of these is permitted is a *consent and contract fact* (P14) decided at cloning time, not a
scramble at leaving time. And whichever is chosen, make-before-break applies to persons exactly as
it applies to clips (`AUDIO_PIPELINE_ARCHITECTURE.md` §6b): a recast generates and verifies the
replacement across the course before the departed person's clips are unlinked. Never a silent
gap; never a course that goes quiet because someone resigned. A design honours this if the
departure paths are enumerable in it; it violates it if departure is unmentioned — because the
current estate's answer, inherited by default, is "their voice id keeps rendering forever and
nobody ever decided that".

---

## 4 · Consistency and fidelity: what the words mean once a voice is a person

Under the TTS-locale model, consistency meant one thing: the same config string was used
everywhere. Under the person model it splits into three separate, separately-checkable claims — a
design that says "consistent" without saying which of these it means is hiding behind the old
word.

**P11. Within-course consistency = one clone-version per cast seat per course, pinned.**
Every clip Maria speaks in the German course comes from the same clone-version, so seed 1 and
seed 600, rendered months apart, are the same voice at the same fidelity. Re-renders of individual
clips (repairs, text fixes) use the *pinned* version, not "whatever the provider serves today".
When the pin moves (an upgrade), that is a version event under P3 — deliberate, recorded, and its
blast radius (which clips now sound subtly different from their neighbours) is stated, not
discovered. The content-addressed store makes byte-changes visible; this proposition makes
*voice*-changes deliberate.

**P12. Cross-language consistency = the person is recognisably themself in each language they are
cast in — and this is a perceptual claim that only a listening instrument can verify.**
This is the genuinely new meaning, with no TTS-era counterpart. If Tom's clone speaks French and a
learner who knows him cannot tell it is him, the multilingual-person premise has failed *for that
pairing* even if the French is impeccable. Recognisability across languages is precisely what
"SSi staff clones, multilingual where capable" buys — lose it and the model quietly degrades back
to anonymous per-language voices with extra steps. No automated gate measures this today (the
prosody work found melody is voice-dominated — that is the *problem* stated as a finding); it is
ear-work, which is to say VOICELAB-work (P18).

**P13. Fidelity is to the person, not to a locale standard — with an intelligibility floor
underneath it.**
The TTS-era question was "does this sound like good German?" The person-era question is "does this
sound like *this person* speaking German?" — and those diverge exactly where it matters: accent.
A real colleague speaking German with a Welsh accent is identity, not defect; sanding it off to
locale-neutral perfection destroys the thing being bought. But underneath sits a floor that is not
negotiable: **the learner is acquiring the target language from these clips, so the target-side
rendering must be a sound model to copy** — pronunciation the learner can safely imitate, at
minimum fully intelligible to native listeners. Above the floor, accent is the person's; below it,
charm is irrelevant and the person is not castable in that language (that verdict is P4 evidence,
made in VOICELAB). Where the floor sits exactly — "native-passing" versus "clearly intelligible,
charmingly accented" — is a taste ruling this document flags for Tom rather than invents, because
it is a *method* question: what may the model in the learner's ear sound like? My position, held:
known-side and presentation roles need only the intelligibility floor; **target-side roles need a
stricter bar, because every target clip is implicitly a pronunciation exemplar.** A design that
applies one fidelity bar to all roles is ignoring what the roles are for.

---

## 5 · Rights and consent: first-class frame, not an appendix

Plainly first: **a real lawyer is needed here**, on employment law, voice/biometric-data law
across the jurisdictions SSi's staff live in, and the actual xAI cloning terms. Nothing below is
legal advice; it is the shape the *right* answer has to have, whatever the legal instrument turns
out to be.

**P14. Consent is scoped, recorded, and machine-checkable — a blanket "we may clone your voice"
is insufficient in principle, whatever a lawyer says about its sufficiency in law.**
The scopes that the person-voice model actually exercises, each of which a person could
reasonably grant or refuse independently: cloning at a named provider; rendering in languages the
person speaks; rendering in languages the person does **not** speak (they cannot review what
"they" are saying — qualitatively different consent); commercial use in courses; use in new
courses created after signing; retraining/improvement of the clone; and continuation after
departure, per path in P10. The frame requirement with teeth: **consent is data the pipeline can
check.** The estate already refuses to render vocabulary a learner has not been given; the same
reflex applies — a render request for (person, language) with no consent record covering that
scope is refused at the same layer that enforces casting (P6). Consent that lives in a drawer in
HR cannot do that; consent that is a record with scopes and dates can. A design honours this if
the render path has a place where such a check *could* sit; it violates it if consent is assumed
to be somebody else's process entirely.

**P15. The consent asymmetry must be faced at signing time: the company is building a durable
asset out of an employee's body, under an employment power imbalance.**
A staff member asked "can we clone your voice?" by their employer is not freely bargaining. The
principled shape: granting is genuinely optional with no career consequence; scopes are explicit
(P14); there is something in it for the person (recognition or remuneration — taste call for
Tom); and there is a revocation story agreed upfront — which of the P10 paths a leaver, or a
staying-but-changed-mind staff member, can trigger. This is where the lawyer earns their fee; the
frame's demand is only that the deal is *explicit and symmetric enough to be worn publicly*,
because under P9 the deal *is* public — the community will know whose voices these are, and will
ask.

**P16. Voice data is biometric-adjacent, and erasure rights collide head-on with the immutable
store — name the collision now, in the design, not later, in a dispute.**
The content-addressed store's doctrine is never-delete, and it is right, for artefacts. A person's
voice may carry a legal right to erasure that overrides architecture. The honest reconciliation,
stated as frame: **immutability is a promise about integrity (bytes never change behind a name),
not a promise against removal (a name may cease to resolve).** A design honours this if
removing every rendering of one person is a bounded, enumerable operation — which, note, casting
(P6) gives for free: the cast record *is* the enumeration. It violates this if "delete everything
in Maria's voice" requires a forensic sweep. Whether and when such removal is ever obligatory is
the lawyer's question; that it must be *possible and bounded* is the architect's, and it is
cheap now and expensive later.

---

## 6 · Provider: depending on someone else for your colleagues' identities

xAI on quality is Tom's call and is not re-litigated here. The frame question is what *kind* of
dependency the clone model creates, because it is a new kind: the provider no longer renders your
audio, it **holds your people's voices.**

**P17. SSi must own, hold, and archive the training corpus for every staff voice — the person's
original recordings, provider-independent — so that the clone is always re-creatable.**
Sort everything into portable versus captive. Portable: the person (they work here), their
original training recordings (if SSi keeps them), the consent records, every rendered clip in the
store (SSi's S3), and the VOICELAB evidence corpus. Captive: the clone weights and the provider
voice id — `gfzdpspr5fdp` names something that lives at xAI and cannot leave. The survivability
test a design must pass: **"xAI vanishes tomorrow — what is lost?" The only acceptable answer is
"render capacity, until we re-clone from our own corpus and re-verify capability in VOICELAB."**
Any answer containing "the voices themselves" means the company's cast is a tenant of a supplier.
This proposition is cheap precisely once: at cloning time, keep the tapes. It is unpayable later
if the tapes were never kept. *Explicit gap: I have not read xAI's cloning terms — whether they
permit export of clone weights, whether they claim rights in the clone, and what happens to it on
contract end are unknowns this document flags rather than guesses; the lawyer reads those terms
alongside P14–P16.*

**P18 (numbered here, stated for casting and identity): provider voice ids appear in exactly one
place — the resolution layer — and nowhere else.**
`EXPLAINER_VOICE_ID = 'gfzdpspr5fdp'` hardcoded in `production-api.cjs` is the anti-pattern in
one line: a casting fact (Tom narrates explainers) fused with a resolution fact (his clone's xAI
id) and buried in service code. Under P1/P6 that line becomes "the explainer seat is cast to Tom"
in the cast record, and the id lives only where person → clone-version → provider id resolves. A
design is checkable here by grep: provider ids outside the resolution layer are violations.

---

## 7 · The LABs: what a LAB is, and what only VOICELAB can settle

Watson's reading — that the LAB pattern does for pipeline-implicit decisions what
content-addressing does for the store, pulling voice choice, listening pacing and speaking cadence
out into named, inspectable, versionable things — was to be tested, not assumed. Tested against
the two LABs that exist, it holds, and it is **incomplete**. Read `VadLab.vue` and `PodLab.vue`
and the pattern that actually recurs is sharper, four properties:

1. **It runs the live thing, verbatim.** PodLab composes arcs with the exact function the
   learner's flow runs, "no drift by construction". A LAB is not a mock-up of the pipeline; it is
   a window onto it.
2. **It never writes.** PodLab is "preview & export only" because config writes go global to every
   learner; VadLab is a private admin tool. The LAB produces a *proposal artefact* a human applies
   deliberately.
3. **It is an honest-science surface.** VadLab shows voice-dominated dimensions *as failures*,
   curates a deceptive pair on purpose, and carries confounds in the copy. A LAB that flatters is
   worthless.
4. **It puts Tom's ear and a measurement in the same room.** VadLab exists because a number
   (prosody distance) needed to be *heard* to be trusted or overruled. This is the property
   Watson's reading misses, and it is the load-bearing one: **a LAB is where taste is converted
   into evidence** — one ear-ruling, made against audible material, captured as a dated verdict
   the pipeline can then consume, instead of evaporating into a chat log.

**P19. A LAB is an instrument that produces rulings-as-data: it auditions the live system, writes
nothing directly, and its output is a named, dated, versioned artefact the pipeline consumes by
reference.**
This is also the make-or-break for the claim "if the LABs are right, the third language is just
configuration." That claim is true **only if** every LAB verdict lands as data — a capability
record, a listening config, a speaking config — that the pipeline reads. If VOICELAB verdicts land
as prose in dated docs (the estate's current habit: the 2026-07-05 clone rejection lives in a
bullet point of a redesign doc, where this week's re-opening of the same question could not see
it), then the third language is another archaeology project. A LAB design honours P19 if you can
point at the artefact it emits and the pipeline code that reads it; it violates P19 if its output
is a screen and a memory.

**P20. VOICELAB settles exactly one class of fact nothing else can: is (person, clone-version,
language, role-class) castable — at what fidelity, on whose ear, on what date, on which clips.**
Every other instrument fails at this. Whisper transcription passes wrong-voiced clips verbatim
(the fra English-in-French clips *transcribe perfectly*). The acoustic gates check bytes, not
identity. The prosody work measured itself honestly into the conclusion that voice-identity
dominates its features. Docs rot. Only a listening room where the right ears audition the right
clips against a stated question can produce the capability facts P4 requires — including the
recognisability facts P12 requires, which need ears that *know the person*. The founding case is
already on the books: `gfzdpspr5fdp` cross-language, REJECTED 2026-07-05 on an ear test, believed
capable 2026-08-06, and the honest current answer is "the 07-05 verdict is thirteen months of
clone-improvement stale — re-run it." That re-run is VOICELAB's first sitting, and its output
should be the first capability record in the estate. (Its renders are TTS spend and sit behind
Tom's approval like all spend — a LAB has no special licence to render.)

**P21. Listening-LABs and speaking-LABs are the same pattern pointed at configs rather than
capabilities — and their prerequisite is that pacing and cadence become named config the pipeline
reads.**
Pod pacing already lives this way (`algorithm_config`, which is exactly why PodLab could be built
as export-only). Wherever listening pacing or speaking cadence still lives as constants inside
pipeline code, a LAB cannot audition it — the pattern's precondition is the extraction Watson
named. So the frame ordering for any LAB proposal: first show the named config artefact the LAB
would tune, then build the room. A "LAB" proposed for something that has no config artefact is a
dashboard, not a LAB.

---

## 8 · How to use this document

Hold a design in the other hand and walk the propositions: P1–P5 (identity), P6–P8 (casting),
P9–P10 (community), P11–P13 (consistency and fidelity), P14–P16 (rights), P17–P18 (provider),
P19–P21 (LABs). For each: honoured, violated, or silent — and where silent, the design owes a
sentence, because every proposition above is load-bearing for the premise Tom has set. Two
worked examples of the checking move, so the method is unambiguous:

- *The content-addressed store design* keys clips on (language, text, voice) with "voice" as an
  id. Against P2/P3: honoured **if** that id resolves through a person-owned identity carrying
  clone-version; violated if it is a raw provider string, because a re-clone then shatters clip
  identity. The store design is currently *silent* on which — one sentence fixes it.
- *The pipeline redesign's step 2* ("each course side has exactly one voice, declared on the
  course") — against P6: honours the spirit (casting as a declared fact, drift as deviation) but
  as stated it cannot express a pod ensemble; it needs the cast, not a single voice, as the
  declared object.

**Explicit gaps in this document, stated per the honesty rule:** I did not query the live DB —
every number cited comes from estate documents dated 2026-08-05/06 and was cross-checked against
code where the code carries it; none of my propositions depends on a live count. I have not read
xAI's cloning terms (P17). I am not a lawyer and §5 says so. The fidelity floor's exact position
(P13) and the disclosure surface (P9) are flagged as Tom's taste calls, deliberately unfilled.
