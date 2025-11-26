<template>
  <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">
    <h2 class="text-2xl font-semibold text-slate-100 mb-6">Skills Architecture</h2>

    <!-- Legend -->
    <div class="flex gap-6 mb-8 text-sm">
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 bg-emerald-500 rounded"></div>
        <span class="text-slate-300">Uses Skill</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 bg-blue-500 rounded"></div>
        <span class="text-slate-300">Phase</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4 bg-purple-500 rounded"></div>
        <span class="text-slate-300">Orchestrator</span>
      </div>
    </div>

    <!-- Architecture Diagram -->
    <div class="relative overflow-x-auto">
      <svg viewBox="0 0 1200 800" class="w-full" style="min-width: 1000px;">

        <!-- Dashboard (Top) -->
        <g>
          <rect x="450" y="20" width="300" height="60" fill="#1e293b" stroke="#10b981" stroke-width="2" rx="8"/>
          <text x="600" y="55" text-anchor="middle" fill="#10b981" font-size="18" font-weight="bold">Dashboard (SSoT)</text>
        </g>

        <!-- Phase Intelligence & Skills Library (Second Row) -->
        <g>
          <!-- Phase Intelligence -->
          <rect x="200" y="140" width="350" height="80" fill="#1e293b" stroke="#10b981" stroke-width="2" rx="8"/>
          <text x="375" y="170" text-anchor="middle" fill="#10b981" font-size="16" font-weight="bold">🧠 Phase Intelligence</text>
          <text x="375" y="195" text-anchor="middle" fill="#94a3b8" font-size="13">Orchestrator Prompts</text>

          <!-- Skills Library -->
          <rect x="650" y="140" width="350" height="80" fill="#1e293b" stroke="#10b981" stroke-width="2" rx="8"/>
          <text x="825" y="170" text-anchor="middle" fill="#10b981" font-size="16" font-weight="bold">🛠️ Skills Library</text>
          <text x="825" y="195" text-anchor="middle" fill="#94a3b8" font-size="13">Progressive Disclosure Modules</text>
        </g>

        <!-- Connection lines from Dashboard -->
        <line x1="520" y1="80" x2="375" y2="140" stroke="#475569" stroke-width="2"/>
        <line x1="680" y1="80" x2="825" y2="140" stroke="#475569" stroke-width="2"/>

        <!-- Phase Orchestrators (Third Row) -->
        <g v-for="(phase, index) in phases" :key="phase.id" :transform="`translate(${50 + index * 280}, 280)`">
          <!-- Orchestrator Box -->
          <rect x="0" y="0" width="250" height="100" fill="#312e81" stroke="#8b5cf6" stroke-width="2" rx="8"/>
          <text x="125" y="30" text-anchor="middle" fill="#a78bfa" font-size="14" font-weight="bold">
            Phase {{ phase.id }} Orchestrator
          </text>
          <text x="125" y="55" text-anchor="middle" fill="#cbd5e1" font-size="12">
            {{ phase.name }}
          </text>

          <!-- Skill badge if phase uses skill -->
          <rect v-if="phase.skill" x="30" y="70" width="190" height="20" fill="#10b981" rx="4" opacity="0.2"/>
          <text v-if="phase.skill" x="125" y="85" text-anchor="middle" fill="#10b981" font-size="11" font-weight="bold">
            uses: {{ phase.skill }}
          </text>
        </g>

        <!-- Connection lines from Phase Intelligence to Orchestrators -->
        <line x1="375" y1="220" x2="125" y2="280" stroke="#475569" stroke-width="1" stroke-dasharray="5,5"/>
        <line x1="375" y1="220" x2="405" y2="280" stroke="#475569" stroke-width="1" stroke-dasharray="5,5"/>
        <line x1="375" y1="220" x2="685" y2="280" stroke="#475569" stroke-width="1" stroke-dasharray="5,5"/>
        <line x1="375" y1="220" x2="965" y2="280" stroke="#475569" stroke-width="1" stroke-dasharray="5,5"/>

        <!-- Connection lines from Skills Library to phases that use skills -->
        <line x1="825" y1="220" x2="125" y2="280" stroke="#10b981" stroke-width="2" opacity="0.6"/>
        <line x1="825" y1="220" x2="685" y2="280" stroke="#10b981" stroke-width="2" opacity="0.6"/>
        <line x1="825" y1="220" x2="965" y2="280" stroke="#10b981" stroke-width="2" opacity="0.6"/>

        <!-- Sub-agents (Fourth Row) -->
        <g transform="translate(50, 450)">
          <text x="500" y="-20" text-anchor="middle" fill="#94a3b8" font-size="13" font-style="italic">
            Each orchestrator spawns sub-agents with skill instructions
          </text>

          <!-- Phase 1 sub-agents -->
          <g v-for="n in 3" :key="`p1-${n}`" :transform="`translate(${(n-1) * 70}, 0)`">
            <circle cx="35" cy="35" r="25" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
            <text x="35" y="42" text-anchor="middle" fill="#60a5fa" font-size="11">Agent</text>
          </g>
          <text x="105" y="90" text-anchor="middle" fill="#475569" font-size="10">Phase 1 (10 agents)</text>

          <!-- Phase 3 sub-agents -->
          <g v-for="n in 3" :key="`p3-${n}`" :transform="`translate(${280 + (n-1) * 70}, 0)`">
            <circle cx="35" cy="35" r="25" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
            <text x="35" y="42" text-anchor="middle" fill="#60a5fa" font-size="11">Agent</text>
          </g>
          <text x="385" y="90" text-anchor="middle" fill="#475569" font-size="10">Phase 3 (15 agents)</text>

          <!-- Phase 5 sub-agents -->
          <g v-for="n in 3" :key="`p5-${n}`" :transform="`translate(${560 + (n-1) * 70}, 0)`">
            <circle cx="35" cy="35" r="25" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
            <text x="35" y="42" text-anchor="middle" fill="#60a5fa" font-size="11">Agent</text>
          </g>
          <text x="665" y="90" text-anchor="middle" fill="#475569" font-size="10">Phase 5 (10 agents)</text>

          <!-- Phase 6 sub-agents -->
          <g v-for="n in 3" :key="`p6-${n}`" :transform="`translate(${840 + (n-1) * 70}, 0)`">
            <circle cx="35" cy="35" r="25" fill="#1e293b" stroke="#3b82f6" stroke-width="2"/>
            <text x="35" y="42" text-anchor="middle" fill="#60a5fa" font-size="11">Agent</text>
          </g>
          <text x="945" y="90" text-anchor="middle" fill="#475569" font-size="10">Phase 6 (10 agents)</text>
        </g>

        <!-- Connection lines from orchestrators to sub-agents -->
        <line x1="125" y1="380" x2="105" y2="450" stroke="#475569" stroke-width="1"/>
        <line x1="405" y1="380" x2="385" y2="450" stroke="#475569" stroke-width="1"/>
        <line x1="685" y1="380" x2="665" y2="450" stroke="#475569" stroke-width="1"/>
        <line x1="965" y1="380" x2="945" y2="450" stroke="#475569" stroke-width="1"/>

        <!-- Course Output (Bottom) -->
        <g transform="translate(400, 620)">
          <rect x="0" y="0" width="400" height="80" fill="#064e3b" stroke="#10b981" stroke-width="2" rx="8"/>
          <text x="200" y="30" text-anchor="middle" fill="#10b981" font-size="16" font-weight="bold">
            📦 Complete Course Package
          </text>
          <text x="200" y="55" text-anchor="middle" fill="#6ee7b7" font-size="12">
            seed_pairs.json → lego_pairs.json → lego_baskets.json → introductions.json
          </text>
        </g>

        <!-- Connection lines to output -->
        <line x1="105" y1="550" x2="500" y2="620" stroke="#10b981" stroke-width="2" opacity="0.3"/>
        <line x1="385" y1="550" x2="550" y2="620" stroke="#10b981" stroke-width="2" opacity="0.3"/>
        <line x1="665" y1="550" x2="650" y2="620" stroke="#10b981" stroke-width="2" opacity="0.3"/>
        <line x1="945" y1="550" x2="700" y2="620" stroke="#10b981" stroke-width="2" opacity="0.3"/>

      </svg>
    </div>

    <!-- Stats -->
    <div class="mt-8 grid grid-cols-4 gap-4 text-center">
      <div class="bg-slate-900/50 rounded-lg p-4">
        <div class="text-3xl font-bold text-emerald-400">4</div>
        <div class="text-sm text-slate-400 mt-1">Skills</div>
      </div>
      <div class="bg-slate-900/50 rounded-lg p-4">
        <div class="text-3xl font-bold text-purple-400">4</div>
        <div class="text-sm text-slate-400 mt-1">Orchestrators</div>
      </div>
      <div class="bg-slate-900/50 rounded-lg p-4">
        <div class="text-3xl font-bold text-blue-400">45+</div>
        <div class="text-sm text-slate-400 mt-1">Sub-Agents</div>
      </div>
      <div class="bg-slate-900/50 rounded-lg p-4">
        <div class="text-3xl font-bold text-emerald-400">90%</div>
        <div class="text-sm text-slate-400 mt-1">Token Reduction</div>
      </div>
    </div>

    <!-- Explanation -->
    <div class="mt-8 bg-slate-900/50 rounded-lg p-6 space-y-4 text-sm text-slate-300">
      <div>
        <strong class="text-emerald-400">How it works:</strong>
      </div>
      <ol class="space-y-2 ml-6 list-decimal">
        <li><strong class="text-slate-100">Dashboard</strong> displays Phase Intelligence (orchestrator prompts) and Skills Library</li>
        <li><strong class="text-slate-100">Phase Orchestrators</strong> read their intelligence and spawn multiple sub-agents</li>
        <li><strong class="text-slate-100">Skills</strong> are referenced by orchestrators (not embedded) → 90% token reduction</li>
        <li><strong class="text-slate-100">Sub-agents</strong> receive skill instructions with required reading order</li>
        <li><strong class="text-slate-100">Progressive Disclosure</strong>: Agents load only what they need from skills</li>
        <li><strong class="text-slate-100">Outputs</strong> merge into complete course package</li>
      </ol>
      <div class="pt-4 border-t border-slate-700">
        <strong class="text-emerald-400">Benefits:</strong>
        <ul class="space-y-1 ml-6 mt-2 list-disc">
          <li>Orchestrator prompts: 50 lines (vs 1000+ lines with embedded methodology)</li>
          <li>Enforced reading order → critical rules read first</li>
          <li>Language-agnostic skills → consistent across all language pairs</li>
          <li>Dashboard as SSoT → all methodology discoverable and browsable</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const phases = ref([
  { id: '1', name: 'Translation + LEGOs', skill: 'translation-lego-skill' },
  { id: '2', name: 'Conflict Resolution', skill: 'upchunking-skill' },
  { id: '3', name: 'Basket Generation', skill: 'basket-generation-skill' },
  { id: 'M', name: 'Manifest', skill: null }
])
</script>
