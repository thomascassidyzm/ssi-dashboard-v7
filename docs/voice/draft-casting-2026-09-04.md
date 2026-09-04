# Draft casting — every language, every Cartesia voice we have

*Run 2026-09-04. **This is a draft, not a recommendation.** No voice was chosen for being better than
another: per language and gender the EMPTY ranks were filled in order — primary, then backup — from
that language's Cartesia list in the vendor's own published order. Every row is stamped `draft casting
2026-09-04 — mechanical fill from the Cartesia catalogue in vendor order, no taste applied`, so a draft
is distinguishable from a decision at a glance on the screen.*

**Where to listen:** popty.app → Admin → Labs → Voice → **Languages**.

## What happened

- **146 slots cast** across **43 languages**, out of 150 planned. 4 refused (Finnish — correct, below).
- **Nothing was displaced.** Your clone `tom_001` still holds English male primary, untouched.
- **Languages with a Cartesia voice on primary: 1 → 43.** Languages with BOTH primaries cast: 0 → 42.
- **No audio changed.** `course_audio` 2,599,749 rows before and after; `audio_clips` 746,535 before and
  after; no render endpoint was called and no audio pass was queued. The only other table that moved is
  `voices` (314 → 427): casting a catalogue voice registers it first, which is what makes it selectable.

## The pool rule, stated plainly

The table holds **two ranks per gender** — primary and backup — and the screen renders only those two
(`VOICELAB_REQUIRED_RANKS=2`, left untouched: changing it changes every language at once and that is
your call). Cartesia publishes 209 male and 207 female English voices; there is no world in which all of
them are cast. So: where a gender has two or more voices, both ranks were filled — that is the "pool".
Where it has one, only primary. **The "voices available" column is the size of the pool the draft was
drawn from — more useful than the two names I happened to write.**

## Cast this run

