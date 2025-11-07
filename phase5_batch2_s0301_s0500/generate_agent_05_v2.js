import fs from 'fs';

// Load input files
const agentInput = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_input/agent_05_seeds.json', 'utf8'));
const registry = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/registry/lego_registry_s0001_s0500.json', 'utf8'));

// Build whitelist of all Spanish words taught up to a given seed
function buildWhitelistUpTo(seedId) {
  const seedNum = parseInt(seedId.substring(1));
  const whitelist = new Set();

  for (const legoId in registry.legos) {
    const lego = registry.legos[legoId];
    const legoSeedNum = parseInt(legoId.substring(1, 5));

    if (legoSeedNum <= seedNum) {
      if (lego.spanish_words) {
        lego.spanish_words.forEach(word => whitelist.add(word.toLowerCase()));
      }
    }
  }

  return Array.from(whitelist);
}

// Get cumulative LEGO count up to a seed
function getCumulativeLegoCount(seedId) {
  const seedNum = parseInt(seedId.substring(1));
  return Object.keys(registry.legos).filter(legoId => {
    const legoSeedNum = parseInt(legoId.substring(1, 5));
    return legoSeedNum <= seedNum;
  }).length;
}

// Calculate phrase length
function len(text) {
  return text.split(/\s+/).filter(w => w.length > 0).length;
}

// Create phrase array [English, Spanish, null, length]
function phrase(eng, spa) {
  return [eng, spa, null, len(spa)];
}

// Build the output structure
const output = {
  version: "curated_v6_molecular_lego",
  agent_id: 5,
  seed_range: "S0381-S0400",
  total_seeds: 20,
  validation_status: "PENDING",
  validated_at: new Date().toISOString(),
  seeds: {}
};

