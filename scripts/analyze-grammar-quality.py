#!/usr/bin/env python3
"""
Grammar Quality Analysis for SSi Courses
Analyzes grammar correctness across all courses with phrase data.
"""

import os
import json
import re
from typing import Dict, List, Tuple, Any
from collections import defaultdict
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise Exception("Missing Supabase credentials in .env file")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Course configurations
COURSES = {
    'eng_for_ara': {'name': 'English for Arabic speakers', 'known': 'ara', 'target': 'eng', 'phrases': 10818},
    'deu_for_eng': {'name': 'German for English speakers', 'known': 'eng', 'target': 'deu', 'phrases': 9279},
    'ara_for_eng': {'name': 'Arabic for English speakers', 'known': 'eng', 'target': 'ara', 'phrases': 9058},
    'eng_for_deu': {'name': 'English for German speakers', 'known': 'deu', 'target': 'eng', 'phrases': 8820},
    'bre_for_fra': {'name': 'Breton for French speakers', 'known': 'fra', 'target': 'bre', 'phrases': 8591},
    'cym_s_for_eng': {'name': 'South Welsh for English speakers', 'known': 'eng', 'target': 'cym_s', 'phrases': 6021},
    'cym_n_for_eng': {'name': 'North Welsh for English speakers', 'known': 'eng', 'target': 'cym_n', 'phrases': 5797},
    'eng_for_fra': {'name': 'English for French speakers', 'known': 'fra', 'target': 'eng', 'phrases': 1143}
}

