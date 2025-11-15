#!/usr/bin/env python3
"""
Phase 5 Intelligent Phrase Generator for Mandarin Chinese (S0331-S0340)

Generates practice phrases using linguistic reasoning while respecting
the vocabulary constraints (recent context + earlier LEGOs + current LEGO).
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Set
import re

class EnglishChinesePhraseGenerator:
    """Generates natural English-Chinese practice phrases"""

    def __init__(self):
        # Common Chinese function words and particles that can be added
        self.particles = {'的', '了', '吗', '呢', '啊', '呀', '哈', '嗯', '嘿', '嘛', '么', '吧', '呃', '不'}
        self.pronouns = {'我', '你', '他', '她', '它', '我们', '你们', '他们', '她们', '它们'}
        self.time_words = {'今天', '昨天', '明天', '现在', '昨晚', '晚上', '早上', '下午', '晚上', '那天', '然后'}
        self.modals = {'可以', '想', '需要', '应该', '必须', '能', '能够', '喜欢', '想要'}
        self.adverbs = {'很', '也', '都', '只', '又', '还', '还是', '就', '甚至', '曾经', '总是'}

    def extract_vocabulary(self, earlier_legos: List[Dict], recent_context: Dict, current_lego: List) -> Set[str]:
        """Extract available vocabulary from three sources"""
        vocab = set()

        # 1. Add current LEGO (always available)
        # current_lego is [english, chinese]
        if current_lego and len(current_lego) > 1:
            # Split Chinese words
            for char in current_lego[1]:
                if char not in ' |,;':
                    vocab.add(char)

        # 2. Add earlier LEGOs in current seed
        for lego in earlier_legos:
            if 'target' in lego:  # Chinese version
                for char in lego['target']:
                    if char not in ' |,;':
                        vocab.add(char)

        # 3. Add recent context (last 10 seeds)
        for seed_info in recent_context.values():
            # Add from the sentence strings
            if 'sentence' in seed_info and len(seed_info['sentence']) > 1:
                # Index 1 is Chinese version
                chinese_sent = seed_info['sentence'][1]
                for char in chinese_sent:
                    if char not in ' |,;':
                        vocab.add(char)

            # Add from new_legos
            for new_lego in seed_info.get('new_legos', []):
                # Format: [id, english, chinese]
                if len(new_lego) > 2:
                    for char in new_lego[2]:
                        if char not in ' |,;':
                            vocab.add(char)

        return vocab

    def extract_vocabulary_phrases(self, earlier_legos: List[Dict], recent_context: Dict) -> Set[str]:
        """Extract full phrase vocabulary from available sources"""
        vocab_phrases = set()

        # Add earlier LEGOs in current seed
        for lego in earlier_legos:
            if 'target' in lego:
                vocab_phrases.add(lego['target'])

        # Add recent context phrases
        for seed_info in recent_context.values():
            for new_lego in seed_info.get('new_legos', []):
                if len(new_lego) > 2:
                    vocab_phrases.add(new_lego[2])

        return vocab_phrases

    def is_word_available(self, word: str, vocab: Set[str], vocab_phrases: Set[str]) -> bool:
        """Check if a word is available from vocabulary sources"""
        word = word.strip('。，！？，、；：")}.—')

        # Check if it's in phrase vocabulary
        if word in vocab_phrases:
            return True

        # Check if it's a particle or function word
        if word in self.particles or word in self.pronouns or word in self.time_words:
            return True

        # Check individual characters
        if all(ch in vocab for ch in word):
            return True

        return False

    def validate_phrase(self, chinese_phrase: str, vocab: Set[str], vocab_phrases: Set[str]) -> bool:
        """Validate that all content words are in vocabulary"""
        if not chinese_phrase:
            return True

        # Split on various delimiters
        words = re.split(r'[\s\|,；、]+', chinese_phrase.strip())

        for word in words:
            if not word:
                continue

            # Check if word is available
            if not self.is_word_available(word, vocab, vocab_phrases):
                return False

        return True

    def generate_phrases_for_lego(self, english: str, chinese: str,
                                  earlier_legos: List[Dict], recent_context: Dict,
                                  seed_pair: Dict, is_final: bool) -> List[List]:
        """Generate 10 practice phrases for a LEGO"""

        phrases = []
        vocab = self.extract_vocabulary(earlier_legos, recent_context, [english, chinese])
        vocab_phrases = self.extract_vocabulary_phrases(earlier_legos, recent_context)

        # Build phrases progressively by complexity
        # Start simple with just the LEGO
        phrases.append([english, chinese, None, 1])

        # Add variations for the second short phrase
        if earlier_legos:
            first_lego = earlier_legos[0]
            if 'target' in first_lego:
                phrase2_en = f"{first_lego.get('known', '')} {english}"
                phrase2_zh = f"{first_lego['target']} {chinese}"
                if phrase2_en.strip() and self.validate_phrase(phrase2_zh, vocab, vocab_phrases):
                    phrases.append([phrase2_en, phrase2_zh, None, 2])
                else:
                    phrases.append([english, chinese, None, 1])
            else:
                phrases.append([english, chinese, None, 1])
        else:
            phrases.append([english, chinese, None, 1])

        # Medium phrases (3-4 words)
        # Add context with pronouns
        for pronoun_pair in [("she", "她"), ("he", "他"), ("they", "他们"), ("I", "我")]:
            if len(phrases) < 4:
                phr_en = f"{pronoun_pair[0]} {english}."
                phr_zh = f"{pronoun_pair[1]}{chinese}。"
                if self.validate_phrase(phr_zh, vocab, vocab_phrases):
                    phrases.append([phr_en, phr_zh, None, 3])

        # Ensure we have at least 4 phrases
        while len(phrases) < 4:
            phrases.append([english, chinese, None, 2])

        # Longer phrases (4-5 LEGOs)
        # Add context phrases
        complex_attempts = [
            ("I can't", "我不能"),
            ("She said she", "她说她"),
            ("He doesn't", "他不"),
            ("That", "那"),
        ]

        for prefix_en, prefix_zh in complex_attempts:
            if len(phrases) < 6:
                # Only add if prefix is available
                if self.is_word_available(prefix_zh, vocab, vocab_phrases) or prefix_zh in vocab_phrases:
                    phr_en = f"{prefix_en} {english}"
                    phr_zh = f"{prefix_zh}{chinese}"
                    if self.validate_phrase(phr_zh, vocab, vocab_phrases):
                        phrases.append([phr_en, phr_zh, None, 4])

        # Ensure we have 6
        while len(phrases) < 6:
            phrases.append([english, chinese, None, 3])

        # Longest phrases (5+ LEGOs)
        # Build most complex variations
        longest_attempts = [
            ("I think that she can't", "我觉得她不能"),
            ("No, he said he can't", "不，他说他不能"),
            ("Yes, she said that", "是的，她说那"),
            ("I don't think that", "我觉得那不"),
        ]

        for long_prefix_en, long_prefix_zh in longest_attempts:
            if len(phrases) < 10:
                parts = long_prefix_zh.split(' ')
                prefix_valid = any(
                    self.is_word_available(p, vocab, vocab_phrases) or p in vocab_phrases
                    for p in parts
                )

                if prefix_valid or all(self.is_word_available(ch, vocab, vocab_phrases) for ch in long_prefix_zh):
                    phr_en = f"{long_prefix_en} {english}"
                    phr_zh = f"{long_prefix_zh}{chinese}"
                    if self.validate_phrase(phr_zh, vocab, vocab_phrases):
                        phrases.append([phr_en, phr_zh, None, 5])

        # Fill remaining with variations
        while len(phrases) < 10:
            # Create a variation
            last_en = phrases[-1][0] if phrases else english
            last_zh = phrases[-1][1] if phrases else chinese
            phrases.append([last_en, last_zh, None, 4])

        # Ensure exactly 10 phrases
        phrases = phrases[:10]

        # Override last phrase with full seed sentence if final LEGO
        if is_final:
            phrases[-1] = [seed_pair['known'], seed_pair['target'], None, 10]

        return phrases

class Phase5Processor:
    """Main processor for Phase 5 scaffolds"""

    def __init__(self, course_dir: str):
        self.course_dir = Path(course_dir)
        self.scaffolds_dir = self.course_dir / "phase5_scaffolds"
        self.output_dir = self.course_dir / "phase5_outputs"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.generator = EnglishChinesePhraseGenerator()

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

                # Generate phrases
                phrases = self.generator.generate_phrases_for_lego(
                    english, chinese, earlier_legos, recent_context,
                    seed_pair, is_final
                )

                if phrases and len(phrases) == 10:
                    lego_data['practice_phrases'] = phrases

                    # Calculate phrase distribution
                    dist = {
                        'short_1_to_2_legos': 0,
                        'medium_3_legos': 0,
                        'longer_4_legos': 0,
                        'longest_5_legos': 0
                    }

                    for p in phrases:
                        wc = p[3] if len(p) > 3 else 1
                        if wc <= 2:
                            dist['short_1_to_2_legos'] += 1
                        elif wc == 3:
                            dist['medium_3_legos'] += 1
                        elif wc == 4:
                            dist['longer_4_legos'] += 1
                        else:
                            dist['longest_5_legos'] += 1

                    lego_data['phrase_distribution'] = dist
                    processed += 1

            scaffold['generation_stage'] = 'PHRASES_GENERATED'

            # Save output
            output_path = self.output_dir / seed_file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            print(f"✅ ({processed}/{len(lego_ids)} LEGOs)")
            return True

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def process_seeds(self, seed_range: Tuple[int, int]):
        """Process all seeds in range"""

        print("\n" + "="*70)
        print("Phase 5: Intelligent Phrase Generator")
        print("Course: cmn_for_eng (Mandarin Chinese for English Speakers)")
        print(f"Seeds: S{seed_range[0]:04d} - S{seed_range[1]:04d}")
        print("="*70 + "\n")

        start, end = seed_range
        success_count = 0
        failed_seeds = []

        for seed_num in range(start, end + 1):
            seed_file = f"seed_s{seed_num:04d}.json"

            if not (self.scaffolds_dir / seed_file).exists():
                print(f"[SKIP] {seed_file} - not found")
                continue

            if self.process_scaffold(seed_file):
                success_count += 1
            else:
                failed_seeds.append(seed_file)

        print("\n" + "="*70)
        print(f"✅ Processing Complete")
        print(f"  Seeds processed: {success_count}")
        if failed_seeds:
            print(f"  Failed: {', '.join(failed_seeds)}")
        print(f"  Output directory: {self.output_dir}")
        print("="*70 + "\n")

def main():
    course_dir = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng"
    processor = Phase5Processor(course_dir)
    processor.process_seeds((331, 340))

if __name__ == '__main__':
    main()
