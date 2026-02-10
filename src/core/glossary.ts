import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { getGlossaryPath, getConfigDir } from './paths.js';

/**
 * Glossary type: simple key-value map.
 * Key = trigger term, Value = explanation/context.
 */
export type Glossary = Record<string, string>;

/**
 * Read the glossary from disk.
 * Returns empty object if file doesn't exist.
 */
export function readGlossary(): Glossary {
  const p = getGlossaryPath();
  if (!existsSync(p)) return {};
  return JSON.parse(readFileSync(p, 'utf-8'));
}

/**
 * Write the glossary to disk.
 * Creates the directory if it doesn't exist.
 */
export function writeGlossary(glossary: Glossary): void {
  getConfigDir(); // ensure directory exists
  writeFileSync(getGlossaryPath(), JSON.stringify(glossary, null, 2), 'utf-8');
}

/**
 * Add or update a glossary entry.
 */
export function addEntry(key: string, value: string): void {
  const glossary = readGlossary();
  glossary[key] = value;
  writeGlossary(glossary);
}

/**
 * Remove a glossary entry.
 * Returns true if the entry existed and was removed, false otherwise.
 */
export function removeEntry(key: string): boolean {
  const glossary = readGlossary();
  if (!(key in glossary)) return false;
  delete glossary[key];
  writeGlossary(glossary);
  return true;
}

/**
 * List all glossary entries.
 * Returns empty object if no entries exist.
 */
export function listEntries(): Glossary {
  return readGlossary();
}
