#!/usr/bin/env python3
"""
Agent 09 Validation Script - Verify GATE Compliance
"""

import json
import re

def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_seed_number(seed_id):
    """Extract numeric part from seed ID"""
    match = re.match(r'S(\d+)', seed_id)
    return int(match.group(1)) if match else 0

def extract_lego_seed_number(lego_id):
    """Extract seed number from LEGO ID"""
    if isinstance(lego_id, bool):
        return 0
    match = re.match(r'S(\d+)L', lego_id)
    return int(match.group(1)) if match else 0

def tokenize_spanish(text):
    """Tokenize Spanish text into individual words"""
    text = text.lower()
    text = re.sub(r'[¿?¡!,;:.()[\]{}"\']', ' ', text)
    words = [w for w in text.split() if w]
    return words

def build_whitelist_up_to_seed(registry, target_seed_id):
    """Build whitelist of all Spanish words taught up to (not including) target seed"""
    target_num = extract_seed_number(target_seed_id)
    whitelist = set()

    for lego_id, lego_data in registry['legos'].items():
        lego_seed_num = extract_lego_seed_number(lego_id)
        if lego_seed_num > 0 and lego_seed_num < target_num:
            if 'spanish_words' in lego_data:
                whitelist.update(lego_data['spanish_words'])

    return whitelist

def build_complete_whitelist_for_seed(registry, agent_input, target_seed_id):
    """Build whitelist including all LEGOs in target seed"""
    whitelist = build_whitelist_up_to_seed(registry, target_seed_id)

    # Find target seed
    target_seed = None
    for seed in agent_input['seeds']:
        if seed['seed_id'] == target_seed_id:
            target_seed = seed
            break

    if not target_seed:
        return whitelist

    # Add all LEGOs from target seed
    for lego in target_seed['legos']:
        lego_id = lego.get('id')

        if isinstance(lego_id, bool):
            # Add target words anyway
            target = lego.get('target', '')
            if target:
                words = tokenize_spanish(target)
                whitelist.update(words)
            continue

        # Get from registry
        if lego_id and lego_id in registry['legos']:
            reg_lego = registry['legos'][lego_id]
            if 'spanish_words' in reg_lego:
                whitelist.update(reg_lego['spanish_words'])

    return whitelist

