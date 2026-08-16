# The Spanish pool now says Manuel — and a re-sync can no longer stomp your cast

**2026-08-16.** The trap named twice in the T-17 doc and again in yesterday's A-109 re-check is closed on the target side. Two things changed: voice pools can now carry a locale, and the Spanish pool now encodes the cast you approved by ear on 2026-08-14.

Nothing was rendered, nothing was deleted, no pod was re-synced, and no cast was rewritten. One `app_config` row was edited, with a full backup in the log.

---

## What the trap was

Your approved Iberian cast — **xAI Manuel `yis75yfp` @ es-ES** on the male target seats, **Azure Elvira** on the female ones — lived only in `listening_pods.speakers`. The voice pool still said Azure **Alvaro**, because a pool entry could not express a locale and Manuel without his `es-ES` steering tag is not the voice you listened to.

So anyone re-syncing `spa_for_eng` from its markdown would have recast Manuel back to Alvaro. The cast fingerprint would have moved, your approval would have stopped matching, and the render would have blocked — the gate working correctly, on a problem that should never have existed.

## Measured, before the change

The verifier is read-only: it loads the live pods, computes the fingerprint of the stored cast, then runs the same speaker labels back through the live casting code against the live pools and computes what a re-sync *would* store.

| | |
|---|---|
| stored cast fingerprint | `29cc217afb5fa101` — **matches the approval on record** |
| what a re-sync would have stored | `4363d7c02754f82d` |
| target seats that would have moved | **55** — every Manuel seat back to Alvaro, exactly as predicted |

## What changed

**1. Pool entries may carry a `locale`.** The casting resolver now copies it onto the cast voice, on both the per-speaker path and the `_default` block. A malformed locale throws rather than being silently dropped — a silently dropped locale is the bug being fixed.

**Backwards compatibility, measured rather than assumed:** the estate has **146** pool entries across **46** pool keys. After this change **2** carry a locale (the two Spanish ones added below). Casting every one of the 46 keys under the old code and the new code produces byte-identical output for **45** of them; the one that differs is `spa`, which is the intended change.

**2. The Spanish pool now encodes your cast.**

| slot | before | after |
|---|---|---|
| `spa.m` position 1 (the one a re-sync picks) | Azure Alvaro | **xAI Manuel `yis75yfp` @ es-ES** |
| `spa.m` rest | Pablo, Carlos | Alvaro, Pablo, Carlos — nothing deleted, Alvaro moved down |
| `spa.f` position 1 | Azure Elvira, no locale | **Azure Elvira @ es-ES** |
| `spa.f` rest | Maria, Lucia | unchanged |
| every other pool key | — | untouched, verified |

`spa_mx` was not touched: Mexican Spanish is still your open listening decision.

## Measured, after the change

| | |
|---|---|
| stored cast fingerprint | `29cc217afb5fa101` — unchanged, still matches the approval |
| what a re-sync would now store | `92ab0ed61dbc6741` |
| **Manuel seats stomped back to Alvaro** | **0 — the trap is closed** |
| target seats that still move | 8, all of them a gender question (below) |
| known (English) seats that still move | 55 (below) |

### The two things that still move — reported, not papered over

**The known side still diverges, and this job could not fix it.** Your stored cast carries **6 English voices** (Tom's clone, Olivia, Leo, and three Azure en-GB voices on `travel-situations`). Pool-driven casting is a two-hander by rule — one male, one female — so it can only ever produce **2**. Of the 55 known-side moves, 45 are the locale field alone (same voice, `en` → blank, because the `eng` pool carries no locale) and 10 are genuinely different voices: the three Azure en-GB voices on `travel-situations`, Leo → your clone, and two Learner seats.

I did not "fix" this by editing the `eng` pool, rewriting your stored cast, or raising the two-voice limit — all three would have faked a pass. **The real fix is a decision for you, not for this job: pod-sync could preserve an existing approved cast on re-sync instead of re-deriving it.** That is one sentence of policy and a small change; it is also the thing that would make every future approval durable rather than just the Spanish one. My recommendation is that we do it, as its own scoped piece.

**Eight target seats are a gender question, not a locale one.** Speakers with no `(F)`/`(M)` marker in the markdown — Customer, Narrator, Passenger, Customer 1, Agente, Learner — are stored on Elvira but resolve male by rule, so a re-sync would move them Elvira ↔ Manuel. Both voices are yours; only which character gets which is in question. The fix is markers in the markdown, not code — and it is out of scope here.

## Blast radius, stated plainly

The `spa` pool is also the *known*-side pool for `cat_for_spa`, `eng_for_spa` and `eus_for_spa`, and the target pool for `spa_for_jpn`, `spa_for_cym` and `spa_for_zho`. None of them was re-synced, so nothing changed retrospectively — but a future cast for any of them now picks Manuel/Elvira instead of Alvaro/Elvira.

**One line that deserves your eye:** `spa_mx_for_eng` has `target_lang = 'spa'`, not `spa_mx` — so it resolves to the *Iberian* pool and the `spa_mx` pool is unreachable for it. That was already true before today (it would have picked Alvaro, equally Iberian), and its stored cast is a different patchwork again, so I have changed nothing about how wrong it is. But if a Mexican course is ever re-synced it will be cast Iberian, and that is worth fixing when you next look at Mexican Spanish.

## Reversibility

The apply log holds a full backup of the entire `pod_voice_pools` row as it was before the edit, so the change is one write to undo.
