# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Naming

Three names that do not match, deliberately:

- **npm package / CLI:** `thirdbrain-gamma-mcp-server` (npm forbids capitals in new package names, so the display name "ThirdBrain Gamma MCP Server" is prose only).
- **GitHub repo:** still `cbruyndoncx/gamma-mcp-server`. Every `github.com/...` URL and `git clone && cd gamma-mcp-server` in the docs refers to this and must not be renamed until the repo itself is.
- **MCP server identity:** `thirdbrain-gamma` (`src/index.ts`), renamed from `gamma-presentation` to avoid colliding with Gamma's official MCP server in the same client.

## Commands

```bash
npm install
npm run build          # tsc → build/, then chmod 755 build/index.js
GAMMA_API_KEY=... node build/index.js    # run the server (stdio transport)
npx ts-node src/index.ts                 # run from TS without building
```

There is no test suite, linter, or formatter configured. Verify changes by running the
server and exercising it from an MCP client, or by hand-driving stdio.

**`build/` is committed to git**, despite CONTRIBUTING.md claiming otherwise. Every commit
that touches `src/*.ts` must also `npm run build` and stage the regenerated `build/*.js`,
or `npx thirdbrain-gamma-mcp-server` users get stale behaviour. Check `git log --name-only` — this is
the established pattern.

## Architecture

An MCP stdio server wrapping the Gamma v1.0 API (https://developers.gamma.app).

`src/index.ts` creates an `McpServer`, calls `registerAllTools` then
`registerAllPrompts`, and connects a `StdioServerTransport`. **All logging goes to
`console.error`** — stdout is the MCP protocol channel.

Two independent halves:

**Tools** (`src/tools/*` → `src/api/*`). Hardcoded in TypeScript. Tool names match
[Gamma's official MCP server](https://developers.gamma.app/mcp/mcp-tools-reference)
wherever the job is the same — `node scripts/parity-check.mjs` asserts all 17 are
present. Six more go beyond it: `download_export`, `archive_image`,
`archive_gamma`, `delete_gamma`, and the two executive presets.

Every request goes through `src/api/client.ts`, which owns authentication, query
building, error mapping (each status code gets an actionable hint), retries with
backoff for 429/5xx, and rate-limit accounting. `nextPollDelay` reads
`x-ratelimit-remaining-burst` and slows polling *before* a 429 rather than after.
New endpoints belong in an `src/api/*` module calling `apiRequest`, never calling
`fetch` directly — the one deliberate exception is the export download in
`generations.ts`, since a pre-signed export URL must not carry the API key.

Generation is async: POST returns only a `generationId`, and `gammaUrl`,
`exportUrl` and `credits` come from polling `GET /generations/{id}`. Tools block
by default; `waitForCompletion: false` returns the ID immediately.

**Prompts** (`src/mcp-prompts.ts` → `src/prompt-loader.ts`). Zero prompts live in
code. The loader reads `*.json` from the public dir then the private dir (private
wins on name collision), converts each `parameters` entry into a Zod schema, and
renders `template` with `{{param}}` / `{{param || "default"}}` substitution. With
hot-reload on (default), `fs.watch` triggers a debounced re-register — so editing
a prompt JSON needs no rebuild or restart, while editing a tool does.

Prompt templates name tools as free text, which is **not** validated against
registered tools. Renaming a tool silently breaks any template that mentions it;
grep `prompts/` when you do.

**Single sources of truth.** `src/constants.ts` holds every Gamma enum and the
env-var config; `src/types.ts` derives its union types from those arrays. Adding
a Gamma option is a one-line edit there. `src/schemas.ts` holds the shared Zod
fragments (`headerFooterElementSchema`, `textOptionsSchema`, `sharingOptionsSchema`,
`pageSchema`, …) — build tool inputs from these rather than inlining, which is how
the header/footer schema ended up copy-pasted six times before.

**Two things the API returns that are easy to drop:** `warnings` (how Gamma reports
a parameter it silently ignored — e.g. `dimensions` invalid for the chosen
`format`) and `credits`. `src/tools/format.ts` renders both; keep it that way.

**Export URLs are unauthenticated** and expire in about a week. Never log one.

## Environment variables

`GAMMA_API_KEY` (required), `GAMMA_PROMPTS_PUBLIC_DIR` (`prompts/public`),
`GAMMA_PROMPTS_PRIVATE_DIR` (`prompts/private`), `GAMMA_PROMPTS_HOT_RELOAD` (`true`; any
value other than the literal `"false"` enables it). Loaded via `dotenv` in `gamma-api.ts`,
but read at module load in `constants.ts` — pass them in the environment, not only in `.env`,
when order matters.

Relative prompt paths resolve against the process CWD, not the package root, which is why
npx users should point `GAMMA_PROMPTS_PRIVATE_DIR` at an absolute path.

## Reference docs

`docs/API_COVERAGE.md` and `docs/IMPLEMENTATION_STATUS.md` track which Gamma API parameters
are wired up and which are not (notably `sharingOptions`). Update them when extending
parameter coverage. `PROMPTS_GUIDE.md` and `prompts/README.md` document the prompt JSON
format; `CONFIGURATION.md` covers deployment scenarios.
