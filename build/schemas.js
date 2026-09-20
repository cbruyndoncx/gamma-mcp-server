/**
 * Shared Zod fragments for the Gamma tool schemas.
 *
 * These mirror the v1.0 request schema, including its length and array bounds,
 * so an invalid request is rejected here rather than as a 400 from the API.
 */
import { z } from "zod";
import { GAMMA_TEXT_AMOUNTS, GAMMA_TEXT_MODES, GAMMA_FORMATS, GAMMA_CARD_SPLIT, GAMMA_IMAGE_SOURCES, GAMMA_CARD_DIMENSIONS, GAMMA_HEADER_FOOTER_TYPES, GAMMA_HEADER_FOOTER_POSITIONS, GAMMA_HEADER_FOOTER_IMAGE_SOURCES, GAMMA_HEADER_FOOTER_SIZES, GAMMA_IMAGE_STYLE_PRESETS, GAMMA_SHARING_WORKSPACE_ACCESS, GAMMA_SHARING_EXTERNAL_ACCESS, GAMMA_SHARING_EMAIL_ACCESS, } from "./constants.js";
/** One header/footer slot. Previously copy-pasted six times. */
export const headerFooterElementSchema = z.object({
    type: z
        .enum(GAMMA_HEADER_FOOTER_TYPES)
        .describe(`Content type (${GAMMA_HEADER_FOOTER_TYPES.join(" | ")})`),
    value: z.string().min(1).max(500).optional().describe("Text content when type is 'text'"),
    source: z
        .enum(GAMMA_HEADER_FOOTER_IMAGE_SOURCES)
        .optional()
        .describe(`Image source when type is 'image' (${GAMMA_HEADER_FOOTER_IMAGE_SOURCES.join(" | ")})`),
    src: z.string().optional().describe("Image URL when source is 'custom'"),
    size: z
        .enum(GAMMA_HEADER_FOOTER_SIZES)
        .optional()
        .describe(`Element size (${GAMMA_HEADER_FOOTER_SIZES.join(" | ")})`),
});
export const headerFooterSchema = z
    .object({
    topLeft: headerFooterElementSchema.optional(),
    topCenter: headerFooterElementSchema.optional(),
    topRight: headerFooterElementSchema.optional(),
    bottomLeft: headerFooterElementSchema.optional(),
    bottomCenter: headerFooterElementSchema.optional(),
    bottomRight: headerFooterElementSchema.optional(),
    hideFromFirstCard: z.boolean().optional().describe("Hide from the first card"),
    hideFromLastCard: z.boolean().optional().describe("Hide from the last card"),
})
    .describe(`Header/footer configuration. Positions: ${GAMMA_HEADER_FOOTER_POSITIONS.join(", ")}. ` +
    `Element types: ${GAMMA_HEADER_FOOTER_TYPES.join(", ")}. Not applicable when format is 'webpage'.`);
export const textOptionsSchema = z
    .object({
    amount: z
        .enum(GAMMA_TEXT_AMOUNTS)
        .optional()
        .describe(`Text density per card (${GAMMA_TEXT_AMOUNTS.join(" | ")})`),
    tone: z
        .string()
        .max(500)
        .optional()
        .describe("Tone/voice, e.g. 'professional and confident'. Applies when textMode is 'generate'."),
    audience: z
        .string()
        .max(500)
        .optional()
        .describe("Target audience, e.g. 'investors'. Applies when textMode is 'generate'."),
    language: z.string().optional().describe("Output language code, e.g. 'en', 'es', 'pt-br'"),
})
    .describe("Text generation options");
