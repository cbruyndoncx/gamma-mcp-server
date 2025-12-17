# Changelog

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
   GAMMA_PROMPTS_PRIVATE_DIR=~/my-prompts npx gamma-mcp-server
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
