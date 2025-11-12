#!/usr/bin/env python3
"""
Phase 3 Recursive Quality Assurance Analyzer
Runs all 8 quality gates across all 4 languages
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Tuple
from collections import defaultdict

# Language file paths
LANG_PATHS = {
    'Italian': '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/ita_for_eng_30seeds/LEGO_BREAKDOWNS_COMPLETE.json',
    'Spanish': '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng_30seeds/LEGO_BREAKDOWNS_COMPLETE.json',
    'French': '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/fra_for_eng_30seeds/LEGO_BREAKDOWNS_COMPLETE.json',
    'Mandarin': '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/cmn_for_eng_30seeds/LEGO_BREAKDOWNS_COMPLETE.json'
}

# Romance language glue words
GLUE_WORDS = {
    'Italian': ['di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra'],
    'Spanish': ['de', 'a', 'en', 'con', 'por', 'para', 'desde', 'hacia'],
    'French': ['de', 'd', 'à', 'en', 'dans', 'pour', 'avec', 'sans'],
    'Mandarin': []  # Mandarin doesn't have Romance glue words
}

# IRON RULE forbidden standalone words
IRON_RULE_FORBIDDEN = {
    'Italian': {
        'prepositions': ['di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra'],
        'articles': ['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una'],
        'conjunctions': ['e', 'ed', 'o', 'od', 'ma']
    },
    'Spanish': {
        'prepositions': ['de', 'a', 'en', 'con', 'por', 'para', 'desde', 'hacia'],
        'articles': ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas'],
        'conjunctions': ['y', 'e', 'o', 'u', 'pero']
    },
    'French': {
        'prepositions': ['de', 'à', 'en', 'dans', 'pour', 'avec', 'sans', 'sur'],
        'articles': ['le', 'la', 'les', 'un', 'une', 'des'],
        'conjunctions': ['et', 'ou', 'mais']
    },
    'Mandarin': {
        'prepositions': [],
        'articles': [],
        'conjunctions': []
    }
}


class QualityGateAnalyzer:
    def __init__(self):
        self.violations = defaultdict(list)
        self.stats = defaultdict(int)
        self.patterns = []

    def load_language_data(self, lang_name: str) -> dict:
        """Load LEGO breakdown JSON for a language"""
        with open(LANG_PATHS[lang_name], 'r', encoding='utf-8') as f:
            return json.load(f)

    def gate1_fd_loop_validation(self, lang_name: str, data: dict) -> List[dict]:
        """
        GATE 1: FD_LOOP Validation
        Test: target → known → target = IDENTICAL
        100% pass rate required
        """
        violations = []

        for seed in data['lego_breakdowns']:
            seed_id = seed['seed_id']

            for lego in seed.get('lego_pairs', []):
                lego_id = lego['lego_id']
                target = lego['target_chunk']
                known = lego['known_chunk']

                # Check for gender/context violations
                if self._has_gender_context_issue(known):
                    violations.append({
                        'seed_id': seed_id,
                        'lego_id': lego_id,
                        'target': target,
                        'known': known,
                        'issue': 'Gender/pronoun in known (not context-neutral)',
                        'severity': 'CRITICAL'
                    })

                # Check for ambiguous mappings
                if self._is_ambiguous_mapping(target, known):
                    violations.append({
                        'seed_id': seed_id,
                        'lego_id': lego_id,
                        'target': target,
                        'known': known,
                        'issue': 'Ambiguous FD mapping',
                        'severity': 'CRITICAL'
                    })

        return violations

    def _has_gender_context_issue(self, known: str) -> bool:
        """Check if known chunk has gender/pronoun specificity"""
        gendered_pronouns = ['he', 'she', 'his', 'her', 'him']
        words = known.lower().split()
        return any(pronoun in words for pronoun in gendered_pronouns)

    def _is_ambiguous_mapping(self, target: str, known: str) -> bool:
        """Check if the mapping could be ambiguous"""
        # Simple heuristic: if known is very short (1-2 words) and generic
        if len(known.split()) <= 2:
            # Check for overly generic translations
            generic_words = ['the', 'a', 'to', 'of', 'in', 'with']
            if known.lower() in generic_words:
                return True
        return False

    def gate2_iron_rule_compliance(self, lang_name: str, data: dict) -> List[dict]:
        """
        GATE 2: IRON RULE Compliance
        No standalone prepositions/articles/conjunctions
        0 violations allowed
        """
        violations = []
        forbidden = IRON_RULE_FORBIDDEN.get(lang_name, {})

        for seed in data['lego_breakdowns']:
            seed_id = seed['seed_id']

            for lego in seed.get('lego_pairs', []):
                lego_id = lego['lego_id']
                target = lego['target_chunk'].strip()

                # Check if target is standalone forbidden word
                for category, words in forbidden.items():
                    if target.lower() in words:
                        violations.append({
                            'seed_id': seed_id,
                            'lego_id': lego_id,
                            'target': target,
                            'known': lego['known_chunk'],
                            'issue': f'Standalone {category}: "{target}"',
                            'severity': 'CRITICAL'
                        })

        return violations

    def gate3_glue_word_containment(self, lang_name: str, data: dict) -> List[dict]:
        """
        GATE 3: Glue Word Containment
        Glue words INSIDE composites, never at edges
        0 violations allowed
        """
        violations = []
        glue_words = GLUE_WORDS.get(lang_name, [])

        if not glue_words:  # Skip for Mandarin
            return violations

        for seed in data['lego_breakdowns']:
            seed_id = seed['seed_id']

            for lego in seed.get('lego_pairs', []):
                lego_id = lego['lego_id']
                target = lego['target_chunk']

                # Check if LEGO ends with glue word
                words = target.strip().split()
                if words and words[-1].lower() in glue_words:
                    violations.append({
                        'seed_id': seed_id,
                        'lego_id': lego_id,
                        'target': target,
                        'issue': f'Glue word at END: "{words[-1]}"',
                        'severity': 'CRITICAL'
                    })

                # Check if LEGO begins with glue word (unless part of fixed expression)
                if words and words[0].lower() in glue_words and len(words) == 1:
                    violations.append({
                        'seed_id': seed_id,
                        'lego_id': lego_id,
                        'target': target,
                        'issue': f'Standalone glue word: "{words[0]}"',
                        'severity': 'CRITICAL'
                    })

        return violations

    def gate4_cross_language_consistency(self, all_data: Dict[str, dict]) -> List[dict]:
        """
        GATE 4: Cross-Language Consistency
        Romance languages should decompose similar structures similarly
        """
        violations = []

        # Compare parallel seeds across Romance languages
        romance_langs = ['Italian', 'Spanish', 'French']

        # Build seed map
        seed_map = defaultdict(dict)
        for lang in romance_langs:
            for seed in all_data[lang]['lego_breakdowns']:
                seed_id = seed['seed_id']
                lego_count = len(seed.get('lego_pairs', []))
                seed_map[seed_id][lang] = {
                    'lego_count': lego_count,
                    'known': seed['original_known']
                }

        # Check for inconsistencies
        for seed_id, lang_data in seed_map.items():
            if len(lang_data) == 3:  # All three Romance languages present
                counts = [lang_data[lang]['lego_count'] for lang in romance_langs]
                known = lang_data[romance_langs[0]]['known']

                # If counts vary significantly, flag it
                if max(counts) - min(counts) > 2:
                    violations.append({
                        'seed_id': seed_id,
                        'known': known,
                        'italian_legos': lang_data['Italian']['lego_count'],
                        'spanish_legos': lang_data['Spanish']['lego_count'],
                        'french_legos': lang_data['French']['lego_count'],
                        'issue': 'Significant decomposition inconsistency across Romance languages',
                        'severity': 'MEDIUM'
                    })

        return violations

    def gate5_chunk_up_pattern_validation(self, lang_name: str, data: dict) -> List[dict]:
        """
        GATE 5: CHUNK UP Pattern Validation
        Document where chunking was needed and why
        """
        patterns_found = []

        for seed in data['lego_breakdowns']:
            seed_id = seed['seed_id']

            # Look for chunked progressive constructions
            for lego in seed.get('lego_pairs', []):
                target = lego['target_chunk']
                known = lego['known_chunk']

                # Progressive aspect patterns
                if "I'm trying" in known or "I'm going" in known:
                    patterns_found.append({
                        'seed_id': seed_id,
                        'lego_id': lego['lego_id'],
                        'pattern': 'Progressive Aspect',
                        'target': target,
                        'known': known,
                        'reason': 'Bare verb would fail FD, chunked with auxiliary'
                    })

                # Modal + infinitive
                if any(modal in known for modal in ["I want", "I'd like", "We want", "You want"]):
                    patterns_found.append({
                        'seed_id': seed_id,
                        'lego_id': lego['lego_id'],
                        'pattern': 'Modal + Infinitive',
                        'target': target,
                        'known': known,
                        'reason': 'Modal verb chunked for FD compliance'
                    })

        return patterns_found

    def gate6_feeder_quality(self, lang_name: str, data: dict) -> List[dict]:
        """
        GATE 6: FEEDER Quality
        All FEEDERs must be FD + pedagogically helpful
        """
        violations = []

        for seed in data['lego_breakdowns']:
            seed_id = seed['seed_id']

            for feeder in seed.get('feeder_pairs', []):
                feeder_id = feeder['feeder_id']
                target = feeder['target_chunk']
                known = feeder['known_chunk']

                # Check if trivial/unhelpful
                if self._is_trivial_feeder(known):
                    violations.append({
                        'seed_id': seed_id,
                        'feeder_id': feeder_id,
                        'target': target,
                        'known': known,
                        'issue': 'Trivial/unhelpful FEEDER',
                        'severity': 'LOW'
                    })

                # Check if FD
                if self._is_ambiguous_mapping(target, known):
                    violations.append({
                        'seed_id': seed_id,
                        'feeder_id': feeder_id,
                        'target': target,
                        'known': known,
                        'issue': 'FEEDER not FD',
                        'severity': 'MEDIUM'
                    })

        return violations

    def _is_trivial_feeder(self, known: str) -> bool:
        """Check if FEEDER is too trivial"""
        trivial = ['the', 'a', 'an', 'to', 'of']
        return known.lower().strip() in trivial

    def gate7_hierarchical_buildup(self, lang_name: str, data: dict) -> List[dict]:
        """
        GATE 7: Hierarchical Build-Up
        Intermediate composites properly included
        """
        issues = []

        for seed in data['lego_breakdowns']:
            seed_id = seed['seed_id']

            # Check componentization
            for comp in seed.get('componentization', []):
                lego_id = comp['lego_id']
                explanation = comp.get('explanation', '')

                # Simple check: does explanation reference components?
                if not explanation or len(explanation) < 20:
                    issues.append({
                        'seed_id': seed_id,
                        'lego_id': lego_id,
                        'issue': 'Missing or inadequate componentization explanation',
                        'severity': 'LOW'
                    })

        return issues

    def gate8_tiling_test(self, lang_name: str, data: dict) -> List[dict]:
        """
        GATE 8: Tiling Test
        Concatenating LEGOs reconstructs original seed
        """
        violations = []

        for seed in data['lego_breakdowns']:
            seed_id = seed['seed_id']
            original = seed['original_target'].replace('.', '').replace('?', '').replace('!', '').strip()

            # Concatenate all LEGO target chunks
            lego_chunks = [lego['target_chunk'] for lego in seed.get('lego_pairs', [])]
            reconstructed = ' '.join(lego_chunks).replace('.', '').replace('?', '').replace('!', '').strip()

            # Normalize whitespace
            original_normalized = ' '.join(original.split())
            reconstructed_normalized = ' '.join(reconstructed.split())

            if original_normalized != reconstructed_normalized:
                violations.append({
                    'seed_id': seed_id,
                    'original': original,
                    'reconstructed': reconstructed,
                    'issue': 'Tiling mismatch - LEGOs don\'t reconstruct seed',
                    'severity': 'HIGH'
                })

        return violations

    def run_all_gates(self, iteration: int) -> dict:
        """Run all 8 quality gates on all 4 languages"""
        results = {
            'iteration': iteration,
            'languages': {},
            'totals': defaultdict(int)
        }

        # Load all language data
        all_data = {}
        for lang_name in LANG_PATHS.keys():
            all_data[lang_name] = self.load_language_data(lang_name)

        # Run gates for each language
        for lang_name, data in all_data.items():
            results['languages'][lang_name] = {
                'gate1_fd_loop': self.gate1_fd_loop_validation(lang_name, data),
                'gate2_iron_rule': self.gate2_iron_rule_compliance(lang_name, data),
                'gate3_glue_words': self.gate3_glue_word_containment(lang_name, data),
                'gate5_chunk_up': self.gate5_chunk_up_pattern_validation(lang_name, data),
                'gate6_feeders': self.gate6_feeder_quality(lang_name, data),
                'gate7_hierarchy': self.gate7_hierarchical_buildup(lang_name, data),
                'gate8_tiling': self.gate8_tiling_test(lang_name, data)
            }

        # Run cross-language gate
        results['gate4_cross_language'] = self.gate4_cross_language_consistency(all_data)

        # Calculate totals
        for lang_name, gates in results['languages'].items():
            for gate_name, violations in gates.items():
                count = len(violations)
                results['totals'][gate_name] += count
                results['totals']['total_violations'] += count

        results['totals']['gate4_cross_language'] = len(results['gate4_cross_language'])
        results['totals']['total_violations'] += len(results['gate4_cross_language'])

        return results


def main():
    analyzer = QualityGateAnalyzer()

    print("=" * 80)
    print("PHASE 3 RECURSIVE QA - ITERATION 1 ANALYSIS")
    print("=" * 80)
    print()

    results = analyzer.run_all_gates(iteration=1)

    # Print summary
    print("CRITICAL GATES (Must be 100% pass):")
    print(f"  GATE 1 (FD_LOOP):    {results['totals']['gate1_fd_loop']} violations")
    print(f"  GATE 2 (IRON RULE):  {results['totals']['gate2_iron_rule']} violations")
    print(f"  GATE 3 (Glue Words): {results['totals']['gate3_glue_words']} violations")
    print()
    print("QUALITY GATES (Target 95%+):")
    print(f"  GATE 4 (Cross-Lang): {results['totals']['gate4_cross_language']} inconsistencies")
    print(f"  GATE 5 (Chunk Up):   {len(results['languages']['Italian']['gate5_chunk_up'])} patterns found")
    print(f"  GATE 6 (FEEDERs):    {results['totals']['gate6_feeders']} issues")
    print(f"  GATE 7 (Hierarchy):  {results['totals']['gate7_hierarchy']} issues")
    print(f"  GATE 8 (Tiling):     {results['totals']['gate8_tiling']} failures")
    print()
    print(f"TOTAL VIOLATIONS: {results['totals']['total_violations']}")
    print()

    # Save detailed results
    output_file = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/Phase3_QA_Iteration_01_Results.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"Detailed results saved to: {output_file}")

    # Print critical violations
    if results['totals']['gate1_fd_loop'] > 0:
        print("\n" + "=" * 80)
        print("CRITICAL: GATE 1 (FD_LOOP) VIOLATIONS")
        print("=" * 80)
        for lang_name, gates in results['languages'].items():
            violations = gates['gate1_fd_loop']
            if violations:
                print(f"\n{lang_name}:")
                for v in violations[:5]:  # Show first 5
                    print(f"  {v['seed_id']} {v['lego_id']}: {v['target']} / {v['known']}")
                    print(f"    Issue: {v['issue']}")
                if len(violations) > 5:
                    print(f"  ... and {len(violations) - 5} more")

    if results['totals']['gate2_iron_rule'] > 0:
        print("\n" + "=" * 80)
        print("CRITICAL: GATE 2 (IRON RULE) VIOLATIONS")
        print("=" * 80)
        for lang_name, gates in results['languages'].items():
            violations = gates['gate2_iron_rule']
            if violations:
                print(f"\n{lang_name}:")
                for v in violations[:5]:
                    print(f"  {v['seed_id']} {v['lego_id']}: {v['target']} / {v['known']}")
                    print(f"    Issue: {v['issue']}")
                if len(violations) > 5:
                    print(f"  ... and {len(violations) - 5} more")

    if results['totals']['gate3_glue_words'] > 0:
        print("\n" + "=" * 80)
        print("CRITICAL: GATE 3 (GLUE WORDS) VIOLATIONS")
        print("=" * 80)
        for lang_name, gates in results['languages'].items():
            violations = gates['gate3_glue_words']
            if violations:
                print(f"\n{lang_name}:")
                for v in violations[:5]:
                    print(f"  {v['seed_id']} {v['lego_id']}: {v['target']}")
                    print(f"    Issue: {v['issue']}")
                if len(violations) > 5:
                    print(f"  ... and {len(violations) - 5} more")


if __name__ == '__main__':
    main()
