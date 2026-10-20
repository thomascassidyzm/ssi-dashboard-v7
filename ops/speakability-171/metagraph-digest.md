# Metagraph digest for tagging (read from services/shared/metagraph/*.json at origin/main 9331c78b7)

Shapes = exchange nodes (N…) and bound pairs (P…). A row's SHAPE is the node it is a position in, written `N5.2` (node.position). Response MOVE = the F-family filling a response position. Use `none` when nothing in the store fits — that is a finding, never stretch a shape to fit.

## Shapes (positions in order; [F..] = the family that fills that position)

- **N1 Ritual open/close** (pod-1): 1:hail → 2:return[F14]
- **N2 Transaction** (pod-1): 1:solicit[F21] → 2:order[F1] → 3:clarify[F3] → 4:specify[F1] → 5:deliver[F1] → 6:reckoning → 7:receipt[F14]
- **N3 Availability enquiry** (pod-1): 1:is-there-X? → 2:answer[F2]
- **N4 Instruction-giving** (pod-1): 1:request → 2:instruct[F1] → 3:read-back[F9] → 4:confirm[F9] → 5:continue[F10] → 6:instruct[F1]
- **N5 Acquaintance** (pod-1): 1:Q → 2:A+return[F11]
- **N6 Repair** (pod-1): 1:turn → 2:non-understanding+request[F7] → 3:reformulate[F8] → 4:resume
- **N7 Arrangement** (pod-1): 1:proposal → 2:decline+account+counter[F5] → 3:decline+account+counter[F5] → 4:accept[F1]
- **N8 Recommendation** (pod-1): 1:solicit → 2:recommend with grounds[F2] → 3:uptake[F1]
- **N9 Feasibility request** (pod-1): 1:is-it-possible? → 2:grant+limit+pre-empt[F2]
- **N10 Compliment** (pod-1): 1:compliment[F12] → 2:thank+downgrade[F13]
- **N11 Mutual assessment** (pod-1): 1:self-downgrade[F13] → 2:counter-assess[F17] → 3:concede-and-hold[F16] → 4:counter-assess[F17] → 5:normalise+tag[F18] → 6:emphatic agree[F18]
- **N12 Trouble-and-advice** (pod-1): 1:trouble declaration → 2:elicit[F3] → 3:report[F1] → 4:advise[F1] → 5:dosage-Q → 6:instruct[F2]
- **N13 Not-knowing** (method-pod): 1:question → 2:I-don’t-know held with status → 3:the question it licenses
- **N14 Premise audit** (method-pod): 1:claim → 2:how-do-we-know-that → 3:ground supplied or conceded
- **N15 Parked disagreement** (method-pod): 1:position → 2:counter → 3:counter held → 4:explicit park
- **N16 Precision haggle** (method-pod): 1:number → 2:counterbid → 3:counterbid → 4:settlement formula
- **N17 Interruption-and-bank** (method-pod): 1:turn → 2:break → 3:name it and bank the thread
- **N301 Joint construction** (talk-bollocks): 1:open the clause and leave it hanging → 2:complete it (1–6 words) → 3:ratify, or amend the completion[F1] → 4:extend beyond the opener's version
- **N302 Digression-and-return** (talk-bollocks): 1:digress (flag optional) → 2:run the detour → 3:return marker, or thread-loss admitted → 4:either party restores the thread → 5:resume, detour optionally claimed as evidence
- **N303 The specimen** (talk-bollocks): 1:claim about how something works → 2:the partner is enrolled as the live case → 3:perform / undergo, imperfection allowed → 4:the result is folded back into the claim
- **N304 The reported claim too big to hold** (talk-bollocks): 1:report the claim + its source + its epistemic status → 2:register its size → 3:try it on jointly ('she would say…') → 4:leave it unresolved
- **N305 The proxy pitch** (talk-bollocks): 1:perform the pitch of the partner's thing → 2:owner ratifies or corrects → 3:owner extends; the improvement may be adopted
- **N306 The co-staged scene** (talk-bollocks): 1:propose the frame → 2:voice a role inside it → 3:the partner voices a role or the counter-role → 4:read the scene back into the live argument
- **N902 The razor** (method-pod): 1:theory claimed → 2:invite the full statement — 'listen to yourself' → 3:the full statement, self-refuting → 4:one-line verdict
- **N903 Public position-abandonment** (method-pod): 1:the old position quoted → 2:recantation at full strength, no hedge → 3:the partner joins the abandonment
- **N907 The misreading corrected** (method-pod): 1:turn → 2:paraphrase offered → 3:refused and replaced — 'that's not what I'm saying' → 4:continue on the corrected reading
- **N908 Complaint-with-partner-turn** (method-pod): 1:grievance voiced → 2:the partner completes it rather than answering → 3:held jointly — no fix owed
- **N909 Story → matched story** (method-pod): 1:anecdote → 2:structurally matching anecdote → 3:the match ratified — no verdict owed
- **N501 Compelled make-safe** (trades): 1:danger discovered, usually mid-other-business, unbidden → 2:danger declared against the norm[F2] → 3:the compelled act announced and DONE; consent not sought and refusal unavailable → 4:the record affixed and the reinstatement condition named — 'nobody reconnects that until it's re-tested' → 5:press on the person → drop the self, hold the duty, name the forum[F16] → 6:the onward path — who can fix it, what happens next (routes into the quote)[F2]
- **N1201 Medium contract** (medium-negotiation-canonical): 1:declare own limitation on the medium → 2:grant + reassure[F14] → 3:issue the standing repair licence → 4:accept the licence[F1] → 5:pivot to business[F21]
- **P1 Option-choice pair** (bound pair): 1:counter-Q[F3] → 2:specify[F1]
- **P2 Reckoning-and-pay pair** (bound pair): 1:reckoning → 2:pay-request[F3] → 3:grant[F2]
- **P3 Read-back pair** (bound pair): 1:read-back[F9] → 2:confirm-and-extend[F9]
- **P4 Continuer pair** (bound pair): 1:continuer[F10] → 2:continuation[F2]
- **P5 Elicit pair** (bound pair): 1:elicit[F3] → 2:report[F1]
- **P6 Onward-solicit pivot** (bound pair): 1:grant[F1] → 2:onward solicit[F21]

