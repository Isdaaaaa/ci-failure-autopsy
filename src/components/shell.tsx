import React from 'react';

const panel =
  'rounded-xl border border-slate-700/60 bg-slate-900/45 p-4 shadow-panel backdrop-blur-sm';

function PlaceholderRow({ width = 'w-full' }: { width?: string }) {
  return <div className={`loading-shimmer h-3 rounded bg-slate-700/65 ${width}`} aria-hidden="true" />;
}

export default function Shell() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/60 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan">CI Failure Autopsy</p>
            <h1 className="text-2xl font-semibold text-slate">Bootstrap Shell</h1>
          </div>
          <div className="rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-amber">
            Waiting for first incident payload
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <article className={`${panel} placeholder-grid`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate">Log Input</h2>
                <span className="text-xs text-cyan">paste / upload</span>
              </div>
              <div className="rounded-lg border border-dashed border-cyan/40 bg-slate-950/55 p-4">
                <p className="text-sm text-slate-300">Drop CI logs here to begin forensic parsing.</p>
                <p className="mt-2 font-mono text-xs text-slate-400">No payload detected. Empty state preserved intentionally.</p>
              </div>
            </article>

            <article className={panel}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate">Timeline Placeholder</h2>
                <span className="font-mono text-xs text-slate-400">loading evidence…</span>
              </div>
              <div className="space-y-2">
                <PlaceholderRow />
                <PlaceholderRow width="w-11/12" />
                <PlaceholderRow width="w-4/5" />
              </div>
            </article>
          </div>

          <div className="space-y-4">
            <article className={panel}>
              <h2 className="mb-3 text-sm font-semibold text-slate">Signature Cards</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {['Compiler mismatch', 'Dependency outage', 'Test regression'].map((label) => (
                  <div key={label} className="rounded-lg border border-slate-700/70 bg-slate-950/60 p-3">
                    <p className="text-xs text-cyan">placeholder signature</p>
                    <p className="mt-1 font-medium text-slate">{label}</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-400">confidence: --%</p>
                  </div>
                ))}
              </div>
            </article>

            <article className={panel}>
              <h2 className="mb-3 text-sm font-semibold text-slate">Fix Checklist</h2>
              <ul className="space-y-2 text-sm text-slate-300">
                {['Reproduce failure locally', 'Pin culprit commit', 'Apply targeted patch'].map((item) => (
                  <li key={item} className="flex items-center gap-2 rounded-md border border-slate-700/60 bg-slate-950/50 px-3 py-2">
                    <span className="h-3 w-3 rounded border border-cyan/60" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className={`${panel} border-amber/35`}>
              <h2 className="mb-2 text-sm font-semibold text-amber">PR Plan Box</h2>
              <p className="text-sm text-slate-300">Ready state will summarize root cause, applied fix, and verification commands.</p>
              <p className="mt-2 font-mono text-xs text-slate-400">`feat: autopsy patch pending analysis`</p>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
