#!/usr/bin/env python3
"""READ-ONLY (cs #714·AI; nightly copy since cs #931·AI): full phrase rows (incl. target_text_roman) for the LEGOs of
the seeds a decisions file names (or --all), read from the NIGHTLY COPY by ../copy-read.cjs. Writes
$CS_SCRATCH/baskets-<course>.json {lego_id: [rows]} for plan.py and lexicon_zho.py.
usage: python3 -I baskets.py <course> <copy-dump.json> [--all] [--tag <tag>]"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(ROOT))
import copykit
course, dumpf = sys.argv[1], sys.argv[2]
copykit.load_dump(dumpf)
tag = sys.argv[sys.argv.index('--tag') + 1] if '--tag' in sys.argv else ''
out_f = os.path.join(os.environ['CS_SCRATCH'], f'baskets-{course}.json')
if '--all' in sys.argv:
    copykit.copy_read('baskets', course, out_f, 'all')
else:
    dec = json.load(open(os.path.join(ROOT, 'decisions', f'{course}{tag}.json')))
    copykit.copy_read('baskets', course, out_f, ','.join(str(n) for n in sorted({int(d['id'][1:5]) for d in dec['legos']})))
