#!/usr/bin/env python3
"""
Analyze seeds S0301-S0310 for truncated Spanish translations.
For each seed, extract 1 random practice phrase from a random basket.
"""

import json
import random
from pathlib import Path

# Set seed for reproducibility
random.seed(42)

BASKETS_PATH = Path("/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/spa_for_eng/lego_baskets.json")

def load_baskets():
    """Load the lego_baskets.json file."""
    with open(BASKETS_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_seed_baskets(data, seed_id):
    """Get all baskets for a given seed ID (e.g., 'S0301')."""
    baskets = {}
    for basket_id, basket_data in data['baskets'].items():
        if basket_id.startswith(seed_id + 'L'):
            baskets[basket_id] = basket_data
    return baskets

def is_truncated(english, spanish):
    """
    Check if Spanish translation appears truncated compared to English.

    A translation is considered truncated if:
    - The English has key semantic content that's missing in Spanish
    - Common truncation patterns are detected
    """
    # Normalize for comparison
    eng_lower = english.lower().strip()
    spa_lower = spanish.lower().strip()

    # Check for common truncation patterns
    truncation_indicators = []

    # 1. Location words missing (here, there)
    if 'here' in eng_lower and 'aquí' not in spa_lower and 'acá' not in spa_lower:
        truncation_indicators.append("missing 'here' (aquí)")

    if 'there' in eng_lower and 'allí' not in spa_lower and 'allá' not in spa_lower and 'ahí' not in spa_lower:
        truncation_indicators.append("missing 'there' (allí/ahí)")

    # 2. Time words missing (now, today, tomorrow, yesterday)
    # Use word boundaries to avoid false positives (e.g., "know" contains "now")
    eng_words_set = set(eng_lower.replace(',', '').replace('.', '').replace('?', '').replace('!', '').split())
    if 'now' in eng_words_set and 'ahora' not in spa_lower:
        truncation_indicators.append("missing 'now' (ahora)")

    if 'today' in eng_lower and 'hoy' not in spa_lower:
        truncation_indicators.append("missing 'today' (hoy)")

    if 'tomorrow' in eng_lower and 'mañana' not in spa_lower:
        truncation_indicators.append("missing 'tomorrow' (mañana)")

    if 'yesterday' in eng_lower and 'ayer' not in spa_lower:
        truncation_indicators.append("missing 'yesterday' (ayer)")

    # 3. Manner words missing (well, badly, quickly, slowly)
    if 'well' in eng_lower and 'bien' not in spa_lower:
        truncation_indicators.append("missing 'well' (bien)")

    # 4. Modal verbs - check if English has modal that's completely missing
    # (but allow for different Spanish constructions)
    if eng_lower.startswith('can ') and not any(x in spa_lower for x in ['puedo', 'puedes', 'puede', 'pueden']):
        truncation_indicators.append("possibly missing 'can' (poder)")

    # 5. Direct objects missing (it, them, this, that)
    if 'this' in eng_lower and 'esto' not in spa_lower and 'esta' not in spa_lower and 'este' not in spa_lower:
        truncation_indicators.append("missing 'this' (esto/este/esta)")

    if 'that' in eng_lower and 'eso' not in spa_lower and 'esa' not in spa_lower and 'ese' not in spa_lower and 'que' not in spa_lower:
        truncation_indicators.append("missing 'that' (eso/ese/esa/que)")

    # 6. Check for sentence ending abruptly (Spanish ends with verb when English has object)
    # Common pattern: "when will you be" → "cuándo estarás" (missing "here/there")
    eng_words = eng_lower.split()
    spa_words = spa_lower.split()

    # If English has significantly more words and Spanish seems incomplete
    if len(eng_words) > len(spa_words) + 2:
        # This is a rough heuristic - might need refinement
        pass  # Don't flag just on word count alone

    return truncation_indicators

def analyze_phrase(basket_id, phrase):
    """Analyze a single phrase for truncation."""
    english = phrase['known']
    spanish = phrase['target']

    truncation_issues = is_truncated(english, spanish)

    if truncation_issues:
        status = f"TRUNCATED ({', '.join(truncation_issues)})"
    else:
        status = "OK"

    return {
        'basket_id': basket_id,
        'english': english,
        'spanish': spanish,
        'status': status,
        'is_truncated': len(truncation_issues) > 0
    }

def main():
    """Main analysis function."""
    data = load_baskets()

    results = []

    # Analyze seeds S0301 to S0310
    for seed_num in range(301, 311):
        seed_id = f"S{seed_num:04d}"

        # Get all baskets for this seed
        seed_baskets = get_seed_baskets(data, seed_id)

        if not seed_baskets:
            print(f"{seed_id}: No baskets found")
            continue

        # Pick a random basket
        basket_id = random.choice(list(seed_baskets.keys()))
        basket = seed_baskets[basket_id]

        # Pick a random phrase from the basket
        if 'practice_phrases' in basket and basket['practice_phrases']:
            phrase = random.choice(basket['practice_phrases'])
            result = analyze_phrase(basket_id, phrase)
            results.append((seed_id, result))
        else:
            print(f"{seed_id}: No practice phrases in basket {basket_id}")

    # Print report
    print("```")
    for seed_id, result in results:
        print(f"{seed_id}: [{result['basket_id']}] \"{result['english']}\" → \"{result['spanish']}\" - {result['status']}")

    # Print summary
    ok_count = sum(1 for _, r in results if not r['is_truncated'])
    truncated_count = sum(1 for _, r in results if r['is_truncated'])

    print(f"\nSummary: {ok_count}/10 OK, {truncated_count}/10 TRUNCATED")
    print("```")

if __name__ == '__main__':
    main()