def validate_baskets(baskets, registry, agent_input):
    """Validate baskets against all quality gates"""

    print("=== GATE 1: Format Validation ===\n")

    # Check root structure
    required_keys = ['seeds', 'agent_id', 'validation_status', 'version', 'seed_range']
    for key in required_keys:
        if key not in baskets:
            print(f"❌ Missing key: {key}")
            return False
    print("✅ Root structure valid")

    # Check seed count
    seed_ids = list(baskets['seeds'].keys())
    if len(seed_ids) != 20:
        print(f"❌ Expected 20 seeds, got {len(seed_ids)}")
        return False
    print(f"✅ Seed count: {len(seed_ids)}")

    # Check each seed structure
    total_legos = 0
    total_phrases = 0
    for seed_id in seed_ids:
        seed = baskets['seeds'][seed_id]
        if 'seed_pair' not in seed:
            print(f"❌ {seed_id}: Missing seed_pair")
            return False
        if 'legos' not in seed:
            print(f"❌ {seed_id}: Missing legos")
            return False

        # Check each LEGO
        for lego_id, lego in seed['legos'].items():
            total_legos += 1
            if 'practice_phrases' not in lego:
                print(f"❌ {lego_id}: Missing practice_phrases")
                return False
            if len(lego['practice_phrases']) != 10:
                print(f"❌ {lego_id}: Expected 10 phrases, got {len(lego['practice_phrases'])}")
                return False
            total_phrases += len(lego['practice_phrases'])
            if 'phrase_distribution' not in lego:
                print(f"❌ {lego_id}: Missing phrase_distribution")
                return False

    print(f"✅ All seeds have required fields")
    print(f"✅ Total LEGOs: {total_legos}")
    print(f"✅ Total phrases: {total_phrases}")
    print("\n✅ GATE 1: Format validation PASSED\n")

    # GATE 2: Quality Validation
    print("=== GATE 2: Quality Validation ===\n")

    gate_violations = []
    distribution_errors = []

    for seed_id in seed_ids:
        seed = baskets['seeds'][seed_id]

        # Build complete whitelist for this seed (including all its LEGOs)
        whitelist = build_complete_whitelist_for_seed(registry, agent_input, seed_id)

        for lego_id, lego in seed['legos'].items():
            # Check GATE compliance
            for i, phrase in enumerate(lego['practice_phrases']):
                english, spanish, pattern, count = phrase

                # Tokenize Spanish
                words = tokenize_spanish(spanish)

                # Check each word
                for word in words:
                    if word not in whitelist:
                        gate_violations.append({
                            'lego': lego_id,
                            'phrase': i + 1,
                            'word': word,
                            'spanish': spanish,
                            'english': english
                        })

            # Check distribution (2-2-2-4)
            dist = lego['phrase_distribution']
            if dist['really_short_1_2'] != 2:
                distribution_errors.append(
                    f"{lego_id}: really_short = {dist['really_short_1_2']}, expected 2"
                )
            if dist['quite_short_3'] != 2:
                distribution_errors.append(
                    f"{lego_id}: quite_short = {dist['quite_short_3']}, expected 2"
                )
            if dist['longer_4_5'] != 2:
                distribution_errors.append(
                    f"{lego_id}: longer = {dist['longer_4_5']}, expected 2"
                )
            if dist['long_6_plus'] != 4:
                distribution_errors.append(
                    f"{lego_id}: long = {dist['long_6_plus']}, expected 4"
                )

        # Check final seed sentence
        lego_ids = sorted(seed['legos'].keys())
        if lego_ids:
            final_lego_id = lego_ids[-1]
            final_lego = seed['legos'][final_lego_id]
            final_phrase = final_lego['practice_phrases'][-1]

            expected_seed = seed['seed_pair']['known']
            final_english = final_phrase[0]

            # Normalize for comparison
            final_text = final_english.replace('.', '').replace('!', '').replace('?', '').strip().lower()
            seed_text = expected_seed.replace('.', '').replace('!', '').replace('?', '').strip().lower()

            if final_text != seed_text:
                gate_violations.append({
                    'lego': final_lego_id,
                    'phrase': 10,
                    'error': 'Final phrase must match seed sentence',
                    'expected': expected_seed,
                    'got': final_english
                })

    # Report results
    print(f"GATE Violations: {len(gate_violations)}")
    print(f"Distribution Errors: {len(distribution_errors)}")

    if gate_violations:
        print(f"\n❌ GATE VIOLATIONS ({len(gate_violations)} total):")
        for v in gate_violations[:20]:  # Show first 20
            if 'word' in v:
                print(f"  {v['lego']} phrase {v['phrase']}: '{v['word']}' not in whitelist")
                print(f"    Spanish: \"{v['spanish']}\"")
                print(f"    English: \"{v['english']}\"")
            else:
                print(f"  {v['lego']} phrase {v['phrase']}: {v.get('error', 'Unknown error')}")
                print(f"    Expected: \"{v.get('expected', '')}\"")
                print(f"    Got: \"{v.get('got', '')}\"")
        if len(gate_violations) > 20:
            print(f"  ... and {len(gate_violations) - 20} more violations")

    if distribution_errors:
        print(f"\n⚠️  DISTRIBUTION ERRORS ({len(distribution_errors)} total):")
        for e in distribution_errors[:10]:
            print(f"  {e}")
        if len(distribution_errors) > 10:
            print(f"  ... and {len(distribution_errors) - 10} more errors")

    # Final verdict
    validation_passed = (len(gate_violations) == 0 and len(distribution_errors) == 0)

    if validation_passed:
        print("\n✅ GATE 2: Quality validation PASSED")
        print("\n=== VALIDATION REPORT ===")
        print("✅ ALL CHECKS PASSED")
        print(f"Agent {baskets['agent_id']} ready for submission")
        print(f"\nSeeds: {len(seed_ids)}")
        print(f"LEGOs: {total_legos}")
        print(f"Phrases: {total_phrases}")
        print(f"GATE violations: 0")
        return True
    else:
        print("\n❌ GATE 2: Quality validation FAILED")
        print("\nACTION REQUIRED:")
        if gate_violations:
            print("1. Fix all GATE violations (remove untaught words)")
        if distribution_errors:
            print("2. Fix distribution errors (adjust phrase counts to 2-2-2-4)")
        print("3. Re-run validation")
        return False

def main():
    print("=== Agent 09 Basket Validation ===\n")

    base_path = "/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500"
    baskets_path = f"{base_path}/batch_output/agent_09_baskets.json"
    registry_path = f"{base_path}/registry/lego_registry_s0001_s0500.json"
    input_path = f"{base_path}/batch_input/agent_09_seeds.json"

    print(f"Loading baskets: {baskets_path}")
    baskets = load_json(baskets_path)

    print(f"Loading registry: {registry_path}")
    registry = load_json(registry_path)

    print(f"Loading input: {input_path}\n")
    agent_input = load_json(input_path)

    # Run validation
    passed = validate_baskets(baskets, registry, agent_input)

    if passed:
        print("\n✅ Validation complete: PASSED")
        return 0
    else:
        print("\n❌ Validation complete: FAILED")
        return 1

if __name__ == "__main__":
    exit(main())
