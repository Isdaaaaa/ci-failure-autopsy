import { describe, expect, it } from 'vitest';
import { parseCiLog } from '@/lib/log-parser';
import { buildFixSuggestions } from '@/lib/fix-suggestions';

describe('buildFixSuggestions', () => {
  it('builds stage-aware checklist and text for parsed failures', () => {
    const parsed = parseCiLog(
      [
        '##[group]Install deps',
        'npm ci',
        '##[error]npm ERR! code ERESOLVE',
        '##[group]Run tests',
        'npm test'
      ].join('\n')
    );

    const suggestions = buildFixSuggestions(parsed);

    expect(suggestions.checklist.length).toBeGreaterThan(3);
    expect(suggestions.checklist[0]).toMatch(/line 3/i);
    expect(suggestions.commitMessage).toMatch(/^fix\(ci\):/);
    expect(suggestions.prTitle).toMatch(/blocking build|reliability/i);
    expect(suggestions.prDescription).toContain('## Root-cause signals');
    expect(suggestions.prDescription).toContain('line 3');
  });

  it('returns useful defaults for empty payloads', () => {
    const parsed = parseCiLog('');
    const suggestions = buildFixSuggestions(parsed);

    expect(suggestions.checklist[0]).toMatch(/Paste or upload CI logs/i);
    expect(suggestions.commitMessage).toBe('fix(ci): isolate and patch pipeline failure source');
    expect(suggestions.prTitle).toBe('fix(ci): recover pipeline reliability');
  });
});
