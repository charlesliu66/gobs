import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pageSource = readFileSync(resolve(__dirname, '../src/pages/Login.tsx'), 'utf-8');

test('Login uses the shared API base for auth requests', () => {
  assert.match(pageSource, /const AUTH_BASE_URL = import\.meta\.env\.VITE_API_BASE_URL \|\| '';/);
  assert.match(pageSource, /fetch\(`\$\{AUTH_BASE_URL\}\/api\/auth\/login`/);
});
