# NPX Usage Guide

Run the Gamma MCP Server via `npx` without cloning the repository!

## Quick Start

```bash
# Basic usage - includes all 11 public prompts automatically
GAMMA_API_KEY=your_gamma_api_key npx gamma-mcp-server
```

## Public Prompts Are Bundled

When you run via `npx`, you automatically get all public prompts:

✅ **11 Public Prompts Included:**
1. `business-pitch-deck` - Professional investor pitch decks
2. `product-launch` - Product launch presentations
3. `quarterly-business-review` - QBR presentations
4. `training-workshop` - Educational training sessions
5. `sales-proposal` - Sales proposal presentations
6. `conference-talk` - Conference/keynote talks
7. `project-kickoff` - Project kickoff meetings
8. `executive-briefing` - Executive briefings
9. `investor-update` - Investor update presentations
10. `all-hands-meeting` - Company all-hands meetings
11. `team-retrospective` - Team retrospective sessions

**No setup required** - these prompts are part of the npm package!

## Adding Your Own Prompts

### Option 1: Keep Public + Add Private (Recommended)

```bash
# Create your private prompts directory
mkdir -p ~/.gamma-prompts

# Add a custom prompt
cat > ~/.gamma-prompts/my-prompt.json <<'EOF'
{
  "name": "company-strategy",
  "description": "Company strategy presentation",
  "parameters": {
    "quarter": {
      "type": "string",
      "description": "Quarter (e.g., 'Q1 2025')",
      "required": true
    }
  },
  "template": "Create a company strategy presentation for {{quarter}}..."
}
EOF

# Run with both public (from package) + private (yours)
GAMMA_API_KEY=your_key \
GAMMA_PROMPTS_PRIVATE_DIR=~/.gamma-prompts \
npx gamma-mcp-server
```

**Result:** You get all 11 public prompts + your custom prompts!

### Option 2: Customize a Public Prompt

```bash
# Download the prompt you want to customize
mkdir -p ~/.gamma-prompts
curl -o ~/.gamma-prompts/business-pitch-deck.json \
  https://raw.githubusercontent.com/cbruyndoncx/gamma-mcp-server/main/prompts/public/business-pitch-deck.json

# Edit it to your needs
nano ~/.gamma-prompts/business-pitch-deck.json

# Run - your version overrides the public one
GAMMA_API_KEY=your_key \
GAMMA_PROMPTS_PRIVATE_DIR=~/.gamma-prompts \
npx gamma-mcp-server
```

### Option 3: View All Available Public Prompts

To see what's available:

```bash
# View online
open https://github.com/cbruyndoncx/gamma-mcp-server/tree/main/prompts/public

# Or clone to explore locally
git clone https://github.com/cbruyndoncx/gamma-mcp-server.git
cd gamma-mcp-server
ls prompts/public/
cat prompts/public/business-pitch-deck.json
```

