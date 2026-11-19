#!/usr/bin/env python3
"""validator pass for the 11/13/17/19 families (cs #784·AI; repointed to the nightly copy by cs #931·AI): the
course-builder's own validator sweep, in process, over the NIGHTLY COPY with each touched seed's plan overlaid
(planned lego.insert rows join their seed). Reads only the copy; never calls :3471 or any Popty read route.
usage: python3 -I validate.py <fam-dir> <course> <copy-dump.json>"""
import json, os, sys
FAM = sys.argv[1]; del sys.argv[1]
KIT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.join(KIT, FAM)
sys.path.insert(0, os.path.dirname(KIT))
import copykit

course, dumpf = sys.argv[1], sys.argv[2]
pf = os.path.join(ROOT, 'plans', f'{course}.json')
dump = copykit.load_dump(dumpf)
plan = copykit.validate_plan(course, json.load(open(pf)), dump)
json.dump(plan, open(pf, 'w'), ensure_ascii=False, indent=1)
