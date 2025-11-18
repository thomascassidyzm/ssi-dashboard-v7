#!/usr/bin/env python3
"""
Fix all swapped [target, known] pairs using linguistic detection

Uses the swap detection report to systematically fix swaps across all files.
"""

import json
import sys
from pathlib import Path
from detect_all_swaps import LanguageDetector

def fix_lego_pairs(file_path: Path, detector: LanguageDetector, dry_run=False):
    """Fix swapped known/target in lego_pairs.json"""
    print(f"\nFixing: {file_path.name}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    fixed_count = 0

    if 'seeds' in data:
        for seed in data['seeds']:
            seed_id = seed.get('seed_id', '?')
            for lego in seed.get('legos', []):
                lego_id = lego.get('id', '?')
                known = lego.get('known', '')
                target = lego.get('target', '')

                known_score = detector.get_spanish_score(known)
                target_score = detector.get_spanish_score(target)

                # If known has higher Spanish score, swap them
                if known_score > target_score + 10:
                    print(f"  Swapping {lego_id}: '{known}' <-> '{target}'")
                    lego['known'], lego['target'] = target, known
                    fixed_count += 1

    if not dry_run and fixed_count > 0:
        # Backup original
        backup_path = file_path.with_suffix('.json.backup3')
        with open(backup_path, 'w', encoding='utf-8') as f:
            # Read original again to backup
            with open(file_path, 'r', encoding='utf-8') as orig:
                f.write(orig.read())

        # Write fixed version
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    return fixed_count

def fix_baskets(file_path: Path, detector: LanguageDetector, dry_run=False):
    """Fix swapped practice_phrases in baskets"""
    print(f"\nFixing: {file_path.name}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    fixed_baskets = 0
    fixed_phrases = 0

    if 'baskets' in data:
        for basket_id, basket in data['baskets'].items():
            basket_modified = False

            # Fix metadata seed_context
            if '_metadata' in basket and 'seed_context' in basket['_metadata']:
                sc = basket['_metadata']['seed_context']
                known = sc.get('known', '')
                target = sc.get('target', '')

                known_score = detector.get_spanish_score(known)
                target_score = detector.get_spanish_score(target)

                # If known has higher Spanish score, swap them
                if known_score > target_score + 10:
                    sc['known'], sc['target'] = target, known
                    basket_modified = True

            # Fix practice_phrases
            practice_phrases = basket.get('practice_phrases', [])
            if isinstance(practice_phrases, list):
                for i, phrase in enumerate(practice_phrases):
                    if not isinstance(phrase, (list, tuple)) or len(phrase) < 2:
                        continue

                    # Check first 2 elements (English, Spanish)
                    # Phrases may be [English, Spanish, null, number]
                    pair = [phrase[0], phrase[1]]
                    is_swapped, score1, score2 = detector.is_swapped(pair)

                    if is_swapped:
                        # Swap the first two elements
                        basket['practice_phrases'][i][0], basket['practice_phrases'][i][1] = phrase[1], phrase[0]
                        fixed_phrases += 1
                        basket_modified = True

            if basket_modified:
                fixed_baskets += 1

    if not dry_run and fixed_baskets > 0:
        # Backup original
        backup_path = file_path.with_suffix('.json.backup3')
        with open(backup_path, 'w', encoding='utf-8') as f:
            with open(file_path, 'r', encoding='utf-8') as orig:
                f.write(orig.read())

        # Write fixed version
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    return fixed_baskets, fixed_phrases

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 fix_all_swaps.py <course_directory> [--dry-run]")
        print("\nExample:")
        print("  python3 fix_all_swaps.py public/vfs/courses/spa_for_eng")
        print("  python3 fix_all_swaps.py public/vfs/courses/spa_for_eng --dry-run")
        sys.exit(1)

    course_dir = Path(sys.argv[1])
    dry_run = '--dry-run' in sys.argv

    if not course_dir.exists():
        print(f"Error: Directory not found: {course_dir}")
        sys.exit(1)

    if dry_run:
        print("🔍 DRY RUN MODE - No files will be modified\n")

    detector = LanguageDetector()

    # Fix lego_pairs.json
    lego_pairs_file = course_dir / 'lego_pairs.json'
    lego_fixed = 0
    if lego_pairs_file.exists():
        lego_fixed = fix_lego_pairs(lego_pairs_file, detector, dry_run)
        print(f"  ✓ Fixed {lego_fixed} legos in lego_pairs.json")

    # Fix both basket files
    basket_files = [
        'lego_baskets.json',
        'lego_baskets_deduplicated.json'
    ]

    total_baskets_fixed = 0
    total_phrases_fixed = 0

    for filename in basket_files:
        file_path = course_dir / filename
        if file_path.exists():
            baskets_fixed, phrases_fixed = fix_baskets(file_path, detector, dry_run)
            total_baskets_fixed += baskets_fixed
            total_phrases_fixed += phrases_fixed
            print(f"  ✓ Fixed {baskets_fixed} baskets ({phrases_fixed} phrases) in {filename}")

    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print(f"Legos fixed: {lego_fixed}")
    print(f"Baskets fixed: {total_baskets_fixed}")
    print(f"Total phrases fixed: {total_phrases_fixed}")
    print(f"Total fixes: {lego_fixed + total_phrases_fixed}")

    if dry_run:
        print("\n⚠️  This was a DRY RUN - no files were modified")
        print("Run without --dry-run to apply fixes")
    else:
        print("\n✅ All fixes applied!")
        print("Backups saved as *.json.backup3")

if __name__ == '__main__':
    main()
