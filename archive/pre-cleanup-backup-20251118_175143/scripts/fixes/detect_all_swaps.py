#!/usr/bin/env python3
"""
Detect swapped [target, known] pairs systematically across all course files

Strategy: Use linguistic heuristics to detect which language is which
- Spanish has: á é í ó ú ñ ¿ ¡
- Spanish common words: el, la, los, las, de, que, es, en, por, para
- English doesn't have: ñ, inverted punctuation
- English common words: the, a, an, is, are, was, were, of, to, in

Detection approach:
1. For each pair [text1, text2], calculate "Spanish score" for each
2. If text1 has higher Spanish score, it's probably swapped
3. Report all swaps with confidence scores
"""

import json
import re
from pathlib import Path
from typing import Tuple, List, Dict

class LanguageDetector:
    def __init__(self):
        # Spanish-specific characters
        self.spanish_chars = set('áéíóúñÁÉÍÓÚÑ¿¡')

        # Common Spanish words (high frequency)
        self.spanish_words = {
            'el', 'la', 'los', 'las', 'de', 'que', 'es', 'en', 'por', 'para',
            'un', 'una', 'del', 'al', 'se', 'no', 'con', 'su', 'me', 'te',
            'lo', 'le', 'pero', 'más', 'como', 'yo', 'mi', 'muy', 'esta',
            'estoy', 'está', 'están', 'eres', 'soy', 'somos', 'son',
            'quiero', 'quieres', 'necesito', 'necesitas', 'tengo', 'tienes',
            'hacer', 'ser', 'estar', 'tener', 'ir', 'ver', 'dar', 'saber',
            'poder', 'decir', 'cómo', 'cuándo', 'dónde', 'qué', 'quién'
        }

        # Common English words
        self.english_words = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'of', 'to', 'in',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his',
            'her', 'our', 'their', 'do', 'does', 'did', 'have', 'has', 'had',
            'want', 'need', 'make', 'go', 'see', 'know', 'think', 'take',
            'get', 'give', 'how', 'when', 'where', 'what', 'who', 'which',
            'this', 'that', 'these', 'those', 'with', 'from', 'but', 'not'
        }

    def get_spanish_score(self, text: str) -> float:
        """Calculate how "Spanish" a text is (0-100)"""
        if not text:
            return 0.0

        score = 0.0
        text_lower = text.lower()

        # Check for Spanish-specific characters (strong signal)
        for char in self.spanish_chars:
            if char.lower() in text_lower:
                score += 20

        # Check for inverted punctuation (very strong signal)
        if '¿' in text or '¡' in text:
            score += 30

        # Tokenize and check words
        words = re.findall(r'\b\w+\b', text_lower)
        if not words:
            return score

        spanish_word_count = sum(1 for w in words if w in self.spanish_words)
        english_word_count = sum(1 for w in words if w in self.english_words)

        # Spanish words increase score
        score += (spanish_word_count / len(words)) * 30

        # English words decrease score
        score -= (english_word_count / len(words)) * 20

        return max(0, min(100, score))

    def is_swapped(self, pair: List[str]) -> Tuple[bool, float, float]:
        """
        Check if a [text1, text2] pair is swapped

        Returns: (is_swapped, text1_spanish_score, text2_spanish_score)

        If text1 should be English but has higher Spanish score, it's swapped
        """
        if len(pair) != 2:
            return False, 0.0, 0.0

        text1_score = self.get_spanish_score(pair[0])
        text2_score = self.get_spanish_score(pair[1])

        # If first element has higher Spanish score, it's probably swapped
        # (should be [English, Spanish] but got [Spanish, English])
        is_swapped = text1_score > text2_score + 10  # 10 point threshold

        return is_swapped, text1_score, text2_score

