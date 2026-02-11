import { appendFileSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { getLogPath } from './paths.js';

const MAX_LOG_SIZE = 512 * 1024; // 512 KB

let enabled = false;

export function setDebug(on: boolean): void {
  enabled = on;
}

export function debugLog(label: string, data: Record<string, unknown>): void {
  if (!enabled) return;
  const logPath = getLogPath();
  try {
    const size = statSync(logPath).size;
    if (size > MAX_LOG_SIZE) {
      const content = readFileSync(logPath, 'utf-8');
      const half = Math.floor(content.length / 2);
      const nextNewline = content.indexOf('\n', half);
      const keepFrom = nextNewline === -1 ? half : nextNewline + 1;
      writeFileSync(logPath, content.slice(keepFrom), 'utf-8');
    }
  } catch {
    // file doesn't exist yet, that's fine
  }
  const ts = new Date().toISOString();
  const line = `[${ts}] [${label}] ${JSON.stringify(data)}\n`;
  try {
    appendFileSync(logPath, line, 'utf-8');
  } catch {
    // silently ignore write errors
  }
}