## Response moves (F-families) — the test each must pass

- **F1 Just do it** — The responder supplies exactly what the prior turn asked for, adds nothing beyond it, and does not qualify it.
- **F2 Do it and throw something in** — The responder grants, then volunteers material the ticket did not ask for.
- **F3 Answer with a question** — The response position is filled by a question rather than by an answer or a compliance.
- **F4 Roughly, and it depends** — The answer is given with an explicit hedge, an approximation or a condition attached.
- **F5 No, and here’s why, and here’s instead** — The responder declines a proposal, gives an account, and offers a counter-proposal — all three parts.
- **F6 Not that, but this** — The ticket is declined in substance and something is substituted in the same turn, with no apology or account.
- **F7 Say that again** — The responder declares non-understanding and requests a repeat.
- **F8 Said again, differently** — The responder grants a repair request and reformulates rather than merely repeating.
- **F9 Let me check I’ve got it** — The responder offers back a candidate version of what they just heard, and the other party confirms.
- **F10 Keep going** — A minimal turn whose only content is a request to continue.
- **F11 And you?** — The responder answers and hands the identical question straight back, in the same turn, minimally.
- **F12 Nice one** — The responder assesses the other party, their choice, their offering or their help.
- **F13 Kind of you, but** — The responder receives a compliment, thanks for it, and immediately downgrades the claim about themselves.
- **F14 The done thing** — The turn’s whole job is to return a ritual with its matching ritual. No propositional content is exchanged.
- **F15 I’m not sure** — The responder declines to commit either way and buys time, usually with a counter-request.
- **F16 Fair enough, but I still** — The responder concedes the other’s point and then holds their own position with a “but”.
- **F17 No you’re not** — The responder contradicts the other party’s account of themselves, positively.
- **F18 That’s normal, isn’t it?** — The responder normalises the other’s difficulty and invites agreement with a tag; the partner agrees emphatically.
- **F19 Here’s how I am** — The responder answers a formulaic wellbeing enquiry with a state report.
- **F21 Anything else?** — The responder completes the ticket and immediately solicits a further one in the same turn.
- **F301 So what you're saying is** — The listener hands back a compression or a NAME for what the speaker just built — sharper than the original — and the speaker ratifies and ADOPTS it into the joint position. The restatement is a contribution, not a check.
- **F302 It proves nothing — accept it anyway** — An epistemic flag prices the speaker's own authority down BEFORE the delivery — and thereby LICENSES delivery at full strength. The flag is not a withholding; it is what buys the confidence.
- **F303 The shared line** — A line minted between the parties is redeployed later as a joint tool — as argument, tease or shorthand — its ownership common and its provenance contestable in play.
- **F304 Comment on the medium** — Either party comments on the conversation's own machinery — the tape, the hour, the un-recordable gestures — as play, and the machinery may be used AS a tool by either side.
- **F305 Absorb and build** — A counterexample or concession — the partner's or the speaker's own — is welcomed and folded into the claim as an upgrade. The counter is treated as data FOR the frame, not against it.
- **F306 Exactly where I'm about to go** — The partner's contribution is ratified as the speaker's own planned next move — the floor merges rather than passes. Only honest between parties with equal access to the terrain.
- **F601 Answer the need, not the question** — The responder receives a question whose premise is false in a way the asker cannot currently repair, and fills the answer slot with a response to the STATE that produced the question — the premise's truth-value neither granted nor corrected.

## Outcome shapes (things going off the expected path)

- **O1 Non-delivery with a reason** — learner must own: Absorb the no; re-select, or ask what is possible
- **O2 Nobody knows** — learner must own: Re-route the ask — another person, another means
- **O3 The native does not understand you** — learner must own: Reformulate your own turn — shorter, slower — and check it landed
- **O4 Your read-back was wrong** — learner must own: Take the correction and read back again
- **O5 The premise of your ask is wrong** — learner must own: Drop the premise; ask the prior question
- **O6 Trouble that is your own fault** — learner must own: Admit it, supply what you can, accept the consequence
- **O7 The native discloses worry or difficulty** — learner must own: Acknowledge without fixing, then continue
- **O8 You are disagreed with** — learner must own: Hold or yield, explicitly
- **O9 A second no** — learner must own: Produce a third position, or yield
