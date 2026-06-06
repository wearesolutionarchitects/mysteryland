// src/scripts/lib/core.mjs
// Provides the small shared runtime helpers used by the event scripts.
// Keeps environment loading, argument validation and command execution in one place.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export function loadEnv(envPath = path.resolve(process.cwd(), '.env')) {
  if (!fs.existsSync(envPath)) return;

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator < 0) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

export function ensureDateArg(value, helpText) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    console.error(helpText);
    process.exit(1);
  }
}

export function runOrThrow(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: options.capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    env: process.env,
  });

  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) {
    const message = options.capture ? result.stderr?.trim() : '';
    throw new Error(message || `${command} exited with code ${result.status}`);
  }

  return result;
}

export function runCapture(command, args) {
  return runOrThrow(command, args, { capture: true }).stdout?.trim() || '';
}
