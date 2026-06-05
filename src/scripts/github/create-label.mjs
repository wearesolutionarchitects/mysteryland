import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, runOrThrow } from '../lib/core.mjs';

loadEnv();

const repo = process.env.REPO || 'wearesolutionarchitects/mysteryland';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const labelsPath = path.join(__dirname, 'labels-data.json');
const labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));

for (const label of labels) {
  const name = String(label.name || '').trim();
  const color = String(label.color || '').trim();
  const description = String(label.description || '').trim();
  console.log(`Create label: ${name}`);
  runOrThrow('gh', [
    'label',
    'create',
    name,
    '--repo',
    repo,
    '--color',
    color,
    '--description',
    description,
  ]);
}
