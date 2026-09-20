/**
 * Gamma API Client
 * Handles all interactions with the Gamma API (v1.0)
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
  GammaCreateGenerationResponse,
  GammaGenerationStatusResponse,
  GammaAssets,
  GammaAssetDownloads,
  GammaErrorResponse,
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

  body.textMode = params.textMode || GAMMA_API_DEFAULTS.TEXT_MODE;

  if (params.exportAs) body.exportAs = params.exportAs;
  if (typeof params.numCards === "number") body.numCards = params.numCards;
  if (params.additionalInstructions) body.additionalInstructions = params.additionalInstructions;
  if (params.textOptions) body.textOptions = params.textOptions;
  if (params.imageOptions) body.imageOptions = params.imageOptions;
  if (params.cardOptions) body.cardOptions = params.cardOptions;
  if (params.folderIds) body.folderIds = params.folderIds;
  if (params.cardSplit) body.cardSplit = params.cardSplit;
  if (params.themeId) body.themeId = params.themeId;

  return body;
}

/**
 * Turn an API error body into a readable message.
 * The v1.0 API returns { message, statusCode } on failure.
 */
function describeError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as GammaErrorResponse;
    if (parsed?.message) return `${status}: ${parsed.message}`;
  } catch {
    // body was not JSON; fall through to the raw text
  }
  return `${status}: ${body}`;
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
 * Fetch the current state of a generation.
 */
async function fetchGenerationStatus(
  generationId: string
): Promise<GammaGenerationStatusResponse> {
  const statusUrl = `${GAMMA_API_CONFIG.BASE_URL}/${generationId}`;
  const response = await makeRequest(statusUrl, "GET");

  if (!response.ok) {
    throw new Error(describeError(response.status, await response.text()));
  }

  return (await response.json()) as GammaGenerationStatusResponse;
}

/**
 * Poll generation status until completion or timeout.
 * The API documents a 5s cadence; most generations finish in 1-3 minutes.
 */
async function pollGenerationStatus(
  generationId: string,
  warnings: string | null
): Promise<GammaGenerationResult> {
  const start = Date.now();

  while (Date.now() - start < GAMMA_API_CONFIG.TIMEOUT_MS) {
    const data = await fetchGenerationStatus(generationId);

    if (data.status === GENERATION_STATUS.COMPLETED) {
      return {
        url: data.gammaUrl ?? null,
        generationId,
        gammaId: data.gammaId ?? null,
        exportUrl: data.exportUrl ?? null,
        credits: data.credits ?? null,
        warnings,
        error: data.gammaUrl
          ? null
          : "Generation completed but the response carried no gammaUrl.",
      };
    }

    if (data.status === GENERATION_STATUS.FAILED) {
      return {
        url: null,
        generationId,
        gammaId: data.gammaId ?? null,
        exportUrl: null,
        credits: data.credits ?? null,
        warnings,
        error: data.error?.message
          ? `Generation failed - ${data.error.message}`
          : "Generation failed.",
      };
    }

    await new Promise((resolve) =>
      setTimeout(resolve, GAMMA_API_CONFIG.POLL_INTERVAL_MS)
    );
  }

  return {
    url: null,
    generationId,
    gammaId: null,
    exportUrl: null,
    credits: null,
    warnings,
    error: `Timed out after ${
      GAMMA_API_CONFIG.TIMEOUT_MS / 60_000
    } minutes waiting for generation ${generationId}.`,
  };
}

/**
 * Collapse file-level and per-page warnings into one string for display.
 */
function collectWarnings(data: GammaCreateGenerationResponse): string | null {
  const parts: string[] = [];
  if (data.warnings) parts.push(data.warnings);
  data.pageWarnings?.forEach((w, i) => {
    if (w) parts.push(`page ${i + 1}: ${w}`);
  });
  return parts.length ? parts.join("; ") : null;
}

/**
 * Generate a presentation using the Gamma API.
 * POST returns only a generationId; URLs come from polling.
 */
export async function generatePresentation(
  params: GammaGenerationParams
): Promise<GammaGenerationResult> {
  const failed = (error: string): GammaGenerationResult => ({
    url: null,
    generationId: null,
    gammaId: null,
    exportUrl: null,
    credits: null,
    warnings: null,
    error,
  });

  try {
    const body = normalizeRequestBody(params);
    const createResp = await makeRequest(GAMMA_API_CONFIG.BASE_URL, "POST", body);

    if (!createResp.ok) {
      return failed(describeError(createResp.status, await createResp.text()));
    }

    const createData = (await createResp.json()) as GammaCreateGenerationResponse;
    const warnings = collectWarnings(createData);

    if (!createData.generationId) {
      return failed(
        `The API accepted the request but returned no generationId: ${JSON.stringify(
          createData
        )}`
      );
    }

    return await pollGenerationStatus(createData.generationId, warnings);
  } catch (err: any) {
    return failed(err?.message || String(err));
  }
}

/**
 * Get the assets for a generation.
 * Only one `exportAs` is permitted per generation, so there is exactly one
 * exportUrl - not a separate PDF and PPTX.
 */
export async function getPresentationAssets(
  generationId: string,
  download: boolean = false
): Promise<GammaAssets> {
  const data = await fetchGenerationStatus(generationId);

  const result: GammaAssets = {
    generationId,
    status: data.status,
  };

  if (data.gammaId) result.gammaId = data.gammaId;
  if (data.gammaUrl) result.gammaUrl = data.gammaUrl;
  if (data.credits) result.credits = data.credits;

  if (data.exportUrl) {
    result.exportUrl = data.exportUrl;
    const match = data.exportUrl.split("?")[0].match(/\.(pdf|pptx|zip)$/i);
    if (match) result.exportFormat = match[1].toLowerCase();
  }

  if (download && data.exportUrl) {
    result.download = await downloadExport(
      generationId,
      data.exportUrl,
      result.exportFormat
    );
  }

  return result;
}

/**
 * Download an export to the local filesystem.
 */
async function downloadExport(
  generationId: string,
  exportUrl: string,
  exportFormat: string | undefined
): Promise<GammaAssetDownloads> {
  const fs = await import("fs");
  const path = await import("path");

  try {
    const ext = exportFormat || "bin";
    const fname = path.join(DOWNLOAD_PATH, `${generationId}.${ext}`);
    const response = await fetch(exportUrl, { method: "GET" });

    if (!response.ok || !response.body) {
      // Deliberately does not echo exportUrl - it is an unauthenticated link.
      return { error: `Download failed with status ${response.status}` };
    }

    const writeStream = fs.createWriteStream(fname);
    await new Promise((resolve, reject) => {
      const stream = response.body as any;
      stream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
    });

    return { path: fname };
  } catch (err: any) {
    return { error: err?.message || String(err) };
  }
}
