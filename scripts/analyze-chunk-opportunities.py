#!/usr/bin/env python3
"""
Chunk Opportunity Analysis for SSi Course Database

Analyzes existing courses to find natural multi-word expressions (collocations,
constructions, idioms) that should be taught as chunks rather than minimal units.

Approach:
1. Find frequent 2-3 word sequences in practice phrases
2. Identify missing intermediate constructions (A + A+B+C exists, but A+B missing)
3. Find language-specific collocations
4. Recommend overlap opportunities for existing LEGOs
"""

import os
import json
import re
from collections import defaultdict, Counter
from typing import List, Dict, Tuple, Set
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Initialize Supabase client
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

# Target courses to analyze
COURSES = [
    ('deu_for_eng', 'German'),
    ('ara_for_eng', 'Arabic'),
    ('zho_for_eng', 'Chinese'),
    ('cym_s_for_eng', 'Welsh'),
    ('spa_for_eng', 'Spanish'),
]

def normalize_text(text: str) -> str:
    """Normalize text for comparison (lowercase, strip)."""
    return text.lower().strip()

def extract_ngrams(text: str, n: int) -> List[str]:
    """Extract n-grams from text."""
    words = text.split()
    return [' '.join(words[i:i+n]) for i in range(len(words) - n + 1)]

def get_course_data(course_code: str) -> Dict:
    """Fetch LEGOs and practice phrases for a course."""
    print(f"Fetching data for {course_code}...")

    # Fetch LEGOs
    legos_response = supabase.table('course_legos').select('*').eq('course_code', course_code).execute()
    legos = legos_response.data

    # Fetch practice phrases
    phrases_response = supabase.table('course_practice_phrases').select('*').eq('course_code', course_code).execute()
    phrases = phrases_response.data

    print(f"  Found {len(legos)} LEGOs and {len(phrases)} practice phrases")

    return {
        'legos': legos,
        'phrases': phrases
    }

def analyze_frequent_patterns(phrases: List[Dict], min_frequency: int = 10) -> List[Dict]:
    """Find frequent 2-3 word sequences in practice phrases."""
    print("Analyzing frequent patterns...")

    # Extract n-grams from known texts
    bigrams = Counter()
    trigrams = Counter()

    for phrase in phrases:
        known = phrase.get('known_text', '')
        if not known:
            continue

        # Extract bigrams and trigrams
        for bigram in extract_ngrams(known, 2):
            bigrams[normalize_text(bigram)] += 1
        for trigram in extract_ngrams(known, 3):
            trigrams[normalize_text(trigram)] += 1

    # Filter by frequency
    frequent_patterns = []

    for pattern, count in bigrams.most_common(100):
        if count >= min_frequency:
            frequent_patterns.append({
                'pattern': pattern,
                'type': 'bigram',
                'frequency': count
            })

    for pattern, count in trigrams.most_common(50):
        if count >= min_frequency:
            frequent_patterns.append({
                'pattern': pattern,
                'type': 'trigram',
                'frequency': count
            })

    return sorted(frequent_patterns, key=lambda x: x['frequency'], reverse=True)

def analyze_missing_intermediates(legos: List[Dict], phrases: List[Dict]) -> List[Dict]:
    """Find missing intermediate constructions."""
    print("Analyzing missing intermediates...")

    # Build LEGO index by known text
    lego_index = defaultdict(list)
    for lego in legos:
        known = normalize_text(lego.get('known_text', ''))
        if known:
            lego_index[known].append(lego)

    # Find phrases that use multi-word expressions
    missing = []
    phrase_expressions = set()

    for phrase in phrases:
        known = phrase.get('known_text', '')
        if not known:
            continue

        # Extract multi-word sequences (2-4 words)
        for n in range(2, 5):
            for ngram in extract_ngrams(known, n):
                phrase_expressions.add(normalize_text(ngram))

    # Check which expressions are not LEGOs
    for expression in phrase_expressions:
        if expression not in lego_index:
            # Check if sub-components exist
            words = expression.split()
            has_start = words[0] in lego_index
            has_full = False

            # Check if longer versions exist
            for longer_expr in phrase_expressions:
                if expression in longer_expr and len(longer_expr.split()) > len(words):
                    has_full = True
                    break

            if has_start and has_full:
                missing.append({
                    'expression': expression,
                    'word_count': len(words),
                    'has_start_component': has_start,
                    'appears_in_longer': has_full
                })

    return missing[:50]  # Top 50