| Language | Cartesia voices available (m / f) | Cast this run (m / f) | Pool or single | Note |
|---|---|---|---|---|
| `eng` | 209 / 207 | **1 / 2** — m: Daniel - Modern Assistant; f: Skylar - Friendly Guide, Gemma - Decisive Agent | pool | male primary left as Tom's clone **tom_001**; 5 skipped — vendor states no gender |
| `kor` | 4 / 10 | **2 / 2** — m: Taehyun - Friendly Host, Jaewon - Steady Advisor; f: Haeun - Polished Presence, Jihyun - Anchorwoman | pool |  |
| `por` | 9 / 10 | **2 / 2** — m: Felipe - Warm Assistant, Rafael - Dynamic Speaker; f: Eloá - Engaging Explainer, Alice - Informative Speaker | pool |  |
| `zho` | 7 / 5 | **2 / 2** — m: Feng - Taiwanese Query Specialist, Jianhao - Helpful Anchor; f: Jing - Clear Coordinator, Hua - Sunny Support | pool |  |
| `fra` | 33 / 35 | **2 / 2** — m: Étienne - Precise Specialist, Mathis - Analytical Explanator; f: Inès - Poised Communicator, Jade - Steady Companion | pool |  |
| `ita` | 7 / 6 | **2 / 2** — m: Fabio - Logistics Expert, Lorenzo - Hospitable Host; f: Elena - Client Liaison, Liv - Casual Friend | pool | 2 skipped — vendor states no gender |
| `spa` | 34 / 45 | **2 / 2** — m: Darío - Steady Operator, Ramon - Calm Coordinator; f: Ximena - Calm Navigator, Laura - Trustworthy Guide | pool |  |
| `jpn` | 14 / 19 | **2 / 2** — m: Yuto - Logistical Assistant, Naoki - Polished Professional; f: Ayumi - Sales Guide, Yuzuki - Composed Explainer | pool |  |
| `ben` | 1 / 2 | **1 / 2** — m: Rubel - City Guide; f: Pooja - Everyday Assistant, Ananya - Paced Helper | pool |  |
| `hrv` | 1 / 1 | **1 / 1** — m: Ivan - Bar Companion; f: Petra - Strict Lecturer | single |  |
| `ara` | 8 / 7 | **2 / 2** — m: Youssef - Clear Communicator, Zain - Dynamic Presenter; f: Huda - Approachable Speaker, Nour - Engaging Speaker | pool |  |
| `deu` | 17 / 16 | **2 / 2** — m: Clemens - Precise Instructor, Sebastian - Orator; f: Marlene - Elegant Speaker, Vreni - Diligent Advisor | pool |  |
| `ara_eg` | 8 / 7 | **2 / 2** — m: Youssef - Clear Communicator, Zain - Dynamic Presenter; f: Huda - Approachable Speaker, Nour - Engaging Speaker | pool | dialect of `ara`, drawn from its base catalogue |
| `ara_sy` | 8 / 7 | **2 / 2** — m: Youssef - Clear Communicator, Zain - Dynamic Presenter; f: Huda - Approachable Speaker, Nour - Engaging Speaker | pool | dialect of `ara`, drawn from its base catalogue |
| `deu_at` | 17 / 16 | **2 / 2** — m: Clemens - Precise Instructor, Sebastian - Orator; f: Marlene - Elegant Speaker, Vreni - Diligent Advisor | pool | dialect of `deu`, drawn from its base catalogue |
| `por_br` | 9 / 10 | **2 / 2** — m: Felipe - Warm Assistant, Rafael - Dynamic Speaker; f: Eloá - Engaging Explainer, Alice - Informative Speaker | pool | dialect of `por`, drawn from its base catalogue |
| `spa_mx` | 34 / 45 | **2 / 2** — m: Darío - Steady Operator, Ramon - Calm Coordinator; f: Ximena - Calm Navigator, Laura - Trustworthy Guide | pool | dialect of `spa`, drawn from its base catalogue |
| `ara_lb` | 8 / 7 | **2 / 2** — m: Youssef - Clear Communicator, Zain - Dynamic Presenter; f: Huda - Approachable Speaker, Nour - Engaging Speaker | pool | dialect of `ara`, drawn from its base catalogue |
| `bul` | 1 / 1 | **1 / 1** — m: Georgi - Conversationalist; f: Ivana - Instruction Provider | single |  |
| `ces` | 3 / 3 | **2 / 2** — m: Jan - Capable Coordinator, Marek - Steady Specialist; f: Milena - Composed Clarifier, Tereza - Decisive Agent | pool |  |
| `dan` | 2 / 2 | **2 / 2** — m: Søren - Steady Strategist, Soren - Executive Voice; f: Mette - Polished Facilitator, Katrine - Calm Caregiver | pool |  |
| `deu_ch` | 17 / 16 | **2 / 2** — m: Clemens - Precise Instructor, Sebastian - Orator; f: Marlene - Elegant Speaker, Vreni - Diligent Advisor | pool | dialect of `deu`, drawn from its base catalogue |
| `ell` | 1 / 1 | **1 / 1** — m: Nikos - Radio Storyteller; f: Despina - Motherly Woman | single |  |
| `fra_ca` | 33 / 35 | **2 / 2** — m: Étienne - Precise Specialist, Mathis - Analytical Explanator; f: Inès - Poised Communicator, Jade - Steady Companion | pool | dialect of `fra`, drawn from its base catalogue |
| `heb` | 11 / 18 | **2 / 2** — m: Noam - Broadcaster, Gil - Friendly Host; f: Ayala - Expert Narrator, Yarden - Trusted Advisor | pool |  |
| `hin` | 26 / 23 | **2 / 2** — m: Kabir - Service Integrator, Rohan - Steady Communicator; f: Siya - Bright Conversationalist, Sneha - Empathetic Voice | pool |  |
| `hun` | 2 / 1 | **2 / 1** — m: Bence - Focused Facilitator, Gabor - Reassuring Voice; f: Eszter - Customer Companion | pool |  |
| `ind` | 1 / 1 | **1 / 1** — m: Andi - Dynamic Presenter; f: Siti - Ad Narrator | single |  |
| `kan` | 1 / 1 | **1 / 1** — m: Prakash - Instructor; f: Divya - Joyful Narrator | single |  |
| `mar` | 1 / 1 | **1 / 1** — m: Suresh - Instruction Voice; f: Anika - Enthusiastic Seller | single |  |
| `nld` | 4 / 7 | **2 / 2** — m: Stijn - Helpful Handler, Thijs - Confident Coordinator; f: Noa - Reassuring Responder, Fleur - Vibrant Voice | pool |  |
| `nor` | 1 / 1 | **1 / 1** — m: Lars - Casual Conversationalist; f: Kari - Crisp Coordinator | single |  |
| `pol` | 5 / 5 | **2 / 2** — m: Marcin - Charismatic Presenter, Kacper - Diligent Detailer; f: Zofia - Audiobook Muse, Katarzyna - Melodic Storyteller | pool |  |
| `ron` | 1 / 1 | **1 / 1** — m: Andrei - Conversationalist Guy; f: Andrada - Steady Speaker | single |  |
| `rus` | 3 / 6 | **2 / 2** — m: Sergei - Steady Supporter, Alexei - Articulate Analyst; f: Tatiana - Friendly Storyteller, Irina - Poetic Voice | pool |  |
| `swe` | 5 / 5 | **2 / 2** — m: Vidar - Supportive Voice, Nils - Friendly Host; f: Freja - Informative Host, Ingrid - Peaceful Guide | pool |  |
| `tel` | 3 / 6 | **2 / 2** — m: Charan - Clear Concierge, Pavan - Bright Voice; f: Shanti - Calm Authority, Vidya - Empathetic Voice | pool |  |
| `tha` | 4 / 5 | **2 / 2** — m: Somchai - Star, Chakrit - Reliable Communicator; f: Supannee - Support Concierge, Nisa - System Navigator | pool |  |
| `tur` | 4 / 4 | **2 / 2** — m: Emre - Calming Speaker, Taylan - Expressive Voice; f: Leyla - Story Companion, Aylin - Warm Guide | pool |  |
| `ukr` | 1 / 0 | **1 / 0** — m: Oleh - Professional Guy; f: — | single |  |
| `guj` | 1 / 1 | **1 / 1** — m: Amit - Sports Student; f: Isha - Learner | single | known-side only |
| `pan` | 1 / 1 | **1 / 1** — m: Gurpreet - Companion; f: Jaspreet - Commercial Woman | single | known-side only |
| `tam` | 2 / 8 | **2 / 2** — m: Karthik - Customer Assistant, Arun - Lively Voice; f: Janani - Calm Professional, Akshara - Resourceful Assistant | pool | known-side only |

