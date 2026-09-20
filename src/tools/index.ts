/**
 * Tool registration.
 *
 * Modules are added here as their phases land - see docs/API_UPDATE_PLAN.md.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerGenerateTool,
  registerGenerateMultiPageTool,
  registerGenerateFromTemplateTool,
} from "./generation.js";
import {
  registerGenerateExecutivePresentationTool,
  registerGenerateExecutiveReportTool,
} from "./presets.js";
import {
  registerGetGenerationStatusTool,
  registerDownloadExportTool,
} from "./status.js";

export function registerAllTools(server: McpServer): void {
  // Generation
  registerGenerateTool(server);
  registerGenerateMultiPageTool(server);
  registerGenerateFromTemplateTool(server);

  // Status and exports
  registerGetGenerationStatusTool(server);
  registerDownloadExportTool(server);

  // Presets - this server's own additions, beyond official parity
  registerGenerateExecutivePresentationTool(server);
  registerGenerateExecutiveReportTool(server);
}
