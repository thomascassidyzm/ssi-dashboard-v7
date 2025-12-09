/**
 * Vue 3 SFC Generator
 *
 * Transforms an APML AST into Vue 3 Single File Components (.vue files).
 *
 * Generates:
 * - TypeScript interfaces from data models
 * - Pinia stores for state management
 * - Vue components for interfaces
 * - Computed properties for computed values
 */

import type {
  APMLDocument,
  DataModel,
  Field,
  InterfaceSection,
  ComputedValue,
  UIElement,
  ShowElement,
  ConditionalElement,
  IterationElement,
  VirtualizedListElement,
  Expression,
  LogicSection,
  StateDeclaration,
} from '../types/ast.js';

export interface GeneratedFile {
  path: string;
  content: string;
}

export class VueGenerator {
  private indent = '  ';

  /**
   * Generate all files from an APML document
   */
  generate(doc: APMLDocument): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    // Generate TypeScript interfaces from data models
    if (doc.data.length > 0) {
      files.push(this.generateTypes(doc.data));
    }

    // Generate Pinia store
    if (doc.data.length > 0 || doc.computed.length > 0 || doc.logic.length > 0) {
      files.push(this.generateStore(doc));
    }

    // APML-EDU: Generate education store if content/methodology present
    if (doc.content || doc.methodology || doc.production) {
      files.push(this.generateEducationStore(doc));
    }

    // APML-EDU: Generate audio store if audio config present
    if (doc.audio) {
      files.push(this.generateAudioStore(doc));
    }

    // APML-EDU: Generate progress tracking components
    if (doc.production) {
      files.push(this.generateProgressTracking(doc));
    }

    // APML-EDU: Generate adaptive logic handlers
    if (doc.adaptation) {
      files.push(this.generateAdaptiveLogic(doc));
    }

    // Generate Vue components for each interface
    for (const iface of doc.interfaces) {
      files.push(this.generateComponent(iface, doc));
    }

