# T-21 casting rulings — the per-language lock ledger

**Started 2026-08-17.** Tom is ruling T-21 (pod voice casting, 41 languages) **one language at a
time**, against the frozen listening doc <https://watson-1.tail4968cb.ts.net/d/afdcc743>.

This file is the running record. The next worker on the next language **appends here**.

## Standing rulings (do not re-ask)

1. **Each language locks independently.** An approved language has its pool locked, its approval
   recorded, and its render released **without waiting for the other forty**. Per-language state is
   first-class; that is what lets Tom keep ruling one at a time.
2. **Azure is an approved fallback provider lane** for ANY language Tom rejects at T-21. The next
   worker produces Azure candidate samples on the Arabic MSA pattern below, sample-first, **without a
   fresh approval round**.
3. **Sample-first.** A handful of throwaway clips for his ear. No bulk render before he rules.
4. **No click repair, no tail repair, ever.** Tom, 2026-08-17: *"we agreed that click artefacts where
   a result of our bad pipeline processing and removing clicks made them even worse - that's all the
   tail repair stuff we have since abolished"*. If a fresh render carries the end-of-clip click that
   job #800 is chasing: **stop and report it**, never patch it.
5. **Verify gender from real voice metadata before locking a pair.** Pods are one voice per gender by
   design, so a lock on a wrong label casts the whole course wrong. The listening doc's
   "In production now" gender labels are **known-defective** (see below) and are not evidence.
6. **Lock the pool FIRST, record the approval SECOND.** `tools/pod-approve-voices.cjs` fingerprints
   the live cast and self-invalidates when it moves; approving before the pool edit bakes in an
   approval against the wrong cast.
8. **RENDER HOLD — A-132, 2026-08-17.** The end-click fix candidate **FAILED Tom's ear**: only the
   original take is clean, and the compressor-removed render still clicks. **All bulk rendering of
   locked T-21 languages is PAUSED** until the click-diagnosis job reports a render Tom has passed by
   ear. Locking casts, label fixes and small sample/verification slices continue unaffected — it is
   *bulk clip production* that stops. This supersedes the earlier reading that Azure-cast languages
   were unaffected: the hold is on the render, not on a provider.
7. **Every lock carries its confidence.** A lock is either **ear-verified** (Tom listened and ruled)
   or **unverified** (locked to avoid churn, pending a native-speaker or learner listen). Tom cannot
   personally referee all 41 languages, so `unverified` is a normal, first-class state — not a
   deferral: an unverified language locks and renders like any other. The field is the durable
   mechanism that lets such a lock be revisited later without anyone having to remember it was
   unverified.

## The label defect (found 2026-08-17)

Across all 41 languages the listening doc's **"In production now" block carries 41 male and 0 female
labels**. A column that is 100% male across 41 languages is not a scatter of typos — the gender is a
constant/default in whatever generated the block, not a fact read per voice.

Tom independently confirmed two of those "male" production voices are female **by ear**:
**Alba** (Catalan) and **`ara`** (his pick for the Chinese female). The hypothesis is therefore
confirmed twice and is a defect to fix at its source, not eighty-two labels to patch.

Blast radius of the shared production voice ids, all labelled male in the doc:

| Voice id | Languages it appears in |
|---|---|
| `ara` | `ara`, `zho`, `dan`, `fra`, `hin`, `jpn`, `por_br`, `swe`, `tha`, `tur` (10) |
| `eve` | `ara_eg`, `ita`, `por`, `spa`, `spa_mx` (5) |
| `rex` | `ara_eg`, `por`, `spa_mx` (3) |

Eight of `ara`'s ten languages are ones Tom has **not yet listened to**. Until the label is fixed at
source, listening further means judging a female voice presented as the male candidate.

### The source record is already correct — the defect is in the READER

`tools/pod-voices-xai.json` has a `multilingual` block that already records the truth:

| voice_id | name | gender |
|---|---|---|
| `ara` | Ara | **f** |
| `eve` | Eve | **f** |
| `leo` | Leo | m |
| `rex` | Rex | m |
| `sal` | Sal | m |

**Do not "correct" this file — it is right.** Whatever generated the casting doc labelled all 41
production voices male and therefore was not reading this record at all. The fix is to find the
reader, not to rewrite the record.

Two leads: the doc prints **raw voice ids** for production entries (`0ih5oi34`, `jpi39icg`, `ara`)
but **friendly names** for official-pool entries (Mads, Astrid, Wei, Hui) — two inventories, two code
paths. And the doc's friendly names do not match `pod-voices-xai.json` at all (its `da` block is
Kasper/Lars/Ida, not Mads/Astrid; its `zh-CN` block is Jian/Hao/Xia, not Wei/Hui). `0ih5oi34` is
"Kasper", male, and `jpi39icg` is "Jian", male, in that file — consistent with the doc, which means
the male labels are **accidentally right**, not correctly derived.

`sal` is recorded male in that file but is genuinely **gender-neutral** in the cast metadata
elsewhere in this estate. Known, legitimate exception — not another bug.

**Footgun:** `ara` is simultaneously a **language code** (Arabic MSA) and an **xAI voice id**. Every
query, config key and log line that matches the bare string must say which namespace it means. Also
`eve`/`xai_eve` are ONE voice — match bare AND `xai_`-prefixed spellings or you silently miss a large
slice of rows. Read the real voice from `course_audio`, never `listening_pods.speakers`.

## The lock table

