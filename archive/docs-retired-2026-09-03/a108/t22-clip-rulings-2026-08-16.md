# T-22 — your two rulings, applied

**Latvian: done and live. Dutch: not deployed, and I need your ear once more.**

## Latvian — swapped in, verified end to end

`lav_for_eng`, the Learner saying she is glad. `priecīgs(-a)` → **`priecīga`**.

The candidate you approved is now what learners hear. Two pod rows serve it —
`lav_for_eng:pod-0:SC15-S011` and `lav_for_eng:pod-0-unrecorded:SC22-S011` — and both were already
carrying the corrected text; only the audio was behind.

Proof it is really live, not just written down: the learner API at
`/api/audio/99c2328a-d711-4a7d-b36a-fb41c14c28dd` now returns 143,136 bytes whose md5 is
`dc98576f83c4ce1abc6f4775800f0af9` — **byte-identical to the candidate file you tapped** on the T-22
page. Before the swap it returned `f29721b1a456e4546dd3a91edb569dd8`, the old take.

| | before | after |
|---|---|---|
| s3_key | `mastered/E37D0A29…` | `mastered/53626B27…` |
| duration | 12,264 ms | 11,880 ms |
| audio_revision | 1 | 2 |
| clip text | `priecīgs(-a)` | `priecīga` |

Nothing was rendered and nothing was spent: the object was already on S3 from the A-119 pass, and
re-rendering would have minted *different* bytes — you approved a specific take, not "a Latvian
render of this line". The tool asserts that on the way in: it refuses unless the S3 object's md5
matches the evidence file you listened to, and unless the incumbent matches the "old" file you
compared it against. The superseded object is retained on S3, not deleted, and the swap is recorded
in `course_audio_revisions` with your ruling quoted verbatim.

The one A-119 check that failed — `asr_speaks_fused_form`, whisper hearing `priecīgi`, one edit from
both candidates — is the one your ear settled. Every other check was re-run against the live object
rather than replayed from the old log, and all passed. Your ruling replaced exactly one machine
check and nothing else.

Tool: `tools/a108/t22-lav-swap.cjs`. Log: `docs/a108/t22-lav-swap-applied-log.json`.

## Dutch — three takes rendered, none deployed

`nld_for_eng:pod-0:SC08-S004`, Customer 1: *Ik wil graag een glas bitter, alstublieft.*

I re-rendered it three times on the cast voice (Noor, xAI — re-resolved from the cast, never
chosen). whisper decoded `alsjeblieft` every time, so the gate refused all three, the live row was
never touched, and the old clip is still serving. **The text did not change** — `alstublieft` was
already correct on both the pod row and the clip row; the defect was in the bytes.

Then I tested the instrument, and it does not survive contact:

| audio | whisper small | whisper medium |
|---|---|---|
| the live clip you ruled informal | alsjeblieft | alsjeblieft |
| **Azure** Dutch voice, given `alstublieft` | alsjeblieft | alsjeblieft |
| xAI Noor, `Wilt u nog iets drinken, alstublieft?` | Wil je … alsjeblieft | Wilt u … alstublieft |
| xAI Noor, the word alone | Alstublieft | Alsjeblieft |

The last two rows are the *same audio* at two model sizes, coming out **opposite**. And Azure — a
voice that reads text faithfully — decodes as `alsjeblieft` too, which no one believes it said. So
whisper's Dutch is snapping to whichever form its language model prefers in context. It cannot
referee this contrast in either direction, which means my three refusals are not evidence the takes
are bad, only that the check is blind.

That is your pre-authorised parked case, so nothing was deployed. The takes are on a tap-to-play
page and I need one word back: **A, B, C or NONE** —
[which take says alstublieft?](https://watson-1.tail4968cb.ts.net/d/fe048a13)

Tool: `tools/a108/t22-nld-render.cjs`. Log: `docs/a108/t22-nld-render-failed-log.json`. Total spend
on the Dutch attempts: **$0.002** (126 characters of TTS across three renders).

## The bigger thing this turned up

One probe is worth more than the clip it came from. Given *Wilt u nog iets drinken, alstublieft?*,
the xAI Dutch voice appears to speak *Wil je* — the informal pronoun — where the text says *Wilt u*.
Azure, given the same sentence, keeps *Wilt u*. If that holds by ear, the xAI Dutch voice is
rewriting the **register of the whole sentence**, not mispronouncing one word, and the defect
reaches every polite Dutch line rendered on it rather than one bartender order.

**35 live Dutch clips carry the polite form in their text; 33 of them are on xAI voices.** All three
xAI Dutch voices in the cast (Noor, Femke, Thijs) behaved the same way on the same sentence, so this
is a property of the model, not of one voice.

The audit (#783) has landed: all 35 fetched from S3 and decoded, zero gaps. Read as a **map of where
to listen**, not as a verdict — that caveat is mine, not the auditor's, and it is the whole reason
I am not acting on these numbers:

- **21 of 35** decode as the informal `alsjeblieft`
- **3** decode as the polite `alstublieft`
- **11** decode too mangled to call — and the mangling is itself informative: `als te blijft`,
  `als tubleefd`, `Als toeblieft`, `oudstabliefd`. Those are the shape of the *polite* word, not the
  informal one, and six of the eleven are one voice (Sal)

Two things in it survive the caveat, because they do not depend on trusting a single decode:

- **It is not one voice.** Every xAI Dutch voice shows it at some rate — Noor, the T-22 voice, is
  not uniquely bad.
- **Azure is not a clean control.** Both `MaartenNeural` clips decode informal too — which, given
  that Azure reads text faithfully, is more evidence against the *instrument* than against Azure.

Also checked and clean: the polite pronoun **u/uw** is preserved in all four clips carrying it —
which cuts against my own whole-sentence-rewrite hypothesis and leaves the `Wilt u` probe on the
listen page as the thing that decides it.

Full table with every verbatim decode: <https://watson-1.tail4968cb.ts.net/d/8d442001>

**What this needs next is ears, not more decoding** — a handful of those 21, chosen across voices,
listened to once. I have not queued that: after A/B/C/NONE on the one clip, I will know whether the
right shape is a listening pack or a provider decision, and I would rather bring you one of those
than both.

## Method notes worth keeping

- **Approval attaches to bytes, not to a description.** Where a human ear is the instrument, the
  clip that goes live must be provably the clip that was heard. Both T-22 tools assert md5 identity
  against the evidence file rather than trusting a filename.
- **A human ruling replaces one named check, not the gate.** Everything else still ran.
- **Escalating the whisper model is only worth doing if the bigger model is right.** In A-119 that
  escalation was a genuine limit. Here it *changed the answer*, which is the signature of an
  instrument that is guessing.
