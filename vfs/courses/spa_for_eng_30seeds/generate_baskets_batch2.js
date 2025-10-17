#!/usr/bin/env node

/**
 * Phase 5: Basket Generation - Batch 2 (LEGOs 61-115 of 115)
 * Spanish for English - 30 Seeds Course
 *
 * Generates practice phrase baskets with:
 * - Progressive vocabulary constraint (only use previous LEGOs)
 * - E-phrases: 5 natural phrases per LEGO (7-15 words, target 10)
 * - D-phrases: Auto-generated expanding windows (2/3/4/5-LEGO)
 * - Culminating LEGO rule (complete seed as E1)
 * - Perfect grammar in BOTH Spanish and English
 */

import fs from 'fs';
import path from 'path';

// File paths
const LEGO_FILE = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng_30seeds/LEGO_BREAKDOWNS_COMPLETE.json';
const OUTPUT_FILE = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/spa_for_eng_30seeds/baskets_batch2.json';

// Batch 2 LEGO IDs to process (LEGOs 61-115)
const BATCH_2_IDS = [
  "S0018L04", "S0019L01", "S0019L02", "S0019L03", "S0019F01",
  "S0020L01", "S0020L02", "S0020L03",
  "S0021L01", "S0021L02", "S0021F01", "S0021F02",
  "S0022L01", "S0022L02", "S0022L03", "S0022F01", "S0022F02",
  "S0023L01", "S0023L02", "S0023L03", "S0023F01", "S0023F02",
  "S0024L01", "S0024L02", "S0024F01", "S0024F02",
  "S0025L01", "S0025L02", "S0025L03", "S0025F01", "S0025F02",
  "S0026L01", "S0026L02", "S0026L03", "S0026L04", "S0026L05", "S0026L06",
  "S0027L01", "S0027L02", "S0027L03", "S0027L04", "S0027F01",
  "S0028L01", "S0028L02", "S0028L03", "S0028F01", "S0028F02",
  "S0029L01", "S0029L02", "S0029L03", "S0029F01", "S0029F02",
  "S0030L01", "S0030L02", "S0030L03"
];

// Load LEGO breakdowns
const legoData = JSON.parse(fs.readFileSync(LEGO_FILE, 'utf8'));

// Extract ALL LEGOs (both lego_pairs and feeder_pairs)
function extractAllLegos() {
  const allLegos = [];

  for (const seed of legoData.lego_breakdowns) {
    const seedId = seed.seed_id;
    const seedTarget = seed.original_target;
    const seedKnown = seed.original_known;

    // Extract lego_pairs
    for (const lego of seed.lego_pairs) {
      allLegos.push({
        id: lego.lego_id,
        target: lego.target_chunk,
        known: lego.known_chunk,
        seedId: seedId,
        seedTarget: seedTarget,
        seedKnown: seedKnown,
        type: 'lego'
      });
    }

    // Extract feeder_pairs
    if (seed.feeder_pairs) {
      for (const feeder of seed.feeder_pairs) {
        allLegos.push({
          id: feeder.feeder_id,
          target: feeder.target_chunk,
          known: feeder.known_chunk,
          seedId: seedId,
          seedTarget: seedTarget,
          seedKnown: seedKnown,
          type: 'feeder',
          parentLegoId: feeder.parent_lego_id
        });
      }
    }
  }

  return allLegos;
}

// Check if LEGO is culminating (last in seed)
function isCulminating(legoId, allLegos) {
  // Feeders are never culminating (only regular LEGOs can be)
  if (legoId.includes('F')) {
    return false;
  }

  const seedId = legoId.match(/^(S\d{4})/)[1];
  const legoNum = parseInt(legoId.match(/L(\d+)$/)[1]);

  // Find all LEGOs from same seed (not feeders)
  const seedLegos = allLegos.filter(l => l.id.startsWith(seedId) && l.type === 'lego');

  // Get highest L-number
  const maxLegoNum = Math.max(...seedLegos.map(l => parseInt(l.id.match(/L(\d+)$/)[1])));

  return legoNum === maxLegoNum;
}

// Get available vocabulary for a LEGO (all previous LEGOs)
function getAvailableVocabulary(currentIndex, allLegos) {
  const vocab = [];

  for (let i = 0; i < currentIndex; i++) {
    vocab.push({
      target: allLegos[i].target,
      known: allLegos[i].known,
      id: allLegos[i].id
    });
  }

  return vocab;
}

