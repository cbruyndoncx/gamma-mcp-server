/**
 * Standalone image generation tools.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  generateImageAndWait,
  getImageGenerationStatus,
  archiveImage,
} from "../api/images.js";
import { textResult } from "./format.js";
import type { GammaImageGenerationStatusResponse } from "../types.js";
import { GAMMA_IMAGE_TYPES, GAMMA_IMAGE_SIZE_PRESETS } from "../constants.js";

function renderImageStatus(result: GammaImageGenerationStatusResponse): string {
  const lines: string[] = [];

  if (result.status === "completed" && result.image) {
    lines.push(`Image generated: ${result.image.url}`);
    const { width, height, format, aspectRatioUsed, transparency } = result.image;
    const detail = [
      width && height ? `${width}x${height}` : null,
      format,
      aspectRatioUsed ? `ratio ${aspectRatioUsed}` : null,
      transparency ? "has transparency" : null,
    ].filter(Boolean);
    if (detail.length) lines.push(detail.join(" · "));
  } else if (result.status === "failed") {
    const message = typeof result.error === "string" ? result.error : result.error?.message;
    lines.push(`Image generation failed: ${message || "unknown error"}`);
    if (result.retryable !== undefined) {
      lines.push(
        result.retryable
          ? "Retrying the same request may succeed."
          : "Not retryable - the input needs to change (e.g. an unknown themeId or a blocked reference image URL)."
      );
    }
  } else {
    lines.push(
      `Image generation is still pending (id=${result.imageGenerationId}).`,
      `Poll get_image_generation_status with this id.`
    );
  }

  if (result.warnings?.length) {
    lines.push("", "Warnings:");
    for (const w of result.warnings) lines.push(`  ${w.code}: ${w.message}`);
  }

  if (result.credits) {
    lines.push("", `Credits: ${result.credits.deducted} used, ${result.credits.remaining} remaining.`);
  }

  if (result.savedMediaId) {
    lines.push("", `Saved media ID: ${result.savedMediaId} (archive with archive_image).`);
  }

  return lines.join("\n");
}

export function registerGenerateImageTool(server: McpServer): void {
  server.tool(
    "generate_image",
    "Generate one standalone on-brand image from a text prompt - an illustration, scene, photo or abstract graphic on its own, not a gamma. Charges credits.",
    {
      prompt: z
        .string()
        .min(1)
        .max(5_000)
        .describe(
          "What to generate. Put background treatments here too, e.g. 'on a white background'."
        ),
      type: z
        .enum(GAMMA_IMAGE_TYPES)
        .optional()
        .describe(
          `Visual style (${GAMMA_IMAGE_TYPES.join(" | ")}). Defaults to illustration. ` +
            `'scene' uses a curated style that ignores theme colours.`
        ),
      sizePreset: z
        .enum(GAMMA_IMAGE_SIZE_PRESETS)
        .optional()
        .describe(
          `Aspect ratio (${GAMMA_IMAGE_SIZE_PRESETS.join(" | ")}). Defaults to social-square. ` +
            `Pixel dimensions are chosen by the model.`
        ),
      themeId: z
        .string()
        .optional()
        .describe("Theme to brand the image with, from get_themes. Defaults to the workspace theme."),
      referenceImages: z
        .array(
          z.object({
            url: z
              .string()
              .regex(/^https:\/\//, "Must be an https:// URL")
              .describe("HTTPS URL of the reference image."),
            role: z
              .literal("subject")
              .optional()
              .describe("Places the pictured character or product into the generated image."),
          })
        )
        .max(4)
        .optional()
        .describe(
          "Up to 4 reference images whose subject should appear in the result. " +
            "When present, references drive the look and both type and themeId are ignored."
        ),
    },
    async (params) => {
      try {
        const result = await generateImageAndWait(params);
        return textResult(renderImageStatus(result));
      } catch (err: any) {
        return textResult(`Error generating image: ${err?.message || err}`);
      }
    }
  );
}

export function registerGetImageGenerationStatusTool(server: McpServer): void {
  server.tool(
    "get_image_generation_status",
    "Check an image generation started by generate_image and get the image URL once ready. Poll every few seconds rather than in a tight loop. Do not call generate_image again to check progress - that starts a new, separately billed generation.",
    {
      imageGenerationId: z.string().describe("The imageGenerationId returned by generate_image."),
    },
    async ({ imageGenerationId }) => {
      try {
        const result = await getImageGenerationStatus(imageGenerationId);
        return textResult(renderImageStatus(result));
      } catch (err: any) {
        return textResult(`Error fetching image generation: ${err?.message || err}`);
      }
    }
  );
}

export function registerArchiveImageTool(server: McpServer): void {
  server.tool(
    "archive_image",
    "Archive an item in the media library. Idempotent - archiving an already archived item succeeds. Not available on Gamma's official MCP server.",
    {
      savedMediaId: z.string().describe("The savedMediaId of the media library item."),
    },
    async ({ savedMediaId }) => {
      try {
        await archiveImage(savedMediaId);
        return textResult(`Archived media item ${savedMediaId}.`);
      } catch (err: any) {
        return textResult(`Error archiving media item: ${err?.message || err}`);
      }
    }
  );
}
