import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');
const scriptPath = path.join(repoRoot, 'scripts/verify_geelark_real_publish.py');
const python = process.env.PYTHON || 'python3';

test('GeeLark real publish verifier defaults to dry-run and builds a safe payload', () => {
  const result = spawnSync(
    python,
    [
      scriptPath,
      '--target',
      'local',
      '--account-id',
      'acct-1',
      '--video-url',
      'https://example.com/test.mp4',
      '--caption',
      'dry run caption',
      '--hashtags',
      '#DryRun',
    ],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout);
  assert.equal(parsed.mode, 'dry-run');
  assert.equal(parsed.wouldPost, false);
  assert.deepEqual(parsed.payload.accountIds, ['acct-1']);
  assert.equal(parsed.payload.videoUrl, 'https://example.com/test.mp4');
  assert.match(parsed.payload.caption, /^\[GOBS verification local /);
  assert.match(parsed.payload.caption, /dry run caption$/);
  assert.equal(parsed.payload.hashtags, '#DryRun');
});

test('GeeLark real publish verifier refuses live mode without confirmation token', () => {
  const result = spawnSync(
    python,
    [
      scriptPath,
      '--live',
      '--account-id',
      'acct-1',
      '--video-url',
      'https://example.com/test.mp4',
      '--caption',
      'live guard caption',
    ],
    { encoding: 'utf8' },
  );

  assert.equal(result.status, 2);
  assert.match(result.stderr, /REAL_GEELARK_POST/);
  assert.equal(result.stdout.trim(), '');
});
