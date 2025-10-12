# PhraseVisualizer - Visual Design Guide

## Component Visual Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHRASEVISUALIZER COMPONENT                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [← Previous]  Basket 1 of 23  [Next →]     mkd_for_eng_574seeds   │   │
│  │  ─────────────────────────────────────────────────────────────────  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ╔═════════════════════════════════════════════════════════════════════╗   │
│  ║                           Basket 1                                  ║   │
│  ║  10 LEGOs | Score: 47                                               ║   │
│  ║                          ┌──────────────────────────────────────┐   ║   │
│  ║  Patterns: [subject_verb] [verb_phrases] [questions] [negations]│   ║   │
│  ║            [general]                                             │   ║   │
│  ╠═════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                     ║   │
│  ║  ┌─────────────────────────────────────────────────────────────┐   ║   │
│  ║  │ ↑  ①  "I can't remember how"                      [Edit]    │   ║   │
│  ║  │ ↓     from C0035 (S35L2)                                     │   ║   │
│  ║  │       FCFS: 33.7  Utility: 61                                │   ║   │
│  ║  └─────────────────────────────────────────────────────────────┘   ║   │
│  ║                                                                     ║   │
│  ║  ┌─────────────────────────────────────────────────────────────┐   ║   │
│  ║  │ ↑  ②  "easy but it is"                            [Edit]    │   ║   │
│  ║  │ ↓     from C0041 (S41L3)                                     │   ║   │
│  ║  │       FCFS: 19  Utility: 34                                  │   ║   │
│  ║  └─────────────────────────────────────────────────────────────┘   ║   │
│  ║                                                                     ║   │
│  ║  ┌─────────────────────────────────────────────────────────────┐   ║   │
│  ║  │ ↑  ③  "going to learn"                            [Edit]    │   ║   │
│  ║  │ ↓     from C0017 (S17L1)                                     │   ║   │
│  ║  │       FCFS: 34.7  Utility: 67                                │   ║   │
│  ║  └─────────────────────────────────────────────────────────────┘   ║   │
│  ║                                                                     ║   │
│  ║  ... (7 more LEGOs)                                                 ║   │
│  ║                                                                     ║   │
│  ║  ──────────────────────────────────────────────────────────────     ║   │
│  ║  [+ Add LEGO]  [Save Changes]  [Reset]                              ║   │
│  ║                                                                     ║   │
│  ╠═════════════════════════════════════════════════════════════════════╣   │
│  ║  Pedagogical Notes: Grouped for optimal teaching sequence          ║   │
│  ║  Pattern Diversity: 5 | Created: Oct 10, 2025                      ║   │
│  ╚═════════════════════════════════════════════════════════════════════╝   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Color Scheme (Emerald/Slate Theme)

### Primary Colors
- **Background:** `#0f172a` (slate-900)
- **Card Background:** `#1e293b` (slate-800)
- **Border:** `#334155` (slate-700)
- **Primary Accent:** `#34d399` (emerald-400)
- **Primary Text:** `#f1f5f9` (slate-100)
- **Secondary Text:** `#94a3b8` (slate-400)

