# deu_at_for_eng — Graz register consistency sweep (pre-TTS)

**Status:** ⛔ HOLD TTS. **BUILD COMPLETE 2026-07-19** (668/668, 0 gaps, 1259 LEGOs / 12587 phrases, quality PASS). This doc = the pre-audio review queue. Kai + native-friend to confirm canonical forms below, then seed-grid review → approve → TTS plan.

**Scope:** translation-level inconsistencies in pre-existing seed `target_text` (and phrase targets that mirror them). These are NOT build errors — the ZUT gate held out the odd colliding phrase and all seeds saved with full baskets. They are spelling/form drift in the source Graz translations that should be normalized to one canonical form each before audio.

**Authoritative spec:** `services/briefs/reference-examples/deu_at.json` + memory `deu-at-graz-rebuild-2026-07-16`. Layer split: LEGO target = standard canonical ("ich"/"nicht"); PHRASE target = dialect. Sweep phrase layer; leave LEGO canonical layer.

## Flagged inconsistencies (from builder, seeds 1–100)

| concept | variants seen | seeds | canonical? (confirm w/ Kai) |
|---|---|---|---|
| "you help" | helfst / hilfst | S25, S65 / S74 | TBD |
| "no / none" (kein) | kane / koane | S46 / S100 | spec: kan / koa — pick one |
| "make/do" | moch / mochn / mochen | across | moch (1sg), mochn/mochen inf — verify |
| "ready" | so weit / bereit | S88 / S95 | TBD (may be genuine semantic split) |
| "what you" contraction | wos du / wos'd | S72 / S78 | TBD |
| "happy" | glücklich / zfriedn | S106 / S76 | ⚠ likely NOT drift — zfriedn = "content", glücklich = "happy"; confirm semantic split |
| "the answer" | de Antwort / die Antwort | / S105 | de vs die article — pick one |
| "why" → source has "der Grund" (the reason) | S127 | ⚠ source-translation mismatch: English "why" rendered as "der Grund"; verify intent |
| "with them" → "eahm" (=him, sing.) | S138 | ⚠ source mismatch: plural "them" rendered as singular "eahm" (him); verify |
| SPELLING-VARIANT DRIFT (batch, S156-184) | Naumen/Nom (S166); Sonntog(S161)/Sunntog(S175); Früah/Fruah; verstehst/vastehst(S174); helfn/helfen(S168); sehn(S127)/sehgn(S178); kann/konn(S176); mochen/mochn | full list in memory deu-at-build-2026-07-16.md — normalize each to one canonical spelling; builder differentiated the lego glosses so no build breakage |
| SPELLING-VARIANT DRIFT (batch, S241-268) | Mann/Monn; anfangen/aunfaungen; Voda/Papa (both "father"); Fruah casing | memory deu-at-build-2026-07-16.md session-5 — normalize; glossed around, no breakage |
| SPELLING-VARIANT DRIFT (batch, S269-296) | wartn/wortn; ollas/olles; nimma/nimmer; anfangst/aunfaungst; kumman/kummen; aussafinden/aussafindn | memory session-6 — normalize; glossed around, no breakage |
| SPELLING-VARIANT DRIFT (batch, S297-320) | über/üba (about); morgen/morgn (tomorrow); schauen/schaun (to watch); Mann/Monn | memory session-7 — normalize; glossed around, no breakage |
| REGISTER: "we" → wir vs mir | S395 (and others where seed target uses "wir") | ⚠ Graz spec = dialect "mir"; some source targets use standard "wir" → builders keep "wir" to tile. Sweep decision: normalize "we"→mir in phrases, OR accept "wir" if Kai prefers. Confirm w/ friend. |
| ⚠ REGISTER: "children" → Kinda vs Kinder | S622 (Kinda) vs S398 (Kinder) | ⚠ NOTE: spec explicitly flags "Kinda" as FARMER over-broadening to AVOID — but source S622 target has "Kinda". Source-level drift. Confirm w/ friend which is canonical (spec says Kinder). |
| SPELLING-VARIANT DRIFT (batch, S610-625) | Nähe(S614)/Näh(S460); wor(S617)/woa(S112); Moi(S620)/Mol(S568) | memory session-22 — normalize; glossed around, no breakage |
| SPELLING-VARIANT DRIFT (batch, S626-641) | donke/danke; Glasl/Glos (glass); versuch/versuach (try) | memory session-23 — normalize; glossed around, no breakage |

## Open questions for Kai (non-blocking)
- **Empty baskets (single-word seeds whose word pre-existed)**: S305 "woman"→Frau (existed S229), S321 "a book"→buach (existed <321). Per [[single-word-seed-empty-baskets]] these are the known-acceptable empty-basket pattern, NOT breakage — frontier advances correctly, do NOT rebuild. Only other 0-phrase seed is stray S67. Confirm these empty baskets are fine (expected: yes).

## Method (when running the sweep)
- Deterministic SQL on `course_practice_phrases.target_text` WHERE `course_code='deu_at_for_eng'`, per [[guardrail_single_course_scope]] — SELECT+count before any UPDATE.
- Safe pre-audio: no TTS exists for these seeds yet, so raw text UPDATE won't desync audio.
- Confirm each canonical form with Kai (native-friend-checked) before normalizing — some pairs (so weit vs bereit) may be genuine, not drift.
- Needs `.env.psql` DATABASE_URL.

_Append new flags here as the build proceeds._
