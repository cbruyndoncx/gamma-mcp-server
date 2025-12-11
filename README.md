# Gamma MCP Server

This document guides you through setting up and running the Gamma MCP (Model Context Protocol) server, which allows you to generate presentations using the Gamma API directly from MCP clients like Anthropic's Claude for Desktop.

## What is Gamma?

[Gamma](https://gamma.app) is an AI-powered platform designed to help users create various types of content, with a strong focus on presentations. It leverages artificial intelligence to automatically generate slides, suggest text, and incorporate imagery, allowing for rapid development of polished presentations from simple prompts or existing documents. This MCP server specifically interacts with Gamma's API to bring this presentation generation capability into environments like Claude for Desktop. Check out the [Gamma API docs](https://gamma.app/docs/Gamma-API-Alpha-4jaho6nbvdvpxng) to learn more.

## What We'll Be Building

This server exposes a tool to an MCP client (like Claude for Desktop) that can take a prompt and various parameters to generate a presentation using the Gamma API. The server will return a link to the generated presentation.

## Core MCP Concepts

Model Context Protocol servers can provide three main types of capabilities:

- **Resources**: File-like data that can be read by clients (like API responses or file contents).
- **Tools**: Functions that can be called by the LLM (with user approval).
- **Prompts**: Pre-written templates that help users accomplish specific tasks.

This server provides both **Tools** and **Prompts** for comprehensive presentation generation.

## Prerequisite Knowledge

This quickstart assumes you have familiarity with:

- Node.js and TypeScript.
- LLMs like Anthropic's Claude.
- Basic command-line usage.

## System Requirements

- Node.js (v16 or higher recommended).
- npm (Node Package Manager) or yarn.
- Access to the Gamma API. You'll need an API key, don't have one? Check out the [Gamma API docs](#) to get one.

## Set Up Your Environment

1.  **Clone the Repository / Get the Code:**
    If this project is in a Git repository, clone it:

    ```bash
    git clone git@github.com:gamma-app/gamma-mcp-server.git
    cd gamma-mcp-server
    ```
    
2.  **Initialize Your Node.js Project (if not cloned):**
    If you created a new directory, initialize a `package.json` file:

    ```bash
    npm init -y
    ```

3.  **Install Dependencies:**
    You'll need the MCP SDK, Zod for validation, node-fetch for API calls, TypeScript, and ts-node to run TypeScript directly.

    ```bash
    npm install @modelcontextprotocol/sdk zod node-fetch typescript ts-node @types/node
    # or
    # yarn add @modelcontextprotocol/sdk zod node-fetch typescript ts-node @types/node
    ```

4.  **Configure TypeScript:** 
You might want to adjust the `tsconfig.json` to suit your preferences, but the default should work. Ensure `moduleResolution` is set to `"node"` or `"node16"` / `"nodenext"` and `module` is compatible (e.g. `"commonjs"` if running with `ts-node` in a CommonJS context, or adjust for ES Modules). The provided `src/index.ts` uses ES module syntax (`import ... from`).
    A common `tsconfig.json` for ES Modules with Node.js might include:

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
        "outDir": "./dist" // Optional: if you plan to compile
      },
      "include": ["src/**/*"],
      "exclude": ["node_modules"]
    }
    ```

    Also, in your `package.json`, add `"type": "module"` if you are using ES Modules.

5.  **API Key Configuration:**
    The server requires your Gamma API key. We use the `dotenv` package to load this key from a `.env` file in the project root.

    1.  Create a file named `.env` in the root of your project (e.g., alongside your `package.json`).
    2.  Add your Gamma API key to this file like so:
        ```
        GAMMA_API_KEY="your_actual_gamma_api_key_here"
        ```
        Replace `"your_actual_gamma_api_key_here"` with your actual key.

        **IMPORTANT:** The `.env` file is included in the project's `.gitignore` file, so it **WILL NOT** be committed to your Git repository. This is crucial for keeping your API key secret. Do not remove `.env` from `.gitignore` or commit your API key directly into your codebase.

    If the `GAMMA_API_KEY` is not found in the environment (e.g., if the `.env` file is missing or the key isn't set), the server will log a fatal error and exit upon starting.

## Understanding the Server Code (`src/index.ts`)

Let's break down the key parts of the `src/index.ts` file:

1.  **Imports:**

    ```typescript
    import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
    import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
    import { z } from "zod";
    import fetch from "node-fetch";
    ```

    These lines import the necessary MCP server classes, Zod for schema definition and validation, and `node-fetch` for making HTTP requests.

2.  **Gamma API Configuration:**

    ```typescript
    const GAMMA_API_URL = "https://api.gamma.app/public-api/v0.1/generate";
    const GAMMA_API_KEY = "YOUR_GAMMA_API_KEY_HERE"; // Replace or use env var
    ```

    This sets up the base URL for the Gamma API and the API key.

3.  **`generatePresentation` Helper Function:**
    This `async` function is responsible for making the POST request to the Gamma API with the provided parameters and handling the response or errors.

4.  **MCP Server Instance:**

    ```typescript
    const server = new McpServer({
      name: "gamma-presentation",
      version: "1.0.0",
      capabilities: {
        resources: {},
        tools: {},
      },
    });
    ```

    This initializes a new MCP server with a name and version.

5.  **Tool Definition (`server.tool`):**

    ```typescript
    server.tool(
      "generate-presentation",
      "Generate a presentation using the Gamma API...",
      {
        /* Zod schema for parameters */
      },
      async (params) => {
        /* Tool execution logic */
      }
    );
    ```

    This is the core of the MCP server.

    - `"generate-presentation"`: The name of the tool that clients will call.
    - `"Generate a presentation..."`: A description of what the tool does. This is important for the LLM to understand how and when to use the tool.
    - **Schema (`zod` object):** Defines the input parameters the tool expects (e.g., `inputText`, `tone`, `audience`). `zod` is used to describe the type, whether it's optional, and provide a description for each parameter.
      - `inputText`: The main topic or prompt.
      - `tone`: Optional, e.g., 'humorous and sarcastic'.
      - `audience`: Optional, e.g., 'students'.
      - `textAmount`: Optional, 'short', 'medium', or 'long'.
      - `textMode`: Optional, 'generate' or 'summarize'.
      - `numCards`: Optional, number of slides (1-20).
      - And others like `imageModel`, `imageStyle`, `editorMode`, `additionalInstructions`.
    - **Handler Function (`async (params) => { ... }`):** This function is executed when the tool is called. It receives the parameters, calls `generatePresentation`, and formats the response (a link to the presentation or an error message).

6.  **`main` Function:**

    ```typescript
    async function main() {
      const transport = new StdioServerTransport();
      await server.connect(transport);
      console.error("Gamma MCP Server running on stdio");
    }

    main().catch(/* ... */);
    ```

    This function sets up the server to communicate over standard input/output (stdio) and starts it.

## Gamma generate-presentation: Exact Parameters

This MCP server exposes a Gamma presentation generator tool. Below are the exact parameters accepted by the generator (these mirror the Zod schema used by the tool). Use these parameters when calling the tool from an MCP client.

- inputText (string) — REQUIRED
  - Description: The main prompt, topic, or instructions for the presentation. Include goal, audience, and structure for best results.
  - Example: "Quarterly marketing review: results, insights, next priorities."

- numCards (number) — optional, integer (min: 1, max: 20)
  - Description: Number of slides/cards to generate.
  - Example: 8

- textAmount (string) — optional; allowed values: "short" | "medium" | "long"
  - Description: Controls the verbosity of slide copy.
  - Example: "medium"

- textMode (string) — optional; allowed values: "generate" | "summarize"
  - Description: "generate" to produce new slide text; "summarize" to condense provided input text into slides.
  - Example: "generate"

- audience (string) — optional
  - Description: Target audience (e.g., "executive leadership", "students").
  - Example: "VPs and directors"

- tone (string) — optional
  - Description: Tone/style of writing (e.g., "professional", "casual", "humorous").
  - Example: "concise and professional"

- imageStyle (string) — optional
  - Description: Desired image style (free-text). Examples: "photo-realistic", "line drawings", "flat icons".
  - Example: "photo-realistic"

- imageModel (string) — optional
  - Description: Image generation model choice (if applicable). Free-text (e.g., "dall-e-3").
  - Example: "dall-e-3"

- editorMode (string) — optional
  - Description: Editor mode hint (e.g., "freeform").
  - Example: "freeform"

- additionalInstructions (string) — optional
  - Description: Any extra directions: slide order, branding, speaker notes, data/CSV usage, template specifics.
  - Example: "Include title slide, agenda, KPIs with charts, top 3 wins, challenges, and a 3-point action plan. Add speaker notes."

Notes and constraints

- Max slides per request: typically 20 (numCards). If you need more, generate multiple decks or iterate.
- Keep inputText focused: include goal, audience, structure, and whether you want speaker notes.
- textAmount controls verbosity — use "short" for visual-heavy decks.
- imageStyle and imageModel are free-form strings; include examples if you require a specific look.

Example JSON payload (generate)

```json
{
  "inputText": "Investor update: product milestones, ARR growth, top 3 risks and mitigations, asks",
  "numCards": 8,
  "textAmount": "medium",
  "textMode": "generate",
  "audience": "investors",
  "tone": "concise and professional",
  "imageStyle": "photo-realistic",
  "editorMode": "freeform",
  "additionalInstructions": "Include title slide, agenda, 3 data slides, roadmap, asks. Add short speaker notes for each slide."
}
```

## Retrieving Assets: gamma__get-presentation-assets Parameters

After you generate a presentation, the generator returns a generationId and usually a viewing link. Use the generationId to fetch downloadable assets (PDF/PPTX).

- generationId (string) — REQUIRED
  - Description: The generationId returned by the generate call.
  - Example: "abc123def456"

- download (boolean) — optional
  - Description: If true, the integration will attempt to download PDF/PPTX assets to the server and return local file paths. If false or omitted, the API typically returns URLs for the assets.
  - Example: true

Example call to fetch assets

```json
{
  "generationId": "abc123def456",
  "download": true
}
```

## Running Your Server

1.  **Set the `GAMMA_API_KEY` Environment Variable:**
    Before running the server, ensure you have set the `GAMMA_API_KEY` environment variable as described in the "API Key Configuration" section above.

2.  **Start the Server:**
    With the environment variable set, you can run the server using `ts-node`:
    ```bash
    npx ts-node src/index.ts
    ```
    Alternatively, you can add a script to your `package.json`:
    ```json
    // package.json
    "scripts": {
      "start": "ts-node src/index.ts",
      // if you compile to JS first:
      // "build": "tsc",
      // "start:prod": "node dist/index.js"
    },
    ```
    Then run:
    ```bash
    npm start
    # or
    # yarn start
    ```
    If successful, you should see:
    ```
    Gamma MCP Server running on stdio
    ```
    The server is now running and waiting for an MCP client to connect via stdio.

## Testing Your Server with Claude for Desktop

To use this server with Claude for Desktop, you need to configure Claude for Desktop to know how to launch your server.

1.  **Install Claude for Desktop:**
    Make sure you have Claude for Desktop installed. You can get it from the official source. Ensure it's updated to the latest version.

2.  **Locate Claude for Desktop Configuration File:**
    The configuration file is typically located at:

    - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
    - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json` (e.g., `C:\Users\<YourUser>\AppData\Roaming\Claude\claude_desktop_config.json`)
    - **Linux:** `~/.config/Claude/claude_desktop_config.json`

    If the file or directories don't exist, create them.

