# T-22 Dutch — three fresh takes, and a machine that cannot referee them

You ruled the live Dutch clip wrong: you heard **alsjeblieft** (informal) where the text says
**alstublieft** (polite). I re-rendered it. Nothing has been deployed, and the old clip is still
what learners hear — exactly as you asked.

I need your ear once more, because the machine check turned out to be unusable here, and I would
rather say that plainly than swap in a clip on a coin-toss.

## What happened

Three fresh renders on the cast voice (Noor, xAI — the voice was re-resolved from the cast, never
chosen). whisper decoded **alsjeblieft** on all three, so the gate refused all three and the live
row was never touched.

Then I checked the instrument, and it does not hold up:

| what was rendered | whisper small says | whisper medium says |
|---|---|---|
| the live clip you heard as informal | alsjeblieft | alsjeblieft |
| **Azure** Dutch voice, given `alstublieft` | alsjeblieft | alsjeblieft |
| xAI Noor, `Wilt u nog iets drinken, alstublieft?` | Wil je … **alsjeblieft** | Wilt u … **alstublieft** |
| xAI Noor, the word alone | **Alstublieft** | **Alsjeblieft** |

The last two rows are the same audio decoded by two model sizes, and they come out **opposite**.
whisper's Dutch is snapping to whichever form its language model prefers in that context, not to
what was spoken. So a decode saying `alsjeblieft` is not evidence of anything — including on my
three refused renders. I am not going to dress that up as a verdict.

## What I need from you — four taps

The line: *Ik wil graag een glas bitter, alstublieft.* — polite is correct here, he is ordering from
a bartender he does not know.

**Live now — the one you ruled wrong:**

<audio controls src="https://watson-1.tail4968cb.ts.net/evidence/t22-nld-register-2026-08-16/clips/nld-live-now.mp3"></audio>

**Take A:**

<audio controls src="https://watson-1.tail4968cb.ts.net/evidence/t22-nld-register-2026-08-16/clips/cand-3BC86EF0-B45A-4A4E-B18E-D28DC114F3C2.mp3"></audio>

**Take B:**

<audio controls src="https://watson-1.tail4968cb.ts.net/evidence/t22-nld-register-2026-08-16/clips/cand-BB95F997-BAC9-48D3-9136-199054DAA5E1.mp3"></audio>

**Take C:**

<audio controls src="https://watson-1.tail4968cb.ts.net/evidence/t22-nld-register-2026-08-16/clips/cand-7B628FFD-538C-462B-8F07-D80AB2015FA6.mp3"></audio>

**Which take says *alstublieft*?** Name one — A, B or C — and I swap it in the same way I swapped
the Latvian. If none of them do, say NONE and I will treat "this voice cannot say the polite form
inside a sentence" as the finding and bring you the options.

## Two more, only if you have the patience

**Is it the whole sentence, or just the last word?** Same voice, given *Wilt u nog iets drinken,
alstublieft?* — the polite **Wilt u**, not **Wil je**. If she says *Wil je*, the voice is rewriting
the register of the whole sentence rather than mispronouncing one word, and that reaches every
polite Dutch line we have on xAI, not just this clip. Never live, never was:

<audio controls src="https://watson-1.tail4968cb.ts.net/evidence/t22-nld-register-2026-08-16/clips/nld-u-form-probe.mp3"></audio>

**The word on its own**, same voice — the one case I think comes out right, which is why I suspect
the sentence around it, not the voice's ability to say the word:

<audio controls src="https://watson-1.tail4968cb.ts.net/evidence/t22-nld-register-2026-08-16/clips/nld-word-alone.mp3"></audio>

All of it is also on one page if you prefer it laid out side by side:
[the four takes and both probes](https://watson-1.tail4968cb.ts.net/evidence/t22-nld-register-2026-08-16/index.html).

## Scope, if it is the sentence

35 live Dutch clips carry the polite form in their text; 33 of those are on xAI voices. An audit is
decoding all of them — but after today I trust those decodes only as a map of where to listen, never
as a verdict, and I will say so when I report it.

## What is already done

The **Latvian** half of T-22 is finished. Your ear approved the candidate and it is live: the exact
bytes you tapped on the T-22 page are the bytes learners now get, verified end to end through the
learner API. The superseded clip is retained on S3, not deleted, and the swap is recorded with your
ruling quoted.

Nothing Dutch has been deployed. Every refused render is parked on S3 as evidence; no S3 object and
no DB row was deleted.
