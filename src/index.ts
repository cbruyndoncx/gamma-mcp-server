#!/usr/bin/env node

/**
 * Gamma MCP Server
 * Main entry point for the MCP server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./mcp-tools.js";
import { registerAllPrompts } from "./mcp-prompts.js";

/**
 * Create and configure the MCP server
 */
async function createServer(): Promise<McpServer> {
  const server = new McpServer({
    name: "gamma-presentation",
    version: "1.0.0",
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  });

  // Register all tools and prompts
  registerAllTools(server);
  await registerAllPrompts(server);

  return server;
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gamma MCP Server running on stdio");
}

// Start the server
main().catch((error) => {
  console.error(error);
  process.exit(1);
});
