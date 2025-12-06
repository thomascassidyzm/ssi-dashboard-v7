#!/usr/bin/env node

/**
 * APML to Vue 3 Compiler
 *
 * Main entry point for the compiler.
 * Reads APML files and generates Vue 3 components.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { parseAPML } from './parser/parser.js';
import { generateVue } from './generator/vue-generator.js';

export { parseAPML } from './parser/parser.js';
export { generateVue } from './generator/vue-generator.js';
export type { APMLDocument } from './types/ast.js';

/**
 * Compile an APML file to Vue components
 */
export function compile(inputPath: string, outputDir: string): void {
  console.log(`[APML Compiler] Reading ${inputPath}...`);

  // Read APML file
  const apmlContent = readFileSync(inputPath, 'utf-8');

  // Parse to AST
  console.log('[APML Compiler] Parsing APML...');
  const ast = parseAPML(apmlContent);

  // Generate Vue files
  console.log('[APML Compiler] Generating Vue components...');
  const files = generateVue(ast);

  // Write files to output directory
  console.log(`[APML Compiler] Writing ${files.length} files to ${outputDir}...`);
  for (const file of files) {
    const fullPath = join(outputDir, file.path);

    // Create directory if it doesn't exist
    const dir = dirname(fullPath);
    mkdirSync(dir, { recursive: true });

    // Write file
    writeFileSync(fullPath, file.content, 'utf-8');
    console.log(`  ✓ ${file.path}`);
  }

  console.log('[APML Compiler] Done!');
}

/**
 * CLI interface
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: apml-compile <input.apml> <output-dir>');
    console.error('');
    console.error('Example:');
    console.error('  apml-compile examples/simple.apml ./output');
    process.exit(1);
  }

  const [inputPath, outputDir] = args;

  try {
    compile(inputPath, outputDir);
  } catch (error) {
    console.error('[APML Compiler] Error:', error);
    process.exit(1);
  }
}

// Run CLI if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
