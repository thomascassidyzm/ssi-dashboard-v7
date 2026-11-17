#!/usr/bin/env python3
"""Assembles FIX-LIST.md = FIX-LIST.head.md + every slice report in reports/, headings demoted one level. Regenerates."""
import os, re
d = os.path.dirname(os.path.abspath(__file__))
order = ['spa', 'por', 'fra', 'ita', 'deu', 'ara', 'jpn', 'kor', 'zho', 'eng-eu', 'eng-asia', 'eng-indic-north', 'eng-indic-south']
out = [open(os.path.join(d, 'FIX-LIST.head.md')).read()]
for s in order:
    fence = False; body = []
    for line in open(os.path.join(d, 'reports', s + '.md')).read().splitlines():
        if line.startswith('```'): fence = not fence
        body.append('#' + line if (not fence and re.match(r'#{1,5} ', line)) else line)
    out.append('\n'.join(body) + '\n\n---\n')
open(os.path.join(d, 'FIX-LIST.md'), 'w').write('\n'.join(out))
print('FIX-LIST.md', sum(len(x) for x in out), 'chars')
