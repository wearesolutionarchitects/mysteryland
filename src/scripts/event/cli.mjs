import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ASIN_PATTERN = /^[A-Z0-9]{10}$/;

export const commands = [
  { id: 'media', label: 'Fotos aus der Inbox importieren', script: 'event:media' },
  { id: 'gallery', label: 'Galerie einer Event-MDX synchronisieren', script: 'event:gallery', inputs: [{ name: 'date', label: 'Eventdatum (YYYY-MM-DD)', required: true, pattern: DATE_PATTERN }], flag: { label: 'Nur Vorschau (dry-run)', value: '--dry-run', defaultValue: true } },
  { id: 'og', label: 'Open-Graph-Bild erzeugen', script: 'event:og', inputs: [{ name: 'date', label: 'Eventdatum (YYYY-MM-DD)', required: true, pattern: DATE_PATTERN }, { name: 'source', label: 'Optionales Quellbild', required: false }] },
  { id: 'setlist', label: 'Setlists ergänzen', script: 'event:setlist', inputs: [{ name: 'date', label: 'Eventdatum (YYYY-MM-DD)', required: true, pattern: DATE_PATTERN }] },
  { id: 'album', label: 'Album ergänzen', script: 'event:album', inputs: [{ name: 'date', label: 'Eventdatum (YYYY-MM-DD)', required: true, pattern: DATE_PATTERN }, { name: 'asin', label: 'Amazon-ASIN (10 Zeichen)', required: true, pattern: ASIN_PATTERN, normalize: (value) => value.toUpperCase() }] },
  { id: 'social', label: 'Social-Paket für ein Event erzeugen', script: 'event:social', inputs: [{ name: 'date', label: 'Eventdatum (YYYY-MM-DD)', required: true, pattern: DATE_PATTERN }] },
  { id: 'outbox', label: 'Allgemeine Event-Outbox erzeugen', script: 'event:outbox', inputs: [{ name: 'date', label: 'Optional nur dieses Eventdatum (YYYY-MM-DD)', required: false, pattern: DATE_PATTERN }] },
  { id: 'seo', label: 'Event-SEO prüfen oder aktualisieren', script: 'event:seo', flag: { label: 'Änderungen schreiben', value: '--write', defaultValue: false } },
  { id: 'covers', label: 'Albumcover lokalisieren', script: 'event:covers' },
  { id: 'artists', label: 'Artist-Profile und Statistiken synchronisieren', script: 'artist:sync' },
  { id: 'verify', label: 'Vollständige Projektprüfung ausführen', script: 'verify' },
];

export function validateInput(input, rawValue) {
  const value = input.normalize ? input.normalize(rawValue.trim()) : rawValue.trim();
  if (!value && input.required) return { error: 'Diese Eingabe ist erforderlich.' };
  if (value && input.pattern && !input.pattern.test(value)) return { error: `Ungültiger Wert: ${value}` };
  return { value };
}

export function buildArgs(command, answers, flagEnabled = false) {
  const args = [];
  for (const input of command.inputs || []) {
    const result = validateInput(input, answers[input.name] || '');
    if (result.error) throw new Error(result.error);
    if (result.value) args.push(result.value);
  }
  if (command.flag && flagEnabled) args.push(command.flag.value);
  return args;
}

function printMenu() {
  console.log('\nMysteryland Event-Assistent\n');
  commands.forEach((command, index) => console.log(`${String(index + 1).padStart(2, ' ')}. ${command.label}`));
  console.log(' 0. Beenden\n');
}

function printHelp() {
  console.log([
    'Mysteryland Event-Assistent',
    '',
    'Interaktiv starten:',
    '  npm run event',
    '',
    'Die vorhandenen npm-Kommandos bleiben weiterhin direkt aufrufbar.',
  ].join('\n'));
}

async function askValidated(readline, input) {
  while (true) {
    const answer = await readline.question(`${input.label}${input.required ? '' : ' (leer = überspringen)'}: `);
    const result = validateInput(input, answer);
    if (!result.error) return result.value;
    console.log(result.error);
  }
}

async function askYesNo(readline, label, defaultValue = false) {
  const hint = defaultValue ? '[J/n]' : '[j/N]';
  const answer = (await readline.question(`${label} ${hint}: `)).trim().toLocaleLowerCase('de-DE');
  if (!answer) return defaultValue;
  return answer === 'j' || answer === 'ja' || answer === 'y' || answer === 'yes';
}

function runCommand(command, args) {
  const quotedArgs = args.map((arg) => JSON.stringify(String(arg))).join(' ');
  console.log(`\n→ npm run ${command.script}${args.length ? ` -- ${quotedArgs}` : ''}\n`);
  const result = spawnSync('npm', ['run', command.script, ...(args.length ? ['--', ...args] : [])], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

export async function runInteractive({ input = process.stdin, output = process.stdout } = {}) {
  if (!input.isTTY || !output.isTTY) {
    throw new Error('Das Auswahlmenü benötigt ein interaktives Terminal. Direkte npm-Kommandos funktionieren weiterhin ohne TTY.');
  }

  const readline = createInterface({ input, output });
  try {
    while (true) {
      printMenu();
      const selection = (await readline.question('Auswahl: ')).trim();
      if (selection === '0' || selection.toLocaleLowerCase('de-DE') === 'q') return;

      const command = commands[Number(selection) - 1];
      if (!command) {
        console.log('Bitte eine Zahl aus dem Menü eingeben.');
        continue;
      }

      const answers = {};
      for (const inputDefinition of command.inputs || []) {
        answers[inputDefinition.name] = await askValidated(readline, inputDefinition);
      }
      const flagEnabled = command.flag
        ? await askYesNo(readline, command.flag.label, command.flag.defaultValue)
        : false;
      const args = buildArgs(command, answers, flagEnabled);

      if (!await askYesNo(readline, `„${command.label}“ jetzt ausführen?`, true)) continue;

      const status = runCommand(command, args);
      console.log(status === 0 ? '\n✓ Kommando erfolgreich.' : `\n✗ Kommando mit Exit-Code ${status} beendet.`);
      if (!await askYesNo(readline, 'Weiteren Schritt auswählen?', true)) return;
    }
  } finally {
    readline.close();
  }
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isCli) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
  } else {
    runInteractive().catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
  }
}
