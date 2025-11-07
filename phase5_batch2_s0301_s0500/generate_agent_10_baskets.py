#!/usr/bin/env python3
"""
Agent 10 Basket Generator - S0481-S0500
Strict GATE Compliance with Self-Validation
"""

import json
import re
from datetime import datetime
from typing import List, Dict, Set, Tuple

def load_json(filepath: str) -> dict:
    """Load JSON file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_spanish_words(text: str) -> List[str]:
    """Extract individual Spanish words from text."""
    # Remove punctuation and split
    words = re.sub(r'[¿?¡!,;:.()[\]{}]', ' ', text.lower())
    words = [w.strip() for w in words.split() if w.strip()]
    return words

def build_whitelist_up_to(registry: dict, seed_id: str) -> Set[str]:
    """Build whitelist of all Spanish words taught up to and including this seed."""
    whitelist = set()

    # Extract seed number
    seed_num = int(seed_id[1:])  # S0481 -> 481

    # Process all seeds up to and including this one
    for sid, seed_data in registry.items():
        current_seed_num = int(sid[1:])
        if current_seed_num > seed_num:
            continue

        # Extract words from all LEGOs in this seed
        if 'legos' in seed_data:
            for lego_id, lego_data in seed_data['legos'].items():
                if 'target' in lego_data:
                    words = extract_spanish_words(lego_data['target'])
                    whitelist.update(words)

    return whitelist

def validate_phrase_against_whitelist(spanish: str, whitelist: Set[str]) -> List[str]:
    """Validate Spanish phrase against whitelist. Returns list of violations."""
    words = extract_spanish_words(spanish)
    violations = [w for w in words if w not in whitelist]
    return violations

def count_legos_in_phrase(phrase_lego_count: int) -> str:
    """Categorize phrase by LEGO count."""
    if phrase_lego_count <= 2:
        return "really_short_1_2"
    elif phrase_lego_count == 3:
        return "quite_short_3"
    elif phrase_lego_count in [4, 5]:
        return "longer_4_5"
    else:
        return "long_6_plus"

def generate_practice_phrases(seed_id: str, lego_id: str, lego_data: dict,
                              available_legos: int, whitelist: Set[str],
                              seed_pair: dict, is_final_lego: bool) -> Tuple[List, Dict]:
    """Generate 10 practice phrases for a LEGO with strict GATE compliance."""

    # Get the target Spanish and English
    target_spanish = lego_data['target']
    target_english = lego_data['known']

    phrases = []
    distribution = {
        "really_short_1_2": 0,
        "quite_short_3": 0,
        "longer_4_5": 0,
        "long_6_plus": 0
    }

    # Define phrase candidates based on seed and LEGO
    # This is where we'll craft high-quality phrases

    # I'll need to generate phrases specific to each LEGO
    # For now, let me create a template that will work

    # Get LEGO components
    lego_spanish = target_spanish
    lego_english = target_english

    # Generate phrases based on available vocabulary
    # This requires creative generation per LEGO

    # For the purpose of this script, I'll create a placeholder
    # that will be filled with actual phrase generation logic

    return phrases, distribution

def main():
    """Main execution function."""

    print("=== Agent 10 Basket Generator ===")
    print("Seeds: S0481-S0500")
    print("Starting generation with GATE compliance...\n")

    # Load input files
    print("Loading input files...")
    agent_input = load_json('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_input/agent_10_seeds.json')
    registry = load_json('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/registry/lego_registry_s0001_s0500.json')

    print(f"Loaded {len(agent_input['seeds'])} seeds")
    print(f"Registry contains {len(registry)} seeds")

    # Initialize output structure
    output = {
        "version": "curated_v6_molecular_lego",
        "agent_id": 10,
        "seed_range": "S0481-S0500",
        "total_seeds": 20,
        "validation_status": "PENDING",
        "validated_at": None,
        "seeds": {}
    }

    # Build cumulative LEGO count
    cumulative_count = 0
    for i in range(1, 481):  # Count LEGOs before S0481
        seed_key = f"S{i:04d}"
        if seed_key in registry and 'legos' in registry[seed_key]:
            cumulative_count += len(registry[seed_key]['legos'])

    print(f"\nCumulative LEGOs before S0481: {cumulative_count}")

    # Process each seed
    total_legos = 0
    total_phrases = 0
    gate_violations = 0

    for seed_data in agent_input['seeds']:
        seed_id = seed_data['seed_id']
        print(f"\nProcessing {seed_id}...")

        # Build whitelist up to this seed
        whitelist = build_whitelist_up_to(registry, seed_id)
        print(f"  Whitelist size: {len(whitelist)} words")

        # Initialize seed output
        seed_output = {
            "seed": seed_id,
            "seed_pair": seed_data['seed_pair'],
            "cumulative_legos": cumulative_count,
            "legos": {}
        }

        # Process each LEGO in this seed
        legos_in_seed = seed_data['legos']
        for idx, lego in enumerate(legos_in_seed):
            lego_id = lego['id']
            is_final_lego = (idx == len(legos_in_seed) - 1)

            # Get available LEGOs (cumulative before this LEGO)
            available_legos = cumulative_count

            print(f"  {lego_id}: {lego['target']} = {lego['known']}")

            # For now, I'll create a manual approach for generating phrases
            # This requires custom logic per seed/LEGO

            # Increment cumulative count
            cumulative_count += 1
            total_legos += 1

        output['seeds'][seed_id] = seed_output

    print(f"\n=== Generation Summary ===")
    print(f"Seeds processed: {len(output['seeds'])}")
    print(f"Total LEGOs: {total_legos}")
    print(f"Total phrases: {total_phrases}")
    print(f"GATE violations: {gate_violations}")

    # Save output
    # output_path = '/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_output/agent_10_baskets.json'
    # with open(output_path, 'w', encoding='utf-8') as f:
    #     json.dump(output, f, indent=2, ensure_ascii=False)

    print("\nNote: This script needs phrase generation logic to be completed.")
    print("I will now generate phrases manually with full GATE compliance.")

if __name__ == "__main__":
    main()
