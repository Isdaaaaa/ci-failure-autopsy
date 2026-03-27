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

  const topSteps = parsed.steps.slice(0, 4);
  const topErrors = parsed.errorLines.slice(0, 5);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan">CI Failure Autopsy</p>
            <h1 className="text-2xl font-semibold text-slate">Log Ingestion + Parsing</h1>
          </div>
          <div className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
            {parsed.summary.totalLines > 0 ? `${parsed.summary.totalLines} lines parsed` : 'Waiting for incident payload'}
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <article className={`${panel} placeholder-grid`}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-slate">Log Input</h2>
                <div className="flex items-center gap-2">
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
              <p className="mt-2 text-xs text-slate-400">Supports paste, drag-and-drop, and file upload for GitHub Actions, GitLab, Jenkins, or generic CI output.</p>
            </article>

            <article className={panel}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate">Timeline</h2>
                <span className="font-mono text-xs text-slate-400">provider: {providerLabel[parsed.provider]}</span>
              </div>
              {isParsing ? (
                <p className="text-sm text-cyan">Parsing file payload…</p>
              ) : topSteps.length > 0 ? (
                <ol className="space-y-2">
                  {topSteps.map((step) => (
                    <li key={`${step.title}-${step.startLine}`} className="rounded-lg border border-slate-700/70 bg-slate-950/60 p-3">
                      <p className="text-sm font-medium text-slate">{step.title}</p>
                      <p className="mt-1 font-mono text-[11px] text-slate-400">
                        lines {step.startLine}–{step.endLine}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-slate-300">Empty state: ingest logs to render step timeline and evidence anchors.</p>
              )}
            </article>
          </div>

          <div className="space-y-4">
            <article className={panel}>
              <h2 className="mb-3 text-sm font-semibold text-slate">Signature Cards</h2>
              {topErrors.length > 0 ? (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {topErrors.map((error) => (
                    <div key={`${error.line}-${error.text}`} className="rounded-lg border border-amber/50 bg-slate-950/60 p-3">
                      <p className="text-xs text-amber">line {error.line}</p>
                      <p className="mt-1 font-mono text-xs text-slate-200">{error.text}</p>
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
                  <li key={item} className="flex items-center gap-2 rounded-md border border-slate-700/60 bg-slate-950/50 px-3 py-2">
                    <span className="h-3 w-3 rounded border border-cyan/60" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className={`${panel} border-amber/35`}>
              <h2 className="mb-2 text-sm font-semibold text-amber">PR Plan Box</h2>
              <p className="text-sm text-slate-300">Errors: {parsed.summary.errorCount} · Warnings: {parsed.summary.warningCount}</p>
              <p className="mt-2 font-mono text-xs text-slate-400">`fix(ci): isolate failure source and patch`</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
