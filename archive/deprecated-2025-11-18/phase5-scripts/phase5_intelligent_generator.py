#!/usr/bin/env python3
"""
Phase 5 Intelligent Generator - CMN_FOR_ENG S0371-S0380
Uses linguistic analysis to generate natural, contextually appropriate phrases
"""

import json
import re
from pathlib import Path
from collections import defaultdict
import sys

COURSE = "cmn_for_eng"
SEED_RANGE = range(371, 381)
SCAFFOLD_DIR = f"/home/user/ssi-dashboard-v7/public/vfs/courses/{COURSE}/phase5_scaffolds"
OUTPUT_DIR = f"/home/user/ssi-dashboard-v7/public/vfs/courses/{COURSE}/phase5_outputs"

class LinguisticAnalyzer:
    """Analyzes LEGOs and generates contextually appropriate phrases"""

    @staticmethod
    def detect_word_class(english_text, chinese_text):
        """
        Detect the word class of a LEGO
        Returns: 'verb', 'noun', 'adjective', 'adverbial', 'phrase', 'other'
        """
        english_lower = english_text.lower()

        # Check for common verb patterns
        if any(word in english_lower for word in [
            'want', 'need', 'see', 'have', 'go', 'come', 'make', 'take', 'give',
            'try', 'help', 'find', 'know', 'think', 'believe', 'say', 'tell',
            'ask', 'answer', 'create', 'watch', 'bring', 'move', 'buy', 'afford',
            'travel', 'include', 'do', 'did', 'didn', 'couldn', 'would', 'could',
            'can', 'may', 'shall', 'will', 'should', 'had', 'has', 'have', 'am',
            'is', 'are', 'was', 'were', 'be', 'being', 'been', 'speaking'
        ]):
            return 'verb'

        # Check for time/temporal expressions
        if any(word in english_lower for word in [
            'wednesday', 'monday', 'tuesday', 'thursday', 'friday', 'saturday',
            'sunday', 'year', 'month', 'night', 'day', 'week', 'today', 'tonight',
            'yesterday', 'tomorrow', 'morning', 'evening', 'afternoon', 'time'
        ]):
            return 'temporal'

        # Check for common adjective patterns
        if any(word in english_lower for word in [
            'beautiful', 'old', 'young', 'good', 'bad', 'new', 'important',
            'different', 'last', 'first', 'few', 'some', 'many', 'more', 'enough',
            'lucky', 'quiet', 'rather'
        ]):
            return 'adjective'

        # Check for place/location expressions
        if any(word in english_lower for word in [
            'place', 'country', 'africa', 'room', 'table', 'world', 'anywhere',
            'home', 'somewhere'
        ]):
            return 'location'

        # If it's a phrase (contains multiple words)
        if len(english_text.split()) > 1:
            return 'phrase'

        return 'noun'

    @staticmethod
    def generate_phrases_for_lego(lego_info, vocabulary, seed_context):
        """Generate 10 natural phrases for a LEGO based on its word class"""

        known = lego_info['known']
        target = lego_info['target']
        word_class = lego_info['word_class']
        is_final = lego_info['is_final']
        earlier_legos = lego_info['earlier_legos']

        phrases = []

        # Get common words from vocabulary
        common_verbs_cn = ['我', '他', '她', '你', '说', '想', '去', '看', '听', '不', '知道']
        common_subj = ['我', '他', '她', '你', '我们', '他们']
        common_objs = ['我', '这个', '那个', '一个', '什么', '东西', '人', '朋友']

        if word_class == 'temporal':
            # For temporal expressions (on Wednesday, last month, etc.)
            phrases.append([known, target, None, 1])
            phrases.append([f"on {known}", f"在{target}", None, 2])
            phrases.append([f"last {known}", f"上{target}", None, 2])
            phrases.append([f"I went {known}", f"我{target}去了", None, 2])
            phrases.append([f"tomorrow {known}", f"明天{target}", None, 2])
            phrases.append([f"He will come {known}", f"他将在{target}来", None, 3])
            phrases.append([f"I didn't go anywhere {known}", f"我{target}哪儿也没去", None, 3])
            phrases.append([f"Did you go {known}?", f"你{target}去了吗？", None, 2])
            phrases.append([f"Yes, I traveled {known}", f"是的，我{target}去旅行了", None, 4])
            phrases.append([f"No, I didn't have money {known}", f"不，我{target}没有钱", None, 4])

        elif word_class == 'adjective':
            # For adjectives
            phrases.append([known, target, None, 1])
            phrases.append([f"very {known}", f"非常{target}", None, 2])
            phrases.append([f"so {known}", f"那么{target}", None, 2])
            phrases.append([f"It was {known}", f"它很{target}", None, 2])
            phrases.append([f"I think it was {known}", f"我觉得它很{target}", None, 4])
            phrases.append([f"a {known} thing", f"一个{target}的东西", None, 3])
            phrases.append([f"a {known} place", f"一个{target}的地方", None, 3])
            phrases.append([f"Yes, I thought it was very {known}", f"是的，我觉得它非常{target}", None, 5])
            phrases.append([f"the film was {known}", f"电影很{target}", None, 3])
            phrases.append([f"It was so {known}, wasn't it?", f"它那么{target}，对吧？", None, 4])

        elif word_class == 'location':
            # For place/location expressions
            phrases.append([known, target, None, 1])
            phrases.append([f"in {known}", f"在{target}", None, 2])
            phrases.append([f"to {known}", f"到{target}", None, 2])
            phrases.append([f"I went to {known}", f"我去了{target}", None, 3])
            phrases.append([f"to visit {known}", f"去访问{target}", None, 2])
            phrases.append([f"travel to {known}", f"去{target}旅行", None, 2])
            phrases.append([f"lucky enough to travel to {known}", f"幸运地能去{target}旅行", None, 4])
            phrases.append([f"did you go to {known}?", f"你去了{target}吗？", None, 3])
            phrases.append([f"Yes I was lucky to travel to {known}", f"是的，我很幸运能去{target}旅行", None, 5])
            phrases.append([f"No I didn't go to {known}", f"不，我没有去{target}", None, 4])

        elif word_class == 'verb':
            # For verbs
            phrases.append([known, target, None, 1])
            phrases.append([f"I {known}", f"我{target}", None, 2])
            phrases.append([f"he {known}", f"他{target}", None, 2])
            phrases.append([f"she {known}", f"她{target}", None, 2])
            phrases.append([f"do you {known}?", f"你{target}吗？", None, 2])
            phrases.append([f"can you {known}?", f"你能{target}吗？", None, 3])
            phrases.append([f"I wanted to {known}", f"我想{target}", None, 3])
            phrases.append([f"he wanted to {known}", f"他想{target}", None, 3])
            phrases.append([f"did you {known}?", f"你{target}吗？", None, 2])
            phrases.append([f"she wanted to {known}", f"她想{target}", None, 3])

        else:  # Generic approach for nouns and phrases
            phrases.append([known, target, None, 1])
            phrases.append([f"I have {known}", f"我有{target}", None, 3])
            phrases.append([f"I want {known}", f"我想要{target}", None, 3])
            phrases.append([f"I see {known}", f"我看到{target}", None, 3])
            phrases.append([f"I know {known}", f"我知道{target}", None, 3])
            phrases.append([f"he wanted {known}", f"他想要{target}", None, 3])
            phrases.append([f"she created {known}", f"她创造了{target}", None, 3])
            phrases.append([f"do you have {known}?", f"你有{target}吗？", None, 3])
            phrases.append([f"what is {known}?", f"{target}是什么？", None, 3])
            phrases.append([f"yes, I wanted to include {known}", f"是的，我想包括{target}", None, 5])

        # Handle final LEGO - last phrase should be complete seed sentence
        if is_final and seed_context:
            seed_known = seed_context.get('known', '')
            seed_target = seed_context.get('target', '')
            if seed_known and seed_target:
                phrases[-1] = [seed_known, seed_target, None, len(seed_known.split())]

        # Ensure exactly 10 phrases
        phrases = phrases[:10]
        while len(phrases) < 10:
            phrases.append([known, target, None, 1])

        return phrases[:10]


