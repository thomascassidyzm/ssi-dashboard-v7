#!/usr/bin/env python3
"""calibrate.py <verdicts.jsonl> — score a run against #249·AL's hand-read known positives/negatives (d/2af42ddb)."""
import json, sys
POS = ["I’d prefer if I don’t care whenever you breathe", "I don’t mind that I don’t care", "to breathe every word",
       "every word was late", "whoever said it was absolutely wrong that I don’t care", "it’s your turn to breathe but I don’t mind",
       "game is a lucky word", "he has won three minutes with me", "one towel was at the other end of the mud", "it’s under the angry eyes"]
NEG = ["I’m tired of being dry", "the dog is sad without mud", "appear as though I don’t care"]
V = [json.loads(l) for l in open(sys.argv[1])]
hit = lambda s: [v for v in V if s in v['unit']['known'] or v['unit']['known'] == s]
ok = True
for s in POS:
    h = [v for v in V if v['unit']['known'] == s]
    print('POS', 'CAUGHT' if any(v['v'] == 'CLEAR_NONSENSE' for v in h) else ('borderline' if h else 'MISSED'), '|', s)
    ok &= any(v['v'] == 'CLEAR_NONSENSE' for v in h)
for s in NEG:
    h = hit(s)
    print('NEG', 'passed' if not any(v['v'] == 'CLEAR_NONSENSE' for v in h) else 'WRONGLY FLAGGED', ('(listed borderline)' if h else ''), '|', s)
    ok &= not any(v['v'] == 'CLEAR_NONSENSE' for v in h)
print('CALIBRATION', 'PASS' if ok else 'FAIL', '| flagged', sum(v['v'] == 'CLEAR_NONSENSE' for v in V), 'clear,', sum(v['v'] == 'BORDERLINE' for v in V), 'borderline')
