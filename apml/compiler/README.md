# APML to Vue 3 Compiler

A basic compiler that transforms APML (AI Project Markup Language) specifications into Vue 3 Single File Components (SFCs).

## Status

**This is a scaffold implementation** - it provides the basic structure and parsing for key APML constructs, but is not yet production-ready.

## Features

### Implemented

- **Parser**: Basic regex-based parser that converts APML text into an AST
- **Type Generator**: Creates TypeScript interfaces from `data` blocks
- **Store Generator**: Generates Pinia stores with state and computed properties
- **Component Generator**: Creates Vue 3 SFCs from `interface` blocks
- **Computed Support**: Handles `computed` values and integrates them into stores

### Supported APML Constructs

- `data` blocks → TypeScript interfaces + Pinia store state
- `interface` blocks → Vue 3 components (.vue files)
- `computed` values → Vue computed properties in stores
- Basic `show` statements → Template elements

### TODO (Not Yet Implemented)

- [ ] Full expression parsing (currently placeholder strings)
- [ ] Logic sections → Event handlers and methods
- [ ] State machines → State management logic
- [ ] Real-time connections → WebSocket composables
- [ ] External integrations → SDK initialization
- [ ] API integrations → API client generation
- [ ] Optimistic UI patterns → Transaction management
- [ ] Validation logic
- [ ] Proper error handling and validation
- [ ] Source maps for debugging

## Installation

```bash
cd COMPILER/vue
npm install
npm run build
```

## Usage

### Compile an APML file

```bash
npm run compile examples/simple.apml ./output
```

This will generate:
- `output/src/types/models.ts` - TypeScript interfaces
- `output/src/stores/app.ts` - Pinia store
- `output/src/components/*.vue` - Vue components

### Programmatic API

```typescript
import { compile } from '@apml/compiler-vue';

compile('path/to/file.apml', './output');
```

Or use the individual functions:

```typescript
import { parseAPML, generateVue } from '@apml/compiler-vue';

// Parse APML to AST
const ast = parseAPML(apmlContent);

// Generate Vue files
const files = generateVue(ast);

// Write files manually
for (const file of files) {
  // file.path and file.content
}
```

## Example

Given this APML:

```apml
data Post:
  id: unique_id auto
  title: text required
  content: text required
  likes_count: number default: 0

computed filtered_posts: posts.filter(p => p.category == selected_category)

interface feed_view:
  show post_list:
    items: filtered_posts
```

The compiler generates:

**`src/types/models.ts`**
```typescript
export interface Post {
  id: string;
  title: string;
  content: string;
  likes_count: number;
}
```

**`src/stores/app.ts`**
```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Post } from '../types/models';

export const useAppStore = defineStore('app', () => {
  const posts = ref<Post[]>([]);

  const filtered_posts = computed(() => {
    // TODO: Implement expression
    return null;
  });

  return { posts, filtered_posts };
});
```

**`src/components/FeedView.vue`**
```vue
<template>
  <div class="feed-view">
    <div class="post_list">
      <!-- items: filtered_posts -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAppStore } from '../stores/app';

const store = useAppStore();
</script>

<style scoped>
.feed-view {
  /* TODO: Add component styles */
}
</style>
```

## Architecture

```
src/
├── index.ts              # Main entry point & CLI
├── parser/
│   └── parser.ts         # APML text → AST
├── generator/
│   └── vue-generator.ts  # AST → Vue SFC
└── types/
    └── ast.ts            # AST type definitions
```

### Parser

The parser is a simple line-based regex parser. It:
- Splits input into lines
- Tracks indentation for nesting
- Matches patterns for each APML construct
- Builds an AST representation

**Limitations**: This is sufficient for the scaffold but should be replaced with a proper parser (PEG/ANTLR) for production.

### Generator

The generator walks the AST and produces Vue 3 code:
- **Types**: Converts `data` models to TypeScript interfaces
- **Store**: Creates a Pinia store with refs for state and computed properties
- **Components**: Generates SFCs with `<template>`, `<script setup>`, and `<style>` sections

## Development

```bash
# Install dependencies
npm install

# Build (TypeScript → JavaScript)
npm run build

# Watch mode (rebuild on changes)
npm run dev

# Run compiler
npm run compile examples/simple.apml ./output
```

## Testing

Currently no automated tests. To test manually:

1. Create an APML file in `examples/`
2. Run the compiler
3. Inspect the generated files in `./output`
4. Verify the TypeScript types, store, and components match expectations

## Known Limitations

1. **Expression parsing**: Expressions are stored as strings, not parsed into AST nodes
2. **Logic sections**: Process/action blocks are not yet implemented
3. **Template generation**: Very basic - just creates placeholder divs
4. **State management**: Store is generated but actions/mutations are placeholders
5. **Error handling**: Minimal validation and error messages
6. **Source maps**: No source mapping for debugging generated code

## Next Steps

1. Implement proper expression parser
2. Add logic section → method generation
3. Improve template generation from `show` elements
4. Add state machine → composable generation
5. Add real-time → WebSocket composable generation
6. Add validation and better error messages
7. Add tests
8. Generate package.json and project scaffolding

## License

MIT
