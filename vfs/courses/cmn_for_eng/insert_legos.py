#!/usr/bin/env python3
"""
Insert LEGO pairs and validate completeness.
Automatically checks if the batch is complete and prompts for retry if needed.
"""

import json
import sys
import subprocess

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

def insert_legos(new_legos, lego_data):
    """Insert new LEGO pairs, maintaining sort order"""
    existing_ids = {seed[0]: i for i, seed in enumerate(lego_data['seeds'])}

    inserted = 0
    skipped = 0

    for lego_entry in new_legos:
        seed_id = lego_entry[0]

        if seed_id in existing_ids:
            print(f"⚠ {seed_id} already exists, skipping")
            skipped += 1
            continue

        # Find insertion point to maintain sort order
        insertion_point = len(lego_data['seeds'])
        for i, existing_seed in enumerate(lego_data['seeds']):
            if existing_seed[0] > seed_id:
                insertion_point = i
                break

        lego_data['seeds'].insert(insertion_point, lego_entry)
        print(f"✓ Inserted {seed_id}")
        inserted += 1

    return inserted, skipped

def detect_batch_range(seed_ids):
    """Detect which batch these seeds belong to"""
    if not seed_ids:
        return None, None

    numbers = [int(sid[1:]) for sid in seed_ids]
    min_num = min(numbers)
    max_num = max(numbers)

    # Round to batch boundaries (multiples of 70)
    batch_start = ((min_num - 1) // 70) * 70 + 1
    batch_end = min(batch_start + 69, 668)

    return batch_start, batch_end

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 insert_legos.py <json_file>")
        print("Example: python3 insert_legos.py new_legos.json")
        sys.exit(1)

    json_file = sys.argv[1]

    print(f"\nReading LEGOs from: {json_file}")
    print("=" * 70)

    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            new_legos = json.load(f)
    except Exception as e:
        print(f"❌ Error reading JSON file: {e}")
        sys.exit(1)

    if not isinstance(new_legos, list):
        print("❌ Error: JSON must be an array of LEGO entries")
        sys.exit(1)

    seed_data, lego_data = load_data()

    print(f"\nInserting {len(new_legos)} LEGO entries...\n")

    inserted, skipped = insert_legos(new_legos, lego_data)

    print()
    print("=" * 70)
    print(f"✓ Inserted: {inserted} seeds")
    if skipped > 0:
        print(f"⚠ Skipped: {skipped} seeds (already exist)")
    print("=" * 70)

    if inserted > 0:
        save_lego_data(lego_data)
        print(f"\n✓ Saved to lego_pairs.tmp.json")

        # Detect batch and check completeness
        seed_ids = [lego[0] for lego in new_legos]
        batch_start, batch_end = detect_batch_range(seed_ids)

        if batch_start and batch_end:
            print(f"\nChecking batch completeness: S{batch_start:04d}-S{batch_end:04d}...")
            print()

            # Check if batch is complete
            existing_ids = set(seed[0] for seed in lego_data['seeds'])
            missing = []
            for i in range(batch_start, batch_end + 1):
                seed_id = f"S{i:04d}"
                if seed_id not in existing_ids:
                    missing.append(seed_id)

            if not missing:
                print("=" * 70)
                print(f"🎉 BATCH COMPLETE! All seeds S{batch_start:04d}-S{batch_end:04d} are present!")
                print("=" * 70)
                print("\nRun extract_missing_batches.py to see remaining batches")
            else:
                print("=" * 70)
                print(f"⚠ Batch incomplete: {len(missing)} seeds still missing")
                print(f"Missing: {', '.join(missing[:10])}")
                if len(missing) > 10:
                    print(f"... and {len(missing) - 10} more")
                print("=" * 70)
                print(f"\nRe-run: python3 extract_batch_with_retry.py {batch_start} {batch_end}")
                print("Then extract LEGOs for the remaining seeds and run this script again")

if __name__ == "__main__":
    main()
