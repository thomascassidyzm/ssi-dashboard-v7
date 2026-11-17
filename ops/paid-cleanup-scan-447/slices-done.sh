#!/bin/bash
# exits 0 when none of the room-dispatched slice jobs #467-#476 is still running (read-only; surface jobs list)
curl -s "http://localhost:4317/api/jobs?q=cleanup%20scan" -H "x-cs-conv: $CS_CONV_TOKEN" | python3 -c "
import json,sys
j=[x for x in json.load(sys.stdin)['jobs'] if x.get('job') and 467<=x['job']<=476]
sys.exit(0 if len(j)==10 and all(x['status']!='running' for x in j) else 1)"
