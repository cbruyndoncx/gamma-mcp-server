# Configuration Guide

The Gamma MCP Server can be configured via environment variables, making it easy to run with custom settings using `npx`.

## Quick Start with NPX

**No git clone needed!** Run the server directly with `npx`:

```bash
# Basic usage - uses all public prompts from the package
GAMMA_API_KEY=your_key npx gamma-mcp-server
```

The public prompts are **bundled with the npm package**, so you get all 11 prompts automatically!

## Environment Variables

### Gamma API Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GAMMA_API_KEY` | Your Gamma API key | - | ✅ Yes |

### Prompt Directory Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GAMMA_PROMPTS_PUBLIC_DIR` | Path to public prompts directory | `prompts/public` | No |
| `GAMMA_PROMPTS_PRIVATE_DIR` | Path to private prompts directory | `prompts/private` | No |

Paths can be:
- **Relative** to the project root (e.g., `prompts/public`)
- **Absolute** paths (e.g., `/home/user/my-prompts`)

### Hot-Reload Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `GAMMA_PROMPTS_HOT_RELOAD` | Enable automatic prompt reload on file changes | `true` | No |

Set to `false` to disable hot-reload.

## Public Prompts with NPX

### How Public Prompts Work

When you run via `npx`, the package includes all public prompts in its bundle:

```
node_modules/gamma-mcp-server/
├── build/               # Compiled code
├── prompts/
│   └── public/         # 11 public prompts (bundled) ✓
│       ├── business-pitch-deck.json
│       ├── product-launch.json
│       ├── quarterly-business-review.json
│       └── ... (8 more)
└── package.json
```

**You get all public prompts automatically - no setup needed!**

### Viewing Available Public Prompts

To see what prompts are available:

```bash
# Clone the repo to view prompts
git clone https://github.com/cbruyndoncx/gamma-mcp-server.git
cd gamma-mcp-server
ls prompts/public/

# Or view online
# https://github.com/cbruyndoncx/gamma-mcp-server/tree/main/prompts/public
```

Available public prompts:
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

## Usage Examples

### 1. Run with Default Settings (Public Prompts Only)

```bash
# Uses public prompts from the package
# No private prompts directory needed
GAMMA_API_KEY=your_key npx gamma-mcp-server
```

### 2. Add Your Own Private Prompts (Recommended)

```bash
# Keep public prompts, add your custom ones
# Create your private prompts directory
mkdir -p ~/.gamma-prompts

# Add a custom prompt
cat > ~/.gamma-prompts/my-prompt.json <<'EOF'
{
  "name": "my-custom-prompt",
  "description": "My custom presentation",
  "parameters": {
    "topic": {"type": "string", "required": true}
  },
  "template": "Create a presentation about {{topic}}..."
}
EOF

# Run with both public (from package) + private (yours)
GAMMA_API_KEY=your_key \
GAMMA_PROMPTS_PRIVATE_DIR=~/.gamma-prompts \
npx gamma-mcp-server

# Result: 11 public prompts + your custom prompts!
```

### 3. Customize a Public Prompt

```bash
# Download a public prompt to customize
mkdir -p ~/.gamma-prompts
curl -o ~/.gamma-prompts/business-pitch-deck.json \
  https://raw.githubusercontent.com/cbruyndoncx/gamma-mcp-server/main/prompts/public/business-pitch-deck.json

# Edit it
nano ~/.gamma-prompts/business-pitch-deck.json

# Your version overrides the public one
GAMMA_API_KEY=your_key \
GAMMA_PROMPTS_PRIVATE_DIR=~/.gamma-prompts \
npx gamma-mcp-server
```

### 4. Use Completely Custom Prompts (Advanced)

```bash
# Disable package prompts, use only your own
GAMMA_API_KEY=your_key \
GAMMA_PROMPTS_PUBLIC_DIR=/opt/my-prompts \
GAMMA_PROMPTS_PRIVATE_DIR=/home/user/private-prompts \
npx gamma-mcp-server
```

### 5. Run with Hot-Reload Disabled

```bash
# Disable automatic reloading (for production)
GAMMA_API_KEY=your_key \
GAMMA_PROMPTS_HOT_RELOAD=false \
npx gamma-mcp-server
```

### 6. Run with .env File (Local Development)

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
nano .env
```

Edit `.env`:
```env
GAMMA_API_KEY=your_actual_api_key
GAMMA_PROMPTS_PRIVATE_DIR=/home/user/my-prompts
GAMMA_PROMPTS_HOT_RELOAD=true
```

Run:
```bash
npx gamma-mcp-server
```

## Hot-Reload Feature

### What is Hot-Reload?

When enabled (default), the server automatically detects changes to prompt JSON files and reloads them **without requiring a server restart**.

### How It Works

1. **File Watching**: Monitors both public and private prompt directories
2. **Change Detection**: Detects when `.json` files are added, modified, or deleted
3. **Debouncing**: Waits 500ms after the last change before reloading
4. **Automatic Reload**: Reloads and re-registers all prompts
5. **No Downtime**: Server continues running, new prompts available immediately

### Workflow Example

```bash
# Start server with hot-reload enabled (default)
$ GAMMA_API_KEY=your_key npx gamma-mcp-server
Loaded 11 external prompt(s) from:
  - Public: prompts/public
  - Private: prompts/private
