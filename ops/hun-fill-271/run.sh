#!/usr/bin/env bash
# cs #271·AL — one sequential pass over slots.json (status ok) through the committed CLI tools/audio/render.cjs, unchanged,
# with Kai's approval token (CS_CONV_TOKEN from env, sent by render.cjs as x-cs-conv). Mode dry|apply. No retries.
# apply: render (one call) then POST link-clip FILL-ONLY (never replace) into the slot (a bare-uuid row = the LEGO-debut slot: legoId). Output: results/<mode>.jsonl
set -u; MODE=$1; HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(cd "$HERE/../.." && pwd); OUT=$HERE/results/$MODE.jsonl
mkdir -p "$HERE/results"; export AGENT_ID=kai-271
APPROVAL="kai:2026-11-24:hun_for_eng last 44 silent target slots, Kai Y 24 Nov 18:19Z"
declare -A V=([target1]=cartesia_42e4da1d-34d8-4fe0-8fc6-086afd6df348 [target2]=cartesia_4c5c7be8-6b3b-4c62-b915-c54d049c198f)
python3 -I -c 'import json,sys;[print(json.dumps(s,ensure_ascii=False)) for s in json.load(open(sys.argv[1])) if s["status"]=="ok"]' "$HERE/slots.json" |
while IFS= read -r S; do
  role=$(jq -r .role <<<"$S"); text=$(jq -r .text <<<"$S"); lego=$(jq -r .lego <<<"$S"); pid=$(jq -r .phraseId <<<"$S")
  key="$pid|$role"; grep -qF "\"key\":\"$key\"" "$OUT" 2>/dev/null && continue
  args=(--course hun_for_eng --role "$role" --text "$text" --lego "$lego" --voice "${V[$role]}" --approval "$APPROVAL" --job "#271·AL" --purpose "fill silent slot, Kai Y 24 Nov 18:19Z")
  [ "$MODE" = dry ] && args+=(--dry-run)
  R=$(node "$ROOT/tools/audio/render.cjs" "${args[@]}" 2>&1 | tail -c 4000); RC=$?
  RJ=$(jq -c . <<<"$R" 2>/dev/null || jq -nc --arg r "$R" '{raw:$r}')
  L=null
  if [ "$MODE" = apply ] && [ "$(jq -r '.ok // false' <<<"$RJ")" = true ] && [ "$(jq -r '.audioId // ""' <<<"$RJ")" != "" ]; then
    aid=$(jq -r .audioId <<<"$RJ")
    L=$(curl -s -w '\n%{http_code}' -X POST "http://localhost:3470/api/production/hun_for_eng/link-clip" -H 'Content-Type: application/json' -H 'x-agent-id: kai-271' \
        -d "$(jq -nc --arg p "$pid" --arg r "$role" --arg a "$aid" --arg l "$lego" '{links:[(if ($p|test("^[0-9a-f-]{36}$")) then {legoId:$l} else {phraseId:$p} end) + {role:$r,audioId:$a}]}')" | { read -r -d '' b; c=${b##*$'\n'}; j=${b%$'\n'*}; jq -c --arg c "$c" '. + {status:($c|tonumber)}' <<<"$j" 2>/dev/null || jq -nc --arg r "$b" '{raw:$r}'; })
  fi
  jq -nc --arg at "$(date -u +%FT%TZ)" --arg key "$key" --argjson s "$S" --argjson r "$RJ" --argjson l "$L" --arg v "${V[$role]}" \
     '{at:$at,key:$key,row:$s.row,lego:$s.lego,role:$s.role,text:$s.text,voiceAsked:$v,render:$r,link:$l}' >> "$OUT"
  echo "$role ${S:0:0}$(jq -r .row <<<"$S") $(jq -r '[.code,.source,.wouldSpendChars,.charsSpent,.voiceId,.audioId]|map(tostring)|join(" ")' <<<"$RJ") link=$(jq -r 'if .==null then "-" else (.status|tostring)+" "+((.ok//false)|tostring) end' <<<"$L")"
  case "$(jq -r '.code // ""' <<<"$RJ")" in APPROVAL_UNVERIFIED|NOT_IN_CHAIN|DAILY_TOTAL_CAP|APPROVAL_CHECK_UNAVAILABLE|POPTY_UNAVAILABLE) echo "STOP: $(jq -r .code <<<"$RJ")"; exit 2;; esac
done