# Language-specific grammar rules and patterns
class GrammarChecker:
    """Language-aware grammar checker"""

    def __init__(self, lang_code: str):
        self.lang_code = lang_code

    def check_english(self, text: str) -> List[Dict[str, str]]:
        """Check English grammar"""
        errors = []

        # Common English grammar issues
        # Double spaces
        if '  ' in text:
            errors.append({
                'type': 'spacing',
                'description': 'Double spaces found',
                'text': text
            })

        # Missing space after punctuation
        if re.search(r'[,;:][A-Za-z]', text):
            errors.append({
                'type': 'punctuation_spacing',
                'description': 'Missing space after punctuation',
                'text': text
            })

        # Lowercase "I" (standalone)
        if re.search(r'\bi\b', text):
            errors.append({
                'type': 'capitalization',
                'description': 'Lowercase "I" pronoun',
                'text': text
            })

        # Article errors (very basic checks)
        # a + vowel sound (common mistakes)
        if re.search(r'\ba [aeiou]', text.lower()):
            # Basic check - could be correct for some words like "a university"
            pass  # Too many false positives

        # Missing article before singular countable noun (basic pattern)
        words = text.lower().split()
        for i, word in enumerate(words):
            # Check for verb + singular noun without article
            if i > 0 and words[i-1] in ['want', 'have', 'need', 'like', 'see']:
                if word in ['dog', 'cat', 'car', 'house', 'book', 'pen']:
                    if i == 0 or words[i-1] not in ['a', 'an', 'the', 'my', 'your']:
                        errors.append({
                            'type': 'article_missing',
                            'description': f'Possible missing article before "{word}"',
                            'text': text
                        })

        # Subject-verb agreement (basic)
        if re.search(r'\b(he|she|it) (am|are)\b', text.lower()):
            errors.append({
                'type': 'subject_verb_agreement',
                'description': 'Subject-verb agreement error',
                'text': text
            })

        if re.search(r'\bI (is)\b', text.lower()):
            errors.append({
                'type': 'subject_verb_agreement',
                'description': 'Subject-verb agreement error',
                'text': text
            })

        # Double negative
        if re.search(r"(don't|doesn't|didn't|won't|can't|couldn't|wouldn't|shouldn't).*(no|nothing|never|nobody|nowhere)", text.lower()):
            errors.append({
                'type': 'double_negative',
                'description': 'Possible double negative',
                'text': text
            })

        return errors

    def check_german(self, text: str) -> List[Dict[str, str]]:
        """Check German grammar"""
        errors = []

        # Double spaces
        if '  ' in text:
            errors.append({
                'type': 'spacing',
                'description': 'Double spaces found',
                'text': text
            })

        # Noun capitalization (all nouns should be capitalized)
        # This is complex - checking for common nouns only
        common_nouns = ['haus', 'frau', 'mann', 'kind', 'auto', 'buch', 'tisch', 'stuhl']
        words = text.split()
        for i, word in enumerate(words):
            if i > 0 and word.lower() in common_nouns and word[0].islower():
                errors.append({
                    'type': 'noun_capitalization',
                    'description': f'Noun "{word}" should be capitalized',
                    'text': text
                })

        return errors

    def check_arabic(self, text: str) -> List[Dict[str, str]]:
        """Check Arabic grammar"""
        errors = []

        # Double spaces
        if '  ' in text:
            errors.append({
                'type': 'spacing',
                'description': 'Double spaces found',
                'text': text
            })

        # Check for mixed direction issues (LTR characters in RTL text)
        has_arabic = bool(re.search(r'[\u0600-\u06FF]', text))
        has_latin = bool(re.search(r'[a-zA-Z]', text))

        if has_arabic and has_latin:
            # This might be intentional (names, technical terms)
            pass

        return errors

    def check_welsh(self, text: str) -> List[Dict[str, str]]:
        """Check Welsh grammar"""
        errors = []

        # Double spaces
        if '  ' in text:
            errors.append({
                'type': 'spacing',
                'description': 'Double spaces found',
                'text': text
            })

        # Initial mutations - very complex, skipping advanced checks

        return errors

    def check_french(self, text: str) -> List[Dict[str, str]]:
        """Check French grammar"""
        errors = []

        # Double spaces
        if '  ' in text:
            errors.append({
                'type': 'spacing',
                'description': 'Double spaces found',
                'text': text
            })

        # Missing apostrophe (le/la before vowel)
        if re.search(r'\b(le|la) [aeiouéèêàâ]', text.lower()):
            errors.append({
                'type': 'elision',
                'description': 'Missing elision (le/la before vowel)',
                'text': text
            })

        return errors

    def check_breton(self, text: str) -> List[Dict[str, str]]:
        """Check Breton grammar"""
        errors = []

        # Double spaces
        if '  ' in text:
            errors.append({
                'type': 'spacing',
                'description': 'Double spaces found',
                'text': text
            })

        return errors

    def check_grammar(self, text: str) -> List[Dict[str, str]]:
        """Main grammar checking method"""
        if not text or not text.strip():
            return [{'type': 'empty', 'description': 'Empty text', 'text': text}]

        # Route to appropriate checker
        if self.lang_code in ['eng', 'en']:
            return self.check_english(text)
        elif self.lang_code in ['deu', 'de']:
            return self.check_german(text)
        elif self.lang_code in ['ara', 'ar']:
            return self.check_arabic(text)
        elif self.lang_code in ['cym', 'cym_n', 'cym_s', 'cy']:
            return self.check_welsh(text)
        elif self.lang_code in ['fra', 'fr']:
            return self.check_french(text)
        elif self.lang_code in ['bre', 'br']:
            return self.check_breton(text)
        else:
            return []


def fetch_phrases(course_code: str, limit: int = 100) -> List[Dict]:
    """Fetch USE phrases from Supabase for a course"""
    print(f"Fetching phrases for {course_code}...")

    try:
        # Fetch USE phrases only
        response = supabase.table('course_practice_phrases') \
            .select('*') \
            .eq('course_code', course_code) \
            .eq('phrase_role', 'use') \
            .limit(limit) \
            .execute()

        return response.data
    except Exception as e:
        print(f"Error fetching phrases for {course_code}: {e}")
        return []