| Language | Code | Status | Cast Tom ruled | Confidence | Note |
|---|---|---|---|---|---|
| Arabic (MSA) | `ara` | REJECTED | — | ear-verified (rejected) | Tom, 2026-08-17, verbatim: "Arabic MSA - all bad to my ears. None sound authentic to me." Azure candidates produced for his next listen. |
| Arabic — Egyptian | `ara_eg` | APPROVED | rex (m, xai) + eve (f, xai) | ear-verified | Approved as sampled, 2026-08-17. Production side of the fork. |
| Arabic — Syrian | `ara_sy` | APPROVED | Laith (m, azure) + Amany (f, azure) | ear-verified | Approved as sampled, 2026-08-17. Matches the A-120 recast and `pod-voices-azure.json` `ar-SY`. |
| Armenian | `hye` | APPROVED | Hayk (m, azure) + Anahit (f, azure) | ear-verified | Approved as sampled, 2026-08-17. |
| Basque | `eus` | APPROVED | Ander (m, azure) + Ainhoa (f, azure) | ear-verified | Approved as sampled, 2026-08-17. |
| Bulgarian | `bul` | APPROVED | Borislav (m, azure) + Kalina (f, azure) | ear-verified | Approved as sampled, 2026-08-17. |
| Catalan | `cat` | PENDING — xAI rejected | Alba (f, azure) confirmed; male half open | partial | xAI pair Jordi/Mireia rejected 2026-08-17. Alba is female, mislabelled male in the doc. Check Enric (azure, 229 clips) before spending on fresh renders. |
| Chinese | `zho` | APPROVED | Wei (m, xai) + `ara` (f, xai) | ear-verified | Approved 2026-08-17. Pick crosses both blocks; Hui not picked. `ara` here is the VOICE id, not the language code. |
| Croatian | `hrv` | APPROVED | Srecko (m, azure) + Gabrijela (f, azure) | ear-verified | Approved as sampled, 2026-08-17. |
| Danish | `dan` | APPROVED | `0ih5oi34` (m, xai) + `ara` (f, xai) | ear-verified | Approved 2026-08-17. Production pair; official pool Mads/Astrid NOT picked. |
| Dutch | `nld` | APPROVED — locked, **render BLOCKED** | Bas (m, xai) + Lieke (f, xai) | ear-verified | Official-pool pair approved 2026-08-17. Both production voices REJECTED. No re-render until #800 end-click is fixed and ear-verified — Tom's own instruction. A-131 collision open, see below. |
| Estonian | `est` | APPROVED | Kert (m, azure) + Anu (f, azure) | ear-verified | Approved as sampled, 2026-08-17. Single Azure pool pair, no production fork. |
| Finnish | `fin` | APPROVED | Harri (m, azure) + Selma (f, azure) | ear-verified | Approved as sampled, 2026-08-17. Single Azure pool pair, no production fork. |
| French | `fra` | APPROVED — locked, **full render HELD** | Henri (m, azure) + Celeste (f, azure) | **needs one-word confirm** | Approved as sampled 2026-08-17, but `fra` carries a pool-vs-production fork and the ruling did not say which side. Default = the official pool. 284 existing clips make a wrong-cast render expensive, so only the verification slice renders until Tom confirms. |
| French — Quebecois | `fra_ca` | APPROVED | Antoine (m, azure) + Sylvie (f, azure) | **unverified — pending a native/learner listen** | Locked 2026-08-17. Tom cannot judge Québécois authenticity by ear ("no idea"), so the pool cast stands rather than churning. It is a LOCK, not a deferral: it renders with everything else. Also the only complete pair available — production has one voice, Jean (azure, 34 clips), and no female at all. |
| German | `deu` | APPROVED — **pool lock BLOCKED** | Moritz `41321eb41295` (m) + Lena `3a7889066fa2` (f) | ear-verified | Production pair kept, 2026-08-17; official pool Felix/Sonja NOT picked. Lena was the mislabel he'd have been shown as male. **Cannot lock: `deu_at` shares pool key `deu` and wants the opposite side of the fork.** |
| German — Austrian | `deu_at` | APPROVED as sampled — **pool lock BLOCKED** | Felix (m, xai) + Sonja (f, xai) | ear-verified | Approved as sampled 2026-08-17 (single pool pair, no fork). **Cannot lock: shares pool key `deu` with German, which wants the production pair instead.** |
| Greek | `ell` | APPROVED | Nestoras (m, azure) + Athina (f, azure) | ear-verified | Approved as sampled 2026-08-17. Already index 0 — **no pool edit needed.** |
| Hebrew | `heb` | APPROVED | Avri (m, azure) + Hila (f, azure) | ear-verified | Approved as sampled 2026-08-17. Already index 0 — **no pool edit needed.** |
| Hindi | `hin` | APPROVED | Karan `89q2pnko` (m, xai) + Ara `ara` (f, xai) | ear-verified | Production pair kept, 2026-08-17; pool Vihaan/Priya NOT picked. `ara` is the VOICE id. **Pool edit applied.** |
| Icelandic | `isl` | APPROVED | Gunnar (m, azure) + Gudrun (f, azure) | ear-verified | Approved as sampled 2026-08-17. Already index 0 — **no pool edit needed.** |
| Irish | `gle` | APPROVED | Colm (m, azure) + Orla (f, azure) | ear-verified | Approved as sampled 2026-08-17. Already index 0 — **no pool edit needed.** |
| Italian | `ita` | APPROVED | Leon (m, xai) + Giulia (f, xai) | ear-verified | **Official pool** kept 2026-08-17; production `x7avnu1k` + `eve` REJECTED. Already index 0 — **no pool edit needed.** |
| Japanese | `jpn` | APPROVED | Naoki (m, azure) + Mayu (f, azure) | ear-verified | **Official pool** kept 2026-08-17; production `b1a7441b97a1` + `ara` REJECTED. Already index 0 — **no pool edit needed.** |
| Korean | `kor` | APPROVED | Jun-seo `bf9fe5b5f981` (m, xai, production) + YuJin (f, azure, pool) | ear-verified | Cross-block pick 2026-08-17, like Chinese. Pool male Hyun-woo NOT picked; production `23be42535a45` (**Ji-yeon, female**) NOT picked. **Pool edit applied.** |
| Latvian | `lav` | APPROVED | Nils (m, azure) + Everita (f, azure) | ear-verified | Only pair available ("no other options"), 2026-08-17. Already index 0 — **no pool edit needed.** |
| Lithuanian | `lit` | APPROVED | Leonas (m, azure) + Ona (f, azure) | ear-verified | Only pair available ("no other options"), 2026-08-17. Already index 0 — **no pool edit needed.** |
| Nepali | `nep` | APPROVED | Sagar (m, azure) + Hemkala (f, azure) | ear-verified | Only pair available ("no other options"), 2026-08-17. Already index 0 — **no pool edit needed.** |
| Norwegian | `nor` | APPROVED | Finn (m, azure) + Iselin (f, azure) | ear-verified | Only pair available ("no other options"), 2026-08-17. Already index 0 — **no pool edit needed.** |
| Persian | `fas` | APPROVED | Farid (m, azure) + Dilara (f, azure) | ear-verified | Only pair available ("when there's only two voices, I can't choose"), 2026-08-17. Already index 0 — **no pool edit needed.** |
| Polish | `pol` | APPROVED | Tomasz (m, xai) + Magdalena (f, xai) | ear-verified | First-listed male/female on the candidate page, 2026-08-17 (dictation "Polish now is the first choice... Thomas" read as Tomasz). Pool candidates Aleksandra (f) and Mateusz (m) NOT picked. Already index 0 — **no pool edit needed.** |
| Portuguese — Brazilian | `por_br` | PENDING his listen | — | — | Not yet listened. |
| Portuguese — European | `por` | PENDING his listen | — | — | Not yet listened. |
| Romanian | `ron` | PENDING his listen | — | — | Not yet listened. |
| Spanish — Iberian | `spa` | PENDING his listen | — | — | Not yet listened. |
| Spanish — Mexican | `spa_mx` | PENDING his listen | — | — | Not yet listened. |
| Swahili | `swa` | PENDING his listen | — | — | Not yet listened. |
| Swedish | `swe` | PENDING his listen | — | — | Not yet listened. |
| Thai | `tha` | PENDING his listen | — | — | Not yet listened. |
| Turkish | `tur` | PENDING his listen | — | — | Not yet listened. |
| Ukrainian | `ukr` | PENDING his listen | — | — | Not yet listened. |

## Ruling log

### 2026-08-17 — Arabic MSA (`ara`) — REJECTED

Tom, **verbatim** (the only verbatim quotes in this file):

> "T-21 doing these one at a time
>
> Arabic MSA - all bad to my ears. None sound authentic to me.
>
> We may need to choose Azure for some of these"

**All four candidates rejected**, on **authenticity to his ear** — not on any measurable or technical
defect. Do not re-score them, do not propose keeping one:

| Voice | Provider | Block |
|---|---|---|
| Youssef (male) | xai | Official pool |
| Yasmin (female) | xai | Official pool |
| `70013edeb8e8` (male, 101 clips) | xai | In production now |
| `ara` (77 clips) | xai | In production now |

Rejected against the afdcc743 doc. Azure candidates produced in response — see the published doc.

**Not a contradiction:** the same `ara` voice is Tom's pick for the *Chinese* female. A voice can be
wrong for one language and right for another. The MSA rejection stands exactly as written.

### 2026-08-17 — Egyptian Arabic (`ara_eg`) — APPROVED

*Relayed, not verbatim.* Both production candidates sound good to him; cast locked as the
**production** side of the fork (`rex` + `eve`), not the official-pool pair Youssef/Yasmin.

### 2026-08-17 — four approved as sampled

Every language in doc order **after** Egyptian Arabic and **up to but not including** Catalan.
Re-derived independently from the doc: exactly four, each a single Azure official-pool pair with no
production fork.

| Language | Code | Male | Female |
|---|---|---|---|
| Arabic — Syrian | `ara_sy` | Laith (azure) | Amany (azure) |
| Armenian | `hye` | Hayk (azure) | Anahit (azure) |
| Basque | `eus` | Ander (azure) | Ainhoa (azure) |
| Bulgarian | `bul` | Borislav (azure) | Kalina (azure) |

*Relayed, not verbatim.*

### 2026-08-17 — Catalan (`cat`) — xAI REJECTED, still pending

*Relayed, not verbatim.* Jordi (male, xai) and Mireia (female, xai) rejected. The **Azure female is
good but mislabelled male in the doc** — that voice is **Alba** (77 clips). Catalan needs a
correctly-labelled female **plus a real male candidate** before it locks. **Do not lock on a guess.**
Check **Enric** (azure, 229 clips, already in production) before spending on fresh renders.

### 2026-08-17 — Chinese (`zho`) — APPROVED

*Relayed, not verbatim.* Male = **Wei** (official pool, xai). Female = **`ara`** (production, xai) —
Tom confirms by ear that `ara` is a **female** voice, mislabelled male. The pick **crosses both
blocks**; **Hui is not picked**. Pool for `zho` writes Wei + `ara` and drops Hui.

### 2026-08-17 — Croatian (`hrv`) — APPROVED

*Relayed, not verbatim.* Approved as sampled: **Srecko** (m, azure) + **Gabrijela** (f, azure), the
single Azure pool pair with no production fork.

### 2026-08-17 — Danish (`dan`) — APPROVED

*Relayed, not verbatim.* The two **in-production** voices are his pick: **`0ih5oi34`** as male and
**`ara`** as female — the same `ara` he ruled female on Chinese. The official-pool pair the doc shows
for Danish (Mads, Astrid) is **not** his pick.

### 2026-08-17 — Dutch (`nld`) — APPROVED on the official pool, render BLOCKED