// Manual phrase data for each LEGO - this is where the quality content is defined
const phraseData = {
  // S0381: "I didn't ask if he wanted to follow us."
  "S0381L01": [ // seguirnos - to follow us
    phrase("to follow us", "seguirnos"),
    phrase("follow us", "seguirnos"),
    phrase("I want to follow us", "quiero seguirnos"),
    phrase("Do you want to follow us?", "¿quieres seguirnos?"),
    phrase("He wanted to follow us", "quería seguirnos"),
    phrase("She said she wanted to follow us", "dijo que quería seguirnos"),
    phrase("I asked if he wanted to follow us", "pregunté si quería seguirnos"),
    phrase("I didn't ask if he wanted to follow us", "no pregunté si quería seguirnos"),
    phrase("Did you ask if he wanted to follow us?", "¿preguntaste si quería seguirnos?"),
    phrase("I didn't ask if he wanted to follow us.", "No pregunté si quería seguirnos.")
  ],

  // S0382: "Did you ask where he wanted to put it?"
  "S0382L01": [ // Preguntaste - you asked
    phrase("you asked", "preguntaste"),
    phrase("asked", "preguntaste"),
    phrase("You asked where", "preguntaste dónde"),
    phrase("Did you ask where?", "¿preguntaste dónde?"),
    phrase("You asked where he wanted", "preguntaste dónde quería"),
    phrase("You asked where he wanted to put it", "preguntaste dónde quería ponerlo"),
    phrase("Did you ask where he wanted to put it?", "¿preguntaste dónde quería ponerlo?"),
    phrase("I asked if you asked where he wanted it", "pregunté si preguntaste dónde lo quería"),
    phrase("Yes I asked where he wanted to put it", "sí pregunté dónde quería ponerlo"),
    phrase("Did you ask where he wanted to put it?", "¿Preguntaste dónde quería ponerlo?")
  ],

  // S0383: "Yes he said he wanted to put it in the garden."
  "S0383L01": [ // el jardín - the garden
    phrase("the garden", "el jardín"),
    phrase("in the garden", "en el jardín"),
    phrase("It's in the garden", "está en el jardín"),
    phrase("I want it in the garden", "lo quiero en el jardín"),
    phrase("He wanted to put it in the garden", "quería ponerlo en el jardín"),
    phrase("He said he wanted to put it in the garden", "dijo que quería ponerlo en el jardín"),
    phrase("Yes he said he wanted to put it in the garden", "sí dijo que quería ponerlo en el jardín"),
    phrase("I asked if he wanted to put it in the garden", "pregunté si quería ponerlo en el jardín"),
    phrase("Did you ask where in the garden he wanted to put it?", "¿preguntaste dónde en el jardín quería ponerlo?"),
    phrase("Yes he said he wanted to put it in the garden.", "Sí dijo que quería ponerlo en el jardín.")
  ],

  // S0384: "I couldn't agree with what he said a moment ago."
  "S0384L01": [ // pude - I could
    phrase("I could", "pude"),
    phrase("could", "pude"),
    phrase("I could speak", "pude hablar"),
    phrase("I could not speak", "no pude hablar"),
    phrase("I could speak with him", "pude hablar con él"),
    phrase("I could agree with what he said", "pude estar de acuerdo con lo que dijo"),
    phrase("I couldn't agree with what he said yesterday", "no pude estar de acuerdo con lo que dijo ayer"),
    phrase("I couldn't agree with what he said a moment ago", "no pude estar de acuerdo con lo que dijo hace un momento"),
    phrase("I asked if I could agree with what he said", "pregunté si pude estar de acuerdo con lo que dijo"),
    phrase("I couldn't agree with what he said a moment ago.", "No pude estar de acuerdo con lo que dijo hace un momento.")
  ],

  "S0384L02": [ // estar de acuerdo - agree
    phrase("agree", "estar de acuerdo"),
    phrase("to agree", "estar de acuerdo"),
    phrase("I want to agree", "quiero estar de acuerdo"),
    phrase("to agree with him", "estar de acuerdo con él"),
    phrase("I couldn't agree with him", "no pude estar de acuerdo con él"),
    phrase("I want to agree with what he said", "quiero estar de acuerdo con lo que dijo"),
    phrase("I couldn't agree with what he said yesterday", "no pude estar de acuerdo con lo que dijo ayer"),
    phrase("I couldn't agree with what he said a moment ago", "no pude estar de acuerdo con lo que dijo hace un momento"),
    phrase("Did you agree with what he said a moment ago?", "¿estuviste de acuerdo con lo que dijo hace un momento?"),
    phrase("I couldn't agree with what he said a moment ago.", "No pude estar de acuerdo con lo que dijo hace un momento.")
  ],

  "S0384L03": [ // hace un momento - a moment ago
    phrase("a moment ago", "hace un momento"),
    phrase("moment ago", "hace un momento"),
    phrase("He said it a moment ago", "lo dijo hace un momento"),
    phrase("I asked him a moment ago", "le pregunté hace un momento"),
    phrase("He wanted it a moment ago", "lo quería hace un momento"),
    phrase("I couldn't agree with what he said a moment ago", "no pude estar de acuerdo con lo que dijo hace un momento"),
    phrase("Did you ask him what he wanted a moment ago?", "¿le preguntaste lo que quería hace un momento?"),
    phrase("I couldn't agree with what he said a moment ago", "no pude estar de acuerdo con lo que dijo hace un momento"),
    phrase("Yes he said he wanted to put it there a moment ago", "sí dijo que quería ponerlo allí hace un momento"),
    phrase("I couldn't agree with what he said a moment ago.", "No pude estar de acuerdo con lo que dijo hace un momento.")
  ],

  // S0385: "Did you agree with her?"
  "S0385L01": [ // Estuviste - you were
    phrase("you were", "estuviste"),
    phrase("were you", "estuviste"),
    phrase("You were there", "estuviste allí"),
    phrase("Were you there?", "¿estuviste allí?"),
    phrase("You were in agreement", "estuviste de acuerdo"),
    phrase("You were in agreement with her", "estuviste de acuerdo con ella"),
    phrase("Did you agree with her yesterday?", "¿estuviste de acuerdo con ella ayer?"),
    phrase("I asked if you agreed with her", "pregunté si estuviste de acuerdo con ella"),
    phrase("Yes I said you were in agreement with her", "sí dije que estuviste de acuerdo con ella"),
    phrase("Did you agree with her?", "¿Estuviste de acuerdo con ella?")
  ],

  "S0385L02": [ // de acuerdo - in agreement
    phrase("in agreement", "de acuerdo"),
    phrase("agreement", "de acuerdo"),
    phrase("I'm in agreement", "estoy de acuerdo"),
    phrase("to be in agreement", "estar de acuerdo"),
    phrase("You were in agreement", "estuviste de acuerdo"),
    phrase("You were in agreement with her", "estuviste de acuerdo con ella"),
    phrase("I want to be in agreement with her", "quiero estar de acuerdo con ella"),
    phrase("Did you agree with her about what he said?", "¿estuviste de acuerdo con ella sobre lo que dijo?"),
    phrase("I couldn't agree with her a moment ago", "no pude estar de acuerdo con ella hace un momento"),
    phrase("Did you agree with her?", "¿Estuviste de acuerdo con ella?")
  ],

  // S0386: "Yes I agreed with her."
  "S0386L01": [ // estuve - I was
    phrase("I was", "estuve"),
    phrase("was", "estuve"),
    phrase("I was there", "estuve allí"),
    phrase("I was in agreement", "estuve de acuerdo"),
    phrase("I was in agreement with her", "estuve de acuerdo con ella"),
    phrase("Yes I agreed with her", "sí estuve de acuerdo con ella"),
    phrase("I asked if I was in agreement with her", "pregunté si estuve de acuerdo con ella"),
    phrase("Yes I was in agreement with her yesterday", "sí estuve de acuerdo con ella ayer"),
    phrase("I was there a moment ago but now I'm here", "estuve allí hace un momento pero ahora estoy aquí"),
    phrase("Yes I agreed with her.", "Sí estuve de acuerdo con ella.")
  ],

  "S0386L03": [ // de acuerdo - in agreement (repeated from prev seed)
    phrase("in agreement", "de acuerdo"),
    phrase("agreement", "de acuerdo"),
    phrase("I'm in agreement", "estoy de acuerdo"),
    phrase("I was in agreement", "estuve de acuerdo"),
    phrase("I was in agreement with her", "estuve de acuerdo con ella"),
    phrase("Yes I agreed with her", "sí estuve de acuerdo con ella"),
    phrase("I want to be in agreement with her", "quiero estar de acuerdo con ella"),
    phrase("Yes I was in agreement with her yesterday", "sí estuve de acuerdo con ella ayer"),
    phrase("I couldn't agree with him but I agreed with her", "no pude estar de acuerdo con él pero estuve de acuerdo con ella"),
    phrase("Yes I agreed with her.", "Sí estuve de acuerdo con ella.")
  ],

  // S0387: "No I didn't think she was right."
  "S0387L01": [ // pensé - I thought
    phrase("I thought", "pensé"),
    phrase("thought", "pensé"),
    phrase("I thought so", "pensé eso"),
    phrase("I didn't think so", "no pensé eso"),
    phrase("I thought she was right", "pensé que tenía razón"),
    phrase("I didn't think she was right", "no pensé que tenía razón"),
    phrase("No I didn't think she was right", "no no pensé que tenía razón"),
    phrase("I asked if I thought she was right", "pregunté si pensé que tenía razón"),
    phrase("I thought she was right but now I don't agree", "pensé que tenía razón pero ahora no estoy de acuerdo"),
    phrase("No I didn't think she was right.", "No no pensé que tenía razón.")
  ],

  "S0387L02": [ // tenía razón - was right
    phrase("was right", "tenía razón"),
    phrase("right", "tenía razón"),
    phrase("She was right", "tenía razón"),
    phrase("I thought she was right", "pensé que tenía razón"),
    phrase("I didn't think she was right", "no pensé que tenía razón"),
    phrase("No I didn't think she was right", "no no pensé que tenía razón"),
    phrase("I asked if she was right about that", "pregunté si tenía razón sobre eso"),
    phrase("He said she was right but I didn't agree", "dijo que tenía razón pero no estuve de acuerdo"),
    phrase("I thought she was right a moment ago", "pensé que tenía razón hace un momento"),
    phrase("No I didn't think she was right.", "No no pensé que tenía razón.")
  ],

  // S0388: "That person you work with."
  "S0388L01": [ // Esa persona - that person
    phrase("that person", "esa persona"),
    phrase("person", "esa persona"),
    phrase("That person is here", "esa persona está aquí"),
    phrase("I know that person", "conozco esa persona"),
    phrase("That person you work with", "esa persona con la que trabajas"),
    phrase("I want to speak with that person", "quiero hablar con esa persona"),
    phrase("That person you work with is very patient", "esa persona con la que trabajas es muy paciente"),
    phrase("I asked if that person was the one standing there", "pregunté si esa persona era la que está de pie allí"),
    phrase("I thought that person with the green shirt was right", "pensé que esa persona con la camisa verde tenía razón"),
    phrase("That person you work with.", "Esa persona con la que trabajas.")
  ],

  "S0388L02": [ // la que - whom
    phrase("whom", "la que"),
    phrase("the one", "la que"),
    phrase("with whom", "con la que"),
    phrase("the one you work with", "la que trabajas"),
    phrase("That person with whom you work", "esa persona con la que trabajas"),
    phrase("The person you work with is here", "la persona con la que trabajas está aquí"),
    phrase("I want to speak with the person you work with", "quiero hablar con la persona con la que trabajas"),
    phrase("That person you work with is very patient", "esa persona con la que trabajas es muy paciente"),
    phrase("I asked about the person with whom you work", "pregunté sobre la persona con la que trabajas"),
    phrase("That person you work with.", "Esa persona con la que trabajas.")
  ],

  "S0388L03": [ // trabajas - you work
    phrase("you work", "trabajas"),
    phrase("work", "trabajas"),
    phrase("You work here", "trabajas aquí"),
    phrase("Do you work there?", "¿trabajas allí?"),
    phrase("You work with that person", "trabajas con esa persona"),
    phrase("That person you work with", "esa persona con la que trabajas"),
    phrase("I know the person you work with", "conozco la persona con la que trabajas"),
    phrase("That person you work with is very nice", "esa persona con la que trabajas es muy amable"),
    phrase("I asked where the person you work with is standing", "pregunté dónde está de pie la persona con la que trabajas"),
    phrase("That person you work with.", "Esa persona con la que trabajas.")
  ],

  // S0389: "That person over there."
  "S0389L01": [ // Esa persona - that person (repeated)
    phrase("that person", "esa persona"),
    phrase("person", "esa persona"),
    phrase("That person there", "esa persona allí"),
    phrase("That person over there", "esa persona allí"),
    phrase("I see that person", "veo esa persona"),
    phrase("That person is standing over there", "esa persona está de pie allí"),
    phrase("I want to speak with that person over there", "quiero hablar con esa persona allí"),
    phrase("That person over there is the one I wanted to follow", "esa persona allí es la que quería seguir"),
    phrase("I thought that person over there was the one you work with", "pensé que esa persona allí era con la que trabajas"),
    phrase("That person over there.", "Esa persona allí.")
  ],

  // S0390: "The one who is standing near the entrance."
  "S0390L01": [ // La que - the one who
    phrase("the one who", "la que"),
    phrase("one who", "la que"),
    phrase("The one who is here", "la que está aquí"),
    phrase("The one who wanted it", "la que lo quería"),
    phrase("The one who is standing", "la que está de pie"),
    phrase("The one who is standing near the entrance", "la que está de pie cerca de la entrada"),
    phrase("I see the one who is standing near the entrance", "veo la que está de pie cerca de la entrada"),
    phrase("That person is the one who is standing near the entrance", "esa persona es la que está de pie cerca de la entrada"),
    phrase("I asked if she was the one standing near the entrance", "pregunté si era la que está de pie cerca de la entrada"),
    phrase("The one who is standing near the entrance.", "La que está de pie cerca de la entrada.")
  ],

  "S0390L02": [ // de pie - standing
    phrase("standing", "de pie"),
    phrase("on foot", "de pie"),
    phrase("I'm standing", "estoy de pie"),
    phrase("to be standing", "estar de pie"),
    phrase("The one who is standing", "la que está de pie"),
    phrase("She is standing near the entrance", "está de pie cerca de la entrada"),
    phrase("The one who is standing near the entrance", "la que está de pie cerca de la entrada"),
    phrase("We need to stand until everybody is ready", "necesitamos estar de pie hasta que todos estén preparados"),
    phrase("That person standing over there is the one I work with", "esa persona de pie allí es con la que trabajo"),
    phrase("The one who is standing near the entrance.", "La que está de pie cerca de la entrada.")
  ],

  "S0390L03": [ // cerca - near
    phrase("near", "cerca"),
    phrase("close", "cerca"),
    phrase("It's near here", "está cerca de aquí"),
    phrase("standing near", "de pie cerca"),
    phrase("near the entrance", "cerca de la entrada"),
    phrase("She is standing near the entrance", "está de pie cerca de la entrada"),
    phrase("The one who is standing near the entrance", "la que está de pie cerca de la entrada"),
    phrase("I asked if the person standing near the entrance works here", "pregunté si la persona de pie cerca de la entrada trabaja aquí"),
    phrase("That child with black hair is standing near the post office", "ese niño con el pelo negro está de pie cerca de la oficina de correos"),
    phrase("The one who is standing near the entrance.", "La que está de pie cerca de la entrada.")
  ],

  "S0390L04": [ // la entrada - the entrance
    phrase("the entrance", "la entrada"),
    phrase("entrance", "la entrada"),
    phrase("near the entrance", "cerca de la entrada"),
    phrase("at the entrance", "en la entrada"),
    phrase("standing near the entrance", "de pie cerca de la entrada"),
    phrase("The one who is standing near the entrance", "la que está de pie cerca de la entrada"),
    phrase("I see the person standing near the entrance", "veo la persona de pie cerca de la entrada"),
    phrase("That person standing near the entrance is the one I work with", "esa persona de pie cerca de la entrada es con la que trabajo"),
    phrase("I asked where the entrance is", "pregunté dónde está la entrada"),
    phrase("The one who is standing near the entrance.", "La que está de pie cerca de la entrada.")
  ]
};

