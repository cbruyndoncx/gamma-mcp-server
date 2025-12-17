# Contributing to Gamma MCP Server

Thank you for your interest in contributing! This guide covers the technical setup and development workflow for contributors.

## Prerequisites

- Node.js (v16 or higher)
- npm (Node Package Manager) or yarn
- Git
- TypeScript knowledge
- Familiarity with the Model Context Protocol (MCP)

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/cbruyndoncx/gamma-mcp-server.git
cd gamma-mcp-server
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- `@modelcontextprotocol/sdk` - MCP server framework
- `zod` - Schema validation
- `node-fetch` - HTTP requests
- `dotenv` - Environment variable loading
- `typescript` - TypeScript compiler

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your Gamma API key:

```env
GAMMA_API_KEY=your_actual_gamma_api_key_here
GAMMA_PROMPTS_PUBLIC_DIR=prompts/public
GAMMA_PROMPTS_PRIVATE_DIR=prompts/private
GAMMA_PROMPTS_HOT_RELOAD=true
```

**Important:** Never commit `.env` to version control. It's already in `.gitignore`.

### 4. TypeScript Configuration

The project uses ES Modules. The `tsconfig.json` is already configured:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./build"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

The `package.json` includes `"type": "module"` for ES Module support.

## Project Structure

```
gamma-mcp-server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── constants.ts          # Configuration constants
│   ├── types.ts              # TypeScript interfaces
│   ├── gamma-api.ts          # Gamma API client
│   ├── mcp-tools.ts          # MCP tool definitions
│   ├── mcp-prompts.ts        # Prompt registration
│   └── prompt-loader.ts      # JSON prompt loader with hot-reload
├── prompts/
│   ├── public/               # Public prompt templates (bundled)
│   │   ├── business-pitch-deck.json
│   │   ├── product-launch.json
│   │   └── ... (9 more)
│   └── private/              # Private prompts (git-ignored)
│       └── .gitkeep
├── build/                    # Compiled JavaScript (git-ignored)
├── package.json
├── tsconfig.json
└── .env                      # Local config (git-ignored)
```

### Key Files Explained

**src/index.ts**
- Server initialization and entry point
- Connects MCP server to stdio transport
- Registers tools and prompts

**src/constants.ts**
- API endpoints and configuration
- Environment variable defaults
- Status codes and paths

**src/types.ts**
- TypeScript interfaces for Gamma API
- Type definitions for parameters and responses

**src/gamma-api.ts**
- Pure API client (no MCP dependencies)
- Handles generation requests and polling
- File download functionality

**src/mcp-tools.ts**
- MCP tool definitions
- `generate-presentation` tool
- `get-presentation-assets` tool

**src/prompt-loader.ts**
- Loads prompts from JSON files
- File watching with debouncing
- Hot-reload implementation
- Template variable substitution

## Building the Project

### Compile TypeScript

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `build/` directory and makes `build/index.js` executable.

### Run Locally (Development)

```bash
# Run TypeScript directly without building
npx ts-node src/index.ts
```

### Run Built Version

```bash
# After running npm run build
node build/index.js
```

## Testing with Claude Desktop

### Local Development Testing

1. Build the project:
   ```bash
   npm run build
   ```

2. Configure Claude Desktop to use your local build.

3. Edit `claude_desktop_config.json` (see locations below):

   **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
   **Linux:** `~/.config/Claude/claude_desktop_config.json`

4. Add your local server:

   ```json
   {
     "mcpServers": {
       "gamma-presentation-dev": {
         "command": "node",
         "args": ["build/index.js"],
         "cwd": "/absolute/path/to/your/gamma-mcp-server",
         "env": {
           "GAMMA_API_KEY": "your_gamma_api_key"
         }
       }
     }
   }
   ```

   **Important:**
   - Use absolute path for `cwd`
   - Set `GAMMA_API_KEY` in the `env` section
   - Restart Claude Desktop after changes

### Testing Changes

1. Make changes to source files
2. Run `npm run build`
3. Restart Claude Desktop
4. Test with prompts:
   ```
   Use the business-pitch-deck prompt with company_name "TestCo"
   and industry "Testing"
   ```

## Hot-Reload Development

For prompt development, hot-reload is enabled by default:

```bash
# Run the server
npm run build && node build/index.js

# In another terminal, edit prompts
nano prompts/private/test-prompt.json

# Server automatically reloads - no restart needed!
```

Watch the server output for reload messages:
```
Prompt file changed: test-prompt.json - Reloading...
✓ Reloaded 12 prompt(s)
```

## Creating Prompts

See [PROMPTS_GUIDE.md](PROMPTS_GUIDE.md) for detailed prompt creation instructions.

