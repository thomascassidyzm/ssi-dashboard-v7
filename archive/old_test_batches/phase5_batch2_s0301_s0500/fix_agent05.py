#!/usr/bin/env python3
"""
Fix and Validate Agent 05 Baskets
Corrects whitelist logic and validates GATE compliance
"""

import json
import re
from datetime import datetime

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_seed_number(seed_id):
    match = re.search(r'\d+', seed_id)
    return int(match.group()) if match else 0

def extract_spanish_words_from_lego(lego):
    """Extract Spanish words from a LEGO in seed file"""
    words = set()
    if lego.get('components'):
        for comp in lego['components']:
            spanish_part = comp[0].lower()
            parts = re.sub(r'[¿?¡!,;:.()[\]{}"\']', ' ', spanish_part).split()
            words.update(parts)
    else:
        target = lego['target'].lower()
        parts = re.sub(r'[¿?¡!,;:.()[\]{}"\']', ' ', target).split()
        words.update(parts)
    return words

def build_whitelist_for_seed(registry, seeds_data, target_seed_id):
    """Build whitelist INCLUDING current seed's LEGOs"""
    target_num = extract_seed_number(target_seed_id)

    # Registry LEGOs
    whitelist = set()
    for lego_id, lego_data in registry['legos'].items():
        match = re.match(r'S(\d+)L', lego_id)
        if match and int(match.group(1)) <= target_num:
            whitelist.update(lego_data['spanish_words'])

    # Current seed's LEGOs
    target_seed = next((s for s in seeds_data['seeds'] if s['seed_id'] == target_seed_id), None)
    if target_seed:
        for lego in target_seed['legos']:
            words = extract_spanish_words_from_lego(lego)
            whitelist.update(words)

    return whitelist

def validate_spanish_phrase(spanish, whitelist):
    words = re.sub(r'[¿?¡!,;:.()[\]{}"\']', ' ', spanish.lower()).split()
    violations = [w for w in words if w and w not in whitelist]
    return violations

def calculate_distribution(phrases):
    """Calculate actual distribution from phrases"""
    dist = {"really_short_1_2": 0, "quite_short_3": 0, "longer_4_5": 0, "long_6_plus": 0}

    for phrase in phrases:
        if len(phrase) < 4:
            continue
        count = phrase[3]  # LEGO count

        if count <= 2:
            dist["really_short_1_2"] += 1
        elif count == 3:
            dist["quite_short_3"] += 1
        elif count <= 5:
            dist["longer_4_5"] += 1
        else:
            dist["long_6_plus"] += 1

    return dist

def main():
    print("="*70)
    print("FIX AND VALIDATE AGENT 05 BASKETS")
    print("="*70)

    # Load data
    registry = load_json('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/registry/lego_registry_s0001_s0500.json')
    seeds_data = load_json('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_input/agent_05_seeds.json')
    baskets = load_json('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_output/agent_05_baskets.json')

    print("\nValidating with CORRECTED whitelist logic (including current seed)...")

    gate_violations = []
    distribution_mismatches = []

    for seed_id in sorted(baskets['seeds'].keys()):
        seed_data = baskets['seeds'][seed_id]

        # Build CORRECT whitelist (including current seed)
        whitelist = build_whitelist_for_seed(registry, seeds_data, seed_id)

        for lego_id, lego_data in seed_data['legos'].items():
            phrases = lego_data['practice_phrases']

            # Check GATE compliance
            for i, phrase in enumerate(phrases):
                english, spanish = phrase[0], phrase[1]
                violations = validate_spanish_phrase(spanish, whitelist)

                if violations:
                    gate_violations.append({
                        'seed': seed_id,
                        'lego': lego_id,
                        'phrase_num': i + 1,
                        'spanish': spanish,
                        'violations': violations
                    })

            # Calculate actual distribution
            actual_dist = calculate_distribution(phrases)
            stored_dist = lego_data.get('phrase_distribution', {})

            # Check if matches 2-2-2-4
            expected = {'really_short_1_2': 2, 'quite_short_3': 2, 'longer_4_5': 2, 'long_6_plus': 4}
            mismatches = {}
            for key, expected_val in expected.items():
                actual_val = actual_dist.get(key, 0)
                if actual_val != expected_val:
                    mismatches[key] = {'expected': expected_val, 'actual': actual_val}

            if mismatches:
                distribution_mismatches.append({
                    'seed': seed_id,
                    'lego': lego_id,
                    'mismatches': mismatches
                })

    print(f"\n{'='*70}")
    print("VALIDATION RESULTS (with corrected whitelist logic):")
    print(f"{'='*70}")
    print(f"GATE Violations: {len(gate_violations)}")
    print(f"Distribution Issues: {len(distribution_mismatches)}")

    if gate_violations:
        print(f"\n❌ GATE VIOLATIONS (First 20):")
        for i, v in enumerate(gate_violations[:20]):
            print(f"\n  {i+1}. {v['seed']}/{v['lego']} - Phrase {v['phrase_num']}")
            print(f"     Spanish: \"{v['spanish']}\"")
            print(f"     Violations: {', '.join(v['violations'])}")
        if len(gate_violations) > 20:
            print(f"\n  ... and {len(gate_violations) - 20} more violations")
    else:
        print("\n✅ NO GATE VIOLATIONS")

    if distribution_mismatches:
        print(f"\n⚠️  DISTRIBUTION MISMATCHES (First 10):")
        for i, m in enumerate(distribution_mismatches[:10]):
            print(f"\n  {i+1}. {m['seed']}/{m['lego']}:")
            for key, vals in m['mismatches'].items():
                print(f"      {key}: expected {vals['expected']}, got {vals['actual']}")
        if len(distribution_mismatches) > 10:
            print(f"\n  ... and {len(distribution_mismatches) - 10} more")
    else:
        print("\n✅ ALL DISTRIBUTIONS CORRECT")

    print(f"\n{'='*70}")
    if gate_violations == [] and distribution_mismatches == []:
        print("✅ VALIDATION PASSED")
        baskets['validation_status'] = "PASSED"
        baskets['validated_at'] = datetime.utcnow().isoformat() + "Z"

        # Save corrected file
        output_path = '/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_output/agent_05_baskets_validated.json'
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(baskets, f, ensure_ascii=False, indent=2)
        print(f"Saved validated file to: {output_path}")
    else:
        print("❌ VALIDATION FAILED - Corrections needed")
    print(f"{'='*70}")

if __name__ == "__main__":
    main()
