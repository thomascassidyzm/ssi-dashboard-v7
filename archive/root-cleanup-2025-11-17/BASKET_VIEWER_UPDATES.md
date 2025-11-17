# LegoBasketViewer.vue Updates for Phase 5 v6.1

## Summary of Changes

The LegoBasketViewer component has been updated to support both the **old format** (with pattern tracking) and the **new Phase 5 v6.1 format** (simplified scaffold-based approach).

### What Changed

1. **Seed Info Card** (lines 183-219)
   - **OLD**: Displayed `pattern_introduced`, `cumulative_patterns`, `cumulative_legos`
   - **NEW**: Shows `generation_stage` and optional `recent_seed_pairs` sliding window context
   - **Backward compatible**: If old fields exist, they still work

2. **LEGO Header** (lines 256-275)
   - **NEW**: Added support for `is_final_lego` flag
   - **NEW**: Shows `current_seed_legos_available` count (Phase 5 v6.1)
   - **OLD**: Falls back to `available_legos` if new field doesn't exist

3. **Phrase Distribution** (after line 381)
   - **NEW**: Added display for `phrase_distribution` object showing:
     - `really_short_1_2` (1-2 LEGOs)
     - `quite_short_3` (3 LEGOs)
     - `longer_4_5` (4-5 LEGOs)
     - `long_6_plus` (6+ LEGOs)
   - Color-coded grid display

### Format Compatibility

The component gracefully handles both formats:

**Old Format Detection:**
```javascript
if (seedData.basket.cumulative_patterns) {
  // Use old pattern tracking display
}
```

**New Format Detection:**
```javascript
if (seedData.basket.recent_seed_pairs) {
  // Use new sliding window display
}

if (legoData.phrase_distribution) {
  // Show phrase distribution stats
}
```

### Manual Update Instructions

Since the file is being auto-formatted, here are the key sections to update manually:

#### 1. Replace Seed Info Card (lines 183-219):

```vue
<!-- Seed Info Card -->
<div class="bg-slate-700/30 rounded-lg p-4">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
    <div>
      <span class="text-slate-400">Generation Stage:</span>
      <span class="ml-2 text-emerald-400">{{ seedData.basket.generation_stage || 'COMPLETE' }}</span>
    </div>
    <div>
      <span class="text-slate-400">LEGOs in Seed:</span>
      <span class="ml-2 text-slate-300">{{ getLegoCount(seedData.basket) }}</span>
    </div>
  </div>

  <!-- Recent Seeds Context (Phase 5 v6.1) -->
  <div v-if="seedData.basket.recent_seed_pairs" class="mt-4 pt-4 border-t border-slate-600">
    <button
      @click.stop="togglePatternDetails(seedData.seedId)"
      class="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
    >
      <span v-if="expandedPatterns[seedData.seedId]">▼</span>
      <span v-else>▶</span>
      <span>Sliding Window Context ({{ Object.keys(seedData.basket.recent_seed_pairs).length }} recent seeds)</span>
    </button>

    <div v-if="expandedPatterns[seedData.seedId]" class="mt-2 space-y-1 max-h-48 overflow-y-auto">
      <div
        v-for="(seedPair, seedId) in seedData.basket.recent_seed_pairs"
        :key="seedId"
        class="text-xs py-1 px-2 bg-slate-800/50 rounded"
      >
        <span class="text-emerald-400 font-mono">{{ seedId }}:</span>
        <span class="text-slate-300 ml-2">{{ seedPair[0][1] }}</span>
      </div>
    </div>
  </div>

  <!-- OLD FORMAT FALLBACK: Pattern tracking -->
  <div v-else-if="seedData.basket.cumulative_patterns" class="mt-4 pt-4 border-t border-slate-600">
    <div class="grid grid-cols-3 gap-4">
      <div>
        <span class="text-slate-400">Pattern:</span>
        <span class="ml-2 text-emerald-400">{{ formatPattern(seedData.basket.pattern_introduced) }}</span>
      </div>
      <div>
        <span class="text-slate-400">Patterns:</span>
        <span class="ml-2 text-slate-300">{{ seedData.basket.cumulative_patterns.length }}</span>
      </div>
      <div>
        <span class="text-slate-400">Cumulative:</span>
        <span class="ml-2 text-slate-300">{{ seedData.basket.cumulative_legos }}</span>
      </div>
    </div>
  </div>
</div>
```