Quick example:

```json
{
  "name": "my-prompt",
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
```

Place in `prompts/private/` for local testing.

## Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Add JSDoc comments for public functions
- Use descriptive variable names
- Keep functions focused and modular

### Example Function Documentation

```typescript
/**
 * Generate a presentation using the Gamma API
 * @param params - Generation parameters including inputText, format, etc.
 * @returns Generation result with presentation URL
 * @throws Error if API request fails
 */
export async function generatePresentation(
  params: GammaGenerationParams
): Promise<GammaGenerationResult> {
  // Implementation
}
```

## Debugging

### Enable Debug Output

The server logs to stderr (not stdout, which is used for MCP communication):

```typescript
console.error("Debug message");  // Shows in terminal
console.log("MCP message");      // Don't use for debug
```

### Common Issues

**TypeScript Errors:**
```bash
# Check for type errors
npx tsc --noEmit
```

**Module Resolution:**
- Ensure all imports end with `.js` (even for `.ts` files)
- Use `import type` for type-only imports

**Environment Variables:**
```bash
# Verify .env is loaded
console.error("API Key:", process.env.GAMMA_API_KEY ? "Set" : "Missing");
```

## Testing

Currently, testing is manual via Claude Desktop. Future contributions could add:
- Unit tests with Jest or Vitest
- Integration tests for API client
- Prompt validation tests

## Publishing (Maintainers Only)

### Prepare for Release

1. Update version in `package.json`
2. Update [CHANGELOG.md](CHANGELOG.md)
3. Build the project:
   ```bash
   npm run build
   ```

4. Verify `package.json` includes correct files:
   ```json
   "files": [
     "build",
     "prompts/public"
   ]
   ```

### Publish to NPM

```bash
# Test package contents
npm pack

# Publish
npm publish
```

Users can then run:
```bash
npx gamma-mcp-server@latest
```

## Contribution Guidelines

### Pull Request Process

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/my-feature
   ```
3. Make your changes
4. Build and test:
   ```bash
   npm run build
   # Test with Claude Desktop
   ```
5. Commit with clear messages:
   ```bash
   git commit -m "Add feature: description"
   ```
6. Push to your fork:
   ```bash
   git push origin feature/my-feature
   ```
7. Open a Pull Request

### Commit Message Format

```
<type>: <description>

[optional body]
[optional footer]
```

Types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

Examples:
```
feat: Add hot-reload support for prompts
fix: Handle missing API key gracefully
docs: Update CONTRIBUTING.md with setup steps
```

### What to Contribute

**High Priority:**
- Bug fixes
- New public prompts for common use cases
- Improved error handling
- Documentation improvements

**Welcome Contributions:**
- Performance improvements
- Test coverage
- Examples and tutorials
- Tool enhancements

**Discuss First:**
- Major architectural changes
- New dependencies
- Breaking changes

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/cbruyndoncx/gamma-mcp-server/issues)
- **Gamma API:** [API Documentation](https://gamma.app/docs/Gamma-API-Alpha-4jaho6nbvdvpxng)
- **MCP Protocol:** [Model Context Protocol](https://modelcontextprotocol.io)

## Architecture Overview

### MCP Server Flow

```
User Request (Claude Desktop)
    ↓
MCP Protocol (stdio)
    ↓
Server (src/index.ts)
    ↓
Tool/Prompt Router
    ↓
┌─────────────────┬─────────────────┐
│  MCP Tools      │  MCP Prompts    │
│  (mcp-tools.ts) │  (prompt-loader)│
└────────┬────────┴────────┬────────┘
         ↓                 ↓
    Gamma API Client (gamma-api.ts)
         ↓
    Gamma API (api.gamma.app)
         ↓
    Presentation Result
```

### Prompt Loading

```
Startup
    ↓
Load Public Prompts (prompts/public/)
    ↓
Load Private Prompts (prompts/private/)
    ↓
Register with MCP Server
    ↓
┌─ Hot-Reload Enabled? ─┐
│  Yes: Watch directories │
│  No: Static load        │
└────────────────────────┘
```

### Key Design Decisions

1. **Separation of Concerns**
   - API client is independent of MCP
   - Tools and prompts are separate modules
   - Configuration centralized in constants

2. **JSON-Based Prompts**
   - Prompts are data, not code
   - Easy to edit without rebuilding
   - Hot-reload for fast iteration

3. **Private Prompts Override Public**
   - Users can customize any prompt
   - Private prompts take precedence
   - Git-ignored for security

4. **Environment-Driven Configuration**
   - Runtime configuration via env vars
   - Works with NPX and local development
   - Flexible deployment options

## License

See [LICENSE](LICENSE) file in the repository.