*Relayed, not verbatim.* **Cast locked as Bas (m, xai) + Lieke (f, xai)** — the official-pool pair —
for all future rendering.

**Both in-production Dutch voices are REJECTED**: `247783ebdd51` (88 clips) and `a13662ba951c`
(85 clips), both tagged male in the doc. His stated reasons: they are misgendered in the labels, and
not good enough anyway.

**Render is blocked by his own instruction.** Dutch's ~173 existing clips sit on now-rejected voices,
so the language is heading for a full re-render — but **no bulk Dutch re-render until the #800
end-click pipeline defect is fixed and ear-verified**. Dutch is sequenced behind #800. Nothing was
rendered; the cost is flagged below rather than incurred.

**Third mislabel proven, and it widens the defect.** `tools/pod-voices-xai.json` `nl` block:

| voice_id | name | record says | doc says |
|---|---|---|---|
| `247783ebdd51` | **Noor** | **f** | male |
| `a13662ba951c` | Thijs | m | male |
| `58d27475085e` | Femke | f | — |
| `244e27b39200` | Ruben | m | — |

`ara` and `eve` sit in the file's `multilingual` block, so a plausible narrow theory was that only
multilingual voices were mishandled. **Noor is a plain language-specific `nl` voice and is
mislabelled too — that kills the narrow theory.** The doc's entire "In production now" column emits
male regardless of any record, consistent with the 41-male / 0-female count.

Note also that the doc's official-pool names for Dutch — **Bas and Lieke** — appear nowhere in that
file's `nl` block (Thijs, Femke, Noor, Ruben). Third language showing **two separate voice
inventories**.

#### The A-131 collision — Tom's call, not ours

`docs/a108/t22-nld-a131-closeout-2026-08-17.md` records Tom ruling, **verbatim**, on one Dutch clip —
`nld_for_eng` pod-0 line `SC08-S004`, clip `7e08e470-61a2-49ae-8614-222ed9155a75`:

> "A-131 these are all correct but the original - which I don't believe I marked as wrong sounds best.
> All the others have a slight click off - which to me, sounds like a sharp switch off of a
> compression algorithm"

Consequence recorded in the closeout: **"The original live take stays. The three re-rendered
candidates are discarded and are never to be shipped — not now, not later."**

That surviving original sits on a Dutch production voice — the very voices T-21 has now rejected. **A
wholesale Dutch re-render onto Bas + Lieke would replace the exact clip he ruled must stay.** The two
rulings were about different things (A-131 = register and the end click on one clip; T-21 = the voice
cast for the language), and either reading is defensible.

**This is a genuine taste-fork and it is Tom's call.** Nothing about that clip has been touched — not
deleted, not relinked, not queued. It is recorded here so the collision is visible **before** anyone
renders Dutch, which is the whole reason the render must not start now.

### 2026-08-17 — Estonian (`est`) and Finnish (`fin`) — APPROVED

*Relayed, not verbatim.* Approved as sampled. The span ruled was "everything in doc order after
Dutch, up to and including French" — **re-derived independently from the doc and confirmed: exactly
three languages, Estonian, Finnish, French.**

| Language | Code | Male | Female | Fork? |
|---|---|---|---|---|
| Estonian | `est` | Kert (azure) | Anu (azure) | none — single pool pair |
| Finnish | `fin` | Harri (azure) | Selma (azure) | none — single pool pair |
| French | `fra` | Henri (azure) | Celeste (azure) | **yes** — see below |

Estonian and Finnish are unambiguous: one Azure pool pair each, no production fork. Locked and
released.

### 2026-08-17 — French (`fra`) — APPROVED, but the fork is ambiguous

*Relayed, not verbatim.* French is the only language in that span carrying a fork, and "approved as
sampled" does not say which side of it he meant:

- Official pool: **Henri** (m, azure) + **Celeste** (f, azure)
- In production: **`0p0rt7o1`** (161 clips) + **`ara`** (123 clips)

**Default taken: lock the official pool pair, Henri + Celeste.** The reasoning, so it can be
defended or overturned in one word: when Tom has meant the production voices he has said so
explicitly (Danish, Chinese); when he has meant the pool he has said so explicitly (Dutch). A bare
"approved as sampled" has so far only ever landed on languages whose *sole* candidate pair was the
pool pair, so the pool is the reading consistent with every ruling to date.

**The full French render is HELD** pending his one-word confirm. This is a deliberate, stated
narrowing of "lock and release" for one language only: French carries 284 existing production clips,
so rendering the whole slice on the wrong cast spends real money **and** creates a pile of clips
needing make-before-break cleanup, whereas holding costs one question he answers in a word. Nothing
else in the span is blocked.

**Worth putting in front of him when he answers:** the French production pair is not what the doc
says it is. `0p0rt7o1` is **Remi, male** and `ara` is **female** in `tools/pod-voices-xai.json` — so
French's production side is a proper male/female pair that the doc presented to him as **two males**.
If he was reading the production side when he approved, he was reading it wrong. Another reason to
confirm rather than assume.

### 2026-08-17 — French Québécois (`fra_ca`) — LOCKED, unverified by ear

*Relayed, not verbatim.* **Keep the official pool as cast: Antoine (m, azure) + Sylvie (f, azure).**
Tom's position: he cannot judge Québécois authenticity by ear — "no idea" — so the cast stands rather
than churning, but it is marked **low-confidence / unverified-by-ear** so a native speaker or a
learner listen can revisit it later without blocking anything.

**This is a lock, not a deferral.** Québécois does not sit in the pending pile and waits for nobody;
it renders with everything else. It is the first `unverified` entry in the confidence column
(standing ruling 7) and there will be more — Tom cannot personally referee 41 languages.

Supporting the ruling rather than complicating it: the pool pair is also the *only complete pair
available*. The production side has a single voice, Jean (azure, 34 clips), with no female at all.

### 2026-08-17 — German (`deu`) — pre-armed before his listen

German is **next up** for Tom, and it is mislabelled in exactly the way that has already cost two
mis-listens. Checked against `tools/pod-voices-xai.json` `de` block:

| voice_id | name | record says | doc says |
|---|---|---|---|
| `41321eb41295` | Moritz | m | male ✓ |
| `3a7889066fa2` | **Lena** | **f** | **male ✗** |

**`3a7889066fa2` is Lena, female** — the **fourth** proven mislabel after `ara`, `eve` and Noor.
German's production pair is **Moritz + Lena**, a proper male/female pair, which the doc is about to
present to him as two male voices. That is precisely the trap he hit on Catalan and Chinese.

The official pool is Felix (m, xai) + Sonja (f, xai); those names appear nowhere in the record's `de`
block either (Clara, Moritz, Niklas, Lena) — the same two-inventory pattern.

## THE LOCK BLOCKER — regional variants share one pool key (found 2026-08-17)

**Measured, not assumed.** A cast is locked by putting the approved voice at **index 0** of its
gender list in `app_config.pod_voice_pools`, because `POD_VOICES_PER_GENDER` is 1 and
`tools/pod-sync.cjs` casts index 0 (`tools/pod-sync.cjs:251,388`). That is the whole mechanism the
Spanish precedent `c7c596ca` used.

The pool key is chosen by `poolKeyFor(pools, targetLang)` (`tools/pod-sync.cjs:235`), and
`targetLang` is the course's **`courses.target_lang` column, not its course code**. Queried live:

| Course | `target_lang` | Pool key it actually casts from |
|---|---|---|
| `ara_for_eng` | `ara` | `ara` |
| `ara_eg_for_eng` | `ara` | `ara` |
| `ara_sy_for_eng` | `ara` | `ara` |
| `fra_for_eng` | `fra` | `fra` |
| `fra_ca_for_eng` | `fra` | `fra` |
| `deu_at_for_eng` | `deu` | `deu` |
| `spa_mx_for_eng` | `spa` | `spa` |
| `por_br_for_eng` | `por` | `por` |

So the `ara_sy`, `fra_ca`, `spa_mx` and `por_br` **pool keys exist but are unreachable** through
pod-sync — `tools/pod-recast.cjs:55-64` already documents this and works around it *after the fact*
with `remapExactPool()`, which is why the A-120 Syrian recast succeeded even though the pool that
casts Syrian Arabic is the MSA one.

**The consequence for T-21 is a hard blocker on two families:**

- **`ara` / `ara_eg` / `ara_sy` are ONE pool key with THREE different rulings.** MSA is rejected
  outright; Egyptian is approved on rex + eve; Syrian is approved on Laith + Amany. Only one of the
  three can sit at index 0. **Locking any one of them stomps the other two.**
