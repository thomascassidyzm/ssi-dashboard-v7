# The twelve silent English prompts — what the live data says

**2026-09-02. Read-only forensic pass against the live database and S3 directly. Nothing was rendered, edited, deleted or moved.**

Tom's challenge was: *dropping a supplier does not delete already-rendered audio from S3 — so either these twelve were never rendered, or something in our own pipeline deleted or orphaned them.*

**Tom is right, and the answer is the first branch. Nothing was deleted. Nothing was orphaned in S3. The twelve English prompts are twelve English sentences that did not exist until yesterday afternoon, and no audio has ever existed for them.** Every clip that was ever rendered for the old wording is still alive in the bucket, byte for byte, and is still in the database. 716 objects were checked directly against S3 in this pass and 716 are alive; not one is missing.

Two further things fell out of the check, and both bear on the decision Tom is holding open. They are in sections 4 and 5, and they matter more than the twelve do.

---

## 1. First correction: they are not Irish

The report that raised this described "Irish, Gaelic, Portuguese and Spanish" work, and the twelve got attached to the Irish half in the retelling. They are not Irish.

The twelve are:

| Course | Count |
|---|---|
| **Brazilian Portuguese for English speakers** | 11 |
| **Mexican Spanish for English speakers** | 1 |

The Irish and Scottish Gaelic items in the same repair pass are a separate matter and are **not** silent for this reason: Connacht Irish has no audio at all yet, and the two Irish cards that did change were re-pointed at clips from February that already said the right words. Nothing there was lost.

### The twelve, named

Brazilian Portuguese (`por_br_for_eng`) — the English prompt, as it now reads:

| Phrase | English prompt (current) |
|---|---|
| S0461L02B03 | yes, where I can buy |
| S0461L02U01 | no, a shop where I can buy |
| S0461L02U02 | that's true, a shop where I can buy |
| S0461L02U05 | I'm sure, a shop where I can buy |
| S0482L04B02 | real hope is that they're not serious |
| S0482L04U04 | yes, the only real hope is that they're not serious |
| S0482L04U05 | I'm sure, the only real hope is that they're not serious |
| S0532L02B03 | yes, unless they're still lucky |
| S0532L02U02 | no, unless they're lucky |
| S0532L02U03 | that's true, unless they're lucky |
| S0532L02U05 | I'm sure, unless they're lucky |

Mexican Spanish (`spa_mx_for_eng`):

| Phrase | English prompt (current) |
|---|---|
| S0668L02B02 | yes, I hope they can |

All twelve were last edited on **1 September 2026**, between 17:56 and 18:01 UTC, by yesterday's bound-form repair pass. All twelve currently have **no English clip attached**. All twelve still have their Portuguese/Spanish audio attached and working.

---

## 2. Did audio ever exist for these twelve? No — and here is the proof

The database stores an English clip against the exact English sentence. I searched the whole English clip inventory of both courses for each of the twelve sentences as they now read. **Zero matches. Not one of the twelve English sentences has ever had a clip, in any voice, from any supplier.**

That is because **the English sentence itself changed yesterday.** The repair grew each chunk leftwards to pull in the word that licenses the subjunctive, and the English prompt grew with it:

- "yes, I can buy" → **"yes, where I can buy"**
- "yes, lucky" → **"yes, unless they're still lucky"**
- "they're not serious" → **"real hope is that they're not serious"**
- "yes, they can" → **"yes, I hope they can"**

These are new sentences. Nobody has ever recorded them because until 17:56 yesterday they did not exist.

---

## 3. The old clips are all still there — verified in S3, not in a database field

The clips for the *previous* wording are all present. I did not trust the stored path: I asked S3 for each object directly.

| Old English prompt | Voice | Stored in S3 | Object live? |
|---|---|---|---|
| yes, I can buy | Tom clone (xAI) | 2026-07-29 | **ALIVE**, 19,008 bytes |
| no, I can buy | Tom clone (xAI) | 2026-07-29 | **ALIVE**, 16,704 bytes |
| that's true, I can buy | Tom clone (xAI) | 2026-07-29 | **ALIVE**, 18,144 bytes |
| I'm sure, I can buy | Tom clone (xAI) | 2026-07-29 | **ALIVE**, 19,584 bytes |
| they're not serious | Tom clone | 2026-07-29 | **ALIVE**, 16,128 bytes |
| yes, they're not serious | Tom clone (xAI) | 2026-07-29 | **ALIVE**, 17,568 bytes |
| I'm sure they're not serious | Tom clone (xAI) | 2026-07-29 | **ALIVE**, 16,992 bytes |
| yes, lucky | Tom clone (xAI) | 2026-07-29 | **ALIVE**, 13,248 bytes |
| no, lucky | Tom clone (xAI) | 2026-07-29 | **ALIVE**, 12,384 bytes |
| that's true, lucky | Tom clone (xAI) | 2026-07-29 | **ALIVE**, 20,736 bytes |
| I'm sure, lucky | Tom clone (xAI) | 2026-07-29 | **ALIVE**, 15,552 bytes |
| yes, they can (Spanish course) | Tom clone (xAI) | 2026-07-29 | **ALIVE**, 13,536 bytes |

Twelve for twelve. They are now **unlinked** — no card points at them any more, because the card's English text moved on — but nothing deleted them and nothing moved them. This is the ordinary, designed consequence of editing a sentence: the old recording of the old sentence stops being used. It is not the 3 August incident shape, where rows were destroyed before replacements existed.

**No deletion or cleanup process touched these.** The database's own edit-provenance log is effectively empty (two rows in the entire estate, both from an unrelated pass on 1 September) — that is a real gap in our forensics and I name it as one — but it does not change the conclusion, because the conclusion rests on the S3 objects themselves being intact and on the new English text having no clip anywhere.

