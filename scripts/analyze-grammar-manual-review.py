#!/usr/bin/env python3
"""
Manual Grammar Review - Extract Sample Phrases for Human Inspection
This script extracts diverse phrase samples for manual linguistic review
"""

import os
import json
from typing import Dict, List
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise Exception("Missing Supabase credentials in .env file")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Course configurations
COURSES = {
    'eng_for_ara': {'name': 'English for Arabic speakers', 'known': 'ara', 'target': 'eng'},
    'deu_for_eng': {'name': 'German for English speakers', 'known': 'eng', 'target': 'deu'},
    'ara_for_eng': {'name': 'Arabic for English speakers', 'known': 'eng', 'target': 'ara'},
    'eng_for_deu': {'name': 'English for German speakers', 'known': 'deu', 'target': 'eng'},
    'bre_for_fra': {'name': 'Breton for French speakers', 'known': 'fra', 'target': 'bre'},
    'cym_s_for_eng': {'name': 'South Welsh for English speakers', 'known': 'eng', 'target': 'cym_s'},
    'cym_n_for_eng': {'name': 'North Welsh for English speakers', 'known': 'eng', 'target': 'cym_n'},
    'eng_for_fra': {'name': 'English for French speakers', 'known': 'fra', 'target': 'eng'}
}


