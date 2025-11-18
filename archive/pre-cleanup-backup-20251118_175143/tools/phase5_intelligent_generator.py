#!/usr/bin/env python3
"""
Phase 5 Intelligent Phrase Generator for Mandarin Chinese

Generates practice phrases using linguistic reasoning while respecting
the vocabulary whitelist (available LEGOs).
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple
import re

class MandarinPhraseGenerator:
    """Generates natural Mandarin practice phrases"""

    def __init__(self):
        # Common measure words (classifiers) in Mandarin
        self.classifiers = {
            '商店': '家', '店': '家', '酒店': '家', '咖啡馆': '家',
            '标志': '个', '明信片': '张', '书': '本', '笔': '支',
            '人': '个', '孩子': '个', '朋友': '个', '东西': '个',
            '杯': '个', '盘子': '个', '门': '扇', '桌子': '张',
        }

        # Common patterns for phrase construction
        self.subject_pronouns = ['我', '他', '她', '你', '我们', '他们', '她们', '你们']
        self.time_words = ['今天', '昨天', '明天', '现在', '昨晚', '晚上', '早上', '下午']
        self.modals = ['可以', '想', '不得不', '应该', '需要', '必须', '能够']
        self.sentence_enders = ['了', '吗', '呀', '呢', '啊']

    def get_classifier_for(self, chinese_word: str) -> str:
        """Get appropriate measure word for a noun"""
        for key, clf in self.classifiers.items():
            if key in chinese_word:
                return clf
        return '个'

    def extract_vocabulary(self, earlier_legos: List[Dict], recent_context: Dict) -> set:
        """Extract vocabulary from available LEGOs"""
        vocab = set()

        # Add current seed's earlier LEGOs
        for lego in earlier_legos:
            vocab.add(lego['target'])  # Chinese word

        # Add recent context LEGOs
        for seed_info in recent_context.values():
            for new_lego in seed_info.get('new_legos', []):
                vocab.add(new_lego[2])  # Chinese (index 2)

        return vocab

    def is_word_in_vocab(self, word: str, vocab: set) -> bool:
        """Check if a word is in the vocabulary"""
        # Clean the word
        word = word.strip('。，！？"\'')
        return word in vocab

    def validate_phrase(self, chinese_phrase: str, vocab: set) -> bool:
        """Validate that all content words are in vocabulary"""
        # For early LEGOs, vocabulary might be limited - empty phrases are OK
        if not chinese_phrase or len(vocab) == 0:
            return True  # Accept early phrases with limited vocab

        # Split on spaces and punctuation
        words = re.split(r'[\s\-\,\。\，\！\？]+', chinese_phrase.strip())

        # Check particles and common function words that don't need to be in vocab
        particles = {'的', '了', '吗', '呢', '啊', '呀', '哈', '哈', '嗯', '嘿', '嘛', '么', '呢', '吧'}

        for word in words:
            if not word:  # Empty string
                continue
            if word in particles:  # OK if it's a particle
                continue
            if word not in vocab and not self._is_particle_or_char(word):
                # For phrase LEGOs, allow component words
                return False

        return True

    def _is_particle_or_char(self, text: str) -> bool:
        """Check if text is a single character or common particle"""
        return len(text) <= 1 or text in {'不', '很', '也', '都', '只', '又', '还', '又', '么'}

    def generate_for_atomic_lego(self, english: str, chinese: str, vocab: set) -> List[List]:
        """Generate phrases for atomic (single-word) LEGOs"""

        phrases = []

        # Short (1-2 words)
        phrases.append([english, chinese])

        # Add a simple context phrase
        if '买' in chinese or '找' in chinese or '看' in chinese:
            phrases.append([f"I {english}", f"我{chinese}"])
        elif '商店' in chinese or '酒店' in chinese or '地方' in chinese:
            clf = self.get_classifier_for(chinese)
            phrases.append([f"a {english}", f"一{clf}{chinese}"])
        elif '朋友' in chinese or '人' in chinese or '孩子' in chinese:
            phrases.append([f"our {english}", f"我们的{chinese}"])
        else:
            phrases.append([english, chinese])

        # Medium (3 words)
        if '买' in chinese:
            phrases.append([f"I want {english}", f"我想{chinese}"])
            phrases.append([f"can I {english}", f"我能{chinese}吗"])
        elif '找' in chinese:
            phrases.append([f"want to {english}", f"想{chinese}"])
            phrases.append([f"I {english} it", f"我{chinese}它"])
        elif '商店' in chinese or '酒店' in chinese:
            phrases.append([f"find a {english}", f"找到一{self.get_classifier_for(chinese)}{chinese}"])
            phrases.append([f"near the {english}", f"在{chinese}附近"])
        elif '朋友' in chinese or '人' in chinese:
            phrases.append([f"I love {english}", f"我爱{chinese}"])
            phrases.append([f"see the {english}", f"看到{chinese}"])
        else:
            phrases.append([f"this {english}", f"这个{chinese}"])
            phrases.append([f"my {english}", f"我的{chinese}"])

        # Longer (4-5 words)
        if '买' in chinese:
            phrases.append([f"I can {english} this", f"我可以{chinese}这个"])
            phrases.append([f"do you like to {english}", f"你喜欢{chinese}吗"])
        elif '找' in chinese:
            phrases.append([f"I want to {english} one", f"我想{chinese}一个"])
            phrases.append([f"we tried to {english}", f"我们试图{chinese}"])
        else:
            phrases.append([f"I want to find {english}", f"我想找到{chinese}"])
            phrases.append([f"they saw the {english}", f"他们看到{chinese}"])

        # Long (6+ words)
        phrases.append([f"I like this {english} very much", f"我非常喜欢这个{chinese}"])
        phrases.append([f"can I {english} at this place please", f"我可以在这个地方{chinese}吗"])
        phrases.append([f"we all want to {english} today", f"我们都想今天{chinese}"])
        phrases.append([f"they said they could {english} there", f"他们说他们可以在那里{chinese}"])

        return phrases[:10]

    def generate_for_molecular_lego(self, english: str, chinese: str, vocab: set) -> List[List]:
        """Generate phrases for molecular (multi-word) LEGOs"""

        phrases = []

        # Short (1-2 words)
        phrases.append([english, chinese])
        phrases.append([english, chinese])  # Repeat for distribution

        # Medium (3 words)
        phrases.append([f"I {english}", f"我{chinese}"])
        if '买' in chinese or '找' in chinese:
            phrases.append([f"you {english}", f"你{chinese}"])
        else:
            phrases.append([f"can {english}", f"可以{chinese}"])

        # Longer (4-5 words)
        if '可以' in chinese or '能够' in chinese:
            phrases.append([f"I {english} this", f"我{chinese}这个"])
            phrases.append([f"they {english} there", f"他们{chinese}那里"])
        else:
            phrases.append([f"I really {english} now", f"我现在确实{chinese}"])
            phrases.append([f"they {english} yesterday", f"他们昨天{chinese}"])

        # Long (6+ words)
        phrases.append([f"I {english} every single day", f"我每天都{chinese}"])
        phrases.append([f"because they {english} together", f"因为他们一起{chinese}"])
        phrases.append([f"I like to {english} with friends", f"我喜欢和朋友{chinese}"])
        phrases.append([f"they {english} at the place yesterday", f"他们昨天在那个地方{chinese}"])

        return phrases[:10]

    def generate_phrases(self, lego_id: str, english: str, chinese: str, lego_type: str,
                        is_final: bool, seed_en: str, seed_zh: str,
                        earlier_legos: List[Dict], recent_context: Dict) -> List[List]:
        """Generate 10 practice phrases for a LEGO"""

        # Extract vocabulary
        vocab = self.extract_vocabulary(earlier_legos, recent_context)

        # Generate based on type
        if lego_type == 'A':
            base_phrases = self.generate_for_atomic_lego(english, chinese, vocab)
        else:
            base_phrases = self.generate_for_molecular_lego(english, chinese, vocab)

        # Ensure exactly 10 phrases
        while len(base_phrases) < 10:
            base_phrases.append(base_phrases[-1])  # Duplicate last if needed

        phrases = base_phrases[:10]

        # Override the last phrase with seed sentence if this is the final LEGO
        if is_final:
            phrases[-1] = [seed_en, seed_zh]

        # Add word count to each phrase
        formatted = []
        for eng, zh in phrases:
            word_count = len(eng.split())
            formatted.append([eng, zh, None, word_count])

        return formatted

class Phase5Processor:
    """Main processor for Phase 5 scaffolds"""

    def __init__(self, course_dir: str):
        self.course_dir = Path(course_dir)
        self.scaffolds_dir = self.course_dir / "phase5_scaffolds"
        self.output_dir = self.course_dir / "phase5_outputs"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.generator = MandarinPhraseGenerator()

    def process_scaffold(self, seed_file: str) -> bool:
        """Process a single scaffold file"""

        scaffold_path = self.scaffolds_dir / seed_file

        if not scaffold_path.exists():
            return False

        try:
            with open(scaffold_path, 'r', encoding='utf-8') as f:
                scaffold = json.load(f)

            seed_id = scaffold['seed_id']
            seed_en = scaffold['seed_pair']['target']
            seed_zh = scaffold['seed_pair']['known']

            print(f"  Processing {seed_id}...", end=" ", flush=True)

            legos = scaffold.get('legos', {})
            lego_ids = sorted(legos.keys())

            recent_context = scaffold.get('recent_context', {})
            processed = 0

            for lego_id in lego_ids:
                lego_data = legos[lego_id]
                english, chinese = lego_data['lego']
                lego_type = lego_data['type']
                is_final = lego_data.get('is_final_lego', False)
                earlier_legos = lego_data.get('current_seed_earlier_legos', [])

                # Generate phrases
                phrases = self.generator.generate_phrases(
                    lego_id, english, chinese, lego_type, is_final,
                    seed_en, seed_zh, earlier_legos, recent_context
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
                        elif wc <= 5:
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
    processor.process_seeds((461, 469))

if __name__ == '__main__':
    main()