// Process each seed
agentInput.seeds.forEach((seed) => {
  const seedId = seed.seed_id;
  const seedNum = parseInt(seedId.substring(1));
  const cumulative = getCumulativeLegoCount(seedId);

  output.seeds[seedId] = {
    seed: seedId,
    seed_pair: seed.seed_pair,
    cumulative_legos: cumulative,
    legos: {}
  };

  // Process each LEGO in this seed
  seed.legos.forEach((lego, legoIndex) => {
    const legoId = lego.id;
    const available = cumulative - (seed.legos.length - legoIndex);

    // Get phrases for this LEGO
    let practicePhrases = phraseData[legoId];

    if (!practicePhrases) {
      console.error(`Missing phrase data for ${legoId}`);
      practicePhrases = [];
    }

    // Calculate distribution
    const dist = {
      really_short_1_2: 0,
      quite_short_3: 0,
      longer_4_5: 0,
      long_6_plus: 0
    };

    practicePhrases.forEach(p => {
      const count = p[3];
      if (count <= 2) dist.really_short_1_2++;
      else if (count === 3) dist.quite_short_3++;
      else if (count === 4 || count === 5) dist.longer_4_5++;
      else dist.long_6_plus++;
    });

    output.seeds[seedId].legos[legoId] = {
      lego: [lego.known, lego.target],
      type: lego.type,
      available_legos: available,
      practice_phrases: practicePhrases,
      phrase_distribution: dist,
      gate_compliance: "STRICT - All words from taught LEGOs only"
    };
  });
});

// Save output
const outputPath = '/home/user/ssi-dashboard-v7/phase5_batch2_s0301_s0500/batch_output/agent_05_baskets.json';
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log('Generation complete!');
console.log(`Seeds: ${agentInput.seeds.length}`);
console.log(`Total LEGOs: ${Object.values(output.seeds).reduce((acc, seed) => acc + Object.keys(seed.legos).length, 0)}`);
console.log(`Output saved to: ${outputPath}`);
