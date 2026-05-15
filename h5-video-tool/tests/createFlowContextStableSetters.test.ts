import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('CreateFlowProvider exposes stable setter callbacks for Studio upload effects', () => {
  const source = readFileSync(resolve(__dirname, '../src/context/CreateFlowContext.tsx'), 'utf-8');

  assert.match(source, /import \{ createContext, useContext, useState, useCallback, useMemo, type ReactNode \} from 'react';/);
  assert.match(source, /const setTemplateId = useCallback\(/);
  assert.match(source, /const setDreaminaMultimodalItems = useCallback\(/);
  assert.match(source, /const setViralDanceReferenceVideoUrl = useCallback\(/);
  assert.match(source, /const value = useMemo<CreateFlowContextValue>\(/);
  assert.doesNotMatch(source, /setDreaminaMultimodalItems:\s*\(v\)\s*=>/);
});
