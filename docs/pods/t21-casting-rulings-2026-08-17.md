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

| Language | Code | Status | Cast Tom ruled | Note |
|---|---|---|---|---|
| Arabic (MSA) | `ara` | REJECTED | — | Tom, 2026-08-17, verbatim: "Arabic MSA - all bad to my ears. None sound authentic to me." |
| Arabic — Egyptian | `ara_eg` | APPROVED | rex (m, xai) + eve (f, xai) | Approved as sampled, 2026-08-17. Production side of the fork. |
| Arabic — Syrian | `ara_sy` | APPROVED | Laith (m, azure) + Amany (f, azure) | Approved as sampled, 2026-08-17. |
| Armenian | `hye` | APPROVED | Hayk (m, azure) + Anahit (f, azure) | Approved as sampled, 2026-08-17. |
| Basque | `eus` | APPROVED | Ander (m, azure) + Ainhoa (f, azure) | Approved as sampled, 2026-08-17. |
| Bulgarian | `bul` | APPROVED | Borislav (m, azure) + Kalina (f, azure) | Approved as sampled, 2026-08-17. |
| Catalan | `cat` | PENDING — xAI rejected | Alba (f, azure) confirmed; male half open | xAI pair Jordi/Mireia rejected 2026-08-17. Alba is female, mislabelled male in the doc. |
| Chinese | `zho` | APPROVED | Wei (m, xai) + ara (f, xai) | Approved 2026-08-17. Pick crosses both blocks; Hui not picked. `ara` here is the VOICE id, not the language code. |
| Croatian | `hrv` | APPROVED | Srecko (m, azure) + Gabrijela (f, azure) | Approved as sampled, 2026-08-17. |
| Danish | `dan` | APPROVED | `0ih5oi34` (m, xai) + `ara` (f, xai) | Approved 2026-08-17. Production pair; official pool Mads/Astrid NOT picked. |
| Dutch | `nld` | APPROVED — locked, **render BLOCKED** | Bas (m, xai) + Lieke (f, xai) | Official-pool pair approved 2026-08-17. Both production voices REJECTED. No re-render until #800 end-click is fixed and ear-verified — Tom's own instruction. A-131 collision open, see below. |
| Estonian | `est` | PENDING his listen | — | Not yet listened. |
| Finnish | `fin` | PENDING his listen | — | Not yet listened. |
| French | `fra` | PENDING his listen | — | Not yet listened. |
| French — Quebecois | `fra_ca` | PENDING his listen | — | Not yet listened. |
| German | `deu` | PENDING his listen | — | Not yet listened. |
| German — Austrian | `deu_at` | PENDING his listen | — | Not yet listened. |
| Greek | `ell` | PENDING his listen | — | Not yet listened. |
| Hebrew | `heb` | PENDING his listen | — | Not yet listened. |
| Hindi | `hin` | PENDING his listen | — | Not yet listened. |
| Icelandic | `isl` | PENDING his listen | — | Not yet listened. |
| Irish | `gle` | PENDING his listen | — | Not yet listened. |
| Italian | `ita` | PENDING his listen | — | Not yet listened. |
| Japanese | `jpn` | PENDING his listen | — | Not yet listened. |
| Korean | `kor` | PENDING his listen | — | Not yet listened. |
| Latvian | `lav` | PENDING his listen | — | Not yet listened. |
| Lithuanian | `lit` | PENDING his listen | — | Not yet listened. |
| Nepali | `nep` | PENDING his listen | — | Not yet listened. |
| Norwegian | `nor` | PENDING his listen | — | Not yet listened. |
| Persian | `fas` | PENDING his listen | — | Not yet listened. |
| Polish | `pol` | PENDING his listen | — | Not yet listened. |
| Portuguese — Brazilian | `por_br` | PENDING his listen | — | Not yet listened. |
| Portuguese — European | `por` | PENDING his listen | — | Not yet listened. |
| Romanian | `ron` | PENDING his listen | — | Not yet listened. |
| Spanish — Iberian | `spa` | PENDING his listen | — | Not yet listened. |
| Spanish — Mexican | `spa_mx` | PENDING his listen | — | Not yet listened. |
| Swahili | `swa` | PENDING his listen | — | Not yet listened. |
| Swedish | `swe` | PENDING his listen | — | Not yet listened. |
| Thai | `tha` | PENDING his listen | — | Not yet listened. |
| Turkish | `tur` | PENDING his listen | — | Not yet listened. |
| Ukrainian | `ukr` | PENDING his listen | — | Not yet listened. |
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