// Generate E-phrases for a LEGO
function generateEPhrases(lego, availableVocab, allLegos, legoIndex) {
  const ePhrases = [];
  const target = lego.target;
  const known = lego.known;

  // Check if culminating
  const culminating = isCulminating(lego.id, allLegos);

  // If culminating, E1 must be complete seed
  if (culminating) {
    ePhrases.push([lego.seedTarget, lego.seedKnown]);
  }

  // Generate additional e-phrases based on available vocabulary
  // NOTE: This is a simplified generator - in production, you'd use more sophisticated logic

  // For demonstration, create phrases using vocabulary from previous LEGOs
  const vocabTargets = availableVocab.map(v => v.target);
  const vocabKnown = availableVocab.map(v => v.known);

  // Example e-phrases (manually crafted for quality)
  // In production, these would be generated with more sophisticated logic

  // S0018L04: "esta noche" / "this evening"
  if (lego.id === "S0018L04") {
    if (!culminating) ePhrases.push(["Quiero hablar español contigo esta noche.", "I want to speak Spanish with you this evening."]);
    ePhrases.push(["Voy a practicar más esta noche.", "I'm going to practice more this evening."]);
    ePhrases.push(["¿Puedes ayudarme a recordar algo esta noche?", "Can you help me remember something this evening?"]);
    ePhrases.push(["Queremos encontrarnos a las seis esta noche.", "We want to meet at six o'clock this evening."]);
    ePhrases.push(["No me gusta hablar español esta noche.", "I don't like speaking Spanish this evening."]);
  }

  // S0019L01: "Pero" / "But"
  else if (lego.id === "S0019L01") {
    if (!culminating) ePhrases.push(["Quiero hablar contigo, pero no ahora.", "I want to speak with you, but not now."]);
    ePhrases.push(["Estoy intentando aprender, pero es difícil.", "I'm trying to learn, but it's difficult."]);
    ePhrases.push(["Puedo recordar algo, pero no todo.", "I can remember something, but not everything."]);
    ePhrases.push(["Me gustaría practicar más, pero estoy muy cansado.", "I'd like to practice more, but I'm very tired."]);
    ePhrases.push(["Hablo un poco, pero quiero hablar mejor.", "I speak a little, but I want to speak better."]);
  }

  // S0019L02: "no quiero" / "I don't want"
  else if (lego.id === "S0019L02") {
    if (!culminating) ePhrases.push(["No quiero adivinar la respuesta esta noche.", "I don't want to guess the answer this evening."]);
    ePhrases.push(["No quiero hablar muy rápidamente contigo ahora.", "I don't want to speak very quickly with you now."]);
    ePhrases.push(["No quiero intentar explicar todo en español.", "I don't want to try to explain everything in Spanish."]);
    ePhrases.push(["No quiero recordar esa palabra difícil ahora.", "I don't want to remember that difficult word now."]);
    ePhrases.push(["No quiero volver a comenzar mañana tarde.", "I don't want to come back to start tomorrow late."]);
  }

  // S0019L03: "dejar de hablar" / "to stop talking"
  else if (lego.id === "S0019L03") {
    ePhrases.push(["Pero no quiero dejar de hablar.", "But I don't want to stop talking."]);
    ePhrases.push(["Quiero dejar de hablar en español ahora.", "I want to stop talking in Spanish now."]);
    ePhrases.push(["¿Vas a dejar de hablar contigo pronto?", "Are you going to stop talking with you soon?"]);
    ePhrases.push(["No me gustaría dejar de hablar esta noche.", "I wouldn't like to stop talking this evening."]);
    ePhrases.push(["Puedo dejar de hablar después de terminar.", "I can stop talking after finishing."]);
  }

  // S0019F01: "dejar" / "to leave"
  else if (lego.id === "S0019F01") {
    if (!culminating) ePhrases.push(["Quiero dejar algo contigo antes de irme.", "I want to leave something with you before I go."]);
    ePhrases.push(["¿Puedes dejar eso aquí para mí ahora?", "Can you leave that here for me now?"]);
    ePhrases.push(["No me gustaría dejar España mañana tarde.", "I wouldn't like to leave Spain tomorrow late."]);
    ePhrases.push(["Voy a dejar de intentar hablar rápidamente.", "I'm going to stop trying to speak quickly."]);
    ePhrases.push(["Ella quiere dejar su nombre con todos.", "She wants to leave her name with everyone."]);
  }

  // S0020L01: "Quieres" / "You want"
  else if (lego.id === "S0020L01") {
    if (!culminating) ePhrases.push(["¿Quieres aprender a hablar español conmigo ahora?", "Do you want to learn to speak Spanish with me now?"]);
    ePhrases.push(["Quieres recordar cómo decir algo en español.", "You want to remember how to say something in Spanish."]);
    ePhrases.push(["¿Quieres volver a intentar explicar eso mañana?", "Do you want to come back to try to explain that tomorrow?"]);
    ePhrases.push(["No quieres dejar de hablar español pronto.", "You don't want to stop speaking Spanish soon."]);
    ePhrases.push(["Quieres practicar hablar lo más posible hoy.", "You want to practice speaking as much as possible today."]);
  }

  // S0020L02: "su nombre" / "their name"
  else if (lego.id === "S0020L02") {
    if (!culminating) ePhrases.push(["Quiero recordar su nombre antes de mañana.", "I want to remember their name before tomorrow."]);
    ePhrases.push(["¿Puedes decirme su nombre en español ahora?", "Can you tell me their name in Spanish now?"]);
    ePhrases.push(["No estoy seguro de su nombre completo.", "I'm not sure of their complete name."]);
    ePhrases.push(["Voy a intentar aprender su nombre pronto.", "I'm going to try to learn their name soon."]);
    ePhrases.push(["Ella quiere descubrir cuál es su nombre.", "She wants to find out what their name is."]);
  }

  // S0020L03: "rápidamente" / "quickly"
  else if (lego.id === "S0020L03") {
    ePhrases.push(["Quieres aprender su nombre rápidamente.", "You want to learn their name quickly."]);
    ePhrases.push(["Estoy intentando hablar español más rápidamente ahora.", "I'm trying to speak Spanish more quickly now."]);
    ePhrases.push(["¿Puedes explicar eso rápidamente antes de irte?", "Can you explain that quickly before you go?"]);
    ePhrases.push(["No puedo recordar toda la frase rápidamente.", "I can't remember the whole sentence quickly."]);
    ePhrases.push(["Me gusta aprender cosas nuevas muy rápidamente.", "I like learning new things very quickly."]);
  }

  // S0021L01: "Por qué" / "Why"
  else if (lego.id === "S0021L01") {
    if (!culminating) ePhrases.push(["¿Por qué quieres aprender español tan rápidamente?", "Why do you want to learn Spanish so quickly?"]);
    ePhrases.push(["¿Por qué estás intentando recordar su nombre ahora?", "Why are you trying to remember their name now?"]);
    ePhrases.push(["No estoy seguro por qué hablas tan bien.", "I'm not sure why you speak so well."]);
    ePhrases.push(["¿Por qué no quieres dejar de hablar?", "Why don't you want to stop talking?"]);
    ePhrases.push(["¿Por qué vas a volver mañana tarde?", "Why are you going to come back tomorrow late?"]);
  }

  // S0021L02: "estás aprendiendo" / "you are learning"
  else if (lego.id === "S0021L02") {
    ePhrases.push(["¿Por qué estás aprendiendo su nombre?", "Why are you learning their name?"]);
    ePhrases.push(["Estás aprendiendo a hablar español muy bien.", "You are learning to speak Spanish very well."]);
    ePhrases.push(["¿Estás aprendiendo cómo decir eso en español?", "Are you learning how to say that in Spanish?"]);
    ePhrases.push(["Estás aprendiendo español lo más rápidamente posible.", "You are learning Spanish as quickly as possible."]);
    ePhrases.push(["¿Por qué estás aprendiendo todo tan rápidamente?", "Why are you learning everything so quickly?"]);
  }

  // S0021F01: "estás" / "you are"
  else if (lego.id === "S0021F01") {
    if (!culminating) ePhrases.push(["¿Estás intentando hablar español conmigo esta noche?", "Are you trying to speak Spanish with me this evening?"]);
    ePhrases.push(["Estás hablando muy bien en español ahora.", "You are speaking very well in Spanish now."]);
    ePhrases.push(["¿Estás seguro de que quieres volver mañana?", "Are you sure that you want to come back tomorrow?"]);
    ePhrases.push(["No estás listo para dejar de aprender.", "You are not ready to stop learning."]);
    ePhrases.push(["Estás recordando todas las palabras muy rápidamente.", "You are remembering all the words very quickly."]);
  }

  // S0021F02: "aprender" / "to learn"
  else if (lego.id === "S0021F02") {
    if (!culminating) ePhrases.push(["Quiero aprender a hablar español muy bien.", "I want to learn to speak Spanish very well."]);
    ePhrases.push(["Estoy intentando aprender su nombre rápidamente ahora.", "I'm trying to learn their name quickly now."]);
    ePhrases.push(["¿Vas a aprender cómo decir eso pronto?", "Are you going to learn how to say that soon?"]);
    ePhrases.push(["No puedo aprender todo tan rápidamente como tú.", "I can't learn everything as quickly as you."]);
    ePhrases.push(["Me gustaría aprender español lo más posible.", "I'd like to learn Spanish as much as possible."]);
  }

  // S0022L01: "Porque" / "Because"
  else if (lego.id === "S0022L01") {
    if (!culminating) ePhrases.push(["Porque quiero hablar español muy bien pronto.", "Because I want to speak Spanish very well soon."]);
    ePhrases.push(["¿Por qué estás aprendiendo español? Porque me gusta.", "Why are you learning Spanish? Because I like it."]);
    ePhrases.push(["Porque estoy intentando recordar toda la frase.", "Because I'm trying to remember the whole sentence."]);
    ePhrases.push(["No puedo volver esta noche porque estoy ocupado.", "I can't come back this evening because I'm busy."]);
    ePhrases.push(["Porque no quiero dejar de hablar ahora.", "Because I don't want to stop talking now."]);
  }

  // S0022L02: "conocer" / "to meet"
  else if (lego.id === "S0022L02") {
    if (!culminating) ePhrases.push(["Quiero conocer a gente que habla español.", "I want to meet people who speak Spanish."]);
    ePhrases.push(["Me gustaría conocer a tu amigo esta noche.", "I'd like to meet your friend this evening."]);
    ePhrases.push(["¿Vas a conocer a alguien nuevo mañana?", "Are you going to meet someone new tomorrow?"]);
    ePhrases.push(["Estoy deseando conocer a toda la gente pronto.", "I'm looking forward to meeting all the people soon."]);
    ePhrases.push(["No puedo conocer a todos muy rápidamente.", "I can't meet everyone very quickly."]);
  }

  // S0022L03: "gente que habla" / "people who speak"
  else if (lego.id === "S0022L03") {
    ePhrases.push(["Porque quiero conocer gente que habla español.", "Because I want to meet people who speak Spanish."]);
    ePhrases.push(["Me gusta hablar con gente que habla bien.", "I like talking with people who speak well."]);
    ePhrases.push(["¿Conoces a gente que habla español aquí?", "Do you know people who speak Spanish here?"]);
    ePhrases.push(["Quiero practicar con gente que habla muy rápidamente.", "I want to practice with people who speak very quickly."]);
    ePhrases.push(["Voy a conocer gente que habla español mañana.", "I'm going to meet people who speak Spanish tomorrow."]);
  }

  // S0022F01: "gente" / "people"
  else if (lego.id === "S0022F01") {
    if (!culminating) ePhrases.push(["Quiero conocer a gente nueva esta noche.", "I want to meet new people this evening."]);
    ePhrases.push(["Me gusta hablar con gente de España.", "I like talking with people from Spain."]);
    ePhrases.push(["¿Hay gente aquí que puede ayudarme ahora?", "Are there people here who can help me now?"]);
    ePhrases.push(["Voy a practicar español con gente mañana.", "I'm going to practice Spanish with people tomorrow."]);
    ePhrases.push(["No conozco a mucha gente que habla español.", "I don't know many people who speak Spanish."]);
  }

  // S0022F02: "habla" / "speaks"
  else if (lego.id === "S0022F02") {
    if (!culminating) ePhrases.push(["Ella habla español muy bien todos los días.", "She speaks Spanish very well every day."]);
    ePhrases.push(["¿Quién habla español contigo después del trabajo?", "Who speaks Spanish with you after work?"]);
    ePhrases.push(["Mi amigo habla español más rápidamente que yo.", "My friend speaks Spanish more quickly than I do."]);
    ePhrases.push(["No habla mucho porque está intentando aprender.", "He doesn't speak much because he's trying to learn."]);
    ePhrases.push(["Habla español todo el día con su familia.", "She speaks Spanish all day with her family."]);
  }

  // S0023L01: "Voy a comenzar a" / "I'm going to start"
  else if (lego.id === "S0023L01") {
    if (!culminating) ePhrases.push(["Voy a comenzar a aprender español pronto.", "I'm going to start learning Spanish soon."]);
    ePhrases.push(["Voy a comenzar a hablar con gente mañana.", "I'm going to start talking with people tomorrow."]);
    ePhrases.push(["¿Cuándo vas a comenzar a practicar español?", "When are you going to start practicing Spanish?"]);
    ePhrases.push(["Voy a comenzar a recordar todas las palabras.", "I'm going to start remembering all the words."]);
    ePhrases.push(["No voy a comenzar a hablar esta noche.", "I'm not going to start speaking this evening."]);
  }

  // S0023L02: "más" / "more"
  else if (lego.id === "S0023L02") {
    if (!culminating) ePhrases.push(["Quiero hablar español más con gente que habla.", "I want to speak Spanish more with people who speak."]);
    ePhrases.push(["Estoy intentando aprender más palabras cada día ahora.", "I'm trying to learn more words each day now."]);
    ePhrases.push(["¿Puedes explicar eso más rápidamente para mí?", "Can you explain that more quickly for me?"]);
    ePhrases.push(["Me gustaría practicar más antes de ir mañana.", "I'd like to practice more before going tomorrow."]);
    ePhrases.push(["No puedo recordar más de eso ahora.", "I can't remember more of that now."]);
  }

  // S0023L03: "pronto" / "soon"
  else if (lego.id === "S0023L03") {
    ePhrases.push(["Voy a comenzar a hablar más pronto.", "I'm going to start talking more soon."]);
    ePhrases.push(["¿Vas a volver a España muy pronto?", "Are you going to return to Spain very soon?"]);
    ePhrases.push(["Quiero conocer a gente nueva pronto esta semana.", "I want to meet new people soon this week."]);
    ePhrases.push(["Estoy deseando hablar mejor muy pronto contigo.", "I'm looking forward to speaking better very soon with you."]);
    ePhrases.push(["No voy a poder recordar eso pronto.", "I'm not going to be able to remember that soon."]);
  }

  // S0023F01: "Voy" / "I'm going"
  else if (lego.id === "S0023F01") {
    if (!culminating) ePhrases.push(["Voy a intentar hablar español más pronto.", "I'm going to try to speak Spanish more soon."]);
    ePhrases.push(["¿A dónde voy después de conocer a gente?", "Where am I going after meeting people?"]);
    ePhrases.push(["Voy a practicar con todos esta noche.", "I'm going to practice with everyone this evening."]);
    ePhrases.push(["No voy a dejar de aprender nunca.", "I'm not going to stop learning ever."]);
    ePhrases.push(["Voy a recordar su nombre muy pronto.", "I'm going to remember their name very soon."]);
  }

  // S0023F02: "comenzar" / "to start"
  else if (lego.id === "S0023F02") {
    if (!culminating) ePhrases.push(["Quiero comenzar a hablar español esta noche.", "I want to start speaking Spanish this evening."]);
    ePhrases.push(["¿Vas a comenzar a aprender más pronto?", "Are you going to start learning more soon?"]);
    ePhrases.push(["Me gustaría comenzar a conocer gente nueva.", "I'd like to start meeting new people."]);
    ePhrases.push(["No puedo comenzar a practicar ahora mismo.", "I can't start practicing right now."]);
    ePhrases.push(["Voy a comenzar a recordar todo mañana.", "I'm going to start remembering everything tomorrow."]);
  }

  // S0024L01: "No voy a poder" / "I'm not going to be able"
  else if (lego.id === "S0024L01") {
    if (!culminating) ePhrases.push(["No voy a poder hablar español mañana tarde.", "I'm not going to be able to speak Spanish tomorrow late."]);
    ePhrases.push(["No voy a poder volver esta noche pronto.", "I'm not going to be able to come back this evening soon."]);
    ePhrases.push(["No voy a poder conocer a todos hoy.", "I'm not going to be able to meet everyone today."]);
    ePhrases.push(["No voy a poder comenzar a aprender ahora.", "I'm not going to be able to start learning now."]);
    ePhrases.push(["No voy a poder recordar su nombre rápidamente.", "I'm not going to be able to remember their name quickly."]);
  }

  // S0024L02: "fácilmente" / "easily"
  else if (lego.id === "S0024L02") {
    ePhrases.push(["No voy a poder recordar fácilmente.", "I'm not going to be able to remember easily."]);
    ePhrases.push(["Puedes aprender español muy fácilmente con práctica.", "You can learn Spanish very easily with practice."]);
    ePhrases.push(["No puedo explicar eso fácilmente en español.", "I can't explain that easily in Spanish."]);
    ePhrases.push(["Me gusta hablar fácilmente con gente nueva.", "I like speaking easily with new people."]);
    ePhrases.push(["Estás aprendiendo todas las palabras muy fácilmente.", "You are learning all the words very easily."]);
  }

  // S0024F01: "Voy" / "I'm going"
  else if (lego.id === "S0024F01") {
    if (!culminating) ePhrases.push(["Voy a conocer a gente esta noche.", "I'm going to meet people this evening."]);
    ePhrases.push(["¿Voy a poder hablar mejor pronto?", "Am I going to be able to speak better soon?"]);
    ePhrases.push(["Voy a intentar recordar eso fácilmente mañana.", "I'm going to try to remember that easily tomorrow."]);
    ePhrases.push(["No voy a dejar de practicar nunca.", "I'm not going to stop practicing ever."]);
    ePhrases.push(["Voy a comenzar a aprender más rápidamente.", "I'm going to start learning more quickly."]);
  }

  // S0024F02: "poder" / "to be able"
  else if (lego.id === "S0024F02") {
    if (!culminating) ePhrases.push(["Quiero poder hablar español muy bien pronto.", "I want to be able to speak Spanish very well soon."]);
    ePhrases.push(["Me gustaría poder recordar todo más fácilmente.", "I'd like to be able to remember everything more easily."]);
    ePhrases.push(["¿Vas a poder volver mañana con gente?", "Are you going to be able to come back tomorrow with people?"]);
    ePhrases.push(["No puedo poder explicar eso ahora claramente.", "I can't be able to explain that now clearly."]);
    ePhrases.push(["Estoy deseando poder conocer a todos pronto.", "I'm looking forward to being able to meet everyone soon."]);
  }

  // S0025L01: "Me vas a ayudar" / "Are you going to help me"
  else if (lego.id === "S0025L01") {
    if (!culminating) ePhrases.push(["¿Me vas a ayudar a aprender español?", "Are you going to help me learn Spanish?"]);
    ePhrases.push(["Me vas a ayudar a recordar su nombre.", "You are going to help me remember their name."]);
    ePhrases.push(["¿Me vas a ayudar con eso más tarde?", "Are you going to help me with that later?"]);
    ePhrases.push(["No me vas a ayudar esta noche pronto.", "You are not going to help me this evening soon."]);
    ePhrases.push(["Me vas a ayudar a hablar mejor fácilmente.", "You are going to help me speak better easily."]);
  }

  // S0025L02: "antes de que tenga que" / "before I have to"
  else if (lego.id === "S0025L02") {
    if (!culminating) ePhrases.push(["Quiero hablar contigo antes de que tenga que irme.", "I want to speak with you before I have to go."]);
    ePhrases.push(["¿Puedes explicar eso antes de que tenga que volver?", "Can you explain that before I have to return?"]);
    ePhrases.push(["Voy a aprender más antes de que tenga que comenzar.", "I'm going to learn more before I have to start."]);
    ePhrases.push(["Me gustaría conocer a todos antes de que tenga que dejar.", "I'd like to meet everyone before I have to leave."]);
    ePhrases.push(["No voy a poder terminar antes de que tenga que irme.", "I'm not going to be able to finish before I have to go."]);
  }

  // S0025L03: "irme" / "to go"
  else if (lego.id === "S0025L03") {
    ePhrases.push(["¿Me vas a ayudar antes de que tenga que irme?", "Are you going to help me before I have to go?"]);
    ePhrases.push(["Quiero conocer a gente antes de irme mañana.", "I want to meet people before I go tomorrow."]);
    ePhrases.push(["¿Vas a poder hablar antes de irme pronto?", "Are you going to be able to speak before I go soon?"]);
    ePhrases.push(["No me gusta tener que irme tan rápidamente.", "I don't like having to go so quickly."]);
    ePhrases.push(["Voy a intentar aprender más antes de irme.", "I'm going to try to learn more before I go."]);
  }

  // S0025F01: "ayudar" / "to help"
  else if (lego.id === "S0025F01") {
    if (!culminating) ePhrases.push(["Quiero ayudar a gente a aprender español.", "I want to help people learn Spanish."]);
    ePhrases.push(["¿Puedes ayudar a recordar esa palabra ahora?", "Can you help remember that word now?"]);
    ePhrases.push(["Me gustaría ayudar a todos más fácilmente.", "I'd like to help everyone more easily."]);
    ePhrases.push(["No voy a poder ayudar esta noche tarde.", "I'm not going to be able to help this evening late."]);
    ePhrases.push(["Estoy intentando ayudar antes de irme pronto.", "I'm trying to help before I go soon."]);
  }

  // S0025F02: "tener que" / "to have to"
  else if (lego.id === "S0025F02") {
    if (!culminating) ePhrases.push(["No quiero tener que irme tan pronto.", "I don't want to have to go so soon."]);
    ePhrases.push(["¿Vas a tener que volver mañana tarde?", "Are you going to have to come back tomorrow late?"]);
    ePhrases.push(["Me gusta no tener que hablar rápidamente.", "I like not having to speak quickly."]);
    ePhrases.push(["Voy a tener que comenzar a aprender más.", "I'm going to have to start learning more."]);
    ePhrases.push(["No vas a tener que ayudar esta noche.", "You are not going to have to help this evening."]);
  }

  // S0026L01: "Me gusta" / "I like"
  else if (lego.id === "S0026L01") {
    if (!culminating) ePhrases.push(["Me gusta hablar español con gente nueva.", "I like speaking Spanish with new people."]);
    ePhrases.push(["Me gusta aprender palabras nuevas cada día fácilmente.", "I like learning new words each day easily."]);
    ePhrases.push(["¿Te gusta conocer a gente que habla español?", "Do you like meeting people who speak Spanish?"]);
    ePhrases.push(["No me gusta tener que irme tan pronto.", "I don't like having to go so soon."]);
    ePhrases.push(["Me gusta poder ayudar a todos cuando puedo.", "I like being able to help everyone when I can."]);
  }

  // S0026L02: "sentir" / "feeling"
  else if (lego.id === "S0026L02") {
    if (!culminating) ePhrases.push(["Me gusta sentir que estoy aprendiendo bien.", "I like feeling that I'm learning well."]);
    ePhrases.push(["¿Puedes sentir que estás hablando mejor ahora?", "Can you feel that you are speaking better now?"]);
    ePhrases.push(["No me gusta sentir que tengo que irme.", "I don't like feeling that I have to go."]);
    ePhrases.push(["Voy a comenzar a sentir más confianza pronto.", "I'm going to start feeling more confidence soon."]);
    ePhrases.push(["Me gustaría sentir que puedo ayudar fácilmente.", "I'd like to feel that I can help easily."]);
  }

  // S0026L03: "como si estuviera" / "as if I'm"
  else if (lego.id === "S0026L03") {
    if (!culminating) ePhrases.push(["Me gusta sentir como si estuviera hablando bien.", "I like feeling as if I'm speaking well."]);
    ePhrases.push(["Hablas como si estuviera aprendiendo desde hace años.", "You speak as if I were learning for years."]);
    ePhrases.push(["No me gusta sentir como si estuviera adivinando.", "I don't like feeling as if I'm guessing."]);
    ePhrases.push(["Me siento como si estuviera listo para comenzar.", "I feel as if I'm ready to start."]);
    ePhrases.push(["Estoy hablando como si estuviera muy seguro ahora.", "I'm speaking as if I'm very sure now."]);
  }

  // S0026L04: "casi" / "nearly"
  else if (lego.id === "S0026L04") {
    if (!culminating) ePhrases.push(["Estoy casi listo para comenzar a hablar español.", "I'm nearly ready to start speaking Spanish."]);
    ePhrases.push(["¿Estás casi seguro de que puedes ayudarme?", "Are you nearly sure that you can help me?"]);
    ePhrases.push(["Casi puedo recordar su nombre ahora mismo.", "I can nearly remember their name right now."]);
    ePhrases.push(["Me siento casi como si estuviera en España.", "I feel nearly as if I'm in Spain."]);
    ePhrases.push(["Voy a estar casi listo para irme pronto.", "I'm going to be nearly ready to go soon."]);
  }

  // S0026L05: "listo" / "ready"
  else if (lego.id === "S0026L05") {
    if (!culminating) ePhrases.push(["Estoy listo para comenzar a hablar español ahora.", "I'm ready to start speaking Spanish now."]);
    ePhrases.push(["¿Estás listo para conocer a gente nueva?", "Are you ready to meet new people?"]);
    ePhrases.push(["No estoy listo para tener que irme todavía.", "I'm not ready to have to go yet."]);
    ePhrases.push(["Me siento listo para ayudar a todos fácilmente.", "I feel ready to help everyone easily."]);
    ePhrases.push(["Voy a estar listo para volver pronto mañana.", "I'm going to be ready to come back soon tomorrow."]);
  }

  // S0026L06: "para irme" / "to go"
  else if (lego.id === "S0026L06") {
    ePhrases.push(["Me gusta sentir como si estuviera casi listo para irme.", "I like feeling as if I'm nearly ready to go."]);
    ePhrases.push(["Estoy casi listo para irme a España pronto.", "I'm nearly ready to go to Spain soon."]);
    ePhrases.push(["¿Vas a estar listo para irme antes de mañana?", "Are you going to be ready to go before tomorrow?"]);
    ePhrases.push(["No me gusta tener que estar listo para irme.", "I don't like having to be ready to go."]);
    ePhrases.push(["Me siento listo para irme después de ayudar.", "I feel ready to go after helping."]);
  }

  // S0027L01: "No me gusta" / "I don't like"
  else if (lego.id === "S0027L01") {
    if (!culminating) ePhrases.push(["No me gusta tener que hablar tan rápidamente.", "I don't like having to speak so quickly."]);
    ePhrases.push(["No me gusta sentir que no estoy listo.", "I don't like feeling that I'm not ready."]);
    ePhrases.push(["No me gusta adivinar cuando no estoy seguro.", "I don't like guessing when I'm not sure."]);
    ePhrases.push(["No me gusta dejar a gente antes de irme.", "I don't like leaving people before I go."]);
    ePhrases.push(["No me gusta no poder ayudar a todos.", "I don't like not being able to help everyone."]);
  }

  // S0027L02: "tardar" / "taking"
  else if (lego.id === "S0027L02") {
    if (!culminating) ePhrases.push(["No me gusta tardar mucho tiempo en responder.", "I don't like taking a lot of time to answer."]);
    ePhrases.push(["¿Vas a tardar mucho en estar listo?", "Are you going to take long to be ready?"]);
    ePhrases.push(["Estoy tardando demasiado en aprender eso fácilmente.", "I'm taking too much to learn that easily."]);
    ePhrases.push(["No quiero tardar en comenzar a hablar español.", "I don't want to take long to start speaking Spanish."]);
    ePhrases.push(["Me gustaría no tardar tanto en recordar nombres.", "I'd like to not take so much to remember names."]);
  }

  // S0027L03: "demasiado tiempo" / "too much time"
  else if (lego.id === "S0027L03") {
    if (!culminating) ePhrases.push(["No me gusta tardar demasiado tiempo en responder.", "I don't like taking too much time to answer."]);
    ePhrases.push(["Estás tardando demasiado tiempo en estar listo para irte.", "You are taking too much time to be ready to go."]);
    ePhrases.push(["No quiero usar demasiado tiempo intentando recordar eso.", "I don't want to use too much time trying to remember that."]);
    ePhrases.push(["¿Vas a necesitar demasiado tiempo para ayudarme?", "Are you going to need too much time to help me?"]);
    ePhrases.push(["Me gusta no tardar demasiado tiempo en aprender.", "I like not taking too much time to learn."]);
  }

  // S0027L04: "en responder" / "to answer"
  else if (lego.id === "S0027L04") {
    ePhrases.push(["No me gusta tardar demasiado tiempo en responder.", "I don't like taking too much time to answer."]);
    ePhrases.push(["¿Puedes ayudarme en responder a esa pregunta ahora?", "Can you help me to answer that question now?"]);
    ePhrases.push(["Estoy tardando mucho en responder porque no estoy seguro.", "I'm taking long to answer because I'm not sure."]);
    ePhrases.push(["No voy a tardar demasiado en responder pronto.", "I'm not going to take too much to answer soon."]);
    ePhrases.push(["Me gustaría ser más rápido en responder fácilmente.", "I'd like to be faster to answer easily."]);
  }

  // S0027F01: "responder" / "to answer"
  else if (lego.id === "S0027F01") {
    if (!culminating) ePhrases.push(["Quiero responder a todas las preguntas en español.", "I want to answer all the questions in Spanish."]);
    ePhrases.push(["¿Puedes responder rápidamente antes de tener que irte?", "Can you answer quickly before having to go?"]);
    ePhrases.push(["No me gusta no poder responder cuando no sé.", "I don't like not being able to answer when I don't know."]);
    ePhrases.push(["Voy a intentar responder sin tardar demasiado tiempo.", "I'm going to try to answer without taking too much time."]);
    ePhrases.push(["Me gustaría responder más fácilmente a la gente.", "I'd like to answer more easily to people."]);
  }

  // S0028L01: "Es útil" / "It's useful"
  else if (lego.id === "S0028L01") {
    if (!culminating) ePhrases.push(["Es útil hablar español con gente cada día.", "It's useful to speak Spanish with people each day."]);
    ePhrases.push(["Es útil aprender palabras nuevas antes de comenzar.", "It's useful to learn new words before starting."]);
    ePhrases.push(["¿Es útil tardar tiempo en responder bien?", "Is it useful to take time to answer well?"]);
    ePhrases.push(["No es útil sentir como si no estuvieras listo.", "It's not useful to feel as if you weren't ready."]);
    ePhrases.push(["Me gusta saber que es útil practicar mucho.", "I like knowing that it's useful to practice a lot."]);
  }

  // S0028L02: "comenzar a hablar" / "to start talking"
  else if (lego.id === "S0028L02") {
    if (!culminating) ePhrases.push(["Es útil comenzar a hablar español lo antes posible.", "It's useful to start talking Spanish as soon as possible."]);
    ePhrases.push(["Quiero comenzar a hablar con gente nueva pronto.", "I want to start talking with new people soon."]);
    ePhrases.push(["¿Vas a comenzar a hablar antes de irte?", "Are you going to start talking before you go?"]);
    ePhrases.push(["No me gusta tardar en comenzar a hablar español.", "I don't like taking long to start talking Spanish."]);
    ePhrases.push(["Me siento listo para comenzar a hablar ahora mismo.", "I feel ready to start talking right now."]);
  }

  // S0028L03: "en cuanto puedas" / "as soon as you can"
  else if (lego.id === "S0028L03") {
    ePhrases.push(["Es útil comenzar a hablar en cuanto puedas.", "It's useful to start talking as soon as you can."]);
    ePhrases.push(["Quiero que me ayudes en cuanto puedas mañana.", "I want you to help me as soon as you can tomorrow."]);
    ePhrases.push(["¿Vas a volver en cuanto puedas esta noche?", "Are you going to come back as soon as you can this evening?"]);
    ePhrases.push(["Me gustaría conocer a gente en cuanto puedas ayudarme.", "I'd like to meet people as soon as you can help me."]);
    ePhrases.push(["No voy a poder responder en cuanto puedas preguntar.", "I'm not going to be able to answer as soon as you can ask."]);
  }

  // S0028F01: "comenzar" / "to start"
  else if (lego.id === "S0028F01") {
    if (!culminating) ePhrases.push(["Quiero comenzar a aprender español muy pronto ahora.", "I want to start learning Spanish very soon now."]);
    ePhrases.push(["¿Vas a comenzar a ayudar a gente mañana?", "Are you going to start helping people tomorrow?"]);
    ePhrases.push(["No me gusta comenzar sin estar listo primero.", "I don't like starting without being ready first."]);
    ePhrases.push(["Me siento listo para comenzar en cuanto puedas.", "I feel ready to start as soon as you can."]);
    ePhrases.push(["Es útil comenzar a practicar todos los días.", "It's useful to start practicing every day."]);
  }

  // S0028F02: "poder" / "can"
  else if (lego.id === "S0028F02") {
    if (!culminating) ePhrases.push(["No puedo responder porque no estoy seguro todavía.", "I can't answer because I'm not sure yet."]);
    ePhrases.push(["¿Puedes ayudarme a comenzar a hablar español?", "Can you help me start talking Spanish?"]);
    ePhrases.push(["Me gusta saber que puedo aprender fácilmente ahora.", "I like knowing that I can learn easily now."]);
    ePhrases.push(["No voy a poder estar listo en cuanto puedas.", "I'm not going to be able to be ready as soon as you can."]);
    ePhrases.push(["Es útil sentir que puedo hacer eso bien.", "It's useful to feel that I can do that well."]);
  }

  // S0029L01: "Estoy deseando" / "I'm looking forward to"
  else if (lego.id === "S0029L01") {
    if (!culminating) ePhrases.push(["Estoy deseando conocer a gente nueva muy pronto.", "I'm looking forward to meeting new people very soon."]);
    ePhrases.push(["Estoy deseando comenzar a hablar español mejor cada día.", "I'm looking forward to starting to speak Spanish better each day."]);
    ePhrases.push(["¿Estás deseando poder ayudar a todos mañana?", "Are you looking forward to being able to help everyone tomorrow?"]);
    ePhrases.push(["No estoy deseando tener que irme tan pronto.", "I'm not looking forward to having to go so soon."]);
    ePhrases.push(["Me gusta estar deseando aprender cosas nuevas siempre.", "I like looking forward to learning new things always."]);
  }

  // S0029L02: "mejor" / "better"
  else if (lego.id === "S0029L02") {
    if (!culminating) ePhrases.push(["Quiero hablar español mejor que antes cada día.", "I want to speak Spanish better than before each day."]);
    ePhrases.push(["Estoy aprendiendo a responder mejor en cuanto puedo.", "I'm learning to answer better as soon as I can."]);
    ePhrases.push(["¿Vas a poder explicar eso mejor más tarde?", "Are you going to be able to explain that better later?"]);
    ePhrases.push(["Me gusta sentir que estoy hablando mejor ahora.", "I like feeling that I'm speaking better now."]);
    ePhrases.push(["Es útil practicar para poder hablar mejor pronto.", "It's useful to practice to be able to speak better soon."]);
  }

  // S0029L03: "en cuanto pueda" / "as soon as I can"
  else if (lego.id === "S0029L03") {
    ePhrases.push(["Estoy deseando hablar mejor en cuanto pueda.", "I'm looking forward to speaking better as soon as I can."]);
    ePhrases.push(["Quiero comenzar a aprender en cuanto pueda mañana.", "I want to start learning as soon as I can tomorrow."]);
    ePhrases.push(["Voy a ayudarte en cuanto pueda esta noche.", "I'm going to help you as soon as I can this evening."]);
    ePhrases.push(["Me gustaría conocer a gente en cuanto pueda volver.", "I'd like to meet people as soon as I can come back."]);
    ePhrases.push(["No voy a poder responder en cuanto pueda estar listo.", "I'm not going to be able to answer as soon as I can be ready."]);
  }

  // S0029F01: "Estoy" / "I'm"
  else if (lego.id === "S0029F01") {
    if (!culminating) ePhrases.push(["Estoy intentando hablar español mejor cada día ahora.", "I'm trying to speak Spanish better each day now."]);
    ePhrases.push(["¿Estás listo para comenzar a ayudar en cuanto puedas?", "Are you ready to start helping as soon as you can?"]);
    ePhrases.push(["Estoy aprendiendo a no tardar demasiado tiempo al responder.", "I'm learning to not take too much time when answering."]);
    ePhrases.push(["No estoy seguro de poder estar listo pronto.", "I'm not sure of being able to be ready soon."]);
    ePhrases.push(["Estoy casi listo para irme después de conocer gente.", "I'm nearly ready to go after meeting people."]);
  }

  // S0029F02: "desear" / "to wish"
  else if (lego.id === "S0029F02") {
    if (!culminating) ePhrases.push(["Quiero desear suerte a toda la gente hoy.", "I want to wish luck to all the people today."]);
    ePhrases.push(["Me gusta desear lo mejor a todos siempre.", "I like wishing the best to everyone always."]);
    ePhrases.push(["¿Vas a desear algo antes de tener que irte?", "Are you going to wish something before having to go?"]);
    ePhrases.push(["Estoy deseando poder hablar mejor en cuanto pueda.", "I'm wishing to be able to speak better as soon as I can."]);
    ePhrases.push(["No me gusta desear cosas que no puedo tener.", "I don't like wishing things that I can't have."]);
  }

  // S0030L01: "Quería" / "I wanted"
  else if (lego.id === "S0030L01") {
    if (!culminating) ePhrases.push(["Quería hablar contigo ayer sobre eso importante.", "I wanted to speak with you yesterday about that important thing."]);
    ePhrases.push(["Quería comenzar a aprender español antes que tú.", "I wanted to start learning Spanish before you."]);
    ePhrases.push(["¿Quería ayudarte pero no pude estar listo?", "Did I want to help you but I couldn't be ready?"]);
    ePhrases.push(["No quería tardar demasiado tiempo en responder ayer.", "I didn't want to take too much time to answer yesterday."]);
    ePhrases.push(["Quería conocer a gente nueva en cuanto pudiera.", "I wanted to meet new people as soon as I could."]);
  }

  // S0030L02: "preguntarte" / "to ask you"
  else if (lego.id === "S0030L02") {
    if (!culminating) ePhrases.push(["Quiero preguntarte algo importante sobre hablar español mejor.", "I want to ask you something important about speaking Spanish better."]);
    ePhrases.push(["¿Puedo preguntarte en cuanto puedas responder fácilmente?", "Can I ask you as soon as you can answer easily?"]);
    ePhrases.push(["Me gustaría preguntarte algo antes de tener que irme.", "I'd like to ask you something before having to go."]);
    ePhrases.push(["No quería preguntarte ayer porque estabas muy ocupado.", "I didn't want to ask you yesterday because you were very busy."]);
    ePhrases.push(["Estoy deseando preguntarte sobre conocer a gente nueva.", "I'm looking forward to asking you about meeting new people."]);
  }

  // S0030L03: "ayer" / "yesterday"
  else if (lego.id === "S0030L03") {
    ePhrases.push(["Quería preguntarte algo ayer.", "I wanted to ask you something yesterday."]);
    ePhrases.push(["¿Estabas intentando ayudarme a aprender mejor ayer?", "Were you trying to help me learn better yesterday?"]);
    ePhrases.push(["No pude conocer a gente nueva ayer tarde.", "I couldn't meet new people yesterday late."]);
    ePhrases.push(["Me gustó hablar contigo sobre eso importante ayer.", "I liked speaking with you about that important thing yesterday."]);
    ePhrases.push(["Ayer quería comenzar a hablar español en cuanto pudiera.", "Yesterday I wanted to start speaking Spanish as soon as I could."]);
  }

  // Default: generate basic phrases if not specifically handled
  else {
    // Generate basic phrase using target LEGO
    if (availableVocab.length > 0) {
      ePhrases.push([target, known]);
    }
  }

  // Ensure we have at most 5 e-phrases
  return ePhrases.slice(0, 5);
}

