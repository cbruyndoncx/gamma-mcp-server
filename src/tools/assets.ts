/**
 * Generation status and export retrieval.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getPresentationAssets } from "../api/generations.js";
import { textResult } from "./format.js";

export function registerGetPresentationAssetsTool(server: McpServer): void {
  server.tool(
    "get-presentation-assets",
    "Given a generationId, return its status and the single export URL if one was requested (the Gamma API permits only one exportAs per generation), and optionally download it to the MCP server host. Export URLs expire after about a week and are not tied to your API key.",
    {
      generationId: z.string().describe("The generationId returned by a generate tool."),
      download: z
        .boolean()
        .optional()
        .describe("If true, download the export and return the local file path."),
    },
    async ({ generationId, download }) => {
      try {
        const result = await getPresentationAssets(generationId, download);

        return {
          content: [
            {
              type: "resource" as const,
              resource: {
                text: JSON.stringify(result),
                uri: "",
                mimeType: "application/json",
              },
            },
          ],
        };
      } catch (err: any) {
        return textResult(`Error fetching generation: ${err?.message || err}`);
      }
    }
  );
}