def analyze_course(course_code: str, course_info: Dict) -> Dict[str, Any]:
    """Analyze grammar quality for a single course"""
    print(f"\n{'='*80}")
    print(f"Analyzing: {course_info['name']} ({course_code})")
    print(f"{'='*80}")

    # Fetch sample phrases
    phrases = fetch_phrases(course_code, limit=100)

    if not phrases:
        print(f"No phrases found for {course_code}")
        return {
            'course_code': course_code,
            'course_name': course_info['name'],
            'error': 'No phrases found',
            'phrases_analyzed': 0
        }

    print(f"Analyzing {len(phrases)} USE phrases...")

    # Initialize checkers
    known_checker = GrammarChecker(course_info['known'])
    target_checker = GrammarChecker(course_info['target'])

    # Track errors
    known_errors = []
    target_errors = []
    error_patterns = defaultdict(int)

    # Analyze each phrase
    for phrase in phrases:
        known_text = phrase.get('known_text', '')
        target_text = phrase.get('target_text', '')

        # Check known_text
        known_issues = known_checker.check_grammar(known_text)
        if known_issues:
            known_errors.append({
                'phrase_id': phrase.get('id'),
                'seed_number': phrase.get('seed_number'),
                'lego_idx': phrase.get('lego_idx'),
                'known_text': known_text,
                'target_text': target_text,
                'errors': known_issues
            })

            for error in known_issues:
                error_patterns[f"known_{error['type']}"] += 1

        # Check target_text
        target_issues = target_checker.check_grammar(target_text)
        if target_issues:
            target_errors.append({
                'phrase_id': phrase.get('id'),
                'seed_number': phrase.get('seed_number'),
                'lego_idx': phrase.get('lego_idx'),
                'known_text': known_text,
                'target_text': target_text,
                'errors': target_issues
            })

            for error in target_issues:
                error_patterns[f"target_{error['type']}"] += 1

    # Calculate error rates
    total_analyzed = len(phrases)
    known_error_rate = (len(known_errors) / total_analyzed * 100) if total_analyzed > 0 else 0
    target_error_rate = (len(target_errors) / total_analyzed * 100) if total_analyzed > 0 else 0

    print(f"\nResults:")
    print(f"  Phrases analyzed: {total_analyzed}")
    print(f"  Known text errors: {len(known_errors)} ({known_error_rate:.1f}%)")
    print(f"  Target text errors: {len(target_errors)} ({target_error_rate:.1f}%)")

    return {
        'course_code': course_code,
        'course_name': course_info['name'],
        'known_language': course_info['known'],
        'target_language': course_info['target'],
        'total_phrases_in_course': course_info['phrases'],
        'phrases_analyzed': total_analyzed,
        'known_errors': {
            'count': len(known_errors),
            'rate_percent': round(known_error_rate, 2),
            'examples': known_errors[:5]  # First 5 examples
        },
        'target_errors': {
            'count': len(target_errors),
            'rate_percent': round(target_error_rate, 2),
            'examples': target_errors[:5]
        },
        'error_patterns': dict(error_patterns),
        'common_issues': [
            {'pattern': k, 'count': v}
            for k, v in sorted(error_patterns.items(), key=lambda x: x[1], reverse=True)
        ][:10]
    }


