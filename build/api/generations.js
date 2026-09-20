/**
 * Generation endpoints
 *
 * POST /generations, GET /generations/{id}, and the polling loop that turns
 * the pair into a single blocking call.
 */
import fetch from "node-fetch";
import { GAMMA_API_CONFIG, GAMMA_API_DEFAULTS, GENERATION_STATUS, DOWNLOAD_PATH, } from "../constants.js";
import { apiRequest, nextPollDelay, GammaApiError } from "./client.js";
/**
 * Fold `stylePreset` into `style`.
 *
 * `stylePreset` exists on Gamma's official MCP server but not in the REST API,
 * so we resolve it here. When both are given they are combined, so neither is
 * silently discarded.
 */
function resolveImageOptions(options) {
    if (!options)
        return undefined;
    const { stylePreset, style, ...rest } = options;
    const resolvedStyle = stylePreset && stylePreset !== "custom"
        ? style
            ? `${stylePreset}, ${style}`
            : stylePreset
        : style;
    return resolvedStyle ? { ...rest, style: resolvedStyle } : { ...rest };
}
/**
 * Normalize parameters to the shape the Gamma API expects.
 */
function normalizeRequestBody(params) {
    const body = {
        inputText: params.inputText,
        format: params.format || GAMMA_API_DEFAULTS.FORMAT,
        textMode: params.textMode || GAMMA_API_DEFAULTS.TEXT_MODE,
    };
    if (params.title)
        body.title = params.title;
    if (params.sharingOptions)
        body.sharingOptions = params.sharingOptions;
    if (params.exportAs)
        body.exportAs = params.exportAs;
    if (typeof params.numCards === "number")
        body.numCards = params.numCards;
    if (params.additionalInstructions)
        body.additionalInstructions = params.additionalInstructions;
    if (params.textOptions)
        body.textOptions = params.textOptions;
    const imageOptions = resolveImageOptions(params.imageOptions);
    if (imageOptions)
        body.imageOptions = imageOptions;
    if (params.cardOptions)
        body.cardOptions = params.cardOptions;
    if (params.folderIds)
        body.folderIds = params.folderIds;
    if (params.cardSplit)
        body.cardSplit = params.cardSplit;
    if (params.themeId)
        body.themeId = params.themeId;
    return body;
}
/**
 * Collapse file-level and per-page warnings into one string for display.
 */
function collectWarnings(data) {
    const parts = [];
    if (data.warnings)
        parts.push(data.warnings);
    data.pageWarnings?.forEach((w, i) => {
        if (w)
            parts.push(`page ${i + 1}: ${w}`);
    });
    return parts.length ? parts.join("; ") : null;
}
/** GET /generations/{id} */
export async function getGenerationStatus(generationId) {
    return apiRequest(`/generations/${generationId}`);
}
/**
 * Build the request body for a multi-page File.
 *
 * `pages` takes precedence over the top-level per-page fields, so those are
 * deliberately not set here; file-level options still apply to every page.
 */
