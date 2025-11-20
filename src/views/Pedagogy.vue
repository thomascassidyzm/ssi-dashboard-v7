<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-5xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <h1 class="text-4xl font-bold text-emerald-400 mb-2">SSi Pedagogical Model</h1>
        <p class="text-slate-400">What is SSi teaching, and how?</p>
        <p class="text-sm text-slate-500 mt-2">Conceptual foundation for the SSi language learning system | APML v8.2.0</p>
      </div>

      <!-- Core Concepts -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Core Concepts</h2>

        <!-- What is a LEGO? -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-4">What is a LEGO?</h3>
          <p class="text-slate-300 mb-4">
            A <strong>LEGO</strong> is a discrete unit of learning - the smallest "building block" that a learner masters as a single piece.
          </p>
          <p class="text-slate-400 text-sm italic mb-4">
            Think of it like learning to code: you learn individual functions one at a time, then combine them into programs.
          </p>

          <div class="space-y-4">
            <!-- Base -->
            <div class="bg-slate-900 p-4 rounded border-l-4 border-blue-500">
              <h4 class="text-lg font-semibold text-blue-300 mb-2">Base (B): Atomic Units</h4>
              <p class="text-slate-300 text-sm mb-2"><strong>Definition:</strong> Indivisible language chunks that cannot be broken down further</p>
              <p class="text-slate-400 text-sm mb-2"><strong>Examples:</strong></p>
              <ul class="list-disc list-inside text-slate-300 text-sm space-y-1 ml-4">
                <li>Spanish: "Quiero" (I want), "hablar" (to speak), "ahora" (now)</li>
                <li>Italian: "Voglio" (I want), "parlare" (to speak), "adesso" (now)</li>
              </ul>
              <p class="text-slate-400 text-sm mt-2"><strong>Teaching approach:</strong> Taught as a single atomic piece</p>
            </div>

            <!-- Feeder -->
            <div class="bg-slate-900 p-4 rounded border-l-4 border-amber-500">
              <h4 class="text-lg font-semibold text-amber-300 mb-2">Feeder (F): Component Parts</h4>
              <p class="text-slate-300 text-sm mb-2"><strong>Definition:</strong> Parts of a larger phrase, taught FIRST to reduce cognitive load</p>
              <p class="text-slate-400 text-sm mb-2"><strong>Examples:</strong></p>
              <ul class="list-disc list-inside text-slate-300 text-sm space-y-1 ml-4">
                <li>Spanish: "Estoy" (I'm), "intentando" (trying) → will combine into "Estoy intentando"</li>
                <li>Italian: "Sto" (I'm), "provando" (trying) → will combine into "Sto provando"</li>
              </ul>
              <p class="text-emerald-400 text-sm mt-2"><strong>Cognitive load:</strong> 1 new thing per step (each feeder separately)</p>
            </div>

            <!-- Composite -->
            <div class="bg-slate-900 p-4 rounded border-l-4 border-emerald-500">
              <h4 class="text-lg font-semibold text-emerald-300 mb-2">Composite (C): Combined Phrases</h4>
              <p class="text-slate-300 text-sm mb-2"><strong>Definition:</strong> Combination of feeders, taught AFTER parts are already known</p>
              <p class="text-slate-400 text-sm mb-2"><strong>Examples:</strong></p>
              <ul class="list-disc list-inside text-slate-300 text-sm space-y-1 ml-4">
                <li>Spanish: "Estoy intentando" (I'm trying) ← learner already knows "Estoy" + "intentando"</li>
                <li>Italian: "Sto provando" (I'm trying) ← learner already knows "Sto" + "provando"</li>
              </ul>
              <p class="text-emerald-400 text-sm mt-2"><strong>Cognitive load:</strong> 1 new thing (just learning how parts combine)</p>
            </div>
          </div>

          <!-- Why Feeders First -->
          <div class="bg-amber-900/20 p-4 rounded border border-amber-700 mt-4">
            <h4 class="text-amber-300 font-semibold mb-2">🎯 Why Feeders → Composites?</h4>
            <div class="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-emerald-300 font-medium mb-1">✅ SSi Method (Feeders First)</p>
                <ol class="list-decimal list-inside text-slate-300 space-y-1">
                  <li>Learn "Estoy" separately → easy ✅</li>
                  <li>Learn "intentando" separately → easy ✅</li>
                  <li>See "Estoy intentando" → recognize both, just learn combination → easy ✅</li>
                </ol>
                <p class="text-xs text-slate-400 mt-2">Total: 3 steps, each manageable</p>
              </div>
              <div>
                <p class="text-red-300 font-medium mb-1">❌ Traditional Method (Composite First)</p>
                <ol class="list-decimal list-inside text-slate-300 space-y-1">
                  <li>See "Estoy intentando" for first time</li>
                  <li>Must understand: What is "Estoy"? ❓</li>
                  <li>Must understand: What is "intentando"? ❓</li>
                  <li>Must understand: How do they combine? ❓</li>
                </ol>
                <p class="text-xs text-slate-400 mt-2">Total: 3 unknowns simultaneously → overwhelming ❌</p>
              </div>
            </div>
          </div>
        </div>

        <!-- What is a Basket? -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-4">What is a Basket?</h3>
          <p class="text-slate-300 mb-4">
            A <strong>basket</strong> is NOT a random collection of practice phrases.
          </p>
          <p class="text-slate-300 mb-4">
            A basket is a <strong>demonstration of how THIS LEGO plugs into LEGOs the learner ALREADY knows.</strong>
          </p>

          <div class="bg-blue-900/20 p-4 rounded border border-blue-700 mb-4">
            <h4 class="text-blue-300 font-semibold mb-2">💻 The API Documentation Metaphor</h4>
            <div class="space-y-2 text-sm">
              <div class="flex items-start">
                <span class="text-emerald-400 mr-2">•</span>
                <p class="text-slate-300"><strong>LEGO</strong> = new function you're learning (e.g., <code class="bg-slate-800 px-1 rounded">filter()</code>)</p>
              </div>
              <div class="flex items-start">
                <span class="text-emerald-400 mr-2">•</span>
                <p class="text-slate-300"><strong>Basket</strong> = code examples showing how to use this function</p>
              </div>
              <div class="flex items-start">
                <span class="text-emerald-400 mr-2">•</span>
                <p class="text-slate-300"><strong>Available vocabulary</strong> = variables/functions already defined in previous code</p>
              </div>
              <div class="flex items-start">
                <span class="text-red-400 mr-2">•</span>
                <p class="text-slate-300"><strong>Iron Rule</strong> = You cannot use undefined variables in your examples</p>
              </div>
            </div>
          </div>

          <h4 class="text-slate-300 font-semibold mb-2">Each basket shows:</h4>
          <ol class="list-decimal list-inside text-slate-300 space-y-2 ml-4">
            <li>How the new LEGO interfaces with prior knowledge</li>
            <li>Different contexts where the LEGO can be used</li>
            <li>Progressive complexity (two types of practice phrases)</li>
          </ol>
        </div>

        <!-- E-phrases vs D-phrases -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-4">E-phrases vs D-phrases: The Critical Distinction</h3>
          <p class="text-slate-400 mb-4 italic">This is a fundamental pedagogical distinction explaining WHY we have two types of practice phrases:</p>

          <div class="grid md:grid-cols-2 gap-4 mb-4">
            <!-- E-phrases -->
            <div class="bg-slate-900 p-4 rounded border-l-4 border-emerald-500">
              <h4 class="text-emerald-300 font-semibold mb-3">ETERNAL (E-phrases)</h4>
              <div class="space-y-3 text-sm">
                <div>
                  <p class="text-emerald-400 font-medium">⏰ WHEN USED:</p>
                  <p class="text-slate-300">At ANY point in the course AFTER this LEGO's introduction</p>
                  <p class="text-slate-400 text-xs">Reusable FOREVER throughout the entire course</p>
                </div>
                <div>
                  <p class="text-amber-400 font-medium">🔁 FREQUENCY:</p>
                  <p class="text-slate-300">Practiced hundreds of times</p>
                  <p class="text-slate-400 text-xs">Learner at lesson #50 practicing LEGO #10 → uses these e-phrases</p>
                </div>
                <div>
                  <p class="text-red-400 font-medium">✅ QUALITY:</p>
                  <p class="text-slate-300">MUST be excellent - natural, conversational (7-10 words)</p>
                  <p class="text-slate-400 text-xs">Perfect grammar in BOTH languages</p>
                </div>
              </div>
              <div class="mt-3 pt-3 border-t border-slate-700">
                <p class="text-xs text-slate-400 mb-1">Example for "Quiero":</p>
                <p class="text-slate-300 text-xs italic">"Quiero hablar español contigo ahora mismo aquí"</p>
              </div>
            </div>

            <!-- D-phrases -->
            <div class="bg-slate-900 p-4 rounded border-l-4 border-blue-500">
              <h4 class="text-blue-300 font-semibold mb-3">DEBUT (D-phrases)</h4>
              <div class="space-y-3 text-sm">
                <div>
                  <p class="text-emerald-400 font-medium">⏰ WHEN USED:</p>
                  <p class="text-slate-300">ONLY during this LEGO's FIRST introduction</p>
                  <p class="text-slate-400 text-xs">Used ONCE, never repeated thereafter</p>
                </div>
                <div>
                  <p class="text-amber-400 font-medium">🔁 FREQUENCY:</p>
                  <p class="text-slate-300">Temporary scaffolding</p>
                  <p class="text-slate-400 text-xs">Shown once during debut, then discarded forever</p>
                </div>
                <div>
                  <p class="text-blue-400 font-medium">✅ QUALITY:</p>
                  <p class="text-slate-300">Syntactically correct, but CAN be awkward fragments</p>
                  <p class="text-slate-400 text-xs">Focus on progressive difficulty, not naturalness</p>
                </div>
              </div>
              <div class="mt-3 pt-3 border-t border-slate-700">
                <p class="text-xs text-slate-400 mb-1">Examples for "Quiero" (first introduction):</p>
                <p class="text-slate-300 text-xs italic">2-LEGO: "Quiero hablar"</p>
                <p class="text-slate-300 text-xs italic">3-LEGO: "Quiero hablar español"</p>
                <p class="text-slate-300 text-xs italic">4-LEGO: "Quiero hablar español contigo"</p>
              </div>
            </div>
          </div>

          <!-- Analogy -->
          <div class="bg-amber-900/20 p-4 rounded border border-amber-700">
            <h4 class="text-amber-300 font-semibold mb-2">🚴 Analogy: Learning to Ride a Bicycle</h4>
            <div class="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p class="text-emerald-300 font-medium mb-1">E-phrases = Actual Cycling</p>
                <p class="text-slate-300">Used forever after you've learned</p>
                <p class="text-slate-400 text-xs mt-1">These are the permanent practice sentences for this LEGO</p>
              </div>
              <div>
                <p class="text-blue-300 font-medium mb-1">D-phrases = Training Wheels</p>
                <p class="text-slate-300">Used once during initial learning, then removed</p>
                <p class="text-slate-400 text-xs mt-1">Temporary scaffolding to help build understanding</p>
              </div>
            </div>
            <p class="text-slate-400 text-xs mt-3 italic">
              You wouldn't keep training wheels on forever - that's why d-phrases are discarded after debut.<br>
              You wouldn't start without training wheels - that's why d-phrases exist for first introduction.
            </p>
          </div>
        </div>

        <!-- Vocabulary Constraint -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
          <h3 class="text-xl font-semibold text-emerald-300 mb-4">The Vocabulary Constraint: The Iron Law</h3>
          <p class="text-slate-300 mb-4">
            <strong>Core Principle:</strong> A basket can ONLY use LEGOs the learner has already mastered.
          </p>

          <div class="bg-red-900/20 p-4 rounded border border-red-700 mb-4">
            <h4 class="text-red-300 font-semibold mb-2">Why This Matters</h4>
            <ul class="list-disc list-inside text-slate-300 space-y-2 text-sm">
              <li>Zero unknowns except the LEGO being taught = manageable cognitive load</li>
              <li>Learner can focus 100% on the new LEGO, not distracted by unknown words</li>
              <li>Every practice phrase is immediately comprehensible</li>
            </ul>
          </div>

          <div class="bg-slate-900 p-4 rounded">
            <h4 class="text-slate-300 font-semibold mb-3">How It Works: Progressive Vocabulary Accumulation</h4>
            <div class="space-y-2 text-sm font-mono text-slate-400">
              <p>Position #1: LEGO A → Available vocabulary: [] (empty)</p>
              <p>Position #2: LEGO B → Available vocabulary: [A]</p>
              <p>Position #3: LEGO C → Available vocabulary: [A, B]</p>
              <p>Position #4: LEGO D → Available vocabulary: [A, B, C]</p>
              <p class="text-emerald-400">...</p>
              <p>Position #N: LEGO Z → Available vocabulary: [A, B, C, ..., Y]</p>
            </div>
            <p class="text-amber-400 text-xs mt-3 font-semibold">
              ⚠️ Type (Base/Feeder/Composite) has ZERO effect on vocabulary availability!<br>
              ONLY chronological position matters.
            </p>
          </div>
        </div>
      </section>

      <!-- Why This System Works -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Why This System Works</h2>

        <div class="grid md:grid-cols-2 gap-6">
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">1. Graduated Cognitive Load</h3>
            <ul class="list-disc list-inside text-slate-300 space-y-2 text-sm">
              <li>Each LEGO introduces exactly ONE new concept</li>
              <li>Practice phrases contain ZERO unknowns except the LEGO being taught</li>
              <li>Learner never overwhelmed</li>
            </ul>
          </div>

          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">2. Cumulative Knowledge Building</h3>
            <ul class="list-disc list-inside text-slate-300 space-y-2 text-sm">
              <li>Each new LEGO builds on all previous LEGOs</li>
              <li>No "islands" of knowledge - everything connects</li>
              <li>Confidence compounds over time</li>
            </ul>
          </div>

          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">3. Meaningful Practice</h3>
            <ul class="list-disc list-inside text-slate-300 space-y-2 text-sm">
              <li>Every practice phrase is immediately comprehensible</li>
              <li>Learner sees how new knowledge integrates with existing knowledge</li>
              <li>Natural language use from day one (using available vocabulary)</li>
            </ul>
          </div>

          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-emerald-300 mb-3">4. Efficient Learning</h3>
            <ul class="list-disc list-inside text-slate-300 space-y-2 text-sm">
              <li>No wasted time on incomprehensible input</li>
              <li>Every practice session = 100% productive time</li>
              <li>Faster progress through clear, structured progression</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <div class="text-center text-slate-500 text-sm border-t border-slate-700 pt-6">
        <p>This document explains the "why" behind the system.</p>
        <p class="mt-2">
          For technical implementation details, see
          <router-link to="/reference/terminology" class="text-emerald-400 hover:text-emerald-300">Terminology Glossary</router-link>
          and the APML specification.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
// Pure presentation component - no logic needed
</script>
