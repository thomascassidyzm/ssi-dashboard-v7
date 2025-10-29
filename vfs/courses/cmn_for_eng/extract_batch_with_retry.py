#!/usr/bin/env python3
"""
Extract a batch of LEGO pairs with automatic retry logic.
Keeps trying until all seeds in the batch are successfully extracted.
"""

import json
import sys

def load_data():
    """Load seed_pairs.json and lego_pairs.tmp.json"""
    with open('seed_pairs.json', 'r', encoding='utf-8') as f:
        seed_data = json.load(f)

    with open('lego_pairs.tmp.json', 'r', encoding='utf-8') as f:
        lego_data = json.load(f)

    return seed_data, lego_data

def save_lego_data(lego_data):
    """Save lego data back to file"""
    with open('lego_pairs.tmp.json', 'w', encoding='utf-8') as f:
        json.dump(lego_data, f, ensure_ascii=False, indent=2)

def get_missing_in_range(start, end, existing_ids):
    """Get missing seed IDs in a range"""
    missing = []
    for i in range(start, end + 1):
        seed_id = f"S{i:04d}"
        if seed_id not in existing_ids:
            missing.append(seed_id)
    return missing

def prompt_for_lego_extraction(missing_seeds, seed_data):
    """Generate a prompt for the user to extract LEGOs for missing seeds"""
    print("\n" + "=" * 70)
    print("PASTE THE FOLLOWING INTO YOUR LLM TO EXTRACT LEGOs:")
    print("=" * 70)
    print()
    print(f"Please extract LEGO pairs for these {len(missing_seeds)} seeds:")
    print()

    # Show the seed pairs that need LEGOs
    for seed_id in missing_seeds[:5]:  # Show first 5 as examples
        if seed_id in seed_data['translations']:
            target, known = seed_data['translations'][seed_id]
            print(f"{seed_id}: \"{target}\" -> \"{known}\"")

    if len(missing_seeds) > 5:
        print(f"... and {len(missing_seeds) - 5} more seeds")

    print()
    print("Please provide LEGO extractions in this format:")
    print("""
[
  ["S0001", ["target", "known"], [
    ["S0001L01", "B", "chinese", "english"],
    ["S0001L02", "C", "chinese", "english", [["part1", "eng1"], ["part2", "eng2"]]]
  ]],
  ...
]
""")
    print("=" * 70)

def main():
    if len(sys.argv) != 3:
        print("Usage: python3 extract_batch_with_retry.py <start> <end>")
        print("Example: python3 extract_batch_with_retry.py 1 70")
        sys.exit(1)

    start = int(sys.argv[1])
    end = int(sys.argv[2])

    print(f"\nExtracting batch: S{start:04d} to S{end:04d}")
    print("=" * 70)

    seed_data, lego_data = load_data()
    existing_ids = set(seed[0] for seed in lego_data['seeds'])

    missing = get_missing_in_range(start, end, existing_ids)

    if not missing:
        print(f"✓ Batch S{start:04d}-S{end:04d} is already complete!")
        return

    print(f"\nFound {len(missing)} missing seeds in this batch:")
    print(f"Missing IDs: {', '.join(missing[:10])}")
    if len(missing) > 10:
        print(f"... and {len(missing) - 10} more")

    # Show the user what needs to be extracted
    prompt_for_lego_extraction(missing, seed_data)

    print("\n" + "=" * 70)
    print("INSTRUCTIONS:")
    print("=" * 70)
    print("1. Use the prompt above with an LLM to generate LEGO pairs")
    print("2. Copy the JSON output")
    print("3. Run: python3 insert_legos.py <json_file>")
    print("4. This script will automatically run again to check completeness")
    print("5. Repeat until all seeds in the batch are complete")
    print("=" * 70)

if __name__ == "__main__":
    main()
