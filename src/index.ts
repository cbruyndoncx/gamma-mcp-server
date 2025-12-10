import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

// Gamma API base
const GAMMA_API_URL = "https://public-api.gamma.app/v1.0/generations";
const GAMMA_API_KEY = process.env.GAMMA_API_KEY;

// Helper: normalize and make Gamma API requests (create + poll)
async function generatePresentation(params: Record<string, any>): Promise<{ url: string | null; generationId?: string | null; error: string | null }> {
  try {
    // Normalize parameters to the shape the Gamma Generate API expects.
    const body: any = {};

    // Required-ish: inputText
    body.inputText = params.inputText;

    // format (default to presentation)
    body.format = params.format || "presentation";

    // textMode: Gamma expects one of: generate | condense | preserve
    body.textMode = params.textMode || (params.textMode === undefined && params.textMode !== null ? undefined : "generate");

    // exportAs (pdf|pptx)
    if (params.exportAs) body.exportAs = params.exportAs;

    // numCards
    if (typeof params.numCards === "number") body.numCards = params.numCards;

    // AdditionalInstructions
    if (params.additionalInstructions) body.additionalInstructions = params.additionalInstructions;

    // Support both older flat fields and newer nested textOptions/imageOptions
    const textOptions: any = {};
    if (params.textAmount) textOptions.amount = params.textAmount; // legacy
    if (params.textOptions?.amount) textOptions.amount = params.textOptions.amount;
    if (params.tone) textOptions.tone = params.tone;
    if (params.textOptions?.tone) textOptions.tone = params.textOptions.tone;
    if (params.audience) textOptions.audience = params.audience;
    if (params.textOptions?.audience) textOptions.audience = params.textOptions.audience;
    if (Object.keys(textOptions).length) body.textOptions = textOptions;

    const imageOptions: any = {};
    if (params.imageModel) imageOptions.model = params.imageModel;
    if (params.imageStyle) imageOptions.style = params.imageStyle;
    if (params.imageOptions?.model) imageOptions.model = params.imageOptions.model;
    if (params.imageOptions?.style) imageOptions.style = params.imageOptions.style;
    if (params.imageOptions?.source) imageOptions.source = params.imageOptions.source;
    if (Object.keys(imageOptions).length) body.imageOptions = imageOptions;

    if (params.folderIds) body.folderIds = params.folderIds;
    if (params.cardSplit) body.cardSplit = params.cardSplit;
    if (params.themeId) body.themeId = params.themeId;
    if (params.format) body.format = params.format;

    // Make the initial create request using API key header (Gamma uses X-API-KEY)
    const createResp = await fetch(GAMMA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-API-KEY": GAMMA_API_KEY || "",
      },
      body: JSON.stringify(body),
    });

    if (!createResp.ok) {
      const bodyText = await createResp.text();
      throw new Error(`HTTP error! status: ${createResp.status}, body: ${bodyText}`);
    }

    const createData: any = await createResp.json();

    // Gamma may return a direct viewing URL or a generationId/generationId
    // Common shapes: { generationId: "xxx" } or { id: "xxx" } or { url: "https://..." }
    if (createData.gammaUrl || createData.url || createData.exportUrl || createData.output_url || createData.outputUrl) {
      const direct = createData.gammaUrl || createData.url || createData.exportUrl || createData.output_url || createData.outputUrl;
      return { url: direct, generationId: createData.generationId || createData.generation_id || createData.id || null, error: null };
    }

    const genId = createData.generationId || createData.generation_id || createData.id || createData.generationId;
    if (!genId) {
      return { url: null, generationId: null, error: `Unexpected response shape: ${JSON.stringify(createData)}` };
    }

    // Poll status endpoint using X-API-KEY header
    const statusUrl = `${GAMMA_API_URL}/${genId}`;
    const timeoutMs = 2 * 60_000; // 2 minutes total timeout for generation
    const intervalMs = 1500; // 1.5s between polls
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const stResp = await fetch(statusUrl, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "X-API-KEY": GAMMA_API_KEY || "",
        },
      });

      if (!stResp.ok) {
        const errText = await stResp.text();
        throw new Error(`Status poll error! status: ${stResp.status}, body: ${errText}`);
      }

      const stData: any = await stResp.json();
      const status = (stData.status || stData.state || "").toString().toLowerCase();

      if (status === "completed" || status === "succeeded") {
        // look for common URL locations
        const possible = stData.gammaUrl || stData.gamma_url || stData.exportUrl || stData.export_url || stData.outputUrl || stData.output_url || stData.url;
        if (possible) return { url: possible, generationId: genId, error: null };

        // outputs/exports/artifacts arrays
        const arrUrl = stData.outputs?.[0]?.url || stData.exports?.[0]?.url || stData.artifacts?.[0]?.url || stData.exports?.[0];
        if (arrUrl) return { url: arrUrl, generationId: genId, error: null };

        return { url: null, generationId: genId, error: `Generation completed but no export URL found: ${JSON.stringify(stData)}` };
      }

      if (status === "failed" || status === "error") {
        return { url: null, generationId: genId, error: `Generation failed: ${JSON.stringify(stData)}` };
      }

      await new Promise((r) => setTimeout(r, intervalMs));
    }

    return { url: null, generationId: genId, error: `Timed out waiting for generation ${genId}` };
  } catch (err: any) {
    return { url: null, generationId: null, error: err?.message || String(err) };
  }
}

