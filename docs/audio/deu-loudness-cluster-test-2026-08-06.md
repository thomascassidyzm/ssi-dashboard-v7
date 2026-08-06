# Your ear was right, and it proves the clips you heard are not on the server

I measured all 25 clips from your 18:33–18:41Z session — every one you played, fetched from the
server, loudness and brightness and tail measured on the actual bytes.

**Result: on the server there is no loud/crisp cluster and no quiet/dull cluster. There is one
cluster.** Every clip sits at −15.0 to −16.3 dB. New vs old differ by **0.19 dB** — about ten times
below what an ear can detect.

**And not one clip on the server is truncated.** All 25 end cleanly, tails 0.02–0.16 s, durations
sane for their text.

You can plainly hear two generations. The server cannot produce that difference. **So the clips you
heard are not the server's clips** — they are older bytes held on your device, from before the
mastering pass that normalised everything to −15.5 dB. Quieter and duller is exactly what
un-normalised audio sounds like.

---

## The measurement

| | clips | mean loudness | mean brightness |
|---|---|---|---|
| revision > 1 ("new") | 5 | **−15.42 dB** | 1245 Hz |
| revision 1 ("old") | 20 | **−15.61 dB** | 1119 Hz |

0.19 dB apart. The old cluster's own internal spread is 568–1482 Hz — far wider than the gap
between the groups. There are no groups.

Truncation, all 25: **none**. The shortest tail is 24 ms, the longest 164 ms; every clip's speech
ends before its file does.

---

## What this rules out

**"The regen chain is producing chopped output."** Dead. Five of your clips are freshly repaired
output (revision 2). All five are complete, and all five sit in the same loudness band as
everything else. The chain is not chopping anything.

**"Truncated old files are still linked in slots the regen missed."** Dead too, and this is the one
your ear-evidence was pointing at. The slots are fine — I read every row. The files those rows name
are complete. Nothing on the server is serving you a chopped clip.

What survives is the one thing that explains **both** symptoms at once — the truncation *and* the
loudness difference. Different bytes on your device. A player-side cut would not change loudness;
a wrong link would not survive my reading the rows. Only a stale cached file does both.

---

## The smoking gun, in your own clip set

Of your 20 revision-1 clips, **10 had their S3 bytes rewritten after the database row was written,
with the revision left at 1** — including all three clips of the cycle you looped hardest:

| clip | row written | bytes replaced | gap |
|---|---|---|---|
| `37adbbb4` "Ich will so oft wie möglich lernen" | 24 Feb | 3 Aug | **160 days** |
| `5ae805dd` "I want to learn as often as possible" | 24 Feb | 3 Aug | **160 days** |
| `98b79ba2` "I want to speak German as often as possible" | 24 Feb | 3 Aug | **160 days** |
| `cde7fb6b` | 24 Feb | 4 Aug | 161 days |

The revision stayed at 1, so the URL stayed a bare uuid, so your cache key never changed, so your
phone never asked for the new bytes. It is still playing February.

**A prediction you can check by ear.** In cycle 102 you heard `cea6be43` (revision 1, cached) and
`2d2c2ef0` (revision 2, `.v2`, fetched fresh) back to back. One dull, one crisp — in the same
cycle. If that is what you heard, the diagnosis is closed.

---

## The guarantee

> **A clip's bytes may never change without its `audio_revision` changing — enforced by a database
> trigger that bumps the revision on any `s3_key` or `duration_ms` write, so a cache-busting URL
> stops being something anyone has to remember.**

A gate, not a discipline. This is what makes a fifth recurrence impossible: no future mastering,
de-hiss or regen pass can put new bytes behind an old URL, because it no longer controls the
revision.

**Still waiting on one word from you:** bumping `audio_revision` on the affected revision-1 rows
flips their URLs to `.v2` and every stale copy on every device is bypassed instantly — no app
update, nothing to clear by hand. The bytes are already verified good and complete, so this is pure
cache-busting and it is reversible. **Recommendation: go.**