- **`fra` / `fra_ca` are ONE pool key with TWO different rulings.** French is (by default) Henri +
  Celeste; Québécois is Antoine + Sylvie. Locking French casts Québécois onto *French-France*
  voices, which is precisely the authenticity failure the Québécois ruling was trying to avoid.
- **`deu` / `deu_at` will collide the same way** the moment German is ruled — and German is next.

**There is no durable override store to escape through.** `resolveCast` accepts an `overrides`
argument (`tools/pod-sync.cjs:266,338`), but it is a **function parameter only**: the re-sync path
at `tools/pod-sync.cjs:704` calls `assignVoices(parsed.uniqueSpeakers, targetLang, knownLang)` with
no overrides at all. A manual pick therefore lives only in `listening_pods.speakers`, which is
exactly what the code's own comment at line 262 warns gets stomped.

### What this means for the locks

| Language | Pool state | Lock action |
|---|---|---|
| Armenian `hye` | Hayk + Anahit already at index 0 | **already locked — no edit needed** |
| Basque `eus` | Ander + Ainhoa at index 0 | **already locked** |
| Bulgarian `bul` | Borislav + Kalina at index 0 | **already locked** |
| Croatian `hrv` | Srecko + Gabrijela at index 0 | **already locked** |
| Estonian `est` | Kert + Anu at index 0 | **already locked** |
| Finnish `fin` | Harri + Selma at index 0 | **already locked** |
| Dutch `nld` | Bas + Lieke already at index 0 | **already locked** (render still blocked behind #800) |
| Chinese `zho` | Wei at m[0] ✓; f[0] is Hui, needs `ara` | **pool edit required** |
| Danish `dan` | m[0] is Mads, needs `0ih5oi34`; f[0] is Astrid, needs `ara` | **pool edit required** |
| Egyptian `ara_eg` | shares key `ara` | **BLOCKED — collides with MSA + Syrian** |
| Syrian `ara_sy` | shares key `ara` | **BLOCKED — collides with MSA + Egyptian** |
| French `fra` | Henri + Celeste at index 0 | index 0 already right, but locking it **casts Québécois wrong** |
| Québécois `fra_ca` | shares key `fra` | **BLOCKED — collides with French** |

Seven of the languages Tom has approved need **no pool edit at all** — their approved pair is
already index 0, so a re-sync cannot stomp them. Two need a straightforward edit. Four are blocked
on a structural collision that is **Tom's call, not ours**, because every available option trades
something real:

1. **Give regional variants their own `target_lang`** (`ara_eg`, `ara_sy`, `fra_ca`, …) so the
   already-existing pool keys become reachable. Cleanest and it deletes the whole class of bug —
   but it changes a column other code reads, so it needs its own scoped pass and blast-radius check.
2. **Persist the `overrides` parameter** as a per-course store that pod-sync reads on re-sync. The
   parameter and its normaliser already exist; only the durable store and the read are missing.
3. **Do nothing structural and accept that regional variants are recast by `pod-recast.cjs`** after
   every sync, relying on `remapExactPool()`. That is the status quo, and it is exactly the
   "remember to re-apply it" step the approval fingerprint was designed to remove.

**Nothing was written to the pool for the four blocked languages.** Locking one of them on a guess
would silently miscast the other two or three, which is the same failure mode as locking on a wrong
gender label — and Tom's standing instruction on that is to lock nothing and report the gap.

## What was actually locked, approved and blocked — 2026-08-17

### Azure genders, verified from Azure's own live voice list

Not from the doc's labels. Fetched from
`https://<region>.tts.speech.microsoft.com/cognitiveservices/voices/list` with the key in `.env`.
**Every Azure pool pair in play is a correct male/female pair:**

| Voice | Azure says | Voice | Azure says |
|---|---|---|---|
| `hy-AM-HaykNeural` | Male | `hy-AM-AnahitNeural` | Female |
| `eu-ES-AnderNeural` | Male | `eu-ES-AinhoaNeural` | Female |
| `bg-BG-BorislavNeural` | Male | `bg-BG-KalinaNeural` | Female |
| `hr-HR-SreckoNeural` | Male | `hr-HR-GabrijelaNeural` | Female |
| `et-EE-KertNeural` | Male | `et-EE-AnuNeural` | Female |
| `fi-FI-HarriNeural` | Male | `fi-FI-SelmaNeural` | Female |
| `fr-FR-HenriNeural` | Male | `fr-FR-CelesteNeural` | Female |
| `fr-CA-AntoineNeural` | Male | `fr-CA-SylvieNeural` | Female |
| `ar-SY-LaithNeural` | Male | `ar-SY-AmanyNeural` | Female |
| **`ca-ES-EnricNeural`** | **Male** | **`ca-ES-AlbaNeural`** | **Female** |

**This resolves Catalan cheaply.** Enric is genuinely male and genuinely a different voice from
Alba; Alba is genuinely female, exactly as Tom heard. Catalan therefore needs **no new render** —
only the label fix and Tom's ear on Enric as the male half. That is the whole outstanding question
for `cat`.

### The stored casts are not all what the doc implies

`--show` on each course, read through `tools/pod-approve-voices.cjs`. Pods are one voice per gender
by design, so a stored cast with more voices is **leakage to converge, not a cast to preserve**.

| Course | Stored cast | Verdict |
|---|---|---|
| `hye_for_eng` | Hayk + Anahit, clean two-hander | matches Tom's ruling — **approved** |
| `eus_for_eng` | Ander + Ainhoa, clean | matches — **approved** |
| `bul_for_eng` | Borislav + Kalina, clean | matches — **approved** |
| `est_for_eng` | Kert + Anu, clean | matches — **approved** |
| `zho_for_eng` | `ara`, `eve`, `jpi39icg`, `d18jlf6v` — **four voices** | Wei is not cast at all. Needs a recast onto the now-locked pool before it can be approved. |
| `dan_for_eng` | `ara`, `eve`, `0ih5oi34`, `gwnexu6y` — **four voices** | `eve` and `gwnexu6y` are leakage. Needs a recast before approval. |
| `hrv_for_eng` | **ElevenLabs** voices mixed with Azure Srecko/Gabrijela | Tom approved the Azure pair; several seats are on a third provider entirely. Needs a recast before approval. |
| `fin_for_eng` | every seat reads `deferred` | The cast is **not resolved at all**. Cannot be approved or rendered until it is. **Explicit gap.** |

### Approvals recorded

Four, through `tools/pod-approve-voices.cjs`, `--by=Tom`, `--sample-doc=` the afdcc743 doc:

| Course | Casting fingerprint |
|---|---|
| `hye_for_eng` | `ace3e0e192f373c8` |
| `eus_for_eng` | `53db22477cfead0f` |
| `bul_for_eng` | `58b28f161221e874` |
| `est_for_eng` | `28cf137f452ffd1c` |

Each self-invalidates if the course is recast, which is the designed behaviour.

**Deliberately NOT approved**, each for a stated reason:
- `nld_for_eng` — Tom blocked the Dutch render behind #800. Recording an approval would open the
  bulk gate he explicitly closed, so the gate stays shut.
- `zho`, `dan`, `hrv` — stored cast does not yet match the ruling; approving now would fingerprint
  the wrong cast.
- `fin` — cast unresolved.
- `ara_eg`, `ara_sy`, `fra`, `fra_ca` — blocked on the shared-pool-key collision above.

### Pool edits applied

`zho` and `dan` only. Before-state asserted per pool, readback verified, full backup of the
`pod_voice_pools` row in the applied log.

| Pool | index-0 male | index-0 female |
|---|---|---|
| `zho` | Wei `9ab26871` (unchanged) | Hui → **Ara `ara`** |
| `dan` | Mads → **Kasper `0ih5oi34`** | Astrid → **Ara `ara`** |

Seven other approved languages (`hye`, `eus`, `bul`, `hrv`, `est`, `fin`, `nld`) already had their
ruled pair at index 0 and needed **no pool edit at all**.

### Nothing was rendered

No render slice was run in this pass. The languages that are cleanly approved and ready
(`hye`, `eus`, `bul`, `est`) are the correct first slice, and the #800 end-click tail-listen must
happen on that slice before anything is released more widely.

## Voice-gender forensics — every lock verified on three independent sources (#805)

Full evidence: <https://watson-1.tail4968cb.ts.net/d/d8110524>. Read-only job; nothing written.

Three sources, in descending authority: **Azure's own live voice list** (556 voices, `Gender`
field); **acoustic measurement** of median F0 on real served clip bytes (autocorrelation, 1024-frame,
70–350 Hz, silence-gated); and the **repo voice records**. **Where sources overlap they agree in
every single case.** No contradiction was found anywhere.

### xAI voices, measured acoustically on served bytes

