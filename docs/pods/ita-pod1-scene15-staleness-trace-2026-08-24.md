# Scene 15 staleness — what is actually serving the old clips

**24 August 2026.** Traced in response to: *"also, the new Scene 15 is playing the old Scene 15 clips in the app right now."*

## Short answer

Nothing on the server is stale. The database, the clip links and the live read path all
serve the repaired Scene 15 right now, and I verified that with the learner's own
credential. What can still play you the old clips is **a snapshot saved on your handset**.

I bumped the key that snapshot is filed under, which throws away every copy saved before
this morning's repair. It needs a deploy of the learning app to reach you.

## What I checked, and what it ruled out

I went at the four suspected layers in order. Three of them are **not** the cause, and I
want to say that as plainly as if they had been.

**The CDN is not caching this.** I fetched the production bundle for Italian three times
in a row as an anonymous client. Every one came back `x-vercel-cache: MISS`, age 0. The
handler *asks* for a 24-hour CDN cache, but the same header marks the response `private`,
which switches the shared cache off — so the 24-hour lifetime has never actually applied.
I left it alone rather than "fixing" something that isn't running.

**The version key does move.** `content_version` is frozen at 0.508.3 and never budges on
a pod edit — but that is not what the app checks. It checks `content_stamp`, and there is
a database trigger on the pod-sentence table that moves it. It read 12:05 today. Working
as intended.

**The database and the live read are correct.** All 11 Scene 15 rows point at a clip whose
recorded text is exactly that row's text. Each of those texts has exactly one clip in the
whole estate, so there is no newer re-render sitting unlinked. And the player reads the pod
rows live from the database every time — the offline copy is only touched when that read
fails.

## What is left, and why it fits

The app keeps an offline copy of the listening metadata on the device, and that copy
includes the per-sentence split clip lists. It is thrown away only when a version constant
in the code is changed by hand — there is no automatic expiry. That constant was last
changed in July.

So every copy saved before this morning still holds the **pre-repair** split lists. For
Scene 15 those were scrambled: the single sentence *"Quanto costa?"* had a two-clip split
filed against it, and *"Dove possiamo prendere l'autobus?"* had a four-clip split. The
repaired database correctly carries none for those rows, and splits only the one turn that
genuinely is five sentences (*"100.000. 60. 70. L'una. Le 11."*).

A handset falling back to that snapshot — properly offline, or on a connection stalled
enough that the app counts it as offline — plays the old split clips. That is your symptom,
and it is the only layer left standing.

I should be straight about the limit: I cannot read your phone, so I have not *proved* this
is what happened on your handset. I have proved it is the only remaining candidate, and
that every other layer is clean.

## Worth knowing separately

The Scene 15 audio was **not** re-recorded this morning. This morning's work replaced the
pod and changed 29 whole-turn clips and 80 split lists — none of the clip changes were in
Scene 15. So its clips genuinely are the ones made on 22 August, all Ara. If what you are
hearing is the *voice*, that is the casting question, not staleness.

## What I changed

One line, plus the note explaining it: the snapshot key goes from `v2` to `v3`. Every
pre-repair copy on every device is orphaned and re-fetched once. No extra load in normal
running, no fleet-wide switch, no audio touched.

## What it costs

Nothing ongoing. Each device does one extra metadata fetch the first time it opens the app
after the deploy, and then behaves exactly as before.

## What still needs deciding

The snapshot has no automatic expiry — it relies on someone remembering to change a
constant. That is the second time this has bitten (the first was stale Italian glosses in
July, recorded in the same file). Worth fixing properly by keying the snapshot on the
content stamp the app already fetches, which would make every future repair self-healing.
That is a small change, but it is a change to how offline invalidation works, so it is
yours to call rather than mine.