def scan_file(file_path: Path, detector: LanguageDetector) -> Dict:
    """Scan a JSON file for swapped pairs"""
    print(f"\nScanning: {file_path.name}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    swaps_found = []

    # Check seed_pairs.json
    if 'translations' in data:
        for seed_id, pair in data['translations'].items():
            is_swapped, score1, score2 = detector.is_swapped(pair)
            if is_swapped:
                swaps_found.append({
                    'location': f"translations.{seed_id}",
                    'pair': pair,
                    'scores': [score1, score2]
                })

    # Check lego_pairs.json
    if 'seeds' in data:
        for seed in data['seeds']:
            seed_id = seed.get('seed_id', '?')
            for lego in seed.get('legos', []):
                lego_id = lego.get('id', '?')
                # Lego has known/target structure, not array
                # But check if they're swapped
                known = lego.get('known', '')
                target = lego.get('target', '')

                known_score = detector.get_spanish_score(known)
                target_score = detector.get_spanish_score(target)

                # Known should be English (low score), target should be Spanish (high score)
                if known_score > target_score + 10:
                    swaps_found.append({
                        'location': f"seeds[{seed_id}].legos[{lego_id}]",
                        'known': known,
                        'target': target,
                        'scores': {'known': known_score, 'target': target_score}
                    })

    # Check lego_baskets.json
    if 'baskets' in data:
        for basket_id, basket in data['baskets'].items():
            # Check metadata seed_context
            if '_metadata' in basket and 'seed_context' in basket['_metadata']:
                sc = basket['_metadata']['seed_context']
                known = sc.get('known', '')
                target = sc.get('target', '')

                known_score = detector.get_spanish_score(known)
                target_score = detector.get_spanish_score(target)

                if known_score > target_score + 10:
                    swaps_found.append({
                        'location': f"baskets[{basket_id}]._metadata.seed_context",
                        'known': known,
                        'target': target,
                        'scores': {'known': known_score, 'target': target_score}
                    })

            # Check practice_phrases
            practice_phrases = basket.get('practice_phrases', [])
            if isinstance(practice_phrases, list):
                for i, phrase in enumerate(practice_phrases[:5]):  # Check first 5
                    if isinstance(phrase, (list, tuple)) and len(phrase) == 2:
                        is_swapped, score1, score2 = detector.is_swapped(phrase)
                        if is_swapped:
                            swaps_found.append({
                                'location': f"baskets[{basket_id}].practice_phrases[{i}]",
                                'pair': phrase,
                                'scores': [score1, score2]
                            })
                            break  # Only report once per basket

    return {
        'file': file_path.name,
        'swaps_found': len(swaps_found),
        'details': swaps_found
    }

def main():
    import sys

    if len(sys.argv) < 2:
        print("Usage: python3 detect_all_swaps.py <course_directory>")
        print("\nExample:")
        print("  python3 detect_all_swaps.py public/vfs/courses/spa_for_eng")
        sys.exit(1)

    course_dir = Path(sys.argv[1])

    if not course_dir.exists():
        print(f"Error: Directory not found: {course_dir}")
        sys.exit(1)

    detector = LanguageDetector()

    # Files to check
    files_to_check = [
        'seed_pairs.json',
        'lego_pairs.json',
        'lego_baskets.json',
        'lego_baskets_deduplicated.json'
    ]

    all_results = []
    total_swaps = 0

    for filename in files_to_check:
        file_path = course_dir / filename
        if file_path.exists():
            result = scan_file(file_path, detector)
            all_results.append(result)
            total_swaps += result['swaps_found']

    # Print summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)

    for result in all_results:
        print(f"\n{result['file']}: {result['swaps_found']} swaps found")

        if result['details']:
            print("\nExamples:")
            for detail in result['details'][:5]:  # Show first 5
                print(f"  Location: {detail['location']}")
                if 'pair' in detail:
                    print(f"    [{detail['pair'][0]!r}, {detail['pair'][1]!r}]")
                    print(f"    Scores: [{detail['scores'][0]:.1f}, {detail['scores'][1]:.1f}]")
                else:
                    print(f"    known: {detail.get('known', '')!r}")
                    print(f"    target: {detail.get('target', '')!r}")
                    print(f"    Scores: {detail['scores']}")

    print(f"\n{'='*60}")
    print(f"TOTAL SWAPS FOUND: {total_swaps}")
    print(f"{'='*60}")

    # Write detailed report
    report_file = course_dir / 'swap_detection_report.json'
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)

    print(f"\nDetailed report written to: {report_file}")

if __name__ == '__main__':
    main()
