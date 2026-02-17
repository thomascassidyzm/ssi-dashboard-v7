#!/usr/bin/env python3
"""
AI-Powered Grammar Quality Analysis
Uses Claude (Anthropic API) to analyze grammar across course samples
"""

import os
import json
import time
from typing import Dict, List
from dotenv import load_dotenv
from supabase import create_client, Client
from anthropic import Anthropic

# Load environment variables
load_dotenv()

# Initialize clients
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise Exception("Missing Supabase credentials in .env file")
if not ANTHROPIC_API_KEY:
    raise Exception("Missing Anthropic API key in .env file")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
anthropic = Anthropic(api_key=ANTHROPIC_API_KEY)

# Course configurations
COURSES = {
    'eng_for_ara': {'name': 'English for Arabic speakers', 'known': 'Arabic', 'target': 'English', 'sample_size': 20},
    'deu_for_eng': {'name': 'German for English speakers', 'known': 'English', 'target': 'German', 'sample_size': 20},
    'ara_for_eng': {'name': 'Arabic for English speakers', 'known': 'English', 'target': 'Arabic', 'sample_size': 20},
    'eng_for_deu': {'name': 'English for German speakers', 'known': 'German', 'target': 'English', 'sample_size': 20},
    'bre_for_fra': {'name': 'Breton for French speakers', 'known': 'French', 'target': 'Breton', 'sample_size': 20},
    'cym_s_for_eng': {'name': 'South Welsh for English speakers', 'known': 'English', 'target': 'Welsh (Southern)', 'sample_size': 20},
    'cym_n_for_eng': {'name': 'North Welsh for English speakers', 'known': 'English', 'target': 'Welsh (Northern)', 'sample_size': 20},
    'eng_for_fra': {'name': 'English for French speakers', 'known': 'French', 'target': 'English', 'sample_size': 20}
}


def fetch_sample_phrases(course_code: str, limit: int = 20) -> List[Dict]:
    """Fetch sample phrases from Supabase"""
    print(f"  Fetching {limit} sample phrases...")

    try:
        response = supabase.table('course_practice_phrases') \
            .select('*') \
            .eq('course_code', course_code) \
            .eq('phrase_role', 'use') \
            .limit(limit) \
            .execute()

        return response.data
    except Exception as e:
        print(f"  Error fetching phrases: {e}")
        return []


def analyze_with_ai(course_info: Dict, phrases: List[Dict]) -> Dict:
    """Use Claude to analyze grammar quality"""
    print(f"  Analyzing with Claude AI...")

    # Format phrases for analysis
    formatted_phrases = []
    for i, phrase in enumerate(phrases[:20], 1):  # Limit to 20 to keep API calls reasonable
        formatted_phrases.append({
            'number': i,
            'known': phrase.get('known_text', ''),
            'target': phrase.get('target_text', '')
        })

    # Create analysis prompt
    prompt = f"""You are a professional linguistic quality analyst specializing in language learning materials.

Analyze the grammar quality of these {len(formatted_phrases)} practice phrases from a language learning course:

**Course:** {course_info['name']}
**Known Language (L1):** {course_info['known']}
**Target Language (L2):** {course_info['target']}

**Phrases to Analyze:**

{json.dumps(formatted_phrases, indent=2, ensure_ascii=False)}

For each phrase pair, evaluate:
1. **Known text grammar** - Is the {course_info['known']} text grammatically correct?
2. **Target text grammar** - Is the {course_info['target']} text grammatically correct?
3. **Natural fluency** - Does each phrase sound natural and idiomatic?
4. **Pedagogical appropriateness** - Is the complexity suitable for beginners?

Provide your analysis as a JSON object with this structure:
{{
  "overall_assessment": {{
    "known_quality_score": 0-100,
    "target_quality_score": 0-100,
    "grade": "A/B/C/D/F",
    "summary": "brief overall assessment"
  }},
  "errors_found": [
    {{
      "phrase_number": 1,
      "language": "known/target",
      "text": "the problematic text",
      "error_type": "conjugation/article/word_order/other",
      "description": "what's wrong",
      "suggestion": "corrected version"
    }}
  ],
  "patterns": [
    {{
      "pattern_type": "e.g., missing articles",
      "frequency": "rare/occasional/frequent",
      "examples": ["phrase 3", "phrase 7"],
      "severity": "minor/moderate/major"
    }}
  ],
  "strengths": [
    "list of things done well"
  ],
  "recommendations": [
    "specific actionable recommendations"
  ]
}}

Be thorough but constructive. Focus on systematic issues rather than one-off errors."""

    try:
        response = anthropic.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4000,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        # Parse response
        response_text = response.content[0].text

        # Try to extract JSON from response
        # Look for JSON block in markdown code fence
        if '```json' in response_text:
            json_start = response_text.find('```json') + 7
            json_end = response_text.find('```', json_start)
            json_text = response_text[json_start:json_end].strip()
        elif '```' in response_text:
            json_start = response_text.find('```') + 3
            json_end = response_text.find('```', json_start)
            json_text = response_text[json_start:json_end].strip()
        else:
            # Try to find JSON object directly
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            json_text = response_text[json_start:json_end]

        result = json.loads(json_text)
        result['raw_response'] = response_text
        return result

    except Exception as e:
        print(f"  Error with AI analysis: {e}")
        return {
            'error': str(e),
            'overall_assessment': {
                'known_quality_score': 0,
                'target_quality_score': 0,
                'grade': 'ERROR',
                'summary': 'Analysis failed'
            },
            'errors_found': [],
            'patterns': [],
            'strengths': [],
            'recommendations': []
        }


