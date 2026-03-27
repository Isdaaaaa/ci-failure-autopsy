import { ParsedLog } from '@/lib/log-parser';

export interface FixSuggestions {
  checklist: string[];
  commitMessage: string;
  prTitle: string;
  prDescription: string;
}

const STAGE_CHECKLIST: Record<ParsedLog['classification']['stage'], string[]> = {
  lint: [
    'Reproduce lint failure locally with the same Node and lockfile version.',
    'Fix reported ESLint/Prettier violations in the cited files.',
    'Re-run lint and full test suite before pushing.'
  ],
  test: [
    'Reproduce failing tests locally with CI-equivalent flags and environment.',
    'Stabilize assertions/fixtures and remove flaky timing dependencies.',
    'Re-run targeted tests, then full suite to confirm no regressions.'
  ],
  build: [
    'Re-run the build path locally with a clean dependency install.',
    'Patch compile/import/dependency errors surfaced in culprit step.',
    'Validate build + tests before reopening pipeline.'
  ],
  deploy: [
    'Replay deployment command in a safe environment (staging/sandbox).',
    'Fix config, credentials, or rollout command failure from cited lines.',
    'Re-run pre-deploy checks and execute a guarded redeploy.'
  ],
  unknown: [
    'Reproduce the failure using the same CI command sequence.',
    'Trace first deterministic error line and isolate smallest failing scope.',
    'Patch, then re-run full pipeline checks before merge.'
  ]
};

const SIGNATURE_HINTS: Record<string, string> = {
  'build-deps': 'Resolve dependency graph/install errors (lockfile drift, registry auth, or incompatible semver).',
  'build-module': 'Fix missing module paths/aliases and confirm resolver config matches CI runtime.',
  'build-ts': 'Address TypeScript compile errors and keep generated types aligned.',
  'test-jest': 'Update failing Jest assertions or test setup to reflect current behavior.',
  'test-vitest': 'Repair failing Vitest suites and verify environment-specific mocks.',
  'test-py': 'Fix pytest assertion or fixture failures in the reported module.',
  'lint-eslint': 'Apply ESLint fixes (auto-fix where safe), then address remaining rule violations manually.',
  'lint-prettier': 'Run formatter and commit style-normalized files to satisfy Prettier checks.',
  'deploy-k8s': 'Patch Kubernetes rollout/helm command and validate manifests before retry.',
  'deploy-cloud': 'Fix cloud release gate (permissions, policy, or environment mismatch) blocking deployment.'
};

function pickPrimarySignature(parsed: ParsedLog) {
  return [...parsed.signatures].sort((a, b) => b.confidence - a.confidence)[0] ?? null;
}

function stageLabel(stage: ParsedLog['classification']['stage']) {
  if (stage === 'unknown') return 'pipeline';
  return stage;
}

function buildCommitMessage(parsed: ParsedLog, signatureName: string | null) {
  const stage = stageLabel(parsed.classification.stage);
  if (signatureName) {
    return `fix(ci): resolve ${signatureName.toLowerCase()} in ${stage} stage`;
  }

  if (parsed.classification.stage !== 'unknown') {
    return `fix(ci): stabilize ${stage} stage failure path`;
  }

  return 'fix(ci): isolate and patch pipeline failure source';
}

function buildPrTitle(parsed: ParsedLog, signatureName: string | null) {
  const stage = stageLabel(parsed.classification.stage);
  if (signatureName) {
    return `fix(ci): ${signatureName} blocking ${stage}`;
  }

  if (parsed.classification.stage !== 'unknown') {
    return `fix(ci): recover ${stage} stage reliability`;
  }

  return 'fix(ci): recover pipeline reliability';
}

function buildPrDescription(parsed: ParsedLog, checklist: string[], signatureHint?: string) {
  const signalLines = parsed.errorLines.slice(0, 3);
  const signalText = signalLines.length
    ? signalLines.map((entry) => `- line ${entry.line}: ${entry.text}`).join('\n')
    : '- No deterministic error line captured; using stage-level heuristics.';

  const checklistText = checklist.map((item) => `- [ ] ${item}`).join('\n');

  const validationCommands = [
    parsed.classification.stage === 'lint' ? 'npm run lint' : null,
    parsed.classification.stage === 'test' ? 'npm run test' : null,
    parsed.classification.stage === 'build' ? 'npm run typecheck' : null,
    'npm run lint',
    'npm run test',
    'npm run typecheck'
  ]
    .filter((cmd, index, arr): cmd is string => Boolean(cmd) && arr.indexOf(cmd as string) === index)
    .map((cmd) => `- \`${cmd}\``)
    .join('\n');

  return [
    '## Summary',
    `Stabilize CI by addressing failure signals in the **${stageLabel(parsed.classification.stage)}** stage.`,
    '',
    '## Root-cause signals',
    signalText,
    signatureHint ? `- Signature guidance: ${signatureHint}` : '',
    '',
    '## Fix plan',
    checklistText,
    '',
    '## Validation',
    validationCommands
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildFixSuggestions(parsed: ParsedLog): FixSuggestions {
  if (parsed.summary.totalLines === 0) {
    const checklist = [
      'Paste or upload CI logs to generate a targeted remediation checklist.',
      'Confirm failing stage and capture first deterministic error line.',
      'Apply fix, then rerun lint/test/typecheck before opening PR.'
    ];

    return {
      checklist,
      commitMessage: 'fix(ci): isolate and patch pipeline failure source',
      prTitle: 'fix(ci): recover pipeline reliability',
      prDescription: buildPrDescription(parsed, checklist)
    };
  }

  const baseChecklist = STAGE_CHECKLIST[parsed.classification.stage];
  const topSignature = pickPrimarySignature(parsed);
  const signatureHint = topSignature ? SIGNATURE_HINTS[topSignature.ruleId] : undefined;

  const checklist = [...baseChecklist];

  if (parsed.classification.line) {
    checklist.unshift(`Inspect culprit context around line ${parsed.classification.line} to confirm trigger sequence.`);
  }

  if (signatureHint) {
    checklist.push(signatureHint);
  }

  const uniqueChecklist = Array.from(new Set(checklist)).slice(0, 6);

  return {
    checklist: uniqueChecklist,
    commitMessage: buildCommitMessage(parsed, topSignature?.name ?? null),
    prTitle: buildPrTitle(parsed, topSignature?.name ?? null),
    prDescription: buildPrDescription(parsed, uniqueChecklist, signatureHint)
  };
}
