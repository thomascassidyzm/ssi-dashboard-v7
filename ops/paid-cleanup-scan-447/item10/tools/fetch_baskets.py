#!/usr/bin/env python3
"""item10 (cs #742·AI; nightly copy since cs #931·AI): READ-ONLY. $CS_SCRATCH/baskets-<course>.json = {lego_id: [phrase rows]}
for the seeds a decisions file names, from the NIGHTLY COPY (../copy-read.cjs); rows carry target_text_roman, which plan.py
needs to send a fresh romanisation with every changed target (else ROMAN_STALE). Same as baskets.py without a dump.
usage: python3 -I fetch_baskets.py <course> [--tag b]"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(ROOT))
import copykit
course = sys.argv[1]
tag = ('-' + sys.argv[sys.argv.index('--tag') + 1]) if '--tag' in sys.argv else ''
dec = json.load(open(os.path.join(ROOT, 'decisions', f'{course}{tag}.json')))
out = os.path.join(os.environ['CS_SCRATCH'], f'baskets-{course}.json')
copykit.copy_read('baskets', course, out, ','.join(str(n) for n in sorted({int(d['id'][1:5]) for d in dec['legos']})))