### Color Usage Map
```
┌─────────────────────────────────────────────────────────────┐
│ slate-900         Background (entire page)                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ slate-700       Navigation border                     │ │
│  │ slate-300       Button text                           │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ╔═══════════════════════════════════════════════════════╗ │
│  ║ slate-800       Card background                       ║ │
│  ║ ────────────────────────────────────────────────────  ║ │
│  ║ emerald-900/20  Header background (semi-transparent)  ║ │
│  ║ emerald-400     Basket title & pattern tags           ║ │
│  ║ slate-400       Metadata text                         ║ │
│  ║                                                        ║ │
│  ║ ┌──────────────────────────────────────────────────┐  ║ │
│  ║ │ slate-900/50   LEGO item background             │  ║ │
│  ║ │ slate-700      LEGO item border                 │  ║ │
│  ║ │ emerald-500/50 Border on hover                  │  ║ │
│  ║ │ emerald-300    Phrase text                      │  ║ │
│  ║ │ slate-500      Provenance "from"                │  ║ │
│  ║ │ emerald-400    Seed ID in monospace             │  ║ │
│  ║ └──────────────────────────────────────────────────┘  ║ │
│  ║                                                        ║ │
│  ║ emerald-600     Action buttons                        ║ │
│  ║ emerald-500     Button hover state                    ║ │
│  ╚═══════════════════════════════════════════════════════╝ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Interactive States

### LEGO Item - Default State
```
┌──────────────────────────────────────────────────────────┐
│     ①  "I can't remember how"                            │
│        from C0035 (S35L2)                                │
│        FCFS: 33.7  Utility: 61                           │
└──────────────────────────────────────────────────────────┘
Border: slate-700 (subtle)
```

### LEGO Item - Hover State
```
┌──────────────────────────────────────────────────────────┐
│ ↑   ①  "I can't remember how"                  [Edit]   │
│ ↓      from C0035 (S35L2)                                │
│        FCFS: 33.7  Utility: 61                           │
└──────────────────────────────────────────────────────────┘
Border: emerald-500/50 (highlighted)
Up/Down buttons appear (fade in)
Edit button appears (fade in)
```

### LEGO Item - Edit State
```
┌──────────────────────────────────────────────────────────┐
│     ①  ┌────────────────────────────────────────────┐   │
│        │ I can't remember how                       │   │
│        │ [cursor here]                              │   │
│        └────────────────────────────────────────────┘   │
│        [Save] [Cancel]  Ctrl+Enter to save              │
│        from C0035 (S35L2)                                │
└──────────────────────────────────────────────────────────┘
Border: emerald-500 (ring-2)
Textarea: slate-800 background, emerald-500 border
```

## Responsive Behavior

### Desktop (1280px+)
```
┌─────────────────────────────────────────────────────────────┐
│  [← Previous]  Basket 1 of 23  [Next →]                    │
│                                                             │
│  ╔═════════════════════════════════════════════════════╗   │
│  ║  Basket 1              [subject_verb] [verb_phrases]║   │
│  ║  10 LEGOs | Score: 47  [questions] [negations]      ║   │
│  ╠═════════════════════════════════════════════════════╣   │
│  ║  [Full width LEGOs list]                            ║   │
│  ╚═════════════════════════════════════════════════════╝   │
└─────────────────────────────────────────────────────────────┘
Max-width: 7xl (1280px)
Centered with padding
```

### Tablet (768px - 1279px)
```
┌───────────────────────────────────────────┐
│  [← Prev] Basket 1/23 [Next →]           │
│                                           │
│  ╔═══════════════════════════════════╗   │
│  ║  Basket 1                         ║   │
│  ║  10 LEGOs | Score: 47             ║   │
│  ║  [subject_verb] [verb_phrases]    ║   │
│  ║  [questions] [negations] [gen]    ║   │
│  ╠═══════════════════════════════════╣   │
│  ║  [LEGOs list stacks naturally]    ║   │
│  ╚═══════════════════════════════════╝   │
└───────────────────────────────────────────┘
Full width with padding
Pattern tags wrap to new lines
```

### Mobile (< 768px)
```
┌─────────────────────────────┐
│ [← Prev] 1/23 [Next →]     │
│                             │
│ ╔═════════════════════════╗ │
│ ║ Basket 1                ║ │
│ ║ 10 LEGOs | Score: 47    ║ │
│ ║ [subject_verb]          ║ │
│ ║ [verb_phrases]          ║ │
│ ║ [questions]             ║ │
│ ╠═════════════════════════╣ │
│ ║ ①  "I can't remember"  ║ │
│ ║    C0035 (S35L2)       ║ │
│ ║ ②  "easy but it is"    ║ │
│ ║    C0041 (S41L3)       ║ │
│ ╚═════════════════════════╝ │
└─────────────────────────────┘
Compact layout
Buttons abbreviated
Touch-friendly spacing
```

## Typography

### Heading Hierarchy
```
Basket 1                    → text-2xl font-bold (24px)
10 LEGOs | Score: 47        → text-sm (14px)
"I can't remember how"      → text-lg font-medium (18px)
from C0035 (S35L2)          → text-sm (14px)
FCFS: 33.7                  → text-xs (12px)
```

### Font Stack
- **Primary:** System font stack (default Tailwind)
- **Monospace:** For UUIDs and seed IDs
- **Weight:** Regular (400), Medium (500), Semibold (600), Bold (700)

## Animation & Transitions

### Hover Transitions
```css
/* All transitions */
transition-colors    → 150ms
transition-opacity   → 200ms
transition-all       → 200ms ease

/* Button hover */
bg-slate-700 → bg-slate-600 (150ms)

/* Border highlight */
border-slate-700 → border-emerald-500/50 (150ms)

/* Up/Down buttons */
opacity-0 → opacity-100 (200ms fade in)
```

### State Changes
```css
/* Edit mode activation */
- Border changes to ring-2 ring-emerald-500 (instant)
- Textarea fades in (200ms)
- Save/Cancel buttons slide in (150ms)

