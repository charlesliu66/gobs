import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const copyPairs = [
  {
    from: path.join(root, 'src', 'config', 'prompt-templates'),
    to: path.join(root, 'dist', 'config', 'prompt-templates'),
  },
];

for (const pair of copyPairs) {
  await mkdir(pair.to, { recursive: true });
  await cp(pair.from, pair.to, { recursive: true });
  console.log(`[copy-build-assets] ${pair.from} -> ${pair.to}`);
}
