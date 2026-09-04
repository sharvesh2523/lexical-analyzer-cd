# LexiCore Intelligent Analyzer

A local-first capstone workbench that preprocesses C source, classifies lexemes, reports lexical errors, emits a validated token stream, and builds a symbol table.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/lexicore-analyzer/src/analyzer/` — preprocessing, C lexical scanning, diagnostics, and symbol-table logic
- `artifacts/lexicore-analyzer/src/App.tsx` — analyzer workbench and supporting Architecture, Project, and Documentation routes
- `artifacts/lexicore-analyzer/src/index.css` — shared LexiCore theme, typography, and responsive presentation

## Architecture decisions

- Analysis runs locally in the browser so source code does not need to leave the workspace.
- The lexer preserves original line mapping while the preprocessor removes comments and blank lines for display.
- The UI keeps the source editor, pipeline, classified tokens, diagnostics, validated output, and symbol table in one traceable flow.
- C is the first supported language; future language support should extend the analyzer module without replacing the UI.

## Product

- Users can paste, upload, clear, reset, or load example C source.
- Users can inspect dynamically generated preprocessing results, token categories, line/column positions, lexical errors, validated token output, and declared symbols.
- Users can search and filter token classes, copy source/token output, export a JSON analysis report, and browse the project architecture and documentation.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
