# Welsh North Pod 1 — what is recorded, and what it sounds like

**2 September 2026. Counted from `listening_pod_sentences`, `course_audio`, `recording_provenance` and the live S3 objects — 143 clips downloaded and measured, not read off a plan.**

Twenty clips below, playable here. A spread across the pod, both voices, and every measurement outlier the pod contains.

---

## The state, in one table

Pod 1 is `cym_n_for_eng:pod-0` — the only Welsh pod that has ever been recorded. **231 Welsh lines.**

| | lines |
|---|---|
| Recorded and standing today | **84** |
| Recorded but condemned — Aran, trim-chain damage | **59** |
| Never recorded at all | **88** |
| **Total** | **231** |

By voice, of the 143 clips that exist:

| Voice | clips | condemned | standing | recorded at the mic |
|---|---|---|---|---|
| Aran | 87 | 59 | 28 | 15 Jun, 10 Aug, 23 Aug 2026 |
| Catrin | 56 | 0 | 56 | 23 Aug 2026, one session |

**Every one of Catrin's 56 takes stands.** Not one carries a target-side re-record flag, and her noise floor is the quietest on the estate. The condemned 59 are all Aran's, under the T-20 commission of 16 August and your own ruling of 23 August — *"Aran's are all junk. All clipped badly at either or both ends."*

## What is outstanding, and whose

**88 lines have never been said into a microphone. 84 of them are Catrin's, 4 are Aran's.**

Catrin's 88 are **one contiguous block, not scatter**: scenes 15 to 22 — the last third of the pod — are hers end to end, 79 lines running unbroken from line 141 to line 231, interleaved only with Aran's lines that are already done. The other 9 sit in scenes 11 and 14. She stopped two-thirds of the way through and has not been back.

**How long it takes.** Measured from her own session on 23 August: 56 takes in 9.7 minutes of working time, a median of 6.6 seconds between takes, 10.8 seconds a line all in. At that pace her 88 outstanding lines are **about 16 minutes at the microphone**. Aran's 63 (4 never recorded + 59 to redo) run to about 20 minutes at his own measured 15 seconds a line. **The whole of Pod 1 is under an hour in a room, including setup and retakes.**

## Provenance — is any of this a clone?

**No. Nothing in this pod is clone or TTS output.**

- All 143 clips carry `origin='human'` and a `recording_provenance` row.
- 133 of them record a live browser capture with a device string — *Blue Snowball USB mic, Chrome on ChromeOS*. That is a microphone session, not a render.
- The Aran voice clones that exist on the estate (`elevenlabs_FOIN928B9X0jwgJ95cLt`, `elevenlabs_FVdzAUsp8apoOdc0907A`) are English narration voices and appear on **zero** Welsh pod lines.

**Two explicit gaps.**

1. **10 clips (`human_aran_cym_n_2`, 15 June) have a provenance row but no device string** — recorded under `thomas.cassidy+ssi@gmail.com` in a session tagged `pod_longtake_…`. Nothing says clone, and their acoustics match Aran's other takes, but the positive capture evidence the other 133 have is missing. All 10 are condemned anyway.
2. **All 56 of Catrin's clips are filed under `recorded_by: aran@hey.com`**, on Aran's mic, in the 3½ hours after his own session on the same day. The obvious reading is that she recorded on his logged-in rig. The database cannot confirm it is her voice — only that the voice slot says Catrin. Two of her clips are below for your ear.

## A thing worth knowing before anyone records again

The live recordist queues and the pod's own cast map disagree on 26 lines. Catrin's queue asks her for 10 lines that already have an unflagged clip in Aran's voice; Aran's queue asks him for 16 already voiced by Catrin. Either the cast changed after recording or someone read the wrong character's lines. I cannot tell which from the data. Worth settling before a session, or those 26 get recorded twice.

## The English side

**13 of 231.** The pod's cast config names a human voice for the known role of every character, so on the face of it 218 English lines are also outstanding. Whether the English side is genuinely meant to be human rather than TTS is a call, not a fact I can read out of the data — flagging it rather than counting it into the headline.

---

# Listen

Tap to play. Ordered as they fall in the pod.

