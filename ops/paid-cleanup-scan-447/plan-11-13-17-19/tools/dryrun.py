#!/usr/bin/env python3
"""dry run for the 11/13/17/19 families (cs #784·AI; governed by cs #931·AI): <fam-dir>/plans/<course>.json "ops" to
Popty's edit door WITHOUT "apply" (rolled back), chunks of at most 100 (default 50), paced, only while /health shows
dbLoadGate governed + green; answers stored under "dryRun". All 200 -> <fam-dir>/plans/<course>.changeset.jsonl + offline --check.
usage: python3 -I dryrun.py <fam-dir> <course> [--chunk 50]"""
import os, sys
FAM = sys.argv[1]; del sys.argv[1]
KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.join(KIT, FAM)
sys.path.insert(0, os.path.dirname(KIT))
import copykit

course = sys.argv[1]
chunk = int(sys.argv[sys.argv.index('--chunk') + 1]) if '--chunk' in sys.argv else 50
pf = os.path.join(ROOT, 'plans', f'{course}.json')
if copykit.dryrun(course, pf, f'cs-931-{FAM.strip("/")}-plan (dry run only)', chunk):
    copykit.write_changeset(pf, os.path.join(ROOT, 'plans', f'{course}.changeset.jsonl'), f'{FAM} plan (cs #931·AI kit)')
