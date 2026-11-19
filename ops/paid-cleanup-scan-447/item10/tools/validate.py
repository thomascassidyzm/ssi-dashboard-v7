#!/usr/bin/env python3
"""item10 validator pass (cs #714·AI; repointed to the nightly copy by cs #931·AI). For every seed the plan touches, runs
the course-builder's own deterministic validator sweep (routes/v2.cjs runSeedChecks, in process, no model calls) over the
course as the NIGHTLY COPY holds it, with that seed's planned LEGOs + phrases overlaid, and compares against a baseline
of the copy. A failure that is NEW under the plan is reported; pre-existing ones are counted, not blamed.
Reads only the copy (../copy-read.cjs refuses anything else); never calls :3471 or any Popty read route.
usage: python3 -I validate.py <course> <copy-dump.json> [--tag <tag>]"""
import json, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(ROOT))
import copykit

course, dumpf = sys.argv[1], sys.argv[2]
tag = sys.argv[sys.argv.index('--tag') + 1] if '--tag' in sys.argv else ''  # cs #743: plans/<course><tag>.json
pf = os.path.join(ROOT, 'plans', f'{course}{tag}.json')
dump = copykit.load_dump(dumpf)
plan = copykit.validate_plan(course, json.load(open(pf)), dump)
json.dump(plan, open(pf, 'w'), ensure_ascii=False, indent=1)
