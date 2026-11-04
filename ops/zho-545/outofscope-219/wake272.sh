#!/bin/bash
# one-shot waker: wakes #219 when the pinyin apply on zho_for_eng (cs-long-272-apply-zho-b) stops. Bounded 3h.
for i in $(seq 1 360); do systemctl --user is-active --quiet cs-long-272-apply-zho-b || { M='WAKE: cs-long-272-apply-zho-b finished - retry the #219 dry run then apply'; break; }; sleep 30; done
M=${M:-'TIMED OUT after 3h waiting on cs-long-272-apply-zho-b'}
node ~/command-surface/tools/cs-wake-send.cjs 9496a54e-c6b2-4107-844f-d2fb3ccab979 "$CS_CONV_TOKEN" "$M"
