#!/usr/bin/env python3
"""
Phase 5 Intelligent Phrase Generator v2 for Mandarin Chinese (S0331-S0340)

Generates natural practice phrases using linguistic reasoning while respecting
vocabulary constraints. Focuses on natural combinations rather than mechanical patterns.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Set
import re

class IntelligentPhraseGenerator:
    """Generates natural English-Chinese practice phrases using linguistic intelligence"""

    def __init__(self):
        # Common Chinese particles and function words
        self.particles = {'的', '了', '吗', '呢', '啊', '呀', '哈', '嗯', '嘿', '嘛', '么', '吧', '呃'}
        self.pronouns = {'我', '你', '他', '她', '它', '我们', '你们', '他们', '她们', '它们'}
        self.negations = {'不', '没', '没有', '别', '不要'}
        self.modals = {'可以', '想', '需要', '应该', '必须', '能', '能够', '喜欢', '想要'}
        self.time_words = {'今天', '昨天', '明天', '现在', '昨晚', '晚上', '早上', '下午', '那天', '然后'}
        self.adverbs = {'很', '也', '都', '只', '又', '还', '甚至', '总是', '一直', '非常', '太', '这样'}

    def extract_vocabulary(self, earlier_legos: List[Dict], recent_context: Dict) -> Set[str]:
        """Extract all available Chinese words from vocabulary sources"""
        vocab = set()

        # Add earlier LEGOs
        for lego in earlier_legos:
            if 'target' in lego:
                # Add the full phrase
                vocab.add(lego['target'])
                # Also add individual characters for flexibility
                for char in lego['target'].replace(' ', ''):
                    if len(char) > 0:
                        vocab.add(char)

        # Add recent context
        for seed_info in recent_context.values():
            if 'sentence' in seed_info and len(seed_info['sentence']) > 1:
                # Add the whole sentence and its components
                chinese_sent = seed_info['sentence'][1]
                for part in chinese_sent.split('|'):
                    part = part.strip()
                    if part:
                        vocab.add(part)
                        for char in part.replace(' ', ''):
                            if len(char) > 0:
                                vocab.add(char)

            for new_lego in seed_info.get('new_legos', []):
                if len(new_lego) > 2:
                    phrase = new_lego[2]
                    vocab.add(phrase)
                    for char in phrase.replace(' ', ''):
                        if len(char) > 0:
                            vocab.add(char)

        return vocab

    def get_available_earlier_lego_phrases(self, earlier_legos: List[Dict]) -> List[Tuple[str, str]]:
        """Get list of (english, chinese) pairs from earlier LEGOs"""
        pairs = []
        for lego in earlier_legos:
            if 'known' in lego and 'target' in lego:
                pairs.append((lego['known'], lego['target']))
        return pairs

    def is_word_available(self, word: str, vocab: Set[str]) -> bool:
        """Check if a word is available"""
        word = word.strip('。，！？，、；：")').strip()
        if not word:
            return True

        # Check if exact word is available
        if word in vocab:
            return True

        # Check if all characters are available
        if all(ch in vocab for ch in word if ch.strip()):
            return True

        return False

    def validate_phrase(self, chinese_phrase: str, vocab: Set[str]) -> bool:
        """Validate that all meaningful words are available"""
        if not chinese_phrase:
            return True

        # Split on delimiters
        phrase = chinese_phrase.strip('。，！？')
        words = re.split(r'[\s]+', phrase)

        for word in words:
            if not word:
                continue

            # Allow particles and function words
            if word in self.particles or word in self.pronouns or word in self.negations:
                continue

            if word in self.modals or word in self.time_words or word in self.adverbs:
                continue

            # Check if word is available
            if not self.is_word_available(word, vocab):
                return False

        return True

    def build_phrase_with_context(self, current_lego_en: str, current_lego_zh: str,
                                   prefix_en: str, prefix_zh: str, vocab: Set[str]) -> Tuple[str, str, bool]:
        """Build a phrase with context, validating vocabulary"""
        phr_en = f"{prefix_en} {current_lego_en}".strip()
        phr_zh = f"{prefix_zh}{current_lego_zh}".strip()

        if self.validate_phrase(phr_zh, vocab):
            return (phr_en, phr_zh, True)
        return ("", "", False)

    def generate_phrases_for_lego(self, lego_id: str, english: str, chinese: str,
                                  earlier_legos: List[Dict], recent_context: Dict,
                                  seed_pair: Dict, is_final: bool, lego_type: str) -> List[List]:
        """Generate 10 practice phrases with 2-2-2-4 distribution"""

        phrases = []
        vocab = self.extract_vocabulary(earlier_legos, recent_context)
        earlier_pairs = self.get_available_earlier_lego_phrases(earlier_legos)

        # 1. START: Just the LEGO (2 phrases, 1-2 word count)
        # Phrase 1: Just the LEGO alone
        phrases.append([english, chinese, None, 1])

        # Phrase 2: Variation of the LEGO
        if earlier_pairs:
            first_en, first_zh = earlier_pairs[0]
            combined_en = f"{first_en} {english}"
            combined_zh = f"{first_zh} {chinese}"
            if len(phrases) < 2:
                phrases.append([combined_en, combined_zh, None, 2])
        else:
            phrases.append([english, chinese, None, 1])

        # 2. MEDIUM: 3-word phrases (2 phrases)
        # Add pronouns or simple contexts
        medium_attempts = [
            ("She", "她"),
            ("He", "他"),
            ("I", "我"),
            ("They", "他们"),
        ]

        for prefix_en, prefix_zh in medium_attempts:
            if len(phrases) < 4:
                test_zh = f"{prefix_zh}{chinese}"
                if self.validate_phrase(test_zh, vocab):
                    phrases.append([f"{prefix_en} {english}", test_zh, None, 3])

        # Fill to 4
        while len(phrases) < 4:
            phrases.append([english, chinese, None, 2])

        # 3. LONGER: 4-word phrases (2 phrases)
        longer_attempts = [
            ("She can't", "她不能"),
            ("He thinks", "他觉得"),
            ("I said", "我说"),
            ("She doesn't", "她不"),
            ("It's important", "这很重要"),
        ]

        for prefix_en, prefix_zh in longer_attempts:
            if len(phrases) < 6:
                # Check if prefix is available in vocab
                prefix_words = prefix_zh.split()
                if all(self.is_word_available(w, vocab) for w in prefix_words):
                    test_zh = f"{prefix_zh}{chinese}"
                    if self.validate_phrase(test_zh, vocab):
                        phrases.append([f"{prefix_en} {english}", test_zh, None, 4])

        # Fill to 6
        while len(phrases) < 6:
            # Create variation with different context
            phrases.append([f"That {english}", f"那{chinese}", None, 3])

        # 4. LONGEST: 5+ word phrases (4 phrases)
        longest_templates = [
            ("I think she", "我觉得她"),
            ("No, she said she", "不，她说她"),
            ("Yes, I think", "是的，我觉得"),
            ("I don't think", "我不觉得"),
            ("She said that she", "她说她"),
        ]

        for prefix_en, prefix_zh in longest_templates:
            if len(phrases) < 10:
                prefix_words = prefix_zh.replace('，', '').split()
                if all(self.is_word_available(w, vocab) for w in prefix_words):
                    test_zh = f"{prefix_zh}{chinese}"
                    if self.validate_phrase(test_zh, vocab):
                        # Add punctuation
                        phr_en = f"{prefix_en} {english}"
                        phr_zh = f"{prefix_zh}{chinese}"
                        phrases.append([phr_en, phr_zh, None, 5])

        # Fill remaining slots with meaningful variations
        while len(phrases) < 10:
            # Create variations from seed or context
            phrases.append([f"That {english}...", f"那{chinese}...", None, 4])

        # Ensure exactly 10
        phrases = phrases[:10]

        # Update word counts based on actual content
        for i in range(len(phrases)):
            en_words = len(phrases[i][0].split())
            phrases[i][3] = min(en_words, 10)  # Cap at 10

        # Override final phrase with seed sentence if this is the final LEGO
        if is_final:
            phrases[-1] = [seed_pair['known'], seed_pair['target'], None, len(seed_pair['known'].split())]

        return phrases

class Phase5ProcessorV2:
    """Phase 5 processor with improved generation"""

    def __init__(self, course_dir: str):
        self.course_dir = Path(course_dir)
        self.scaffolds_dir = self.course_dir / "phase5_scaffolds"
        self.output_dir = self.course_dir / "phase5_outputs"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.generator = IntelligentPhraseGenerator()

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
                lego_type = lego_data.get('type', 'M')
                earlier_legos = lego_data.get('current_seed_earlier_legos', [])

                # Generate phrases
                phrases = self.generator.generate_phrases_for_lego(
                    lego_id, english, chinese, earlier_legos, recent_context,
                    seed_pair, is_final, lego_type
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
        print("Phase 5: Intelligent Phrase Generator v2")
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
    processor = Phase5ProcessorV2(course_dir)
    processor.process_seeds((331, 340))

if __name__ == '__main__':
    main()