| Voice id | Name | Median F0 | Verdict | Repo record | Agree? |
|---|---|---|---|---|---|
| `rex` | Rex | 93.0 Hz | MALE | m | ✅ |
| `eve` | Eve | 186.0 Hz | FEMALE | f | ✅ |
| `ara` (the VOICE) | Ara | 235.3 Hz | FEMALE | f | ✅ |
| `0ih5oi34` | Kasper | 102.6 Hz | MALE | m | ✅ |
| `0p0rt7o1` | Remi | 117.6 Hz | MALE | m | ✅ |
| `9ab26871` | Wei | 127.0 Hz | MALE | pool `zho/m` | ✅ |
| `18245f0d` | Bas | 141.6 Hz | MALE | pool `nld/m` | ✅ |
| `cdb1cec8` | Lieke | 183.9 Hz | FEMALE | pool `nld/f` | ✅ |
| `sal` | Sal | 140.4 Hz, IQR 111–186 | **ambiguous by design** | m in JSON, both in cast metadata | — |

**Egyptian Arabic confirmed, not assumed:** `rex` male, `eve` female. Tom's "the male and the
female" maps exactly as he described. The first amendment's discrepancy is fully resolved.

All twenty Azure voices in play resolve to one Azure ShortName each with an unambiguous `Gender`,
and every pool pair is a correct male/female pair.

### Catalan — resolved, and it needs no render

- **Enric is male**: Azure says Male; acoustic median F0 **128.0 Hz**.
- **Enric is a different voice from Alba**, proven on a clean A/B — both have a clip of the
  *identical* Catalan sentence: Enric **128.0 Hz**, Alba **190.5 Hz**. A 62.5 Hz separation on the
  same words.
- **Enric's clips are alive**: HTTP 200, `audio/mpeg`, 198,144 bytes, 16.128 s of real audio; 132
  `target1` clips in `cat_for_eng` plus more.

So Catalan's audio is already a correct male/female pair in production. **What is wrong is the
paperwork, not the audio.** Catalan needs the label fix and Tom's ear on Enric — nothing more.

### A-131 — the collision is REAL and does NOT dissolve

Checked against the live database. Clip `7e08e470-61a2-49ae-8614-222ed9155a75`
(`nld_for_eng:pod-0:SC08-S004`, "Ik wil graag een glas bitter, alstublieft.") carries
`voice_id = xai_247783ebdd51` — **Noor, one of the two rejected Dutch production voices.** It is not
already on Bas or Lieke.

A wholesale Dutch re-render would replace exactly the clip Tom ruled untouchable. **The collision
stands and remains his call.** Nothing was deleted, relinked, queued or modified.

Note the near-miss: the clip carries the `xai_`-prefixed spelling. A query matching only the bare
`247783ebdd51` would have missed it and wrongly reported the collision dissolved.

### The Dutch re-render cost — real, from the pipeline's own constant

`services/phases/phase8-audio-v13.cjs:6142` — `POD_CHARS_TO_COST = 15.00 / 1_000_000` (xAI's
published TTS rate). The $4.48 estate figure reconciles exactly: 298,494 chars × $15/1M = **$4.477**.

| Scope | Distinct clips | Characters | Cost |
|---|---|---|---|
| Rejected-voice clips actually played | 93 | 6,097 | **$0.09** |
| All rejected-voice target-side clips | 356 | 18,119 | $0.27 |
| Full recast, played clips only | 142 | 8,457 | $0.13 |
| Full recast, all target-side clips | 549 | 24,899 | **$0.37** |

**Dutch costs between 9 and 37 cents.** Cost is not a reason to hesitate; the A-131 ruling and the
#800 end-click are, and those are correctness reasons. **Nothing was rendered.**

### Gaps, stated rather than filled

- **Bas and Lieke are absent from `tools/pod-voices-xai.json`** — its `nl` block has only Thijs,
  Femke, Noor and Ruben. Their genders are established acoustically because the repo record does not
  contain them. That hole is worth closing separately.
- **Bas's male reading has the narrowest margin** in the set (141.6 Hz). It is male, but if any male
  label here fails Tom's ear it is this one — worth thirty seconds of listening before Dutch renders.
- **`sal` cannot be assigned a gender** and must not be locked into a gendered slot. Genuinely
  neutral, not a defect.
- The brief's "roughly 173 Dutch pod clips" is not reproducible against the live database; the real
  distinct-clip counts are in the table above.

## The render — four languages released, tails clean

The first slice went on Armenian, then the rest on the four cleanly-approved languages.

**The #800 end-click was checked before releasing anything wider.** Measured on the fresh clips: the
final 30 ms of every clip sits at **−91 dB** — digital silence — with no hard cut at level. **No end
click.** That is consistent with the click being an xAI-plus-compressor artefact; these four
languages are Azure-cast and are not exposed to it. **Nothing was repaired, patched or trimmed** —
the abolished-tail-repair ruling was never approached.

| Course | Generated | Failed | Text-blocked | Voices on the fresh clips |
|---|---|---|---|---|
| `hye_for_eng` | 116 | 2 | 2 | Hayk 29 + Anahit 94 — **the approved pair only** |
| `eus_for_eng` | 109 | 2 | 1 | Ander 23 + Ainhoa 86 — **approved pair only** |
| `bul_for_eng` | 105 | 2 | 1 | Borislav 17 + Kalina 88 — **approved pair only** |
| `est_for_eng` | 105 | 2 | 4 | Kert 20 + Anu 85 — **approved pair only** |

**435 clips, about $0.28 total.** Every fresh clip is on exactly Tom's approved pair — no leakage.
Spot-checked eight clips across the four languages: all HTTP 200, all real audio, all tails clean.

### Two defects found by rendering

1. **`SC15-S012` has empty text in all four courses.** Every language failed the same sentence id
   with `Text cannot be empty`. One content defect replicated across the pod source, not four
   coincidences.
2. **A second, separate gate exists that is not the voice gate.** `blocked_unapproved_target` is the
   **A-109 text-approval gate** (`targetTextRenderable`), which refuses to render unproofread target
   text. It is small here (1–4 sentences per course) but it is a real, independent blocker on any
   T-21 render, and a voice approval does not open it.

## The label defect — RESOLVED: it was the GENERATOR, not the store (#804)

Full finding: <https://watson-1.tail4968cb.ts.net/d/90603dde>. Read-and-diagnose only; nothing
written, no audio generated.

**The store is correct. Every store is correct. The generator printed "male" without asking any of
them.**

The canonical voice-metadata store is the **`voices` table** — 302 rows, a `gender` column under
`CHECK (gender IN ('f','m'))`, filled 2026-08-11 straight from xAI's own API
(`metadata_source = 'xai:GET /v1/tts/voices/{id}'`). Queried on both spellings, it records
`ara`, `eve`, Noor, Lena, Ji-yeon and Aleksandra all as **`f`**. Three further stores agree
(`pod-voices-xai.json`, `pod_voice_pools`, and `listening_pods.speakers`, which literally stores
Lena as `{name:"Lena", gender:"f"}`). **No store anywhere records these voices as male.**

Four facts pin it to the generator rather than any store:

1. **`course_audio` has no gender column.** The production block is derived from `course_audio`, so
   the generator had *no* gender to carry through and had to look one up. It did not.
2. **The official-pool block on the same page is 100% correct** — because there gender is the pool's
   `f`/`m` *key*, i.e. structural. Where gender was structural the page is right; where it needed a
   lookup it is uniformly "male". **That is a defaulting signature.**
3. **41 of 41 with no exceptions**, including a voice whose friendly name the generator resolved
   from a record that files her under `f`. A store defect would be patchy; this is categorical.
4. The clip renderer `tools/pod-cast-sample-render.cjs` is **not** the culprit and needs no change.

### EXPLICIT GAP — the generator is unrecoverable, so no code fix was possible

Established by search, not assumed. The page was published from a markdown file committed as
`2cd3a093` on branch `docs/pods-end-to-end-2026-08-14`; **that commit contains the markdown and
nothing else** (one file, 1,009 insertions). The generator and its brief were never committed,
`git log --all` finds no casting-page builder, and the 41-language brief and render log are gone.
There is no deleted file to recover and no live code path repeating the defect
(the one candidate ternary in `services/voice-engine/pods-cast.cjs:561` is unreachable for unknown
genders). **No replacement was invented and no hunt beyond these repos was made.**

**Requirement for any future build of this page:** resolve gender from the `voices` table (matching
bare *and* `xai_`-prefixed spellings), fall back to `pod_voice_pools` / `pod-voices-xai.json`, and
**render unknown as unknown, never as male** — Azure voices in `voices` currently carry a NULL
gender, which is exactly the input that produced this defect.

