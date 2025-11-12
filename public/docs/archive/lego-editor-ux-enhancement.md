# LEGO Editor UX Enhancement Proposal

## Problem Statement

The current LEGO boundary editing interface needs to be more intuitive for editing how SEED_PAIRS are divided into LEGO_PAIRS. Key challenges:

1. **Tiling constraint** - chunks must cover entire sentence in BOTH languages
2. **Reordering** - target chunk #1 might map to known chunk #2 (different word orders between languages)
3. **Visual clarity** - need to see what maps to what at a glance
4. **Editing workflow** - current merge/split buttons are not as intuitive as they could be

## Proposed Solution: Interactive Word-Level Tiling with Color-Coded Mapping

### Visual Layout Concept

```
Target:   │cómo│ hablar │ lo más frecuentemente posible│
          └──────┼────────┼──────────────────────────────┘
Color:      🟦      🟩              🟪

Mapping:    ║       ╲              ║
           (visual curves connecting matched pairs)

Color:      🟦      🟩              🟪
Known:    │how│ to speak │ as often as possible│
          └────┼──────────┼──────────────────────┘
```

### Key Features

#### 1. Clickable Dividers Between Words
- **Instead of merge/split buttons**, click between any two words to toggle a divider
- **Active divider** = purple vertical line (visual separator)
- **No divider** = words grouped together in the same LEGO
- Provides direct manipulation of LEGO boundaries

#### 2. Color-Coded LEGO Pairs
- Each LEGO automatically gets assigned a vibrant color from palette
- **Color palette**: blue, green, purple, orange, pink, teal, yellow, cyan
- **Matching color** in target & known shows the pairing visually
- Beautiful gradient backgrounds for each LEGO container
- Makes it immediately clear which chunks belong together

#### 3. Drag Handles for Reordering Mappings
- **When word order differs between languages**, drag the connection line to re-pair LEGOs
- Visual curve/line (SVG) shows which target maps to which known
- Enables handling cases where mapping order differs from sequence order
- Example: "I want" (English) → "je veux" (French order: "I want") vs "quiero" (Spanish: "want-I")

#### 4. Real-Time Preview
- **As you click dividers**, see LEGO containers update instantly
- **Live counter** showing "3 LEGOs" updates in real-time
- **Color assignments** update automatically
- **Visual feedback** for all interactions (hover states, click animations)

### Implementation Components

#### Frontend Components
1. **WordDividerEditor.vue** - Main interactive word-level editor
2. **ColorMapper.js** - Color palette management and assignment
3. **MappingVisualizer.vue** - SVG curves showing target↔known connections
4. **DividerToggle.vue** - Clickable divider component between words

#### Data Structure
```javascript
{
  seed_id: "S0003",
  lego_pairs: [
    {
      lego_id: "S0003L01",
      target_chunk: "cómo",
      known_chunk: "how",
      color: "#3B82F6", // blue
      mapping_index: 0  // maps to known_index 0
    },
    {
      lego_id: "S0003L02",
      target_chunk: "hablar",
      known_chunk: "to speak",
      color: "#10B981", // green
      mapping_index: 1  // maps to known_index 1
    },
    {
      lego_id: "S0003L03",
      target_chunk: "lo más frecuentemente posible",
      known_chunk: "as often as possible",
      color: "#8B5CF6", // purple
      mapping_index: 2  // maps to known_index 2
    }
  ]
}
```

#### Visual Design Tokens
```css
/* Color Palette for LEGO pairs */
--lego-color-1: #3B82F6; /* blue */
--lego-color-2: #10B981; /* green */
--lego-color-3: #8B5CF6; /* purple */
--lego-color-4: #F59E0B; /* orange */
--lego-color-5: #EC4899; /* pink */
--lego-color-6: #14B8A6; /* teal */
--lego-color-7: #EAB308; /* yellow */
--lego-color-8: #06B6D4; /* cyan */

/* Divider styles */
--divider-active: 2px solid #8B5CF6;
--divider-hover: 2px dashed #A78BFA;
--divider-inactive: transparent;
```

### User Workflow

1. **Enter edit mode** - Click "Edit LEGOs" on a SEED breakdown
2. **See current divisions** - Words displayed with dividers showing current LEGO boundaries
3. **Click between words** to add/remove dividers
   - Click once: add divider (split LEGO)
   - Click again: remove divider (merge LEGO)
4. **See color updates** - Each LEGO gets automatic color assignment
5. **Adjust mappings** (if needed) - Drag connection lines to reorder pairings
6. **Visual confirmation** - See both languages color-coded with matching pairs
7. **Edit componentization** - For COMPOSITE LEGOs, edit breakdown in side panel
8. **Save** - Changes saved without tiling validation blocking

### Benefits

✅ **Direct manipulation** - Click exactly where you want to divide
✅ **Visual clarity** - Color coding makes mappings obvious
✅ **Flexible reordering** - Handle different word orders between languages
✅ **Real-time feedback** - See changes instantly
✅ **Beautiful UI** - Vibrant colors, smooth animations, modern design
✅ **Intuitive** - No need to understand "merge" vs "split" buttons
✅ **Accessible** - Clear visual indicators, keyboard support possible

### Future Enhancements

- **Auto-suggest dividers** based on AI analysis
- **Undo/redo** for divider changes
- **Keyboard shortcuts** (Space to toggle divider at cursor)
- **Batch editing** - Apply divider pattern to multiple SEEDs
- **Import/export** divider patterns
- **Analytics** - Show which LEGO divisions are most common

## Status

**Proposed** - Ready to implement when approved

## Related Files

- `/src/views/CourseEditor.vue` - Current editor implementation
- Implementation will require new component structure
