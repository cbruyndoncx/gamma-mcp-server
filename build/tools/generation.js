/**
 * The general-purpose generation tool.
 */
import { z } from "zod";
import { generatePresentation, generateMultiPage, generateFromTemplate, } from "../api/generations.js";
import { formatGenerationResult } from "./format.js";
import { inputTextSchema, titleSchema, additionalInstructionsSchema, folderIdsSchema, textOptionsSchema, imageOptionsSchema, cardOptionsSchema, sharingOptionsSchema, pageSchema, } from "../schemas.js";
import { GAMMA_TEXT_MODES, GAMMA_FORMATS, GAMMA_EXPORT_FORMATS, GAMMA_CARD_SPLIT, } from "../constants.js";
export function registerGenerateTool(server) {
    server.tool("generate", "Create a presentation, document, webpage or social post from scratch with the Gamma API. Waits for the generation to finish and returns a link, unless waitForCompletion is false.", {
        inputText: inputTextSchema,
        title: titleSchema.optional(),
        textMode: z
            .enum(GAMMA_TEXT_MODES)
            .optional()
            .describe(`How to treat inputText (${GAMMA_TEXT_MODES.join(" | ")}). ` +
            `'generate' expands it, 'condense' summarizes it, 'preserve' keeps it verbatim.`),
        format: z
            .enum(GAMMA_FORMATS)
            .optional()
            .describe(`Output type (${GAMMA_FORMATS.join(" | ")}). Defaults to presentation.`),
        numCards: z
            .number()
            .int()
            .min(1)
            .max(75)
            .optional()
            .describe("Number of cards to generate. Used when cardSplit is 'auto'. Defaults to 10."),
        cardSplit: z
            .enum(GAMMA_CARD_SPLIT)
            .optional()
            .describe(`How content is divided (${GAMMA_CARD_SPLIT.join(" | ")}). ` +
            `'inputTextBreaks' splits on \\n---\\n and ignores numCards.`),
        exportAs: z
            .enum(GAMMA_EXPORT_FORMATS)
            .optional()
            .describe(`Also export the result (${GAMMA_EXPORT_FORMATS.join(" | ")}). One format per generation. ` +
            `'png' returns a .zip with one PNG per card, not a single image.`),
        textOptions: textOptionsSchema.optional(),
        imageOptions: imageOptionsSchema.optional(),
        cardOptions: cardOptionsSchema.optional(),
        sharingOptions: sharingOptionsSchema.optional(),
        additionalInstructions: additionalInstructionsSchema.optional(),
        folderIds: folderIdsSchema.optional(),
        themeId: z
            .string()
            .optional()
            .describe("Theme ID from get-themes. Defaults to the workspace theme."),
        waitForCompletion: z
            .boolean()
            .optional()
            .describe("Wait for the generation to finish before returning (default true). " +
            "Set false to return a generationId immediately and poll get_generation_status yourself - " +
            "useful if your client times out on long tool calls."),
    }, async ({ waitForCompletion, ...params }) => {
        const normalizedParams = {
            ...params,
            textMode: params.textMode || "generate",
        };
        const result = await generatePresentation(normalizedParams, waitForCompletion !== false);
        return formatGenerationResult(result, "Gamma");
    });
}
export function registerGenerateMultiPageTool(server) {
    server.tool("generate_multi_page_gamma", "Create one Gamma containing several distinct pages under a single URL - for sales rooms, proposal sites, onboarding portals and microsites. Prefer 'generate' for a single presentation, document, webpage or social post. Cannot edit an existing Gamma.", {
        pages: z
            .array(pageSchema)
            .min(1)
            .max(50)
            .describe("Ordered list of pages, 1-50. Each becomes a page with its own deep link."),
        title: titleSchema.optional().describe("Title for the overall Gamma."),
        publish: z
            .boolean()
            .optional()
            .describe("Publish as a live multi-page site on a Gamma subdomain once all pages succeed."),
        themeId: z.string().optional().describe("Theme ID applied to every page."),
        folderIds: folderIdsSchema.optional(),
        cardOptions: cardOptionsSchema.optional().describe("Layout applied to every page."),
        sharingOptions: sharingOptionsSchema.optional(),
        exportAs: z
            .enum(GAMMA_EXPORT_FORMATS)
            .optional()
            .describe(`Export each page (${GAMMA_EXPORT_FORMATS.join(" | ")}). ` +
            `'png' returns a .zip with one PNG per card.`),
        waitForCompletion: z
            .boolean()
            .optional()
            .describe("Wait for generation to finish (default true)."),
    }, async ({ waitForCompletion, ...params }) => {
        const result = await generateMultiPage(params, waitForCompletion !== false);
        return formatGenerationResult(result, "Multi-page Gamma");
    });
}
export function registerGenerateFromTemplateTool(server) {
    server.tool("generate_from_template", "Create a new gamma by adapting, remixing or transforming an existing one used as a template. The template's structure is preserved unless the prompt asks otherwise. Use get_gammas with type 'template' to find a template ID.", {
        gammaId: z
            .string()
            .describe("File ID of the template gamma. This is the API file ID (often prefixed 'g_'), " +
            "not the slug from a gamma.app/docs/... URL. The template must contain exactly one page."),
        prompt: z
            .string()
            .min(1)
            .max(400_000)
            .describe("Instructions and/or content for the new gamma."),
        title: titleSchema.optional(),
        themeId: z.string().optional().describe("Theme ID from get-themes."),
        imageOptions: z
            .object({
            model: z.string().optional().describe("AI image model."),
            style: z.string().max(5_000).optional().describe("Style description for AI images."),
        })
            .optional()
            .describe("Image overrides for templates that use AI-generated images. " +
            "Templates accept only model and style - not source."),
        sharingOptions: sharingOptionsSchema.optional(),
        folderIds: folderIdsSchema.optional(),
        exportAs: z
            .enum(GAMMA_EXPORT_FORMATS)
            .optional()
            .describe(`Export format (${GAMMA_EXPORT_FORMATS.join(" | ")}).`),
        waitForCompletion: z
            .boolean()
            .optional()
            .describe("Wait for generation to finish (default true)."),
    }, async ({ waitForCompletion, ...params }) => {
        const result = await generateFromTemplate(params, waitForCompletion !== false);
        return formatGenerationResult(result, "Gamma from template");
    });
}
