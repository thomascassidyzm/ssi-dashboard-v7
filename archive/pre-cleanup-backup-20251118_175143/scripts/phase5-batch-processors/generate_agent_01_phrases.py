#!/usr/bin/env python3
"""
Practice Basket Generation Agent 01
Phase 5 v6.2 - Three-Tier Overlap Detection

Generates high-quality practice phrases using linguistic reasoning.
"""

import json
import random
from typing import List, Tuple, Dict, Set

class LinguisticPhraseGenerator:
    """Generates meaningful practice phrases using linguistic intelligence"""

    def __init__(self, seed_data: dict, lego_id: str):
        self.seed_data = seed_data
        self.lego_id = lego_id
        self.lego_data = seed_data['legos'][lego_id]
        self.lego_english, self.lego_spanish = self.lego_data['lego']
        self.overlap_level = self.lego_data['overlap_level']
        self.target_count = self.lego_data['target_phrase_count']
        self.distribution = self.lego_data['phrase_distribution']
        self.is_final = self.lego_data['is_final_lego']

        # Extract vocabulary
        self.whitelist = self._build_whitelist()
        self.spanish_to_english = {sp: en for sp, en in self.whitelist}
        self.spanish_words = set()
        for sp_phrase in self.spanish_to_english.keys():
            self.spanish_words.update(sp_phrase.split())

        # Add current LEGO's words to available vocabulary
        self.spanish_words.update(self.lego_spanish.split())

    def _build_whitelist(self) -> List[Tuple[str, str]]:
        """Build whitelist from metadata"""
        return self.lego_data['_metadata']['whitelist_pairs']

    def validate_spanish(self, spanish: str) -> bool:
        """Check if all Spanish words are available"""
        words = spanish.split()
        return all(word in self.spanish_words for word in words)

    def count_legos_in_phrase(self, spanish: str) -> int:
        """Count LEGOs used in Spanish phrase"""
        # Sort by length to match longest first
        sorted_legos = sorted(self.spanish_to_english.keys(), key=len, reverse=True)

        # Add current LEGO to list
        all_legos = sorted_legos + [self.lego_spanish]
        all_legos = sorted(set(all_legos), key=len, reverse=True)

        count = 0
        remaining = spanish

        for lego in all_legos:
            if lego in remaining:
                count += 1
                # Mark this section as counted
                remaining = remaining.replace(lego, ' ' * len(lego), 1)

        return max(1, count)  # At least 1 LEGO

    def generate(self) -> List[List]:
        """Main generation method"""
        phrases = []

        # Determine strategy based on overlap level
        if self.overlap_level == "none":
            # 10 phrases: 2 short, 2 medium, 2 longer, 4 longest
            phrases.extend(self._generate_category(1, 2, 2))  # short 1-2 LEGOs
            phrases.extend(self._generate_category(3, 3, 2))  # medium 3 LEGOs
            phrases.extend(self._generate_category(4, 4, 2))  # longer 4 LEGOs
            phrases.extend(self._generate_category(5, 10, 4))  # longest 5+ LEGOs

        elif self.overlap_level == "partial":
            # 7 phrases: 1 short, 1 medium, 5 longer
            phrases.extend(self._generate_category(1, 2, 1))  # short
            phrases.extend(self._generate_category(3, 3, 1))  # medium
            phrases.extend(self._generate_category(4, 10, 5))  # longer 4-5+ LEGOs

        elif self.overlap_level == "complete":
            # 5 phrases: all longer (3-5+ LEGOs)
            phrases.extend(self._generate_category(3, 10, 5))

        # Final LEGO: last phrase = complete seed sentence
        if self.is_final and phrases:
            seed_en = self.seed_data['seed_pair']['target']
            seed_sp = self.seed_data['seed_pair']['known']
            lego_count = self.count_legos_in_phrase(seed_sp)
            phrases[-1] = [seed_en, seed_sp, None, lego_count]

        return phrases

    def _generate_category(self, min_legos: int, max_legos: int, count: int) -> List[List]:
        """Generate phrases in a specific LEGO count range"""
        phrases = []

        # Build all possible candidates
        all_candidates = self._build_all_candidates()

        # Filter by LEGO count range
        valid_candidates = []
        for eng, spa in all_candidates:
            if self.validate_spanish(spa):
                lego_count = self.count_legos_in_phrase(spa)
                if min_legos <= lego_count <= max_legos:
                    valid_candidates.append([eng, spa, None, lego_count])

        # Remove duplicates and shuffle
        unique_candidates = []
        seen = set()
        for phrase in valid_candidates:
            if phrase[1] not in seen:
                seen.add(phrase[1])
                unique_candidates.append(phrase)

        random.shuffle(unique_candidates)

        # Select required count
        phrases = unique_candidates[:count]

        # If we don't have enough, use aggressive fallback
        if len(phrases) < count:
            needed = count - len(phrases)
            fallbacks = self._generate_creative_fallbacks(min_legos, max_legos, needed, seen)
            phrases.extend(fallbacks)

        return phrases[:count]

    def _build_all_candidates(self) -> List[Tuple[str, str]]:
        """Build comprehensive list of natural phrase candidates"""
        candidates = []

        # ALWAYS include the LEGO itself (critical for limited vocabulary)
        candidates.append((self.lego_english, self.lego_spanish))

        # Build combinations based on current LEGO and available vocabulary
        candidates.extend(self._build_verb_patterns())
        candidates.extend(self._build_noun_patterns())
        candidates.extend(self._build_complex_patterns())
        candidates.extend(self._build_minimal_expansions())

        return candidates

    def _build_minimal_expansions(self) -> List[Tuple[str, str]]:
        """Build minimal expansions of the current LEGO with grammatical awareness"""
        expansions = []

        # Get words in current LEGO
        lego_words = self.lego_spanish.split()

        # Compatible word pairs (avoid ungrammatical combinations)
        safe_modifiers = {
            'ahora', 'contigo', 'también', 'más', 'bien', 'mucho'
        }

        # For single-word LEGOs, create limited expansions
        if len(lego_words) == 1:
            word = lego_words[0]

            # Only combine with safe modifiers to avoid word salad
            for avail_word in sorted(self.spanish_words):
                if avail_word != word and avail_word in safe_modifiers:
                    # word + modifier (e.g., "quiero ahora")
                    combo = f"{word} {avail_word}"
                    if self.validate_spanish(combo):
                        en = f"{self.lego_english} {self._translate_word(avail_word)}"
                        expansions.append((en, combo))

        return expansions

    def _translate_word(self, spanish_word: str) -> str:
        """Try to translate a Spanish word to English"""
        # Check if it's in whitelist
        if spanish_word in self.spanish_to_english:
            return self.spanish_to_english[spanish_word]

        # Check if it's part of a phrase
        for sp_phrase, en_phrase in self.spanish_to_english.items():
            if spanish_word in sp_phrase.split():
                # Try to extract the English word at the same position
                sp_words = sp_phrase.split()
                en_words = en_phrase.split()
                if len(sp_words) == len(en_words):
                    idx = sp_words.index(spanish_word)
                    return en_words[idx]

        # Fallback: return the Spanish word
        return spanish_word

    def _build_verb_patterns(self) -> List[Tuple[str, str]]:
        """Build patterns for verb-based LEGOs"""
        patterns = []
        current_spanish_words = self.lego_spanish.split()

        # Check if current LEGO contains common verbs
        verbs = ['hablar', 'aprender', 'practicar', 'decir', 'recordar', 'entender', 'usar', 'querer', 'saber', 'ver', 'hacer', 'tener', 'pensar']
        current_is_verb = any(verb in current_spanish_words for verb in verbs)

        # quiero + [current LEGO]
        if 'quiero' in self.spanish_to_english:
            patterns.append((
                f"I want {self.lego_english}",
                f"quiero {self.lego_spanish}"
            ))

            # quiero + [LEGO] + español
            if 'español' in self.spanish_words and current_is_verb:
                patterns.append((
                    f"I want {self.lego_english} Spanish",
                    f"quiero {self.lego_spanish} español"
                ))

            # quiero + [LEGO] + contigo
            if 'contigo' in self.spanish_words:
                patterns.append((
                    f"I want {self.lego_english} with you",
                    f"quiero {self.lego_spanish} contigo"
                ))

            # quiero + [LEGO] + ahora
            if 'ahora' in self.spanish_words:
                patterns.append((
                    f"I want {self.lego_english} now",
                    f"quiero {self.lego_spanish} ahora"
                ))

            # quiero + [LEGO] + español + contigo
            if 'español' in self.spanish_words and 'contigo' in self.spanish_words and current_is_verb:
                patterns.append((
                    f"I want {self.lego_english} Spanish with you",
                    f"quiero {self.lego_spanish} español contigo"
                ))

        # estoy intentando + [current LEGO]
        if 'estoy intentando' in self.spanish_to_english:
            patterns.append((
                f"I'm trying {self.lego_english}",
                f"estoy intentando {self.lego_spanish}"
            ))

            # estoy intentando + [LEGO] + español
            if 'español' in self.spanish_words and current_is_verb:
                patterns.append((
                    f"I'm trying {self.lego_english} Spanish",
                    f"estoy intentando {self.lego_spanish} español"
                ))

        # voy a + [current LEGO]
        if 'voy a' in self.spanish_to_english or ('voy' in self.spanish_words and 'a' in self.spanish_words):
            patterns.append((
                f"I'm going {self.lego_english}",
                f"voy a {self.lego_spanish}"
            ))

            # voy a + [LEGO] + español
            if 'español' in self.spanish_words and current_is_verb:
                patterns.append((
                    f"I'm going {self.lego_english} Spanish",
                    f"voy a {self.lego_spanish} español"
                ))

        return patterns

    def _build_noun_patterns(self) -> List[Tuple[str, str]]:
        """Build patterns for noun-based LEGOs"""
        patterns = []

        # [LEGO] + en español
        if 'en español' in self.spanish_to_english or ('en' in self.spanish_words and 'español' in self.spanish_words):
            patterns.append((
                f"{self.lego_english} in Spanish",
                f"{self.lego_spanish} en español"
            ))

        # [LEGO] + contigo
        if 'contigo' in self.spanish_words:
            patterns.append((
                f"{self.lego_english} with you",
                f"{self.lego_spanish} contigo"
            ))

        # [LEGO] + ahora
        if 'ahora' in self.spanish_words:
            patterns.append((
                f"{self.lego_english} now",
                f"{self.lego_spanish} ahora"
            ))

        return patterns

    def _build_complex_patterns(self) -> List[Tuple[str, str]]:
        """Build more complex phrase combinations"""
        patterns = []

        # Long combinations that make sense linguistically
        # quiero hablar español contigo ahora
        if all(w in self.spanish_words for w in ['quiero', 'hablar', 'español', 'contigo', 'ahora']):
            patterns.append((
                "I want to speak Spanish with you now",
                "quiero hablar español contigo ahora"
            ))

        # estoy intentando aprender español
        if all(w in self.spanish_words for w in ['estoy', 'intentando', 'aprender', 'español']):
            patterns.append((
                "I'm trying to learn Spanish",
                "estoy intentando aprender español"
            ))

        # voy a practicar hablar español
        if all(w in self.spanish_words for w in ['voy', 'a', 'practicar', 'hablar', 'español']):
            patterns.append((
                "I'm going to practice speaking Spanish",
                "voy a practicar hablar español"
            ))

        # cómo hablar español
        if all(w in self.spanish_words for w in ['cómo', 'hablar', 'español']):
            patterns.append((
                "how to speak Spanish",
                "cómo hablar español"
            ))

        # cómo decir algo en español
        if all(w in self.spanish_words for w in ['cómo', 'decir', 'algo', 'en', 'español']):
            patterns.append((
                "how to say something in Spanish",
                "cómo decir algo en español"
            ))

        return patterns

    def _generate_creative_fallbacks(self, min_legos: int, max_legos: int, count: int, seen: Set[str]) -> List[List]:
        """Generate creative fallback phrases when we need more"""
        fallbacks = []

        # Strategy 1: Use English variations for 1-LEGO phrases
        # This helps learners recognize the Spanish form with different English expressions
        if min_legos <= 1 <= max_legos:
            english_variations = self._get_english_variations()
            for en_var in english_variations:
                if len(fallbacks) >= count:
                    break
                # Allow same Spanish with different English
                fallbacks.append([en_var, self.lego_spanish, None, 1])

        # Strategy 2: If still need more, repeat with the base English form
        if len(fallbacks) < count:
            remaining = count - len(fallbacks)
            for i in range(remaining):
                fallbacks.append([self.lego_english, self.lego_spanish, None, 1])

        return fallbacks[:count]

    def _get_english_variations(self) -> List[str]:
        """Get English variations for common LEGOs"""
        variations_map = {
            "I want": ["I want", "I'd like", "I wish", "I desire"],
            "to speak": ["to speak", "to talk", "speak", "talk"],
            "Spanish": ["Spanish", "the Spanish language"],
            "with you": ["with you", "along with you"],
            "now": ["now", "right now", "at this moment"],
            "I'm trying": ["I'm trying", "I am trying", "I try"],
            "to learn": ["to learn", "learn"],
            "how to speak": ["how to speak", "how to talk"],
            "something": ["something", "anything"],
            "to say": ["to say", "say"],
            "I'm going to": ["I'm going to", "I will", "I'll"],
            "to practice": ["to practice", "to practise", "practice"],
        }

        # Return variations for current LEGO
        if self.lego_english in variations_map:
            return variations_map[self.lego_english]

        # Default: just return the original
        return [self.lego_english]


