import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Added tool: get-presentation-assets
// Usage: call tool "get-presentation-assets" with { generationId: string }


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
    /* suppressed to avoid writing to stdio */
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
}

main().catch((error) => {
  process.exit(1);
});

// Tool: get-presentation-assets
server.tool(
  "get-presentation-assets",
  "Given a generationId return downloadable URLs for pdf and pptx if available, and optionally download them into the MCP server and return local paths.",
  {
    generationId: z.string().describe("The generationId returned by the Gamma generate API."),
    download: z.boolean().optional().describe("If true, download the assets and return local file paths."),
  },
  async (params) => {
    const { generationId, download } = params as any;
    const statusUrl = `https://public-api.gamma.app/v1.0/generations/${generationId}`;
    try {
      const stResp = await fetch(statusUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-API-KEY": GAMMA_API_KEY || "",
        },
      });
      if (!stResp.ok) {
        const body = await stResp.text();
        return {
          content: [
            { type: "text", text: `Failed to fetch generation ${generationId}: ${stResp.status} ${body}` },
          ],
        };
      }
      const stData: any = await stResp.json();
      const pdf = stData.exportUrl && stData.exportUrl.endsWith('.pdf') ? stData.exportUrl : null;
      const pptx = stData.exportUrl && stData.exportUrl.endsWith('.pptx') ? stData.exportUrl : null;
      // Sometimes API returns exportUrl plus separate export links object - search for common keys
      const possiblePdf = pdf || stData.pdfUrl || stData.export_url || stData.exports?.find((e: any)=>e.endsWith('.pdf')) || stData.exports?.find((e: any)=>e.url && e.url.endsWith('.pdf'))?.url;
      const possiblePptx = pptx || stData.pptxUrl || stData.export_url || stData.exports?.find((e: any)=>e.endsWith('.pptx')) || stData.exports?.find((e: any)=>e.url && e.url.endsWith('.pptx'))?.url;

      const resp: any = { generationId };
      if (possiblePdf) resp.pdf = possiblePdf;
      if (possiblePptx) resp.pptx = possiblePptx;

      if (download) {
        const downloads: any = {};
        const fs = await import('fs');
        const path = await import('path');
        if (possiblePdf) {
          const fname = path.join('/tmp', `${generationId}.pdf`);
          const w = fs.createWriteStream(fname);
          const r = await fetch(possiblePdf, { method: 'GET' });
          if (r.ok) {
            await new Promise((res, rej) => {
              const stream = r.body as any;
              stream.pipe(w);
              w.on('finish', res);
              w.on('error', rej);
            });
            downloads.pdf = fname;
          } else {
            downloads.pdf_error = `${r.status} ${await r.text()}`;
          }
        }
        if (possiblePptx) {
          const fname = path.join('/tmp', `${generationId}.pptx`);
          const w = fs.createWriteStream(fname);
          const r = await fetch(possiblePptx, { method: 'GET' });
          if (r.ok) {
            await new Promise((res, rej) => {
              const stream = r.body as any;
              stream.pipe(w);
              w.on('finish', res);
              w.on('error', rej);
            });
            downloads.pptx = fname;
          } else {
            downloads.pptx_error = `${r.status} ${await r.text()}`;
          }
        }
        resp.downloads = downloads;
      }

      // MCP expects structured content types. Return resource objects when possible.
      const content: any[] = [];
      const resourceObj: any = { generationId };
      if (possiblePdf) resourceObj.pdf = possiblePdf;
      if (possiblePptx) resourceObj.pptx = possiblePptx;
      if (download && resp.downloads) resourceObj.downloads = resp.downloads;
      content.push({ type: 'resource', resource: { text: JSON.stringify(resourceObj), uri: '', mimeType: 'application/json' } });
      return { content };
    } catch (err: any) {
      return {
        content: [
          { type: 'text', text: `Error fetching generation: ${err.message || err}` },
        ],
      };
    }
  }
);
