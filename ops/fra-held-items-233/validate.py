#!/usr/bin/env python3
"""cs #233: the course-builder validator (/v2/validate logic, in process) on the NIGHTLY COPY with each family's plan
overlaid, through #784/#931's copy-only kit. usage: python3 -I validate.py <copy-dump.json> <plan.json>..."""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paid-cleanup-scan-447'))
import copykit
dump = copykit.load_dump(sys.argv[1])
for pf in sys.argv[2:]:
    plan = json.load(open(pf))
    if not plan['ops']: continue
    print('==', plan['family'])
    plan = copykit.validate_plan(dump['course'], plan, dump)
    json.dump(plan, open(pf, 'w'), ensure_ascii=False, indent=1)