Watching for prompt changes in: prompts/public
Watching for prompt changes in: prompts/private
Gamma MCP Server running on stdio

# In another terminal, edit a prompt
$ nano prompts/private/my-prompt.json
# Save the file...

# Server output shows automatic reload:
Prompt file changed: my-prompt.json - Reloading...
✓ Reloaded 12 prompt(s)

# Your changes are now live - no restart needed!
```

### When to Disable Hot-Reload

Disable hot-reload in these scenarios:

1. **Production environments** - For stability and predictability
2. **Docker containers** - If using read-only filesystems
3. **Debugging** - To ensure consistent behavior during testing
4. **Performance** - On systems with many prompt files

```bash
GAMMA_PROMPTS_HOT_RELOAD=false npx gamma-mcp-server
```

## Directory Structure Examples

### Example 1: Shared Team Setup

```bash
# Company-wide shared prompts + your private ones
GAMMA_PROMPTS_PUBLIC_DIR=/mnt/shared/team-prompts \
GAMMA_PROMPTS_PRIVATE_DIR=~/.gamma-prompts \
npx gamma-mcp-server
```

Directory layout:
```
/mnt/shared/team-prompts/          # Shared with team
├── company-pitch.json
├── product-demo.json
└── ...

~/.gamma-prompts/                   # Your private prompts
├── client-proposal.json
├── internal-review.json
└── ...
```

### Example 2: Multi-Environment Setup

Different prompts for different environments:

**Development:**
```bash
GAMMA_PROMPTS_PRIVATE_DIR=./prompts/dev \
npx gamma-mcp-server
```

**Staging:**
```bash
GAMMA_PROMPTS_PRIVATE_DIR=./prompts/staging \
npx gamma-mcp-server
```

**Production:**
```bash
GAMMA_PROMPTS_PRIVATE_DIR=/etc/gamma/prompts/production \
GAMMA_PROMPTS_HOT_RELOAD=false \
npx gamma-mcp-server
```

### Example 3: User-Specific Prompts

Each user has their own private prompts:

```bash
# User's home directory setup
GAMMA_PROMPTS_PRIVATE_DIR=$HOME/.config/gamma-prompts \
npx gamma-mcp-server
```

## MCP Client Configuration

When using with Claude Desktop or other MCP clients, configure in their settings file:

**Claude Desktop (`claude_desktop_config.json`):**

```json
{
  "mcpServers": {
    "gamma-presentation": {
      "command": "npx",
      "args": ["-y", "gamma-mcp-server"],
      "env": {
        "GAMMA_API_KEY": "your_api_key_here",
        "GAMMA_PROMPTS_PRIVATE_DIR": "/home/user/my-gamma-prompts",
        "GAMMA_PROMPTS_HOT_RELOAD": "true"
      }
    }
  }
}
```

**Benefits:**
- ✅ No need to clone the repository
- ✅ Always runs latest published version
- ✅ Use custom prompt directories
- ✅ Keep private prompts separate
- ✅ Hot-reload for instant updates

## Troubleshooting

### Prompts Not Loading

```bash
# Check if directories exist
ls -la $GAMMA_PROMPTS_PUBLIC_DIR
ls -la $GAMMA_PROMPTS_PRIVATE_DIR

# Check permissions
# Directories must be readable
chmod 755 $GAMMA_PROMPTS_PRIVATE_DIR
chmod 644 $GAMMA_PROMPTS_PRIVATE_DIR/*.json
```

### Hot-Reload Not Working

1. **Check if enabled:**
   ```bash
   echo $GAMMA_PROMPTS_HOT_RELOAD  # Should be empty or "true"
   ```

2. **Check file system support:**
   - Some network filesystems don't support file watching
   - Docker volumes may need additional configuration

3. **Check server logs:**
   - Look for "Watching for prompt changes in:" messages
   - Check for file watcher errors

### Invalid JSON Errors

```bash
# Validate JSON syntax
cat prompts/private/my-prompt.json | jq .

# Common issues:
# - Missing commas
# - Trailing commas
# - Unquoted keys
# - Incorrect escape sequences
```

## Best Practices

1. **Use .env for local development:**
   - Keep `.env` in `.gitignore`
   - Use `.env.example` as template
   - Document all required variables

2. **Use environment variables for production:**
   - Don't commit `.env` files
   - Use system environment variables
   - Use secrets management for API keys

3. **Organize prompts by purpose:**
   ```
   prompts/private/
   ├── clients/
   │   ├── acme-corp.json
   │   └── techstart.json
   ├── internal/
   │   ├── board-meetings.json
   │   └── all-hands.json
   └── experiments/
       └── test-prompt.json
   ```

4. **Version control your private prompts separately:**
   - Use a private git repository for private prompts
   - Point `GAMMA_PROMPTS_PRIVATE_DIR` to that repo

5. **Test prompts before deployment:**
   - Use hot-reload during development
   - Disable hot-reload in production
   - Validate JSON before committing

## See Also

- [PROMPTS_GUIDE.md](PROMPTS_GUIDE.md) - How to create prompt templates
- [CHANGELOG.md](CHANGELOG.md) - Project changelog and recent changes
- [.env.example](.env.example) - Example environment configuration
