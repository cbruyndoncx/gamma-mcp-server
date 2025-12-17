# Gamma MCP Server

Generate professional presentations using the Gamma API through MCP clients like Claude Desktop. No git clone needed - run directly with `npx`!

## What is Gamma?

[Gamma](https://gamma.app) is an AI-powered platform for creating presentations, documents, and webpages. This MCP server brings Gamma's presentation generation capabilities into Claude Desktop and other MCP clients. Learn more in the [Gamma API docs](https://gamma.app/docs/Gamma-API-Alpha-4jaho6nbvdvpxng).

## Features

✅ **NPX-Ready** - Run anywhere with one command, no git clone required
✅ **11 Public Prompts Included** - Business pitch, product launch, QBR, training, sales, and more
✅ **Private Prompts** - Add your own custom prompts via environment variables
✅ **Hot-Reload** - Edit prompts without restarting the server
✅ **PowerPoint Export** - All prompts export to PPTX for easy editing
✅ **MCP Client Ready** - Works with Claude Desktop out of the box

## Quick Start

### Run with NPX (Recommended)

No installation needed - includes all 11 public prompts automatically:

```bash
GAMMA_API_KEY=your_gamma_api_key npx gamma-mcp-server
```

Get your Gamma API key from the [Gamma API docs](https://gamma.app/docs/Gamma-API-Alpha-4jaho6nbvdvpxng).

### Available Public Prompts

The server includes these professional prompt templates:

1. **business-pitch-deck** - Investor pitch decks with problem, solution, market, team, financials
2. **product-launch** - Product launch presentations with GTM strategy and success metrics
3. **quarterly-business-review** - QBR with key metrics, performance analysis, and priorities
4. **training-workshop** - Educational sessions with learning objectives and exercises
5. **sales-proposal** - Customized proposals with ROI justification and pricing
6. **conference-talk** - Conference presentations with bold visuals and key insights
7. **project-kickoff** - Project alignment with timeline, roles, and risks
8. **executive-briefing** - Concise leadership briefings with recommendations
9. **investor-update** - Periodic investor updates with metrics and milestones
10. **all-hands-meeting** - Company meetings with wins, performance, and recognition
11. **team-retrospective** - Team retrospectives with reflection and action items

All prompts automatically export to PowerPoint (PPTX) with speaker notes.

## Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

**Location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Configuration:**

```json
{
  "mcpServers": {
    "gamma-presentation": {
      "command": "npx",
      "args": ["-y", "gamma-mcp-server"],
      "env": {
        "GAMMA_API_KEY": "your_gamma_api_key_here"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

## Adding Private Prompts

Keep public prompts and add your own custom ones:

```bash
# Create your private prompts directory
mkdir -p ~/.gamma-prompts

# Add a custom prompt (see PROMPTS_GUIDE.md for format)
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

# Run with both public + private prompts
GAMMA_API_KEY=your_key \
GAMMA_PROMPTS_PRIVATE_DIR=~/.gamma-prompts \
npx gamma-mcp-server
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `GAMMA_API_KEY` | - | **Required** - Your Gamma API key |
| `GAMMA_PROMPTS_PUBLIC_DIR` | `prompts/public` | Public prompts location |
| `GAMMA_PROMPTS_PRIVATE_DIR` | `prompts/private` | Private prompts location |
| `GAMMA_PROMPTS_HOT_RELOAD` | `true` | Enable automatic prompt reload |

## Using the Server

Once configured in Claude Desktop, you can generate presentations with natural language:

**Using Prompts:**
```
Use the business-pitch-deck prompt with company_name "TechStartup",
industry "AI SaaS", and stage "Series A"
```

**Using Tools Directly:**
```
Generate a presentation about sustainable energy solutions for college
students with 10 slides
```

The server provides four MCP tools:
- `generate-presentation` - Generate presentations with full customization
- `generate-executive-presentation` - Quick executive presentations with professional defaults (condense text, brief amount, professional tone, photorealistic images, PPTX export)
- `generate-executive-report` - Detailed A4 PDF reports with professional defaults (preserve text, detailed amount, professional tone, photorealistic images, A4 format, PDF export)
- `get-presentation-assets` - Fetch PDF/PPTX downloads

## Documentation

For detailed information, see:

- **[NPX_USAGE.md](NPX_USAGE.md)** - Complete NPX usage guide and FAQs
- **[CONFIGURATION.md](CONFIGURATION.md)** - All configuration options and examples
- **[PROMPTS_GUIDE.md](PROMPTS_GUIDE.md)** - How to create custom prompt templates
- **[CHANGELOG.md](CHANGELOG.md)** - Recent changes and architecture

## Support

- **Issues:** [GitHub Issues](https://github.com/cbruyndoncx/gamma-mcp-server/issues)
- **Gamma API:** [Gamma API Documentation](https://gamma.app/docs/Gamma-API-Alpha-4jaho6nbvdvpxng)
- **MCP Protocol:** [Model Context Protocol](https://modelcontextprotocol.io)

## License

See [LICENSE](LICENSE) file in the repository.
