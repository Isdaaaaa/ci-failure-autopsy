# CI Failure Autopsy — Plan

## Summary
A web app that ingests failed CI logs and turns them into a root-cause timeline, probable fixes, and a copy-ready PR patch plan. MVP focuses on pasted logs with deterministic parsing plus light summarization.

## Target user
- Engineers and SREs triaging failing pipelines
- ICs preparing a quick fix PR after a broken build/test/deploy
- Hiring managers and recruiters assessing DevEx intuition

## Portfolio positioning
Demonstrates DevEx product thinking, log parsing, and pragmatic AI assist. Highlights ability to turn noisy CI data into actionable guidance with evidence citations.

## MVP scope
- Paste/upload CI failure logs (GitHub Actions, GitLab, Jenkins common formats)
- Detect failure stage (build/test/lint/deploy)
- Extract key error signatures and culprit lines
- Show a chronological timeline with evidence snippets
- Output fix checklist and suggested commit message/PR description

## Non-goals (for now)
- Live CI integrations/webhooks
- Multi-run analytics or flake detection
- Auth/user accounts
- Broad language coverage beyond JS/TS, Python, Docker basics

## Technical approach
- Next.js + TypeScript UI with Tailwind
- Node/TS parsing workers with regex/rules for common errors
- Lightweight LLM summarization for phrasing (optional, guardrailed by extracted snippets)
- SQLite to persist uploaded runs for demo replay
- Sample log fixtures for predictable demos

## Execution notes
- Start with paste-only; add file upload second
- Keep parsers deterministic and cite line numbers for trust
- Build a small library of sample failures to demo robustness
- Record a short GIF of analysis flow once slices complete