### 1. Aran — *Bore da, Sarah!*

“Good morning, Sarah!”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/001-aran.mp3

1.97s · peak -1.6 dB · RMS -21.4 dB · recorded 2026-06-15 · English side flagged for re-record; the Welsh take stands

Why it is here: Aran — not flagged

### 2. Catrin — *Bore da. Sut wyt ti?*

“Good morning. How are you?”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/002-catrin.mp3

2.58s · peak -1.5 dB · RMS -21.8 dB · recorded 2026-08-23 · English side flagged for re-record; the Welsh take stands

Why it is here: Catrin — spread sample

### 4. Catrin — *Ydw,… mae gen i ddiwrnod prysur… heddiw. Gobeithio… cei di ddiwrnod da. Wela i di wedyn.*

“Yes, I've got a busy day today. I hope you have a good day. See you later.”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/004-catrin.mp3

7.41s · peak -1.3 dB · RMS -17.6 dB · recorded 2026-08-23 · English side flagged for re-record; the Welsh take stands

Why it is here: Catrin — recorded 14:44, 3½ hours before the rest of her set

### 11. Catrin — *Prynhawn da. Liciwn i goffi,… os gwelwch yn dda. Efo llefrith ond heb siwgr. I fynd.*

“Good afternoon. I'd like a coffee, please. With milk but with no sugar. To take away.”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/011-catrin.mp3

7.99s · peak -1.5 dB · RMS -17.6 dB · recorded 2026-08-23 · English side flagged for re-record; the Welsh take stands

Why it is here: Catrin — spread sample

### 19. Catrin — *Diolch yn fawr. Hwyl.*

“Thank you very much. Goodbye.”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/019-catrin.mp3

2.11s · peak -1.6 dB · RMS -18.0 dB · recorded 2026-08-23 · English side flagged for re-record; the Welsh take stands

Why it is here: Catrin — spread sample

### 40. Catrin — *Dach chi isio maint arferol… neu fawr?*

“Do you want regular or large?”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/040-catrin.mp3

2.93s · peak -1.5 dB · RMS -17.6 dB · recorded 2026-08-23 · no re-record flag — this one stands today

Why it is here: Catrin — spread sample

### 56. Catrin — *Liciwn i beint… o'r cwrw chwerw,… os gwelwch yn dda.*

“I'd like a pint of the bitter, please.”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/056-catrin.mp3

4.83s · peak -1.5 dB · RMS -17.9 dB · recorded 2026-08-23 · no re-record flag — this one stands today

Why it is here: Catrin — spread sample

### 57. Aran — *Ga i hanner seidr?*

“Can I have a half of cider?”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/057-aran.mp3

1.96s · peak -1.5 dB · RMS -18.5 dB · recorded 2026-08-23 · **condemned** — carries a target-side re-record flag

Why it is here: Aran — under the 2026-08-16 re-record commission

### 68. Aran — *Pedwar. Chwech. Wyth. Glas. Melyn.*

“4. 6. 8. Blue. Yellow.”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/068-aran.mp3

5.56s · peak -1.5 dB · RMS -16.8 dB · recorded 2026-08-10 · no re-record flag — this one stands today

Why it is here: 0.9 words/s — unusually slow for the line

### 73. Catrin — *Esgusodwch fi —… oes gynnoch chi rywbeth… heb glwten? Neu ar gyfer llysieuwyr?*

“Excuse me - do you have anything gluten-free? Or for vegetarians?”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/073-catrin.mp3

8.16s · peak -1.3 dB · RMS -19.2 dB · recorded 2026-08-23 · no re-record flag — this one stands today

Why it is here: Catrin — spread sample

### 93. Aran — *Diolch,… dach chi 'di bod yn help mawr. Dw i'n ddiolchgar iawn.*

“Thank you, you've been very helpful. I'm very grateful.”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/093-aran.mp3

3.35s · peak -1.5 dB · RMS -15.7 dB · recorded 2026-08-10 · **condemned** — carries a target-side re-record flag

Why it is here: Aran — under the 2026-08-16 re-record commission

### 98. Catrin — *Croeso. Oes,… mae gynnoch chi stafell ddwbwl… am dair noson. Ga i weld rhywfaint o ID,… os gwelwch yn dda?*

