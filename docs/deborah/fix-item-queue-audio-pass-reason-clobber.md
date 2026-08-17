# Fix item — `queueAudioPass` silently destroys the pending reason

**Filed 2026-08-17 per Tom's ruling.** Small, isolated, not applied — filed with the
patch ready so it is one decision rather than one investigation.

## What happens

`services/shared/audio-pass-queue.cjs:24` keeps **one pending row per course** and calls a
repeat call a "touch". On that touch it merges `metadata` but **overwrites `reason`**:

```js
const { data: existing } = await supabase
  .from('audio_pass_requests')
  .select('id, metadata')          // <-- does not even SELECT reason
  ...
  .update({
    reason,                                            // <-- replaces, no merge
    metadata: { ...existing.metadata, ...metadata },    // <-- merged, correctly
    ...
  })
```

Note the shape of the bug: the function does not read `reason`, so it **cannot** know
what it is about to erase, and it logs the *new* reason as though nothing were lost. The
docstring says "a repeat call updates reason/metadata", so this is working as written —
the doc and the code agree, and both are wrong about what a queue should do.

## How it bit us today

Worker **#924** queued a pass on `eng_for_por` for Deborah's silenced slots. That course
already had a pending row carrying its **pod-0 fresh-build** reason. The pod-0 text was
destroyed. #924 noticed, recovered the verbatim wording from a sibling course, and merged
both with `||`. Nothing was lost *because a worker happened to check* — which is not a
control.

I hit the same path minutes later on `eus_for_eng` ("Touched pending audio-pass request")
and my reason likewise replaced whatever was there. **Mine was not recovered**, because I
did not know to look. That is the real cost: two agents, one caught it, one did not.

## Why it matters more than it looks

The reason text is the **only** record of *why* a course owes an audio pass. `phase8`
`/generate` fulfils the request; whoever approves it reads the reason to decide scope. A
clobbered reason means a pass gets approved for the wrong work — or the earlier need is
silently dropped from the queue while the row still says "pending", which reads as
covered.

Every content pass is supposed to end by queueing a request, so **any two content passes
on the same course collide by construction.** The estate now runs many agents in parallel,
so this is a routine collision, not an edge case.

## The patch (not applied)

Append rather than replace, and de-duplicate so repeated identical touches don't grow the
field without bound:

```js
    const { data: existing } = await supabase
      .from('audio_pass_requests')
      .select('id, metadata, reason')        // + reason
      ...
      const merged = !existing.reason
        ? reason
        : existing.reason.includes(reason)
          ? existing.reason                  // already recorded — do not duplicate
          : `${existing.reason} || ${reason}`
      ...
        .update({
          reason: merged,
          ...
        })
      logger.info(`Touched pending audio-pass request for ${courseCode} (${merged})`)
```

`||` is the separator #924 used by hand, so recovered rows and future rows read the same.
Update the docstring at `:21` too — "a repeat call updates reason/metadata" becomes
"appends to reason, merges metadata".

## Worth checking at the same time

- `requested_by: requestedBy` has the identical shape — a touch overwrites the original
  requester with the latest caller, so the first requester is lost. Same one-line class
  of fix, but it is a behaviour choice (last requester vs first vs list) rather than an
  obvious bug, so I have not assumed one.
- How many pending rows currently carry a `||` or look truncated — i.e. how many reasons
  were already lost before today. Not measured.

## Blast radius of the fix

`queueAudioPass` is called from `tools/course-optimization/queue-audio-pass.cjs` and from
content-pass code via `services/shared/audio-pass-queue.cjs`. The change is additive to a
text column on a queue table, touches no content, no audio and no links, and cannot make a
pass fail — the function already swallows its own errors by design ("a content pass must
not fail because the queue write did").
