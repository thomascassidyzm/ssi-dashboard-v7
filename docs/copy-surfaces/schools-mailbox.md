# When we ask a teacher whether their mailbox reaches them

For whoever is editing. A school or teacher account is created the moment somebody
spends an invite code — no waiting on an email, because school mail gateways
quarantine our codes and a teacher stuck at that door is a teacher we lose. The cost
is that nothing has ever established that the address they typed can actually receive
our mail.

So we ask once, at the moment they have just made something they would hate to lose —
right after they create a class, or copy the join link they are about to send to
learners. Never as a badge that sits there. Close it and it stays closed: there is no
timer that brings it back.

**Edit the words freely.** The `##`/`###` headings and the little `key` lines in
backticks under them are how we map your edits back, so please leave those alone —
everything else is yours to change.

Three things are settled rather than open, and worth knowing before you edit:

- **The word "verify" never appears.** It is cold and it sounds like suspicion. What
  we are actually asking is whether the mailbox reaches them.
- **The reason is never compliance.** It is that we would rather not send anything
  about their learners to a mailbox that is not theirs. That is the stronger reason
  and the better story.
- **The different-address escape is never hidden.** It is offered plainly, every time,
  because a teacher's own address gets through when the school one will not — and that
  single option probably fixes most of the failures on its own.

British English throughout. No parentheses in the prose.

Source: `schools.ui.mailboxCheck.*` in ssi-learning-app
`packages/player-vue/src/locales/eng.json`, rendered by
`components/schools/MailboxCheckPrompt.vue`.

---

## The card, in the order a teacher meets it

### The card's title
*The first line they read, at the top of the card.*
`title`

Can we reach you here?

### The opening line
*Tom approved this wording.*
`lead`

Quick one — schools' spam filters are ferocious, and we'd rather find out now than the day you need to get back in.

### Why we are asking
*The true reason. Not paperwork — where their learners data would go.*
`reason`

It also means nothing about your learners ever goes to a mailbox that isn't yours.

### The main button
*Sends a code to the address already on the account.*
`sendCta`

Send me a code

### The main button while it is working
`sending`

Sending…

### The escape
*Always offered, never hidden. A teacher personal address gets through when the school one does not.*
`otherAddress`

Send it to a different address instead

### The label above the different-address box
`otherLabel`

Which address should we use?

### The button that sends it elsewhere
`otherSendCta`

Send it there

### What we say once the code is on its way
*The {email} is filled in with whichever address we sent to. Leave the braces alone.*
`codeSent`

Pop in the code we've just sent to {email} and you're sorted for good.

### The label above the code box
`codeLabel`

Your code

### The button that checks the code
`confirmCta`

That's the one

### That button while it is working
`confirming`

Checking…

### When it works
`success`

Lovely — that mailbox reaches you. You are sorted for good.

### The way out
*Closing it closes it for good. Nothing brings it back on a timer.*
`dismiss`

Not now

### If the address does not look like an address
`invalidEmail`

That doesn't look like an email address.

### If that address is already on their account
`alreadyLinked`

That one's already on your account, so you're covered.

### If the code is too short
`codeTooShort`

The code is six digits.

### If we could not send it
`sendFailed`

Couldn't send the code. Try again in a moment.

### If the code did not work
`checkFailed`

That code didn't work. Check it and try again.

### If the app cannot reach us at all
`notConnected`

Not connected — try again in a moment.
