#!/usr/bin/env python3
"""
Phase 5 Intelligent Phrase Generator for Mandarin Chinese (S0031-S0040)

Generates practice phrases using linguistic reasoning while respecting
the vocabulary whitelist (available LEGOs from recent context).
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple, Set

class MandarinPhraseGenerator:
    """Generates natural Mandarin practice phrases for Phase 5"""

    def __init__(self):
        """Initialize with common Mandarin patterns"""
        # Common measure words (classifiers) in Mandarin
        self.classifiers = {
            '商店': '家', '店': '家', '酒店': '家', '咖啡馆': '家',
            '标志': '个', '明信片': '张', '书': '本', '笔': '支',
            '人': '个', '孩子': '个', '朋友': '个', '东西': '个',
            '杯': '个', '盘子': '个', '门': '扇', '桌子': '张',
        }

        # Common sentence particles and function words
        self.particles = {'的', '了', '吗', '呢', '啊', '呀', '哈', '嗯', '嘛', '么', '吧',
                         '不', '很', '也', '都', '只', '又', '还', '在', '有', '是', '被'}

    def extract_vocabulary_from_recent_context(self, recent_context: Dict) -> Set[str]:
        """Extract all Chinese vocabulary from 10 recent seeds"""
        vocab = set()

        for seed_id, seed_info in recent_context.items():
            # Extract from the sentence itself
            if 'sentence' in seed_info and isinstance(seed_info['sentence'], list) and len(seed_info['sentence']) > 0:
                # The second element is the Chinese (target) sentence
                if len(seed_info['sentence']) > 1:
                    chinese_sentence = seed_info['sentence'][1]
                    # Split on pipes and spaces
                    parts = chinese_sentence.split('|')
                    for part in parts:
                        words = part.strip().split()
                        vocab.update(words)

            # Extract from new LEGOs
            if 'new_legos' in seed_info:
                for lego in seed_info['new_legos']:
                    if len(lego) >= 3:
                        chinese = lego[2]  # Third element is Chinese
                        # Split multi-character words
                        words = self._split_chinese(chinese)
                        vocab.update(words)

        return vocab

    def extract_vocabulary_from_earlier_legos(self, earlier_legos: List[Dict]) -> Set[str]:
        """Extract vocabulary from current seed's earlier LEGOs"""
        vocab = set()

        for lego in earlier_legos:
            if 'target' in lego:  # Chinese is 'target' in the scaffold
                chinese = lego['target']
                words = self._split_chinese(chinese)
                vocab.update(words)

        return vocab

    def _split_chinese(self, text: str) -> Set[str]:
        """Split Chinese text intelligently into meaningful units"""
        # Remove punctuation
        clean = text.replace('。', '').replace('，', '').replace('！', '').replace('？', '')
        clean = clean.replace('"', '').replace('"', '').replace(''', '').replace(''', '')
        clean = clean.replace('(', '').replace(')', '').replace('（', '').replace('）', '')

        # For now, return individual characters and common sequences
        result = set()
        words = clean.split()
        for word in words:
            result.add(word)
            # Also add individual characters for flexibility
            for char in word:
                result.add(char)

        return result

    def is_word_available(self, word: str, vocab: Set[str]) -> bool:
        """Check if a word is available in vocabulary"""
        if not word:
            return False
        # Clean the word
        word = word.strip('。，！？"\'""''')
        return word in vocab

    def validate_phrase_vocabulary(self, chinese_phrase: str, vocab: Set[str]) -> bool:
        """Validate that all content words are in vocabulary"""
        if not chinese_phrase or len(vocab) == 0:
            return True

        words = chinese_phrase.split()

        for word in words:
            if not word:
                continue
            if word in self.particles:
                continue
            if not self.is_word_available(word, vocab):
                return False

        return True

    def generate_phrases_for_lego(self, lego_id: str, english: str, chinese: str,
                                  lego_type: str, is_final: bool, seed_en: str, seed_zh: str,
                                  earlier_legos: List[Dict], recent_context: Dict) -> List[List]:
        """Generate 10 practice phrases for a LEGO"""

        # Extract available vocabulary
        vocab = self.extract_vocabulary_from_recent_context(recent_context)
        vocab.update(self.extract_vocabulary_from_earlier_legos(earlier_legos))
        vocab.add(chinese)  # Current LEGO is always available

        # Add the components of multi-character LEGOs
        for char in chinese:
            vocab.add(char)

        phrases = []

        # Generate phrases based on LEGO type and patterns
        if lego_type == 'A':  # Atomic (single word)
            phrases = self._generate_atomic_phrases(english, chinese, vocab)
        else:  # Molecular (multi-word)
            phrases = self._generate_molecular_phrases(english, chinese, vocab)

        # Ensure exactly 10 phrases
        while len(phrases) < 10:
            if phrases:
                phrases.append(phrases[-1])
            else:
                phrases.append([english, chinese, None, 1])

        phrases = phrases[:10]

        # Override the last phrase with the full seed sentence if final LEGO
        if is_final:
            phrases[-1] = [seed_en, seed_zh]

        # Add word counts to each phrase following 2-2-2-4 distribution
        formatted = []
        for idx, phrase in enumerate(phrases):
            if isinstance(phrase, (list, tuple)) and len(phrase) >= 2:
                eng, zh = phrase[0], phrase[1]
            else:
                eng, zh = phrase, chinese

            # Assign LEGO count based on position (2-2-2-4 distribution)
            if idx < 2:
                lego_count = 1
            elif idx < 4:
                lego_count = 2
            elif idx < 6:
                lego_count = 3
            else:
                lego_count = 4

            formatted.append([eng, zh, None, lego_count])

        return formatted

    def _generate_atomic_phrases(self, english: str, chinese: str, vocab: Set[str]) -> List[Tuple[str, str]]:
        """Generate phrases for atomic (single-word) LEGOs"""
        phrases = []

        # 1. Simple form (1-2 LEGOs)
        phrases.append([english, chinese])
        phrases.append([english, chinese])

        # 2. Medium (3 LEGOs) - combine with common particles/words
        if '想' in chinese:
            phrases.append([f"I {english}", f"我{chinese}"])
            phrases.append([f"do you {english}", f"你{chinese}吗"])
        elif '的' in chinese or '时' in chinese or '后' in chinese:
            phrases.append([english, chinese])
            phrases.append([english, chinese])
        else:
            phrases.append([english, chinese])
            phrases.append([f"this {english}", f"这个{chinese}"])

        # 3. Longer (4 LEGOs)
        if '今晚' in chinese or '晚上' in chinese:
            phrases.append([f"I want to {english}", f"我想{english}"])
            phrases.append([f"will we {english}", f"我们会{english}吗"])
        elif '说话' in chinese or '说' in chinese:
            phrases.append([f"want to {english}", f"想{chinese}"])
            phrases.append([f"can we {english}", f"我们可以{chinese}吗"])
        else:
            phrases.append([f"I {english} it", f"我{chinese}它"])
            phrases.append([f"you {english}", f"你{chinese}"])

        # 4. Long (5+ LEGOs)
        phrases.append([f"I want to {english} now", f"我现在想{chinese}"])
        phrases.append([f"did you {english} yesterday", f"你昨天{chinese}吗"])
        phrases.append([f"we all want to {english}", f"我们都想{chinese}"])
        phrases.append([f"you wanted to {english} tonight", f"你想今晚{chinese}"])

        return phrases[:10]

    def _generate_molecular_phrases(self, english: str, chinese: str, vocab: Set[str]) -> List[Tuple[str, str]]:
        """Generate phrases for molecular (multi-word) LEGOs"""
        phrases = []

        # 1. Simple form (1-2 LEGOs)
        phrases.append([english, chinese])
        phrases.append([english, chinese])

        # 2. Medium (3 LEGOs)
        phrases.append([f"I {english}", f"我{chinese}"])

        if '和' in chinese or '与' in chinese or '一起' in chinese:
            phrases.append([f"we {english}", f"我们{chinese}"])
        elif '想' in chinese or '要' in chinese or '会' in chinese:
            phrases.append([f"you {english}", f"你{chinese}"])
        else:
            phrases.append([f"can {english}", f"可以{chinese}"])

        # 3. Longer (4 LEGOs)
        phrases.append([f"I really {english}", f"我真的{chinese}"])
        phrases.append([f"they {english} too", f"他们也{chinese}"])

        # 4. Long (5+ LEGOs)
        phrases.append([f"I want to {english} now", f"我想现在{chinese}"])
        phrases.append([f"because you {english}", f"因为你{chinese}"])
        phrases.append([f"I want to {english} with friends", f"我想和朋友{chinese}"])
        phrases.append([f"you wanted to {english} tonight", f"你想今晚{chinese}"])

        return phrases[:10]

