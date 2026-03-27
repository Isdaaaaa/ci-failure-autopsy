export type CIProvider = 'github-actions' | 'gitlab' | 'jenkins' | 'unknown';
export type FailureStage = 'build' | 'test' | 'lint' | 'deploy' | 'unknown';

export interface StepSection {
  title: string;
  startLine: number;
  endLine: number;
  lines: string[];
}

export interface ErrorSignature {
  ruleId: string;
  name: string;
  stage: FailureStage;
  confidence: number;
  line: number;
  excerpt: string;
}

export interface ParsedLog {
  provider: CIProvider;
  steps: StepSection[];
  errorLines: { line: number; text: string }[];
  signatures: ErrorSignature[];
  classification: {
    stage: FailureStage;
    confidence: number;
    line: number | null;
    reason: string;
  };
  summary: {
    totalLines: number;
    stepCount: number;
    errorCount: number;
    warningCount: number;
  };
}

const ERROR_RE = /(##\[error\]|\berror\b|\bfailed\b|exception|fatal|traceback|npm err!|✖)/i;
const WARNING_RE = /(##\[warning\]|\bwarning\b|\bwarn\b)/i;

const SIGNATURE_RULES: Array<{
  ruleId: string;
  name: string;
  stage: FailureStage;
  confidence: number;
  re: RegExp;
}> = [
  { ruleId: 'lint-eslint', name: 'ESLint violation', stage: 'lint', confidence: 0.98, re: /eslint(?:\s|:).*?(error|failed)|\bnpm run lint\b.*failed|\berror:\s+eslint/i },
  { ruleId: 'lint-prettier', name: 'Prettier formatting failure', stage: 'lint', confidence: 0.96, re: /prettier.*(check failed|code style issues|error)/i },
  { ruleId: 'test-jest', name: 'Jest test failure', stage: 'test', confidence: 0.97, re: /jest.*(failed|failing)|\btest suites?:\s*\d+\s*failed|\bexpect\(.+\)\.to/i },
  { ruleId: 'test-vitest', name: 'Vitest test failure', stage: 'test', confidence: 0.97, re: /vitest.*(failed|failing)|\bFAIL\b.*\.test\.(t|j)sx?/i },
  { ruleId: 'test-py', name: 'Pytest failure', stage: 'test', confidence: 0.95, re: /={2,}\s+FAILURES\s+={2,}|\bE\s+AssertionError\b|pytest.*failed/i },
  { ruleId: 'build-ts', name: 'TypeScript build failure', stage: 'build', confidence: 0.98, re: /TS\d{4}:|\btsc\b.*(error|failed)|Type error:/i },
  { ruleId: 'build-module', name: 'Module resolution failure', stage: 'build', confidence: 0.95, re: /Cannot find module|Module not found|Error: Can't resolve/i },
  { ruleId: 'build-deps', name: 'Dependency install failure', stage: 'build', confidence: 0.94, re: /npm ERR!|yarn\s+error|pnpm\s+ERR|ERESOLVE|ENOTFOUND/i },
  { ruleId: 'deploy-k8s', name: 'Kubernetes deploy failure', stage: 'deploy', confidence: 0.96, re: /kubectl.*(error|failed)|helm.*(failed|Error:)/i },
  { ruleId: 'deploy-cloud', name: 'Cloud deploy rejection', stage: 'deploy', confidence: 0.93, re: /(deployment|deploy)\s+failed|HTTP\s*403.*deploy|Release failed/i }
];

function detectProvider(text: string): CIProvider {
  if (/github\.com\/.+\/actions\/runs|GITHUB_ACTIONS=true|##\[group\]|##\[error\]/i.test(text)) {
    return 'github-actions';
  }

  if (/gitlab-ci|gitlab runner|section_start:\d+:[^\s]+|\$CI_JOB_ID/i.test(text)) {
    return 'gitlab';
  }

  if (/\[Pipeline\]|Jenkins|Started by user|Building in workspace/i.test(text)) {
    return 'jenkins';
  }

  return 'unknown';
}

function stepTitleFromLine(line: string): string | null {
  const githubGroup = line.match(/^\s*::group::\s*(.+)\s*$/i) ?? line.match(/^\s*##\[group\]\s*(.+)\s*$/i);
  if (githubGroup) return githubGroup[1].trim();

  const gitlabSection = line.match(/^\s*section_start:\d+:[^\[]+(?:\[(.+)\])?/i);
  if (gitlabSection) {
    return (gitlabSection[1] ?? 'GitLab section').replace(/_/g, ' ').trim();
  }

  const explicitStep = line.match(/^\s*(?:step|stage)\s+\d+\s*[:\-]\s*(.+)$/i);
  if (explicitStep) return explicitStep[1].trim();

  const runStep = line.match(/^\s*Run\s+(.+)$/);
  if (runStep) return `Run ${runStep[1].trim()}`;

  const jenkinsStep = line.match(/^\s*\[Pipeline\]\s*\{\s*\((.+)\)\s*\}\s*$/);
  if (jenkinsStep) return jenkinsStep[1].trim();

  return null;
}

function extractSteps(lines: string[]): StepSection[] {
  const steps: StepSection[] = [];
  let current: StepSection | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const title = stepTitleFromLine(line);

    if (title) {
      if (current) {
        current.endLine = index;
        steps.push(current);
      }
      current = {
        title,
        startLine: index + 1,
        endLine: lines.length,
        lines: [line]
      };
      continue;
    }

    if (!current) {
      current = {
        title: 'Bootstrap / setup',
        startLine: 1,
        endLine: lines.length,
        lines: []
      };
    }

    current.lines.push(line);
  }

  if (current) {
    current.endLine = lines.length;
    steps.push(current);
  }

  return steps.filter((step) => step.lines.length > 0);
}

function extractErrorLines(lines: string[]): { line: number; text: string }[] {
  const hits: { line: number; text: string }[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!ERROR_RE.test(line)) continue;

    const text = line.trim();
    if (!text) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    hits.push({ line: index + 1, text });
    if (hits.length >= 12) break;
  }

  return hits;
}

function extractSignatures(lines: string[]): ErrorSignature[] {
  const signatures: ErrorSignature[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const rule of SIGNATURE_RULES) {
      if (!rule.re.test(line)) continue;
      const key = `${rule.ruleId}:${line.trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      signatures.push({
        ruleId: rule.ruleId,
        name: rule.name,
        stage: rule.stage,
        confidence: rule.confidence,
        line: index + 1,
        excerpt: line.trim().slice(0, 200)
      });
      break;
    }
    if (signatures.length >= 8) break;
  }

  return signatures;
}

const STAGE_HINTS: Array<{ stage: FailureStage; re: RegExp; confidence: number }> = [
  { stage: 'lint', re: /\blint\b|eslint|prettier/i, confidence: 0.7 },
  { stage: 'test', re: /\btest\b|jest|vitest|pytest/i, confidence: 0.7 },
  { stage: 'build', re: /\bbuild\b|compile|tsc|webpack|vite build/i, confidence: 0.68 },
  { stage: 'deploy', re: /\bdeploy\b|release|kubectl|helm|terraform apply/i, confidence: 0.68 }
];

function classifyStage(lines: string[], steps: StepSection[], signatures: ErrorSignature[]): ParsedLog['classification'] {
  if (signatures.length > 0) {
    const [top] = signatures.sort((a, b) => b.confidence - a.confidence);
    return {
      stage: top.stage,
      confidence: top.confidence,
      line: top.line,
      reason: `${top.name} (${top.ruleId})`
    };
  }

  for (const step of steps) {
    for (const hint of STAGE_HINTS) {
      if (hint.re.test(step.title)) {
        return {
          stage: hint.stage,
          confidence: hint.confidence,
          line: step.startLine,
          reason: `Step title match: ${step.title}`
        };
      }
    }
  }

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (!ERROR_RE.test(line)) continue;
    for (const hint of STAGE_HINTS) {
      if (hint.re.test(line)) {
        return {
          stage: hint.stage,
          confidence: Math.max(0.55, hint.confidence - 0.1),
          line: index + 1,
          reason: `Error context match: ${line.trim().slice(0, 90)}`
        };
      }
    }
  }

  return {
    stage: 'unknown',
    confidence: 0.2,
    line: null,
    reason: 'No deterministic stage rule matched'
  };
}

export function parseCiLog(rawLog: string): ParsedLog {
  const normalized = rawLog.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return {
      provider: 'unknown',
      steps: [],
      errorLines: [],
      signatures: [],
      classification: {
        stage: 'unknown',
        confidence: 0,
        line: null,
        reason: 'No log content provided'
      },
      summary: {
        totalLines: 0,
        stepCount: 0,
        errorCount: 0,
        warningCount: 0
      }
    };
  }

  const lines = normalized.split('\n');
  const steps = extractSteps(lines);
  const errorLines = extractErrorLines(lines);
  const signatures = extractSignatures(lines);
  const classification = classifyStage(lines, steps, signatures);

  const errorCount = lines.reduce((total, line) => total + (ERROR_RE.test(line) ? 1 : 0), 0);
  const warningCount = lines.reduce((total, line) => total + (WARNING_RE.test(line) ? 1 : 0), 0);

  return {
    provider: detectProvider(normalized),
    steps,
    errorLines,
    signatures,
    classification,
    summary: {
      totalLines: lines.length,
      stepCount: steps.length,
      errorCount,
      warningCount
    }
  };
}
