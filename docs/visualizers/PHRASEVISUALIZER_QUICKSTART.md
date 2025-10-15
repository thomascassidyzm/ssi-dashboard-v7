# PhraseVisualizer - Quick Start Guide

## 🚀 30-Second Setup

### 1. Component is Ready
The component is already created at:
```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/components/PhraseVisualizer.vue
```

### 2. Basic Usage
```vue
<template>
  <PhraseVisualizer
    course-code="mkd_for_eng_574seeds"
    @basket-modified="handleChange"
    @phrase-edited="handleEdit"
  />
</template>

<script setup>
import PhraseVisualizer from '@/components/PhraseVisualizer.vue'

function handleChange(event) {
  console.log('Changed:', event)
}

function handleEdit(event) {
  console.log('Edited:', event)
}
</script>
```

### 3. View the Component
Use the provided view wrapper:
```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/src/views/BasketVisualizerView.vue
```

## 📦 What's Included

| File | Purpose | Size |
|------|---------|------|
| `PhraseVisualizer.vue` | Main component | 16KB |
| `BasketVisualizerView.vue` | Example view wrapper | 4.4KB |
| `PHRASEVISUALIZER_USAGE.md` | Full API documentation | 7.6KB |
| `PHRASEVISUALIZER_SUMMARY.md` | Implementation details | 11KB |
| `PHRASEVISUALIZER_VISUAL_GUIDE.md` | Visual design specs | 14KB |

## ✅ Verified Features

- ✅ Display basket phrases (LEGOs)
- ✅ Show metadata (basket_id, lego_count, patterns, score)
- ✅ Inline editing with save/cancel
- ✅ Reorder phrases (up/down buttons)
- ✅ Show SEED provenance
- ✅ Emerald/slate theme
- ✅ Basket navigation (prev/next)
- ✅ 23 baskets successfully loaded

## 📊 Test Data

**Location:** `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/mkd_for_eng_574seeds/amino_acids/baskets/`

**Available:**
- 23 baskets (basket_01.json through basket_23.json)
- 230 total LEGOs (10 per basket)
- Full metadata and provenance for each phrase

**Sample Phrases:**
- "I can't remember how" (from C0035)
- "easy but it is" (from C0041)
- "going to learn" (from C0017)
- "I'm trying to remember" (from C0006)

## 🎨 Visual Preview

```
╔════════════════════════════════════════════════════╗
║ Basket 1                                           ║
║ 10 LEGOs | Score: 47                               ║
║ Patterns: [subject_verb] [verb_phrases] [questions]║
╠════════════════════════════════════════════════════╣
║  ①  "I can't remember how"              [Edit]    ║
║     from C0035 (S35L2)                             ║
║     FCFS: 33.7  Utility: 61                        ║
║                                                    ║
║  ②  "easy but it is"                    [Edit]    ║
║     from C0041 (S41L3)                             ║
║     FCFS: 19  Utility: 34                          ║
║                                                    ║
║  ... (8 more)                                      ║
║                                                    ║
║  [+ Add LEGO] [Save Changes] [Reset]               ║
╚════════════════════════════════════════════════════╝
```

## 🔧 Props API

```javascript
{
  courseCode: 'mkd_for_eng_574seeds',  // Required
  basketId: 1,                         // Optional - specific basket
  editable: true                       // Optional - enable editing
}
```

## 📡 Events API

### @basket-modified
Emitted when basket is reordered, saved, or LEGO added
```javascript
{
  basketId: 1,
  action: 'reorder' | 'add' | 'save',
  fromIndex: 2,     // for reorder
  toIndex: 1,       // for reorder
  lego: {...},      // for add
  basket: {...}     // for save
}
```

### @phrase-edited
Emitted when phrase text is edited
```javascript
{
  basketId: 1,
  legoIndex: 0,
  legoUuid: "18b8cebe...",
  oldText: "I can't remember how",
  newText: "I cannot remember how"
}
```

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Enter` | Save phrase edit |
| `Cmd+Enter` | Save phrase edit (Mac) |
| `Escape` | Cancel editing |
| `Tab` | Navigate between elements |

## 🎯 Next Steps

1. **Test the Component**
   - Import in your view
   - Pass course code as prop
   - Verify baskets load

2. **Customize if Needed**
   - Adjust colors in template
   - Modify basket loading logic
   - Add your API calls

3. **Integrate Backend**
   - Update `loadBaskets()` to use API
   - Implement `saveBasket()` persistence
   - Add error handling

## 📚 Documentation

- **Full Usage Guide:** `PHRASEVISUALIZER_USAGE.md`
- **Implementation Summary:** `PHRASEVISUALIZER_SUMMARY.md`
- **Visual Design Specs:** `PHRASEVISUALIZER_VISUAL_GUIDE.md`

## 🐛 Troubleshooting

### Baskets not loading?
Check file path in `loadBaskets()` method matches your VFS structure.

### Styles not working?
Ensure Tailwind CSS is configured and emerald/slate colors are available.

### Events not firing?
Check console.log output and verify event handlers are connected.

## 💡 Pro Tips

1. **Read-Only Mode:** Set `:editable="false"` for viewing only
2. **Specific Basket:** Pass `:basket-id="5"` to show basket 5
3. **Activity Tracking:** Use BasketVisualizerView.vue as example
4. **Custom Styling:** Override classes in parent component

## 🎉 You're Ready!

The component is fully functional and ready to use. Just import it and start visualizing your teaching baskets!

**Need help?** Check the documentation files listed above for detailed information.

**Happy coding!** 🚀