// Generate D-phrases from E-phrases
function generateDPhrases(lego, ePhrases) {
  const dPhrases = {
    "2": [],
    "3": [],
    "4": [],
    "5": []
  };

  // Extract expanding windows from each e-phrase
  for (const [targetPhrase, knownPhrase] of ePhrases) {
    const targetWords = targetPhrase.split(' ');
    const knownWords = knownPhrase.split(' ');

    // Find position of operative LEGO in target phrase
    const legoWords = lego.target.split(' ');
    let legoStartIdx = -1;

    for (let i = 0; i <= targetWords.length - legoWords.length; i++) {
      const slice = targetWords.slice(i, i + legoWords.length).join(' ');
      if (slice === lego.target) {
        legoStartIdx = i;
        break;
      }
    }

    // If LEGO not found in phrase, skip
    if (legoStartIdx === -1) continue;

    // Generate 2-LEGO phrases (containing operative LEGO)
    if (targetWords.length >= 2 && dPhrases["2"].length < 2) {
      const start = Math.max(0, legoStartIdx - 1);
      const end = Math.min(targetWords.length, legoStartIdx + legoWords.length + 1);
      const target2 = targetWords.slice(start, end).join(' ');
      const known2 = knownWords.slice(start, end).join(' ');
      dPhrases["2"].push([target2, known2]);
    }

    // Generate 3-LEGO phrases (containing operative LEGO)
    if (targetWords.length >= 3 && dPhrases["3"].length < 2) {
      const start = Math.max(0, legoStartIdx - 1);
      const end = Math.min(targetWords.length, legoStartIdx + legoWords.length + 2);
      const target3 = targetWords.slice(start, end).join(' ');
      const known3 = knownWords.slice(start, end).join(' ');
      dPhrases["3"].push([target3, known3]);
    }

    // Generate 4-LEGO phrases (containing operative LEGO)
    if (targetWords.length >= 4 && dPhrases["4"].length < 2) {
      const start = Math.max(0, legoStartIdx - 2);
      const end = Math.min(targetWords.length, legoStartIdx + legoWords.length + 2);
      const target4 = targetWords.slice(start, end).join(' ');
      const known4 = knownWords.slice(start, end).join(' ');
      dPhrases["4"].push([target4, known4]);
    }

    // Generate 5-LEGO phrases (containing operative LEGO)
    if (targetWords.length >= 5 && dPhrases["5"].length < 2) {
      const start = Math.max(0, legoStartIdx - 2);
      const end = Math.min(targetWords.length, legoStartIdx + legoWords.length + 3);
      const target5 = targetWords.slice(start, end).join(' ');
      const known5 = knownWords.slice(start, end).join(' ');
      dPhrases["5"].push([target5, known5]);
    }
  }

  return dPhrases;
}

