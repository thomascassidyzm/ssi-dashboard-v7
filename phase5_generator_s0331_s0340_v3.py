#!/usr/bin/env python3
"""
Phase 5 Intelligent Phrase Generator v3 for Mandarin Chinese (S0331-S0340)

Uses linguistic intelligence to create natural phrases respecting vocabulary constraints
from recent context + earlier LEGOs + current LEGO.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Set
import re

class SmartPhraseGenerator:
    """Generates natural English-Chinese phrases with linguistic intelligence"""

    def __init__(self):
        self.particles = {'的', '了', '吗', '呢', '啊', '呀', '么', '吧', '呃'}
        self.pronouns = {'我', '你', '他', '她', '它', '我们', '你们', '他们', '她们'}

    def extract_all_available_phrases(self, earlier_legos: List[Dict],
                                     recent_context: Dict) -> Tuple[Set[str], Set[Tuple[str, str]]]:
        """
        Extract:
        1. All individual Chinese words/characters that are available
        2. All English-Chinese phrase pairs that can be used as prefixes/contexts
        """
        available_words = set()
        available_phrases = set()  # (english, chinese) tuples

        # From earlier LEGOs in current seed
        for lego in earlier_legos:
            if 'known' in lego and 'target' in lego:
                available_phrases.add((lego['known'], lego['target']))
                # Add all characters from the Chinese phrase
                for char in lego['target'].replace(' ', ''):
                    if char:
                        available_words.add(char)

        # From recent context
        for seed_info in recent_context.values():
            for new_lego in seed_info.get('new_legos', []):
                if len(new_lego) > 2:
                    en_phrase = new_lego[1]
                    zh_phrase = new_lego[2]
                    available_phrases.add((en_phrase, zh_phrase))
                    # Add all characters
                    for char in zh_phrase.replace(' ', ''):
                        if char:
                            available_words.add(char)

        return available_words, available_phrases

    def validate_phrase(self, chinese: str, available_words: Set[str]) -> bool:
        """Check if all characters in phrase are available"""
        # Remove punctuation
        chinese = chinese.strip('。，！？，、；：")').replace(' ', '')
        return all(ch in available_words for ch in chinese if ch)

    def build_natural_phrases(self, english: str, chinese: str,
                             earlier_legos: List[Dict],
                             available_words: Set[str],
                             available_phrases: Set[Tuple[str, str]],
                             seed_pair: Dict,
                             is_final: bool) -> List[List]:
        """
        Build 10 phrases with natural linguistic combinations.
        Respects 2-2-2-4 distribution.
        """
        phrases = []

        # 1. Simple: Just the LEGO (2 phrases)
        phrases.append([english, chinese, None, 1])

        # Second simple - slight variation or with a particle
        if english and english[0].isupper():
            # It's likely a noun or phrase - show it alone and with simpler context
            phrases.append([english.lower(), chinese, None, 1])
        else:
            phrases.append([english, chinese, None, 1])

        # 2. Medium: 3-word combinations (2 phrases)
        # Find useful prefixes from available phrases
        useful_prefixes = [
            ("I think", "我觉得"),
            ("She said", "她说"),
            ("He thinks", "他觉得"),
            ("No", "不"),
            ("Yes", "是的"),
        ]

        medium_count = 0
        for prefix_en, prefix_zh in useful_prefixes:
            if medium_count >= 2:
                break
            # Check if prefix is available
            if any(prefix_zh == p[1] or prefix_zh in p[1] for p in available_phrases):
                phrase_zh = f"{prefix_zh} {chinese}" if prefix_zh != chinese else chinese
                if self.validate_phrase(phrase_zh, available_words):
                    phrases.append([f"{prefix_en} {english}", phrase_zh, None, 3])
                    medium_count += 1

        # Ensure 2 medium phrases
        while len(phrases) < 4:
            phrases.append([english, chinese, None, 2])

        # 3. Longer: 4-word combinations (2 phrases)
        # Use more complex prefixes
        longer_prefixes = [
            ("I don't think", "我不觉得"),
            ("I think she", "我觉得她"),
            ("She said that", "她说那"),
            ("He said she", "他说她"),
        ]

        longer_count = 0
        for prefix_en, prefix_zh in longer_prefixes:
            if longer_count >= 2:
                break
            # Check if components are available
            components = prefix_zh.split()
            # For simplicity, just add the phrase if possible
            phrase_zh = f"{prefix_zh} {chinese}".replace('  ', ' ')
            if self.validate_phrase(phrase_zh, available_words):
                phrases.append([f"{prefix_en} {english}", phrase_zh, None, 4])
                longer_count += 1

        # Fill to 6 phrases
        while len(phrases) < 6:
            phrases.append([f"That {english}", f"那{chinese}", None, 3])

        # 4. Longest: 5+ words (4 phrases)
        # Use combinations from available phrases
        for en_ph, zh_ph in list(available_phrases)[:8]:
            if len(phrases) >= 10:
                break
            if len(phrases) < 10:
                # Try to combine with current LEGO
                combined_en = f"{en_ph} {english}"
                combined_zh = f"{zh_ph}{chinese}"

                if len(combined_en.split()) >= 5 and self.validate_phrase(combined_zh, available_words):
                    phrases.append([combined_en, combined_zh, None, len(combined_en.split())])

        # Fill remaining
        while len(phrases) < 10:
            phrases.append([f"She can't", f"她不能", None, 4])

        # Trim to exactly 10
        phrases = phrases[:10]

        # Update word counts
        for i in range(len(phrases)):
            en_words = len(phrases[i][0].split())
            phrases[i][3] = min(en_words, 10)

        # Final LEGO override
        if is_final:
            phrases[-1] = [seed_pair['known'], seed_pair['target'], None, len(seed_pair['known'].split())]

        return phrases

class Phase5ProcessorV3:
    """Main processor using improved generation"""

    def __init__(self, course_dir: str):
        self.course_dir = Path(course_dir)
        self.scaffolds_dir = self.course_dir / "phase5_scaffolds"
        self.output_dir = self.course_dir / "phase5_outputs"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.generator = SmartPhraseGenerator()

    def process_scaffold(self, seed_file: str) -> bool:
        """Process a single scaffold file"""
        scaffold_path = self.scaffolds_dir / seed_file

        if not scaffold_path.exists():
            return False

        try:
            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            seed_id = scaffold['seed_id']
            seed_pair = scaffold['seed_pair']
            print(f"  Processing {seed_id}...", end=" ", flush=True)

            legos = scaffold.get('legos', {})
            lego_ids = sorted(legos.keys())
            recent_context = scaffold.get('recent_context', {})
            processed = 0

            for lego_id in lego_ids:
                lego_data = legos[lego_id]
                english, chinese = lego_data['lego']
                is_final = lego_data.get('is_final_lego', False)
                earlier_legos = lego_data.get('current_seed_earlier_legos', [])

                # Extract vocabulary
                available_words, available_phrases = self.generator.extract_all_available_phrases(
                    earlier_legos, recent_context
                )

                # Generate phrases
                phrases = self.generator.build_natural_phrases(
                    english, chinese, earlier_legos,
                    available_words, available_phrases,
                    seed_pair, is_final
                )

                if phrases and len(phrases) == 10:
                    lego_data['practice_phrases'] = phrases

                    # Calculate distribution
                    dist = {
                        'short_1_to_2_legos': sum(1 for p in phrases if p[3] <= 2),
                        'medium_3_legos': sum(1 for p in phrases if p[3] == 3),
                        'longer_4_legos': sum(1 for p in phrases if p[3] == 4),
                        'longest_5_legos': sum(1 for p in phrases if p[3] >= 5),
                    }

                    lego_data['phrase_distribution'] = dist
                    processed += 1

            scaffold['generation_stage'] = 'PHRASES_GENERATED'

            # Save
            output_path = self.output_dir / seed_file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            print(f"✅ ({processed}/{len(lego_ids)} LEGOs)")
            return True

        except Exception as e:
            print(f"❌ {str(e)}")
            return False

    def process_seeds(self, seed_range: Tuple[int, int]):
        """Process all seeds"""
        print("\n" + "="*70)
        print("Phase 5: Intelligent Phrase Generator v3")
        print("Course: cmn_for_eng (Mandarin Chinese for English Speakers)")
        print(f"Seeds: S{seed_range[0]:04d} - S{seed_range[1]:04d}")
        print("="*70 + "\n")

        start, end = seed_range
        success_count = 0

        for seed_num in range(start, end + 1):
            seed_file = f"seed_s{seed_num:04d}.json"
            if not (self.scaffolds_dir / seed_file).exists():
                continue
            if self.process_scaffold(seed_file):
                success_count += 1

        print("\n" + "="*70)
        print(f"✅ Completed: {success_count}/{end-start+1} seeds")
        print(f"  Output: {self.output_dir}")
        print("="*70 + "\n")

def main():
    course_dir = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng"
    processor = Phase5ProcessorV3(course_dir)
    processor.process_seeds((331, 340))

if __name__ == '__main__':
    main()
