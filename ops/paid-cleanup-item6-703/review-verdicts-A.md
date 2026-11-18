# Item 6 independent review — shard A

**Revise the plan before application: 240 AGREE, 38 DISPUTE.** Every assigned row has one verdict in `review-verdicts-A.json`; optional AGREE explanations are omitted. Nothing was applied to a course.

Assumption: the re-dispatch limits this review to the three courses below. Other courses are excluded. Reviewed plan: `origin/cs/703-paid-cleanup-item-6-wrong-target` at `bb8d2420cfa2dcf3f3dac9165ee8fe47f4f5e4c1`, plan build `2026-11-18T13:23:15Z`.

| Course | AGREE | DISPUTE | Total |
| --- | ---: | ---: | ---: |
| jpn_for_eng | 93 | 31 | 124 |
| kor_for_tam | 119 | 2 | 121 |
| kor_for_hin | 28 | 5 | 33 |

## Decisions that change the plan

- **Japanese past wishes:** reject the absolute first-person-only premise. Makino & Tsutsui, *A Dictionary of Basic Japanese Grammar*, pp. 441–445, **Notes 1, exception (1)**, permits third-person past wishes; the plan misidentifies Note 3. The course itself uses third-person past `書きたかった` in SEED52. Preserve canonical person where no independent defect exists; several rows need exclusion for separate untaught-form defects. [Reference text](https://win95peko.github.io/itazuraneko/grammar/dojg/dojgbasic.html).
- **Held seeds 34/35 have a repair:** first-person English plus removal of `彼は`/`彼女は` preserves every target teaching chunk. Those pronouns were introduced earlier, not in these seeds. Re-gloss their desire carriers and update the seed copies (`S0034L02U04`, `S0035L03U08`) in the same package. **Keep seed 16 out:** it actually introduces `彼は`, so that shortcut removes its teaching material. K13 allows the considered known-side repair; a previous approval alone does not authorise unrelated seed rewrites.
- **Japanese residual failures:** `S0040L01` creates a new “how do you feel” clash with `S0657L02/B01`; SEED113 omits its U09 copy; B01/B02 in its basket remain identical. Several re-glossed rows retain untaught target forms, including `助けたい`, `二日間`, `疲れた`, `しようとしてた`, `話そうとすると` and standalone `したかった`. `言った` arrives at 296, `出かけたかった` at 349 and `飲みたい` at 625. SEED299 still has no teaching carrier for `払いたい`, while its `払う` LEGO is absent from the seed’s exact surface. “Method” is not a taught English gloss until 327. Exact row decisions and alternatives are in JSON.
- **Japanese decisions retained:** `ううん` can naturally correct an assertion before a positive clause; it need not be replaced by yes. The “didn’t expect” and “don’t remember” meanings are sound, subject to the separately flagged row defects. Shared first-person **we** is possible; grammar does not require **I**. [Daijisen, ううん](https://kotobank.jp/word/%E3%81%86%E3%81%86%E3%82%93-438476).
- **Korean for Tamil:** the humble pronoun changes fit the established course baseline and retain polite endings. Choo & Kwak, *Using Korean*, §3.2.1, allows both 나 and 저 with 해요: consistency, not a universal grammar ban, justifies the changes. Keep gender-neutral `선생님` for madam. Dispute `S0227L02U05/L03U05`: Tamil `அவரும்` says “he too”, which the proposed Korean still omits. [NIKL 선생님](https://krdict.korean.go.kr/eng/dicMarinerSearch/search?mainSearchWord=%EC%84%A0%EC%83%9D%EB%8B%98&nation=eng), [McAlpin, entry 166](https://dsal.uchicago.edu/dictionaries/mcalpin/McAlpin_Tamil.pdf).
- **Korean for Hindi:** accept ordinary first-person `싶었어요` and its propagated repairs. Reject the four S0021L02 holds’ presentation-authority rationale: K23(e)(2) explicitly permits an explained, BUILD-only introduction. Remove the tags only as part of that package; U01–U05 still lack owner-gender context, and both ownership senses require the K23(f) audit. A female learner subject does not identify a female owner. Dispute S0655L02U02’s bare `श्रीमती`: it is a pre-name title, not the intended stand-alone madam address. [Hindwi श्रीमती](https://www.hindwi.org/hindi-dictionary/meaning-of-shriimatii).

## Live evidence and limits

The unchanged, merged `ops/paid-cleanup-scan-447/dump-course.py` was run **after 14:10Z**, sequentially: Japanese (667 seeds / 1,275 LEGOs / 13,964 phrase records), Korean for Tamil (668 / 1,505 / 14,412), then Korean for Hindi (668 / 1,502 / 14,851). **All 278 current pairs matched the plan.** Source: `http://localhost:3470/api/production/<course>/script-view?seedStart=S0001&seedEnd=S0050` and subsequent windows. No direct database access.

Inspected the named seeds, teaching carriers, component inventories, copied rows, gender-owner baskets and course-wide occurrences of disputed surface forms. Ran the supplied checker on JSON only and a separate check respecting LEGO introduction order. Both Korean plans introduce no target-vocabulary, clash or duplicate failures; their new count warnings are not blockers. Japanese’s checker confirms the new ZUT clash, duplicate and unresolved vocabulary reports. It is not a full certificate: it checks touched seeds, admits later sibling LEGOs and omits known-side validation. Manual inspection resolved misleading flags for previously seen words and permitted known-side inflections; machine output alone was not treated as a verdict.

**EXPLICIT GAP:** Japanese teaching/tiling failures and the wider Hindi K23 presentation/context repairs remain unresolved application work. The suggested pairs are review proposals, not a fully rebuilt, certified application batch. No course writes, audio renders, tests, typecheck or build were run.

Landing: `cs/722-item-6-plan-review-shard-a-adver`; pushed for review, not merged, not deployed.
