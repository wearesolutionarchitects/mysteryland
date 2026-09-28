import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, openSync, closeSync, readSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StringDecoder } from 'node:string_decoder';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const log = resolve(root, '.local/codex-terminal.log');
mkdirSync(dirname(log), { recursive: true });
appendFileSync(log, '', { mode: 0o600 });
const [mode, ...args] = process.argv.slice(2);
if (mode === 'watch') {
  console.log(`Codex Terminal live: ${root}\nWarte auf Befehle. Beenden: Ctrl+C\n`);
  let offset = 0;
  let decoder = new StringDecoder('utf8');
  const read = () => {
    const size = statSync(log).size;
    if (size < offset) { offset = 0; decoder = new StringDecoder('utf8'); }
    const fd = openSync(log, 'r');
    try {
      while (offset < size) {
        const buffer = Buffer.alloc(Math.min(65536, size - offset));
        const count = readSync(fd, buffer, 0, buffer.length, offset);
        if (!count) break;
        offset += count;
        process.stdout.write(decoder.write(buffer.subarray(0, count)));
      }
    } finally { closeSync(fd); }
  };
  read();
  setInterval(read, 250);
} else if (mode === 'run' && args.length) {
  if (args[0] === '--') args.shift();
  if (!args.length) throw new Error('Befehl fehlt');
  const id = `${Date.now()}-${process.pid}`;
  const write = (chunk) => appendFileSync(log, chunk);
  write(`\n[${new Date().toISOString()}] START ${id}\ncwd: ${process.cwd()}\ncommand: ${args.map(a => JSON.stringify(a)).join(' ')}\n`);
  const child = spawn(args[0], args.slice(1), { stdio: ['inherit', 'pipe', 'pipe'], shell: false });
  child.stdout.on('data', data => { write(data); process.stdout.write(data); });
  child.stderr.on('data', data => { write(data); process.stderr.write(data); });
  child.on('error', error => { write(`\n${error.message}\n`); console.error(error.message); });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  child.on('close', (code, signal) => {
    write(`\n[${new Date().toISOString()}] END ${id} exit=${code ?? 'null'} signal=${signal ?? '-'}\n`);
    process.exitCode = code ?? (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : 1);
  });
} else {
  console.error('Usage: node scripts/dev/codex-terminal.mjs watch | run -- <executable> [args...]');
  process.exitCode = 2;
}
