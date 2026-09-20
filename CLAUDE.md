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

An MCP stdio server that wraps the Gamma generation API (https://gamma.app).

`src/index.ts` creates an `McpServer`, calls `registerAllTools` then `registerAllPrompts`,
and connects a `StdioServerTransport`. **All logging goes to `console.error`** — stdout is
the MCP protocol channel.

Two independent halves:

**Tools** (`src/mcp-tools.ts` → `src/gamma-api.ts`). Four tools, hardcoded in TypeScript:
- `generate-presentation` — full passthrough; every Gamma parameter exposed as a Zod schema
- `generate-executive-presentation` — 16x9 PPTX preset (condense/medium/photorealistic, theme-logo footer)
- `generate-executive-report` — A4 PDF preset (preserve/detailed); accepts `inputText` or `filePath`, and derives `numCards` from content length (~1000 chars/page; Gamma accepts 1–15 then multiples of 5 up to 60)
- `get-presentation-assets` — resolve/download PDF & PPTX for a `generationId` (downloads land in `/tmp`, see `DOWNLOAD_PATH`)

`gamma-api.ts` does create → poll (30s interval, 10min ceiling) → extract URL. The Gamma API
response shape is inconsistent, so `extractUrl`/`extractGenerationId` probe many aliases
(`gammaUrl`/`url`/`exportUrl`/`outputs[]`/`exports[]`/…). When the API surfaces a new field
name, add it to `GammaAPIResponse` in `types.ts` and to those extractors — not to callers.

**Prompts** (`src/mcp-prompts.ts` → `src/prompt-loader.ts`). Zero prompts live in code. The
loader reads `*.json` from the public dir then the private dir (private wins on name
collision), converts each `parameters` entry into a Zod schema, and registers a prompt that
renders `template` with `{{param}}` / `{{param || "default"}}` substitution. With hot-reload
on (default), `fs.watch` on both dirs triggers a debounced re-register — so editing a prompt
JSON needs no rebuild or restart, while editing a tool does.

To add or change a prompt, edit `prompts/public/*.json`; never reintroduce hardcoded prompts
into `mcp-prompts.ts`. `prompts/private/` is git-ignored. `package.json`'s `files` ships only
`build` and `prompts/public`.

`src/constants.ts` is the single source of truth for Gamma enums (text modes, formats, image
sources, card dimensions, header/footer types & positions, sizes) and for env-var-backed
config. `mcp-tools.ts` builds its Zod `.enum()`s and description strings from those arrays,
and `types.ts` derives its union types from them — so adding a Gamma option is a one-line
edit in `constants.ts`.

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
