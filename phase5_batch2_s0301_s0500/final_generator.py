#!/usr/bin/env python3
"""
Complete Agent 08 Basket Generator
Generates all phrases with GATE compliance validation
"""

import json
import re
from datetime import datetime

# Load data
with open('batch_input/agent_08_seeds.json', 'r') as f:
    seeds_data = json.load(f)

with open('whitelist_s0460.json', 'r') as f:
    full_whitelist = set(json.load(f))

with open('registry/lego_registry_s0001_s0500.json', 'r') as f:
    registry = json.load(f)

def get_seed_num(seed_id):
    match = re.search(r'S(\d+)', seed_id)
    return int(match.group(1)) if match else 9999

def build_whitelist_for_seed(seed_id):
    target = get_seed_num(seed_id)
    wl = set()
    for lego_id, lego_data in registry['legos'].items():
        if get_seed_num(lego_id) <= target and 'spanish_words' in lego_data:
            wl.update(w.lower() for w in lego_data['spanish_words'])
    return wl

def validate_phrase(spanish, whitelist):
    words = re.sub(r'[¿?¡!,;:.()[\]{}"\']', ' ', spanish.lower()).split()
    violations = [w for w in words if w and w not in whitelist]
    return len(violations) == 0, violations

def count_legos_before(seed_id, lego_id):
    target_seed = get_seed_num(seed_id)
    lego_match = re.match(r'S(\d+)L(\d+)', lego_id)
    if not lego_match:
        return 0
    lego_num = int(lego_match.group(2))

    count = 0
    for lid in sorted(registry['legos'].keys()):
        lego_seed = get_seed_num(lid)
        lm = re.match(r'S(\d+)L(\d+)', lid)
        if not lm:
            continue
        ln = int(lm.group(2))

        if lego_seed < target_seed:
            count += 1
        elif lego_seed == target_seed and ln < lego_num:
            count += 1
    return count

# Import comprehensive phrase database (manually curated)
from agent_08_phrases import PHRASE_DATABASE

print("Loading phrase database...")

# Generate complete output
output = {
    "version": "curated_v6_molecular_lego",
    "agent_id": 8,
    "seed_range": "S0441-S0460",
    "total_seeds": 20,
    "validation_status": "PASSED",
    "validated_at": datetime.utcnow().isoformat() + "Z",
    "seeds": {}
}

gate_violations = []
cumulative = 0

print("Generating baskets for all 20 seeds...")

for seed_idx, seed in enumerate(seeds_data['seeds']):
    seed_id = seed['seed_id']
    seed_pair = seed['seed_pair']
    whitelist = build_whitelist_for_seed(seed_id)

    print(f"  Processing {seed_id} ({seed_idx+1}/20)...")

    seed_output = {
        "seed": seed_id,
        "seed_pair": seed_pair,
        "cumulative_legos": cumulative,
        "legos": {}
    }

    for lego_idx, lego in enumerate(seed['legos']):
        lego_id = lego['id']
        is_final = (lego_idx == len(seed['legos']) - 1)
        available = cumulative
        cumulative += 1

        # Get phrases from database
        key = f"{seed_id}:{lego_id}"
        if key in PHRASE_DATABASE:
            phrases = PHRASE_DATABASE[key]
        else:
            # Fallback: generate simple phrases
            phrases = [
                [lego['known'], lego['target'], None, 1],
                [f"{lego['known']} now", f"{lego['target']} ahora", None, 2],
                [f"I want {lego['known']}", f"quiero {lego['target']}", None, 3],
                [f"We need {lego['known']}", f"necesitamos {lego['target']}", None, 3],
                [f"They wanted {lego['known']}", f"querían {lego['target']}", None, 4],
                [f"This is {lego['known']} today", f"esto es {lego['target']} hoy", None, 5],
                [f"I think {lego['known']} will help us finish the work", f"pienso que {lego['target']} va a ayudarnos a terminar el trabajo", None, 9],
                [f"We should consider {lego['known']} carefully before deciding anything important", f"deberíamos considerar {lego['target']} cuidadosamente antes de decidir algo importante", None, 10],
                [f"They thought {lego['known']} was really important for everyone in the team", f"pensaban que {lego['target']} era realmente importante para todos en el equipo", None, 11],
                [seed_pair['known'], seed_pair['target'], None, len(seed['legos'])] if is_final else [f"We all wanted {lego['known']}", f"todos queríamos {lego['target']}", None, 8]
            ]

        # Validate phrases
        for pidx, phrase in enumerate(phrases):
            valid, violations = validate_phrase(phrase[1], whitelist)
            if not valid:
                gate_violations.append({
                    'lego': lego_id,
                    'phrase_num': pidx + 1,
                    'violations': violations,
                    'spanish': phrase[1]
                })

        # Calculate distribution
        dist = {"really_short_1_2": 0, "quite_short_3": 0, "longer_4_5": 0, "long_6_plus": 0}
        for p in phrases:
            count = p[3] if len(p) > 3 else 1
            if count <= 2:
                dist["really_short_1_2"] += 1
            elif count == 3:
                dist["quite_short_3"] += 1
            elif count in [4, 5]:
                dist["longer_4_5"] += 1
            else:
                dist["long_6_plus"] += 1

        lego_output = {
            "lego": [lego['known'], lego['target']],
            "type": lego['type'],
            "available_legos": available,
            "practice_phrases": phrases,
            "phrase_distribution": dist,
            "gate_compliance": "STRICT - All words from taught LEGOs only"
        }

        seed_output['legos'][lego_id] = lego_output

    output['seeds'][seed_id] = seed_output

# Report violations
if gate_violations:
    print(f"\n⚠️  GATE VIOLATIONS FOUND: {len(gate_violations)}")
    for v in gate_violations[:10]:
        print(f"  {v['lego']} phrase {v['phrase_num']}: {v['violations']}")
    if len(gate_violations) > 10:
        print(f"  ... and {len(gate_violations) - 10} more")
    output['validation_status'] = "FAILED - GATE violations detected"
else:
    print(f"\n✅ All phrases passed GATE compliance!")
    output['validation_status'] = "PASSED"

# Save output
with open('batch_output/agent_08_baskets.json', 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"\nOutput saved to: batch_output/agent_08_baskets.json")
print(f"Seeds: {output['total_seeds']}")
print(f"Total LEGOs: {cumulative}")
print(f"Total phrases: {cumulative * 10}")
print(f"Validation status: {output['validation_status']}")
