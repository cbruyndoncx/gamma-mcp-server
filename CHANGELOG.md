# Changelog

## Unreleased

### Renamed to ThirdBrain Gamma MCP Server

- npm package is now `thirdbrain-gamma-mcp-server` (npm forbids capitals in new
  package names, so the display name "ThirdBrain Gamma MCP Server" is prose only).
- MCP server identity is now `thirdbrain-gamma`, renamed from `gamma-presentation`
  so it does not collide with Gamma's official MCP server in the same client.
- The GitHub repository is still `cbruyndoncx/gamma-mcp-server`; clone URLs and
  `cd gamma-mcp-server` in the docs are unchanged.
- `package.json` gained the `version` and `description` fields it was missing, and
  `typescript` / `@types/node` moved into `devDependencies` — `npm run build`
  previously failed on any clean clone.

### Internal restructure

- `gamma-api.ts` split into `src/api/client.ts` (auth, error mapping, retries,
  rate-limit accounting) and `src/api/generations.ts`.
- `mcp-tools.ts` split into `src/tools/{generation,presets,assets,format,index}.ts`.
- New `src/schemas.ts` holds the shared Zod fragments. The header/footer slot schema
  was previously copy-pasted six times; it is now defined once and gained the
  500-character bound on `value` that the API enforces but the old schema did not.
- **Rate-limit-aware polling.** The client reads `x-ratelimit-remaining-burst` and
  slows down before hitting a 429 rather than after. Transient failures (429, 5xx)
  retry with backoff, honouring `Retry-After` when present.
- `BASE_URL` is now the API root, so non-generation endpoints can be built from it.
- API errors now carry an actionable hint per status code (401 points at the
  `sk-gamma-` prefix and the `X-API-KEY` header, 402 at billing, 404 at the `g_`
  file-ID-versus-URL-slug confusion).

### Gamma v1.0 API correctness pass

- **`unsplash` removed from `imageOptions.source`.** The v1.0 API rejects it with a
  400. Replaced by `pexels`; `themeAccent` added.
- **Polling now runs at 5s** (was 30s) with a 5-minute ceiling, matching Gamma's
  documented cadence.
- **`png` added to `exportAs`.** It returns a .zip with one PNG per card.
- **Warnings are surfaced.** `warnings` and `pageWarnings` from the create response
  are now shown — this is how Gamma reports a parameter it silently ignored.
- **Credits are surfaced.** `credits.deducted` / `credits.remaining` appear on every
  generation result.
- **Export URLs are labelled as secrets** and no longer written to the server log.
  They are unauthenticated and expire after about a week.
- **Dead response handling removed.** The client no longer probes `pdfUrl`,
  `pptxUrl`, `exports[]`, `outputs[]`, `artifacts[]` or snake_case aliases; none
  exist in v1.0. API errors now report Gamma's own `{ message, statusCode }`.
- **`get-presentation-assets` returns a single `exportUrl`**, since the API permits
  only one `exportAs` per generation. It can no longer claim to return both a PDF
  and a PPTX.
- **Schema bounds added** to match the API: `inputText` ≤400,000,
  `additionalInstructions` ≤5,000, `tone`/`audience` ≤500, `style` ≤5,000,
  `folderIds` at most 1 item.
- **`numCards` rounding removed** from `generate-executive-report`. The API
  documents a plain 1–75 integer; the previous multiple-of-5 stepping is not in the
  current spec. See the `TODO(verify)` in `src/mcp-tools.ts` — this needs one live
  confirmation call.
- **`GAMMA_DOWNLOAD_DIR`** replaces the hardcoded `/tmp` download path.

See [docs/API_UPDATE_PLAN.md](docs/API_UPDATE_PLAN.md) for the full plan, including
the remaining phases and the tool-name parity table against Gamma's official MCP server.

## Recent Major Changes

### JSON-Based Prompt System (Current)

**All prompts are now external JSON files** - the codebase has been refactored for maximum flexibility.

#### What Changed

