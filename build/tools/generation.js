/**
 * The general-purpose generation tool.
 */
import { z } from "zod";
import { generatePresentation } from "../api/generations.js";
import { formatGenerationResult } from "./format.js";
import { inputTextSchema, titleSchema, additionalInstructionsSchema, folderIdsSchema, textOptionsSchema, imageOptionsSchema, cardOptionsSchema, } from "../schemas.js";
import { GAMMA_TEXT_MODES, GAMMA_FORMATS, GAMMA_EXPORT_FORMATS, GAMMA_CARD_SPLIT, } from "../constants.js";
export function registerGeneratePresentationTool(server) {
    server.tool("generate-presentation", "Generate a presentation, document, social post or webpage using the Gamma API. Blocks until generation completes and returns a link.", {
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
        additionalInstructions: additionalInstructionsSchema.optional(),
        folderIds: folderIdsSchema.optional(),
        themeId: z.string().optional().describe("Theme ID. Defaults to the workspace theme."),
    }, async (params) => {
        const normalizedParams = {
            ...params,
            textMode: params.textMode || "generate",
        };
        const result = await generatePresentation(normalizedParams);
        return formatGenerationResult(result, "Presentation");
    });
}
