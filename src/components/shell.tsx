'use client';

import React, { ChangeEvent, DragEvent, useMemo, useState } from 'react';
import { parseCiLog } from '@/lib/log-parser';

const panel =
  'rounded-xl border border-slate-700/60 bg-slate-900/45 p-4 shadow-panel backdrop-blur-sm';

const providerLabel = {
  'github-actions': 'GitHub Actions',
  gitlab: 'GitLab CI',
  jenkins: 'Jenkins',
  unknown: 'Unknown CI'
} as const;

function stepBadge(index: number) {
  return `STEP ${String(index + 1).padStart(2, '0')}`;
}

export default function Shell() {
  const [rawLog, setRawLog] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const parsed = useMemo(() => parseCiLog(rawLog), [rawLog]);

  const ingestFile = async (file: File) => {
    setIsParsing(true);
    try {
      const text = await file.text();
      setRawLog(text);
    } finally {
      setIsParsing(false);
    }
  };

  const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await ingestFile(file);
    event.target.value = '';
  };

  const onDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    await ingestFile(file);
  };

  const timelineSteps = useMemo(() => {
    return parsed.steps.map((step, index) => {
      const evidence = parsed.errorLines
        .filter((entry) => entry.line >= step.startLine && entry.line <= step.endLine)
        .slice(0, 2);

      const signatures = parsed.signatures.filter(
        (entry) => entry.line >= step.startLine && entry.line <= step.endLine
      );

      return {
        ...step,
        badge: stepBadge(index),
        evidence,
        signatures,
        isCulprit: evidence.length > 0 || signatures.length > 0
      };
    });
  }, [parsed.errorLines, parsed.signatures, parsed.steps]);

  const topSteps = timelineSteps.slice(0, 6);
  const topSignatures = parsed.signatures.slice(0, 5);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-4 border-b border-slate-700/60 pb-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-cyan">CI Failure Autopsy</p>
              <h1 className="text-2xl font-semibold text-slate">Timeline + Evidence View</h1>
            </div>
            <div className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
              {parsed.summary.totalLines > 0
                ? `${parsed.summary.totalLines} lines parsed`
                : 'Waiting for incident payload'}
            </div>
          </div>

          <div className="sticky top-2 z-20 -mx-1 flex items-center justify-between gap-2 rounded-lg border border-slate-700/70 bg-backdrop/90 px-2 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:p-0">
            <p className="font-mono text-[11px] text-slate-400">
              provider: {providerLabel[parsed.provider]} · stage: {parsed.classification.stage}
            </p>
            <button
              type="button"
              onClick={() => setRawLog('')}
              className="rounded-md border border-slate-600 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-cyan/60 hover:text-cyan"
              disabled={!rawLog}
            >
              Clear payload
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <article className={`${panel} placeholder-grid`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate">Log Input</h2>
                <label className="cursor-pointer rounded-lg border border-cyan/45 bg-cyan/10 px-3 py-2 text-xs font-medium text-cyan hover:bg-cyan/20">
                  Upload .log/.txt
                  <input
                    type="file"
                    accept=".log,.txt,text/plain"
                    onChange={onUpload}
                    className="sr-only"
                    aria-label="Upload log file"
                  />
                </label>
              </div>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragActive(true);
                }}
                onDragLeave={() => setIsDragActive(false)}
                onDrop={onDrop}
                className={`rounded-lg border border-dashed p-1 transition ${
                  isDragActive ? 'border-cyan bg-cyan/10' : 'border-slate-700/50'
                }`}
              >
                <textarea
                  value={rawLog}
                  onChange={(event) => setRawLog(event.target.value)}
                  placeholder="Paste CI logs here…"
                  className="h-48 w-full resize-y rounded-lg border border-slate-700/70 bg-slate-950/70 p-3 font-mono text-xs leading-6 text-slate-200 outline-none ring-cyan/40 transition focus:ring"
                />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Supports paste, drag-and-drop, and file upload for GitHub Actions, GitLab,
                Jenkins, or generic CI output.
              </p>
            </article>

            <article className={panel}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate">Timeline + Evidence</h2>
                <span className="font-mono text-xs text-slate-400">{parsed.summary.stepCount} steps</span>
              </div>

              {isParsing ? (
                <div className="space-y-2" aria-label="Timeline loading state">
                  {[0, 1, 2].map((item) => (
                    <div
                      key={item}
                      className="loading-shimmer h-20 rounded-lg border border-slate-700/70 bg-slate-950/70"
                    />
                  ))}
                </div>
              ) : topSteps.length > 0 ? (
                <ol className="space-y-2">
                  {topSteps.map((step) => (
                    <li
                      key={`${step.title}-${step.startLine}`}
                      className={`rounded-lg border p-3 ${
                        step.isCulprit
                          ? 'border-amber/50 bg-amber/10'
                          : 'border-slate-700/70 bg-slate-950/60'
                      }`}
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate">{step.title}</p>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-1 font-mono text-[11px] ${
                              step.isCulprit
                                ? 'border border-amber/60 bg-amber/20 text-amber'
                                : 'border border-slate-600 bg-slate-800/70 text-slate-300'
                            }`}
                          >
                            {step.badge}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">
                            {step.startLine}–{step.endLine}
                          </span>
                        </div>
                      </div>

                      {step.evidence.length > 0 ? (
                        <div className="space-y-2" aria-label={`Evidence for ${step.title}`}>
                          {step.evidence.map((entry) => (
                            <blockquote
                              key={`${entry.line}-${entry.text}`}
                              className="rounded-md border-l-2 border-cyan/70 bg-slate-950/70 px-3 py-2"
                            >
                              <p className="font-mono text-[11px] text-cyan">line {entry.line}</p>
                              <p className="mt-1 font-mono text-xs text-slate-200">{entry.text}</p>
                            </blockquote>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">No direct error evidence captured in this step.</p>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-600 bg-slate-950/50 p-4">
                  <p className="text-sm font-medium text-slate">No timeline yet</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Ingest a CI log to materialize step badges and line-cited evidence excerpts.
                  </p>
                </div>
              )}
            </article>
          </div>

          <div className="space-y-4">
            <article className={panel}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate">Signature Cards</h2>
                <span className="rounded-md border border-cyan/40 bg-cyan/10 px-2 py-1 text-[11px] uppercase tracking-wide text-cyan">
                  stage: {parsed.classification.stage}
                </span>
              </div>
              <p className="mb-3 text-xs text-slate-400">
                confidence {(parsed.classification.confidence * 100).toFixed(0)}%
                {parsed.classification.line ? ` · line ${parsed.classification.line}` : ''}
              </p>
              {topSignatures.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {topSignatures.map((signature) => (
                    <div
                      key={`${signature.ruleId}-${signature.line}-${signature.excerpt}`}
                      className="rounded-lg border border-amber/50 bg-slate-950/60 p-3"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <p className="text-amber">{signature.name}</p>
                        <p className="font-mono text-slate-400">
                          {(signature.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-cyan">
                        {signature.stage}
                      </p>
                      <p className="mt-1 font-mono text-xs text-slate-200">
                        line {signature.line}: {signature.excerpt}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-300">No error signatures extracted yet.</p>
              )}
            </article>

            <article className={panel}>
              <h2 className="mb-3 text-sm font-semibold text-slate">Fix Checklist</h2>
              <ul className="space-y-2 text-sm text-slate-300">
                {['Reproduce failure locally', 'Pin culprit step', 'Draft targeted patch'].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 rounded-md border border-slate-700/60 bg-slate-950/50 px-3 py-2"
                  >
                    <span className="h-3 w-3 rounded border border-cyan/60" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className={`${panel} border-amber/35`}>
              <h2 className="mb-2 text-sm font-semibold text-amber">PR Plan Box</h2>
              <p className="text-sm text-slate-300">
                Errors: {parsed.summary.errorCount} · Warnings: {parsed.summary.warningCount}
              </p>
              <p className="mt-2 font-mono text-xs text-slate-400">
                `fix(ci): isolate failure source and patch`
              </p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
