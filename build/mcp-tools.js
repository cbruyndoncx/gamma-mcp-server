/**
 * MCP Tools for Gamma Presentation Generation
 */
import { z } from "zod";
import { generatePresentation, getPresentationAssets } from "./gamma-api.js";
import { GAMMA_TEXT_MODES, GAMMA_TEXT_AMOUNTS, GAMMA_FORMATS, GAMMA_EXPORT_FORMATS, GAMMA_CARD_SPLIT, GAMMA_IMAGE_SOURCES, GAMMA_CARD_DIMENSIONS, GAMMA_HEADER_FOOTER_TYPES, GAMMA_HEADER_FOOTER_POSITIONS, GAMMA_HEADER_FOOTER_IMAGE_SOURCES, GAMMA_HEADER_FOOTER_SIZES, } from "./constants.js";
/**
 * Render a generation result as MCP text content.
 *
 * Surfaces the two things the v1.0 API returns that used to be dropped on the
 * floor: `warnings` (how Gamma reports a parameter it silently ignored) and
 * `credits`. The export URL is unauthenticated and expires in about a week, so
 * it is labelled as a secret and never written to the server log.
 */
function formatGenerationResult(result, label, successNote) {
    const lines = [];
    if (result.url) {
        lines.push(`${label} generated! View it here: ${result.url}`);
        if (successNote)
            lines.push("", successNote);
    }
    else if (result.generationId) {
        lines.push(`${label} created (id=${result.generationId}) but no final URL is available yet.`, `Use get-presentation-assets with this generationId to check again.`, `Status: ${result.error || "unknown"}`);
    }
    else {
        lines.push(`Failed to generate ${label.toLowerCase()}. Error: ${result.error || "Unknown error."}`);
    }
    if (result.gammaId)
        lines.push("", `Gamma ID: ${result.gammaId}`);
    if (result.exportUrl) {
        lines.push("", `Export: ${result.exportUrl}`, `(This link expires in about a week and is not tied to your API key - treat it as a secret.)`);
    }
    if (result.credits) {
        lines.push("", `Credits: ${result.credits.deducted} used, ${result.credits.remaining} remaining.`);
    }
    if (result.warnings) {
        lines.push("", `Warnings from Gamma: ${result.warnings}`);
    }
    return { content: [{ type: "text", text: lines.join("\n") }] };
}
/**
 * Register the generate-presentation tool
 */