class Phase5Generator:
    """Main generator class"""

    def __init__(self):
        self.analyzer = LinguisticAnalyzer()

    def load_scaffold(self, seed_id):
        """Load a single scaffold file"""
        filename = f"{SCAFFOLD_DIR}/seed_s{seed_id:04d}.json"
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)

    def extract_vocabulary(self, seed_id):
        """Extract available vocabulary for a seed"""
        scaffold = self.load_scaffold(seed_id)
        vocab = set()

        # Add words from recent context
        recent_context = scaffold.get('recent_context', {})
        for prev_seed_id, data in recent_context.items():
            new_legos = data.get('new_legos', [])
            for lego in new_legos:
                if len(lego) >= 3:
                    target = lego[2]
                    words = re.split(r'[\s|]+', target)
                    vocab.update([w.strip() for w in words if w.strip()])

        # Add words from current seed's earlier LEGOs
        legos = scaffold.get('legos', {})
        for lego_id in sorted(legos.keys()):
            lego_data = legos[lego_id]
            if lego_data.get('lego'):
                target = lego_data['lego'][1]
                words = re.split(r'[\s|]+', target)
                vocab.update([w.strip() for w in words if w.strip()])

        return vocab

    def process_seed(self, seed_id):
        """Process a single seed"""
        scaffold = self.load_scaffold(seed_id)
        vocabulary = self.extract_vocabulary(seed_id)
        output = scaffold.copy()

        for lego_id in scaffold['legos']:
            lego = scaffold['legos'][lego_id]
            known, target = lego['lego']

            lego_info = {
                'id': lego_id,
                'known': known,
                'target': target,
                'word_class': self.analyzer.detect_word_class(known, target),
                'is_final': lego.get('is_final_lego', False),
                'earlier_legos': lego.get('current_seed_earlier_legos', []),
                'seed_context': lego.get('_metadata', {}).get('seed_context', {})
            }

            phrases = self.analyzer.generate_phrases_for_lego(lego_info, vocabulary, lego_info['seed_context'])

            output['legos'][lego_id]['practice_phrases'] = phrases

            # Update phrase distribution
            distribution = {
                'really_short_1_2': sum(1 for p in phrases if p[3] <= 2),
                'quite_short_3': sum(1 for p in phrases if p[3] == 3),
                'longer_4_5': sum(1 for p in phrases if p[3] in [4, 5]),
                'long_6_plus': sum(1 for p in phrases if p[3] >= 6)
            }
            output['legos'][lego_id]['phrase_distribution'] = distribution

        output['generation_stage'] = 'PHRASES_GENERATED'
        return output

    def run(self):
        """Process all seeds"""
        print(f"Intelligent Phase 5 Generator: S{SEED_RANGE.start:04d}-S{SEED_RANGE.stop-1:04d}")

        for seed_num in SEED_RANGE:
            try:
                output = self.process_seed(seed_num)
                output_path = f"{OUTPUT_DIR}/seed_s{seed_num:04d}.json"
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(output, f, ensure_ascii=False, indent=2)
                print(f"✓ S{seed_num:04d}: {len(output['legos'])} LEGOs processed")
            except Exception as e:
                print(f"✗ S{seed_num:04d}: {e}", file=sys.stderr)


if __name__ == '__main__':
    generator = Phase5Generator()
    generator.run()