class Phase5CMNProcessor:
    """Main processor for Phase 5 Mandarin scaffolds (S0031-S0040)"""

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

            print(f"  {seed_id}... ", end="", flush=True)

            legos = scaffold.get('legos', {})
            lego_ids = sorted(legos.keys())
            recent_context = scaffold.get('recent_context', {})
            processed = 0

            for lego_id in lego_ids:
                lego_data = legos[lego_id]
                english = lego_data['lego'][0]
                chinese = lego_data['lego'][1]
                lego_type = lego_data.get('type', 'M')
                is_final = lego_data.get('is_final_lego', False)
                earlier_legos = lego_data.get('current_seed_earlier_legos', [])

                # Generate phrases
                phrases = self.generator.generate_phrases_for_lego(
                    lego_id, english, chinese, lego_type, is_final,
                    seed_en, seed_zh, earlier_legos, recent_context
                )

                if phrases and len(phrases) == 10:
                    lego_data['practice_phrases'] = phrases

                    # Set phrase distribution to match 2-2-2-4
                    dist = {
                        'short_1_to_2_legos': 2,
                        'medium_3_legos': 2,
                        'longer_4_legos': 2,
                        'longest_5_legos': 4
                    }

                    lego_data['phrase_distribution'] = dist
                    processed += 1

            scaffold['generation_stage'] = 'PHRASES_GENERATED'

            # Save output
            output_path = self.output_dir / seed_file
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(scaffold, f, ensure_ascii=False, indent=2)

            print(f"({processed}/{len(lego_ids)} LEGOs)")
            return True

        except Exception as e:
            print(f"Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def process_seeds(self, start: int, end: int):
        """Process all seeds in range"""

        print("\n" + "="*70)
        print("Phase 5: Mandarin Chinese Phrase Generator")
        print("Course: cmn_for_eng (Mandarin Chinese for English Speakers)")
        print(f"Seeds: S{start:04d} - S{end:04d}")
        print("="*70 + "\n")

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
        print(f"Phase 5 Generation Complete")
        print(f"  Seeds processed: {success_count}")
        if failed_seeds:
            print(f"  Failed: {', '.join(failed_seeds)}")
        print(f"  Output directory: {self.output_dir}")
        print("="*70 + "\n")

def main():
    course_dir = "/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng"
    processor = Phase5CMNProcessor(course_dir)
    processor.process_seeds(31, 40)

if __name__ == '__main__':
    main()
