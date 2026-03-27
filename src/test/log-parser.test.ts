import { describe, expect, it } from 'vitest';
import { parseCiLog } from '@/lib/log-parser';

describe('parseCiLog', () => {
  it('detects github actions and extracts steps/errors', () => {
    const log = [
      '##[group]Install deps',
      'npm ci',
      '##[error]npm ERR! code ERESOLVE',
      '##[group]Run tests',
      'npm test',
      'Error: expected true to be false'
    ].join('\n');

    const parsed = parseCiLog(log);

    expect(parsed.provider).toBe('github-actions');
    expect(parsed.steps.length).toBeGreaterThanOrEqual(2);
    expect(parsed.errorLines.length).toBeGreaterThanOrEqual(2);
    expect(parsed.summary.errorCount).toBeGreaterThanOrEqual(2);
  });

  it('returns empty summary for blank payloads', () => {
    const parsed = parseCiLog('   \n\n');

    expect(parsed.provider).toBe('unknown');
    expect(parsed.summary.totalLines).toBe(0);
    expect(parsed.steps).toHaveLength(0);
  });
});
