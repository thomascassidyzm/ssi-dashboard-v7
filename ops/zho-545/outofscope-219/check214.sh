#!/bin/bash
curl -s "http://localhost:4317/api/conversations" -H "x-cs-conv: $CS_CONV_TOKEN" | python3 -c "
import json,sys
d=json.load(sys.stdin); rows=d if isinstance(d,list) else (d.get('conversations') or [])
st=[r.get('status') for r in rows if r.get('id')=='49fe464a-7226-460e-a8d8-2d03a6d4ea54']
sys.exit(0 if st and st[0]!='running' else 1)"
