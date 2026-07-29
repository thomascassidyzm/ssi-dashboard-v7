<!-- The APML lineage page — HAND-MAINTAINED RULINGS SOURCE for the /stocktake/apml page.
Founder-authored doctrine only: the design principles and the reasoning. Every
CURRENT-STATE claim the old APMLSpec.vue carried — endpoints, ports, phase
structure, version numbers, schema tables — is compiled from the code and
rendered alongside this prose; none of it belongs here. Distilled 2026-07-27
from the retired APMLSpec.vue (in git); renamed and re-framed per the founder's
ruling 2026-07-29: APML is architectural lineage, not a live requirement. -->

## what APML is

APML — AI Projects Markup Language, also read as Agent Protocol Markup Language — was the
original concept behind this system: capture INTENT as code, in YAML, so that what a project
means to do is written down as precisely as what its code happens to do. It was a great idea,
and its value has been largely superseded by the rate of model improvement — models now read
intent straight out of prose, code and conversation, so a formal intent language is no longer
the load-bearing layer it was designed to be. The APML files in this repo are kept as
architectural lineage, not as a live requirement: they record where the system's thinking came
from. What survives of APML is not the syntax but the stance, and that stance is now enforced
by the machine gates below — the course is data plus gates, not code plus opinions, and every
constraint the method cares about is held by a gate rather than by a reviewer's memory.

## the directions

The architectural principles the system was built to honour — born in the APML era, still the
fitness functions today. Everything is a parameter — no magic numbers. Each component does one
thing. Source data is never mutated, only extended. The same operation twice gives the same
result. Store the raw truth, compute the derived. Explicit beats implicit — relationships and
dependencies stay visible. Errors carry reasons, not just status. Everything can be queried
and inspected. Build complex behaviour from simple composable parts. These are fitness
functions, not slogans: a change that fights one of them needs a better story than "it works".

## validate-then-insert

Every gate runs first and accumulates **all** errors into one list; only if that list is empty
does anything get written. "Atomic" here means validate-everything-then-insert-everything, or
insert nothing — there is no partial save, and the submitting agent sees every problem at once.
A rejection is the method protecting the learner, not the tool being difficult. The live gate
list, in execution order, is compiled from the validator itself on the Pipeline page.

## why hold-out, not rejection, for phrase-level ZUT

A LEGO-level ZUT collision is the seed's core wiring gone wrong, so the whole seed is rejected.
A phrase-level collision is one phrase's problem, so only the transgressor is withheld while
the seed and every conforming phrase land — ZUT is never a reason to lose a whole seed of work.
The held-out phrase comes back with a hint: consolidate to the existing target, or
differentiate the known-language prompt so it naturally carries the distinction — with context
words, never with parentheses, because the course explains nothing and demonstrates everything.

## audio ownership

Courses own their audio — simple is better. Audio rows carry their text, role and origin
explicitly (`tts` is regenerable; `human` is precious and never regenerable), and shared
content like encouragements lives apart from course content. Two standing consequences: TTS
costs real money, so audio is only ever minted after an approved audio pass — a content pass
ends by queueing the request, never by running TTS — and some courses are human-voiced by
ruling and never synthesised at all.