3.  **Configure Your Server in `claude_desktop_config.json`:**
    Open `claude_desktop_config.json` in a text editor. Add your Gamma server to the `mcpServers` object.

    **Important:** You need the **absolute path** to your project directory and to `ts-node` (or `node` if you compile to JS).

    - **Finding absolute path to your project:** Navigate to your `gamma-mcp-server` directory in the terminal and run `pwd` (macOS/Linux) or `cd` (Windows, then copy the path).
    - **Finding absolute path to `npx` or `ts-node`:**
      - For `npx`: Run `which npx` (macOS/Linux) or `where npx` (Windows).
      - Often, `npx` is used, which then finds `ts-node` in your project's `node_modules/.bin` or globally. If Claude has trouble with `npx`, you might need to provide the direct path to `ts-node`.
      - A more robust way for the `command` might be to use the absolute path to your Node.js executable, and then specify `ts-node` and `src/index.ts` as arguments, ensuring the `cwd` (Current Working Directory) is set correctly.

    Here's an example configuration. **You MUST replace `/ABSOLUTE/PATH/TO/YOUR/gamma-mcp-server` with the actual absolute path.**

    You will also need to ensure that the `GAMMA_API_KEY` environment variable is available to the process launched by Claude for Desktop. How to do this depends on your OS and how Claude for Desktop launches processes. Some common methods include:

    - Setting the environment variable globally on your system.
    - If Claude for Desktop is launched from a terminal where `GAMMA_API_KEY` is already exported, it might inherit it.
    - Modifying the `command` or `args` in `claude_desktop_config.json` to explicitly pass the environment variable if your shell/Node.js setup allows (e.g., `"command": "env", "args": ["GAMMA_API_KEY=your_key", "npx", "ts-node", ...]` - this can be tricky and OS-dependent).
    - Using a wrapper script as the `command` that first sets the environment variable and then executes `npx ts-node src/index.ts`.

    A simple way for testing is often to ensure `GAMMA_API_KEY` is set in your user's global shell environment (e.g., in `~/.bashrc`, `~/.zshrc`, or system-wide environment variables on Windows) before launching Claude for Desktop.

    ```json
    {
      "mcpServers": {
        "gamma-presentation-generator": {
          "command": "npx", // Or absolute path to npx, or node
          "args": [
            "ts-node", // If command is 'npx'
            // If command is absolute path to node:
            // "/PATH/TO/gamma-mcp-server/node_modules/ts-node/dist/bin.js",
            "src/index.ts"
          ],
          "cwd": "/ABSOLUTE/PATH/TO/YOUR/gamma-mcp-server" // Current Working Directory for the server
        }
      }
    }
    ```

    **Explanation:**

    - `"gamma-presentation-generator"`: This is the name you give to your server configuration within Claude. It can be anything descriptive.
    - `"command"`: The executable to run. `npx` is convenient as it resolves `ts-node` from your project. If this causes issues, use the absolute path to your Node.js executable.
    - `"args"`: Arguments passed to the command.
      - If `command` is `npx`, the first arg is `ts-node`, followed by the path to your main server file (`src/index.ts`), relative to the `cwd`.
      - If `command` is an absolute path to `node`, args would be `["/ABSOLUTE/PATH/TO/YOUR/gamma-mcp-server/node_modules/ts-node/dist/bin.js", "src/index.ts"]` or similar, making sure `ts-node`'s entry script is correctly referenced.
    - `"cwd"`: **Crucially**, set this to the absolute path of your project's root directory (`gamma-mcp-server`). This ensures that `ts-node` can find `src/index.ts` and `node_modules`.