## MCP Client Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gamma-presentation": {
      "command": "npx",
      "args": ["-y", "gamma-mcp-server"],
      "env": {
        "GAMMA_API_KEY": "your_gamma_api_key_here",
        "GAMMA_PROMPTS_PRIVATE_DIR": "/home/user/.gamma-prompts"
      }
    }
  }
}
```

**Benefits:**
- ✅ No git clone required
- ✅ Always runs latest published version
- ✅ All public prompts included automatically
- ✅ Add your own private prompts
- ✅ Hot-reload enabled by default

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `GAMMA_API_KEY` | Your Gamma API key | Required |
| `GAMMA_PROMPTS_PUBLIC_DIR` | Public prompts path | `prompts/public` (from package) |
| `GAMMA_PROMPTS_PRIVATE_DIR` | Private prompts path | `prompts/private` |
| `GAMMA_PROMPTS_HOT_RELOAD` | Enable auto-reload | `true` |

## How It Works

### Package Structure

When you run `npx gamma-mcp-server`, npm downloads and runs:

```
node_modules/gamma-mcp-server/
├── build/               # Compiled JavaScript
├── prompts/
│   └── public/         # 11 prompts (bundled with package)
│       ├── business-pitch-deck.json
│       ├── product-launch.json
│       └── ... (9 more)
└── package.json
```

### Loading Order

Prompts load in this priority:

1. **Private prompts** (`GAMMA_PROMPTS_PRIVATE_DIR`) - Your custom prompts (highest priority)
2. **Public prompts** (from package) - Built-in prompts (lower priority)

Private prompts override public prompts with the same name.

## Common Use Cases

### Use Case 1: Just Use Public Prompts

```bash
# Simplest setup - public prompts only
GAMMA_API_KEY=your_key npx gamma-mcp-server
```

### Use Case 2: Public + Your Private Prompts

```bash
# Best of both worlds
GAMMA_API_KEY=your_key \
GAMMA_PROMPTS_PRIVATE_DIR=~/.gamma-prompts \
npx gamma-mcp-server
```

### Use Case 3: Team Shared + Personal

```bash
# Team shared prompts + your personal ones
GAMMA_API_KEY=your_key \
GAMMA_PROMPTS_PUBLIC_DIR=/mnt/team-shared-prompts \
GAMMA_PROMPTS_PRIVATE_DIR=~/.my-gamma-prompts \
npx gamma-mcp-server
```

### Use Case 4: Development with Hot-Reload

```bash
# Edit prompts, changes apply instantly
GAMMA_API_KEY=your_key \
GAMMA_PROMPTS_PRIVATE_DIR=~/projects/my-prompts \
GAMMA_PROMPTS_HOT_RELOAD=true \
npx gamma-mcp-server
```

### Use Case 5: Production (Stable)

```bash
# Disable hot-reload for stability
GAMMA_API_KEY=your_key \
GAMMA_PROMPTS_PRIVATE_DIR=/etc/gamma/prompts \
GAMMA_PROMPTS_HOT_RELOAD=false \
npx gamma-mcp-server
```

## FAQ

### Q: Do I need to git clone the repo to use it?

**No!** Just run `npx gamma-mcp-server` - all public prompts are included in the npm package.

### Q: Can I use my own prompts?

**Yes!** Set `GAMMA_PROMPTS_PRIVATE_DIR` to point to your prompts directory.

### Q: Will my private prompts override public ones?

**Yes!** If you create a private prompt with the same name as a public one, yours takes precedence.

### Q: How do I update to the latest version?

```bash
# NPX automatically uses latest, but you can force it:
npx gamma-mcp-server@latest

# Or clear cache:
npx clear-npx-cache
npx gamma-mcp-server
```

### Q: Can I see the public prompts before using them?

**Yes!** View them at:
- Online: https://github.com/cbruyndoncx/gamma-mcp-server/tree/main/prompts/public
- Or clone the repo to explore

### Q: Do I need to rebuild when editing prompts?

**No!** With hot-reload enabled (default), just save your JSON file and it reloads automatically.

### Q: Can multiple users share prompts?

**Yes!** Point `GAMMA_PROMPTS_PUBLIC_DIR` to a shared directory:

```bash
GAMMA_PROMPTS_PUBLIC_DIR=/mnt/team-prompts \
GAMMA_PROMPTS_PRIVATE_DIR=~/.my-prompts \
npx gamma-mcp-server
```

## Troubleshooting

### Issue: Prompts not loading

```bash
# Check which directories are being used
GAMMA_API_KEY=key npx gamma-mcp-server
# Look for: "Loaded X prompts from: ..."

# Verify your private directory exists
ls -la $GAMMA_PROMPTS_PRIVATE_DIR
```

### Issue: Can't find a specific prompt

```bash
# List all prompts in your private directory
ls ~/.gamma-prompts/

# Check if public prompts are accessible (when running from package)
# Public prompts are in: node_modules/gamma-mcp-server/prompts/public/
```

### Issue: Changes not taking effect

```bash
# Ensure hot-reload is enabled (default)
echo $GAMMA_PROMPTS_HOT_RELOAD  # Should be empty or "true"

# Or explicitly enable it
GAMMA_PROMPTS_HOT_RELOAD=true npx gamma-mcp-server
```

## Next Steps

- **[CONFIGURATION.md](CONFIGURATION.md)** - Complete configuration guide
- **[PROMPTS_GUIDE.md](PROMPTS_GUIDE.md)** - How to create custom prompts
- **[CHANGELOG.md](CHANGELOG.md)** - Recent changes and architecture
- **Repository:** https://github.com/cbruyndoncx/gamma-mcp-server

## Summary

✅ **No git clone needed** - Run via `npx`
✅ **11 public prompts included** - Automatic with package
✅ **Add your own prompts** - Via `GAMMA_PROMPTS_PRIVATE_DIR`
✅ **Hot-reload enabled** - Edit prompts without restart
✅ **Flexible configuration** - Environment variables
✅ **MCP client ready** - Works with Claude Desktop, etc.

**Get started now:**
```bash
GAMMA_API_KEY=your_key npx gamma-mcp-server
```
