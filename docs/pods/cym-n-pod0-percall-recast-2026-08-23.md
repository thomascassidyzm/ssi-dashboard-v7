# cym_n pod-0 — per-conversation two-voice recast, and Aran was right

**2026-08-23.** Applied. Zero same-voice exchanges across all 22 scenes, with two voices and no script rewrite.

**New queue counts: Aran 80 Welsh lines, Catrin 151 Welsh lines** (80 + 151 = 231, the whole pod). Aran additionally holds all 231 English known-side lines as `__explainer__`, unchanged by this job — so his full queue reads 311 items and Catrin's 151.

---

## 1. Aran's dispute — upheld on all three scenes

Aran said the customers in the café, bar and restaurant scenes do not talk to each other; they each talk to the staff. The #129 audit built its graph from *consecutive speaker labels*, so a Customer 1 turn followed by a Customer 2 turn was scored as an edge between two customers. I read all 49 lines of scenes 7, 8 and 9 in both languages. He is right, and the Welsh makes it plainer than the English does.

Every customer line without exception uses the polite second-person **`chi`** aimed at the staff member, and carries a service formula that only makes sense pointed at staff: `Oes gynnoch chi…`, `Ga i…`, `os gwelwch yn dda`. Not one line anywhere in the three scenes uses `ti`, addresses another customer, or answers a question another customer asked. Every question in the three scenes is asked of staff and answered by staff.

The pairs I judged, and why:

| Pair | Reading | Verdict |
|---|---|---|
| 7:6 → 7:7 | C1 finishes their order ("takeaway please"), C2 opens a new one to the barista | not an exchange |
| 8:4 → 8:5 | C1 orders bitter, C2 orders cider — both from the bartender | not an exchange |
| 8:5 → 8:6 | C2 orders cider, C3 asks the bartender for the wine list | not an exchange |
| 8:8 → 8:9 | C3 orders white wine, C1 orders red — both from the bartender | not an exchange |
| 8:9 → 8:10 | as above, C1 then C2 | not an exchange |
| 8:14 → 8:15 | C1 asks for bread, C2 asks for sandwiches | not an exchange |
| 9:4 → 9:5 | C2 answers the *waiter's* water question; C5 re-hails him with `Esgusodwch fi` | not an exchange |
| 9:9 → 9:10 | C1 orders lamb, C2 orders risotto — both to the waiter | not an exchange |
| 9:12 → 9:13 | C1 asks the waiter for the wine list, C2 names a wine | not an exchange |
| 9:16 → 9:17 | C1 orders coffees, C2 asks for the bill (`pan fyddwch **chi**'n barod`) | not an exchange |

**The two I weighed hardest, and would flag for a second ear:**

- **8:14, C1: "Can we have some bread? And a bowl of chips for the table."** The `ni` and "for the table" say these customers are a group, which is the strongest hint in the pod that they might be talking among themselves. But the request itself is `Gawn ni…` to the bartender — it is an order, not a conversation. Non-exchange.
- **9:12 → 9:13.** C1 asks the waiter for the wine list; C2 says "a bottle of the house red would be lovely." That could be read as C2 answering C1. I judged it as C2 ordering, because the whole scene's addressee is the waiter and C2 never uses second-person to C1 anywhere. This is the one genuinely ambiguous pair in the job, and it is worth Aran's ear. **It does not change the outcome**: both diners are Catrin either way, so if this pair *is* an exchange, scene 9 gains one collision that two voices cannot remove — and that would be the single scene needing a rewrite. On my reading it does not.

**Consequence:** with those ten pairs out, the exchange graph has no triangles. Every scene is a star — staff at the hub, customers on the spokes — and stars are always 2-colourable. **The "third voice or script rewrite" fork evaporates.**

## 2. What the numbers say

| Metric | Before | After |
|---|---|---|
| #129 metric (consecutive speaker labels, zero tolerance) | **12 pairs / 45 turns** | 5 pairs / 10 turns |
| **Exchange metric** (genuine exchanges only) — the pass mark | 12 / 45 | **0 pairs / 0 turns** |

For comparison with the Spanish fix, which took 71 adjacent-turn collisions to 11 and 17 same-voice pairs to 4: this one goes 45 → 0 on turns and 12 → 0 on pairs, in the currency that matters.

