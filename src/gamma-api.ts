/**
 * Gamma API Client
 * Handles all interactions with the Gamma API
 */

import fetch from "node-fetch";
import dotenv from "dotenv";
import {
  GAMMA_API_CONFIG,
  GAMMA_API_DEFAULTS,
  GENERATION_STATUS,
  DOWNLOAD_PATH,
} from "./constants.js";
import type {
  GammaGenerationParams,
  GammaAPIRequestBody,
  GammaGenerationResult,
  GammaAPIResponse,
  GammaAssets,
  GammaAssetDownloads,
} from "./types.js";

dotenv.config();

const GAMMA_API_KEY = process.env.GAMMA_API_KEY;

/**
 * Normalize parameters to the shape the Gamma API expects
 */
function normalizeRequestBody(params: GammaGenerationParams): GammaAPIRequestBody {
  const body: GammaAPIRequestBody = {
    inputText: params.inputText,
    format: params.format || GAMMA_API_DEFAULTS.FORMAT,
  };

  // Set textMode
  body.textMode = params.textMode || GAMMA_API_DEFAULTS.TEXT_MODE;

  // Export format
  if (params.exportAs) {
    body.exportAs = params.exportAs;
  }

  // Number of cards
  if (typeof params.numCards === "number") {
    body.numCards = params.numCards;
  }

  // Additional instructions
  if (params.additionalInstructions) {
    body.additionalInstructions = params.additionalInstructions;
  }

  // Text options
  if (params.textOptions) {
    body.textOptions = params.textOptions;
  }

  // Image options
  if (params.imageOptions) {
    body.imageOptions = params.imageOptions;
  }

  // Card options (dimensions and header/footer)
  if (params.cardOptions) {
    body.cardOptions = params.cardOptions;
  }

  // Other optional fields
  if (params.folderIds) body.folderIds = params.folderIds;
  if (params.cardSplit) body.cardSplit = params.cardSplit;
  if (params.themeId) body.themeId = params.themeId;

  return body;
}

/**
 * Extract generation ID from API response
 */
function extractGenerationId(data: GammaAPIResponse): string | null {
  return data.generationId || data.generation_id || data.id || null;
}

/**
 * Extract URL from API response
 */
function extractUrl(data: GammaAPIResponse): string | null {
  // Direct URL properties
  const directUrl =
    data.gammaUrl ||
    data.gamma_url ||
    data.url ||
    data.exportUrl ||
    data.export_url ||
    data.outputUrl ||
    data.output_url;

  if (directUrl) return directUrl;

  // Check arrays for URLs
  const arrayUrl =
    data.outputs?.[0]?.url ||
    (typeof data.exports?.[0] === "object" && data.exports[0]?.url) ||
    data.artifacts?.[0]?.url ||
    (typeof data.exports?.[0] === "string" ? data.exports[0] : null);

  return arrayUrl || null;
}

/**
 * Check if generation status is completed
 */
function isCompleted(status: string): boolean {
  const lowerStatus = status.toLowerCase();
  return GENERATION_STATUS.COMPLETED.some(s => s === lowerStatus);
}

/**
 * Check if generation status is failed
 */
function isFailed(status: string): boolean {
  const lowerStatus = status.toLowerCase();
  return GENERATION_STATUS.FAILED.some(s => s === lowerStatus);
}

/**
 * Make a request to the Gamma API
 */