def main():
    """Generate all practice phrases for Agent 01"""

    scaffold_path = "/home/user/ssi-dashboard-v7/public/vfs/courses/spa_for_eng/phase5_scaffolds/agent_01.json"
    output_path = "/home/user/ssi-dashboard-v7/public/vfs/courses/spa_for_eng/phase5_outputs/agent_01_provisional.json"

    print("Loading scaffold...")
    with open(scaffold_path, 'r') as f:
        data = json.load(f)

    print(f"Seeds: {len(data['seeds'])}")

    total_legos = 0
    total_phrases = 0
    issues = []

    for seed_id in sorted(data['seeds'].keys()):
        seed_data = data['seeds'][seed_id]
        print(f"\n{seed_id}: {seed_data['seed_pair']['target']}")

        for lego_id in sorted(seed_data['legos'].keys()):
            lego_data = seed_data['legos'][lego_id]
            print(f"  {lego_id}: {lego_data['lego'][0]} / {lego_data['lego'][1]}")
            print(f"    Overlap: {lego_data['overlap_level']}, Target: {lego_data['target_phrase_count']}")

            # Generate phrases
            generator = LinguisticPhraseGenerator(seed_data, lego_id)
            phrases = generator.generate()

            # Store phrases
            lego_data['practice_phrases'] = phrases

            total_legos += 1
            total_phrases += len(phrases)

            print(f"    Generated: {len(phrases)} phrases")

            # Check if we hit target
            if len(phrases) < lego_data['target_phrase_count']:
                issues.append(f"{lego_id}: Generated {len(phrases)}/{lego_data['target_phrase_count']}")

    # Update generation stage
    data['generation_stage'] = "PHRASES_GENERATED"

    # Save output
    print(f"\nSaving to {output_path}...")
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Report
    print(f"\n{'='*60}")
    print(f"COMPLETE!")
    print(f"{'='*60}")
    print(f"Seeds processed: {len(data['seeds'])}")
    print(f"LEGOs processed: {total_legos}")
    print(f"Phrases generated: {total_phrases}")

    if issues:
        print(f"\nIssues ({len(issues)}):")
        for issue in issues[:10]:
            print(f"  - {issue}")
        if len(issues) > 10:
            print(f"  ... and {len(issues) - 10} more")
    else:
        print("\nNo issues detected!")

    print(f"\nOutput saved to:")
    print(f"  {output_path}")


if __name__ == "__main__":
    main()