export function registerGeneratePresentationTool(server) {
    server.tool("generate-presentation", "Generate a presentation using the Gamma API. The response will include a link to the generated presentation when available.", {
        inputText: z
            .string()
            .min(1)
            .max(400_000)
            .describe("The topic or prompt for the presentation. Max 400,000 characters."),
        textMode: z
            .enum(GAMMA_TEXT_MODES)
            .optional()
            .describe(`Text mode for Gamma API (${GAMMA_TEXT_MODES.join(" | ")}).`),
        format: z
            .enum(GAMMA_FORMATS)
            .optional()
            .describe(`Format to create (${GAMMA_FORMATS.join(" | ")}).`),
        numCards: z
            .number()
            .min(1)
            .max(75)
            .optional()
            .describe("Number of slides/cards to generate."),
        exportAs: z
            .enum(GAMMA_EXPORT_FORMATS)
            .optional()
            .describe(`If set, request a direct export: ${GAMMA_EXPORT_FORMATS.map(f => `'${f}'`).join(" or ")}. ` +
            `Only one format per generation. 'png' returns a .zip with one PNG per card, not a single image.`),
        textOptions: z
            .object({
            amount: z.enum(GAMMA_TEXT_AMOUNTS).optional().describe(`Text amount (${GAMMA_TEXT_AMOUNTS.join(" | ")})`),
            tone: z.string().max(500).optional().describe("Tone/voice of the content (e.g., 'professional and confident')"),
            audience: z.string().max(500).optional().describe("Target audience (e.g., 'investors and venture capitalists')"),
            language: z.string().optional().describe("Output language code (e.g., 'en', 'es')"),
        })
            .optional()
            .describe("Text generation options for content customization"),
        imageOptions: z
            .object({
            source: z.enum(GAMMA_IMAGE_SOURCES).optional().describe(`Image source (${GAMMA_IMAGE_SOURCES.join(" | ")})`),
            model: z.string().optional().describe("AI model for image generation (e.g., 'dall-e-3')"),
            style: z.string().max(5_000).optional().describe("Visual style for images (e.g., 'photorealistic', 'minimalist')"),
        })
            .optional()
            .describe("Image generation and sourcing options"),
        cardOptions: z
            .object({
            dimensions: z.string().optional().describe(`Card dimensions. Presentation: ${GAMMA_CARD_DIMENSIONS.PRESENTATION.join(", ")}. ` +
                `Document: ${GAMMA_CARD_DIMENSIONS.DOCUMENT.join(", ")}. ` +
                `Social: ${GAMMA_CARD_DIMENSIONS.SOCIAL.join(", ")}`),
            headerFooter: z.object({
                topLeft: z.object({
                    type: z.enum(GAMMA_HEADER_FOOTER_TYPES),
                    value: z.string().optional(),
                    source: z.enum(GAMMA_HEADER_FOOTER_IMAGE_SOURCES).optional(),
                    src: z.string().optional(),
                    size: z.enum(GAMMA_HEADER_FOOTER_SIZES).optional(),
                }).optional(),
                topRight: z.object({
                    type: z.enum(GAMMA_HEADER_FOOTER_TYPES),
                    value: z.string().optional(),
                    source: z.enum(GAMMA_HEADER_FOOTER_IMAGE_SOURCES).optional(),
                    src: z.string().optional(),
                    size: z.enum(GAMMA_HEADER_FOOTER_SIZES).optional(),
                }).optional(),
                topCenter: z.object({
                    type: z.enum(GAMMA_HEADER_FOOTER_TYPES),
                    value: z.string().optional(),
                    source: z.enum(GAMMA_HEADER_FOOTER_IMAGE_SOURCES).optional(),
                    src: z.string().optional(),
                    size: z.enum(GAMMA_HEADER_FOOTER_SIZES).optional(),
                }).optional(),
                bottomLeft: z.object({
                    type: z.enum(GAMMA_HEADER_FOOTER_TYPES),
                    value: z.string().optional(),
                    source: z.enum(GAMMA_HEADER_FOOTER_IMAGE_SOURCES).optional(),
                    src: z.string().optional(),
                    size: z.enum(GAMMA_HEADER_FOOTER_SIZES).optional(),
                }).optional(),
                bottomRight: z.object({
                    type: z.enum(GAMMA_HEADER_FOOTER_TYPES),
                    value: z.string().optional(),
                    source: z.enum(GAMMA_HEADER_FOOTER_IMAGE_SOURCES).optional(),
                    src: z.string().optional(),
                    size: z.enum(GAMMA_HEADER_FOOTER_SIZES).optional(),
                }).optional(),
                bottomCenter: z.object({
                    type: z.enum(GAMMA_HEADER_FOOTER_TYPES),
                    value: z.string().optional(),
                    source: z.enum(GAMMA_HEADER_FOOTER_IMAGE_SOURCES).optional(),
                    src: z.string().optional(),
                    size: z.enum(GAMMA_HEADER_FOOTER_SIZES).optional(),
                }).optional(),
                hideFromFirstCard: z.boolean().optional(),
                hideFromLastCard: z.boolean().optional(),
            }).optional().describe(`Header/footer configuration. Positions: ${GAMMA_HEADER_FOOTER_POSITIONS.join(", ")}. ` +
                `Element types: ${GAMMA_HEADER_FOOTER_TYPES.join(", ")}. ` +
                `Image sources: ${GAMMA_HEADER_FOOTER_IMAGE_SOURCES.join(", ")}. ` +
                `Sizes: ${GAMMA_HEADER_FOOTER_SIZES.join(", ")}`),
        })
            .optional()
            .describe("Card/slide layout options including dimensions and header/footer"),
        additionalInstructions: z
            .string()
            .max(5_000)
            .optional()
            .describe("Extra guidance for the generator. Max 5,000 characters."),
        folderIds: z
            .array(z.string())
            .max(1)
            .optional()
            .describe("Folder to place the result in. The API accepts at most one folder ID."),
        cardSplit: z.enum(GAMMA_CARD_SPLIT).optional().describe(`Card split mode (${GAMMA_CARD_SPLIT.join(" | ")})`),
        themeId: z.string().optional(),
    }, async (params) => {
        // Normalize textMode
        const normalizedParams = {
            ...params,
            textMode: params.textMode || "generate",
        };
        const result = await generatePresentation(normalizedParams);
        return formatGenerationResult(result, "Presentation");
    });
}
/**
 * Register the generate-executive-presentation convenience tool
 * Pre-configured for executive presentations with professional defaults
 */
export function registerGenerateExecutivePresentationTool(server) {
    server.tool("generate-executive-presentation", "You MUST use this to generate an executive presentation.", {
        inputText: z.string().describe("Markdown slide outline for the executive presentation."),
        themeId: z.string().optional().describe("Optional theme ID. If not provided, uses workspace default."),
    }, async (params) => {
        // Build request with executive-focused defaults
        const executiveParams = {
            inputText: params.inputText,
            format: "presentation",
            textMode: "condense",
            exportAs: "pptx",
            cardSplit: "inputTextBreaks",
            textOptions: {
                amount: "medium",
                tone: "professional and confident",
                audience: "executives and senior leadership",
            },
            imageOptions: {
                source: "aiGenerated",
                style: "photorealistic",
            },
            cardOptions: {
                dimensions: "16x9",
                headerFooter: {
                    bottomLeft: {
                        type: "image",
                        source: "themeLogo",
                        size: "sm"
                    },
                    bottomRight: {
                        type: "cardNumber",
                    },
                    hideFromFirstCard: true,
                    hideFromLastCard: false
                }
            }
        };
        // Add optional theme to override default workspace my themeId: "8swvg4jprrkqbfw"
        if (params.themeId) {
            executiveParams.themeId = params.themeId;
        }
        const result = await generatePresentation(executiveParams);
        return formatGenerationResult(result, "Executive presentation", "Format: Professional PPTX with condensed text, photorealistic images, and executive-focused tone.");
    });
}
/**
 * Register the generate-executive-report convenience tool
 * Pre-configured for detailed A4 PDF reports with professional defaults
 */