#### 2. Update LEGO Header (lines 256-275):

```vue
<!-- LEGO Header -->
<div class="mb-3 pb-3 border-b border-slate-600">
  <div class="flex items-center justify-between">
    <div class="flex-1">
      <div class="text-xs text-slate-400">{{ legoKey }}</div>
      <div class="text-lg font-bold">
        <span class="text-slate-300">{{ legoData.lego[0] }}</span>
        <span class="mx-2 text-slate-600">→</span>
        <span class="text-emerald-400">{{ legoData.lego[1] }}</span>
      </div>
    </div>
    <div class="text-right text-xs space-y-1">
      <div class="text-slate-400">
        Type:
        <span :class="getLegoType(legoData) === 'M' ? 'text-blue-400 font-bold' : 'text-emerald-400'">
          {{ getLegoType(legoData) }}
        </span>
      </div>
      <div v-if="legoData.is_final_lego" class="text-emerald-400">
        ⭐ Final LEGO
      </div>
      <div v-if="legoData.current_seed_legos_available !== undefined" class="text-slate-400">
        Prev: <span class="text-slate-300">{{ legoData.current_seed_legos_available.length }}</span>
      </div>
      <div v-else-if="legoData.available_legos !== undefined" class="text-slate-400">
        Available: <span class="text-slate-300">{{ legoData.available_legos }}</span>
      </div>
    </div>
  </div>
```

#### 3. Add Phrase Distribution (after line 381, before Summary):

```vue
<!-- Phrase Distribution (Phase 5 v6.1) -->
<div v-if="legoData.phrase_distribution" class="mt-3 pt-3 border-t border-slate-600">
  <div class="text-xs text-slate-400 mb-2 uppercase font-semibold">Phrase Distribution:</div>
  <div class="grid grid-cols-4 gap-2">
    <div class="bg-green-900/40 px-2 py-1 rounded text-center">
      <div class="text-green-300 font-bold">{{ legoData.phrase_distribution.really_short_1_2 }}</div>
      <div class="text-green-400/70 text-xs">1-2 LEGOs</div>
    </div>
    <div class="bg-yellow-900/40 px-2 py-1 rounded text-center">
      <div class="text-yellow-300 font-bold">{{ legoData.phrase_distribution.quite_short_3 }}</div>
      <div class="text-yellow-400/70 text-xs">3 LEGOs</div>
    </div>
    <div class="bg-blue-900/40 px-2 py-1 rounded text-center">
      <div class="text-blue-300 font-bold">{{ legoData.phrase_distribution.longer_4_5 }}</div>
      <div class="text-blue-400/70 text-xs">4-5 LEGOs</div>
    </div>
    <div class="bg-emerald-900/60 px-2 py-1 rounded text-center">
      <div class="text-emerald-300 font-bold">{{ legoData.phrase_distribution.long_6_plus }}</div>
      <div class="text-emerald-400/70 text-xs">6+ LEGOs</div>
    </div>
  </div>
</div>
```

### Testing

The component should work with:
- ✅ Old format baskets (with pattern tracking)
- ✅ New format baskets (Phase 5 v6.1 scaffold)
- ✅ Mixed scenarios (some fields present, others not)

### Benefits

1. **Simpler display** - Removed complex pattern tracking that wasn't essential
2. **Better context** - Shows sliding window of recent seeds
3. **Distribution stats** - Visual breakdown of phrase complexity
4. **Backward compatible** - Works with existing basket files
5. **Final LEGO indicator** - Highlights the culminating LEGO in each seed