def analyze_collocations_by_language(course_code: str, language: str,
                                     legos: List[Dict], phrases: List[Dict]) -> List[Dict]:
    """Find language-specific collocations."""
    print(f"Analyzing {language} collocations...")

    collocations = []

    if language == 'Spanish':
        # Look for verb + infinitive patterns
        infinitive_patterns = Counter()
        for phrase in phrases:
            target = phrase.get('target_text', '')
            # Simple heuristic: look for common patterns
            if 'quiero' in target or 'puedo' in target or 'necesito' in target:
                infinitive_patterns[normalize_text(phrase.get('known_text', ''))] += 1

        for pattern, count in infinitive_patterns.most_common(20):
            if count >= 5:
                collocations.append({
                    'pattern': pattern,
                    'type': 'verb_infinitive',
                    'frequency': count,
                    'description': 'Spanish modal/auxiliary + infinitive'
                })

    elif language == 'German':
        # Look for separable verbs, modal constructions
        modal_patterns = Counter()
        for phrase in phrases:
            known = normalize_text(phrase.get('known_text', ''))
            if any(modal in known for modal in ['can', 'want to', 'have to', 'must']):
                modal_patterns[known] += 1

        for pattern, count in modal_patterns.most_common(20):
            if count >= 5:
                collocations.append({
                    'pattern': pattern,
                    'type': 'modal_construction',
                    'frequency': count,
                    'description': 'German modal verb + infinitive'
                })

    elif language == 'Chinese':
        # Look for verb + complement patterns
        complement_patterns = Counter()
        for phrase in phrases:
            target = phrase.get('target_text', '')
            # Look for common complements: 了, 着, 过, 到, 好
            if any(comp in target for comp in ['了', '着', '过', '到', '好']):
                complement_patterns[normalize_text(phrase.get('known_text', ''))] += 1

        for pattern, count in complement_patterns.most_common(20):
            if count >= 5:
                collocations.append({
                    'pattern': pattern,
                    'type': 'verb_complement',
                    'frequency': count,
                    'description': 'Chinese verb + complement/aspect marker'
                })

    elif language == 'Welsh':
        # Look for mutation-triggering constructions
        mutation_patterns = Counter()
        for phrase in phrases:
            known = normalize_text(phrase.get('known_text', ''))
            # Look for common mutation triggers: "I want", "to", "the", etc.
            if any(trigger in known for trigger in ['i want', 'to ', 'the ', 'my ', 'your ']):
                mutation_patterns[known] += 1

        for pattern, count in mutation_patterns.most_common(20):
            if count >= 5:
                collocations.append({
                    'pattern': pattern,
                    'type': 'mutation_trigger',
                    'frequency': count,
                    'description': 'Welsh mutation-triggering construction'
                })

    return collocations

def analyze_overlap_potential(legos: List[Dict], phrases: List[Dict]) -> List[Dict]:
    """Identify LEGOs that could benefit from overlapping variants."""
    print("Analyzing overlap potential...")

    overlap_candidates = []

    # Build LEGO index
    lego_index = {}
    for lego in legos:
        known = normalize_text(lego.get('known_text', ''))
        if known:
            lego_index[known] = lego

    # Look for LEGOs that appear in many phrases as building blocks
    lego_usage = defaultdict(int)
    lego_contexts = defaultdict(set)

    for phrase in phrases:
        known = normalize_text(phrase.get('known_text', ''))
        # Check which LEGOs appear in this phrase
        for lego_known in lego_index.keys():
            if lego_known in known and lego_known != known:
                lego_usage[lego_known] += 1
                # Extract context (words around the LEGO)
                idx = known.find(lego_known)
                before = known[:idx].split()[-2:] if idx > 0 else []
                after = known[idx+len(lego_known):].split()[:2]
                context = ' '.join(before + [f"[{lego_known}]"] + after)
                lego_contexts[lego_known].add(context)

    # Identify high-usage LEGOs with diverse contexts
    for lego_known, usage_count in sorted(lego_usage.items(), key=lambda x: x[1], reverse=True)[:30]:
        contexts = list(lego_contexts[lego_known])[:5]  # Top 5 contexts
        if usage_count >= 10 and len(lego_contexts[lego_known]) >= 3:
            overlap_candidates.append({
                'lego': lego_known,
                'usage_count': usage_count,
                'unique_contexts': len(lego_contexts[lego_known]),
                'sample_contexts': contexts,
                'recommendation': f'Consider creating overlapping variants like "{lego_known} + common_word"'
            })

    return overlap_candidates