export function registerGenerateExecutiveReportTool(server) {
    server.tool("generate-executive-report", "Generate a detailed executive report as A4 PDF with professional defaults: preserves exact text content, detailed amount, professional tone for executives, photorealistic AI images, A4 format, exports to PDF. Provide either inputText or filePath.", {
        inputText: z.string().optional().describe("The content for the executive report. Markdown formatting supported. Either this or filePath is required."),
        filePath: z.string().optional().describe("Path to a file containing the report content. If provided, file content will be used as inputText. Either this or inputText is required."),
        themeId: z.string().optional().describe("Optional theme ID. If not provided, uses workspace default. Use 'linen' theme for a professional look."),
    }, async (params) => {
        // Read file content if filePath is provided
        let contentText = params.inputText || "";
        if (params.filePath) {
            try {
                const fs = await import("fs/promises");
                contentText = await fs.readFile(params.filePath, "utf-8");
            }
            catch (err) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Failed to read file at ${params.filePath}: ${err.message || err}`,
                        },
                    ],
                };
            }
        }
        // Validate that we have content
        if (!contentText || contentText.trim().length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Error: Either inputText or filePath must be provided with non-empty content.",
                    },
                ],
            };
        }
        // Estimate ~1000 characters per A4 page for detailed reports.
        //
        // The v1.0 API documents numCards as a plain integer, 1-75 on Pro and
        // above. An earlier version of this code rounded to multiples of 5 above
        // 15 and capped at 60; no such rule appears in the current docs, so it
        // was removed.
        //
        // TODO(verify): confirm with one live call using numCards: 23. If the
        // API returns a 400, the stepping rule is real but undocumented -
        // restore it here and record the constraint in this comment.
        const estimatedCards = Math.ceil(contentText.trim().length / 1000);
        const numberOfCards = Math.min(75, Math.max(1, estimatedCards));
        // Build request with executive report defaults
        const reportParams = {
            inputText: contentText,
            format: "document",
            textMode: "preserve", // Preserve exact text content
            numCards: numberOfCards,
            cardSplit: "auto",
            exportAs: "pdf",
            cardOptions: {
                dimensions: "a4", // A4 document format
                headerFooter: {
                    topLeft: {
                        type: "image",
                        source: "themeLogo",
                        size: "sm"
                    },
                    bottomRight: {
                        type: "cardNumber",
                    },
                    hideFromFirstCard: true,
                    hideFromLastCard: false
                }
            },
            textOptions: {
                amount: "detailed", // Detailed content for reports
                tone: "professional and confident",
                audience: "executives and senior leadership",
            },
            imageOptions: {
                source: "aiGenerated",
                style: "photorealistic",
            },
        };
        // Add optional theme to overwrite workspace default themeId: "8swvg4jprrkqbfw"
        if (params.themeId) {
            reportParams.themeId = params.themeId;
        }
        const result = await generatePresentation(reportParams);
        return formatGenerationResult(result, "Executive report", "Format: A4 PDF with preserved text content, detailed formatting, photorealistic images, and executive-focused professional tone.");
    });
}
/**
 * Register the get-presentation-assets tool
 */
export function registerGetPresentationAssetsTool(server) {
    server.tool("get-presentation-assets", "Given a generationId, return its status and the single export URL if one was requested (the Gamma API permits only one exportAs per generation), and optionally download it to the MCP server host. Export URLs expire after about a week and are not tied to your API key.", {
        generationId: z.string().describe("The generationId returned by the Gamma generate API."),
        download: z
            .boolean()
            .optional()
            .describe("If true, download the export and return the local file path."),
    }, async (params) => {
        const { generationId, download } = params;
        try {
            const result = await getPresentationAssets(generationId, download);
            return {
                content: [
                    {
                        type: "resource",
                        resource: {
                            text: JSON.stringify(result),
                            uri: "",
                            mimeType: "application/json",
                        },
                    },
                ],
            };
        }
        catch (err) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error fetching generation: ${err.message || err}`,
                    },
                ],
            };
        }
    });
}
/**
 * Register all MCP tools
 */
export function registerAllTools(server) {
    registerGeneratePresentationTool(server);
    registerGenerateExecutivePresentationTool(server);
    registerGenerateExecutiveReportTool(server);
    registerGetPresentationAssetsTool(server);
}
