# CI Failure Autopsy

Next.js + TypeScript + Tailwind app for forensic triage of CI failures.

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

## Demo workflow

1. Launch the app.
2. In **Log Input**, click one of the **Demo incidents** to preload realistic CI logs.
3. Review:
   - **Timeline + Evidence** for culprit step badges and line-cited excerpts
   - **Signature Cards** for inferred failure type + confidence
   - **Fix Checklist** and **PR Plan Box** for copy-ready remediation text

You can also paste logs manually, drag/drop `.log` files, or upload from disk.

## Scripts

- `npm run lint` — ESLint checks
- `npm run test` — Vitest suite
- `npm run typecheck` — TypeScript no-emit check
- `npm run build` — production build

## Screenshot notes (optional)

For portfolio capture:

```bash
npm run dev
# in another terminal (auto-installs playwright if needed)
npx --yes playwright screenshot http://127.0.0.1:3000 assets/screenshots/desktop-home.png
```

Suggested captures:
- Empty state (fresh load)
- Demo-loaded timeline state
- Mobile viewport (DevTools emulation) for stacked layout
