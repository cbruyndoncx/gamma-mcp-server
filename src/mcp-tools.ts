/**
 * MCP Tools for Gamma Presentation Generation
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { generatePresentation, getPresentationAssets } from "./gamma-api.js";
import type { GammaGenerationParams } from "./types.js";

/**
 * Register the generate-presentation tool
 */
export function registerGeneratePresentationTool(server: McpServer): void {
  server.tool(
    "generate-presentation",
    "Generate a presentation using the Gamma API. The response will include a link to the generated presentation when available.",
    {
      inputText: z.string().describe("The topic or prompt for the presentation."),
      textMode: z
        .enum(["generate", "condense", "preserve"])
        .optional()
        .describe("Text mode for Gamma API (generate | condense | preserve)."),
      format: z
        .string()
        .optional()
        .describe("Format to create (presentation | document | social | webpage)."),
      numCards: z
        .number()
        .min(1)
        .max(75)
        .optional()
        .describe("Number of slides/cards to generate."),
      exportAs: z
        .string()
        .optional()
        .describe("If set, request a direct export: 'pdf' or 'pptx'."),
      textAmount: z
        .enum(["short", "medium", "long"])
        .optional()
        .describe("Legacy shorthand for text amount (kept for backward compatibility)."),
      textOptions: z
        .object({
          amount: z.enum(["brief", "medium", "detailed", "extensive"]).optional(),
          tone: z.string().optional(),
          audience: z.string().optional(),
          language: z.string().optional(),
        })
        .optional(),
      imageOptions: z
        .object({
          source: z.string().optional(),
          model: z.string().optional(),
          style: z.string().optional(),
        })
        .optional(),
      additionalInstructions: z.string().optional(),
      folderIds: z.array(z.string()).optional(),
      cardSplit: z.string().optional(),
      themeId: z.string().optional(),
    },
    async (params) => {
      // Normalize textMode
      const normalizedParams = {
        ...params,
        textMode: params.textMode || "generate",
      } as GammaGenerationParams;

      const { url, generationId, error } = await generatePresentation(normalizedParams);

      if (!url) {
        // If we have a generationId but no URL, inform the user to use get-presentation-assets
        if (generationId) {
          return {
            content: [
              {
                type: "text",
                text: `Generation created (id=${generationId}). No final URL available yet. Use the get-presentation-assets tool with generationId to fetch exports. Polling error / status: ${error || "unknown"}`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `Failed to generate presentation using Gamma API. Error: ${error || "Unknown error."}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Presentation generated! View it here: ${url}`,
          },
        ],
      };
    }
  );
}

/**
 * Register the get-presentation-assets tool
 */
export function registerGetPresentationAssetsTool(server: McpServer): void {
  server.tool(
    "get-presentation-assets",
    "Given a generationId return downloadable URLs for pdf and pptx if available, and optionally download them into the MCP server and return local paths.",
    {
      generationId: z.string().describe("The generationId returned by the Gamma generate API."),
      download: z
        .boolean()
        .optional()
        .describe("If true, download the assets and return local file paths."),
    },
    async (params) => {
      const { generationId, download } = params as { generationId: string; download?: boolean };

      try {
        const result = await getPresentationAssets(generationId, download);

        const content: any[] = [];
        const resourceObj: any = { generationId: result.generationId };

        if (result.pdf) resourceObj.pdf = result.pdf;
        if (result.pptx) resourceObj.pptx = result.pptx;
        if (download && result.downloads) resourceObj.downloads = result.downloads;

        content.push({
          type: "resource",
          resource: {
            text: JSON.stringify(resourceObj),
            uri: "",
            mimeType: "application/json",
          },
        });

        return { content };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching generation: ${err.message || err}`,
            },
          ],
        };
      }
    }
  );
}

/**
 * Register all MCP tools
 */
export function registerAllTools(server: McpServer): void {
  registerGeneratePresentationTool(server);
  registerGetPresentationAssetsTool(server);
}