def fetch_diverse_sample(course_code: str, count: int = 30) -> List[Dict]:
    """Fetch diverse phrase samples across different seeds and LEGOs"""
    print(f"Fetching diverse sample for {course_code}...")

    try:
        # Get total count
        total_response = supabase.table('course_practice_phrases') \
            .select('*', count='exact') \
            .eq('course_code', course_code) \
            .eq('phrase_role', 'use') \
            .execute()

        total_count = total_response.count if hasattr(total_response, 'count') else 0
        print(f"  Total USE phrases: {total_count}")

        # Fetch distributed sample
        # Sample from beginning, middle, and end
        samples = []

        if total_count > 0:
            # First 10 from beginning
            beginning = supabase.table('course_practice_phrases') \
                .select('*') \
                .eq('course_code', course_code) \
                .eq('phrase_role', 'use') \
                .order('seed_number', desc=False) \
                .order('lego_index', desc=False) \
                .limit(10) \
                .execute()
            samples.extend(beginning.data)

            # 10 from middle
            middle_offset = max(0, (total_count // 2) - 5)
            middle = supabase.table('course_practice_phrases') \
                .select('*') \
                .eq('course_code', course_code) \
                .eq('phrase_role', 'use') \
                .order('seed_number', desc=False) \
                .order('lego_index', desc=False) \
                .range(middle_offset, middle_offset + 9) \
                .execute()
            samples.extend(middle.data)

            # 10 from end
            end = supabase.table('course_practice_phrases') \
                .select('*') \
                .eq('course_code', course_code) \
                .eq('phrase_role', 'use') \
                .order('seed_number', desc=True) \
                .order('lego_index', desc=True) \
                .limit(10) \
                .execute()
            samples.extend(end.data)

        return samples

    except Exception as e:
        print(f"Error fetching phrases for {course_code}: {e}")
        return []


def analyze_phrase_characteristics(phrases: List[Dict]) -> Dict:
    """Analyze characteristics of phrases"""
    if not phrases:
        return {}

    # Length distribution
    known_lengths = [len(p.get('known_text', '')) for p in phrases]
    target_lengths = [len(p.get('target_text', '')) for p in phrases]

    # Word count distribution
    known_words = [len(p.get('known_text', '').split()) for p in phrases]
    target_words = [len(p.get('target_text', '').split()) for p in phrases]

    # Check for unusual patterns
    empty_known = [p for p in phrases if not p.get('known_text', '').strip()]
    empty_target = [p for p in phrases if not p.get('target_text', '').strip()]
    very_long = [p for p in phrases if len(p.get('known_text', '')) > 100 or len(p.get('target_text', '')) > 100]
    very_short = [p for p in phrases if len(p.get('known_text', '').split()) < 2 or len(p.get('target_text', '').split()) < 2]

    return {
        'length_stats': {
            'known_avg': round(sum(known_lengths) / len(known_lengths), 1) if known_lengths else 0,
            'target_avg': round(sum(target_lengths) / len(target_lengths), 1) if target_lengths else 0,
            'known_max': max(known_lengths) if known_lengths else 0,
            'target_max': max(target_lengths) if target_lengths else 0
        },
        'word_count_stats': {
            'known_avg': round(sum(known_words) / len(known_words), 1) if known_words else 0,
            'target_avg': round(sum(target_words) / len(target_words), 1) if target_words else 0
        },
        'potential_issues': {
            'empty_known': len(empty_known),
            'empty_target': len(empty_target),
            'very_long': len(very_long),
            'very_short_single_word': len(very_short)
        }
    }


def main():
    """Main analysis function"""
    print("SSi Grammar Quality - Manual Review Sample Generation")
    print("=" * 80)
    print(f"Extracting diverse phrase samples for human linguistic review")
    print()

    all_results = {}

    for course_code, course_info in COURSES.items():
        print(f"\n{'='*80}")
        print(f"Course: {course_info['name']} ({course_code})")
        print(f"{'='*80}")

        # Fetch diverse sample
        samples = fetch_diverse_sample(course_code, count=30)

        if not samples:
            print(f"No samples found for {course_code}")
            continue

        # Analyze characteristics
        characteristics = analyze_phrase_characteristics(samples)

        # Format for human review
        formatted_samples = []
        for i, phrase in enumerate(samples, 1):
            formatted_samples.append({
                'sample_number': i,
                'seed_number': phrase.get('seed_number'),
                'lego_index': phrase.get('lego_index'),
                'known_text': phrase.get('known_text', ''),
                'target_text': phrase.get('target_text', ''),
                'notes': ''  # For manual annotation
            })

        all_results[course_code] = {
            'course_name': course_info['name'],
            'known_language': course_info['known'],
            'target_language': course_info['target'],
            'sample_count': len(samples),
            'characteristics': characteristics,
            'samples': formatted_samples
        }

        # Print summary
        print(f"\nSample Characteristics:")
        print(f"  Samples collected: {len(samples)}")
        print(f"  Avg known length: {characteristics['length_stats']['known_avg']} chars")
        print(f"  Avg target length: {characteristics['length_stats']['target_avg']} chars")
        print(f"  Avg known words: {characteristics['word_count_stats']['known_avg']}")
        print(f"  Avg target words: {characteristics['word_count_stats']['target_avg']}")

        if characteristics['potential_issues']['empty_known'] > 0:
            print(f"  ⚠️  Empty known_text: {characteristics['potential_issues']['empty_known']}")
        if characteristics['potential_issues']['empty_target'] > 0:
            print(f"  ⚠️  Empty target_text: {characteristics['potential_issues']['empty_target']}")
        if characteristics['potential_issues']['very_long'] > 0:
            print(f"  ⚠️  Very long phrases: {characteristics['potential_issues']['very_long']}")

        # Print first 5 samples for preview
        print(f"\nSample Preview (first 5):")
        for sample in formatted_samples[:5]:
            print(f"\n  [{sample['sample_number']}] Seed {sample['seed_number']}, LEGO {sample['lego_index']}")
            print(f"    Known:  {sample['known_text']}")
            print(f"    Target: {sample['target_text']}")

    # Save comprehensive report
    output_path = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/quality-reports/grammar-manual-review-samples.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*80}")
    print(f"✓ Manual review samples saved to:")
    print(f"  {output_path}")
    print(f"\n{'='*80}")
    print("NEXT STEPS FOR HUMAN REVIEW:")
    print("1. Open the JSON file")
    print("2. Review each sample for grammar correctness")
    print("3. Add notes in the 'notes' field for any issues found")
    print("4. Look for patterns: verb conjugation, articles, word order, etc.")
    print("5. Focus on comparing similar structures across different languages")
    print(f"{'='*80}")


if __name__ == '__main__':
    main()
