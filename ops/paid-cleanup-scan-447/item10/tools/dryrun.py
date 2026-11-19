#!/usr/bin/env python3
"""item10 dry run (cs #714·AI; governed by cs #931·AI): sends plans/<course><tag>.json "ops" to Popty's edit door as a
DRY RUN (POST /api/production/<course>/edit-batch WITHOUT "apply": the real transaction, rolled back) in chunks of at
most 100 ops (default 50), paced, each chunk only while /health shows dbLoadGate governed + green; stores every answer
in the plan under "dryRun". Never sends "apply". If every chunk answers 200, also writes plans/<course><tag>.changeset.jsonl
(services/shared/changeset.cjs) and runs the applier's offline --check on it.
usage: python3 -I dryrun.py <course> [--tag <tag>] [--chunk 50]"""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__)))))  # ops/paid-cleanup-scan-447 (copykit), through symlinked shard dirs too
import copykit

course = sys.argv[1]
tag = sys.argv[sys.argv.index('--tag') + 1] if '--tag' in sys.argv else ''
chunk = int(sys.argv[sys.argv.index('--chunk') + 1]) if '--chunk' in sys.argv else 50
pf = os.path.join(ROOT, 'plans', f'{course}{tag}.json')
if copykit.dryrun(course, pf, 'cs-931-item10-plan (dry run only)', chunk):
    copykit.write_changeset(pf, os.path.join(ROOT, 'plans', f'{course}{tag}.changeset.jsonl'), 'item10 plan (cs #931·AI kit)')
