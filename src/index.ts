import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const GAMMA_API_URL = "https://public-api.gamma.app/v1.0/generations";
const GAMMA_API_KEY = process.env.GAMMA_API_KEY;

// Helper function for making Gamma API requests
async function generatePresentation(
  params: Record<string, any>
): Promise<{ url: string | null; error: string | null }> {
  try {
    // Build request body with supported fields (pass-through but allow exportAs)
    const body: Record<string, any> = { ...params };
    if (params.exportAs) body.exportAs = params.exportAs; // "pdf" or "pptx"

    // Initial create request
    const response = await fetch(GAMMA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-KEY": GAMMA_API_KEY || "",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`
      );
    }

    const data: any = await response.json();

    // If API returned a direct URL, return it
    if (data.url) return { url: data.url, error: null };

    // Otherwise expect a generation id and poll for completion
    const genId = data.id || data.generation_id || data.generationId;
    if (!genId) {
      return { url: null, error: `Unexpected response shape: ${JSON.stringify(data)}` };
    }

    const statusUrl = `${GAMMA_API_URL}/${genId}`;
    const timeoutMs = 60_000; // 60s total timeout
    const intervalMs = 1500; // poll every 1.5s
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const stResp = await fetch(statusUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${GAMMA_API_KEY || ""}`,
        },
      });

      if (!stResp.ok) {
        const errText = await stResp.text();
        throw new Error(
          `Status poll error! status: ${stResp.status}, body: ${errText}`
        );
      }

      const stData: any = await stResp.json();
      const status = (stData.status || stData.state || "").toString().toLowerCase();

      if (status === "completed" || status === "succeeded") {
        // Try common locations for a resulting URL
        const possible = stData.url || stData.export_url || stData.output_url || stData.outputUrl || stData.resultUrl || stData.result_url;
        if (possible) return { url: possible, error: null };
        // Boards/Generations sometimes contain outputs array
        const arrUrl = stData.outputs?.[0]?.url || stData.exports?.[0]?.url || stData.artifacts?.[0]?.url;
        if (arrUrl) return { url: arrUrl, error: null };
        // If completed but no URL found, return full JSON for debugging
        return { url: null, error: `Generation completed but no export URL found: ${JSON.stringify(stData)}` };
      }

      if (status === "failed" || status === "error") {
        return { url: null, error: `Generation failed: ${JSON.stringify(stData)}` };
      }

      // wait then poll again
      await new Promise((r) => setTimeout(r, intervalMs));
    }

    return { url: null, error: `Timed out waiting for generation ${genId}` };
  } catch (error: any) {
    console.error("Error making Gamma API request:", error);
    return { url: null, error: error.message || String(error) };
  }
}

// Create server instance
const server = new McpServer({
  name: "gamma-presentation",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register Gamma generation tool
server.tool(
  "generate-presentation",
  "Generate a presentation using the Gamma API. The response will include a link to the generated presentation in the 'text' field. Always include the link in the response when it's available. Do your best to show a preview or a link preview or some sense of the content to the user in the response.",
  {
    inputText: z.string().describe("The topic or prompt for the presentation."),
    tone: z
      .string()
      .optional()
      .describe(
        "The tone of the presentation (e.g. 'humorous and sarcastic')."
      ),
    audience: z
      .string()
      .optional()
      .describe("The intended audience (e.g. 'students')."),
    textAmount: z
      .enum(["short", "medium", "long"])
      .optional()
      .describe("How much text to generate."),
    textMode: z
      .enum(["generate", "summarize"])
      .optional()
      .describe("Text mode for Gamma API."),
    numCards: z
      .number()
      .min(1)
      .max(20)
      .optional()
      .describe("Number of slides/cards to generate."),
    imageModel: z
      .string()
      .optional()
      .describe("Image model to use (e.g. 'dall-e-3')."),
    imageStyle: z
      .string()
      .optional()
      .describe("Image style (e.g. 'line drawings')."),
    editorMode: z
      .string()
      .optional()
      .describe("Editor mode (e.g. 'freeform')."),
    additionalInstructions: z
      .string()
      .optional()
      .describe("Any extra instructions for Gamma."),
  },
  async (params) => {
    const { url, error } = await generatePresentation(params);
    if (!url) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to generate presentation using Gamma API. Error: ${
              error || "Unknown error."
            }`,
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gamma MCP Server running on stdio");

  // logt the  api key
  console.log("Gamma API Key:", GAMMA_API_KEY);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