// Create MCP server
const server = new McpServer({
  name: "gamma-presentation",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register the generate-presentation tool
server.tool(
  "generate-presentation",
  "Generate a presentation using the Gamma API. The response will include a link to the generated presentation when available.",
  {
    inputText: z.string().describe("The topic or prompt for the presentation."),
    // Support both old and new parameter shapes – be permissive so clients that used curl continue to work.
    textMode: z
      .enum(["generate", "condense", "preserve"]) // matches Gamma docs
      .optional()
      .describe("Text mode for Gamma API (generate | condense | preserve)."),
    format: z.string().optional().describe("Format to create (presentation | document | social | webpage)."),
    numCards: z.number().min(1).max(75).optional().describe("Number of slides/cards to generate."),
    exportAs: z.string().optional().describe("If set, request a direct export: 'pdf' or 'pptx'."),
    // Legacy / convenience fields
    textAmount: z
      .enum(["short", "medium", "long"]) 
      .optional()
      .describe("Legacy shorthand for text amount (kept for backward compatibility)."),
    // More flexible nested options
    textOptions: z
      .object({
        amount: z
          .enum(["brief", "medium", "detailed", "extensive"]) 
          .optional(),
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
    // Normalize small mismatches automatically (e.g., ensure textMode exists)
    if (!params.textMode) params.textMode = params.textMode || "generate";

    const { url, generationId, error } = await generatePresentation(params as any);
    if (!url) {
      // If we have a generationId but no URL (export pending), return the generationId so client can call get-presentation-assets
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

// Register get-presentation-assets (fetch exports by generationId)
server.tool(
  "get-presentation-assets",
  "Given a generationId return downloadable URLs for pdf and pptx if available, and optionally download them into the MCP server and return local paths.",
  {
    generationId: z.string().describe("The generationId returned by the Gamma generate API."),
    download: z.boolean().optional().describe("If true, download the assets and return local file paths."),
  },
  async (params) => {
    const { generationId, download } = params as any;
    const statusUrl = `${GAMMA_API_URL}/${generationId}`;
    try {
      const stResp = await fetch(statusUrl, {
        method: "GET",
        headers: { Accept: "application/json", "X-API-KEY": GAMMA_API_KEY || "" },
      });
      if (!stResp.ok) {
        const body = await stResp.text();
        return { content: [{ type: "text", text: `Failed to fetch generation ${generationId}: ${stResp.status} ${body}` }] };
      }

      const stData: any = await stResp.json();
      // Look for common export locations
      const possiblePdf = stData.exportUrl && stData.exportUrl.endsWith('.pdf') ? stData.exportUrl : (Array.isArray(stData.exports) && stData.exports.find((e: any) => typeof e === 'string' && e.endsWith('.pdf')))
        || stData.pdfUrl || stData.exports?.find((e: any) => e?.url && e.url.endsWith('.pdf'))?.url || null;
      const possiblePptx = stData.exportUrl && stData.exportUrl.endsWith('.pptx') ? stData.exportUrl : (Array.isArray(stData.exports) && stData.exports.find((e: any) => typeof e === 'string' && e.endsWith('.pptx')))
        || stData.pptxUrl || stData.exports?.find((e: any) => e?.url && e.url.endsWith('.pptx'))?.url || null;

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
          if (r.ok && r.body) {
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
          if (r.ok && r.body) {
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

      const content: any[] = [];
      const resourceObj: any = { generationId };
      if (possiblePdf) resourceObj.pdf = possiblePdf;
      if (possiblePptx) resourceObj.pptx = possiblePptx;
      if (download && resp.downloads) resourceObj.downloads = resp.downloads;
      content.push({ type: 'resource', resource: { text: JSON.stringify(resourceObj), uri: '', mimeType: 'application/json' } });
      return { content };
    } catch (err: any) {
      return { content: [{ type: 'text', text: `Error fetching generation: ${err.message || err}` }] };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gamma MCP Server running on stdio");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
