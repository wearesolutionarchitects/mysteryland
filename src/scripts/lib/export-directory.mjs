import fs from 'node:fs';
import path from 'node:path';

// A sibling directory keeps both renames on the target filesystem and gives
// concurrent exporters an exclusive workspace for this destination.
export async function replaceExportDirectory(target, build) {
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true });
  const work = path.join(parent, `.${path.basename(target)}.exporting`);
  fs.mkdirSync(work);
  const staged = path.join(work, 'new');
  const previous = path.join(work, 'previous');
  try {
    fs.mkdirSync(staged);
    const result = await build(staged);
    if (fs.existsSync(target)) fs.renameSync(target, previous);
    try {
      fs.renameSync(staged, target);
    } catch (error) {
      if (fs.existsSync(previous)) fs.renameSync(previous, target);
      throw error;
    }
    fs.rmSync(previous, { recursive: true, force: true });
    return result;
  } finally {
    // Preserve the backup if restoration itself failed.
    if (!fs.existsSync(previous)) fs.rmSync(work, { recursive: true, force: true });
  }
}