def analyze_course(course_code: str, language: str) -> Dict:
    """Analyze a single course for chunk opportunities."""
    print(f"\n{'='*60}")
    print(f"Analyzing {language} ({course_code})")
    print(f"{'='*60}")

    data = get_course_data(course_code)

    analysis = {
        'course_code': course_code,
        'language': language,
        'stats': {
            'lego_count': len(data['legos']),
            'phrase_count': len(data['phrases'])
        },
        'frequent_patterns': analyze_frequent_patterns(data['phrases']),
        'missing_intermediates': analyze_missing_intermediates(data['legos'], data['phrases']),
        'collocation_candidates': analyze_collocations_by_language(course_code, language, data['legos'], data['phrases']),
        'overlap_recommendations': analyze_overlap_potential(data['legos'], data['phrases'])
    }

    return analysis

def generate_summary_report(all_analyses: List[Dict]) -> str:
    """Generate markdown summary report."""
    md = "# Chunk Opportunities Analysis - Summary Report\n\n"
    md += "_Analysis of natural multi-word expressions that should be taught as chunks_\n\n"
    md += "---\n\n"

    for analysis in all_analyses:
        course = analysis['course_code']
        lang = analysis['language']
        stats = analysis['stats']

        md += f"## {lang} ({course})\n\n"
        md += f"**Dataset:** {stats['lego_count']} LEGOs, {stats['phrase_count']} practice phrases\n\n"

        # Top frequent patterns
        md += "### Top 20 Frequent Patterns\n\n"
        md += "_Multi-word sequences appearing frequently in practice phrases_\n\n"
        patterns = analysis['frequent_patterns'][:20]
        if patterns:
            md += "| Pattern | Type | Frequency | Impact Estimate |\n"
            md += "|---------|------|-----------|------------------|\n"
            for p in patterns:
                impact = "HIGH" if p['frequency'] > 50 else "MEDIUM" if p['frequency'] > 20 else "LOW"
                md += f"| {p['pattern']} | {p['type']} | {p['frequency']} | {impact} |\n"
        else:
            md += "_No high-frequency patterns found (threshold: 10+ occurrences)_\n"
        md += "\n"

        # Missing intermediates
        md += "### Missing Intermediate Constructions\n\n"
        md += "_Multi-word expressions that appear in phrases but aren't LEGOs_\n\n"
        missing = analysis['missing_intermediates'][:15]
        if missing:
            md += "| Expression | Words | Has Start | In Longer Phrases | Recommendation |\n"
            md += "|------------|-------|-----------|-------------------|----------------|\n"
            for m in missing:
                rec = f"Create chunk LEGO for \"{m['expression']}\""
                md += f"| {m['expression']} | {m['word_count']} | {'✓' if m['has_start_component'] else '✗'} | {'✓' if m['appears_in_longer'] else '✗'} | {rec} |\n"
        else:
            md += "_No obvious gaps found in intermediate constructions_\n"
        md += "\n"

        # Collocations
        md += f"### {lang}-Specific Collocations\n\n"
        md += "_Natural chunks based on language-specific patterns_\n\n"
        collocations = analysis['collocation_candidates'][:15]
        if collocations:
            md += "| Pattern | Type | Frequency | Description | Impact |\n"
            md += "|---------|------|-----------|-------------|--------|\n"
            for c in collocations:
                impact_desc = f"Would improve {c['frequency']} phrases"
                md += f"| {c['pattern']} | {c['type']} | {c['frequency']} | {c['description']} | {impact_desc} |\n"
        else:
            md += "_No language-specific collocations identified (may need manual linguistic analysis)_\n"
        md += "\n"

        # Overlap recommendations
        md += "### Overlap Recommendations\n\n"
        md += "_Existing LEGOs that should have overlapping variants_\n\n"
        overlaps = analysis['overlap_recommendations'][:10]
        if overlaps:
            md += "| LEGO | Usage | Contexts | Sample Contexts | Recommendation |\n"
            md += "|------|-------|----------|-----------------|----------------|\n"
            for o in overlaps:
                contexts_sample = "; ".join(o['sample_contexts'][:2])
                md += f"| {o['lego']} | {o['usage_count']} | {o['unique_contexts']} | {contexts_sample} | {o['recommendation']} |\n"
        else:
            md += "_No high-impact overlap opportunities identified_\n"
        md += "\n"

        md += "---\n\n"

    # Overall recommendations
    md += "## Overall Recommendations\n\n"
    md += "### Chunk-First Approach Benefits\n\n"
    md += "1. **Reduced Cognitive Load**: Teaching \"I want to\" as a chunk reduces working memory demands\n"
    md += "2. **Natural Fluency**: Learners acquire language patterns as native speakers use them\n"
    md += "3. **Faster Phrase Building**: Pre-assembled chunks mean fewer assembly steps\n"
    md += "4. **Better Retention**: Meaningful chunks are easier to remember than isolated words\n\n"

    md += "### Implementation Strategy\n\n"
    md += "1. **Priority 1**: Add frequent bigrams/trigrams (10+ occurrences) as M-LEGOs\n"
    md += "2. **Priority 2**: Fill missing intermediates (A exists, A+B+C exists, add A+B)\n"
    md += "3. **Priority 3**: Add language-specific collocations based on linguistic patterns\n"
    md += "4. **Priority 4**: Create overlapping variants for high-usage LEGOs\n\n"

    md += "### Next Steps\n\n"
    md += "1. Review top 20 frequent patterns per language with linguistic experts\n"
    md += "2. Validate missing intermediates against pedagogical requirements\n"
    md += "3. Design chunk LEGOs with proper component structure\n"
    md += "4. Update Course Builder API to handle chunk LEGOs efficiently\n"
    md += "5. Test chunk-first approach with pilot course sections\n\n"

    return md