function normalizeMultiPageBody(params) {
    const body = {
        pages: params.pages.map((page) => {
            const out = { inputText: page.inputText };
            if (page.title)
                out.title = page.title;
            if (page.path)
                out.path = page.path;
            if (page.additionalInstructions)
                out.additionalInstructions = page.additionalInstructions;
            if (page.textMode)
                out.textMode = page.textMode;
            if (page.format)
                out.format = page.format;
            if (typeof page.numCards === "number")
                out.numCards = page.numCards;
            if (page.cardSplit)
                out.cardSplit = page.cardSplit;
            if (page.textOptions)
                out.textOptions = page.textOptions;
            const img = resolveImageOptions(page.imageOptions);
            if (img)
                out.imageOptions = img;
            return out;
        }),
    };
    if (params.title)
        body.title = params.title;
    if (params.publish !== undefined)
        body.publish = params.publish;
    if (params.themeId)
        body.themeId = params.themeId;
    if (params.folderIds)
        body.folderIds = params.folderIds;
    if (params.cardOptions)
        body.cardOptions = params.cardOptions;
    if (params.sharingOptions)
        body.sharingOptions = params.sharingOptions;
    if (params.exportAs)
        body.exportAs = params.exportAs;
    return body;
}
/** POST /generations - returns a generationId; URLs come from polling. */
export async function createGeneration(params) {
    return apiRequest("/generations", {
        method: "POST",
        body: normalizeRequestBody(params),
    });
}
/** POST /generations with a `pages` array. */
export async function createMultiPageGeneration(params) {
    return apiRequest("/generations", {
        method: "POST",
        body: normalizeMultiPageBody(params),
    });
}
/** POST /generations/from-template */
export async function createFromTemplate(params) {
    const body = {
        gammaId: params.gammaId,
        prompt: params.prompt,
    };
    if (params.title)
        body.title = params.title;
    if (params.themeId)
        body.themeId = params.themeId;
    if (params.imageOptions)
        body.imageOptions = params.imageOptions;
    if (params.sharingOptions)
        body.sharingOptions = params.sharingOptions;
    if (params.folderIds)
        body.folderIds = params.folderIds;
    if (params.exportAs)
        body.exportAs = params.exportAs;
    return apiRequest("/generations/from-template", {
        method: "POST",
        body,
    });
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Poll a generation until it completes, fails, or the timeout elapses.
 * Poll spacing adapts to remaining burst capacity.
 */
export async function pollGenerationStatus(generationId, warnings = null) {
    const start = Date.now();
    while (Date.now() - start < GAMMA_API_CONFIG.TIMEOUT_MS) {
        const data = await getGenerationStatus(generationId);
        if (data.status === GENERATION_STATUS.COMPLETED) {
            return {
                url: data.gammaUrl ?? null,
                status: data.status,
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
                status: data.status,
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
        status: "pending",
        generationId,
        gammaId: null,
        exportUrl: null,
        credits: null,
        warnings,
        error: `Timed out after ${GAMMA_API_CONFIG.TIMEOUT_MS / 60_000} minutes waiting for generation ${generationId}.`,
    };
}
function failedResult(error) {
    return {
        url: null,
        status: null,
        generationId: null,
        gammaId: null,
        exportUrl: null,
        credits: null,
        warnings: null,
        error,
    };
}
/**
 * Run any of the three create endpoints, then either wait for the result or
 * hand back the generationId.
 */
async function runGeneration(create, waitForCompletion) {
    try {
        const createData = await create();
        if (!createData.generationId) {
            return failedResult(`The API accepted the request but returned no generationId: ${JSON.stringify(createData)}`);
        }
        const warnings = collectWarnings(createData);
        if (!waitForCompletion) {
            return {
                url: null,
                status: "pending",
                generationId: createData.generationId,
                gammaId: null,
                exportUrl: null,
                credits: null,
                warnings,
                error: null,
            };
        }
        return await pollGenerationStatus(createData.generationId, warnings);
    }
    catch (err) {
        return failedResult(err instanceof GammaApiError ? err.message : err?.message || String(err));
    }
}
/** Create a single-page generation and, by default, wait for it. */
export async function generatePresentation(params, waitForCompletion = true) {
    return runGeneration(() => createGeneration(params), waitForCompletion);
}
/** Create a multi-page File and, by default, wait for it. */
export async function generateMultiPage(params, waitForCompletion = true) {
    return runGeneration(() => createMultiPageGeneration(params), waitForCompletion);
}
/** Create a gamma from a template and, by default, wait for it. */
export async function generateFromTemplate(params, waitForCompletion = true) {
    return runGeneration(() => createFromTemplate(params), waitForCompletion);
}
/**
 * Fetch a generation's assets.
 *
 * Only one `exportAs` is permitted per generation, so there is exactly one
 * exportUrl - not a separate PDF and PPTX.
 */
export async function getPresentationAssets(generationId, download = false) {
    const data = await getGenerationStatus(generationId);
    const result = { generationId, status: data.status };
    if (data.gammaId)
        result.gammaId = data.gammaId;
    if (data.gammaUrl)
        result.gammaUrl = data.gammaUrl;
    if (data.credits)
        result.credits = data.credits;
    if (data.exportUrl) {
        result.exportUrl = data.exportUrl;
        const match = data.exportUrl.split("?")[0].match(/\.(pdf|pptx|zip)$/i);
        if (match)
            result.exportFormat = match[1].toLowerCase();
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
async function downloadExport(generationId, exportUrl, exportFormat) {
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
            const stream = response.body;
            stream.pipe(writeStream);
            writeStream.on("finish", resolve);
            writeStream.on("error", reject);
        });
        return { path: fname };
    }
    catch (err) {
        return { error: err?.message || String(err) };
    }
}
