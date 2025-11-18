#!/usr/bin/env python3
"""
Verify ALL practice_phrases in baskets are consistently [English, Spanish]

Check every single practice phrase to ensure order is correct.
"""

import json
import sys
from pathlib import Path
from detect_all_swaps import LanguageDetector

def verify_baskets(file_path: Path, detector: LanguageDetector):
    """Verify all practice_phrases are [English, Spanish]"""
    print(f"\nVerifying: {file_path.name}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    total_baskets = 0
    total_phrases = 0
    swapped_baskets = []
    swapped_phrases_count = 0

    if 'baskets' in data:
        for basket_id, basket in data['baskets'].items():
            total_baskets += 1

            practice_phrases = basket.get('practice_phrases', [])
            if not isinstance(practice_phrases, list):
                continue

            basket_has_swaps = False
            basket_swapped_count = 0

            for i, phrase in enumerate(practice_phrases):
                if not isinstance(phrase, (list, tuple)) or len(phrase) < 2:
                    continue

                total_phrases += 1
                # Check first 2 elements (English, Spanish)
                pair = [phrase[0], phrase[1]]
                is_swapped, score1, score2 = detector.is_swapped(pair)

                if is_swapped:
                    if not basket_has_swaps:
                        swapped_baskets.append({
                            'basket_id': basket_id,
                            'phrases': []
                        })
                        basket_has_swaps = True

                    swapped_baskets[-1]['phrases'].append({
                        'index': i,
                        'phrase': pair,
                        'scores': [score1, score2]
                    })
                    basket_swapped_count += 1
                    swapped_phrases_count += 1

    print(f"\n{'='*60}")
    print(f"RESULTS FOR {file_path.name}")
    print(f"{'='*60}")
    print(f"Total baskets checked: {total_baskets}")
    print(f"Total phrases checked: {total_phrases}")
    print(f"Baskets with swaps: {len(swapped_baskets)}")
    print(f"Total swapped phrases: {swapped_phrases_count}")

    if swapped_baskets:
        print(f"\n⚠️  SWAPS FOUND - First 5 baskets with issues:")
        for basket_info in swapped_baskets[:5]:
            print(f"\n  Basket: {basket_info['basket_id']}")
            print(f"  Swapped phrases: {len(basket_info['phrases'])}")
            for phrase_info in basket_info['phrases'][:3]:
                print(f"    [{phrase_info['index']}]: {phrase_info['phrase']}")
                print(f"         Scores: {phrase_info['scores']}")
    else:
        print(f"\n✅ ALL PRACTICE PHRASES ARE CORRECTLY ORDERED!")

    return len(swapped_baskets), swapped_phrases_count

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 verify_basket_consistency.py <course_directory>")
        print("\nExample:")
        print("  python3 verify_basket_consistency.py public/vfs/courses/spa_for_eng")
        sys.exit(1)

    course_dir = Path(sys.argv[1])

    if not course_dir.exists():
        print(f"Error: Directory not found: {course_dir}")
        sys.exit(1)

    detector = LanguageDetector()

    basket_files = [
        'lego_baskets.json',
        'lego_baskets_deduplicated.json'
    ]

    total_swapped_baskets = 0
    total_swapped_phrases = 0

    for filename in basket_files:
        file_path = course_dir / filename
        if file_path.exists():
            swapped_baskets, swapped_phrases = verify_baskets(file_path, detector)
            total_swapped_baskets += swapped_baskets
            total_swapped_phrases += swapped_phrases

    print(f"\n{'='*60}")
    print(f"OVERALL SUMMARY")
    print(f"{'='*60}")
    print(f"Total baskets with swaps: {total_swapped_baskets}")
    print(f"Total swapped phrases: {total_swapped_phrases}")

    if total_swapped_phrases == 0:
        print(f"\n✅ ALL BASKETS ARE CONSISTENT!")
        print(f"   All practice_phrases are [English, Spanish]")
    else:
        print(f"\n⚠️  INCONSISTENCIES FOUND!")
        print(f"   Run fix_all_swaps.py to fix them")

if __name__ == '__main__':
    main()
