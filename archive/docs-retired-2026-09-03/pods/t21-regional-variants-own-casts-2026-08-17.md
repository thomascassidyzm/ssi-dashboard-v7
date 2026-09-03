# T-21 — regional variants can now hold their own casts

2026-08-17. Follow-up to the 41-language casting listen.

## The six languages can each hold their own cast now

German and Austrian German were sharing one casting slot, and you had ruled opposite pairs
either side of it — German on Moritz and Lena, Austrian German on Felix and Sonja. Locking
either one would have silently recast the other, which is why the casting worker locked
nothing for those six. That is fixed. Each course now carries its own voice-pool key, so
German, Austrian German, Arabic MSA, Egyptian Arabic, Syrian Arabic, French and Québécois
French are seven genuinely separate slots rather than three shared ones.

Proved by re-running the recast in dry-run, reading only from stored data with no manual
fix-up afterwards:

| | resolves to | your ruling |
|---|---|---|
| German | Moritz + Lena | ✅ as ruled |
| German (Austrian) | Felix + Sonja — **0 voice changes** | ✅ already right, untouched |
| Egyptian Arabic | Rex + Eve | ✅ as ruled |
| Syrian Arabic | Laith + Amany | ✅ as ruled |
| Québécois French | Antoine + Sylvie | ✅ as ruled |
| French | Henri + Celeste (pool, unchanged) | ⏳ **waiting on your one word** |
| Arabic MSA | Youssef + Yasmin | ⛔ you rejected all four — **do not cast or render** |

Two things still need you. **French base** is the one you haven't ruled on: pool pair Henri
and Celeste versus the production voices. I built the tagging so French and Québécois can
hold separate casts and then changed nothing about French — its stored cast is exactly as
you left it. **Arabic MSA** still has a rejected pair sitting in its pool, so it must not be
recast or rendered until you pick something; splitting Egyptian out means that no longer
blocks Egyptian or Syrian.

Nothing was rendered and no audio was generated, deleted or replaced. No pod sentence was
touched. The stored casts on the pods themselves are untouched too — what changed is what a
re-cast will *produce*, so your locks on the casting page will now stick instead of
stomping each other.

## What I proved did not move

Every course on the estate, not a sample: 145 courses, resolved cast computed before and
after. **132 came out byte-identical.** Thirteen moved, and every one is either your ruling
landing or a stated knock-on of it:

- Egyptian Arabic ×3 courses — Yasmin/Youssef → Eve/Rex. Your ruling.
- German ×3 courses — Felix/Sonja → Moritz/Lena. Your ruling.
- Austrian German ×3 courses — same two voices, same voice ids; the only change is that the
  pool key is now `deu_at` and the steering tag is written down as `de` instead of being
  worked out each time. It is the same sound. The recast reports 0 changes.
- Swiss German — falls back to German, so it followed German from Felix/Sonja to
  Moritz/Lena. It has no pods and no ruling, so nothing is cast today either way.
- English-for-German — its *German* voices followed your German ruling from Felix to Moritz.
  Consistent, but it is a real course with a pod, so worth knowing.

There is a bonus. Spanish-Mexican and Brazilian Portuguese had the same bug: the casting
page offered them the Iberian and European pools because it read the base tag. They now
reach their own pools. That is 21 courses where the casting page's answer changed, all in
the direction of the pool that was already correct in the tools.

I did **not** retag `courses.target_lang`. About 105 files across Popty and the learning app
read that column — syllable counting, translations, entitlement, pricing, the learner's
round map — and none of them want to know about regions. The new column is read by the
casting path and nothing else, so the blast radius is exactly the bug.

## The sal / Bas / Lieke record

That piece is running as its own job (#811) and its report will come to me, not to you. It
covers three things: marking `sal` as not reliably gendered so it can never fill a male or
female seat, adding the Dutch pair Bas and Lieke to the gender record where they are
genuinely missing, and carrying forward the note that Bas measures male but by the narrowest
margin of anyone in the set. I will fold its result into my next message rather than leaving
you to go and find it.
