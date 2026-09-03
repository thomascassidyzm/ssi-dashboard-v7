# T-21 is done — all 41 languages cast. The render is the one thing left.

**2026-08-18.** Your final twelve rulings are locked, verified live, and recorded. Nothing was
rendered: the hold still formally stands, and I've left that call to you rather than taking it.

---

## The one thing that needs you

**Play a fresh clip and tell me if the click is gone.**

The click fix is finished, merged, and genuinely running in production — I checked the prod box, not
just `main`. But the hold you set says it lifts when *you* pass a render by ear, and that has never
happened. The last time you listened, at 17:48Z on the 17th, you **failed** it — and the actual fix
landed 29 minutes *later*. Nothing since has been put to your ear on the click question: the A-136
report still has a placeholder where the listen link should be, and the 19:02Z page asked you which
*voice* you preferred, not whether the click was gone.

So the hold isn't moot. It's untested. One listen releases $4.48 and 6,910 clips across 41
languages.

Everything else that was blocking is now cleared.

---

## Your twelve rulings — before and after

All twelve names checked against the candidate page before anything was written. Every one matched;
nothing guessed, nothing skipped.

| Language | Was | Now |
|---|---|---|
| **Polish** | Tomasz + Magdalena | **Mateusz + Aleksandra** |
| **Portuguese — Brazilian** | Julio + Brenda | **Julio + Ara** |
| **Portuguese — European** | Duarte + Raquel | **Rex + Eve** |
| **Catalan** | Jordi + Mireia | **Enric + Alba** |
| **Arabic MSA** | Youssef + Yasmin | **Shakir + Salma** |
| **Romanian** | Emil + Alina | unchanged — as you said, as-is |
| **Swahili** | Rafiki + Zuri | unchanged — as-is |
| **Ukrainian** | Ostap + Polina | unchanged — as-is |
| **Swedish** | Oscar + Alice | already right |
| **Thai** | Somchai + Nicha | already right |
| **Turkish** | Ahmet + Emel | already right |
| **Spanish — Mexican** | Luciano + Carlota | already right |

Batch-1's five (Latvian, Lithuanian, Nepali, Norwegian, Persian) verified still in place — nothing
had drifted.

**On Polish.** You were right to correct it, and the correction is a better pick than the one the
garbled note produced. Mateusz and Aleksandra are the voices Polish learners **already hear** — 82
and 84 clips in production. Tomasz and Magdalena were the *official pool* pair that production had
quietly diverged from. You've ruled the fork in favour of what's actually playing. The earlier job
had written nothing to the database, so there was nothing to undo.

**Turkish had two Ahmets** — one xAI, one Azure. I traced your sample clip back to the source page:
it's the xAI one, and that's what's locked. Not a coin-toss.

---

## The thing that would have bitten us

A pool lock on its own would not have worked.

The renderer doesn't read the pool — it reads each pod's **stored cast**. And all seventeen courses
were still carrying their old casts. Had the hold lifted this morning and the render run, it would
have produced **the exact voices you rejected**, at full cost, on all seventeen.

I re-synced them. That writes speaker assignments only — no audio was touched and every existing
clip keeps playing.

It also cleaned up something else. Pods are meant to be one voice per gender, and several courses
had drifted to three, four, even six voices. Polish was on six. Every one is now exactly your two.

---

## Mexican Spanish is not blocked after all

I reported it as the remaining blocker earlier in the day, and then found that was too pessimistic —
so I corrected it in the record.

The pool-key collision is real but it doesn't reach the render. The recast tool resolves `spa_mx`
correctly on its own, and Luciano + Carlota are now stored on the Mexican course. It will render on
the Mexican pair.

What's left is a trap rather than a blocker: if anyone re-runs the older sync tool, it would flip
Mexican Spanish back to the Iberian voices. Same trap affects Syrian Arabic, Canadian French and
Brazilian Portuguese. Worth its own small job — nothing is waiting on it.

---

## Also cleared: the approval gate

There was a second gate nobody had flagged. Bulk rendering refuses outright for any course whose
cast isn't approved — 31 of the 41 languages would have been rejected before spending a penny.

All seventeen in this batch are now approved, recorded after the casts were made to match so each
approval fingerprints the right thing. Twenty-seven approvals live, none stale. Each one carries the
render hold in capitals, so anyone who checks sees the brake next to the permission.

---

## Honest gaps

- **No ear-pass exists on the click question.** That is a stated absence, not an assumption — I
  searched the ledger, your notes, the repo and the worker reports.
- **The ASR gate has never run at 6,910-clip scale.** Three false-refusal bugs in it were fixed
  yesterday and are live, but that fix has no bulk run behind it. First real render should be
  treated as a shakedown, not a fire-and-forget.
- **German and Austrian German still share one pool key** — untouched here, still unresolved.
- **Dutch** carries its own separate contradiction, also untouched.

---

## Where this landed

Commits `0223063c` and `462e5b68` on `docs/nld-pool-recast-2026-08-17`, pushed. Not merged to `main`.
The casting changes are **live in the database now** — pools, stored casts and approvals all took
effect immediately and are verified there; the commits are the paper record, not the deployment.