---

## 4. The reason given for not re-recording them does not hold up

The report said: *"that voice sits on a provider that was retired for new renders on 27 August — the render is refused outright."*

**The live data contradicts this.** Tom's clone on that supplier rendered brand-new audio on 28 August and again on 1 September — the same day, five to seven hours before the repair worker declared it refused:

| When | Course | Voice | What |
|---|---|---|---|
| 2026-08-28 11:48 UTC | Swiss German for English | **Tom's clone, xAI** | 26 new presentation clips, new objects in S3 |
| 2026-09-01 11:06 UTC | English for Hindi speakers | **Tom's clone, xAI** | new clip, "I'm going to practise speaking", new object in S3 |
| 2026-09-01 10:49–12:29 UTC | Italian, English for Hindi | xAI female clone | 58 new clips, new objects in S3 |

I confirmed these are genuinely new renders, not re-links: the S3 objects carry last-modified stamps within a second of the database row being created. The 1 September Tom-clone object was written at 11:06:12 UTC. The repair worker wrote its "refused outright" line between 17:57 and 18:01 UTC the same day.

I found **no code gate anywhere in the repo that refuses xAI renders**, and the xAI credential is present and in use. There is a *policy* — Tom's 27 August ruling that **Cartesia is for new audio only, no bulk regeneration, existing clips stand** — but that is a ruling about not re-doing existing audio, not a technical block on the old supplier.

So the honest position is: **either the render would in fact have worked, or something specific to that render path failed and was misdiagnosed as a provider retirement.** I could not distinguish these two without attempting a render, which this pass was forbidden to do. That is the one open question in this report and it is worth ten minutes of somebody's time, because it decides whether the twelve are blocked at all.

---

## 5. "It would put a stranger's voice into an English track that is otherwise all Tom" — this is only half true

Counting every English prompt clip actually in use in these two courses:

| Course | Azure voice | Tom's clone |
|---|---|---|
| Brazilian Portuguese | **6,111** (Bella) | 6,545 |
| Mexican Spanish | **7,158** (Sonia) | 4,980 |

**Both English tracks are already mixed, and in Mexican Spanish the Azure voice is the majority.** The course-level framing in the report is wrong.

But the card-level concern is real, and it is the one that matters to a learner: I checked the immediate neighbours of each of the twelve — the other rungs on the same ladder — and they are almost all Tom's clone. A learner working through seed 461 or 532 would hear Tom, Tom, Tom, then one Azure voice, then Tom. That is a genuine taste question, and it was right not to decide it unilaterally. It is just not the question the report described.

---

## 6. Is this a symptom of something wider? Not in the way feared

I checked whether any of the estate's ~790,000 clone-voice clips are missing from S3. A random sample of 300, spread across every course and every clone voice, was checked object by object: **300 alive, 0 missing.** A further 400 randomly-sampled English clips from the two affected courses: **400 alive, 0 missing.** There is no evidence anywhere of our pipeline deleting live audio.

There *is* a wider pattern, but it is a different one, and it is a backlog rather than a loss. **41 built courses carry small pockets of English prompts with no clip attached — 1,035 phrases in total.** The largest are Spanish for English speakers (327), Chinese (138), Chinese for Japanese speakers (76), German for Japanese speakers (64). Their dates cluster on edit days:

- Spanish: 300 of its 327 all stamped **6 August**, in one batch — these read as newly-added phrases from a gap-fill pass that were never rendered, not as edits that lost their audio.
- Portuguese for English: 18 stamped **3 August**.
- Brazilian Portuguese: 10 stamped 29 July, 3 stamped 6 August, and yesterday's 11.

Every one I inspected has the same signature as the twelve — **new or changed English text that no render pass has caught up with**. So the shape is: *we edit text faster than we re-render it, and the gap is invisible unless someone counts.* Roughly a thousand English prompts across the estate are currently silent for that reason. That is the finding worth acting on, and it is a queueing problem, not a data-loss problem.

Both affected courses do have a pending audio-pass request logged against them, so the twelve are on a list rather than lost. I did not verify that the other 1,023 are.

---

## 7. What I could not establish — stated plainly

- **Why the render was believed to be refused.** No code gate exists, the credential is live, and the same voice rendered successfully hours earlier. Whether an attempt was actually made, and what it returned, is not recorded anywhere I could find. Settling this needs one render attempt, which this pass was not permitted to make.
- **Edit provenance.** The database's `content_edit_events` log holds two rows for the entire estate. There is no stored before-and-after for yesterday's text changes; the old wording in section 3 is reconstructed from the surviving orphaned clips and the repair worker's own write-up, both of which agree. This is a real hole in our ability to audit content changes and it is worth closing.
- **The other 1,023 silent prompts** were counted and dated, not individually diagnosed. The four I sampled were all "new text, never rendered".

---

## 8. What this means for the decision Tom is holding

The question was framed as "authorise a new clone of your voice on a new supplier so we can re-record twelve lines." On the evidence, that framing is not load-bearing:

- The twelve are not a loss. Nothing was destroyed and nothing needs recovering.
- The old supplier appears to still work, including for Tom's clone, as recently as the day the block was declared.
- The twelve are twelve new sentences among roughly a thousand English prompts estate-wide that are waiting on a render pass.

**The decision that actually needs Tom is not about twelve clips. It is whether the roughly one thousand silent English prompts get a render pass, and in which voice** — and, before even that, ten minutes to establish whether the old supplier is genuinely refusing or was misdiagnosed. Nothing about the Cartesia authorisation is forced by these twelve.