def main():
    """Main analysis pipeline."""
    print("Starting Chunk Opportunity Analysis")
    print("="*60)

    all_analyses = []

    for course_code, language in COURSES:
        try:
            analysis = analyze_course(course_code, language)
            all_analyses.append(analysis)
        except Exception as e:
            print(f"Error analyzing {course_code}: {e}")
            import traceback
            traceback.print_exc()

    # Save JSON report
    output_dir = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/quality-reports'
    json_path = os.path.join(output_dir, 'chunk-opportunities.json')

    print(f"\nSaving JSON report to {json_path}")
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump({
            'analyses': all_analyses,
            'metadata': {
                'analysis_date': '2026-02-02',
                'courses_analyzed': len(all_analyses),
                'total_legos': sum(a['stats']['lego_count'] for a in all_analyses),
                'total_phrases': sum(a['stats']['phrase_count'] for a in all_analyses)
            }
        }, f, indent=2, ensure_ascii=False)

    # Generate markdown summary
    summary_md = generate_summary_report(all_analyses)
    md_path = os.path.join(output_dir, 'CHUNK-OPPORTUNITIES-SUMMARY.md')

    print(f"Saving summary report to {md_path}")
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(summary_md)

    print("\n" + "="*60)
    print("Analysis complete!")
    print(f"JSON report: {json_path}")
    print(f"Summary report: {md_path}")
    print("="*60)

if __name__ == '__main__':
    main()
