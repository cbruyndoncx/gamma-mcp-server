/**
 * Standalone image generation.
 *
 * Separate from generating a gamma: POST /images produces a single on-brand
 * image from a prompt.
 */

import { apiRequest } from "./client.js";
import { GAMMA_API_CONFIG } from "../constants.js";
import type {
  GammaImageGenerationParams,
  GammaCreateImageGenerationResponse,
  GammaImageGenerationStatusResponse,
} from "../types.js";

/** POST /images */
export async function createImageGeneration(
  params: GammaImageGenerationParams
): Promise<GammaCreateImageGenerationResponse> {
  const body: Record<string, unknown> = { prompt: params.prompt };
  if (params.type) body.type = params.type;
  if (params.sizePreset) body.sizePreset = params.sizePreset;
  if (params.themeId) body.themeId = params.themeId;
  if (params.referenceImages?.length) {
    body.referenceImages = params.referenceImages.map((ref) => ({
      url: ref.url,
      role: ref.role ?? "subject",
    }));
  }

  return apiRequest<GammaCreateImageGenerationResponse>("/images", {
    method: "POST",
    body,
  });
}

/** GET /images/{id} */
export async function getImageGenerationStatus(
  imageGenerationId: string
): Promise<GammaImageGenerationStatusResponse> {
  return apiRequest<GammaImageGenerationStatusResponse>(`/images/${imageGenerationId}`);
}

/** POST /images/media/{savedMediaId}/archive - idempotent. */
export async function archiveImage(savedMediaId: string): Promise<unknown> {
  return apiRequest<unknown>(`/images/media/${savedMediaId}/archive`, { method: "POST" });
}

/**
 * Create an image and poll until it is ready.
 *
 * Higher-tier and HD models take noticeably longer, so this reuses the
 * generation timeout rather than a shorter one.
 */
export async function generateImageAndWait(
  params: GammaImageGenerationParams
): Promise<GammaImageGenerationStatusResponse> {
  const created = await createImageGeneration(params);
  const start = Date.now();

  while (Date.now() - start < GAMMA_API_CONFIG.TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, GAMMA_API_CONFIG.POLL_INTERVAL_MS));
    const status = await getImageGenerationStatus(created.imageGenerationId);

    if (status.status !== "pending") {
      // Warnings reported at request time are not repeated in the status
      // response, so carry them forward.
      const warnings = [...(created.warnings ?? []), ...(status.warnings ?? [])];
      return warnings.length ? { ...status, warnings } : status;
    }
  }

  return {
    imageGenerationId: created.imageGenerationId,
    status: "pending",
    warnings: created.warnings,
    error: `Timed out waiting for image ${created.imageGenerationId}. Poll get_image_generation_status to keep checking.`,
  };
}