## Refused by design — not a gap

| Language | Cartesia voices (m / f) | Code | Why |
|---|---|---|---|
| `fin` | 3 / 2 | `HUMAN_RECORDED` | 4 slots refused; every course using it is human-recorded |

Finnish refused because `fin_for_eng` is human-recorded, so a synthetic cast would speak over real
recordings. The gate stopped it, I logged it and moved on — no workaround was attempted.

## Left uncovered — no Cartesia voice to draft

44 cast entities got nothing, for the reasons below. Their existing state was left exactly as
it was; no Azure or ElevenLabs substitute was considered.

| Language | Cartesia voices (m / f) | Why |
|---|---|---|
| `cym` | 0 / 0 | human-voiced language (Aran's / Catrin's recordings) — synthesis is never cast into it |
| `cym_north` | 0 / 0 | human-voiced language (Aran's / Catrin's recordings) — synthesis is never cast into it |
| `cym_south` | 0 / 0 | human-voiced language (Aran's / Catrin's recordings) — synthesis is never cast into it |
| `glg` | 0 / 0 | Cartesia publishes no voice for this language |
| `bre` | 0 / 0 | human-voiced language (Aran's / Catrin's recordings) — synthesis is never cast into it |
| `cat` | 0 / 0 | Cartesia publishes no voice for this language |
| `eus` | 0 / 0 | Cartesia publishes no voice for this language |
| `afr` | 0 / 0 | Cartesia publishes no voice for this language |
| `ceb` | 0 / 0 | Cartesia publishes no voice for this language |
| `cor` | 0 / 0 | Cartesia publishes no voice for this language |
| `est` | 0 / 0 | Cartesia publishes no voice for this language |
| `fas` | 0 / 0 | Cartesia publishes no voice for this language |
| `fur` | 0 / 0 | Cartesia publishes no voice for this language |
| `gla` | 0 / 0 | Cartesia publishes no voice for this language |
| `gle` | 0 / 0 | Cartesia publishes no voice for this language |
| `gle_connemara` | 0 / 0 | Cartesia publishes no voice for this language |
| `gle_munster` | 0 / 0 | Cartesia publishes no voice for this language |
| `gle_ulster` | 0 / 0 | Cartesia publishes no voice for this language |
| `hak` | 0 / 0 | Cartesia publishes no voice for this language |
| `hye` | 0 / 0 | Cartesia publishes no voice for this language |
| `isl` | 0 / 0 | Cartesia publishes no voice for this language |
| `lav` | 0 / 0 | Cartesia publishes no voice for this language |
| `lit` | 0 / 0 | Cartesia publishes no voice for this language |
| `lmo` | 0 / 0 | Cartesia publishes no voice for this language |
| `mkd` | 0 / 0 | Cartesia publishes no voice for this language |
| `mlt` | 0 / 0 | Cartesia publishes no voice for this language |
| `nan` | 0 / 0 | Cartesia publishes no voice for this language |
| `nap` | 0 / 0 | Cartesia publishes no voice for this language |
| `nep` | 0 / 0 | Cartesia publishes no voice for this language |
| `pdc` | 0 / 0 | human-voiced language (Aran's / Catrin's recordings) — synthesis is never cast into it |
| `rgn` | 0 / 0 | Cartesia publishes no voice for this language |
| `roh` | 0 / 0 | Cartesia publishes no voice for this language |
| `scn` | 0 / 0 | Cartesia publishes no voice for this language |
| `sme` | 0 / 0 | Cartesia publishes no voice for this language |
| `srp` | 0 / 0 | Cartesia publishes no voice for this language |
| `swa` | 0 / 0 | Cartesia publishes no voice for this language |
| `vec` | 0 / 0 | Cartesia publishes no voice for this language |
| `yid` | 0 / 0 | Cartesia publishes no voice for this language |
| `yor` | 0 / 0 | Cartesia publishes no voice for this language |
| `yue` | 0 / 0 | Cartesia publishes no voice for this language |
| `zzz` | 0 / 0 | Cartesia publishes no voice for this language |
| `aze` | 0 / 0 | Cartesia publishes no voice for this language |
| `sin` | 0 / 0 | Cartesia publishes no voice for this language |
| `urd` | 0 / 0 | Cartesia publishes no voice for this language |

