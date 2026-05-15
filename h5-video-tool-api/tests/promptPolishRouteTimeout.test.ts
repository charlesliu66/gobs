import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PromptPolishTimeoutError,
  withPromptPolishDeadline,
} from '../src/routes/prompt.ts';

test('withPromptPolishDeadline rejects with structured timeout error', async () => {
  await assert.rejects(
    withPromptPolishDeadline(new Promise<never>(() => {}), 5),
    (error: unknown) => {
      assert.ok(error instanceof PromptPolishTimeoutError);
      assert.equal(error.code, 'PROMPT_POLISH_TIMEOUT');
      assert.match(error.message, /5ms/);
      return true;
    },
  );
});

test('withPromptPolishDeadline returns fast prompt polish results', async () => {
  await assert.doesNotReject(async () => {
    const result = await withPromptPolishDeadline(Promise.resolve({ ok: true }), 50);
    assert.deepEqual(result, { ok: true });
  });
});
