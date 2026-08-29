# Misko — popty.app course-builder access

*Created 2026-08-29. Live and verified.*

---

## FOR TOM

**Done.** Misko can sign in at https://popty.app right now with `miskok21@gmail.com`.
No further action needed from you unless you want to change one of the three defaults below.

**What he can do:** build and edit course content, and record audio, for the three courses
granted to him — Croatian, Serbian and Macedonian. That is the course-builder job you described.

**What he cannot do:** see or touch any other course; add, remove or change users; reach the
spend and admin surfaces. He also has **no access to the SSi code repositories** — I checked his
Command Surface account and the two SSi repos had already been removed. He keeps Zenjin
(`zenjin-2026-v1`) and your shared room, both untouched.

### Three defaults, each a one-word answer

**1. Role — I gave him `editor`, not `admin`.**
In this schema `editor` means "can edit and record for the courses he's been granted" — that is
the role that makes someone an admin *of courses*. `admin` means every course plus User Management
plus every admin surface, which is more than a course builder needs on day one.
*Say "admin" and I'll change it,* or do it yourself: popty.app → **Users** → Misko → set role to
Admin (admins get all courses automatically).

**2. Course scope — Croatian, Serbian, Macedonian.**
| Code | Name | State |
|---|---|---|
| `hrv_for_eng` | Croatian for English Speakers | released, 300 seeds |
| `srp_for_eng` | Serbian for English Speakers | beta |
| `mkd_for_eng` | Macedonian for English Speakers | draft |

These are every Balkan course that exists. **There is no Montenegrin course** — nor Bosnian,
Slovenian or Albanian. If the Balkans roll-out starts with Montenegrin, that course has to be
created before he can be scoped to it. Change the scope on popty.app → **Users** → Misko.

**3. Name — I put "Misko".**
That is your word for him, not a guess of mine; his surname is still unknown and his Command
Surface display name is the same. Send me his full name and I'll set it, or edit it on the
**Users** screen.

### The gap I could not close
I cannot test his actual login — I don't have his mailbox. What I *did* verify, from outside the
write path, against the live site: `https://popty.app/api/auth/me?email=miskok21@gmail.com`
returns his row exactly as intended — role `editor`, the three courses, name Misko — and his
Supabase sign-in account exists and is confirmed, which is what makes the emailed code work on his
first attempt. Everything up to the point of him opening his inbox is proven.

---

## FOR MISKO — forward this bit verbatim

Hi Misko — your account is ready.

**To sign in, the first time and every time:**

1. Go to **https://popty.app**
2. Type in your email: **miskok21@gmail.com**
3. You'll get an email within a minute with a **6-digit code**. Type that code into the site.
4. That's it — you're in.

**If the email doesn't arrive:** check your spam folder first, then just ask for the code again
from the same page. If it still doesn't come, tell Tom — he can fix it from his side in a minute.
Do use exactly `miskok21@gmail.com`; a different address won't be recognised.

**What you'll see, and what you're there to do:** you have the three Balkan courses —
**Croatian, Serbian and Macedonian**. You can write and edit the course content and record the
audio for those three. Other courses on the system aren't yours and won't be visible to you.

Welcome aboard.