4.  **Save and Restart Claude for Desktop:**
    Save the `claude_desktop_config.json` file and completely restart Claude for Desktop.

5.  **Test with Commands:**
    Once Claude for Desktop restarts, it should attempt to connect to your server.

    - Look for the tool icon (often a hammer знают) in the Claude for Desktop interface. Clicking it should show your `generate-presentation` tool.
    - Try prompting Claude:
      - "Generate a presentation about the future of artificial intelligence."
      - "Make a presentation on sustainable energy sources, targeting college students, make it medium length."
      - "Use the gamma tool to create a short, humorous presentation for developers about the importance of documentation."

    Claude should recognize the request, identify your tool, and (after your approval if configured) execute it. Your server (running in its own terminal or process) will then call the Gamma API, and the link to the presentation should appear in Claude's response.

## What's Happening Under the Hood

When you ask a question in Claude for Desktop:

1.  The client (Claude for Desktop) sends your question to the Claude LLM.
2.  Claude analyzes the available tools (including your `generate-presentation` tool) and decides if and how to use it.
3.  If Claude decides to use your tool, it sends a request to Claude for Desktop.
4.  Claude for Desktop executes the chosen tool by communicating with your MCP server (which it launched based on `claude_desktop_config.json`) over stdio.
5.  Your server runs the tool logic (calls the Gamma API).
6.  The results (presentation URL or error) are sent back from your server to Claude for Desktop, then to the LLM.
7.  Claude formulates a natural language response incorporating the tool's output.
8.  The response is displayed to you!