- ✅ **Removed all hardcoded prompts** (553 lines → 25 lines, 96% reduction)
- ✅ **All prompts now in JSON** files (`prompts/public/*.json`)
- ✅ **Environment variable configuration** for custom prompt directories
- ✅ **Hot-reload support** - edit prompts without server restart
- ✅ **Private prompts support** - git-ignored `prompts/private/` directory

#### Key Features

1. **Runtime Configuration**
   ```bash
   GAMMA_PROMPTS_PRIVATE_DIR=~/my-prompts npx thirdbrain-gamma-mcp-server
   ```

2. **Hot-Reload (Enabled by Default)**
   - Edit prompt JSON files
   - Changes apply automatically
   - No rebuild or restart needed

3. **Flexible Deployment**
   - Run via `npx` without git clone
   - Custom prompt directories per user/environment
   - Portable and configurable

#### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `GAMMA_PROMPTS_PUBLIC_DIR` | Public prompts path | `prompts/public` |
| `GAMMA_PROMPTS_PRIVATE_DIR` | Private prompts path | `prompts/private` |
| `GAMMA_PROMPTS_HOT_RELOAD` | Enable auto-reload | `true` |

## Documentation

- **[CONFIGURATION.md](CONFIGURATION.md)** - Environment variables and configuration
- **[PROMPTS_GUIDE.md](PROMPTS_GUIDE.md)** - How to create and manage prompts
- **[prompts/README.md](prompts/README.md)** - Quick reference for JSON format
- **[.env.example](.env.example)** - Environment variable template

## Architecture Overview

### Current Structure

```
src/
├── constants.ts           # Configuration (env vars)
├── types.ts              # TypeScript interfaces
├── gamma-api.ts          # Gamma API client
├── prompt-loader.ts      # JSON loader + hot-reload
├── mcp-tools.ts          # MCP tool definitions
├── mcp-prompts.ts        # 25 lines (was 553!)
└── index.ts              # Server entry point

prompts/
├── public/               # 11 JSON prompts (in git)
└── private/              # User prompts (git-ignored)
```

### File Size Reduction

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| `mcp-prompts.ts` | 553 lines | 25 lines | -96% |
| `mcp-prompts.js` | ~19 KB | 819 bytes | -96% |

## Upgrade Notes

### If You Were Using Pre-JSON Version

The old hardcoded prompts are gone. To use this version:

1. **All prompts are in JSON files now** - check `prompts/public/`
2. **Create private prompts** in `prompts/private/` (git-ignored)
3. **Configure via env vars** if needed (optional)
4. **Hot-reload is enabled by default** - no restarts needed

### Example: Adding Private Prompts

```bash
# Create your private prompt
cat > prompts/private/my-prompt.json <<'JSONEOF'
{
  "name": "my-custom-prompt",
  "description": "My custom presentation prompt",
  "parameters": {
    "topic": {
      "type": "string",
      "description": "Presentation topic",
      "required": true
    }
  },
  "template": "Create a presentation about {{topic}}..."
}
JSONEOF

# No rebuild needed with hot-reload!
# Just save and it's live
```

## Breaking Changes

### None for End Users

If you were using the MCP server through a client (like Claude Desktop), **nothing changes** - all existing prompts still work, they're just in JSON files now.

### For Developers/Contributors

- Prompts are no longer in TypeScript code
- Edit `prompts/public/*.json` instead of `src/mcp-prompts.ts`
- Private prompts go in `prompts/private/` (git-ignored)

## Benefits Achieved

✅ **96% code reduction** - Cleaner, more maintainable  
✅ **Runtime configuration** - No hardcoded paths  
✅ **Hot-reload** - Edit without restart  
✅ **Private prompts** - Git-ignored confidential templates  
✅ **NPX-ready** - Run anywhere with custom config  
✅ **User-specific** - Each user can have their own prompts  

## See Also

- [CONFIGURATION.md](CONFIGURATION.md) - Complete configuration guide
- [PROMPTS_GUIDE.md](PROMPTS_GUIDE.md) - Creating prompt templates
- [.env.example](.env.example) - Environment setup example
