# A-133 tail-click fix — ear-check, post-fix renders

**Honesty note first:** at the time of asking, **zero clips had been rendered through
production since the fix landed** — the fix (`fc88c72b`, the trailing-artefact-cluster
rule) shipped to `main` at **2026-08-17 18:17 UTC**, and the prod services
(`popty-phase8-audio`, `popty-production-api`) restarted onto it at **2026-08-18 00:30
UTC** — but nothing had rendered through them since, so the earlier doc (`/d/5f129ae4`)
had no real post-fix clip to point you at. The 8 clips below are **fresh renders, made
just now**, through `phase8.masterAudio()` — the exact function `/generate` calls — on
the live prod checkout, with the fix live. Nothing pre-fix is embedded here.

Each line is a **question tag after a pause** (", right?" / ", hè?" / ", oder?" …) —
the shape the old bug hit: xAI's hard-truncated raw tail, lifted 12dB by the
compressor, switched off in a single sample. That's the vulnerable shape to listen on.

---

## 1. Femke — xAI Dutch (the cast replacing Noor)
*"Het is prachtig weer vandaag, hè?"* — "It's beautiful weather today, isn't it?"

<audio controls src="https://watson-1.tail4968cb.ts.net/evidence/a133-tail-fix-earcheck-2026-08-18/nld-femke-tag.mp3"></audio>

## 2. Thijs — xAI Dutch male
*"Dat had je me eerder kunnen vertellen, toch?"* — "You could have told me that earlier, couldn't you?"

<audio controls src="https://watson-1.tail4968cb.ts.net/evidence/a133-tail-fix-earcheck-2026-08-18/nld-thijs-tag.mp3"></audio>

## 3. Lena — xAI German
*"Das machen wir morgen zusammen, oder?"* — "We'll do that together tomorrow, right?"

<audio controls src="https://watson-1.tail4968cb.ts.net/evidence/a133-tail-fix-earcheck-2026-08-18/deu-lena-tag.mp3"></audio>

## 4. Camille — xAI French
*"Tu vas quand même y aller, hein ?"* — "You're still going to go, aren't you?"

<audio controls src="https://watson-1.tail4968cb.ts.net/evidence/a133-tail-fix-earcheck-2026-08-18/fra-camille-tag.mp3"></audio>

*(chain flagged a −8.4dB tail rise at 1.19s on this one — SUSPECT ONLY, the known 9%-by-ear rate; shipped unaltered, listed here so you can judge it yourself.)*

## 5. Maria — xAI Spanish
*"Vamos a llegar antes de las ocho, ¿no?"* — "We'll get there before eight, won't we?"

<audio controls src="https://watson-1.tail4968cb.ts.net/evidence/a133-tail-fix-earcheck-2026-08-18/spa-maria-tag.mp3"></audio>

## 6. Eve — xAI English (the estate's heaviest voice, 162,906 clips)
*"You've already finished the whole thing, right?"*

<audio controls src="https://watson-1.tail4968cb.ts.net/evidence/a133-tail-fix-earcheck-2026-08-18/eng-eve-tag.mp3"></audio>

*(chain flagged a −30.2dB tail rise at 2.25s — same SUSPECT-ONLY class, shipped unaltered.)*

## 7. Giulia — xAI Italian
*"Ci vediamo domani sera, vero?"* — "We'll see each other tomorrow evening, right?"

<audio controls src="https://watson-1.tail4968cb.ts.net/evidence/a133-tail-fix-earcheck-2026-08-18/ita-giulia-tag.mp3"></audio>

## 8. Alice — xAI Swedish
*"Vi ses imorgon kväll, eller hur?"* — "We'll see each other tomorrow evening, right?"

<audio controls src="https://watson-1.tail4968cb.ts.net/evidence/a133-tail-fix-earcheck-2026-08-18/swe-alice-tag.mp3"></audio>

*(chain flagged a −12.1dB tail rise at 1.98s — same SUSPECT-ONLY class, shipped unaltered.)*

---

## What to listen for

The tag word (right? / hè? / oder? / hein? / ¿no? / vero? / eller hur?) should land
**clean** — no click, no amputated tail, no switched-off room tone. Three of the eight
(#4, #6, #8) tripped the chain's own SUSPECT-ONLY tail-rise flag — that flag is
informational, never a gate, so those three shipped exactly as rendered and are worth
your ear specifically.

**One word back tells Watson which way to go: clean, or not.**