## Troubleshooting

- **Server Not Detected by Claude for Desktop:**
  - Double-check the absolute paths in `claude_desktop_config.json` for `cwd` and potentially `command`.
  - Ensure your server name in the config (`gamma-presentation-generator` in the example) is unique.
  - Verify that `claude_desktop_config.json` is correctly formatted JSON.
  - Make sure your server runs correctly on its own using `npx ts-node src/index.ts` before trying to integrate with Claude. Check for any errors in the server's console output.
  - Ensure there are no firewalls or security software blocking `npx` or `node` from executing or communicating.
- **Errors from the Server:**
  - Check the console output of your `gamma-mcp-server` (the terminal where you ran `npx ts-node src/index.ts`). It might show errors from the Gamma API or within the server logic.
  - Ensure your `GAMMA_API_KEY` is correct and has not expired.
  - Verify network connectivity.
- **Claude Doesn't Use the Tool:**
  - Make sure the tool description in `src/index.ts` (`server.tool(...)`) is clear and accurately describes what the tool does and its parameters. This helps the LLM decide when to use it.
  - Ensure the parameter descriptions in the Zod schema are also clear.
- **`ts-node` or Module Issues:**
  - Ensure `typescript` and `ts-node` are installed locally in your project (`npm ls ts-node typescript`).
  - Check your `tsconfig.json` for compatibility with your Node.js version and module system (ESM vs CommonJS). If using ESM (`"type": "module"` in `package.json`), ensure `ts-node` is compatible or use `ts-node-esm`. The provided `index.ts` uses ES module imports.

