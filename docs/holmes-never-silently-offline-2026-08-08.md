# Holmes: never silently offline again

**Nothing for you to do. It is installed on your Mac and running right now** — I could reach Holmes over the tailnet, so I did the install myself rather than handing you a paste. Verified live at 02:45 BST: the backend answers on 3470, `popty.ngrok.app/health` answers 200 from the outside, and killing the backend brought it straight back on its own.

If you ever need it again — after a wipe, or to set up a second Mac — this is the whole thing, one block:

```
cd ~/SSi/ssi-dashboard-v7-clean && git pull --ff-only origin main && sh ops/launchd/install-holmes-agents.sh
```

No sudo. Safe to run twice. It prints PASS or FAIL for the backend and the tunnel at the end, so you know before you close the window.

---

## What is now true

Popty on your Mac comes back by itself after a reboot, a crash, a kill, or a logout and login. You no longer type those two commands, ever.

Three background jobs, installed as macOS LaunchAgents — the thing macOS already has, so nothing new to run or maintain:

- **the backend** — `services/production-api.cjs` on port 3470
- **the tunnel** — `ngrok http --url=popty.ngrok.app 3470`
- **a watchdog** — checks both every two minutes and restarts whichever has stopped answering

The watchdog exists because "the process is alive" and "the thing is working" are different questions. macOS restarts a process that *exits*; it cannot see one that is wedged. The watchdog waits for two consecutive misses before acting, so a slow answer, or a restart you did yourself, doesn't start a restart loop.

## And something tells you now

The part you actually complained about was finding out from a red dot. So watson-1 — which is always up and always has network, and can therefore still speak when Holmes cannot — now curls `popty.ngrok.app/health` every five minutes. If it fails **three times in a row**, one plain-English line arrives on your board:

> Tom's Mac (Holmes) has been offline for ~15 minutes — popty.ngrok.app is not answering. Jobs on your own hardware won't run until it's back.

One card, not one every five minutes. It resolves itself when Holmes comes back.

**Two numbers I chose, both easy to overrule:** check every 5 minutes, notice only after ~15 minutes of continuous failure. That is deliberately slow — a closed lid, a reboot or a wifi blip must not page you, because a notice for every blip is a notice you learn to ignore. Say the word and I'll tighten or loosen either.

## When something does go wrong

Logs are in `~/Library/Logs/` on the Mac, and they survive reboots:

```
tail -n 40 ~/Library/Logs/popty-production-api.err.log
tail -n 40 ~/Library/Logs/popty-ngrok.err.log
tail -n 40 ~/Library/Logs/popty-watchdog.log
```

To check it is running: `launchctl list | grep popty` — three lines, second column `0`.

## One thing I found and did not touch

Your **`com.ssi.orchestrator`** agent (a different thing, from a different job — the SSi_Course_Production orchestrator) has been failing on this Mac for a while: exit code 78, because it points at `/usr/local/bin/node` and node on an Apple Silicon Mac lives at `/opt/homebrew/bin/node`. Exactly the trap the new agents are built to avoid. It is a one-line fix and outside what you asked me for — say the word and it's done.

## What I have not proved

I killed the backend and watched it come back; I did not reboot your Mac, because it is your Mac and you are using it. `RunAtLoad` is the standard mechanism and the agents are loaded correctly for it, but the reboot itself is untested. Next time you restart, `launchctl list | grep popty` is the one-line check.