### The full mislabel list — 20 of 41 rows wrong, across SEVEN voices

Tom caught four by ear. **Three more were found by this pass: Ji-yeon (Korean), Aleksandra (Polish)
and Alba (Catalan).**

| Voice id | Name | Doc said | Truth | Languages affected on the page |
|---|---|---|---|---|
| `ara` / `xai_ara` | Ara | male | **female** | ara, zho, dan, fra, hin, jpn, por_br, swe, tha, tur (10) |
| `eve` / `xai_eve` | Eve | male | **female** | ara_eg, ita, por, spa, spa_mx (5) |
| `247783ebdd51` | Noor | male | **female** | nld |
| `3a7889066fa2` | Lena | male | **female** | deu |
| `23be42535a45` | **Ji-yeon** | male | **female** | kor |
| `1b12d5daee6b` | **Aleksandra** | male | **female** | pol |
| `ca-ES-AlbaNeural` | **Alba** | male | **female** | cat |

The other 21 rows (19 distinct voices) are correctly male. **Corrected, the page reads 21 male / 20
female** — the near-clean pair-per-language you would expect, which is itself a check on the result.
`sal` does not appear in the production block at all, so its known neutrality is not in play.

### Blast radius is wider than the page shows

The page lists only the top two pod voices per language. Estate-wide, counting both spellings:

| Voice | Courses | Pod clips | All clips |
|---|---|---|---|
| `ara` (f) | 35 | 2,228 | 70,680 |
| `eve` (f) | 37 | 1,742 | 162,906 |
| `rex` (m) | 20 | 461 | 1,283 |
| Noor (f) | 1 | 182 | 341 |
| Lena (f) | 2 | 168 | 361 |
| Ji-yeon (f) | 1 | 165 | 307 |
| Aleksandra (f) | 1 | 144 | 284 |
| Alba (f) | 2 | 78 | 5,692 |

**Two female multilingual voices carry pod work in 35 and 37 courses.** Any casting decision taken
from the page's male labels reasons about the wrong half of the estate.

### The second inventory, identified

**Official pool = the `pod_voice_pools` key in `app_config`** — 46 languages, `{f:[...], m:[...]}`,
gender is the *key* not a field, so that block is correct by construction and has friendly names to
print. **Verified, not assumed: all 82 official-pool rows checked, 0 gender mismatches, 0 provider
mismatches**, corroborated independently by the 2026-08-11 xAI metadata pass (`pool_mismatch: 0`).
The four rows with no own pool entry (`ara_eg` ×2, `deu_at` ×2) correctly inherit the parent
language's pool — which is the same shared-key behaviour as the lock blocker above.

**In production now = an aggregate over `course_audio`**, which stores no name and no gender. That
is exactly why that block prints raw ids and why its gender had to be looked up, and was not.

This also settles the naming puzzle: `pod_voice_pools` is the curated **casting pool**;
`pod-voices-xai.json` is the xAI **catalogue**. Different inventories, different memberships, and
only the pools carry Azure entries. Neither is wrong.

## 2026-08-17 — the German-to-Korean span, and the A-132 render hold

### THE RENDER HOLD (A-132) — read before touching any render

The end-click fix candidate **failed Tom's ear**. Only the original take is clean; the
compressor-removed render **still clicks**. **All bulk rendering of locked T-21 languages is
PAUSED** until the click-diagnosis job reports a render he has passed by ear.

Locking casts, label fixes and small sample/verification slices continue. It is **bulk clip
production** that stops.

**This corrects an inference made earlier in this ledger.** The Armenian/Basque/Bulgarian/Estonian
render measured clean tails at −91 dB and concluded Azure-cast languages were not exposed to the
click. Tom's ear now says the click survives a render that measurement called clean, so **the
measurement is not a sufficient release test and the hold is on the render, not on a provider.**
The 435 clips already rendered stand; nothing further is produced.

### The six screenshots, matched to languages

Tom sent six screenshots of the exact voices to keep. Each is matched below **by clip count and pool
membership against the doc**, not by recall. Every one resolves to exactly one language — **no id
was ambiguous, so nothing here is a guess.**

| # | What the screenshot showed | Matched to | How it was matched unambiguously |
|---|---|---|---|
| 1 | `41321eb41295` (m, 133 clips) + `3a7889066fa2` (130 clips) | **German `deu`** | Only language whose production pair has 133/130 clips |
| 2 | `89q2pnko` (m, xai, 99) + `ara` (65) | **Hindi `hin`** | Only production pair with 99/65 clips |
| 3 | Pool **Leon** (m, xai) + **Giulia** (f, xai) | **Italian `ita`** | Only pool pair named Leon/Giulia |
| 4 | Pool **Naoki** (m, azure) + **Mayu** (f, azure) | **Japanese `jpn`** | Only pool pair named Naoki/Mayu |
| 5 | `bf9fe5b5f981` (m, xai, 87 clips) | **Korean `kor`** | Only production voice with 87 clips |
| 6 | **YuJin** (f, azure), shown above the In-production header | **Korean `kor`** | `kor` is the only language whose *pool* female is YuJin (azure) |

**Screenshots 5 and 6 are the same language and together give Korean a complete pair** — Jun-seo
(production male) + YuJin (pool female). A cross-block pick, exactly like Chinese. **No gender is
left open by these six screenshots.**

Rejected alongside them, explicitly: German's pool Felix/Sonja; Hindi's pool Vihaan/Priya; Italian's
production `x7avnu1k` + `eve`; Japanese's production `b1a7441b97a1` + `ara`; Korean's pool male
Hyun-woo and production `23be42535a45` (**Ji-yeon — the female mislabel found earlier**).

### Approved as sampled, not contradicted by any screenshot

The span runs German → Korean inclusive. Five languages carry no screenshot and no fork, so their
single pool pair stands:

| Language | Code | Male | Female | Azure gender check |
|---|---|---|---|---|
| German — Austrian | `deu_at` | Felix (xai) | Sonja (xai) | pool key structural |
| Greek | `ell` | Nestoras (azure) | Athina (azure) | Male / Female ✓ |
| Hebrew | `heb` | Avri (azure) | Hila (azure) | Male / Female ✓ |
| Icelandic | `isl` | Gunnar (azure) | Gudrun (azure) | Male / Female ✓ |
| Irish | `gle` | Colm (azure) | Orla (azure) | Male / Female ✓ |

Every Azure gender re-verified against Azure's own live voice list before locking, per the standing
ordering. Naoki/Mayu and YuJin were checked the same way: **Male / Female / Female ✓**.

### The German ↔ Austrian collision — the predicted one, now real

`deu_at_for_eng` carries `target_lang = 'deu'` and **`deu_at` has no pool key of its own**, so both
courses cast from the single `deu` pool. Tom has now ruled:

- **German** = the **production** pair, Moritz + Lena
- **Austrian German** = the **pool** pair, Felix + Sonja

**These are opposite sides of one fork sharing one index-0 seat.** Locking German's choice into the
`deu` pool would recast Austrian German onto Moritz + Lena, and vice versa. This is the third
instance of the shared-pool-key blocker (after the Arabic family and French/Québécois) and it was
predicted in this ledger before German was ruled.

**Nothing was written to the `deu` pool.** Both rulings are recorded; neither is enforced. The fix is
the structural one already costed for Tom — give regional variants their own `target_lang`, or
persist the overrides — and it is his call.

### Stored casts across the new span — what is ready and what needs a recast

`--show` per course, target track only. Pods are one voice per gender by design, so extra voices are
leakage to converge.

| Course | Stored target cast | Verdict |
|---|---|---|
| `ell_for_eng` | Nestoras + Athina, clean pair | matches the ruling — **approved** |
| `heb_for_eng` | Avri + Hila, clean pair | matches — **approved** |
| `isl_for_eng` | Gunnar + Gudrun, clean pair | matches — **approved** |
| `gle_for_eng` | Colm + Orla, clean pair | matches — **approved** |
| `deu_at_for_eng` | Felix + Sonja, clean pair | matches — **approved** (and see the note below) |
| `ita_for_eng` | `ara`, `bcs7l2c3`, `eve`, `hqxr4yub`, `x7avnu1k` — **five voices** | Leon and Giulia are **not cast at all**. Needs a recast. |
| `jpn_for_eng` | `ara`, `b1a7441b97a1`, `d0cb9ff07d95`, `eve`, `rex` — **five voices, all xAI** | Naoki and Mayu (Azure) are **not cast at all**. Needs a recast. |
| `kor_for_eng` | six voices incl. `bf9fe5b5f981` ✓ | YuJin not cast; Ji-yeon `23be42535a45` still present. Needs a recast. |
| `hin_for_eng` | five voices incl. `89q2pnko` ✓ and `ara` ✓ | plus `eve`, `rex`, `73xd5dum` leakage. Needs a recast. |
| `deu_for_eng` | six voices incl. `41321eb41295` ✓ and `3a7889066fa2` ✓ | plus four others. Needs a recast — but see the collision. |

