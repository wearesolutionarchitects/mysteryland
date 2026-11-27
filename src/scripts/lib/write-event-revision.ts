import fs from 'node:fs';
import path from 'node:path';

export function writeEventRevision(file: string, expected: Buffer, updated: string) {
  const conflict = new Error(`Datei wurde inzwischen geändert: ${file}`);
  function checkRevision(candidate: string) {
    const stat = fs.lstatSync(candidate, { throwIfNoEntry: false });
    if (!stat?.isFile() || !fs.readFileSync(candidate).equals(expected)) throw conflict;
    return stat;
  }

  const original = checkRevision(file);
  const directory = fs.mkdtempSync(path.join(path.dirname(file), '.event-revision-'));
  const staged = path.join(directory, 'updated');
  const previous = path.join(directory, 'previous');
  let keepBackup = false;
  try {
    fs.writeFileSync(staged, updated, { mode: original.mode });
    try {
      fs.renameSync(file, previous);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw conflict;
      throw error;
    }

    try {
      // Verify the entry actually moved. An editor may have saved since the first check.
      checkRevision(previous);
      fs.linkSync(staged, file);
    } catch (error) {
      try {
        // Restore exclusively so a concurrent save at the original path wins.
        fs.linkSync(previous, file);
      } catch (restoreError) {
        keepBackup = true;
        throw new AggregateError([error, restoreError], `${conflict.message}. Sicherung: ${previous}`);
      }
      throw error;
    }
  } finally {
    if (!keepBackup) fs.rmSync(directory, { recursive: true, force: true });
  }
}