    return files;
  }

  // ==========================================================================
  // TypeScript Interfaces
  // ==========================================================================

  private generateTypes(models: DataModel[]): GeneratedFile {
    const lines: string[] = [];

    lines.push('/**');
    lines.push(' * Generated TypeScript types from APML data models');
    lines.push(' * DO NOT EDIT - This file is auto-generated');
    lines.push(' */');
    lines.push('');

    for (const model of models) {
      lines.push(`export interface ${model.name} {`);

      for (const field of model.fields) {
        const tsType = this.fieldTypeToTS(field);
        const optional = field.modifiers.includes('optional') ? '?' : '';
        lines.push(`${this.indent}${field.name}${optional}: ${tsType};`);
      }

      lines.push('}');
      lines.push('');
    }

    return {
      path: 'src/types/models.ts',
      content: lines.join('\n'),
    };
  }

  private fieldTypeToTS(field: Field): string {
    const { type, modifiers } = field;

    let baseType: string;

    if (typeof type === 'string') {
      baseType = this.primitiveTypeToTS(type);
    } else if ('list' in type) {
      const itemType = typeof type.list === 'string'
        ? this.primitiveTypeToTS(type.list)
        : ('model' in type.list ? type.list.model : 'any');
      baseType = `${itemType}[]`;
    } else if ('model' in type) {
      baseType = type.model;
    } else {
      baseType = 'any';
    }

    return baseType;
  }

  private primitiveTypeToTS(type: string): string {
    const typeMap: Record<string, string> = {
      text: 'string',
      number: 'number',
      boolean: 'boolean',
      date: 'Date',
      timestamp: 'Date',
      email: 'string',
      url: 'string',
      unique_id: 'string',
      money: 'number',
      percentage: 'number',
    };

    return typeMap[type] || 'any';
  }

  // ==========================================================================
  // Pinia Store
  // ==========================================================================

  private generateStore(doc: APMLDocument): GeneratedFile {
    const lines: string[] = [];
    const { data: models, computed, logic, integrations } = doc;

    lines.push("import { defineStore } from 'pinia';");
    lines.push("import { ref, computed } from 'vue';");

    // Import types if we have models
    if (models.length > 0) {
      const modelNames = models.map(m => m.name).join(', ');
      lines.push(`import type { ${modelNames} } from '../types/models';`);
    }

    lines.push('');
    lines.push('/**');
    lines.push(' * Generated Pinia store from APML specification');
    lines.push(' * DO NOT EDIT - This file is auto-generated');
    lines.push(' */');
    lines.push('');
    lines.push("export const useAppStore = defineStore('app', () => {");
    lines.push(`${this.indent}// ========================================`);
    lines.push(`${this.indent}// State from data models`);
    lines.push(`${this.indent}// ========================================`);

    // Generate state refs for each model
    for (const model of models) {
      const varName = this.modelToVarName(model.name);
      lines.push(`${this.indent}const ${varName} = ref<${model.name}[]>([]);`);
    }

    // Generate state from logic sections
    if (logic.length > 0) {
      lines.push('');
      lines.push(`${this.indent}// ========================================`);
      lines.push(`${this.indent}// State from logic sections`);
      lines.push(`${this.indent}// ========================================`);

      for (const logicSection of logic) {
        if (logicSection.state) {
          for (const state of logicSection.state) {
            const tsType = this.stateTypeToTS(state.type);
            const defaultVal = this.getDefaultValue(state.type, state.defaultValue);
            lines.push(`${this.indent}const ${this.snakeToCamelCase(state.name)} = ref<${tsType}>(${defaultVal});`);
          }
        }
      }
    }

    lines.push('');
    lines.push(`${this.indent}// ========================================`);
    lines.push(`${this.indent}// Computed properties`);
    lines.push(`${this.indent}// ========================================`);

    // Generate computed values
    for (const comp of computed) {
      const computedBody = this.generateComputedBody(comp);
      lines.push(`${this.indent}const ${this.snakeToCamelCase(comp.name)} = computed(() => {`);

      // Add the generated body with proper indentation
      const bodyLines = computedBody.split('\n');
      for (const bodyLine of bodyLines) {
        if (bodyLine.trim()) {
          lines.push(`${this.indent}${this.indent}${bodyLine}`);
        } else {
          lines.push('');
        }
      }

      lines.push(`${this.indent}});`);
      lines.push('');
    }

    lines.push(`${this.indent}// ========================================`);
    lines.push(`${this.indent}// Actions`);
    lines.push(`${this.indent}// ========================================`);

    // Generate actions from logic processes
    if (logic.length > 0) {
      for (const logicSection of logic) {
        for (const process of logicSection.processes) {
          lines.push('');
          lines.push(`${this.indent}async function ${this.snakeToCamelCase(process.name)}() {`);
          lines.push(`${this.indent}${this.indent}// TODO: Implement ${process.name}`);
          lines.push(`${this.indent}${this.indent}// Trigger: ${JSON.stringify(process.trigger)}`);
          lines.push(`${this.indent}}`);
        }
      }
    }

    // Generate helper functions for data access
    if (models.length > 0) {
      lines.push('');
      lines.push(`${this.indent}// Helper functions for data access`);

      for (const model of models) {
        const varName = this.modelToVarName(model.name);
        const singularName = model.name.charAt(0).toLowerCase() + model.name.slice(1);

        lines.push(`${this.indent}function get${model.name}ById(id: string) {`);
        lines.push(`${this.indent}${this.indent}return ${varName}.value.find((item) => item.id === id);`);
        lines.push(`${this.indent}}`);
        lines.push('');
      }
    }

    lines.push(`${this.indent}// ========================================`);
    lines.push(`${this.indent}// Return (Public API)`);
    lines.push(`${this.indent}// ========================================`);
    lines.push(`${this.indent}return {`);

    // Export state from models
    if (models.length > 0) {
      lines.push(`${this.indent}${this.indent}// Data model state`);
      for (const model of models) {
        const varName = this.modelToVarName(model.name);
        lines.push(`${this.indent}${this.indent}${varName},`);
      }
    }

    // Export state from logic
    if (logic.length > 0 && logic.some(l => l.state && l.state.length > 0)) {
      lines.push(`${this.indent}${this.indent}// Logic state`);
      for (const logicSection of logic) {
        if (logicSection.state) {
          for (const state of logicSection.state) {
            lines.push(`${this.indent}${this.indent}${this.snakeToCamelCase(state.name)},`);
          }
        }
      }
    }

    // Export computed
    if (computed.length > 0) {
      lines.push(`${this.indent}${this.indent}// Computed values`);
      for (const comp of computed) {
        lines.push(`${this.indent}${this.indent}${this.snakeToCamelCase(comp.name)},`);
      }
    }

    // Export actions
    if (logic.length > 0 && logic.some(l => l.processes.length > 0)) {
      lines.push(`${this.indent}${this.indent}// Actions`);
      for (const logicSection of logic) {
        for (const process of logicSection.processes) {
          lines.push(`${this.indent}${this.indent}${this.snakeToCamelCase(process.name)},`);
        }
      }
    }

    // Export helper functions
    if (models.length > 0) {
      lines.push(`${this.indent}${this.indent}// Helper functions`);
      for (const model of models) {
        lines.push(`${this.indent}${this.indent}get${model.name}ById,`);
      }
    }

    lines.push(`${this.indent}};`);
    lines.push('});');

    return {
      path: 'src/stores/app.ts',
      content: lines.join('\n'),
    };
  }

  /**
   * Convert APML state type to TypeScript type
   */
  private stateTypeToTS(type: string): string {
    if (type.startsWith('list of ')) {
      const itemType = type.substring(8);
      // Check if it's a model reference
      if (itemType.charAt(0) === itemType.charAt(0).toUpperCase()) {
        return `${itemType}[]`;
      }
      return `${this.primitiveTypeToTS(itemType)}[]`;
    }

    const typeMap: Record<string, string> = {
      text: 'string',
      number: 'number',
      boolean: 'boolean',
      date: 'Date',
      timestamp: 'Date',
      'text | null': 'string | null',
      'number | null': 'number | null',
    };

    return typeMap[type] || type;
  }

  /**
   * Get default value for a state type
   */
  private getDefaultValue(type: string, providedDefault?: any): string {
    if (providedDefault !== undefined) {
      // Handle specific default values
      if (providedDefault === 'null') return 'null';
      if (providedDefault === 'true') return 'true';
      if (providedDefault === 'false') return 'false';
      if (providedDefault === '[]') return '[]';
      if (typeof providedDefault === 'string' && providedDefault.startsWith('"')) {
        return providedDefault;
      }
      if (typeof providedDefault === 'string' && !isNaN(Number(providedDefault))) {
        return providedDefault;
      }
      return `"${providedDefault}"`;
    }

    if (type.startsWith('list of ')) return '[]';
    if (type.includes('| null') || type.includes('|null')) return 'null';
    if (type === 'boolean') return 'false';
    if (type === 'number') return '0';
    if (type === 'text') return '""';

    return 'null';
  }

  private modelToVarName(modelName: string): string {
    // Convert PascalCase to camelCase and pluralize
    const camelCase = modelName.charAt(0).toLowerCase() + modelName.slice(1);
    // Simple pluralization
    return camelCase.endsWith('s') ? camelCase : camelCase + 's';
  }

  /**
   * Generate the body of a computed property from APML expression
   */
  private generateComputedBody(comp: ComputedValue): string {
    const expression = comp.expression || comp.value;

    if (!expression) {
      return 'return null; // No expression provided';
    }

    // Convert expression to string if needed
    const expressionStr = this.expressionToString(expression);

    // Check if expression is a multi-line function definition
    if (expressionStr.trim().startsWith('function(')) {
      // For function expressions, just return the function itself
      return `return ${expressionStr};`;
    }

    // Check for arrow functions
    if (expressionStr.includes('=>') && !expressionStr.includes('?')) {
      return `return ${expressionStr};`;
    }

    // Simple expression - convert APML operators to JavaScript
    let jsExpression = this.convertAPMLToJS(expressionStr);

    // Convert snake_case variable names to camelCase
    jsExpression = jsExpression.replace(/\b[a-z]+(_[a-z]+)+\b/g, (match) => {
      return this.snakeToCamelCase(match);
    });

    return `return ${jsExpression};`;
  }

  /**
   * Convert Expression type to string representation
   */
  private expressionToString(expr: any): string {
    if (typeof expr === 'string') {
      return expr;
    }
    if (typeof expr === 'number' || typeof expr === 'boolean') {
      return String(expr);
    }
    // For complex expression objects, convert to JSON for now
    // TODO: Implement proper expression tree to JS conversion
    return JSON.stringify(expr);
  }

  /**
   * Convert APML expression syntax to JavaScript
   */
  private convertAPMLToJS(expression: string): string {
    let result = expression;

    // Convert APML comparison operators to JavaScript
    result = result.replace(/\s+equals\s+/g, ' === ');
    result = result.replace(/\s+not equals\s+/g, ' !== ');
    result = result.replace(/\s+and\s+/g, ' && ');
    result = result.replace(/\s+or\s+/g, ' || ');
    result = result.replace(/\s+not\s+/g, ' !');

    return result;
  }

  // ==========================================================================
  // Vue Components
  // ==========================================================================

  private generateComponent(iface: InterfaceSection, doc: APMLDocument): GeneratedFile {
    const lines: string[] = [];
    const componentName = this.toComponentName(iface.name);

    // Template section
    lines.push('<template>');
    lines.push(`${this.indent}<div class="${this.toKebabCase(iface.name)}">`);

    // Generate template structure from UI elements
    for (const element of iface.elements) {
      this.generateUIElement(element, lines, 2);
    }

    lines.push(`${this.indent}</div>`);
    lines.push('</template>');
    lines.push('');

    // Script section
    lines.push('<script setup lang="ts">');
    lines.push("import { computed } from 'vue';");
    lines.push("import { useAppStore } from '../stores/app';");
    lines.push('');
    lines.push('const store = useAppStore();');
    lines.push('');

    // Add state refs from logic sections
    if (doc.logic.length > 0) {
      const stateVars: string[] = [];
      for (const logicSection of doc.logic) {
        if (logicSection.state) {
          for (const state of logicSection.state) {
            stateVars.push(this.snakeToCamelCase(state.name));
          }
        }
      }

      if (stateVars.length > 0) {
        lines.push('// State from store');
        for (const varName of stateVars) {
          lines.push(`const ${varName} = computed(() => store.${varName});`);
        }
        lines.push('');
      }
    }

    // Destructure commonly used computed values
    if (doc.computed.length > 0) {
      lines.push('// Computed properties from store');
      for (const comp of doc.computed) {
        const camelName = this.snakeToCamelCase(comp.name);
        lines.push(`const ${camelName} = computed(() => store.${camelName});`);
      }
      lines.push('');
    }

    // Add helper function references if needed
    if (doc.data.length > 0) {
      lines.push('// Helper functions');
      for (const model of doc.data) {
        lines.push(`const get${model.name}ById = store.get${model.name}ById;`);
      }
      lines.push('');
    }

    lines.push('</script>');
    lines.push('');

    // Style section
    lines.push('<style scoped>');
    lines.push('/* Component uses global styles */');
    lines.push('</style>');

    return {
      path: `src/components/${componentName}.vue`,
      content: lines.join('\n'),
    };
  }

  /**
   * Generate a UI element (show, when, for_each, virtualized_list)
   */
  private generateUIElement(element: UIElement, lines: string[], indentLevel: number): void {
    const indent = this.indent.repeat(indentLevel);

    if (element.type === 'show') {
      this.generateShowElement(element, lines, indentLevel);
    } else if (element.type === 'when' || element.type === 'if') {
      this.generateConditionalElement(element, lines, indentLevel);
    } else if (element.type === 'for_each') {
      this.generateIterationElement(element, lines, indentLevel);
    } else if (element.type === 'virtualized_list') {
      this.generateVirtualizedListElement(element, lines, indentLevel);
    }
  }

  /**
   * Generate a show element with proper HTML tag
   */
  private generateShowElement(element: ShowElement, lines: string[], indentLevel: number): void {
    const indent = this.indent.repeat(indentLevel);
    const tag = this.getHTMLTag(element.elementName);
    const className = this.toKebabCase(element.elementName);
    const attributes: string[] = [];

    // Add class attribute
    attributes.push(`class="${className}"`);

    // Process properties to generate attributes
    const textContent = this.processProperties(element.properties, attributes);

    // Build opening tag
    const openTag = attributes.length > 0
      ? `<${tag} ${attributes.join(' ')}>`
      : `<${tag}>`;

    lines.push(`${indent}${openTag}`);

    // Add text content if present
    if (textContent) {
      lines.push(`${indent}${this.indent}${textContent}`);
    }

    // Generate children
    if (element.children && element.children.length > 0) {
      for (const child of element.children) {
        this.generateUIElement(child, lines, indentLevel + 1);
      }
    }

    // Close tag
    lines.push(`${indent}</${tag}>`);
  }

  /**
   * Generate a conditional element (when/if) with v-if
   */
  private generateConditionalElement(element: ConditionalElement, lines: string[], indentLevel: number): void {
    const indent = this.indent.repeat(indentLevel);
    const condition = this.expressionToVueCondition(element.condition);

    // Wrap conditional content in a div with v-if
    lines.push(`${indent}<div v-if="${condition}">`);

    // Generate then block
    for (const thenElement of element.then) {
      this.generateUIElement(thenElement, lines, indentLevel + 1);
    }

    lines.push(`${indent}</div>`);

    // Generate else block if present
    if (element.else && element.else.length > 0) {
      lines.push(`${indent}<div v-else>`);
      for (const elseElement of element.else) {
        this.generateUIElement(elseElement, lines, indentLevel + 1);
      }
      lines.push(`${indent}</div>`);
    }
  }

  /**
   * Generate an iteration element (for_each) with v-for
   */
  private generateIterationElement(element: IterationElement, lines: string[], indentLevel: number): void {
    const indent = this.indent.repeat(indentLevel);
    const collection = this.expressionToString(element.collection);
    const itemName = element.itemName;

    // Wrap iteration content in a div with v-for
    lines.push(`${indent}<div v-for="${itemName} in ${collection}" :key="${itemName}.id">`);

    // Generate body
    for (const bodyElement of element.body) {
      this.generateUIElement(bodyElement, lines, indentLevel + 1);
    }

    lines.push(`${indent}</div>`);
  }

  /**
   * Generate a virtualized_list element
   * For now, generates a simple v-for loop - virtualization can be added with a library later
   */
  private generateVirtualizedListElement(element: VirtualizedListElement, lines: string[], indentLevel: number): void {
    const indent = this.indent.repeat(indentLevel);
    const items = this.expressionToString(element.items);
    const camelItems = this.snakeToCamelCase(items);

    // Generate a scrollable container with v-for
    // In production, this would use vue-virtual-scroller or similar
    lines.push(`${indent}<div class="${this.toKebabCase(element.name)} virtualized-list">`);
    lines.push(`${indent}${this.indent}<div v-for="post in ${camelItems}" :key="post.id" class="list-item">`);

    // Generate template content inside the loop
    if (element.template && element.template.length > 0) {
      for (const templateElement of element.template) {
        // The template content should use "post" instead of "item"
        this.generateUIElement(templateElement, lines, indentLevel + 2);
      }
    }

    lines.push(`${indent}${this.indent}</div>`);
    lines.push(`${indent}</div>`);
  }

  /**
   * Map APML element names to HTML tags
   */
  private getHTMLTag(elementName: string): string {
    const lowerName = elementName.toLowerCase();

    // Special cases first (more specific)
    // Map button-like elements to button
    if (lowerName.endsWith('_button') || lowerName === 'button') {
      return 'button';
    }
    if ((lowerName.endsWith('_tab') || lowerName === 'tab') && !lowerName.includes('table')) {
      return 'button';
    }
    if (lowerName.includes('nav_item') || lowerName === 'nav_item') {
      return 'button';
    }

    // Direct mappings
    const tagMap: Record<string, string> = {
      header: 'header',
      footer: 'footer',
      nav: 'nav',
      main: 'main',
      section: 'section',
      article: 'article',
      aside: 'aside',
      button: 'button',
      input: 'input',
      textarea: 'textarea',
      form: 'form',
      label: 'label',
      img: 'img',
      video: 'video',
      audio: 'audio',
      canvas: 'canvas',
      svg: 'svg',
      table: 'table',
      ul: 'ul',
      ol: 'ol',
      li: 'li',
      span: 'span',
      p: 'p',
      h1: 'h1',
      h2: 'h2',
      h3: 'h3',
      h4: 'h4',
      h5: 'h5',
      h6: 'h6',
    };

    // Check if element name contains known tag
    for (const [key, tag] of Object.entries(tagMap)) {
      if (lowerName === key || lowerName.includes('_' + key) || lowerName.includes(key + '_')) {
        return tag;
      }
    }

    // Default to div
    return 'div';
  }

  /**
   * Transform relationship expressions to use helper functions
   * e.g., post.author.avatar_url -> getUserById(post.author_id)?.avatar_url
   */
  private transformRelationships(expression: string): string {
    // Handle post.author.* patterns
    // This is a simple transformation for the belongs_to relationship
    const authorPattern = /(\w+)\.author\.(\w+)/g;
    let transformed = expression.replace(authorPattern, (match, itemVar, field) => {
      return `getUserById(${itemVar}.author_id)?.${field}`;
    });

    // Handle post.author pattern without a field (just checking existence)
    const authorExistsPattern = /(\w+)\.author(?!\w)/g;
    transformed = transformed.replace(authorExistsPattern, (match, itemVar) => {
      return `getUserById(${itemVar}.author_id)`;
    });

    return transformed;
  }

  /**
   * Process element properties and generate attributes
   * Returns text content if any
   */
  private processProperties(properties: Record<string, string | Expression>, attributes: string[]): string | null {
    let textContent: string | null = null;

    for (const [key, value] of Object.entries(properties)) {
      let valueStr = this.expressionToString(value);

      // Transform relationship expressions
      valueStr = this.transformRelationships(valueStr);

      if (key === 'text' || key === 'label') {
        // Check if it's a dynamic expression
        if (valueStr.includes('.') || valueStr.includes('(') || valueStr.includes('+')) {
          textContent = `{{ ${valueStr} }}`;
        } else if (valueStr.startsWith('"') || valueStr.startsWith("'")) {
          // Static string - remove quotes
          textContent = valueStr.slice(1, -1);
        } else {
          textContent = `{{ ${valueStr} }}`;
        }
      } else if (key === 'active') {
        // Convert active property to dynamic class binding
        const cleanValue = this.expressionToVueCondition(valueStr);
        const classBinding = `:class="{ active: ${cleanValue} }"`;
        attributes.push(classBinding);
      } else if (key === 'src') {
        // Image/video source
        if (valueStr.includes('.')) {
          attributes.push(`:src="${valueStr}"`);
        } else {
          attributes.push(`src="${valueStr}"`);
        }
      } else if (key === 'icon') {
        // Icon - check if dynamic or static
        if (valueStr.includes('?') || valueStr.includes('.')) {
          // Dynamic icon - use Vue binding
          attributes.push(`:data-icon="${valueStr}"`);
        } else {
          // Static icon - remove quotes from icon value for cleaner output
          const cleanIcon = valueStr.replace(/^["']|["']$/g, '');
          attributes.push(`data-icon="${cleanIcon}"`);
        }
      } else if (key === 'color') {
        // Handle color conditionals for dynamic styling
        if (valueStr.includes('?') || valueStr.includes(':')) {
          // Dynamic color - use Vue class binding
          const cleanValue = this.expressionToVueCondition(valueStr);
          attributes.push(`:class="{ [${cleanValue}]: true }"`);
        }
      } else if (key.startsWith('on_')) {
        // Event handlers - skip for now, handle in script section
        continue;
      } else {
        // Style properties - add as comments for now
        // These should be handled by the style section
        continue;
      }
    }

    return textContent;
  }

  /**
   * Convert expression to Vue condition syntax
   */
  private expressionToVueCondition(expr: Expression | string): string {
    const exprStr = this.expressionToString(expr);

    // Transform relationships first
    let result = this.transformRelationships(exprStr);

    // Convert APML operators to JavaScript
    result = this.convertAPMLToJS(result);

    // Convert 'not' to '!' if it appears at the start
    result = result.replace(/^not\s+/, '!');
    result = result.replace(/\(\s*not\s+/g, '(!');

    // Convert snake_case to camelCase for variables, but NOT for object properties
    // Only convert standalone variables like "active_feed_tab" but not "post.author_id"
    result = result.replace(/\b([a-z]+(?:_[a-z]+)+)\b/g, (match, varName, offset) => {
      // Check if this is preceded by a dot (property access)
      if (offset > 0 && result[offset - 1] === '.') {
        return match; // Keep as-is if it's a property
      }
      return this.snakeToCamelCase(match);
    });

    return result;
  }

  // ==========================================================================
  // APML-EDU Generation Methods
  // ==========================================================================

  /**
   * Generate education store (for content/methodology)
   */
  private generateEducationStore(doc: APMLDocument): GeneratedFile {
    const lines: string[] = [];

    lines.push("import { defineStore } from 'pinia';");
    lines.push("import { ref, computed } from 'vue';");
    lines.push("import type { Course, Seed, LEGO, PracticePhrase, LearnerProgress } from '../types/education';");
    lines.push('');
    lines.push('/**');
    lines.push(' * Education Store - Manages course content and methodology');
    lines.push(' * Generated from APML-EDU specification');
    lines.push(' */');
    lines.push("export const useEducationStore = defineStore('education', () => {");
    lines.push(`${this.indent}// Content hierarchies`);
    lines.push(`${this.indent}const courses = ref<Course[]>([]);`);
    lines.push(`${this.indent}const seeds = ref<Seed[]>([]);`);
    lines.push(`${this.indent}const legos = ref<LEGO[]>([]);`);
    lines.push(`${this.indent}const phrases = ref<PracticePhrase[]>([]);`);
    lines.push('');
    lines.push(`${this.indent}// Learner progress`);
    lines.push(`${this.indent}const learnerProgress = ref<LearnerProgress | null>(null);`);
    lines.push('');
    lines.push(`${this.indent}// Methodology parameters`);
    lines.push(`${this.indent}const debuCount = ref<number>(7);`);
    lines.push(`${this.indent}const eterSchedule = ref<any[]>([]);`);
    lines.push('');
    lines.push(`${this.indent}// Computed: Current seed`);
    lines.push(`${this.indent}const currentSeed = computed(() => {`);
    lines.push(`${this.indent}${this.indent}if (!learnerProgress.value) return null;`);
    lines.push(`${this.indent}${this.indent}return seeds.value.find(s => s.sequence_number === learnerProgress.value!.current_seed);`);
    lines.push(`${this.indent}});`);
    lines.push('');
    lines.push(`${this.indent}// Actions: Load course manifest`);
    lines.push(`${this.indent}async function loadCourseManifest(courseCode: string) {`);
    lines.push(`${this.indent}${this.indent}// TODO: Implement manifest loading`);
    lines.push(`${this.indent}${this.indent}console.log('Loading manifest for', courseCode);`);
    lines.push(`${this.indent}}`);
    lines.push('');
    lines.push(`${this.indent}// Actions: Initialize learner session`);
    lines.push(`${this.indent}async function initializeSession(learnerId: string, courseCode: string) {`);
    lines.push(`${this.indent}${this.indent}// TODO: Implement session initialization`);
    lines.push(`${this.indent}${this.indent}console.log('Initializing session for', learnerId, courseCode);`);
    lines.push(`${this.indent}}`);
    lines.push('');
    lines.push(`${this.indent}return {`);
    lines.push(`${this.indent}${this.indent}courses,`);
    lines.push(`${this.indent}${this.indent}seeds,`);
    lines.push(`${this.indent}${this.indent}legos,`);
    lines.push(`${this.indent}${this.indent}phrases,`);
    lines.push(`${this.indent}${this.indent}learnerProgress,`);
    lines.push(`${this.indent}${this.indent}debuCount,`);
    lines.push(`${this.indent}${this.indent}eterSchedule,`);
    lines.push(`${this.indent}${this.indent}currentSeed,`);
    lines.push(`${this.indent}${this.indent}loadCourseManifest,`);
    lines.push(`${this.indent}${this.indent}initializeSession,`);
    lines.push(`${this.indent}};`);
    lines.push('});');

    return {
      path: 'src/stores/education.ts',
      content: lines.join('\n'),
    };
  }

  /**
   * Generate audio store (for audio pipeline)
   */
  private generateAudioStore(doc: APMLDocument): GeneratedFile {
    const lines: string[] = [];

    lines.push("import { defineStore } from 'pinia';");
    lines.push("import { ref, computed } from 'vue';");
    lines.push("import type { AudioSample, GenerationJob, SampleFlag } from '../types/education';");
    lines.push('');
    lines.push('/**');
    lines.push(' * Audio Store - Manages audio pipeline and samples');
    lines.push(' * Generated from APML-EDU specification');
    lines.push(' */');
    lines.push("export const useAudioStore = defineStore('audio', () => {");
    lines.push(`${this.indent}// Audio samples registry`);
    lines.push(`${this.indent}const audioSamples = ref<AudioSample[]>([]);`);
    lines.push(`${this.indent}const sampleFlags = ref<SampleFlag[]>([]);`);
    lines.push('');
    lines.push(`${this.indent}// Generation jobs`);
    lines.push(`${this.indent}const currentJob = ref<GenerationJob | null>(null);`);
    lines.push('');
    lines.push(`${this.indent}// Computed: Generation progress`);
    lines.push(`${this.indent}const generationProgress = computed(() => {`);
    lines.push(`${this.indent}${this.indent}if (!currentJob.value) return 0;`);
    lines.push(`${this.indent}${this.indent}return (currentJob.value.generated_count / currentJob.value.total_phrases) * 100;`);
    lines.push(`${this.indent}});`);
    lines.push('');
    lines.push(`${this.indent}// Computed: Flagged samples`);
    lines.push(`${this.indent}const flaggedSamples = computed(() => {`);
    lines.push(`${this.indent}${this.indent}return sampleFlags.value.filter(f => f.status === 'flagged');`);
    lines.push(`${this.indent}});`);
    lines.push('');
    lines.push(`${this.indent}// Actions: Start audio generation`);
    lines.push(`${this.indent}async function startGeneration(courseCode: string) {`);
    lines.push(`${this.indent}${this.indent}// TODO: Call Phase 8 API`);
    lines.push(`${this.indent}${this.indent}console.log('Starting generation for', courseCode);`);
    lines.push(`${this.indent}}`);
    lines.push('');
    lines.push(`${this.indent}// Actions: Flag sample`);
    lines.push(`${this.indent}async function flagSample(sampleUuid: string, flagType: string, notes?: string) {`);
    lines.push(`${this.indent}${this.indent}// TODO: Update sample flag`);
    lines.push(`${this.indent}${this.indent}console.log('Flagging sample', sampleUuid, flagType);`);
    lines.push(`${this.indent}}`);
    lines.push('');
    lines.push(`${this.indent}// Actions: Get audio URL`);
    lines.push(`${this.indent}async function getAudioUrl(uuid: string): Promise<string> {`);
    lines.push(`${this.indent}${this.indent}// TODO: Get signed S3 URL`);
    lines.push(`${this.indent}${this.indent}return \`https://s3.amazonaws.com/bucket/\${uuid}.mp3\`;`);
    lines.push(`${this.indent}}`);
    lines.push('');
    lines.push(`${this.indent}return {`);
    lines.push(`${this.indent}${this.indent}audioSamples,`);
    lines.push(`${this.indent}${this.indent}sampleFlags,`);
    lines.push(`${this.indent}${this.indent}currentJob,`);
    lines.push(`${this.indent}${this.indent}generationProgress,`);
    lines.push(`${this.indent}${this.indent}flaggedSamples,`);
    lines.push(`${this.indent}${this.indent}startGeneration,`);
    lines.push(`${this.indent}${this.indent}flagSample,`);
    lines.push(`${this.indent}${this.indent}getAudioUrl,`);
    lines.push(`${this.indent}};`);
    lines.push('});');

    return {
      path: 'src/stores/audio.ts',
      content: lines.join('\n'),
    };
  }

  /**
   * Generate progress tracking component
   */
  private generateProgressTracking(doc: APMLDocument): GeneratedFile {
    const lines: string[] = [];

    lines.push('<template>');
    lines.push(`${this.indent}<div class="progress-tracker">`);
    lines.push(`${this.indent}${this.indent}<div class="progress-stats">`);
    lines.push(`${this.indent}${this.indent}${this.indent}<div class="stat">`);
    lines.push(`${this.indent}${this.indent}${this.indent}${this.indent}<span class="label">Seeds Completed</span>`);
    lines.push(`${this.indent}${this.indent}${this.indent}${this.indent}<span class="value">{{ progress?.total_seeds_completed || 0 }}</span>`);
    lines.push(`${this.indent}${this.indent}${this.indent}</div>`);
    lines.push(`${this.indent}${this.indent}${this.indent}<div class="stat">`);
    lines.push(`${this.indent}${this.indent}${this.indent}${this.indent}<span class="label">Accuracy</span>`);
    lines.push(`${this.indent}${this.indent}${this.indent}${this.indent}<span class="value">{{ formatPercentage(progress?.accuracy_rate) }}</span>`);
    lines.push(`${this.indent}${this.indent}${this.indent}</div>`);
    lines.push(`${this.indent}${this.indent}${this.indent}<div class="stat">`);
    lines.push(`${this.indent}${this.indent}${this.indent}${this.indent}<span class="label">Difficulty</span>`);
    lines.push(`${this.indent}${this.indent}${this.indent}${this.indent}<span class="value">{{ progress?.difficulty_level || 'normal' }}</span>`);
    lines.push(`${this.indent}${this.indent}${this.indent}</div>`);
    lines.push(`${this.indent}${this.indent}</div>`);
    lines.push(`${this.indent}</div>`);
    lines.push('</template>');
    lines.push('');
    lines.push('<script setup lang="ts">');
    lines.push("import { computed } from 'vue';");
    lines.push("import { useEducationStore } from '../stores/education';");
    lines.push('');
    lines.push('const store = useEducationStore();');
    lines.push('const progress = computed(() => store.learnerProgress);');
    lines.push('');
    lines.push('function formatPercentage(value?: number): string {');
    lines.push(`${this.indent}if (!value) return '0%';`);
    lines.push(`${this.indent}return \`\${Math.round(value * 100)}%\`;`);
    lines.push('}');
    lines.push('</script>');
    lines.push('');
    lines.push('<style scoped>');
    lines.push('.progress-tracker {');
    lines.push(`${this.indent}padding: 1rem;`);
    lines.push('}');
    lines.push('.progress-stats {');
    lines.push(`${this.indent}display: flex;`);
    lines.push(`${this.indent}gap: 2rem;`);
    lines.push('}');
    lines.push('.stat {');
    lines.push(`${this.indent}display: flex;`);
    lines.push(`${this.indent}flex-direction: column;`);
    lines.push(`${this.indent}gap: 0.5rem;`);
    lines.push('}');
    lines.push('</style>');

    return {
      path: 'src/components/ProgressTracker.vue',
      content: lines.join('\n'),
    };
  }

  /**
   * Generate adaptive logic handlers
   */
  private generateAdaptiveLogic(doc: APMLDocument): GeneratedFile {
    const lines: string[] = [];

    lines.push('/**');
    lines.push(' * Adaptive Logic Handlers');
    lines.push(' * Generated from APML-EDU adaptation rules');
    lines.push(' */');
    lines.push('');
    lines.push("import type { LearnerProgress, AdaptationEvent } from '../types/education';");
    lines.push('');
    lines.push('export class AdaptationEngine {');
    lines.push(`${this.indent}private adaptationHistory: AdaptationEvent[] = [];`);
    lines.push('');
    lines.push(`${this.indent}/**`);
    lines.push(`${this.indent} * Evaluate adaptation rules based on learner performance`);
    lines.push(`${this.indent} */`);
    lines.push(`${this.indent}evaluateAdaptation(progress: LearnerProgress): AdaptationEvent[] {`);
    lines.push(`${this.indent}${this.indent}const events: AdaptationEvent[] = [];`);
    lines.push('');

    // Add adaptation rules from spec
    if (doc.adaptation) {
      for (const rule of doc.adaptation) {
        lines.push(`${this.indent}${this.indent}// Rule: ${rule.name}`);
        if (rule.observe) {
          lines.push(`${this.indent}${this.indent}// Observes: ${rule.observe}`);
        }
        lines.push(`${this.indent}${this.indent}// TODO: Implement ${rule.name} logic`);
        lines.push('');
      }
    }

    lines.push(`${this.indent}${this.indent}this.adaptationHistory.push(...events);`);
    lines.push(`${this.indent}${this.indent}return events;`);
    lines.push(`${this.indent}}`);
    lines.push('');
    lines.push(`${this.indent}/**`);
    lines.push(`${this.indent} * Get adaptation history for a learner`);
    lines.push(`${this.indent} */`);
    lines.push(`${this.indent}getHistory(): AdaptationEvent[] {`);
    lines.push(`${this.indent}${this.indent}return this.adaptationHistory;`);
    lines.push(`${this.indent}}`);
    lines.push('}');

    return {
      path: 'src/services/adaptation.ts',
      content: lines.join('\n'),
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Convert snake_case to camelCase
   */
  private snakeToCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private toComponentName(name: string): string {
    // Convert to PascalCase
    return name
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  private toKebabCase(name: string): string {
    return name.replace(/_/g, '-').toLowerCase();
  }
}

/**
 * Convenience function to generate Vue files from APML
 */
export function generateVue(doc: APMLDocument): GeneratedFile[] {
  const generator = new VueGenerator();
  return generator.generate(doc);
}