def main():
    """Main analysis function"""
    print("SSi Grammar Quality Analysis - AI-Powered")
    print("=" * 80)
    print("Using Claude (Anthropic API) to analyze grammar quality")
    print()

    all_results = {}

    for course_code, course_info in COURSES.items():
        print(f"\n{'='*80}")
        print(f"Analyzing: {course_info['name']} ({course_code})")
        print(f"{'='*80}")

        # Fetch sample
        phrases = fetch_sample_phrases(course_code, limit=course_info['sample_size'])

        if not phrases:
            print(f"  No phrases found - skipping")
            all_results[course_code] = {
                'error': 'No phrases found',
                'course_name': course_info['name']
            }
            continue

        print(f"  Fetched {len(phrases)} phrases")

        # Analyze with AI
        analysis = analyze_with_ai(course_info, phrases)

        # Store results
        all_results[course_code] = {
            'course_name': course_info['name'],
            'known_language': course_info['known'],
            'target_language': course_info['target'],
            'phrases_analyzed': len(phrases),
            'analysis': analysis
        }

        # Print summary
        if 'overall_assessment' in analysis:
            assessment = analysis['overall_assessment']
            print(f"\n  Results:")
            print(f"    Known quality: {assessment.get('known_quality_score', 0)}/100")
            print(f"    Target quality: {assessment.get('target_quality_score', 0)}/100")
            print(f"    Grade: {assessment.get('grade', 'N/A')}")
            print(f"    Errors found: {len(analysis.get('errors_found', []))}")
            print(f"    Patterns identified: {len(analysis.get('patterns', []))}")

        # Rate limiting
        print(f"  Waiting 2s before next course...")
        time.sleep(2)

    # Generate comprehensive report
    print(f"\n{'='*80}")
    print("Generating final report...")
    print(f"{'='*80}")

    # Calculate overall statistics
    total_errors = sum(len(r.get('analysis', {}).get('errors_found', [])) for r in all_results.values())
    total_courses = len([r for r in all_results.values() if 'analysis' in r and 'overall_assessment' in r['analysis']])

    avg_known_score = sum(
        r.get('analysis', {}).get('overall_assessment', {}).get('known_quality_score', 0)
        for r in all_results.values() if 'analysis' in r
    ) / max(total_courses, 1)

    avg_target_score = sum(
        r.get('analysis', {}).get('overall_assessment', {}).get('target_quality_score', 0)
        for r in all_results.values() if 'analysis' in r
    ) / max(total_courses, 1)

    # Aggregate all patterns
    all_patterns = []
    for result in all_results.values():
        if 'analysis' in result and 'patterns' in result['analysis']:
            all_patterns.extend(result['analysis']['patterns'])

    # Aggregate all recommendations
    all_recommendations = []
    for result in all_results.values():
        if 'analysis' in result and 'recommendations' in result['analysis']:
            all_recommendations.extend(result['analysis']['recommendations'])

    # Deduplicate recommendations (handling both strings and dicts)
    unique_recommendations = []
    seen_recs = set()
    for rec in all_recommendations:
        rec_str = str(rec) if isinstance(rec, dict) else rec
        if rec_str not in seen_recs:
            seen_recs.add(rec_str)
            unique_recommendations.append(rec)

    report = {
        'metadata': {
            'analysis_date': '2026-02-02',
            'courses_analyzed': total_courses,
            'methodology': 'AI-powered analysis using Claude (Anthropic)',
            'sample_size_per_course': '20 USE phrases'
        },
        'overall_assessment': {
            'average_known_quality_score': round(avg_known_score, 1),
            'average_target_quality_score': round(avg_target_score, 1),
            'total_errors_found': total_errors,
            'overall_grade': 'A' if avg_known_score >= 90 and avg_target_score >= 90 else
                           'B' if avg_known_score >= 80 and avg_target_score >= 80 else
                           'C' if avg_known_score >= 70 and avg_target_score >= 70 else 'D'
        },
        'per_course_results': all_results,
        'cross_course_patterns': all_patterns,
        'aggregated_recommendations': unique_recommendations
    }

    # Save report
    output_path = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/quality-reports/grammar-analysis-ai.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Report saved to: {output_path}")

    # Print summary
    print(f"\n{'='*80}")
    print("FINAL SUMMARY")
    print(f"{'='*80}")
    print(f"Courses analyzed: {total_courses}")
    print(f"Average known language quality: {avg_known_score:.1f}/100")
    print(f"Average target language quality: {avg_target_score:.1f}/100")
    print(f"Overall grade: {report['overall_assessment']['overall_grade']}")
    print(f"Total errors found: {total_errors}")
    print(f"\n{'='*80}")
    print("Analysis complete!")
    print(f"{'='*80}")


if __name__ == '__main__':
    main()