## The undo — one command

```
cd /home/tomcassidy/SSi/ssi-dashboard-v7-clean && DRY_RUN=0 POPTY_ADMIN_TOKEN=<admin session token> \
  node tools/voice/draft-cast-2026-09-04-undo.cjs
```

`DRY_RUN=1` first shows what it would do. It clears **only** the slots this run wrote, and **only if they
still hold the voice this run put there** — so any slot you have since changed by ear is skipped and said
out loud. It never touches `voices` rows: those carry a foreign key that would cascade.

## One thing to notice about the dialects

A dialect entity is cast from its **base** language's catalogue, so `ara`, `ara_eg`, `ara_sy` and
`ara_lb` all drew the same two male and two female voices — as did `deu`/`deu_at`/`deu_ch`,
`por`/`por_br`, `spa`/`spa_mx` and `fra`/`fra_ca`. Mechanically that is exactly the rule applied. If you
want a dialect to *sound* different from its parent, that is a taste call and the screen is where to make
it — the pools are big enough in every one of those cases.

## One question for you

**Deeper pools?** Two ranks per gender is what the screen shows today. English has 209 male and 207 female
Cartesia voices; French 33/35; Spanish 34/45. Widen?

## One thing worth knowing

**All six of this estate's own Cartesia clones — `tom_001`, `Tom_002`, `Tom_003`, `aran_english_003`,
`tom_ita_002` and the new Italian sample — carry no gender at the vendor.** A voice with no stated gender
cannot fill a gendered slot, so none of them were auto-drafted; `tom_001` is on English male primary only
because you cast it there by hand yesterday. If you want the others draftable, that is one field at
Cartesia, not a change here.