export const imageOptionsSchema = z
    .object({
    source: z
        .enum(GAMMA_IMAGE_SOURCES)
        .optional()
        .describe(`Image source (${GAMMA_IMAGE_SOURCES.join(" | ")})`),
    model: z
        .string()
        .optional()
        .describe("AI image model when source is 'aiGenerated', e.g. 'flux-1-quick' (2 credits) or " +
        "'gpt-image-1-high' (120 credits). Omit to let Gamma choose."),
    stylePreset: z
        .enum(GAMMA_IMAGE_STYLE_PRESETS)
        .optional()
        .describe(`Art style preset (${GAMMA_IMAGE_STYLE_PRESETS.join(" | ")}). ` +
        `Combined with 'style' if both are given. Use 'custom' to rely on 'style' alone.`),
    style: z
        .string()
        .max(5_000)
        .optional()
        .describe("Visual style for AI images, e.g. 'photorealistic'. Strongly recommended for consistency."),
})
    .describe("Image generation and sourcing options");
export const cardOptionsSchema = z
    .object({
    dimensions: z
        .string()
        .optional()
        .describe(`Card dimensions, and it must be valid for the chosen format. ` +
        `Presentation: ${GAMMA_CARD_DIMENSIONS.PRESENTATION.join(", ")}. ` +
        `Document: ${GAMMA_CARD_DIMENSIONS.DOCUMENT.join(", ")}. ` +
        `Social: ${GAMMA_CARD_DIMENSIONS.SOCIAL.join(", ")}. ` +
        `A mismatch is silently replaced with a default and reported in warnings.`),
    headerFooter: headerFooterSchema.optional(),
})
    .describe("Card layout options");
export const sharingOptionsSchema = z
    .object({
    workspaceAccess: z
        .enum(GAMMA_SHARING_WORKSPACE_ACCESS)
        .optional()
        .describe(`Access for workspace members (${GAMMA_SHARING_WORKSPACE_ACCESS.join(" | ")})`),
    externalAccess: z
        .enum(GAMMA_SHARING_EXTERNAL_ACCESS)
        .optional()
        .describe(`Access for people outside the workspace (${GAMMA_SHARING_EXTERNAL_ACCESS.join(" | ")})`),
    emailOptions: z
        .object({
        recipients: z.array(z.string()).describe("Email addresses to share with"),
        access: z
            .enum(GAMMA_SHARING_EMAIL_ACCESS)
            .optional()
            .describe(`Recipient access level (${GAMMA_SHARING_EMAIL_ACCESS.join(" | ")})`),
    })
        .optional()
        .describe("Share with specific people by email"),
})
    .describe("Sharing and permissions. Omitted fields fall back to the workspace default.");
/** Shared scalar fields used by more than one generation tool. */
export const titleSchema = z
    .string()
    .min(1)
    .max(500)
    .describe("Title for the generated Gamma. Inferred from the content if omitted.");
export const folderIdsSchema = z
    .array(z.string())
    .max(1)
    .describe("Folder to place the result in. The API accepts at most one folder ID.");
export const additionalInstructionsSchema = z
    .string()
    .max(5_000)
    .describe("Extra guidance for the generator. Max 5,000 characters.");
export const inputTextSchema = z
    .string()
    .min(1)
    .max(400_000)
    .describe("Content to generate from: a topic, an outline, or a full draft. Max 400,000 characters.");
/** One entry in a multi-page generation. */
export const pageSchema = z.object({
    inputText: inputTextSchema,
    title: titleSchema.optional(),
    path: z
        .string()
        .min(1)
        .max(500)
        .optional()
        .describe("URL slug for this page, e.g. '/pricing'. Honored for pages after the first; " +
        "the first page is the File's main page. Derived from the title when omitted."),
    additionalInstructions: additionalInstructionsSchema.optional(),
    textMode: z
        .enum(GAMMA_TEXT_MODES)
        .optional()
        .describe(`How to treat this page's inputText (${GAMMA_TEXT_MODES.join(" | ")})`),
    format: z
        .enum(GAMMA_FORMATS)
        .optional()
        .describe(`Output type for this page (${GAMMA_FORMATS.join(" | ")})`),
    numCards: z.number().int().min(1).max(75).optional().describe("Cards for this page"),
    cardSplit: z
        .enum(GAMMA_CARD_SPLIT)
        .optional()
        .describe(`How this page's content is divided (${GAMMA_CARD_SPLIT.join(" | ")})`),
    textOptions: textOptionsSchema.optional(),
    imageOptions: imageOptionsSchema.optional(),
});