/* Reorder animation */
- Items swap positions (200ms ease)
- Smooth position transition
```

## Accessibility Features

### Keyboard Navigation
```
Tab          → Focus next interactive element
Shift+Tab    → Focus previous interactive element
Enter        → Activate button
Space        → Activate button
Escape       → Cancel edit mode
Ctrl+Enter   → Save edit (in edit mode)
```

### ARIA Labels
```html
<!-- Navigation buttons -->
<button aria-label="Previous basket" aria-disabled="true">
<button aria-label="Next basket">

<!-- Reorder buttons -->
<button title="Move up" aria-label="Move phrase up">
<button title="Move down" aria-label="Move phrase down">

<!-- Edit controls -->
<textarea aria-label="Edit phrase text">
<button aria-label="Save changes">
<button aria-label="Cancel editing">
```

### Focus States
```css
focus:outline-none
focus:ring-2
focus:ring-emerald-500
focus:border-emerald-500
```

## Component Dimensions

### Card Layout
```
┌─────────────────────────────────────┐
│ Header: padding-6 (24px)            │ ← emerald-900/20 bg
├─────────────────────────────────────┤
│ Content: padding-6 (24px)           │
│                                     │
│  LEGO Item: padding-4 (16px)       │ ← individual item
│  margin-bottom: 0.75rem (12px)     │ ← spacing between items
│                                     │
│  [10 items with spacing]            │
│                                     │
│  Action Buttons: margin-top-6       │
│  padding-top-6 | border-top         │
│                                     │
├─────────────────────────────────────┤
│ Footer: padding-4 (16px)            │ ← slate-900/50 bg
└─────────────────────────────────────┘

Total height: ~800-1000px (varies by content)
Max width: 1280px (7xl)
```

## Pattern Tags
```
┌──────────────┐  ┌───────────────┐  ┌───────────┐
│ subject_verb │  │ verb_phrases  │  │ questions │
└──────────────┘  └───────────────┘  └───────────┘
  emerald-600/20    emerald-600/20    emerald-600/20
  emerald-400       emerald-400       emerald-400
  padding: 0.25rem 0.5rem (4px 8px)
  border-radius: 0.25rem (4px)
  font-size: 0.75rem (12px)
```

## Loading & Error States

### Loading State
```
┌─────────────────────────────────────┐
│                                     │
│           Loading baskets...        │
│                                     │
│           [spinner icon]            │
│                                     │
└─────────────────────────────────────┘
Center aligned, slate-400 text
```

### Error State
```
┌─────────────────────────────────────┐
│ ⚠ Error Loading Baskets             │
│                                     │
│ Failed to load basket data from     │
│ the specified course directory.     │
│ Please check the course code.       │
└─────────────────────────────────────┘
red-900/20 background, red-500/50 border
red-400 heading, slate-300 text
```

### Empty State
```
┌─────────────────────────────────────┐
│                                     │
│  No baskets found for this course.  │
│                                     │
└─────────────────────────────────────┘
Center aligned, slate-400 text
```

## Button Styles

### Primary Button (Emerald)
```
┌──────────────┐
│  Save Changes │
└──────────────┘
bg: emerald-600
hover: emerald-500
text: white
padding: 0.5rem 1.5rem (8px 24px)
border-radius: 0.375rem (6px)
```

### Secondary Button (Slate)
```
┌──────────────┐
│    Reset     │
└──────────────┘
bg: slate-700
hover: slate-600
text: slate-300
padding: 0.5rem 1rem (8px 16px)
border-radius: 0.375rem (6px)
```

### Small Button (Up/Down)
```
┌─────┐
│  ↑  │
└─────┘
bg: slate-700
hover: slate-600
text: slate-300
padding: 0.25rem (4px)
border-radius: 0.25rem (4px)
font-size: 0.75rem (12px)
```

## Summary

This PhraseVisualizer component provides:

✅ **Clean, modern design** with emerald/slate theme
✅ **Intuitive navigation** with prev/next controls
✅ **Inline editing** with keyboard shortcuts
✅ **Visual hierarchy** with proper typography
✅ **Responsive layout** for all screen sizes
✅ **Smooth animations** for better UX
✅ **Accessible** with keyboard navigation and ARIA labels
✅ **Consistent styling** matching CourseEditor.vue

The component is production-ready and follows Vue 3 + Tailwind CSS best practices.