async function makeRequest(
  url: string,
  method: "GET" | "POST",
  body?: GammaAPIRequestBody
) {
  const headers: Record<string, string> = {
    Accept: "application/json",
    [GAMMA_API_CONFIG.API_KEY_HEADER]: GAMMA_API_KEY || "",
  };

  if (method === "POST") {
    headers["Content-Type"] = "application/json";
  }

  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Poll generation status until completion or timeout
 */
async function pollGenerationStatus(generationId: string): Promise<GammaGenerationResult> {
  const statusUrl = `${GAMMA_API_CONFIG.BASE_URL}/${generationId}`;
  const start = Date.now();

  while (Date.now() - start < GAMMA_API_CONFIG.TIMEOUT_MS) {
    const response = await makeRequest(statusUrl, "GET");

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Status poll error! status: ${response.status}, body: ${errText}`);
    }

    const data: GammaAPIResponse = await response.json() as any;
    const status = (data.status || data.state || "").toString().toLowerCase();

    if (isCompleted(status)) {
      const url = extractUrl(data);
      if (url) {
        return { url, generationId, error: null };
      }
      return {
        url: null,
        generationId,
        error: `Generation completed but no export URL found: ${JSON.stringify(data)}`,
      };
    }

    if (isFailed(status)) {
      return {
        url: null,
        generationId,
        error: `Generation failed: ${JSON.stringify(data)}`,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, GAMMA_API_CONFIG.POLL_INTERVAL_MS));
  }

  return {
    url: null,
    generationId,
    error: `Timed out waiting for generation ${generationId}`,
  };
}

/**
 * Generate a presentation using the Gamma API
 */
export async function generatePresentation(
  params: GammaGenerationParams
): Promise<GammaGenerationResult> {
  try {
    const body = normalizeRequestBody(params);

    // Make the initial create request
    const createResp = await makeRequest(GAMMA_API_CONFIG.BASE_URL, "POST", body);

    if (!createResp.ok) {
      const bodyText = await createResp.text();
      throw new Error(`HTTP error! status: ${createResp.status}, body: ${bodyText}`);
    }

    const createData: GammaAPIResponse = await createResp.json() as any;

    // Check if we got a direct URL
    const directUrl = extractUrl(createData);
    if (directUrl) {
      return {
        url: directUrl,
        generationId: extractGenerationId(createData),
        error: null,
      };
    }

    // Extract generation ID for polling
    const genId = extractGenerationId(createData);
    if (!genId) {
      return {
        url: null,
        generationId: null,
        error: `Unexpected response shape: ${JSON.stringify(createData)}`,
      };
    }

    // Poll for completion
    return await pollGenerationStatus(genId);
  } catch (err: any) {
    return {
      url: null,
      generationId: null,
      error: err?.message || String(err),
    };
  }
}

/**
 * Get presentation assets (PDF/PPTX) for a generation
 */
export async function getPresentationAssets(
  generationId: string,
  download: boolean = false
): Promise<GammaAssets> {
  const statusUrl = `${GAMMA_API_CONFIG.BASE_URL}/${generationId}`;

  const response = await makeRequest(statusUrl, "GET");

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch generation ${generationId}: ${response.status} ${body}`);
  }

  const data: GammaAPIResponse = await response.json() as any;

  // Extract PDF URL
  let possiblePdf: string | null = null;
  if (data.exportUrl && data.exportUrl.endsWith(".pdf")) {
    possiblePdf = data.exportUrl;
  } else if (data.pdfUrl) {
    possiblePdf = data.pdfUrl;
  } else if (Array.isArray(data.exports)) {
    const pdfExport = data.exports.find((e: any) =>
      (typeof e === "string" && e.endsWith(".pdf")) ||
      (typeof e === "object" && e?.url && e.url.endsWith(".pdf"))
    );
    if (typeof pdfExport === "string") {
      possiblePdf = pdfExport;
    } else if (typeof pdfExport === "object" && pdfExport?.url) {
      possiblePdf = pdfExport.url;
    }
  }

  // Extract PPTX URL
  let possiblePptx: string | null = null;
  if (data.exportUrl && data.exportUrl.endsWith(".pptx")) {
    possiblePptx = data.exportUrl;
  } else if (data.pptxUrl) {
    possiblePptx = data.pptxUrl;
  } else if (Array.isArray(data.exports)) {
    const pptxExport = data.exports.find((e: any) =>
      (typeof e === "string" && e.endsWith(".pptx")) ||
      (typeof e === "object" && e?.url && e.url.endsWith(".pptx"))
    );
    if (typeof pptxExport === "string") {
      possiblePptx = pptxExport;
    } else if (typeof pptxExport === "object" && pptxExport?.url) {
      possiblePptx = pptxExport.url;
    }
  }

  const result: GammaAssets = { generationId };
  if (possiblePdf) result.pdf = possiblePdf;
  if (possiblePptx) result.pptx = possiblePptx;

  // Download files if requested
  if (download) {
    result.downloads = await downloadAssets(generationId, possiblePdf, possiblePptx);
  }

  return result;
}

/**
 * Download asset files to local filesystem
 */
async function downloadAssets(
  generationId: string,
  pdfUrl: string | null,
  pptxUrl: string | null
): Promise<GammaAssetDownloads> {
  const downloads: GammaAssetDownloads = {};
  const fs = await import("fs");
  const path = await import("path");

  if (pdfUrl) {
    try {
      const fname = path.join(DOWNLOAD_PATH, `${generationId}.pdf`);
      const response = await fetch(pdfUrl, { method: "GET" });

      if (response.ok && response.body) {
        const writeStream = fs.createWriteStream(fname);
        await new Promise((resolve, reject) => {
          const stream = response.body as any;
          stream.pipe(writeStream);
          writeStream.on("finish", resolve);
          writeStream.on("error", reject);
        });
        downloads.pdf = fname;
      } else {
        downloads.pdf_error = `${response.status} ${await response.text()}`;
      }
    } catch (err: any) {
      downloads.pdf_error = err.message || String(err);
    }
  }

  if (pptxUrl) {
    try {
      const fname = path.join(DOWNLOAD_PATH, `${generationId}.pptx`);
      const response = await fetch(pptxUrl, { method: "GET" });

      if (response.ok && response.body) {
        const writeStream = fs.createWriteStream(fname);
        await new Promise((resolve, reject) => {
          const stream = response.body as any;
          stream.pipe(writeStream);
          writeStream.on("finish", resolve);
          writeStream.on("error", reject);
        });
        downloads.pptx = fname;
      } else {
        downloads.pptx_error = `${response.status} ${await response.text()}`;
      }
    } catch (err: any) {
      downloads.pptx_error = err.message || String(err);
    }
  }

  return downloads;
}
