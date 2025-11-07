#!/usr/bin/env python3
"""
Validation script for Agent 06 baskets
Implements GATE 1 (Format) and GATE 2 (Quality) validation
"""

import json
import re
from typing import Set, List, Tuple

def load_json(filepath: str) -> dict:
    """Load JSON file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_seed_number(seed_id: str) -> int:
    """Extract numeric part from seed ID"""
    return int(seed_id[1:])

def build_whitelist(registry: dict, up_to_seed: str) -> Set[str]:
    """Build whitelist of all Spanish words taught up to given seed"""
    max_seed_num = extract_seed_number(up_to_seed)
    whitelist = set()

    for lego_id, lego_data in registry['legos'].items():
        # Only process standard LEGO IDs (SXXXXLXX format)
        if lego_id.startswith('S') and 'L' in lego_id:
            try:
                seed_num = int(lego_id[1:5])
                if seed_num <= max_seed_num:
                    if 'spanish_words' in lego_data:
                        whitelist.update(lego_data['spanish_words'])
            except ValueError:
                # Skip non-standard LEGO IDs
                continue

    return whitelist

def gate1_format_validation(data: dict) -> Tuple[bool, List[str]]:
    """
    GATE 1: Format Validation
    Check JSON structure matches template
    """
    errors = []

    # Check root keys
    required_root_keys = ['version', 'agent_id', 'seed_range', 'total_seeds',
                          'validation_status', 'validated_at', 'seeds']
    for key in required_root_keys:
        if key not in data:
            errors.append(f"Missing required root key: {key}")

    if 'seeds' not in data:
        return (False, errors)

    # Check seed count
    seed_ids = list(data['seeds'].keys())
    if len(seed_ids) != 20:
        errors.append(f"Expected 20 seeds, got {len(seed_ids)}")

    # Check each seed structure
    for seed_id in seed_ids:
        seed = data['seeds'][seed_id]

        if 'seed_pair' not in seed:
            errors.append(f"{seed_id}: Missing seed_pair")
        if 'legos' not in seed:
            errors.append(f"{seed_id}: Missing legos")
            continue

        # Check each LEGO structure
        for lego_id, lego in seed['legos'].items():
            if 'practice_phrases' not in lego:
                errors.append(f"{lego_id}: Missing practice_phrases")
                continue

            if len(lego['practice_phrases']) != 10:
                errors.append(f"{lego_id}: Expected 10 phrases, got {len(lego['practice_phrases'])}")

            if 'phrase_distribution' not in lego:
                errors.append(f"{lego_id}: Missing phrase_distribution")

    passed = len(errors) == 0
    return (passed, errors)

def gate2_quality_validation(data: dict, registry: dict) -> Tuple[bool, dict]:
    """
    GATE 2: Quality Validation
    Check GATE compliance, distribution, completeness
    """
    gate_violations = []
    distribution_errors = []
    completeness_warnings = []

    seed_ids = sorted(data['seeds'].keys())

    for seed_id in seed_ids:
        seed = data['seeds'][seed_id]

        # Build whitelist for this seed
        whitelist = build_whitelist(registry, seed_id)

        # Get LEGO IDs in order
        lego_ids = sorted(seed['legos'].keys())

        for lego_id in lego_ids:
            lego = seed['legos'][lego_id]

            # Check GATE compliance for each phrase
            for i, phrase_data in enumerate(lego['practice_phrases']):
                english, spanish = phrase_data[0], phrase_data[1]

                # Tokenize Spanish phrase
                words = re.sub(r'[¿?¡!,;:.()[\]{}"\']', ' ', spanish.lower()).split()
                words = [w for w in words if w]

                # Check every word against whitelist
                for word in words:
                    if word not in whitelist:
                        gate_violations.append({
                            'lego': lego_id,
                            'phrase': i + 1,
                            'word': word,
                            'spanish': spanish,
                            'english': english
                        })

                # Check completeness (phrases 3-10 must be complete thoughts)
                if i >= 2:
                    # Simple heuristic: should be at least 15 characters
                    # and contain a subject/verb structure
                    if len(english) < 15:
                        completeness_warnings.append({
                            'lego': lego_id,
                            'phrase': i + 1,
                            'english': english,
                            'reason': 'Too short (< 15 chars)'
                        })

            # Check distribution (2-2-2-4)
            dist = lego['phrase_distribution']
            if dist['really_short_1_2'] != 2:
                distribution_errors.append(
                    f"{lego_id}: really_short_1_2 = {dist['really_short_1_2']}, expected 2"
                )
            if dist['quite_short_3'] != 2:
                distribution_errors.append(
                    f"{lego_id}: quite_short_3 = {dist['quite_short_3']}, expected 2"
                )
            if dist['longer_4_5'] != 2:
                distribution_errors.append(
                    f"{lego_id}: longer_4_5 = {dist['longer_4_5']}, expected 2"
                )
            if dist['long_6_plus'] != 4:
                distribution_errors.append(
                    f"{lego_id}: long_6_plus = {dist['long_6_plus']}, expected 4"
                )

        # Check final seed sentence
        if lego_ids:
            final_lego = seed['legos'][lego_ids[-1]]
            final_phrase = final_lego['practice_phrases'][9]
            expected_seed = seed['seed_pair']['known']

            # Normalize for comparison
            final_text = final_phrase[0].replace('.', '').replace('!', '').replace('?', '').strip().lower()
            seed_text = expected_seed.replace('.', '').replace('!', '').replace('?', '').strip().lower()

            if final_text != seed_text:
                gate_violations.append({
                    'lego': lego_ids[-1],
                    'phrase': 10,
                    'error': 'Final phrase must be complete seed sentence',
                    'expected': expected_seed,
                    'got': final_phrase[0]
                })

    results = {
        'gate_violations': gate_violations,
        'distribution_errors': distribution_errors,
        'completeness_warnings': completeness_warnings
    }

    passed = (len(gate_violations) == 0 and len(distribution_errors) == 0)
    return (passed, results)

def main():
    # Paths
    base_dir = "/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500"
    output_file = f"{base_dir}/batch_output/agent_06_baskets.json"
    registry_file = f"{base_dir}/registry/lego_registry_s0001_s0500.json"

    print()
    print("=" * 60)
    print("AGENT 06 SELF-VALIDATION")
    print("=" * 60)
    print()

    # Load data
    print("Loading basket data...")
    data = load_json(output_file)

    print("Loading registry...")
    registry = load_json(registry_file)
    print()

    # GATE 1: Format Validation
    print("Running GATE 1: Format validation...")
    gate1_passed, gate1_errors = gate1_format_validation(data)

    if gate1_passed:
        print("✅ GATE 1: Format validation PASSED")
    else:
        print("❌ GATE 1: Format validation FAILED")
        print(f"\nErrors found: {len(gate1_errors)}")
        for error in gate1_errors[:10]:
            print(f"  - {error}")
        if len(gate1_errors) > 10:
            print(f"  ... and {len(gate1_errors) - 10} more errors")
        return

    print()

    # GATE 2: Quality Validation
    print("Running GATE 2: Quality validation...")
    print("  - Checking GATE compliance (word-by-word)...")
    print("  - Checking distribution (2-2-2-4)...")
    print("  - Checking completeness (phrases 3-10)...")
    print("  - Checking final seed sentences...")
    print()

    gate2_passed, results = gate2_quality_validation(data, registry)

    gate_violations = results['gate_violations']
    distribution_errors = results['distribution_errors']
    completeness_warnings = results['completeness_warnings']

    print("=== GATE 2: Quality Validation ===")
    print(f"GATE Violations: {len(gate_violations)}")
    print(f"Distribution Errors: {len(distribution_errors)}")
    print(f"Completeness Warnings: {len(completeness_warnings)}")
    print()

    if len(gate_violations) > 0:
        print("❌ GATE VIOLATIONS (MUST FIX):")
        for v in gate_violations[:10]:
            if 'word' in v:
                print(f"  {v['lego']} phrase {v['phrase']}: \"{v['word']}\" not in whitelist")
                print(f"    English: \"{v['english']}\"")
                print(f"    Spanish: \"{v['spanish']}\"")
            else:
                print(f"  {v['lego']} phrase {v['phrase']}: {v['error']}")
                print(f"    Expected: \"{v['expected']}\"")
                print(f"    Got: \"{v['got']}\"")
            print()
        if len(gate_violations) > 10:
            print(f"  ... and {len(gate_violations) - 10} more violations")
        print()

    if len(distribution_errors) > 0:
        print("⚠️  DISTRIBUTION ERRORS:")
        for error in distribution_errors[:10]:
            print(f"  {error}")
        if len(distribution_errors) > 10:
            print(f"  ... and {len(distribution_errors) - 10} more errors")
        print()

    if len(completeness_warnings) > 0:
        print(f"ℹ️  COMPLETENESS WARNINGS: {len(completeness_warnings)}")
        print("  (Review manually - some short phrases may be acceptable)")
        print()

    # Final verdict
    if gate2_passed:
        print("✅ GATE 2: Quality validation PASSED")
        print()
        print("=" * 60)
        print("=== VALIDATION REPORT ===")
        print("✅ ALL CHECKS PASSED")
        print("Agent 06 ready for submission")
        print()

        # Calculate stats
        total_seeds = len(data['seeds'])
        total_legos = sum(len(seed['legos']) for seed in data['seeds'].values())
        total_phrases = total_legos * 10

        print(f"Seeds: {total_seeds}")
        print(f"LEGOs: {total_legos}")
        print(f"Phrases: {total_phrases}")
        print("=" * 60)

        # Update validation status
        data['validation_status'] = 'PASSED'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"✓ Updated validation_status to 'PASSED'")

    else:
        print("❌ GATE 2: Quality validation FAILED")
        print()
        print("ACTION REQUIRED:")
        print("1. Fix all GATE violations (remove untaught words)")
        print("2. Fix distribution errors (adjust phrase counts)")
        print("3. Re-run validation")
        print("4. Repeat until ✅ PASSED")
        print("=" * 60)

if __name__ == "__main__":
    main()
