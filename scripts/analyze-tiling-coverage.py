#!/usr/bin/env python3
"""
LEGO Tiling Coverage Analyzer

Analyzes whether seed sentences can be fully reconstructed from their LEGOs.
This is a core validation rule in SSi - every part of a seed must be tileable.

Usage:
    python scripts/analyze-tiling-coverage.py
"""

import os
import json
import re
from collections import defaultdict
from typing import Dict, List, Tuple, Optional
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

# Courses to analyze
COURSES = ['zho_for_eng', 'jpn_for_eng', 'deu_for_eng', 'fra_for_eng', 'spa_for_eng']

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def is_cjk_language(course_code: str) -> bool:
    """Check if language uses CJK characters (Chinese/Japanese)"""
    return course_code in ['zho_for_eng', 'jpn_for_eng']


def normalize_text(text: str, is_cjk: bool) -> str:
    """Normalize text for comparison"""
    if not text:
        return ""

    # Remove common punctuation that might not be in LEGOs
    # CJK punctuation
    text = re.sub(r'[.!?,;:\-—–"""''()[\]{}。！？、；：（）【】「」『』]', '', text)
    # Spanish punctuation
    text = re.sub(r'[¿¡]', '', text)

    # Strip whitespace
    text = text.strip()

    # For CJK, remove all spaces (they're often just for readability)
    if is_cjk:
        text = text.replace(' ', '')

    return text


def get_tiling_coverage_cjk(seed_text: str, lego_texts: List[str]) -> Tuple[bool, List[str], str]:
    """
    Check character-level tiling for CJK languages.
    Returns: (is_fully_tiled, gaps, reconstructed_text)
    """
    seed_normalized = normalize_text(seed_text, True)

    # Normalize all LEGO texts
    lego_normalized = [normalize_text(lt, True) for lt in lego_texts]

    # Try to tile the seed character by character
    seed_chars = list(seed_normalized)
    lego_chars_available = ''.join(lego_normalized)

    # Check if all seed characters are available in LEGOs
    used_positions = set()
    reconstructed = []
    gaps = []

    i = 0
    while i < len(seed_chars):
        matched = False

        # Try to match progressively longer substrings from LEGOs
        for length in range(len(seed_chars) - i, 0, -1):
            substring = ''.join(seed_chars[i:i+length])

            # Check if this substring exists in any LEGO
            for lego_idx, lego in enumerate(lego_normalized):
                if substring in lego:
                    # Check if we can use this part of the LEGO
                    pos = lego.find(substring)
                    key = (lego_idx, pos, pos + len(substring))

                    # For simplicity, allow reuse of LEGO parts
                    reconstructed.append(substring)
                    i += length
                    matched = True
                    break

            if matched:
                break

        if not matched:
            # This character cannot be tiled
            gaps.append(seed_chars[i])
            i += 1

    is_fully_tiled = len(gaps) == 0
    reconstructed_text = ''.join(reconstructed)

    return is_fully_tiled, gaps, reconstructed_text


def get_tiling_coverage_european(seed_text: str, lego_texts: List[str]) -> Tuple[bool, List[str], str]:
    """
    Check word-level tiling for European languages.
    Returns: (is_fully_tiled, gaps, reconstructed_text)
    """
    seed_normalized = normalize_text(seed_text, False)

    # Split into words
    seed_words = seed_normalized.lower().split()

    # Normalize all LEGO texts and split into words
    lego_words_set = set()
    for lt in lego_texts:
        normalized = normalize_text(lt, False)
        words = normalized.lower().split()
        lego_words_set.update(words)

    # Check which seed words are covered
    gaps = []
    covered_words = []

    for word in seed_words:
        if word in lego_words_set:
            covered_words.append(word)
        else:
            # Check for partial matches (conjugations, etc.)
            found_partial = False
            for lego_word in lego_words_set:
                # Check if it's a stem match (simple heuristic)
                if len(word) >= 4 and len(lego_word) >= 4:
                    if word[:4] == lego_word[:4] or lego_word[:4] == word[:4]:
                        covered_words.append(word)
                        found_partial = True
                        break

            if not found_partial:
                gaps.append(word)

    is_fully_tiled = len(gaps) == 0
    reconstructed_text = ' '.join(covered_words)

    return is_fully_tiled, gaps, reconstructed_text


def analyze_seed_tiling(course_code: str, seed_number: int, seed_text: str, lego_texts: List[str]) -> Dict:
    """Analyze tiling coverage for a single seed"""
    is_cjk = is_cjk_language(course_code)

    if is_cjk:
        is_fully_tiled, gaps, reconstructed = get_tiling_coverage_cjk(seed_text, lego_texts)
    else:
        is_fully_tiled, gaps, reconstructed = get_tiling_coverage_european(seed_text, lego_texts)

    return {
        'seed_number': seed_number,
        'seed_text': seed_text,
        'is_fully_tiled': is_fully_tiled,
        'gaps': gaps,
        'gap_count': len(gaps),
        'reconstructed': reconstructed,
        'lego_count': len(lego_texts),
        'lego_texts': lego_texts
    }


