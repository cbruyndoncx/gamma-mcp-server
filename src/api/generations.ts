/**
 * Generation endpoints
 *
 * POST /generations, GET /generations/{id}, and the polling loop that turns
 * the pair into a single blocking call.
 */

import fetch from "node-fetch";
import {
  GAMMA_API_CONFIG,
  GAMMA_API_DEFAULTS,
  GENERATION_STATUS,
  DOWNLOAD_PATH,
} from "../constants.js";
import { apiRequest, nextPollDelay, GammaApiError } from "./client.js";
import type {
  GammaGenerationParams,
  GammaAPIRequestBody,
  GammaGenerationResult,
  GammaCreateGenerationResponse,
  GammaGenerationStatusResponse,
  GammaAssets,
  GammaAssetDownloads,
} from "../types.js";

/**
 * Normalize parameters to the shape the Gamma API expects.
 */
function normalizeRequestBody(params: GammaGenerationParams): GammaAPIRequestBody {
  const body: GammaAPIRequestBody = {
    inputText: params.inputText,
    format: params.format || GAMMA_API_DEFAULTS.FORMAT,
    textMode: params.textMode || GAMMA_API_DEFAULTS.TEXT_MODE,
  };

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

/** GET /generations/{id} */
export async function getGenerationStatus(
  generationId: string
): Promise<GammaGenerationStatusResponse> {
  return apiRequest<GammaGenerationStatusResponse>(`/generations/${generationId}`);
}

/** POST /generations - returns a generationId; URLs come from polling. */
export async function createGeneration(
  params: GammaGenerationParams
): Promise<GammaCreateGenerationResponse> {
  return apiRequest<GammaCreateGenerationResponse>("/generations", {
    method: "POST",
    body: normalizeRequestBody(params),
  });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poll a generation until it completes, fails, or the timeout elapses.
 * Poll spacing adapts to remaining burst capacity.
 */
export async function pollGenerationStatus(
  generationId: string,
  warnings: string | null = null
): Promise<GammaGenerationResult> {
  const start = Date.now();

  while (Date.now() - start < GAMMA_API_CONFIG.TIMEOUT_MS) {
    const data = await getGenerationStatus(generationId);

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

    await sleep(nextPollDelay(GAMMA_API_CONFIG.POLL_INTERVAL_MS));
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
 * Create a generation and wait for it to finish.
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
    const createData = await createGeneration(params);

    if (!createData.generationId) {
      return failed(
        `The API accepted the request but returned no generationId: ${JSON.stringify(createData)}`
      );
    }

    return await pollGenerationStatus(
      createData.generationId,
      collectWarnings(createData)
    );
  } catch (err: any) {
    return failed(err instanceof GammaApiError ? err.message : err?.message || String(err));
  }
}

/**
 * Fetch a generation's assets.
 *
 * Only one `exportAs` is permitted per generation, so there is exactly one
 * exportUrl - not a separate PDF and PPTX.
 */
export async function getPresentationAssets(
  generationId: string,
  download: boolean = false
): Promise<GammaAssets> {
  const data = await getGenerationStatus(generationId);

  const result: GammaAssets = { generationId, status: data.status };

  if (data.gammaId) result.gammaId = data.gammaId;
  if (data.gammaUrl) result.gammaUrl = data.gammaUrl;
  if (data.credits) result.credits = data.credits;

  if (data.exportUrl) {
    result.exportUrl = data.exportUrl;
    const match = data.exportUrl.split("?")[0].match(/\.(pdf|pptx|zip)$/i);
    if (match) result.exportFormat = match[1].toLowerCase();
  }

  if (download && data.exportUrl) {
    result.download = await downloadExport(generationId, data.exportUrl, result.exportFormat);
  }

  return result;
}

/**
 * Download an export to the local filesystem.
 *
 * Goes direct rather than through apiRequest: export URLs are pre-signed and
 * must not carry the API key.
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
