require('dotenv').config();
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const COURSE = 'fra_for_eng';

// Issues to flag
const issues = [];

async function flagPhrase(phraseId, reason, detail) {
  const {data: phrase} = await supabase
    .from('course_practice_phrases')
    .select('metadata')
    .eq('id', phraseId)
    .single();

  await supabase
    .from('course_practice_phrases')
    .update({
      metadata: {
        ...(phrase?.metadata || {}),
        qa_flag: 'delete',
        qa_reason: reason,
        qa_detail: detail,
        qa_date: '2026-02-07',
        qa_batch: 5
      }
    })
    .eq('id', phraseId);

  issues.push({phraseId, reason, detail});
}

async function main() {
  console.log('QA BATCH 5: DETAILED ANALYSIS\n');
  
  // SEED 121 - Checking "C'est inhabituel que vous" - incomplete subjunctive phrase
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 121)
      .eq('known_text', 'It is unusual that you')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'C\'est inhabituel que vous') {
      await flagPhrase(p.id, 'fragment', 'USE phrase is incomplete - needs verb: "C\'est inhabituel que vous [verb]"');
    }
  }

  // SEED 122 - "I want to seem easy" doesn't make sense
  {
    const {data: phrases} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 122)
      .eq('known_text', 'I want to seem easy.')
      .in('phrase_role', ['use']);
    if (phrases?.length > 0) {
      for (const p of phrases) {
        await flagPhrase(p.id, 'nonsensical', '"seem easy" is nonsensical - people don\'t "seem easy"');
      }
    }
  }

  // SEED 126 - "La forme est intéressant" - gender agreement error (should be "intéressante")
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 126)
      .eq('known_text', 'The shape is interesting.')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'La forme est intéressant.') {
      await flagPhrase(p.id, 'grammar', 'Gender agreement: "forme" is feminine, should be "intéressante"');
    }
  }

  // SEED 126 - "La forme de mon cerveau est une bonne idée" - nonsensical
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 126)
      .eq('known_text', 'The shape of my brain is a good idea.')
      .in('phrase_role', ['use'])
      .single();
    if (p) {
      await flagPhrase(p.id, 'nonsensical', 'Nonsensical: "the shape of my brain is a good idea" doesn\'t make sense');
    }
  }

  // SEED 129 - "Je suis tellement content que vous faites si bien" - wrong mood (should be imparfait subjunctive, not present indicative)
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 129)
      .eq('known_text', 'I\'m so happy that you\'re doing so well.')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'Je suis tellement content que vous faites si bien.') {
      await flagPhrase(p.id, 'grammar', 'After "je suis content que", use subjunctive: "fassiez" not "faites"');
    }
  }

  // SEED 129 - "Je suis content que vous faites si bien" - same issue
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 129)
      .eq('known_text', 'I\'m glad that you\'re doing so well.')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'Je suis content que vous faites si bien.') {
      await flagPhrase(p.id, 'grammar', 'After "je suis content que", use subjunctive: "fassiez" not "faites"');
    }
  }

  // SEED 129 - "C'est bien que vous faites si bien" - same issue
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 129)
      .eq('known_text', 'It is good that you\'re doing so well.')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'C\'est bien que vous faites si bien.') {
      await flagPhrase(p.id, 'grammar', 'After "c\'est bien que", use subjunctive: "fassiez" not "faites"');
    }
  }

  // SEED 131 - "Quoi idées?" - unnatural French word order
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 131)
      .eq('known_text', 'What ideas?')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'Quoi idées?') {
      await flagPhrase(p.id, 'unnatural', '"Quoi idées?" is not natural French - should be "Quelles idées?"');
    }
  }

  // SEED 131 - "C'est des idées" - wrong (should be "Ce sont des idées")
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 131)
      .eq('known_text', 'It\'s ideas.')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'C\'est des idées.') {
      await flagPhrase(p.id, 'grammar', 'Plural needs "Ce sont" not "C\'est": "Ce sont des idées"');
    }
  }

  // SEED 131 - "Il y a tournent" - ungrammatical
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 131)
      .eq('known_text', 'There are going around.')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'Il y a tournent.') {
      await flagPhrase(p.id, 'grammar', 'Ungrammatical - "Il y a" + verb doesn\'t work this way');
    }
  }

  // SEED 131 - "Trop de tournent" - ungrammatical
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 131)
      .eq('known_text', 'Too many going around.')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'Trop de tournent.') {
      await flagPhrase(p.id, 'grammar', 'Ungrammatical - "tournent" needs object: "Trop d\'idées tournent"');
    }
  }

  // SEED 131 - "C'est tournent" - ungrammatical
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 131)
      .eq('known_text', 'It\'s going around.')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'C\'est tournent.') {
      await flagPhrase(p.id, 'grammar', 'Ungrammatical - "C\'est" + plural verb doesn\'t work');
    }
  }

  // SEED 139 - "That's sorry" / "It's very sorry" - unnatural
  {
    const {data: phrases} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 139)
      .in('phrase_role', ['use'])
      .in('known_text', ['That\'s sorry.', 'It\'s very sorry.']);
    if (phrases?.length > 0) {
      for (const p of phrases) {
        await flagPhrase(p.id, 'unnatural', '"That\'s sorry" is not natural English');
      }
    }
  }

  // SEED 141 - "C'est pas de problème" - should use "ne"
  {
    const {data: phrases} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 141)
      .in('phrase_role', ['use'])
      .like('target_text', 'C\'est pas de problème%');
    if (phrases?.length > 0) {
      for (const p of phrases) {
        // This is colloquial French (omitting "ne"), technically correct but informal
        // Keep for now - it's used in conversation
      }
    }
  }

  // SEED 145 - "Ce n'est pas là plus" - ungrammatical
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 145)
      .eq('known_text', 'It\'s not there any more.')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'Ce n\'est pas là plus.') {
      await flagPhrase(p.id, 'grammar', 'Wrong: should be "Ce n\'est plus là" (adverb order)');
    }
  }

  // SEED 145 - "C'est bon plus" - ungrammatical
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 145)
      .eq('known_text', 'It\'s good any more.')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'C\'est bon plus.') {
      await flagPhrase(p.id, 'grammar', 'Wrong: should be "Ce n\'est plus bon" not "C\'est bon plus"');
    }
  }

  // SEED 145 - "Pourquoi pas plus?" - unclear meaning
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 145)
      .eq('known_text', 'Why not any more?')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'Pourquoi pas plus?') {
      await flagPhrase(p.id, 'unnatural', '"Why not any more?" is unclear - should be "Why not anymore?" or "Why don\'t we?"');
    }
  }

  // SEED 145 - "C'est plus?" - unnatural
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 145)
      .eq('known_text', 'Is it any more?')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'C\'est plus?') {
      await flagPhrase(p.id, 'unnatural', '"C\'est plus?" doesn\'t make sense - needs more context');
    }
  }

  // SEED 148 - "On est patient" - should be plural agreement
  {
    const {data: p} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 148)
      .eq('known_text', 'We are patient.')
      .in('phrase_role', ['use'])
      .single();
    if (p && p.target_text === 'On est patient.') {
      await flagPhrase(p.id, 'grammar', 'Verb agrees with "on", but adjective should agree with implied subject (plural): "On est patients" or "Nous sommes patients"');
    }
  }

  // SEED 150 - "C'est quel est votre nom?" - ungrammatical
  {
    const {data: phrases} = await supabase
      .from('course_practice_phrases')
      .select('id, known_text, target_text')
      .eq('course_code', COURSE)
      .eq('seed_number', 150)
      .in('phrase_role', ['use'])
      .in('known_text', ['Is that what your name is?', 'I think that\'s what your name is.', 'I believe that\'s what your name is.']);
    if (phrases?.length > 0) {
      for (const p of phrases) {
        if (p.target_text.includes('C\'est quel est votre nom') || p.target_text.includes('je pense que c\'est quel est')) {
          await flagPhrase(p.id, 'grammar', 'Ungrammatical: should be "c\'est [adjective/noun]" not "c\'est quel est [phrase]"');
        }
      }
    }
  }

  console.log(`\nFlagged ${issues.length} phrases for deletion\n`);
  console.log('Issues:');
  issues.forEach((issue, i) => {
    console.log(`${i+1}. [${issue.reason}] ${issue.detail}`);
  });
}

main().catch(console.error);