**A useful accident worth recording:** `deu_at`'s stored cast is *already* exactly Felix + Sonja,
because pod-sync cast it while the shared `deu` pool still had them at index 0. That is a second,
independent reason not to touch the `deu` pool — doing so would stomp a cast that is currently
correct for Austrian German, and self-invalidate its approval.

### Approvals recorded this pass

| Course | Casting fingerprint |
|---|---|
| `ell_for_eng` | `b1d682e046bb2181` |
| `heb_for_eng` | `36dbfea98c6c6919` |
| `isl_for_eng` | `2baa867f285f9a79` |
| `gle_for_eng` | `ad0a37421ff873c2` |
| `deu_at_for_eng` | `e1044baa79e2f1f9` |

**Each approval's note carries the A-132 render hold in capitals**, so anyone running
`pod-approve-voices.cjs --list` sees the brake next to the permission. The approval records the
**cast**; it does **not** authorise a bulk render while the hold stands. That is the cheapest
enforcement available — the gate's own text — given the hold is a human instruction and not a code
gate.

`deu`, `hin`, `ita`, `jpn`, `kor` are **not approved**: their stored casts do not yet match the
ruling, so approving would fingerprint the wrong cast.

### Two further notes from the forensics job, recorded for completeness

- **Dutch pod leakage.** Beyond the two rejected voices, `nld_for_eng` pods also carry Femke, Ruben,
  `ara`, `eve`, `ef4ce33e` and `sal`. Left alone deliberately — that is a **convergence** question
  (pods are one voice per gender by design, so extra voices are leakage to converge), not a casting
  question, and it does not change Tom's Bas + Lieke ruling. Note `sal` among them: it must not be
  assigned to a gendered seat.
- **The forensics worker hit the fan-out depth ceiling** as a depth-2 worker and therefore did all
  four legs itself rather than routing around the cap. No work was dropped; recorded so the coverage
  is not mistaken for a partition.

## 2026-08-17 — Latvian, Lithuanian, Nepali, Norwegian, Persian, Polish — six-language voice note

Tom's voice note, 22:41Z, working from the candidate page at `docs/pods/t21-remaining-casting-2026-08-17.md`
(commit `adbceb32` on `docs/nld-pool-recast-2026-08-17`). *Relayed, not verbatim* except where quoted.

- **Latvian, Lithuanian, Nepali, Norwegian** — each has exactly one candidate pair on the page.
  "No other options" — accepted as-is: Nils/Everita, Leonas/Ona, Sagar/Hemkala, Finn/Iselin.
- **Persian** — same shape: "when there's only two voices, I can't choose." Accepted Farid/Dilara.
- **Polish** — four candidates on the page (Tomasz m, Magdalena f, Aleksandra f, Mateusz m).
  Dictation garbled to "Polish now is the first choice. Okay, Thomas" — read as naming **Tomasz**,
  the only Tomasz-like name on the page, so the ruling is unambiguous: **first-listed male
  (Tomasz) + first-listed female (Magdalena)**. Aleksandra and Mateusz not picked.

**Verified against live `app_config.pod_voice_pools` before writing anything**: all six languages
already had Tom's picked voice at **index 0** of both the `m` and `f` arrays —

| Language | Code | Pool state (before, unchanged) |
|---|---|---|
| Latvian | `lav` | `m: [Nils]`, `f: [Everita]` — single pair, already index 0 |
| Lithuanian | `lit` | `m: [Leonas]`, `f: [Ona]` — single pair, already index 0 |
| Nepali | `nep` | `m: [Sagar]`, `f: [Hemkala]` — single pair, already index 0 |
| Norwegian | `nor` | `m: [Finn]`, `f: [Iselin]` — single pair, already index 0 |
| Persian | `fas` | `m: [Farid]`, `f: [Dilara]` — single pair, already index 0 |
| Polish | `pol` | `m: [Tomasz, Piotr, Marek]`, `f: [Magdalena, Zofia(xai), Zofia(azure)]` — Tomasz and Magdalena already index 0 |

**No `app_config` write was made** — same as the Greek/Hebrew/Icelandic/Irish/Italian/Japanese
precedent earlier in this ledger, locking an already-correct index 0 needs no edit, only the ruling
recorded. Gender cross-checked against `tools/pod-voices-azure.json` for the five Azure pairs (all
Male/Female ✓); Polish's Tomasz/Magdalena are xAI voices not present in the static
`pod-voices-xai.json` snapshot, so gender was cross-checked against the live candidate page instead,
which is itself sourced from real voice records per its own header (not the old page that mislabelled
Catalan and German).

**Casts lock only — no bulk rendering.** The A-132 render hold (above) still applies to all locked
T-21 languages; these six are locked and pending render release, not rendered.

## 2026-08-18 — the FINAL batch: all 41 languages are now ruled

Tom's ruling, **2026-08-18 00:21Z**, working from the candidate page
`docs/pods/t21-remaining-casting-2026-08-17.md` (published doc `7ad9d404`, source commit `adbceb32`
on `docs/nld-pool-recast-2026-08-17`). This closes T-21 casting.

**Every name below was checked against that page's actual candidate list before locking.** All twelve
matched; nothing was guessed and nothing was skipped for want of a match.

### What was written — five pool keys

Applied by `scripts/t21-pool-lock-final-batch.cjs --apply`, same gated shape as the hin/kor
precedent: before-state assertion per key (abort on drift), unshift/promote to index 0,
`POD_VOICES_PER_GENDER` is 1 so **index 0 is the cast**, displaced voices keep their depth one place
down, full readback, and every one of the 43 out-of-scope pools asserted byte-identical afterwards.
Log: `docs/pods/t21-pool-lock-final-batch-2026-08-18-applied-log.json`.

| Language | Key | Before (index 0) | After (index 0) |
|---|---|---|---|
| Polish | `pol` | m Tomasz `70071d42` / f Magdalena `ce19f825` | **m Mateusz `37329fd8895a` / f Aleksandra `1b12d5daee6b`** |
| Portuguese — Brazilian | `por_br` | m Julio `pt-BR-JulioNeural` / f Brenda `pt-BR-BrendaNeural` | m Julio *(unchanged)* / **f Ara `ara`** |
| Portuguese — European | `por` | m Duarte `pt-PT-DuarteNeural` / f Raquel `pt-PT-RaquelNeural` | **m Rex `rex` / f Eve `eve`** |
| Catalan | `cat` | m Jordi `c630b236` / f Mireia `4d3af3e1` | **m Enric `ca-ES-EnricNeural` / f Alba `ca-ES-AlbaNeural`** |
| Arabic MSA | `ara` | m Youssef `5f0c2251` / f Yasmin `025a38c5` | **m Shakir `ar-EG-ShakirNeural` / f Salma `ar-EG-SalmaNeural`** |

### What was ruled but needed no write — seven keys already at index 0

Asserted before *and* after, written to nothing. `ron` `swa` `ukr` are Tom's "as-is" acceptances;
the other four are picks the live pool already cast.

| Language | Key | Cast (already index 0) |
|---|---|---|
| Romanian | `ron` | Emil `ro-RO-EmilNeural` + Alina `ro-RO-AlinaNeural` — as-is, the only/default pair |
| Swahili | `swa` | Rafiki `sw-KE-RafikiNeural` + Zuri `sw-KE-ZuriNeural` — as-is |
| Ukrainian | `ukr` | Ostap `uk-UA-OstapNeural` + Polina `uk-UA-PolinaNeural` — as-is |
| Swedish | `swe` | Oscar `4c7f16ff` + Alice `3b312632` |
| Thai | `tha` | Somchai `4b7af2d7` + Nicha `a5341c30` |
| Turkish | `tur` | Ahmet `f331ee80` + Emel `tr-TR-EmelNeural` |
| Spanish — Mexican | `spa_mx` | Luciano `es-MX-LucianoNeural` + Carlota `es-MX-CarlotaNeural` |

**Turkish has two Ahmets** — xAI `f331ee80` and Azure `tr-TR-AhmetNeural`. The page's sample clip
(`73934272-…`) traces to the **xAI** Ahmet on the 2026-08-14 source page, and that is the one at
index 0. Not a coin-toss.