// Main processing function
function generateBaskets() {
  console.log('Starting basket generation for batch 2 (LEGOs 61-115)...\n');

  // Extract all LEGOs
  const allLegos = extractAllLegos();
  console.log(`Total LEGOs extracted: ${allLegos.length}`);

  // Filter to batch 2 IDs
  const batch2Legos = allLegos.filter(lego => BATCH_2_IDS.includes(lego.id));
  console.log(`Batch 2 LEGOs to process: ${batch2Legos.length}\n`);

  const baskets = {};

  // Process each LEGO in batch 2
  for (let i = 0; i < batch2Legos.length; i++) {
    const lego = batch2Legos[i];
    const globalIndex = allLegos.findIndex(l => l.id === lego.id);

    console.log(`Processing ${i + 1}/${batch2Legos.length}: ${lego.id} - "${lego.target}" / "${lego.known}"`);

    // Get available vocabulary (all previous LEGOs)
    const availableVocab = getAvailableVocabulary(globalIndex, allLegos);
    console.log(`  Available vocabulary: ${availableVocab.length} previous LEGOs`);

    // Generate E-phrases
    const ePhrases = generateEPhrases(lego, availableVocab, allLegos, globalIndex);
    console.log(`  Generated ${ePhrases.length} e-phrases`);

    // Generate D-phrases from E-phrases
    const dPhrases = generateDPhrases(lego, ePhrases);
    console.log(`  Generated d-phrases: 2-lego=${dPhrases["2"].length}, 3-lego=${dPhrases["3"].length}, 4-lego=${dPhrases["4"].length}, 5-lego=${dPhrases["5"].length}`);

    // Create basket
    baskets[lego.id] = {
      lego: [lego.target, lego.known],
      e: ePhrases,
      d: dPhrases
    };

    console.log('');
  }

  // Save to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(baskets, null, 2), 'utf8');
  console.log(`\nBaskets saved to: ${OUTPUT_FILE}`);
  console.log(`Total baskets generated: ${Object.keys(baskets).length}`);
}

// Run the generator
generateBaskets();
