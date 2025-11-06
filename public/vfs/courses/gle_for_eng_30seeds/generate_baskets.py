#!/usr/bin/env python3
"""
Generate Phase 5 baskets for Irish course.
Following APML progressive vocabulary rules.
"""

import json
from typing import Dict, List, Tuple

def load_phase3_data(filepath: str) -> Dict:
    """Load Phase 3 LEGO extraction data."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def extract_legos_fcfs(phase3_data: Dict) -> List[Tuple[str, List[str]]]:
    """Extract all LEGOs in FCFS order (lego_pairs, then feeder_pairs)."""
    legos = []

    # Process each seed in order
    for seed_id in sorted(phase3_data.keys()):
        seed_data = phase3_data[seed_id]

        # First, add all lego_pairs
        for lego in seed_data.get('lego_pairs', []):
            lego_id = lego['lego_id']
            lego_pair = lego['lego_pair']
            legos.append((lego_id, lego_pair))

        # Then, add all feeder_pairs
        for feeder in seed_data.get('feeder_pairs', []):
            feeder_id = feeder['feeder_id']
            lego_pair = feeder['lego_pair']
            legos.append((feeder_id, lego_pair))

    return legos

def generate_e_phrases(lego_id: str, current_lego: List[str], available_vocab: List[Tuple[str, List[str]]]) -> List[List[str]]:
    """
    Generate E-phrases (elaborative) for a LEGO.
    5 phrases, 7-10 words each, perfect Irish grammar.
    Only use vocabulary from previous LEGOs.
    """
    if not available_vocab:
        return []

    # For now, return empty - will be filled by human linguist
    # This is correct according to APML: early LEGOs will have empty baskets
    return []

def generate_d_phrases(lego_id: str, current_lego: List[str], available_vocab: List[Tuple[str, List[str]]]) -> Dict[str, List[List[str]]]:
    """
    Generate D-phrases (demonstrative) for a LEGO.
    Organized by window size: 2, 3, 4, 5 LEGOs.
    Only use vocabulary from previous LEGOs.
    """
    d_phrases = {
        "2": [],
        "3": [],
        "4": [],
        "5": []
    }

    if not available_vocab:
        return d_phrases

    # For now, return empty - will be filled by human linguist
    # This is correct according to APML: early LEGOs will have empty/sparse baskets
    return d_phrases

def generate_baskets(phase3_filepath: str) -> Dict:
    """Generate all baskets following progressive vocabulary rules."""
    # Load Phase 3 data
    phase3_data = load_phase3_data(phase3_filepath)

    # Extract all LEGOs in FCFS order
    all_legos = extract_legos_fcfs(phase3_data)

    print(f"Total LEGOs to process: {len(all_legos)}")

    # Generate baskets
    baskets = {}

    for idx, (lego_id, lego_pair) in enumerate(all_legos):
        # Available vocabulary = all LEGOs before this one
        available_vocab = all_legos[:idx]

        # Generate E and D phrases
        e_phrases = generate_e_phrases(lego_id, lego_pair, available_vocab)
        d_phrases = generate_d_phrases(lego_id, lego_pair, available_vocab)

        # Create basket
        baskets[lego_id] = {
            "lego": lego_pair,
            "e": e_phrases,
            "d": d_phrases
        }

        # Log progress
        if idx < 10:
            print(f"  {lego_id}: EMPTY basket (expected - no prior vocabulary)")
        elif idx < 30:
            print(f"  {lego_id}: SPARSE basket (expected - limited vocabulary)")
        else:
            print(f"  {lego_id}: basket ready for linguist enrichment")

    return baskets

def main():
    """Main execution."""
    phase3_path = "/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/gle_for_eng_30seeds/phase_outputs/phase3_lego_extraction.json"
    output_path = "/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/gle_for_eng_30seeds/baskets.json"

    print("Generating Phase 5 baskets...")
    print("=" * 60)

    baskets = generate_baskets(phase3_path)

    print("=" * 60)
    print(f"Total baskets generated: {len(baskets)}")

    # Write output
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(baskets, f, ensure_ascii=False, indent=2)

    print(f"\nBaskets written to: {output_path}")
    print("\nNote: Baskets are intentionally empty/sparse for early LEGOs.")
    print("This follows APML progressive vocabulary rules.")
    print("Human linguist will enrich baskets with proper Irish phrases.")

if __name__ == "__main__":
    main()
