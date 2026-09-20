/**
 * Tool registration.
 *
 * Modules are added here as their phases land - see docs/API_UPDATE_PLAN.md.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGeneratePresentationTool } from "./generation.js";
import {
  registerGenerateExecutivePresentationTool,
  registerGenerateExecutiveReportTool,
} from "./presets.js";
import { registerGetPresentationAssetsTool } from "./assets.js";

export function registerAllTools(server: McpServer): void {
  registerGeneratePresentationTool(server);
  registerGenerateExecutivePresentationTool(server);
  registerGenerateExecutiveReportTool(server);
  registerGetPresentationAssetsTool(server);
}
