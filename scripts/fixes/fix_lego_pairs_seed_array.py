#!/usr/bin/env python3
"""
Fix the 28 swapped seed_pair arrays in lego_pairs.json

The lego fields (known/target) are correct, but the unlabeled seed_pair
arrays are backwards [Spanish, English] instead of [English, Spanish].

This fixes ONLY the seed_pair arrays, leaving the lego fields untouched.
"""

import json
import sys
from pathlib import Path
from detect_all_swaps import LanguageDetector

def fix_lego_pairs_seed_arrays(file_path: Path, detector: LanguageDetector, dry_run=False):
    """Fix only the seed_pair arrays, not the lego fields"""
    print(f"\nFixing seed_pair arrays in: {file_path.name}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    fixed_count = 0
    fixed_seeds = []

    if 'seeds' in data:
        for seed in data['seeds']:
            seed_id = seed.get('seed_id', '?')
            seed_pair = seed.get('seed_pair', [])

            if isinstance(seed_pair, (list, tuple)) and len(seed_pair) == 2:
                is_swapped, score1, score2 = detector.is_swapped(seed_pair)

                if is_swapped:
                    print(f"  Swapping {seed_id}: {seed_pair}")
                    # Swap the array elements
                    seed['seed_pair'] = [seed_pair[1], seed_pair[0]]
                    fixed_count += 1
                    fixed_seeds.append(seed_id)

    print(f"\n  Fixed {fixed_count} seed_pair arrays")
    print(f"  Seeds fixed: {', '.join(fixed_seeds)}")

    if not dry_run and fixed_count > 0:
        # Backup original
        backup_path = file_path.with_suffix('.json.backup_seed_arrays')
        with open(backup_path, 'w', encoding='utf-8') as f:
            with open(file_path, 'r', encoding='utf-8') as orig:
                f.write(orig.read())
        print(f"  Backup saved: {backup_path.name}")

        # Write fixed version
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  ✅ Fixed version written")

    return fixed_count

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 fix_lego_pairs_seed_array.py <course_directory> [--dry-run]")
        print("\nExample:")
        print("  python3 fix_lego_pairs_seed_array.py public/vfs/courses/spa_for_eng")
        print("  python3 fix_lego_pairs_seed_array.py public/vfs/courses/spa_for_eng --dry-run")
        sys.exit(1)

    course_dir = Path(sys.argv[1])
    dry_run = '--dry-run' in sys.argv

    if not course_dir.exists():
        print(f"Error: Directory not found: {course_dir}")
        sys.exit(1)

    if dry_run:
        print("🔍 DRY RUN MODE - No files will be modified\n")

    print(f"\n{'='*60}")
    print(f"FIXING SEED_PAIR ARRAYS IN LEGO_PAIRS.JSON")
    print(f"{'='*60}")
    print(f"Course: {course_dir.name}")
    print(f"Target: lego_pairs.json")
    print(f"\nThis ONLY fixes the unlabeled seed_pair arrays")
    print(f"The labeled lego fields (known/target) are already correct")

    detector = LanguageDetector()

    lego_pairs_file = course_dir / 'lego_pairs.json'
    if lego_pairs_file.exists():
        fixed = fix_lego_pairs_seed_arrays(lego_pairs_file, detector, dry_run)

        print(f"\n{'='*60}")
        print(f"SUMMARY")
        print(f"{'='*60}")
        print(f"Total seed_pair arrays fixed: {fixed}")

        if dry_run:
            print("\n⚠️  This was a DRY RUN - no files were modified")
            print("Run without --dry-run to apply fixes")
        else:
            print("\n✅ All fixes applied!")
            print("Backup saved as lego_pairs.json.backup_seed_arrays")
    else:
        print(f"Error: {lego_pairs_file} not found")
        sys.exit(1)

if __name__ == '__main__':
    main()
