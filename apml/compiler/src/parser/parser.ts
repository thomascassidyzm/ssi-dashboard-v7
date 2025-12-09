/**
 * APML Parser
 *
 * Converts APML text into an Abstract Syntax Tree (AST).
 * This is a basic regex-based parser - sufficient for the scaffold.
 *
 * TODO: Replace with proper parser (PEG/ANTLR) for production use.
 */

import type {
  APMLDocument,
  DataModel,
  Field,
  FieldType,
  FieldModifier,
  InterfaceSection,
  ShowElement,
  UIElement,
  ConditionalElement,
  ComputedValue,
  LogicSection,
  VirtualizedListElement,
  StateDeclaration,
  Process,
  Action,
  ContentDefinition,
  MethodologyDefinition,
  ProductionDefinition,
  AudioConfiguration,
  ParameterScope,
  AdaptationRule,
} from '../types/ast.js';

export class APMLParser {
  private lines: string[] = [];
  private currentLine = 0;

  /**
   * Parse APML text into an AST
   */
  parse(input: string): APMLDocument {
    this.lines = input.split('\n');
    this.currentLine = 0;

    const doc: APMLDocument = {
      data: [],
      interfaces: [],
      logic: [],
      computed: [],
      state_machines: [],
      realtime: [],
      external: [],
    };

    while (this.currentLine < this.lines.length) {
      const line = this.getCurrentLine();
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) {
        this.advance();
        continue;
      }

      // Parse top-level constructs
      if (trimmed.startsWith('app ')) {
        doc.app = this.parseApp();
      } else if (trimmed.startsWith('data ')) {
        doc.data.push(this.parseDataModel());
      } else if (trimmed.startsWith('interface ')) {
        doc.interfaces.push(this.parseInterface());
      } else if (trimmed.startsWith('computed ')) {
        doc.computed.push(this.parseComputed());
      } else if (trimmed.startsWith('logic ')) {
        doc.logic.push(this.parseLogic());
      } else if (trimmed.startsWith('integrations:')) {
        doc.integrations = this.parseIntegrations();
      } else if (trimmed.startsWith('content ')) {
        // APML-EDU: Content hierarchies
        if (!doc.content) doc.content = [];
        doc.content.push(this.parseContent());
      } else if (trimmed.startsWith('methodology ')) {
        // APML-EDU: Methodology definitions
        if (!doc.methodology) doc.methodology = [];
        doc.methodology.push(this.parseMethodology());
      } else if (trimmed.startsWith('production ')) {
        // APML-EDU: Production definitions
        if (!doc.production) doc.production = [];
        doc.production.push(this.parseProduction());
      } else if (trimmed.startsWith('audio:')) {
        // APML-EDU: Audio configuration
        doc.audio = this.parseAudio();
      } else if (trimmed.startsWith('parameters:')) {
        // APML-EDU: Parameter scopes
        doc.parameters = this.parseParameters();
      } else if (trimmed.startsWith('adaptation ')) {
        // APML-EDU: Adaptation rules
        if (!doc.adaptation) doc.adaptation = [];
        doc.adaptation.push(this.parseAdaptation());
      } else if (trimmed.startsWith('theme:') || trimmed.startsWith('registry:')) {
        // Skip these sections for now - they don't generate code
        this.advance();
        const sectionIndent = this.getIndentLevel();
        while (this.hasMore() && this.getIndentLevel() > 0) {
          this.advance();
        }
      } else {
        // Unknown construct - skip for now
        this.advance();
      }
    }

