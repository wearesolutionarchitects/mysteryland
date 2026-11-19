import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, openSync, closeSync, readSync, fstatSync, renameSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StringDecoder } from 'node:string_decoder';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const log = resolve(root, '.local/codex-terminal.log');
mkdirSync(dirname(log), { recursive: true });
appendFileSync(log, '', { mode: 0o600 });
const maxLogBytes = 16 * 1024 * 1024;
const retainedBytes = maxLogBytes / 2;

function appendLog(chunk) {
  const bytes = Buffer.from(chunk);
  const fd = openSync(log, 'r+');
  try {
    const { size } = fstatSync(fd);
    if (size + bytes.length <= maxLogBytes) {
      appendFileSync(log, bytes);
      return;
    }

    const start = Math.max(0, size - retainedBytes);
    const tail = Buffer.alloc(size - start);
    const count = readSync(fd, tail, 0, tail.length, start);
    const firstNewline = start ? tail.subarray(0, count).indexOf(10) : -1;
    const recent = start && firstNewline === -1
      ? Buffer.alloc(0)
      : tail.subarray(firstNewline + 1, count);
    const output = Buffer.concat([recent, bytes]);
    const temp = `${log}.${process.pid}.tmp`;
    writeFileSync(temp, output.subarray(Math.max(0, output.length - maxLogBytes)), { mode: 0o600, flag: 'wx' });
    try {
      renameSync(temp, log);
    } catch (error) {
      unlinkSync(temp);
      throw error;
    }
  } finally {
    closeSync(fd);
  }
}

const [mode, ...args] = process.argv.slice(2);
if (mode === 'watch') {
  console.log(`Codex Terminal live: ${root}\nWarte auf Befehle. Beenden: Ctrl+C\n`);
  let offset = 0;
  let decoder = new StringDecoder('utf8');
  let inode;
  const read = () => {
    const fd = openSync(log, 'r');
    try {
      const { size, ino } = fstatSync(fd);
      if (ino !== inode || size < offset) {
        offset = 0;
        decoder = new StringDecoder('utf8');
        inode = ino;
      }
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
  const write = appendLog;
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