“Welcome. Yes, you have a double room for three nights. Could I see some ID, please?”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/098-catrin.mp3

10.52s · peak -1.3 dB · RMS -18.8 dB · recorded 2026-08-23 · no re-record flag — this one stands today

Why it is here: Catrin — spread sample

### 101. Aran — *Oes gan y stafell olygfa?*

“Does the room have a view?”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/101-aran.mp3

0.81s · peak -2.0 dB · RMS -15.1 dB · recorded 2026-06-15 · **condemned** — carries a target-side re-record flag

Why it is here: 6.1 words/s — far faster than his own average

### 103. Aran — *Am faint o'r gloch… mae brecwast yn cael ei weini?*

“What time is breakfast served?”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/103-aran.mp3

1.67s · peak -1.5 dB · RMS -19.0 dB · recorded 2026-06-15 · **condemned** — carries a target-side re-record flag

Why it is here: 6.0 words/s — far faster than his own average

### 107. Aran — *A be ydy… cyfrinair y wifi?*

“And what is the wifi password?”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/107-aran.mp3

1.28s · peak -1.6 dB · RMS -16.5 dB · recorded 2026-06-15 · **condemned** — carries a target-side re-record flag

Why it is here: 4.7 words/s — fast

### 116. Aran — *Ydi hi'n iawn… i'w cymryd efo bwyd?*

“Are they all right to take with food?”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/116-aran.mp3

1.53s · peak -3.1 dB · RMS -15.4 dB · recorded 2026-08-10 · **condemned** — carries a target-side re-record flag

Why it is here: 4.6 words/s — fast

### 122. Aran — *Heibio'r eglwys yna?*

“Past that church?”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/122-aran.mp3

0.89s · peak -1.2 dB · RMS -18.9 dB · recorded 2026-06-15 · **condemned** — carries a target-side re-record flag

Why it is here: June 2026 set, 0.89s — flagged for re-record (trim-chain damage)

### 125. Aran — *A wedyn?*

“And then?”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/125-aran.mp3

0.32s · peak -1.7 dB · RMS -12.5 dB · recorded 2026-08-10 · **condemned** — carries a target-side re-record flag

Why it is here: 0.32s for two words — the shortest clip in the pod

### 220. Aran — *Hydref. Tachwedd. Rhagfyr.*

“October. November. December.”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/220-aran.mp3

2.98s · peak -1.5 dB · RMS -20.0 dB · recorded 2026-08-10 · **condemned** — carries a target-side re-record flag

Why it is here: Aran — under the 2026-08-16 re-record commission

### 228. Aran — *Dylat ti fod yn hyderus… yn barod. Dw i'n meddwl… dy fod ti'n gwneud… yn llawer gwell… na ti'n sylweddoli. Dw i'n… teimlo'n gyfforddus… yn siarad efo chdi,… a dw i ddim yn siarad… yn araf iawn.*

“You should be confident already. I think you're doing much better than you realise. I feel comfortable speaking with you, and I'm not talking very slowly.”

https://watson-1.tail4968cb.ts.net/evidence/welsh-pod1-listen-2026-09-02/clips/228-aran.mp3

12.37s · peak -1.5 dB · RMS -16.6 dB · recorded 2026-08-10 · **condemned** — carries a target-side re-record flag

Why it is here: 12.4s — the longest clip in the pod

---

## How to read the outliers

Lines 101, 103, 107, 116 and 125 are Aran's, and they run at 4.6 to 6.2 words a second against his own average of about 2.5. Line 125 is two words in 0.32 seconds. That is not fast reading; it is the trim-chain cutting the words off, which is exactly what you heard on 23 August. Line 228 is the opposite end — 12.4 seconds, the longest clip in the pod. Line 68 is a numbers-and-colours list read slowly on purpose, and probably fine.

Everything else above is a fair sample: first line of the pod, Catrin's earliest take at 14:44 and her later ones from the 18:00 run, and both voices at the start, middle and end of what exists.

*Counted 2 September 2026. 143 of 143 clips fetched from S3 and decoded — none missing, none silent, none truncated relative to its stored duration.*