    return doc;
  }

  // ==========================================================================
  // App Declaration
  // ==========================================================================

  private parseApp() {
    const line = this.getCurrentLine();
    const match = line.match(/^app\s+(\w+):/);
    if (!match) throw new Error(`Invalid app declaration: ${line}`);

    const name = match[1];
    this.advance();

    // TODO: Parse app properties (title, description, version, etc.)
    // For now, skip to next section
    while (this.hasMore() && this.getIndentLevel() > 0) {
      this.advance();
    }

    return { name };
  }

  // ==========================================================================
  // Data Models
  // ==========================================================================

  private parseDataModel(): DataModel {
    const line = this.getCurrentLine();
    const match = line.match(/^data\s+(\w+):/);
    if (!match) throw new Error(`Invalid data declaration: ${line}`);

    const name = match[1];
    const baseIndent = this.getIndentLevel();
    this.advance();

    const fields: Field[] = [];

    while (this.hasMore() && this.getIndentLevel() > baseIndent) {
      const fieldLine = this.getCurrentLine().trim();

      // Skip empty lines and comments
      if (!fieldLine || fieldLine.startsWith('#')) {
        this.advance();
        continue;
      }

      // Check for relationships section (skip for now)
      if (fieldLine === 'relationships:') {
        // TODO: Parse relationships
        this.advance();
        while (this.hasMore() && this.getIndentLevel() > baseIndent + 1) {
          this.advance();
        }
        continue;
      }

      // Parse field
      const fieldMatch = fieldLine.match(/^(\w+):\s+(.+)$/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        const fieldDef = fieldMatch[2];
        fields.push(this.parseField(fieldName, fieldDef));
      }

      this.advance();
    }

    return { name, fields };
  }

  private parseField(name: string, definition: string): Field {
    const parts = definition.split(/\s+/);
    const type = this.parseFieldType(parts[0]);
    const modifiers: FieldModifier[] = [];
    let defaultValue: string | undefined;

    // Parse modifiers
    let i = 1;
    while (i < parts.length) {
      const modifier = parts[i];
      if (modifier === 'required' || modifier === 'optional' || modifier === 'unique' || modifier === 'auto') {
        modifiers.push(modifier);
        i++;
      } else if (modifier === 'default:') {
        // Next part is the default value
        if (i + 1 < parts.length) {
          defaultValue = parts[i + 1];
          modifiers.push({ default: defaultValue });
          i += 2;
        } else {
          i++;
        }
      } else if (modifier.startsWith('default:')) {
        // Handle case where there's no space: "default:0"
        defaultValue = modifier.substring(8);
        modifiers.push({ default: defaultValue });
        i++;
      } else {
        // Unknown modifier, skip
        i++;
      }
    }

    return { name, type, modifiers, defaultValue };
  }

  private parseFieldType(typeStr: string): FieldType {
    // Handle list types
    if (typeStr.startsWith('list')) {
      const match = typeStr.match(/list\s+of\s+(\w+)/);
      if (match) {
        return { list: match[1] as FieldType };
      }
    }

    // Handle basic types
    const basicTypes = ['text', 'number', 'boolean', 'date', 'timestamp', 'email', 'url', 'unique_id', 'money', 'percentage'];
    if (basicTypes.includes(typeStr)) {
      return typeStr as FieldType;
    }

    // Assume it's a model reference
    return { model: typeStr };
  }

  // ==========================================================================
  // Interface Sections
  // ==========================================================================

  private parseInterface(): InterfaceSection {
    const line = this.getCurrentLine();
    const match = line.match(/^interface\s+(\w+):/);
    if (!match) throw new Error(`Invalid interface declaration: ${line}`);

    const name = match[1];
    const interfaceIndent = this.getIndentLevel();
    this.advance();

    const elements: UIElement[] = [];

    // Parse elements that are children of this interface (indented more than the interface line)
    while (this.hasMore()) {
      const currentIndent = this.getIndentLevel();
      const elementLine = this.getCurrentLine().trim();

      // Stop if we've dedented back to or past the interface level
      if (currentIndent <= interfaceIndent && elementLine) {
        break;
      }

      // Skip empty lines and comments
      if (!elementLine || elementLine.startsWith('#')) {
        this.advance();
        continue;
      }

      // Parse UI elements (show, when, for each, etc.)
      const element = this.parseUIElement(currentIndent);
      if (element) {
        elements.push(element);
      }
    }

    return { name, elements };
  }

  /**
   * Parse a UI element (show, when, for each, etc.)
   */
  private parseUIElement(parentIndent: number): UIElement | null {
    const line = this.getCurrentLine().trim();

    // Handle 'when' conditionals
    if (line.startsWith('when ')) {
      return this.parseConditionalElement(parentIndent);
    }

    // Handle 'show virtualized_list'
    if (line.startsWith('show virtualized_list ')) {
      return this.parseVirtualizedList(parentIndent);
    }

    // Handle 'show' statements
    if (line.startsWith('show ')) {
      return this.parseShowElement(parentIndent);
    }

    // Handle 'for each' loops (future)
    // if (line.startsWith('for each ')) {
    //   return this.parseForEachElement(parentIndent);
    // }

    // Unknown element, skip
    this.advance();
    return null;
  }

  /**
   * Parse a 'when' conditional element
   */
  private parseConditionalElement(parentIndent: number): ConditionalElement {
    const line = this.getCurrentLine().trim();
    const match = line.match(/^when\s+(.+):$/);
    if (!match) throw new Error(`Invalid when statement: ${line}`);

    const condition = match[1];
    this.advance();

    const thenElements: UIElement[] = [];
    const baseIndent = this.getIndentLevel();

    // Parse child elements
    while (this.hasMore() && this.getIndentLevel() >= baseIndent) {
      const element = this.parseUIElement(baseIndent);
      if (element) {
        thenElements.push(element);
      }
    }

    return {
      type: 'when',
      condition,
      then: thenElements,
    };
  }

  /**
   * Parse a 'show' element
   * Handles both: show <type>: and show <type> <name>:
   */
  private parseShowElement(parentIndent: number): ShowElement {
    const line = this.getCurrentLine().trim();

    // Match: show <type> <name>: OR show <type>:
    // Regex explanation:
    // - ^show\s+ : starts with "show" followed by whitespace
    // - (\w+) : capture element type (required)
    // - (?:\s+(\w+))? : optionally capture element name (non-capturing group for the space)
    // - : : must end with colon
    const match = line.match(/^show\s+(\w+)(?:\s+(\w+))?:$/);
    if (!match) throw new Error(`Invalid show statement: ${line}`);

    const elementType = match[1];
    const elementName = match[2] || elementType; // Use type as name if no name provided

    this.advance();

    const properties: Record<string, string> = {};
    const children: UIElement[] = [];
    const elementIndent = this.getIndentLevel();

    // Parse properties and nested elements (children of this show element)
    while (this.hasMore()) {
      const currentIndent = this.getIndentLevel();
      const propLine = this.getCurrentLine().trim();

      // Stop if we've dedented to or past the element's level (but skip empty lines)
      if (propLine && currentIndent < elementIndent) {
        break;
      }

      // Skip empty lines and comments
      if (!propLine || propLine.startsWith('#')) {
        this.advance();
        continue;
      }

      // Check for nested show statements, when conditionals, or virtualized_list
      if (propLine.startsWith('show ') || propLine.startsWith('when ') || propLine.startsWith('template ')) {
        const childElement = this.parseUIElement(currentIndent);
        if (childElement) {
          children.push(childElement);
        }
        continue;
      }

      // Check for special multi-line sections (on click, on scroll_near_end, etc.)
      if (propLine.startsWith('on ') && propLine.endsWith(':')) {
        // Skip event handlers for now
        const eventBaseIndent = this.getIndentLevel();
        this.advance();
        // Skip all lines that are more indented than the 'on' line
        while (this.hasMore() && this.getIndentLevel() > eventBaseIndent) {
          this.advance();
        }
        continue;
      }

      // Check for special sections like 'pagination:', 'template:', etc.
      if (propLine === 'pagination:' || propLine === 'template:') {
        // Skip these sections for now
        this.advance();
        const sectionIndent = this.getIndentLevel();
        while (this.hasMore() && this.getIndentLevel() >= sectionIndent) {
          this.advance();
        }
        continue;
      }

      // Parse regular properties
      const propMatch = propLine.match(/^(\w+):\s*(.*)$/);
      if (propMatch) {
        const propName = propMatch[1];
        const propValue = propMatch[2];
        properties[propName] = propValue;
        this.advance();
        continue;
      }

      // Unknown line, skip
      this.advance();
    }

    // Store the element name as a property if it was explicitly provided
    if (match[2]) {
      properties['id'] = match[2];
    }

    return {
      type: 'show',
      elementName: elementType,
      properties,
      children: children.length > 0 ? children : undefined,
    };
  }

  /**
   * Parse a virtualized_list element
   */
  private parseVirtualizedList(parentIndent: number): VirtualizedListElement {
    const line = this.getCurrentLine().trim();
    const match = line.match(/^show virtualized_list\s+(\w+):$/);
    if (!match) throw new Error(`Invalid virtualized_list declaration: ${line}`);

    const name = match[1];
    this.advance();

    const element: VirtualizedListElement = {
      type: 'virtualized_list',
      name,
      items: '',
    };

    const elementIndent = this.getIndentLevel();
    const templateElements: UIElement[] = [];

    while (this.hasMore()) {
      // Skip empty lines and comments first
      const propLine = this.getCurrentLine().trim();
      if (!propLine || propLine.startsWith('#')) {
        this.advance();
        continue;
      }

      // Now check indent - if we've dedented, stop
      const currentIndent = this.getIndentLevel();
      if (currentIndent < elementIndent) {
        break;
      }

      // Parse pagination section
      if (propLine === 'pagination:') {
        this.advance();
        const paginationIndent = this.getIndentLevel();
        element.pagination = { strategy: 'cursor' };

        while (this.hasMore() && this.getIndentLevel() >= paginationIndent) {
          const pLine = this.getCurrentLine().trim();
          if (!pLine || pLine.startsWith('#')) {
            this.advance();
            continue;
          }

          const pMatch = pLine.match(/^(\w+):\s*(.+)$/);
          if (pMatch) {
            const key = pMatch[1];
            const val = pMatch[2];
            if (key === 'strategy') {
              element.pagination!.strategy = val as 'cursor' | 'offset';
            } else if (key === 'load_more') {
              element.pagination!.loadMore = val;
            }
          }
          this.advance();
        }
        continue;
      }

      // Parse template section
      if (propLine.startsWith('template ')) {
        const templateMatch = propLine.match(/^template\s+(\w+):$/);
        if (templateMatch) {
          this.advance();
          const templateBaseIndent = this.getIndentLevel();

          // Parse all elements in the template
          while (this.hasMore()) {
            const currentLine = this.getCurrentLine().trim();
            const currentIndent = this.getIndentLevel();

            // Skip empty lines and comments
            if (!currentLine || currentLine.startsWith('#')) {
              this.advance();
              continue;
            }

            // Stop if we've dedented back to or past the template level
            if (currentIndent < templateBaseIndent) {
              break;
            }

            // Parse the UI element at this indent level
            const tElement = this.parseUIElement(currentIndent);
            if (tElement) {
              templateElements.push(tElement);
            }
          }
        }
        continue;
      }

      // Parse on scroll_near_end
      if (propLine.startsWith('on scroll_near_end')) {
        const scrollMatch = propLine.match(/^on scroll_near_end\(threshold:\s*(.+)\):$/);
        if (scrollMatch) {
          const threshold = scrollMatch[1];
          this.advance();
          const actionIndent = this.getIndentLevel();

          // Get the action (next line)
          if (this.hasMore() && this.getIndentLevel() >= actionIndent) {
            const actionLine = this.getCurrentLine().trim();
            element.onScrollNearEnd = {
              threshold,
              action: actionLine,
            };
          }

          // Skip remaining action lines
          while (this.hasMore() && this.getIndentLevel() >= actionIndent) {
            this.advance();
          }
        }
        continue;
      }

      // Parse regular properties
      const propMatch = propLine.match(/^(\w+):\s*(.+)$/);
      if (propMatch) {
        const key = propMatch[1];
        const val = propMatch[2];

        if (key === 'items') {
          element.items = val;
        } else if (key === 'item_height') {
          element.itemHeight = val.replace('estimated ', '');
        } else if (key === 'overscan') {
          element.overscan = parseInt(val, 10);
        }
      }

      this.advance();
    }

    if (templateElements.length > 0) {
      element.template = templateElements;
    }

    return element;
  }

  // ==========================================================================
  // Computed Values
  // ==========================================================================

  private parseComputed(): ComputedValue {
    const line = this.getCurrentLine().trim();

    // Simple syntax: computed name: expression
    const simpleMatch = line.match(/^computed\s+(\w+):\s*(.+)$/);
    if (simpleMatch) {
      const name = simpleMatch[1];
      const expression = simpleMatch[2];
      this.advance();
      return { name, expression };
    }

    // Block syntax: computed name:
    const blockMatch = line.match(/^computed\s+(\w+):$/);
    if (blockMatch) {
      const name = blockMatch[1];
      this.advance();

      let value: string | undefined;
      let format: ComputedValue['format'] | undefined;
      let cache: boolean | undefined;

      const baseIndent = this.getIndentLevel();
      while (this.hasMore() && this.getIndentLevel() >= baseIndent) {
        const propLine = this.getCurrentLine().trim();

        if (!propLine || propLine.startsWith('#')) {
          this.advance();
          continue;
        }

        // Check for multi-line value using pipe (|) syntax
        const multilineMatch = propLine.match(/^(\w+):\s*\|$/);
        if (multilineMatch && multilineMatch[1] === 'value') {
          this.advance();

          // Collect all indented lines as the multi-line value
          const valueLines: string[] = [];
          const valueIndent = this.getIndentLevel();

          while (this.hasMore()) {
            const valueLine = this.getCurrentLine();
            const currentIndent = this.getIndentLevel();

            // Empty lines are preserved
            if (!valueLine.trim()) {
              valueLines.push('');
              this.advance();
              continue;
            }

            // Stop if we encounter a line with less indentation than valueIndent
            if (currentIndent < valueIndent) {
              break;
            }

            // Preserve original indentation relative to the value block
            const relativeIndent = ' '.repeat(Math.max(0, currentIndent - valueIndent));
            valueLines.push(relativeIndent + valueLine.trim());
            this.advance();
          }

          value = valueLines.join('\n').trim();
          continue;
        }

        // Single-line property
        const propMatch = propLine.match(/^(\w+):\s*(.+)$/);
        if (propMatch) {
          const key = propMatch[1];
          const val = propMatch[2];

          if (key === 'value') {
            value = val;
          } else if (key === 'format') {
            format = val as ComputedValue['format'];
          } else if (key === 'cache') {
            cache = val === 'true';
          }
        }

        this.advance();
      }

      return { name, value, format, cache };
    }

    throw new Error(`Invalid computed declaration: ${line}`);
  }

  // ==========================================================================
  // Logic Sections
  // ==========================================================================

  private parseLogic(): LogicSection {
    const line = this.getCurrentLine();
    const match = line.match(/^logic\s+(\w+):/);
    if (!match) throw new Error(`Invalid logic declaration: ${line}`);

    const name = match[1];
    this.advance();

    const state: StateDeclaration[] = [];
    const processes: Process[] = [];
    const baseIndent = this.getIndentLevel();

    while (this.hasMore() && this.getIndentLevel() >= baseIndent) {
      const sectionLine = this.getCurrentLine().trim();

      if (!sectionLine || sectionLine.startsWith('#')) {
        this.advance();
        continue;
      }

      // Parse state section
      if (sectionLine === 'state:') {
        this.advance();
        const stateIndent = this.getIndentLevel();

        while (this.hasMore() && this.getIndentLevel() >= stateIndent) {
          const stateLine = this.getCurrentLine().trim();

          if (!stateLine || stateLine.startsWith('#')) {
            this.advance();
            continue;
          }

          // Parse state declaration: name: type default: value
          const stateMatch = stateLine.match(/^(\w+):\s+(.+)$/);
          if (stateMatch) {
            const stateName = stateMatch[1];
            const stateDef = stateMatch[2];

            // Parse type and default value
            const parts = stateDef.split(/\s+/);
            let type = parts[0];
            let defaultValue: any = undefined;

            // Handle "list of Type"
            if (type === 'list' && parts[1] === 'of') {
              type = `list of ${parts[2]}`;

              // Check for default value after type
              const defaultIdx = parts.indexOf('default:');
              if (defaultIdx !== -1 && defaultIdx + 1 < parts.length) {
                defaultValue = parts.slice(defaultIdx + 1).join(' ');
              }
            } else {
              // Check for default value
              const defaultIdx = parts.indexOf('default:');
              if (defaultIdx !== -1 && defaultIdx + 1 < parts.length) {
                defaultValue = parts.slice(defaultIdx + 1).join(' ');
              }
            }

            state.push({ name: stateName, type, defaultValue });
          }

          this.advance();
        }
        continue;
      }

      // Parse process section
      if (sectionLine.startsWith('process ')) {
        processes.push(this.parseProcess());
        continue;
      }

      // Skip unknown sections
      this.advance();
    }

    return {
      name,
      state: state.length > 0 ? state : undefined,
      processes,
      calculations: [],
      validations: [],
    };
  }

  /**
   * Parse a process definition
   */
  private parseProcess(): Process {
    const line = this.getCurrentLine().trim();
    const match = line.match(/^process\s+(\w+):$/);
    if (!match) throw new Error(`Invalid process declaration: ${line}`);

    const name = match[1];
    this.advance();

    const process: Process = {
      name,
      trigger: { type: 'custom' },
      actions: [],
    };

    const baseIndent = this.getIndentLevel();

    while (this.hasMore() && this.getIndentLevel() >= baseIndent) {
      const procLine = this.getCurrentLine().trim();

      if (!procLine || procLine.startsWith('#')) {
        this.advance();
        continue;
      }

      // Parse trigger
      if (procLine.startsWith('when ')) {
        const triggerMatch = procLine.match(/^when\s+(.+):$/);
        if (triggerMatch) {
          const triggerDesc = triggerMatch[1];

          // Determine trigger type from description
          if (triggerDesc.includes('clicks')) {
            process.trigger = { type: 'click', condition: triggerDesc };
          } else if (triggerDesc.includes('loads')) {
            process.trigger = { type: 'load' };
          } else if (triggerDesc.includes('triggered')) {
            process.trigger = { type: 'custom', condition: triggerDesc };
          } else {
            process.trigger = { type: 'custom', condition: triggerDesc };
          }
        }
        this.advance();
        continue;
      }

      // Parse on_success section
      if (procLine === 'on_success:') {
        this.advance();
        process.onSuccess = [];
        const successIndent = this.getIndentLevel();

        while (this.hasMore() && this.getIndentLevel() >= successIndent) {
          const actionLine = this.getCurrentLine().trim();
          if (actionLine && !actionLine.startsWith('#')) {
            // Simple action parsing - just store as string for now
            // Will be properly implemented in generator
          }
          this.advance();
        }
        continue;
      }

      // Parse on_error section
      if (procLine === 'on_error:') {
        this.advance();
        process.onError = [];
        const errorIndent = this.getIndentLevel();

        while (this.hasMore() && this.getIndentLevel() >= errorIndent) {
          const actionLine = this.getCurrentLine().trim();
          if (actionLine && !actionLine.startsWith('#')) {
            // Simple action parsing
          }
          this.advance();
        }
        continue;
      }

      // Parse call api action
      if (procLine.startsWith('call api ')) {
        const apiMatch = procLine.match(/^call api\s+(\w+)/);
        if (apiMatch) {
          // Will be handled in generator
        }
        this.advance();

        // Skip the remaining api call details
        const callIndent = this.getIndentLevel();
        while (this.hasMore() && this.getIndentLevel() > baseIndent) {
          this.advance();
        }
        continue;
      }

      // Skip other action lines for now
      this.advance();
    }

    return process;
  }

  /**
   * Parse integrations section
   */
  private parseIntegrations() {
    this.advance();
    const baseIndent = this.getIndentLevel();
    const integrations: any = { apis: [] };

    while (this.hasMore() && this.getIndentLevel() >= baseIndent) {
      const line = this.getCurrentLine().trim();

      if (!line || line.startsWith('#')) {
        this.advance();
        continue;
      }

      // Parse API integration
      if (line.startsWith('api ')) {
        const apiMatch = line.match(/^api\s+(\w+):$/);
        if (apiMatch) {
          const apiName = apiMatch[1];
          this.advance();
          const apiIndent = this.getIndentLevel();

          const api: any = { name: apiName, endpoint: '', methods: [] };

          while (this.hasMore() && this.getIndentLevel() >= apiIndent) {
            const apiLine = this.getCurrentLine().trim();

            if (!apiLine || apiLine.startsWith('#')) {
              this.advance();
              continue;
            }

            // Parse endpoint
            if (apiLine.startsWith('endpoint:')) {
              const endpointMatch = apiLine.match(/^endpoint:\s*"(.+)"$/);
              if (endpointMatch) {
                api.endpoint = endpointMatch[1];
              }
              this.advance();
              continue;
            }

            // Parse method
            if (apiLine.startsWith('method ')) {
              const methodMatch = apiLine.match(/^method\s+(\w+):$/);
              if (methodMatch) {
                const methodName = methodMatch[1];
                this.advance();
                const methodIndent = this.getIndentLevel();

                const method: any = { name: methodName, path: '', method: 'GET', params: {} };

                while (this.hasMore() && this.getIndentLevel() >= methodIndent) {
                  const mLine = this.getCurrentLine().trim();

                  if (!mLine || mLine.startsWith('#')) {
                    this.advance();
                    continue;
                  }

                  // Check for params section
                  if (mLine === 'params:') {
                    this.advance();
                    const paramsIndent = this.getIndentLevel();

                    while (this.hasMore() && this.getIndentLevel() >= paramsIndent) {
                      const pLine = this.getCurrentLine().trim();
                      if (!pLine || pLine.startsWith('#')) {
                        this.advance();
                        continue;
                      }

                      const paramMatch = pLine.match(/^(\w+):\s*(.+)$/);
                      if (paramMatch) {
                        method.params[paramMatch[1]] = paramMatch[2];
                      }
                      this.advance();
                    }
                    continue;
                  }

                  // Check for returns section
                  if (mLine.startsWith('returns:')) {
                    this.advance();
                    const returnsIndent = this.getIndentLevel();
                    // Skip returns structure for now
                    while (this.hasMore() && this.getIndentLevel() >= returnsIndent) {
                      this.advance();
                    }
                    continue;
                  }

                  const mMatch = mLine.match(/^(\w+):\s*(.+)$/);
                  if (mMatch) {
                    const key = mMatch[1];
                    const val = mMatch[2];

                    if (key === 'path') {
                      method.path = val.replace(/"/g, '');
                    } else if (key === 'method') {
                      method.method = val;
                    }
                  }

                  this.advance();
                }

                api.methods.push(method);
              }
              continue;
            }

            this.advance();
          }

          integrations.apis.push(api);
        }
        continue;
      }

      this.advance();
    }

    return integrations;
  }

  // ==========================================================================
  // APML-EDU Parsing Methods
  // ==========================================================================

  /**
   * Parse content hierarchy definition
   */
  private parseContent(): ContentDefinition {
    const line = this.getCurrentLine();
    const match = line.match(/^content\s+(\w+):/);
    if (!match) throw new Error(`Invalid content declaration: ${line}`);

    const name = match[1];
    this.advance();

    const content: ContentDefinition = {
      name,
      type: 'course', // Will be determined from structure
    };

    const baseIndent = this.getIndentLevel();

    while (this.hasMore() && this.getIndentLevel() >= baseIndent) {
      const propLine = this.getCurrentLine().trim();

      if (!propLine || propLine.startsWith('#')) {
        this.advance();
        continue;
      }

      // Parse type
      if (propLine.startsWith('type:')) {
        const typeMatch = propLine.match(/^type:\s*(.+)$/);
        if (typeMatch) {
          content.type = typeMatch[1].trim() as any;
        }
        this.advance();
        continue;
      }

      // Parse id
      if (propLine.startsWith('id:')) {
        const idMatch = propLine.match(/^id:\s*(.+)$/);
        if (idMatch) {
          content.id = idMatch[1].trim();
        }
        this.advance();
        continue;
      }

      // Parse fields section
      if (propLine === 'fields:') {
        this.advance();
        content.fields = [];
        const fieldsIndent = this.getIndentLevel();

        while (this.hasMore() && this.getIndentLevel() >= fieldsIndent) {
          const fieldLine = this.getCurrentLine().trim();
          if (!fieldLine || fieldLine.startsWith('#')) {
            this.advance();
            continue;
          }

          const fieldMatch = fieldLine.match(/^(\w+):\s+(.+)$/);
          if (fieldMatch) {
            const fieldName = fieldMatch[1];
            const fieldDef = fieldMatch[2];
            const parts = fieldDef.split(/\s+/);
            content.fields.push({
              name: fieldName,
              type: parts[0],
              required: parts.includes('required'),
              default: parts.includes('default:') ? parts[parts.indexOf('default:') + 1] : undefined,
            });
          }
          this.advance();
        }
        continue;
      }

      // Skip other sections (structure, audio) - basic implementation
      if (propLine === 'structure:' || propLine === 'audio:') {
        this.advance();
        const sectionIndent = this.getIndentLevel();
        while (this.hasMore() && this.getIndentLevel() >= sectionIndent) {
          this.advance();
        }
        continue;
      }

      this.advance();
    }

    return content;
  }

  /**
   * Parse methodology definition
   */
  private parseMethodology(): MethodologyDefinition {
    const line = this.getCurrentLine();
    const match = line.match(/^methodology\s+(\w+):/);
    if (!match) throw new Error(`Invalid methodology declaration: ${line}`);

    const name = match[1];
    this.advance();

    const methodology: MethodologyDefinition = {
      name,
    };

    const baseIndent = this.getIndentLevel();

    while (this.hasMore() && this.getIndentLevel() >= baseIndent) {
      const propLine = this.getCurrentLine().trim();

      if (!propLine || propLine.startsWith('#')) {
        this.advance();
        continue;
      }

      // Parse description
      if (propLine.startsWith('description:')) {
        const descMatch = propLine.match(/^description:\s*"(.+)"$/);
        if (descMatch) {
          methodology.description = descMatch[1];
        }
        this.advance();
        continue;
      }

      // Parse triggers_when
      if (propLine.startsWith('triggers_when:')) {
        const triggerMatch = propLine.match(/^triggers_when:\s*(.+)$/);
        if (triggerMatch) {
          methodology.triggers_when = triggerMatch[1];
        }
        this.advance();
        continue;
      }

      // Skip complex sections (sequence, schedule, parameters, etc.)
      if (propLine === 'sequence:' || propLine === 'schedule:' || propLine === 'parameters:' ||
          propLine === 'timing:' || propLine === 'voices:' || propLine === 'adaptation:' ||
          propLine === 'constraints:') {
        this.advance();
        const sectionIndent = this.getIndentLevel();
        while (this.hasMore() && this.getIndentLevel() >= sectionIndent) {
          this.advance();
        }
        continue;
      }

      this.advance();
    }

    return methodology;
  }

  /**
   * Parse production definition
   */
  private parseProduction(): ProductionDefinition {
    const line = this.getCurrentLine();
    const match = line.match(/^production\s+(\w+):/);
    if (!match) throw new Error(`Invalid production declaration: ${line}`);

    const name = match[1];
    this.advance();

    const production: ProductionDefinition = {
      name,
      type: 'cycle', // Default
    };

    const baseIndent = this.getIndentLevel();

    while (this.hasMore() && this.getIndentLevel() >= baseIndent) {
      const propLine = this.getCurrentLine().trim();

      if (!propLine || propLine.startsWith('#')) {
        this.advance();
        continue;
      }

      // Parse type
      if (propLine.startsWith('type:')) {
        const typeMatch = propLine.match(/^type:\s*(.+)$/);
        if (typeMatch) {
          production.type = typeMatch[1].trim() as any;
        }
        this.advance();
        continue;
      }

      // Parse atomic
      if (propLine.startsWith('atomic:')) {
        const atomicMatch = propLine.match(/^atomic:\s*(.+)$/);
        if (atomicMatch) {
          production.atomic = atomicMatch[1].trim() === 'true';
        }
        this.advance();
        continue;
      }

      // Skip complex sections
      if (propLine === 'structure:' || propLine === 'contains:' || propLine === 'tracks:' ||
          propLine === 'lifecycle:' || propLine === 'storage:' || propLine === 'timing:') {
        this.advance();
        const sectionIndent = this.getIndentLevel();
        while (this.hasMore() && this.getIndentLevel() >= sectionIndent) {
          this.advance();
        }
        continue;
      }

      this.advance();
    }

    return production;
  }

  /**
   * Parse audio configuration
   */
  private parseAudio(): AudioConfiguration {
    this.advance(); // Skip 'audio:' line

    const audio: AudioConfiguration = {};
    const baseIndent = this.getIndentLevel();

    while (this.hasMore() && this.getIndentLevel() >= baseIndent) {
      const propLine = this.getCurrentLine().trim();

      if (!propLine || propLine.startsWith('#')) {
        this.advance();
        continue;
      }

      // Skip all sections for now (voices, samples, generation, compilation, pipeline)
      if (propLine === 'voices:' || propLine === 'samples:' || propLine === 'generation:' ||
          propLine === 'compilation:' || propLine === 'pipeline:') {
        this.advance();
        const sectionIndent = this.getIndentLevel();
        while (this.hasMore() && this.getIndentLevel() >= sectionIndent) {
          this.advance();
        }
        continue;
      }

      this.advance();
    }

    return audio;
  }

  /**
   * Parse parameters configuration
   */
  private parseParameters(): ParameterScope[] {
    this.advance(); // Skip 'parameters:' line

    const scopes: ParameterScope[] = [];
    const baseIndent = this.getIndentLevel();

    while (this.hasMore() && this.getIndentLevel() >= baseIndent) {
      const propLine = this.getCurrentLine().trim();

      if (!propLine || propLine.startsWith('#')) {
        this.advance();
        continue;
      }

      // Parse scope sections
      if (propLine.startsWith('scope ')) {
        const scopeMatch = propLine.match(/^scope\s+(\w+):/);
        if (scopeMatch) {
          const scope: ParameterScope = {
            scope: scopeMatch[1] as any,
          };
          scopes.push(scope);

          this.advance();
          const scopeIndent = this.getIndentLevel();

          // Skip scope contents
          while (this.hasMore() && this.getIndentLevel() >= scopeIndent) {
            this.advance();
          }
        }
        continue;
      }

      // Parse inheritance
      if (propLine.startsWith('inheritance:')) {
        const inheritMatch = propLine.match(/^inheritance:\s*(.+)$/);
        if (inheritMatch && scopes.length > 0) {
          scopes[scopes.length - 1].inheritance = inheritMatch[1];
        }
        this.advance();
        continue;
      }

      this.advance();
    }

    return scopes;
  }

  /**
   * Parse adaptation rule
   */
  private parseAdaptation(): AdaptationRule {
    const line = this.getCurrentLine();
    const match = line.match(/^adaptation\s+(\w+):/);
    if (!match) throw new Error(`Invalid adaptation declaration: ${line}`);

    const name = match[1];
    this.advance();

    const adaptation: AdaptationRule = {
      name,
    };

    const baseIndent = this.getIndentLevel();

    while (this.hasMore() && this.getIndentLevel() >= baseIndent) {
      const propLine = this.getCurrentLine().trim();

      if (!propLine || propLine.startsWith('#')) {
        this.advance();
        continue;
      }

      // Parse observe
      if (propLine.startsWith('observe:')) {
        const observeMatch = propLine.match(/^observe:\s*(.+)$/);
        if (observeMatch) {
          adaptation.observe = observeMatch[1];
        }
        this.advance();
        continue;
      }

      // Skip complex sections
      if (propLine === 'thresholds:' || propLine === 'when:' || propLine === 'triggers:' ||
          propLine === 'adjustments:' || propLine.startsWith('when ') || propLine.startsWith('exit_when:')) {
        this.advance();
        const sectionIndent = this.getIndentLevel();
        while (this.hasMore() && this.getIndentLevel() >= sectionIndent) {
          this.advance();
        }
        continue;
      }

      this.advance();
    }

    return adaptation;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private getCurrentLine(): string {
    return this.lines[this.currentLine] || '';
  }

  private advance(): void {
    this.currentLine++;
  }

  private hasMore(): boolean {
    return this.currentLine < this.lines.length;
  }

  private getIndentLevel(): number {
    const line = this.getCurrentLine();
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }
}

/**
 * Convenience function to parse APML text
 */
export function parseAPML(input: string): APMLDocument {
  const parser = new APMLParser();
  return parser.parse(input);
}
