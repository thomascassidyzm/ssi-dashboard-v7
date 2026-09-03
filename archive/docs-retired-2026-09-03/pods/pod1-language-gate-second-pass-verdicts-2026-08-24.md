# Second pass on the 49 flagged clips — forced-language verify — 2026-08-24

Read-only. No TTS, no writes. Re-transcribed each of the 49 clips flagged
`wrong-language` by the 2026-08-24 language-gate re-run (`d9ccb2cab`), this time
with whisper **forced to the course's expected language** (`-l <iso1>`, not
auto-detect) and scored against the known text via the canonical
`checkAudioVeracity` engine (`services/audio-veracity.cjs`, Tom's 2026-08-24
ruling: "we always know the prescribed sentence... the question is never open
transcription... but verification"). Free decode first, primed (`--prompt`)
rescue on a free-decode failure, same currency/normalisation as every other
caller. For the 9 hi/ur + sv/no sibling-confusion candidates, also ran a decode
forced to the sibling language for contrast.

## Result

| Verdict | Count |
|---|---:|
| CONFIRMED-DEFECT | 0 |
| STILL-AMBIGUOUS(needs ear) | 8 |
| CLEARED | 41 |
| **Total** | **49** |

**Zero confirmed defects.** Every one of the 49 clips, when whisper is forced
to speak the course's own language, decodes close enough to the known text to
verify (free decode `ok` on 41 of them via the edit-distance guard, or the
2026-08-24 primed-rescue mode on the rest). This corroborates the rerun doc's own
caveat: the 49 was always a candidate count, produced by whisper's free
language-ID guess (which is known-unreliable on short, sparse-phoneme, or
closely-related-language audio), not a defect count. None of the 49 clears the
bar for CONFIRMED-DEFECT under the canonical known-text check.

8 clips are held at STILL-AMBIGUOUS despite passing, because the pass itself is
weak-signal — sub-1-second clip and/or CER ≥ 0.4 even after forcing the correct
language (the edit-distance guard, not a strong match, is carrying the pass).
Recommend a native/ear check on these 8 before treating them as closed; the
other 41 do not need one.

## Method note — why forcing the language is the right second pass

The original gate ran whisper in auto-detect (language guess from acoustics
alone) — that is exactly the mode `[[whisper-language-id-unreliable-on-short-clips]]`
measured calling shipped, correct French `je` "Turkish" at 400-600ms. Forcing
`-l <expected>` removes the language-guessing step entirely and asks a narrower,
answerable question: "read as this language, does the audio say this text?" —
Tom's verification framing. `checkAudioVeracity` is the one already wired into
the render gate and repair loop; no ad-hoc script was written for this pass.

## Per-course

| Course | CONFIRMED-DEFECT | STILL-AMBIGUOUS | CLEARED |
|---|---:|---:|---:|
| ara_eg_for_eng | 0 | 2 | 6 |
| deu_at_for_eng | 0 | 1 | 1 |
| hin_for_eng | 0 | 1 | 11 |
| ita_for_eng | 0 | 1 | 1 |
| nld_for_eng | 0 | 1 | 5 |
| por_br_for_eng | 0 | 0 | 1 |
| por_for_eng | 0 | 0 | 4 |
| swe_for_eng | 0 | 2 | 12 |

## The 8 STILL-AMBIGUOUS clips (needs ear)

| Course | Scene/Sent | Expected→Auto-detected | Duration | Forced CER | Text | Forced decode |
|---|---|---|---:|---:|---|---|
| ara_eg_for_eng | SC13-S006 | ar→de | 932ms | 0.6667 | وبعدين؟ | أباً دين! |
| ara_eg_for_eng | SC15-S001 | ar→en | 1008ms | 0.4286 | ده بكام؟ | دبكيم |
| deu_at_for_eng | SC03-S008 | de→en | 960ms | 0.25 | Jo, bitte. | Yo, bitter. |
| hin_for_eng | SC03-S008 | hi→ru | 1248ms | 0.5 | हाँ, कृपया। | हा, ग्रुपया |
| ita_for_eng | SC13-S006 | it→fr | 840ms | 0 | E poi? | E poi? |
| nld_for_eng | SC13-S006 | nl→en | 696ms | 0 | En dan? | En dan... |
| swe_for_eng | SC07-S001 | sv→sq | 2760ms | 0.5357 | Godmorgon. … Vad kan jag få dig? | Gumorrrom, Balkanjafodaj. |
| swe_for_eng | SC21-S009 | sv→en | 972ms | 0.3 | Vad är det? | Båda det. |

## Sibling-language contrast (hi↔ur, sv↔no) — corroborating evidence

All 9 named related-language-confusion candidates from the rerun doc's caveat
(plus 3 more that whisper auto-detect happened to call something else entirely)
verified cleanly when forced to the course language. Forcing the sibling
language instead produces a plausible-looking decode too (expected — hi/ur and
sv/no share enough phonology that whisper can read either script's grammar onto
the same audio) — the sibling decode is NOT scored against known text (there is
no known-language text in the sibling), it exists only to show why whisper's free
auto-detect guess is genuinely ambiguous between the two, exactly as the rerun
doc predicted.

| Course | Text (expected lang) | Forced-expected decode | Forced-sibling decode |
|---|---|---|---|
| hin_for_eng | यह ज़्यादा दूर नहीं है। शायद तीन या चार मील। | यह जादा दूर नहीं है, शायत तीन यह चार मील. | 'یہ زادہ دور نہیں ہے شاید تین یا چار میل' |
| hin_for_eng | नहीं, हमारे पास सिर्फ पीने की चीज़ें हैं। | अही, हमारे पास सरफ पीने की चीजे है। | 'نہیں ہمارے پاس صرف پینے کی چیزیں ہیں' |
| hin_for_eng | हाँ, कृपया। | हा, ग्रुपया | 'ہاں! گروپےیا!' |
| hin_for_eng | बहुत-बहुत धन्यवाद। अलविदा। | बहुत भहुत धन्यवाद, अल्विदा | 'بہت بہت دھنیاواد، الویدہ' |
| hin_for_eng | पाँच। दस। पंद्रह। लाल। हरा। | पाच दस पन्रा लाल हरा | 'پاچ، دس، پنرہ، لال، حرہ' |
| hin_for_eng | सात। नौ। ग्यारह। नारंगी। बैंगनी। | सात, नो, गियारा, नारंगी, बेंग्नी | 'ساتھ، نو، گیارہ، نارمگی، بینگنی' |
| hin_for_eng | सिरदर्द के लिए पैरासिटामोल लीजिए, और गले के लिए ये लोज़ेंज। | सर्दर्द के लिए पेरा सिटा माल लिए और गले के लिए लोजिंज | 'سر درد کے لیے پیرا سٹا مول لیجیے اور گلے کے لیے یہ لوز انج' |
| hin_for_eng | उन्नीस। बीस। इक्कीस। बुधवार। गुरुवार। | उनिस, भीस, एक्किस, बोद्वार, गुरूर | 'اُنیس، بیس، ایکیس، بدوار، گروار' |
| hin_for_eng | तीस। चालीस। पचास। शुक्रवार। शनिवार। | तीस, चालीस, पचास, शुक्रवार, शनीवार | 'تیس چالیس پچاس شکروار شنیوار' |
| hin_for_eng | क्या आप बता सकते हैं कि स्टेशन में टिकट कहाँ मिलती है? | क्या आब बता सकते हैं कि स्टेशन मेर्टिकट कहा मिलती है | 'کیا آپ بتا سکتے ہیں کہ سٹیشن میں ٹکٹ کہاں ملتی ہے؟' |
| hin_for_eng | तीन बजे। नौ बजे। जनवरी। फ़रवरी। | दीन बजे, नोबजे, जन्वरी, फर्वरी | 'دین بجے نو بجے جنوری فروری' |
| hin_for_eng | अक्टूबर। नवंबर। दिसंबर। | अक्तुबर नवमबर दिसमबर | 'اکتوبر نوامبر دیسمبر' |
| swe_for_eng | Har du någon mat? | Har du nog mat? | 'Har du noen mat?' |
| swe_for_eng | Har du chips, eller nötter, eller något? | Har du chips eller nötter eller något? | 'Har du chips eller nøtter eller noe godt?' |
| swe_for_eng | Godmorgon. … Vad kan jag få dig? | Gumorrrom, Balkanjafodaj. | 'Gå mor rom, og valg kan jeg få ådre i.' |
| swe_for_eng | Sju. … Nio. … Elva. … Orange. … Lila. | 7. 9. 11. Orange. Lila. | '7. 9. 11. Orange. Lila.' |
| swe_for_eng | Har du något att äta? | Har du något att äta? | 'Har du noe å tatt etter?' |
| swe_for_eng | Är vattnet varmt? | Är vattnet varmt? | 'Er vattnet varmt?' |
| swe_for_eng | Har du apelsinjuice? | Har du Appelsinjus? | 'Har du appelsinjus?' |
| swe_for_eng | Går bussen härifrån? | Gorbussen har ifrån. | 'Gorbusen, Harry Från' |
| swe_for_eng | Var går bussen ifrån? | Var går bussanifrån? | 'Var går bussene ifrån?' |
| swe_for_eng | Det gör mig glad. | De är mig glad! | 'De er meg glad!' |
| swe_for_eng | Är det okej om vi lägger det här? | Är du okej om vi lägger det här? | 'og du køy om vi legger det her.' |
| swe_for_eng | Har du glass? | Ha det glas! | 'Ha det glas!' |
| swe_for_eng | Vad är det? | Båda det. | 'Båder det?' |
| swe_for_eng | Vad är det där borta? | och är du där borta. | 'Hvor er du der borta?' |

## Files

- `docs/pods/pod1-language-gate-second-pass-verdicts-2026-08-24.json` — full 49-row verdict list, machine-readable
- `docs/pods/pod1-language-gate-second-pass-players-2026-08-24.md` — phone-readable, players grouped by verdict
- Prior read-only rerun this pass follows up: `docs/pods/pod1-language-gate-rerun-2026-08-24.md` (`d9ccb2cab`)
- Canonical check used: `services/audio-veracity.cjs` (`checkAudioVeracity`), per `docs/verify-against-known-text-2026-08-24.md`

## Render list

**0 clips appended to the standing render list from the splice pass.** No
CONFIRMED-DEFECT verdicts were produced by this pass — nothing to add. The 8
STILL-AMBIGUOUS clips are NOT queued; they need a native/ear pass first, and only
a confirmed defect after that should be added to the render list (list only,
still no rendering).