def get_gap_category(gaps: List[str], is_cjk: bool) -> str:
    """Categorize the type of gaps"""
    if not gaps:
        return "none"

    # Check if gaps include punctuation
    punctuation_chars = set('.!?,;:\-—–"""''()[\]{}。！？、；：（）【】「」『』¿¡，')

    # Separate gaps into punctuation vs content
    punctuation_gaps = [g for g in gaps if all(c in punctuation_chars for c in g)]
    content_gaps = [g for g in gaps if g not in punctuation_gaps]

    # If only punctuation
    if not content_gaps:
        return "punctuation_only"

    if is_cjk:
        # CJK-specific particles (grammatical markers)
        chinese_particles = ['了', '着', '過', '的', '地', '得', '吗', '呢', '啊', '呀', '嗎', '过']
        japanese_particles = ['は', 'が', 'を', 'に', 'へ', 'と', 'で', 'から', 'まで', 'より', 'も', 'ね', 'よ', 'か', 'の', 'や', 'ぞ', 'ぜ', 'て']

        # Check if all content gaps are particles
        all_particles = all(g in chinese_particles + japanese_particles for g in content_gaps)
        if all_particles:
            return "particles_only"

        # Mixed: some particles, some content
        has_particles = any(g in chinese_particles + japanese_particles for g in content_gaps)
        if has_particles:
            return "mixed_particles_and_content"

        return "content_words"
    else:
        # European languages - check for articles, prepositions
        articles = ['a', 'an', 'the', 'le', 'la', 'les', 'un', 'une', 'des', 'el', 'la', 'los', 'las', 'der', 'die', 'das']
        prepositions = ['of', 'to', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'de', 'à', 'en', 'dans', 'pour', 'avec']

        content_gaps_lower = [g.lower() for g in content_gaps]
        all_functional = all(g in articles + prepositions for g in content_gaps_lower)

        if all_functional:
            return "articles_prepositions_only"

        has_functional = any(g in articles + prepositions for g in content_gaps_lower)
        if has_functional:
            return "mixed_functional_and_content"

        return "content_words"


def analyze_course(course_code: str) -> Dict:
    """Analyze tiling coverage for a complete course"""
    print(f"\n{'='*80}")
    print(f"Analyzing course: {course_code}")
    print(f"{'='*80}")

    is_cjk = is_cjk_language(course_code)

    # Get all seeds with translations
    response = supabase.table('course_seeds')\
        .select('seed_number, known_text, target_text')\
        .eq('course_code', course_code)\
        .not_.is_('target_text', 'null')\
        .order('seed_number')\
        .execute()

    seeds = response.data
    print(f"Found {len(seeds)} seeds with translations")

    if not seeds:
        return {
            'course_code': course_code,
            'total_seeds': 0,
            'message': 'No seeds with translations found'
        }

    # Analyze each seed
    results = []
    fully_tiled_count = 0
    gap_categories = defaultdict(int)

    for seed in seeds:
        seed_number = seed['seed_number']
        target_text = seed['target_text']

        # Get all LEGOs for this seed
        lego_response = supabase.table('course_legos')\
            .select('lego_index, target_text')\
            .eq('course_code', course_code)\
            .eq('seed_number', seed_number)\
            .order('lego_index')\
            .execute()

        legos = lego_response.data
        lego_texts = [lego['target_text'] for lego in legos if lego.get('target_text')]

        if not lego_texts:
            print(f"  ⚠️  Seed S{seed_number:04d}: No LEGOs found")
            continue

        # Analyze tiling
        analysis = analyze_seed_tiling(course_code, seed_number, target_text, lego_texts)
        results.append(analysis)

        if analysis['is_fully_tiled']:
            fully_tiled_count += 1
        else:
            gap_category = get_gap_category(analysis['gaps'], is_cjk)
            gap_categories[gap_category] += 1

            # Print problematic seeds
            gaps_display = ''.join(analysis['gaps']) if is_cjk else ' '.join(analysis['gaps'])
            print(f"  ❌ Seed S{seed_number:04d}: Gaps = [{gaps_display}] (category: {gap_category})")
            print(f"     Seed: {target_text}")
            print(f"     LEGOs: {', '.join(lego_texts)}")

    # Calculate statistics
    total_analyzed = len(results)
    tiling_success_rate = (fully_tiled_count / total_analyzed * 100) if total_analyzed > 0 else 0
    gap_rate = ((total_analyzed - fully_tiled_count) / total_analyzed * 100) if total_analyzed > 0 else 0

    print(f"\n{'='*80}")
    print(f"Tiling Coverage Summary for {course_code}")
    print(f"{'='*80}")
    print(f"Total seeds analyzed: {total_analyzed}")
    print(f"Fully tiled: {fully_tiled_count} ({tiling_success_rate:.1f}%)")
    print(f"Seeds with gaps: {total_analyzed - fully_tiled_count} ({gap_rate:.1f}%)")
    print(f"\nGap Categories:")
    for category, count in sorted(gap_categories.items(), key=lambda x: x[1], reverse=True):
        percentage = (count / total_analyzed * 100) if total_analyzed > 0 else 0
        print(f"  - {category}: {count} ({percentage:.1f}%)")

    # Get examples of failures
    failure_examples = [r for r in results if not r['is_fully_tiled']][:5]

    return {
        'course_code': course_code,
        'total_seeds': total_analyzed,
        'fully_tiled_count': fully_tiled_count,
        'gap_count': total_analyzed - fully_tiled_count,
        'tiling_success_rate': round(tiling_success_rate, 2),
        'gap_rate': round(gap_rate, 2),
        'gap_categories': dict(gap_categories),
        'failure_examples': failure_examples[:5],
        'is_cjk': is_cjk
    }


