<!-- The why-of-APML — HAND-MAINTAINED RULINGS SOURCE for the /docs/apml page.
Founder-authored doctrine only: the design principles and the reasoning. Every
CURRENT-STATE claim the old APMLSpec.vue carried — endpoints, ports, phase
structure, version numbers, schema tables — is now compiled from the code and
rendered alongside this prose; none of it belongs here. Distilled 2026-07-27
from the retired APMLSpec.vue (in git). -->

## what APML is

APML — Adaptive Pedagogy Markup Language — is the name for the system's declarative approach to
course production: the course is data plus gates, not code plus opinions. A course build is a
sequence of validated submissions against a specification, so the same methodology produces the
same course shape in any language pair, and every constraint the method cares about is enforced
by a machine gate rather than by a reviewer's memory.

## the directions

The architectural principles the system is built to honour. Everything is a parameter — no
magic numbers. Each component does one thing. Source data is never mutated, only extended. The
same operation twice gives the same result. Store the raw truth, compute the derived. Explicit
beats implicit — relationships and dependencies stay visible. Errors carry reasons, not just
status. Everything can be queried and inspected. Build complex behaviour from simple composable
parts. These are fitness functions, not slogans: a change that fights one of them needs a
better story than "it works".

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
