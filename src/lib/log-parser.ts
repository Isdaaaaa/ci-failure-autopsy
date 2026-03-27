export type CIProvider = 'github-actions' | 'gitlab' | 'jenkins' | 'unknown';

export interface StepSection {
  title: string;
  startLine: number;
  endLine: number;
  lines: string[];
}

export interface ParsedLog {
  provider: CIProvider;
  steps: StepSection[];
  errorLines: { line: number; text: string }[];
  summary: {
    totalLines: number;
    stepCount: number;
    errorCount: number;
    warningCount: number;
  };
}

const ERROR_RE = /(##\[error\]|\berror\b|\bfailed\b|exception|fatal|traceback|npm err!|✖)/i;
const WARNING_RE = /(##\[warning\]|\bwarning\b|\bwarn\b)/i;

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

export function parseCiLog(rawLog: string): ParsedLog {
  const normalized = rawLog.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return {
      provider: 'unknown',
      steps: [],
      errorLines: [],
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

  const errorCount = lines.reduce((total, line) => total + (ERROR_RE.test(line) ? 1 : 0), 0);
  const warningCount = lines.reduce((total, line) => total + (WARNING_RE.test(line) ? 1 : 0), 0);

  return {
    provider: detectProvider(normalized),
    steps,
    errorLines,
    summary: {
      totalLines: lines.length,
      stepCount: steps.length,
      errorCount,
      warningCount
    }
  };
}