### Polish supersedes batch-1 (#970) — and #970 had written nothing

Job #970 read the garbled dictation *"Polish now is the first choice. Okay, Thomas"* as naming
**Tomasz**, and recorded Tomasz + Magdalena. Tom has now ruled **Mateusz + Aleksandra**. Because
#970 correctly made **no `app_config` write** (Tomasz/Magdalena were already index 0), this is the
**first `pol` write**, not a revert of a bad one — nothing had to be undone.

The ruling is coherent and well-evidenced: Mateusz and Aleksandra are the voices Polish learners
**already hear in production** (82 and 84 clips on the 2026-08-14 page's "In production now" block);
Tomasz/Magdalena were the *official pool* pair that production had diverged from. Tom has ruled the
fork in favour of production. Genders confirmed from `tools/pod-voices-xai.json`
(Mateusz `m`, Aleksandra `f`) — note the old page printed **both** as male, which is the known
all-male label defect recorded above, not a contradiction of this lock.

### Batch-1 (#970) verified as landed

All five only-pair languages confirmed still at index 0 on the live pool: `lav` Nils/Everita,
`lit` Leonas/Ona, `nep` Sagar/Hemkala, `nor` Finn/Iselin, `fas` Farid/Dilara. Nothing had drifted.

### Verification

Every one of the seventeen languages above was read back **from the live DB through `psql`** — a
different client from the one that wrote, so the write is not verifying itself. All 17 index-0 casts
match the ruling. Arabic genders cross-checked against `services/voice-gender-map.cjs`
(`ar-EG-ShakirNeural: M`, `ar-EG-SalmaNeural: F`).

### The one remaining blocker — spa_mx cannot take effect

Mexican Spanish is **ruled and locked** (Luciano + Carlota sit at index 0 of `spa_mx`), but it
**cannot reach a render**. `pod-sync.cjs`'s `langKey()` does `lang.toLowerCase().split(/[_-]/)[0]`,
so `spa_mx` resolves to the **`spa`** pool and casts Manuel + Elvira — the Iberian pair. The
`spa_mx` pool key is live, correct and unreachable.

**Deliberately not fixed here.** It is *not* a small unambiguous key split: `tools/pod-recast.cjs`
already carries a local `poolKeysForCourse()` workaround precisely because *"we must not edit
pod-sync.cjs (another worker owns it)"*, the same split silently affects `ara_sy`, `fra_ca` and
`por_br` too, and `por_br` is one of the casts locked in this very pass. Changing `langKey()` is a
shared-ownership change with a four-language blast radius, and it belongs in its own scoped job with
its own before/after. **This is the remaining gate on Mexican Spanish, and it is now the only one.**

### Nothing was rendered

Casts lock only. The A-132 render hold and the release question are handled separately (job #986).

### Stored casts re-synced so the lock is actually effective

A pool lock alone is only half the job: **`/generate-pods` renders from the STORED cast**
(`resolvePodSpeakerVoice(pod.speakers, …)` at `phase8-audio-v13.cjs:6545/6675`), not from the pool.
All seventeen courses were carrying stale casts — a released render would have produced the
**rejected** voices.

`tools/pod-recast.cjs --apply` was run for all seventeen (dry-run read and checked first). It writes
`listening_pods.speakers` and **nothing else** — no `target_audio_id`/`known_audio_id` is nulled, so
every existing clip keeps playing. Logs:
`docs/pods/t21-final-batch-recast-2026-08-18-{dryrun,applied}-log.json` and
`…-rest12-2026-08-18-{dryrun,applied}-log.json`.

This also **converged the leakage**: pods are one voice per gender by design, and several courses
were cast across three to six voices. Every one is now exactly two.

| Course | Distinct target voices before → after |
|---|---|
| `tha_for_eng` | 5 → 2 |
| `ara_for_eng` `por_br_for_eng` `swe_for_eng` `tur_for_eng` | 5 → 2 |
| `pol_for_eng` | 6 → 2 |
| `por_for_eng` `spa_mx_for_eng` | 4 → 2 |
| `cat_for_eng` `nor_for_eng` | 3 → 2 |
| `ron_swa_ukr_lav_lit_nep_fas_for_eng` | 2 → 2 (voice *assignment* corrected, count already clean) |

Verified live through `psql`: all 17 courses now hold exactly Tom's pair and nothing else.

### CORRECTION — spa_mx is NOT blocked, and there is no remaining casting blocker

The section above states Mexican Spanish "cannot reach a render". **That is wrong and is corrected
here.** `tools/pod-recast.cjs` carries its own `poolKeysForCourse()` and reaches the `spa_mx` pool
correctly; the recast wrote **Luciano + Carlota** to `spa_mx_for_eng`, confirmed live. Because the
render reads the stored cast, Mexican Spanish will render on the Mexican pair.

What survives is narrower and is a **latent regression risk, not a blocker**: `pod-sync.cjs`'s
`langKey()` still splits `spa_mx` → `spa`, so a future *pod-sync* run would stomp the Mexican cast
back to Iberian. The same split affects `ara_sy`, `fra_ca` and `por_br`. Fixing it is a
shared-ownership change to a file another worker owns and belongs in its own scoped job — but
nothing is waiting on it today.

### Approvals recorded — all 17, per rule 6

Recorded **after** the pool edit and **after** the stored cast was made to match, so each
fingerprint is taken over the correct cast. `--list` reports **27 approvals, all LIVE, none STALE**.

| Course | Fingerprint | Course | Fingerprint |
|---|---|---|---|
| `pol_for_eng` | `a16df5374acaf202` | `tur_for_eng` | `8208fb2c51fe0e76` |
| `por_for_eng` | `c3b4ef599f556ed1` | `spa_mx_for_eng` | `9d3f1c9f978d0524` |
| `por_br_for_eng` | `3a44b423647d7faa` | `lav_for_eng` | `326c274bf087a12f` |
| `cat_for_eng` | `cf4cf2108def821a` | `lit_for_eng` | `c76ae7c4af2dc406` |
| `ara_for_eng` | `275975a54254ef00` | `nep_for_eng` | `75ffd69d9cd4b5ce` |
| `ron_for_eng` | `6e62977d1a506205` | `nor_for_eng` | `33fa987db6cb7f01` |
| `swa_for_eng` | `25333b9651259f3a` | `fas_for_eng` | `3ed82d1c90c8ba2f` |
| `ukr_for_eng` | `b960ca7538923fc9` | | |
| `swe_for_eng` | `6bf37f154dbf2dc2` | | |
| `tha_for_eng` | `56733b19008b1232` | | |

Each note carries the A-132 hold in capitals. **The approval records the cast; it does not authorise
a render.**

## 2026-08-18 — the render: THE HOLD FORMALLY STANDS. Nothing was rendered.

Investigated by job **#986**, read-only. Verdict: **HOLD STANDS.**

**The click fix is merged AND genuinely live** — the merged-but-not-restarted trap does not apply.
The A-133 chain (`02f7a232`, `fc88c72b`, `93d2440f`, `cf8939a2`, `d217682d`) is an ancestor of
`origin/main`; the prod checkout `/home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod` pulled at
**00:11:26Z** and `popty-phase8-audio` restarted at **00:20:04Z**, after the pull;
`endOfSpeechWithArtefacts` is present on prod disk and on the pod path.

**But the hold's own release condition has not been met.** It lifts on *"a render Tom has passed by
ear"*. The last recorded ear event on the click question is `133b1b67` at 17:48Z — a **fail** on
Noor p1/p3, through the *then*-wired chain. The artefact rule landed 29 minutes later, and no
post-fix render has been put to his ear since: the A-136 report still carries
`LISTEN_LINK_PLACEHOLDER` under "Listen — is the click gone?", the 19:02Z page asked *which voice*
rather than *is the click gone*, `ops/ledger.json` has nothing, and a repo-wide grep for any
hold-lifted wording returns zero.

**So the hold is not moot — it is un-tested.** The thing that would justify lifting it exists and is
running; it has simply never been played to him. Per Tom's instruction, this is reported as the one
remaining gate rather than decided here.

**The render, for when it is released:** 6,910 clips / 298,494 characters across the 41 languages;
`POD_CHARS_TO_COST = 15.00/1_000_000` at `phase8-audio-v13.cjs:6221` gives **$4.477**. Per course:
`curl -s -X POST http://localhost:3465/generate-pods/<course> -H 'Content-Type: application/json'
-d '{"roles":["target"],"concurrency":4}'`. **Not run.**

**Approval is no longer the second gate for these seventeen** — #986 found 31 of 41 languages would
have 409'd at `pod_voices_not_approved`; the seventeen approvals above clear that for this batch.
