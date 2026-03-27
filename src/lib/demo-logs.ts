export interface DemoLog {
  id: string;
  label: string;
  provider: 'github-actions' | 'gitlab' | 'jenkins';
  focus: string;
  severity: 'high' | 'medium';
  log: string;
}

export const DEMO_LOGS: DemoLog[] = [
  {
    id: 'gh-ts-build',
    label: 'GitHub Actions · TypeScript build break',
    provider: 'github-actions',
    focus: 'TS2322 + module resolution regression during build',
    severity: 'high',
    log: [
      'Run npm ci',
      'added 612 packages in 14s',
      '##[group]Build app',
      'Run npm run build',
      '> ci-failure-autopsy@0.1.0 build',
      '> next build',
      'src/components/report-card.tsx:42:17 - error TS2322: Type \"undefined\" is not assignable to type \"string\".',
      "Error: Can't resolve '@/components/incident-chart' in '/home/runner/work/app/src/pages'",
      '##[error]Process completed with exit code 1.'
    ].join('\n')
  },
  {
    id: 'gitlab-vitest',
    label: 'GitLab CI · Vitest failure burst',
    provider: 'gitlab',
    focus: 'Flaky timing assertion failing in test stage',
    severity: 'medium',
    log: [
      'Running with gitlab-runner 17.0.0',
      'section_start:1711454260:test_stage[collapsed=true]\r\u001b[0KTest stage',
      '$ npm run test',
      '> vitest run --coverage',
      ' FAIL  src/test/incident-timeline.test.tsx > Incident timeline > keeps culprit pin stable',
      'AssertionError: expected true to be false // Object.is equality',
      'stderr | src/test/incident-timeline.test.tsx > Incident timeline > keeps culprit pin stable',
      'Error: Test timed out in 5000ms.',
      'section_end:1711454311:test_stage\r\u001b[0K',
      'ERROR: Job failed: exit code 1'
    ].join('\n')
  },
  {
    id: 'jenkins-eslint',
    label: 'Jenkins · ESLint gate fail',
    provider: 'jenkins',
    focus: 'Lint policy blocks merge due to strict rule set',
    severity: 'medium',
    log: [
      'Started by user release-bot',
      '[Pipeline] { (Lint)',
      'npm run lint',
      'ESLint: 7 problems (7 errors, 0 warnings)',
      'src/pages/autopsy.tsx',
      '  18:12  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any',
      '  44:9   error  React Hook useMemo has a missing dependency: \"timeline\"  react-hooks/exhaustive-deps',
      'error Command failed with exit code 1.',
      '[Pipeline] // stage',
      'Finished: FAILURE'
    ].join('\n')
  }
];
