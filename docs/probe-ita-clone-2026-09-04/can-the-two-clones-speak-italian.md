# Can the two clones speak Italian?

Probe, 2026-09-04. Nothing here is cast, promoted, rendered into a pod or written to the database. It is fifteen sample clips off your own Cartesia clone and Aran's, speaking Italian lines taken verbatim from the Method Pod, so you can decide one thing with your ear.

**No machine here can judge audio, mine included.** I can tell you the HTTP status, the byte counts, the durations, which voice id spoke, and that the language steer said `it`. I cannot tell you whether it sounds like you, and I have not tried. Your ear is the only verdict that counts.

The voices used: **tom_001** (`cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2`) and **aran_english_003** (`cartesia_33890587-a29f-4416-ba61-2615c74f92fe`), plus two extra lines on **Tom_003** (`cartesia_f56e05e2-…`) so you can compare your newest clone against the one with production clips behind it. Aran has exactly one Cartesia clone, so there was no choice there.

---

## 1. The actual question — the two of them taking turns

Seven turns, Chapter 1 opening, alternating tom_001 and aran_english_003, 0.45s between turns. Listen for whether these are two men or one man twice.

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/00-THE-EXCHANGE-tom-and-aran-alternating.mp3

> **TOM** — Bene. Questo è Tom e Aran Talk Bollocks, parte quattro. Oggi abbiamo—
> **ARAN** — Il futuro dell'istruzione?
> **TOM** — Il futuro della vita, dell'universo, e dell'istruzione.
> **ARAN** — Ci scrivi «parte quattro di diciotto milioni»?
> **TOM** — Chi lo sa. Partiamo da un punto qualsiasi. Comincia tu.
> **ARAN** — Il quadro generale — e lo dico veloce perché è grande — è che niente di tutto questo succede da solo…
> **TOM** — Fare cose fighe.

42 seconds. Each turn is also below on its own, if you want to isolate one.

---

## 2. Your clone over a long arc — tom_001, the city metaphor

21 seconds, one breath-length argument. Listen for whether the prosody holds or flattens into list-reading.

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/02-long-tom-city.mp3

> Non è che conosci le parole. Conosci quello che c'è tra le parole. I collegamenti. Come una città — non conosci una città perché conosci i palazzi; la conosci perché conosci le strade…

## 3. Aran's clone over a long arc — the transcripts argument

31 seconds, the longest thing here, and the one that tells you most about whether he can carry a chapter.

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/03-long-aran-transcripts.mp3

> Le trascrizioni. Non è una differenza piccola, è tutta la faccenda. I sottotitoli ti mettono le parole sullo schermo mentre ascolti, così il lavoro lo fanno gli occhi e le orecchie si addormentano…

---

## 4. The short ones — where Italian TTS usually gives itself away

One second each. A single word with no context is where a synthetic accent shows.

**Tom — "Davvero?"**

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/04-short-tom-davvero.mp3

**Aran — "Non ci abita nessuno."**

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/05-short-aran-nessuno.mp3

---

## 5. Your newest clone, same two lines — Tom_003 against tom_001

Same text as clip 1 and clip 2 above, spoken by Tom_003 instead. A straight A/B: is the newer clone better in Italian?

**Tom_003, the opening line** (compare with the first turn of the exchange)

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/06-tom003-opening.mp3

**Tom_003, the city metaphor** (compare with §2)

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/07-tom003-long-city.mp3

---

## 6. Does the language steer actually do anything? — a pair I'd like your ear on

Same Italian sentence, same voice, one rendered with the language set to Italian and one with it set to English. If they sound the same, the steer is not reaching the model, and that matters for every foreign-language render on this vendor.

**Steer set to Italian**

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/08-steer-check-italian-setting.mp3

**Steer set to English**

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/08-steer-check-english-setting.mp3

I ask because the estate's render path sends the steer in a field called `locale`, while Cartesia's own documented field is `language`. Cartesia returns 200 either way — it does not complain about a field it does not know — so the code cannot tell us which one is being obeyed. I changed nothing; I used `language` for every clip here. Flagging it, not fixing it.

---

## The individual turns of the exchange

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/01-exchange-01-tom.mp3

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/01-exchange-02-aran.mp3

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/01-exchange-03-tom.mp3

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/01-exchange-04-aran.mp3

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/01-exchange-05-tom.mp3

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/01-exchange-06-aran.mp3

https://watson-1.tail4968cb.ts.net/evidence/ita-method-pod-clone-probe-2026-09-04/01-exchange-07-tom.mp3

---

## How I know these are the real clones and not a generic Italian voice

Three independent places agree, which is the whole point of the probe:

1. **The live `voices` table.** All three rows are `tts_engine='cartesia'`, `metadata_source='cartesia-clone (Voice Lab)'`, `consent_status='authorised'`, with `consent_person` naming *Tom Cassidy* and *Aran Jones*, authorised 2026-09-01 on your own written ruling.
2. **Cartesia's own record for each uuid**, read back live tonight. All four are `is_owner: true`, `access: private`, `visibility: owner` — private voices in your account, not catalogue entries. The names Cartesia holds are `tom_001`, `Tom_003`, `Tom_002`, `aran_english_003`. Aran's carries its own provenance in the vendor description: *"Aran English voice, instant clone from 18.85s of the Welsh-course welcome (pure English speech), cut 5.30-24.15s on natural pauses. Built 2026-08-27."*
3. **The estate's consent door.** `assertConsentedForRender()` was run on all three and returned `allowed: true, aboutAPerson: true, kind: 'clone', status: 'authorised'` for each.

The two stock Cartesia rows in the estate, *Darío* and *Ximena*, are catalogue voices with no person behind them. They appear nowhere in this probe.

## What was rendered, and what it cost

13 clips through the probe script plus 5 tiny diagnostic renders of one 21-character sentence: 18 requests, all HTTP 200, all mp3 24 kHz / 128 kbps, speed 1.0, `language: 'it'`, model `sonic-3.6`, `Cartesia-Version: 2026-08-14`. Raw model output — no mastering, no post-chain, no cherry-picking, first take of every line. Total audio about two and a half minutes.

Text came from `canonical_pod_scenarios`, `pod_slug='method-pod-chapters'`, `target_text`, verbatim. Nothing was translated, edited or invented. **Zero database writes.**