**The honest residue.** Ten consecutive turns still land on one voice — all ten are the customer-to-customer pairs in the table above. That is not a leftover; it is the direct, unavoidable consequence of Aran's own argument. Three customers ordering from one bartender, with only two voices, *must* share a voice: the bartender takes one, and everyone who speaks to the bartender takes the other. A learner will hear Catrin order cider and then Catrin order wine, as two different customers at the same bar. Nobody talks to themselves anywhere in the pod. **If you want those ten gone too, that needs a third voice — and that is the only thing in this job that would.**

## 3. The cast

Casting is per conversation. The reused labels that needed to be two different voices in two different scenes were made scene-unique — 34 rows, `speaker` only, no text touched:

- scene 7: `Barista` → **Cafe Barista**, `Customer 1/2/3` → **Cafe Customer 1/2/3**
- scene 8: `Customer 1/2/3` → **Bar Customer 1/2/3**
- scene 9: `Customer 1/2` → **Diner 1/2**

Everything else kept its name. `Barista` still means the scene-3 barista, `Customer` still means the shop and pharmacy customer, and so on — those never needed to differ.

**Aran (male)** — Narrator, `__explainer__`, Neighbour, Passenger, Barista (sc. 3), Friend, James, Cafe Customer 1/2/3, Bartender, Waiter, Assistant, Guest, Pharmacist, Local.

**Catrin (female)** — Sarah, Anna, Cafe Barista, Bar Customer 1/2/3, Diner 1/2, Customer, Receptionist, Tourist, Driver, Learner.

Note the per-conversation flip Tom described, working exactly as intended: in the café the staff are Catrin and the customers Aran; in the bar and the restaurant the staff are Aran and the customers Catrin.

**Two things drove the solve, and both are worth knowing.** First, the Narrator closes 16 of the 22 scenes and under zero tolerance gets no carve-out, so it is an edge with each of those scenes' last speaker — that single constraint propagates through most of the pod and fixes far more of the cast than the dialogue does. Second, of the two valid colourings, Narrator=Aran is the one that keeps Anna female and James male; Narrator=Catrin forces both of them against gender. **There are no forced gender mismatches in the applied cast** — every gendered name landed on its own gender, and only the neutral labels (Driver, Tourist, Customer, the numbered customers) were assigned on graph grounds.

## 4. Re-recording: 30 lines

51 lines changed voice. **30 of them already carry a human take** — 29 that were Aran's and are now Catrin's, and 1 the other way. Those 30 need re-recording in the new voice.

Nothing was unlinked and nothing was deleted. All 91 target links and 13 known links are exactly where they were; the old take stays until a new one exists. Verified after the write.

**The queue does the right thing on its own.** `finalizeRecordingPlan` in `services/voice-engine/pods-plan.cjs` marks a line `recorded` only when its linked clip is `origin='human'` **and** its `voice_id` is in the requesting voice's accept set — voice-based, not link-based. So a line that flipped from Aran to Catrin appears in Catrin's queue as *not recorded*, which is what we want. It does not silently read as done.

## 5. What was written, and what was not

Applied in one transaction, with a per-row before-state assertion on every relabel (`update … where id = $2 and speaker = $3`, abort unless exactly one row):

- `listening_pod_sentences.speaker` — 34 rows
- `courses.voice_config.podCast` — rewritten to the cast above; dead keys pruned (the archived pod `pod-0-gated-2026-08-06` holds zero sentences, so no other pod reads them)

Not touched: `target_text`, `known_text`, every `*_audio_id`, and `voice_config.voices` — the last asserted byte-identical before commit, since it drives live TTS serving. No TTS, no deletions, no `pod-recolour.cjs`.

The pod's `visibility` is `held`, checked in the same transaction as a refuse-condition rather than assumed — that hold is what makes an in-place edit safe under the content-change migration protocol, and progress is slot-keyed so a speaker-label change cannot mis-credit anyone.

## 6. One reconciliation, stated rather than smoothed

The brief carried a prior figure of ~125 lines in Aran's queue and ~101 lines with a human take. Derived fresh from the live DB through `buildRecordingPlan`, the pre-recast numbers are **87 Welsh lines for Aran** and **91 rows with a target take**. I could not reproduce 125 or 101 from any read path I have, and I have not chased where they came from — the numbers above are the ones I derived myself and can show working for. Flagging the gap rather than papering it.

---

**Tools:** `tools/pods/cym-n-pod0-percall-recast.cjs` (dry-run by default, `--apply` to write).
**Logs:** `docs/pods/cym-n-pod0-percall-recast-2026-08-23-dryrun-log.json`, `…-applied-log.json` — per-row, including every relabel, every voice flip, and the ten residual pairs.