def assess_severity(gap_categories: Dict[str, int], total_gaps: int) -> str:
    """Assess the severity of tiling gaps"""
    if total_gaps == 0:
        return "none"

    # Calculate percentages
    percentages = {cat: (count / total_gaps * 100) for cat, count in gap_categories.items()}

    # Minor: mostly punctuation or functional words
    minor_categories = ['punctuation_only', 'articles_prepositions_only', 'particles_only']
    minor_percentage = sum(percentages.get(cat, 0) for cat in minor_categories)

    # Content words indicate actual vocabulary gaps
    content_percentage = percentages.get('content_words', 0)

    # Assess based on content gaps (most important)
    if content_percentage == 0 and minor_percentage > 0:
        return "minor"  # Only minor issues
    elif content_percentage < 10:
        return "minor"  # Very few content gaps
    elif content_percentage < 30:
        return "moderate"  # Some content gaps
    else:
        return "severe"  # Many content gaps


def main():
    print("LEGO Tiling Coverage Analysis")
    print("=" * 80)
    print("Analyzing whether seeds can be fully reconstructed from their LEGOs")
    print()

    all_results = {}

    for course_code in COURSES:
        try:
            result = analyze_course(course_code)
            all_results[course_code] = result
        except Exception as e:
            print(f"❌ Error analyzing {course_code}: {e}")
            import traceback
            traceback.print_exc()

    # Generate overall summary
    print(f"\n{'='*80}")
    print("OVERALL SUMMARY")
    print(f"{'='*80}")

    summary = {
        'analysis_date': '2026-02-02',
        'courses_analyzed': len(all_results),
        'per_course_results': all_results,
        'overall_statistics': {
            'total_seeds': sum(r.get('total_seeds', 0) for r in all_results.values()),
            'total_fully_tiled': sum(r.get('fully_tiled_count', 0) for r in all_results.values()),
            'total_gaps': sum(r.get('gap_count', 0) for r in all_results.values())
        }
    }

    # Calculate severity per course
    for course_code, result in all_results.items():
        if result.get('gap_count', 0) > 0:
            severity = assess_severity(
                result.get('gap_categories', {}),
                result.get('gap_count', 0)
            )
            result['severity'] = severity
        else:
            result['severity'] = 'none'

    # Print summary table
    print(f"\n{'Course':<20} {'Total':>8} {'Tiled':>8} {'Gaps':>8} {'Success %':>10} {'Severity':<10}")
    print("-" * 80)

    for course_code in COURSES:
        if course_code in all_results:
            r = all_results[course_code]
            total = r.get('total_seeds', 0)
            tiled = r.get('fully_tiled_count', 0)
            gaps = r.get('gap_count', 0)
            success = r.get('tiling_success_rate', 0)
            severity = r.get('severity', 'unknown')

            print(f"{course_code:<20} {total:>8} {tiled:>8} {gaps:>8} {success:>9.1f}% {severity:<10}")

    # Save report
    output_path = 'scripts/quality-reports/tiling-coverage.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Full report saved to: {output_path}")
    print(f"\nTotal seeds analyzed: {summary['overall_statistics']['total_seeds']}")
    print(f"Total fully tiled: {summary['overall_statistics']['total_fully_tiled']}")
    print(f"Total with gaps: {summary['overall_statistics']['total_gaps']}")

    overall_success = (summary['overall_statistics']['total_fully_tiled'] /
                      summary['overall_statistics']['total_seeds'] * 100) if summary['overall_statistics']['total_seeds'] > 0 else 0
    print(f"Overall success rate: {overall_success:.1f}%")


if __name__ == '__main__':
    main()
