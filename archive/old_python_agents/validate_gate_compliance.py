#!/usr/bin/env python3
"""
GATE Compliance Validator for Agent 06 Baskets
Checks every Spanish word against whitelist of taught LEGOs
"""

import json
import re
from collections import defaultdict

def load_registry(registry_path):
    """Load the LEGO registry"""
    with open(registry_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_baskets(baskets_path):
    """Load the generated baskets"""
    with open(baskets_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def build_cumulative_whitelist(registry, max_seed_num):
    """Build whitelist of all Spanish words up to max_seed_num"""
    whitelist = set()

    for lego_id, lego_data in registry['legos'].items():
        match = re.match(r'S(\d+)L(\d+)', lego_id)
        if not match:
            continue

        seed_num = int(match.group(1))

        if seed_num <= max_seed_num:
            whitelist.update(lego_data['spanish_words'])

    return whitelist

def tokenize_spanish(text):
    """Tokenize Spanish text into words"""
    # Remove punctuation
    cleaned = re.sub(r'[¿?¡!.,;:]', '', text)
    # Split on whitespace
    words = cleaned.strip().split()
    return [w.lower() for w in words if w]

def validate_phrase(spanish_text, whitelist):
    """Check if all words in Spanish phrase are in whitelist"""
    words = tokenize_spanish(spanish_text)
    violations = []

    for word in words:
        if word not in whitelist:
            violations.append(word)

    return violations

def build_whitelist_for_lego_in_seed(registry, seed_id, lego_id, lego_position, baskets):
    """Build whitelist for a specific LEGO based on its position in the seed"""
    whitelist = set()

    # Parse CURRENT seed number (where this LEGO is being used)
    seed_match = re.match(r'S(\d+)', seed_id)
    if not seed_match:
        return whitelist

    current_seed_num = int(seed_match.group(1))

    # Add words from ALL LEGOs in earlier seeds
    for reg_lego_id, lego_data in registry['legos'].items():
        reg_match = re.match(r'S(\d+)L(\d+)', reg_lego_id)
        if not reg_match:
            continue

        seed_num = int(reg_match.group(1))

        # Include all words from earlier seeds
        if seed_num < current_seed_num:
            whitelist.update(lego_data['spanish_words'])

    # Add words from LEGOs in CURRENT seed up to and including current position
    seed_data = baskets.get(seed_id, {})
    lego_keys = [k for k in seed_data.keys() if k.startswith('S0')]

    for idx, current_lego_id in enumerate(sorted(lego_keys)):
        if idx <= lego_position:
            # Get this LEGO's words from registry
            if current_lego_id in registry['legos']:
                whitelist.update(registry['legos'][current_lego_id]['spanish_words'])

    return whitelist

def validate_all_baskets(registry_path, baskets_path):
    """Validate all baskets for GATE compliance"""
    registry = load_registry(registry_path)
    baskets = load_baskets(baskets_path)

    print("=" * 80)
    print("GATE COMPLIANCE VALIDATION")
    print("=" * 80)

    all_violations = defaultdict(list)
    total_phrases = 0
    total_violations = 0

    # Process each seed
    for seed_id in sorted([k for k in baskets.keys() if k.startswith('S0')]):
        seed_data = baskets[seed_id]

        # Extract seed number
        match = re.match(r'S(\d+)', seed_id)
        if not match:
            continue

        seed_num = int(match.group(1))

        print(f"\n{seed_id}:")

        # Process each LEGO in seed
        lego_ids = sorted([k for k in seed_data.keys() if k.startswith('S0')])
        for lego_position, lego_id in enumerate(lego_ids):
            lego_data = seed_data[lego_id]

            # Build whitelist for this specific LEGO
            whitelist = build_whitelist_for_lego_in_seed(registry, seed_id, lego_id, lego_position, baskets)

            # Validate each practice phrase
            phrases = lego_data.get('practice_phrases', [])
            lego_violations = []

            for phrase in phrases:
                english, spanish = phrase[0], phrase[1]
                violations = validate_phrase(spanish, whitelist)

                if violations:
                    lego_violations.append({
                        'english': english,
                        'spanish': spanish,
                        'violations': violations
                    })
                    total_violations += len(violations)

                total_phrases += 1

            if lego_violations:
                print(f"  ❌ {lego_id}: {len(lego_violations)} phrases with violations")
                for v in lego_violations:
                    print(f"     - '{v['spanish']}'")
                    print(f"       Violations: {', '.join(v['violations'])}")
                all_violations[lego_id].extend(lego_violations)
            else:
                print(f"  ✅ {lego_id}: All phrases valid")

    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total phrases checked: {total_phrases}")
    print(f"Total violations found: {total_violations}")
    print(f"LEGOs with violations: {len(all_violations)}")

    if all_violations:
        print("\n⚠️  GATE VIOLATIONS DETECTED - Manual review required")
        print("\nViolations by LEGO:")
        for lego_id, violations in sorted(all_violations.items()):
            print(f"\n{lego_id}: {len(violations)} phrase(s)")
            for v in violations[:3]:  # Show first 3
                print(f"  - {v['spanish']}")
                print(f"    Violations: {', '.join(v['violations'])}")
    else:
        print("\n✅ NO VIOLATIONS - All phrases are GATE compliant!")

    return all_violations

def main():
    registry_path = "/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/registry/lego_registry_s0001_s0300.json"
    baskets_path = "/home/user/ssi-dashboard-v7/phase5_batch1_s0101_s0300/batch_output/agent_06_baskets.json"

    violations = validate_all_baskets(registry_path, baskets_path)

    if violations:
        print("\n" + "=" * 80)
        print("ACTION REQUIRED:")
        print("Manual corrections needed for GATE violations")
        print("=" * 80)

if __name__ == "__main__":
    main()
