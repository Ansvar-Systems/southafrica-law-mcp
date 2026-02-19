# South Africa Law MCP — Project Guide

## Overview
MCP server providing South African primary legislation via Model Context Protocol. Data sourced from SAFLII (saflii.org) and official Government publications. Strategy B deployment (runtime DB download on Vercel cold start).

## Architecture
- **Dual transport**: stdio (`src/index.ts`) + Streamable HTTP (`api/mcp.ts`)
- **Shared tool registry**: `src/tools/registry.ts` — both transports use identical tools
- **Database**: SQLite + FTS5, built by `scripts/build-db.ts` from seed JSON
- **Ingestion**: `scripts/ingest.ts` scrapes SAFLII HTML for consolidated SA Acts
- **Multilingual**: English (en) primary, Afrikaans (af), Zulu (zu) from SAFLII

## Key Conventions
- All tool implementations return `ToolResponse<T>` with `results` + `_metadata`
- Database queries MUST use parameterized statements (never string interpolation)
- FTS5 queries go through `buildFtsQueryVariants()` for sanitization
- Statute IDs use `act-{N}-{year}` format (e.g., `act-4-2013` for POPIA)
- Statute IDs resolved via `resolveExistingStatuteId()` (exact match, Act number extraction, then LIKE)
- Journal mode must be DELETE (not WAL) for WASM/serverless compatibility
- South Africa is NOT an EU member — EU references track influence, not implementation

## Commands
- `npm test` — run unit + integration tests (vitest)
- `npm run test:contract` — run golden contract tests
- `npm run test:coverage` — coverage report
- `npm run build` — compile TypeScript
- `npm run validate` — full test suite (unit + contract)
- `npm run dev` — stdio server in dev mode
- `npm run ingest` — fetch legislation from SAFLII
- `npm run build:db` — rebuild SQLite from seed JSON

## Testing
- Golden contract tests in `__tests__/contract/` driven by `fixtures/golden-tests.json`
- Drift detection via `fixtures/golden-hashes.json`
- Always run `npm run validate` before committing

## File Structure
- `src/tools/*.ts` — one file per MCP tool
- `src/utils/*.ts` — shared utilities (FTS, metadata, statute ID resolution)
- `src/citation/*.ts` — citation parsing, formatting, validation
- `scripts/` — ingestion pipeline and maintenance scripts
- `api/` — Vercel serverless functions (health + MCP endpoint)
- `fixtures/` — golden tests and drift hashes

## SA-specific Notes
- Citation format: "Section N, Act Title X of Year" (e.g., "Section 2, Protection of Personal Information Act 4 of 2013")
- Document ID format: `act-{number}-{year}` (e.g., `act-4-2013`)
- Key laws: POPIA (4/2013), Cybercrimes Act (19/2020), ECTA (25/2002), Companies Act (71/2008), CPA (68/2008), PAIA (2/2000), RICA (70/2002)
- SAFLII uses AfricanLII platform (standardized HTML structure)
- Rate limit: 500ms between SAFLII requests (polite scraping)

## Git Workflow

- **Never commit directly to `main`.** Always create a feature branch and open a Pull Request.
- Branch protection requires: verified signatures, PR review, and status checks to pass.
- Use conventional commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`, etc.
