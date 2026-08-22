# deu_at voice 2 — Sascha is now visible, and the studio records as her

**Kai — the casting was already right. Three bits of plumbing around it were not.**
All three are fixed, merged to main, and live.

## What you were seeing, and why

**"The voice configuration shows Jonas tagged HUMAN, and there's no way to pick Sascha."**
Sascha *was* assigned — deu_at_for_eng voice 2 has held `human_sasha_wanasky_deu_at`
under her email for a while. But when a person is assigned to a slot, the code kept
the *displaced* Azure voice's display name. So the slot read "Jonas — a real person
on your team". Every voice UI in the dashboard reads that one field, which is exactly
why Sascha looked absent from a slot she already held.

The slot now carries the person's name. Jonas's name and gender were moved into the
slot's `previousVoice` stash, so unassigning Sascha restores the Azure voice intact.
I applied the same correction to the live deu_at_for_eng row — it now reads **Sasha**.

**"Every take gets stamped with de-AT-IngridNeural."**
Two causes, both now closed:

1. The Autocue studio opened from the production console had no idea who was at the
   microphone. It fell back to a bare "voice 1". The Record Room shell resolved the
   recordist's real slot; the console mount didn't, and that's the door most of these
   takes came through. Both now use the same resolution — the course's cast plus the
   signed-in user — and the studio prints **"Recording as Sasha · German — Voice 2"**
   at the top of the session so the answer is on screen rather than assumed.
2. The upload seam stamped whatever voice the slot held, synthetic or not. Voice 1 on
   deu_at is still Azure Ingrid, so a human take on that slot was filed as Ingrid.
   A take is now only ever stamped with a **human** voice; a slot still holding its TTS
   voice leaves the take unstamped and logs why. Unstamped is honest and still findable
   (slot-role matching); "Ingrid sang it" was neither.

The role picker also shows the course's real cast by voice name and pre-selects the
recordist's own slot, instead of offering Known / Target 1 / Target 2 as three equal,
unnamed, un-preselected options.

## What this means for you

- Sascha records from either door — Record Room or the production console — and her
  takes are attributed to her. She'll see her own name in the header before she starts.
- You'll see **Sasha** on voice 2 in the voice configuration now, not Jonas.
- One thing to know: **popty.app's default backend (the Camberley Mac) is offline right
  now** — its tunnel reports agent-offline. That's pre-existing and unrelated, but it
  means recording needs the "SSi Machine (Cloud)" backend in the environment switcher
  until Camberley is back.

## Left alone, per your call

The existing deu_at takes still stamped `de-AT-IngridNeural` — your ruling was
low-priority, discard or leave. They're untouched. Say the word and back-stamping them
to Sascha's voice id is a small scripted pass with a before-state assertion per row.

---

*Landed: commit `9205dc69` on `main`. Frontend live on popty.app (verified in the
served Autocue chunk, not just a 200); backend live on watson-1. Tests: 28 new,
full voice-engine suite green.*