## Using Prompts for Quick Presentation Generation

This MCP server includes 10 pre-built prompts that make it easy to generate common types of presentations. Each prompt is optimized with the right parameters and structure for its specific use case.

### Available Prompts

All prompts automatically export to PowerPoint (PPTX) format for easy editing and sharing.

#### 1. business-pitch-deck
Generate a professional investor pitch deck with all the essential slides.

**Required Parameters:**
- `company_name`: Name of your company or product
- `industry`: Industry or sector (e.g., 'fintech', 'healthcare AI', 'e-commerce')

**Optional Parameters:**
- `stage`: Company stage (e.g., 'seed', 'Series A', 'growth')

**Example Usage:**
```
Use the business-pitch-deck prompt with company_name "AcmeTech", industry "SaaS fintech", and stage "Series A"
```

**What You Get:** 12 slides including problem, solution, market opportunity, business model, traction, competitive landscape, team, financials, and ask.

---

#### 2. product-launch
Generate a product launch presentation for internal teams.

**Required Parameters:**
- `product_name`: Name of the product being launched
- `target_audience`: Target customer segment (e.g., 'small businesses', 'enterprise IT teams')

**Optional Parameters:**
- `launch_date`: Expected or actual launch date

**Example Usage:**
```
Use the product-launch prompt with product_name "CloudSync Pro", target_audience "enterprise IT teams", and launch_date "Q1 2025"
```

**What You Get:** 14 slides including market context, product overview, value proposition, pricing, GTM strategy, marketing campaign, and success metrics.

---

#### 3. quarterly-business-review
Generate a QBR presentation with metrics and insights.

**Required Parameters:**
- `quarter`: Quarter and year (e.g., 'Q3 2024')

**Optional Parameters:**
- `department`: Department or business unit (e.g., 'Sales', 'Engineering', 'Company-wide')

**Example Usage:**
```
Use the quarterly-business-review prompt with quarter "Q4 2024" and department "Sales"
```

**What You Get:** 13 slides including executive summary, key metrics, highlights, performance vs. targets, financials, challenges, and next quarter priorities.

---

#### 4. training-workshop
Generate an educational training or workshop presentation.

**Required Parameters:**
- `topic`: Training topic or workshop title

**Optional Parameters:**
- `duration`: Workshop duration (e.g., '2 hours', 'half-day', 'full-day')
- `skill_level`: Audience skill level (e.g., 'beginner', 'intermediate', 'advanced')

**Example Usage:**
```
Use the training-workshop prompt with topic "Data Analytics with Python", duration "4 hours", and skill_level "intermediate"
```

**What You Get:** 14 slides including learning objectives, core concepts with examples, hands-on exercises, best practices, case studies, and resources.

---

#### 5. sales-proposal
Generate a customized sales proposal for prospects.

**Required Parameters:**
- `prospect_name`: Name of the prospect company
- `solution`: Your product or solution being proposed

**Optional Parameters:**
- `budget_range`: Budget range or deal size (e.g., '$50K-$100K', 'enterprise tier')

**Example Usage:**
```
Use the sales-proposal prompt with prospect_name "Global Manufacturing Inc", solution "Enterprise CRM Platform", and budget_range "$200K-$300K annually"
```

**What You Get:** 13 slides including understanding their challenges, proposed solution, implementation roadmap, case studies, ROI justification, pricing, and next steps.

---

#### 6. conference-talk
Generate a conference or keynote presentation.

**Required Parameters:**
- `talk_title`: Title of your talk or presentation

**Optional Parameters:**
- `conference`: Conference name or event
- `talk_length`: Presentation length (e.g., '20 minutes', '45 minutes', '1 hour')

**Example Usage:**
```
Use the conference-talk prompt with talk_title "The Future of Edge Computing", conference "TechCon 2025", and talk_length "45 minutes"
```

**What You Get:** 14 slides with minimal text per slide, bold visuals, hook, key insights, real-world examples, and call to action. Designed for stage presentation.

---

#### 7. project-kickoff
Generate a project kickoff presentation for team alignment.