def generate_report(results: List[Dict]) -> Dict[str, Any]:
    """Generate comprehensive report"""

    # Overall statistics
    total_phrases_analyzed = sum(r.get('phrases_analyzed', 0) for r in results)
    total_known_errors = sum(r.get('known_errors', {}).get('count', 0) for r in results)
    total_target_errors = sum(r.get('target_errors', {}).get('count', 0) for r in results)

    overall_known_error_rate = (total_known_errors / total_phrases_analyzed * 100) if total_phrases_analyzed > 0 else 0
    overall_target_error_rate = (total_target_errors / total_phrases_analyzed * 100) if total_phrases_analyzed > 0 else 0

    # Aggregate error patterns
    all_patterns = defaultdict(int)
    for result in results:
        for pattern, count in result.get('error_patterns', {}).items():
            all_patterns[pattern] += count

    report = {
        'metadata': {
            'analysis_date': '2026-02-02',
            'courses_analyzed': len(results),
            'total_phrases_analyzed': total_phrases_analyzed,
            'methodology': 'Sampled 50-100 USE phrases per course, analyzed with language-specific grammar rules'
        },
        'overall_assessment': {
            'total_known_errors': total_known_errors,
            'total_target_errors': total_target_errors,
            'known_error_rate_percent': round(overall_known_error_rate, 2),
            'target_error_rate_percent': round(overall_target_error_rate, 2),
            'quality_grade': 'A' if overall_known_error_rate < 5 and overall_target_error_rate < 5 else
                           'B' if overall_known_error_rate < 10 and overall_target_error_rate < 10 else
                           'C' if overall_known_error_rate < 20 and overall_target_error_rate < 20 else 'D'
        },
        'error_patterns_across_courses': {
            'top_patterns': [
                {'pattern': k, 'count': v, 'percentage': round(v/total_phrases_analyzed*100, 2)}
                for k, v in sorted(all_patterns.items(), key=lambda x: x[1], reverse=True)
            ][:15]
        },
        'per_course_results': sorted(results,
                                     key=lambda x: x.get('known_errors', {}).get('count', 0) +
                                                  x.get('target_errors', {}).get('count', 0),
                                     reverse=True),
        'recommendations': []
    }

    # Generate recommendations
    if overall_known_error_rate > 10:
        report['recommendations'].append({
            'priority': 'high',
            'area': 'known_language_quality',
            'description': 'Known language error rate exceeds 10% - review translation quality',
            'action': 'Consider additional QA pass on known_text fields'
        })

    if overall_target_error_rate > 10:
        report['recommendations'].append({
            'priority': 'high',
            'area': 'target_language_quality',
            'description': 'Target language error rate exceeds 10% - review generation quality',
            'action': 'Review phrase generation prompts and validation rules'
        })

    # Check for specific patterns
    if all_patterns.get('known_spacing', 0) > 10 or all_patterns.get('target_spacing', 0) > 10:
        report['recommendations'].append({
            'priority': 'medium',
            'area': 'spacing_issues',
            'description': 'Significant spacing issues detected',
            'action': 'Add spacing normalization in data preprocessing'
        })

    if all_patterns.get('known_capitalization', 0) > 5:
        report['recommendations'].append({
            'priority': 'medium',
            'area': 'capitalization',
            'description': 'Capitalization errors detected in English phrases',
            'action': 'Review capitalization rules in phrase generation'
        })

    return report


def main():
    """Main analysis function"""
    print("SSi Grammar Quality Analysis")
    print("=" * 80)
    print(f"Analyzing {len(COURSES)} courses with phrase data")
    print()

    results = []

    for course_code, course_info in COURSES.items():
        try:
            result = analyze_course(course_code, course_info)
            results.append(result)
        except Exception as e:
            print(f"Error analyzing {course_code}: {e}")
            results.append({
                'course_code': course_code,
                'course_name': course_info['name'],
                'error': str(e),
                'phrases_analyzed': 0
            })

    # Generate report
    print(f"\n{'='*80}")
    print("Generating comprehensive report...")
    print(f"{'='*80}")

    report = generate_report(results)

    # Save report
    output_path = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/quality-reports/grammar-analysis.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Report saved to: {output_path}")

    # Print summary
    print(f"\n{'='*80}")
    print("SUMMARY")
    print(f"{'='*80}")
    print(f"Courses analyzed: {report['metadata']['courses_analyzed']}")
    print(f"Total phrases analyzed: {report['metadata']['total_phrases_analyzed']}")
    print(f"Overall known error rate: {report['overall_assessment']['known_error_rate_percent']}%")
    print(f"Overall target error rate: {report['overall_assessment']['target_error_rate_percent']}%")
    print(f"Quality grade: {report['overall_assessment']['quality_grade']}")
    print(f"\nTop error patterns:")
    for i, pattern in enumerate(report['error_patterns_across_courses']['top_patterns'][:5], 1):
        print(f"  {i}. {pattern['pattern']}: {pattern['count']} occurrences ({pattern['percentage']}%)")

    if report['recommendations']:
        print(f"\nRecommendations: {len(report['recommendations'])}")
        for rec in report['recommendations']:
            print(f"  [{rec['priority'].upper()}] {rec['area']}: {rec['description']}")

    print(f"\n{'='*80}")
    print("Analysis complete!")
    print(f"{'='*80}")


if __name__ == '__main__':
    main()
