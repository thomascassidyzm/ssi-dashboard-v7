#!/usr/bin/env python3
"""
Analyze lego_baskets.json for seeds S0071-S0080.
Extract 1 random practice phrase from a random basket for each seed.
Check if Spanish translation looks complete (not truncated).
"""

import json
import random

def load_baskets(file_path):
    """Load lego_baskets.json"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
        # The baskets are nested under 'baskets' key
        return data.get('baskets', {})

def get_baskets_for_seed(baskets, seed_code):
    """Get all baskets for a specific seed (e.g., 'S0071')"""
    seed_baskets = {}
    for basket_id, basket_data in baskets.items():
        if basket_id.startswith(seed_code):
            seed_baskets[basket_id] = basket_data
    return seed_baskets

def extract_random_phrase(seed_baskets):
    """Extract one random practice phrase from a random basket"""
    if not seed_baskets:
        return None, None, None

    # Pick a random basket
    basket_id = random.choice(list(seed_baskets.keys()))
    basket = seed_baskets[basket_id]

    # Get practice phrases
    practice_phrases = basket.get('practice_phrases', [])

    if not practice_phrases:
        return basket_id, None, None

    # Pick a random phrase
    phrase = random.choice(practice_phrases)
    english = phrase.get('known', '')
    spanish = phrase.get('target', '')

    return basket_id, english, spanish

def is_truncated(english, spanish):
    """
    Check if Spanish translation appears truncated.

    A truncated translation is one where the English has more semantic content
    than the Spanish. This is a heuristic check.

    Indicators of truncation:
    1. Spanish is significantly shorter than English (word count ratio)
    2. English has key words not represented in Spanish
    3. Spanish ends abruptly without proper closure
    """
    if not english or not spanish:
        return True, "Empty translation"

    # Word count comparison
    eng_words = english.lower().replace('.', '').replace(',', '').replace('?', '').replace('!', '').split()
    spa_words = spanish.lower().replace('.', '').replace(',', '').replace('?', '').replace('!', '').split()

    # If Spanish is much shorter (< 60% of English word count), likely truncated
    word_ratio = len(spa_words) / len(eng_words) if len(eng_words) > 0 else 0

    # Check for common truncation patterns
    # English location words that should have Spanish equivalents
    location_words = {
        'here': ['aquí', 'acá'],
        'there': ['allí', 'allá', 'ahí'],
        'everywhere': ['todas partes', 'todos lados'],
        'anywhere': ['cualquier'],
        'somewhere': ['algún'],
    }

    missing_content = []

    for eng_word, spa_equivalents in location_words.items():
        if eng_word in english.lower():
            has_equivalent = any(equiv in spanish.lower() for equiv in spa_equivalents)
            if not has_equivalent:
                missing_content.append(f"'{eng_word}' not found in Spanish")

    # Check for temporal words
    time_words = {
        'now': ['ahora'],
        'today': ['hoy'],
        'tomorrow': ['mañana'],
        'yesterday': ['ayer'],
        'tonight': ['esta noche'],
        'morning': ['mañana'],
        'afternoon': ['tarde'],
        'evening': ['noche'],
    }

    for eng_word, spa_equivalents in time_words.items():
        if eng_word in english.lower():
            has_equivalent = any(equiv in spanish.lower() for equiv in spa_equivalents)
            if not has_equivalent:
                missing_content.append(f"'{eng_word}' not found in Spanish")

    # Determine if truncated
    if word_ratio < 0.6:
        return True, f"Word count ratio too low ({word_ratio:.2f})"

    if missing_content:
        return True, "; ".join(missing_content)

    return False, "OK"

def main():
    file_path = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/lego_baskets.json'

    print("Loading lego_baskets.json...")
    baskets = load_baskets(file_path)

    print("\nAnalyzing seeds S0071-S0080...\n")

    results = []
    ok_count = 0
    truncated_count = 0

    # Set seed for reproducibility (optional)
    random.seed(42)

    for seed_num in range(71, 81):
        seed_code = f"S{seed_num:04d}"
        seed_baskets = get_baskets_for_seed(baskets, seed_code)

        if not seed_baskets:
            print(f"{seed_code}: NO BASKETS FOUND")
            results.append(f"{seed_code}: NO BASKETS FOUND")
            continue

        basket_id, english, spanish = extract_random_phrase(seed_baskets)

        if not english or not spanish:
            print(f"{seed_code}: [{basket_id}] NO PRACTICE PHRASES")
            results.append(f"{seed_code}: [{basket_id}] NO PRACTICE PHRASES")
            continue

        truncated, reason = is_truncated(english, spanish)

        status = "TRUNCATED" if truncated else "OK"
        if truncated:
            truncated_count += 1
        else:
            ok_count += 1

        output = f'{seed_code}: [{basket_id}] "{english}" → "{spanish}" - {status}'
        if truncated and reason != "OK":
            output += f" ({reason})"

        print(output)
        results.append(output)

    print(f"\nSummary: {ok_count}/10 OK, {truncated_count}/10 TRUNCATED")

    # Write results to file
    output_file = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/s0071_s0080_analysis.txt'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(results))
        f.write(f'\n\nSummary: {ok_count}/10 OK, {truncated_count}/10 TRUNCATED\n')

    print(f"\nResults saved to: {output_file}")

if __name__ == '__main__':
    main()