**Required Parameters:**
- `project_name`: Name of the project

**Optional Parameters:**
- `project_duration`: Expected project duration (e.g., '3 months', '6 weeks', 'Q1 2025')

**Example Usage:**
```
Use the project-kickoff prompt with project_name "Mobile App Redesign" and project_duration "4 months"
```

**What You Get:** 14 slides including vision, objectives, scope, team roles (RACI), timeline, budget, risks, communication plan, and first sprint priorities.

---

#### 8. executive-briefing
Generate a concise executive briefing for leadership.

**Required Parameters:**
- `topic`: Topic or issue being briefed (e.g., 'Market expansion strategy', 'Security incident')

**Optional Parameters:**
- `urgency`: Urgency level (e.g., 'routine', 'important', 'urgent')

**Example Usage:**
```
Use the executive-briefing prompt with topic "Cybersecurity Incident Response" and urgency "urgent"
```

**What You Get:** 11 concise slides with executive summary, situation overview, impact analysis, options, recommendations, risk assessment, and decision points.

---

#### 9. investor-update
Generate periodic investor update presentations.

**Required Parameters:**
- `period`: Update period (e.g., 'Q2 2024', 'Monthly - June', 'Annual 2024')

**Optional Parameters:**
- `company_name`: Company name

**Example Usage:**
```
Use the investor-update prompt with period "Q3 2024" and company_name "StartupCo"
```

**What You Get:** 13 slides including financial performance, key metrics, product developments, customer traction, milestones, challenges, outlook, and asks.

---

#### 10. all-hands-meeting
Generate an engaging all-hands company meeting presentation.

**Required Parameters:**
- `date`: Meeting date or period (e.g., 'December 2024', 'End of Year')

**Optional Parameters:**
- `company_size`: Approximate company size (e.g., 'startup 20 people', 'mid-size 200', 'enterprise')

**Example Usage:**
```
Use the all-hands-meeting prompt with date "December 2024" and company_size "startup 50 people"
```

**What You Get:** 14 slides including vision, wins, business performance, product updates, customer stories, team growth, values in action, and recognition.

---

### Prompt Features

All prompts include:
- **Automatic PPT Export**: Every prompt is configured with `exportAs: pptx` for immediate PowerPoint download
- **Speaker Notes**: Detailed notes for presenters with talking points and facilitation tips
- **Optimized Structure**: Pre-designed slide sequences for each presentation type
- **Contextual Parameters**: Each prompt uses the right `tone`, `audience`, and `imageStyle` for its purpose
- **Professional Formatting**: Appropriate text amounts and visual styles for the use case

### Advanced Tool Usage

For complete control, you can use the `generate-presentation` tool directly with custom parameters:

**All Available Parameters:**

```javascript
{
  // Required
  inputText: "Your presentation topic and instructions",

  // Format and export
  format: "presentation" | "document" | "social" | "webpage",
  exportAs: "pdf" | "pptx",  // Request direct export

  // Content control
  numCards: 1-75,  // Number of slides
  textMode: "generate" | "condense" | "preserve",

  // Text options (legacy - simple)
  textAmount: "short" | "medium" | "long",

  // Text options (new - detailed)
  textOptions: {
    amount: "brief" | "medium" | "detailed" | "extensive",
    tone: "professional and confident",
    audience: "investors and venture capitalists",
    language: "en"
  },

  // Image options
  imageOptions: {
    source: "ai-generated" | "stock" | "none",
    model: "dall-e-3",
    style: "photo-realistic and professional"
  },

  // Additional customization
  additionalInstructions: "Include speaker notes, add charts...",
  themeId: "specific-theme-id",
  folderIds: ["folder-id-1"],
  cardSplit: "auto"
}
```

**Example Custom Usage:**
```
Use generate-presentation with:
- inputText: "Create a 10-slide presentation about sustainable energy solutions for college students"
- numCards: 10
- textOptions: { amount: "medium", tone: "educational and inspiring", audience: "college students" }
- imageOptions: { style: "modern illustrations", model: "dall-e-3" }
- exportAs: "pptx"
- additionalInstructions: "Include data visualizations for renewable energy growth. Add discussion questions on each slide."
```

### Retrieving Downloads

After generation, use the `get-presentation-assets` tool to fetch PDF/PPTX downloads:

```
Use get-presentation-assets with generationId "abc123" and download true
```

This returns local file paths to the downloaded assets.

---

This guide should provide a comprehensive overview of setting up and using your Gamma MCP server. Happy presenting!
