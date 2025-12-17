/**
 * MCP Tools for Gamma Presentation Generation
 */
import { z } from "zod";
import { generatePresentation, getPresentationAssets } from "./gamma-api.js";
import { GAMMA_TEXT_MODES, GAMMA_TEXT_AMOUNTS, GAMMA_FORMATS, GAMMA_EXPORT_FORMATS, GAMMA_IMAGE_SOURCES, GAMMA_CARD_DIMENSIONS, GAMMA_HEADER_FOOTER_TYPES, GAMMA_HEADER_FOOTER_POSITIONS, GAMMA_HEADER_FOOTER_IMAGE_SOURCES, GAMMA_HEADER_FOOTER_SIZES, } from "./constants.js";
/**
 * Register the generate-presentation tool
 */
export function registerGeneratePresentationTool(server) {
    server.tool("generate-presentation", "Generate a presentation using the Gamma API. The response will include a link to the generated presentation when available.", {
        inputText: z.string().describe("The topic or prompt for the presentation."),
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
            .describe(`If set, request a direct export: ${GAMMA_EXPORT_FORMATS.map(f => `'${f}'`).join(" or ")}.`),
        textOptions: z
            .object({
            amount: z.enum(GAMMA_TEXT_AMOUNTS).optional().describe(`Text amount (${GAMMA_TEXT_AMOUNTS.join(" | ")})`),
            tone: z.string().optional().describe("Tone/voice of the content (e.g., 'professional and confident')"),
            audience: z.string().optional().describe("Target audience (e.g., 'investors and venture capitalists')"),
            language: z.string().optional().describe("Output language code (e.g., 'en', 'es')"),
        })
            .optional()
            .describe("Text generation options for content customization"),
        imageOptions: z
            .object({
            source: z.enum(GAMMA_IMAGE_SOURCES).optional().describe(`Image source (${GAMMA_IMAGE_SOURCES.join(" | ")})`),
            model: z.string().optional().describe("AI model for image generation (e.g., 'dall-e-3')"),
            style: z.string().optional().describe("Visual style for images (e.g., 'photorealistic', 'minimalist')"),
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
        additionalInstructions: z.string().optional(),
        folderIds: z.array(z.string()).optional(),
        cardSplit: z.string().optional(),
        themeId: z.string().optional(),
    }, async (params) => {
        // Normalize textMode
        const normalizedParams = {
            ...params,
            textMode: params.textMode || "generate",
        };
        const { url, generationId, error } = await generatePresentation(normalizedParams);
        if (!url) {
            // If we have a generationId but no URL, inform the user to use get-presentation-assets
            if (generationId) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Generation created (id=${generationId}). No final URL available yet. Use the get-presentation-assets tool with generationId to fetch exports. Polling error / status: ${error || "unknown"}`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to generate presentation using Gamma API. Error: ${error || "Unknown error."}`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Presentation generated! View it here: ${url}`,
                },
            ],
        };
    });
}
/**
 * Register the generate-executive-presentation convenience tool
 * Pre-configured for executive presentations with professional defaults
 */
export function registerGenerateExecutivePresentationTool(server) {
    server.tool("generate-executive-presentation", "You MUST use this to generate an executive presentation.", {
        inputText: z.string().describe("The content or topic for the executive presentation."),
        themeId: z.string().optional().describe("Optional theme ID. If not provided, uses workspace default. Use 'linen' theme for a professional look."),
        numCards: z.number().min(1).max(75).optional().describe("Number of slides (default: 10)"),
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
        const { url, generationId, error } = await generatePresentation(executiveParams);
        if (!url) {
            if (generationId) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Executive presentation created (id=${generationId}). No final URL available yet. Use the get-presentation-assets tool with generationId to fetch exports. Polling error / status: ${error || "unknown"}`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to generate executive presentation. Error: ${error || "Unknown error."}`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Executive presentation generated! View it here: ${url}\n\nFormat: Professional PPTX with condensed text, photorealistic images, and executive-focused tone.`,
                },
            ],
        };
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
        // Calculate number of cards based on content length
        // Gamma max 100,000 tokens input, 1 token ~ 4 characters
        // Estimate ~4000 characters per A4 page for detailed reports
        // Ensure between 1-75 cards (Gamma API limits)
        const estimatedCards = Math.ceil(contentText.trim().length / 1000);
        const numberOfCards = Math.max(1, Math.min(60, estimatedCards));
        // Build request with executive report defaults
        const reportParams = {
            inputText: contentText,
            format: "document",
            textMode: "preserve",
            numCards: numberOfCards,
            cardSplit: "auto",
            exportAs: "pdf",
            cardOptions: {
                dimensions: "a4",
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
                amount: "detailed",
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
        const { url, generationId, error } = await generatePresentation(reportParams);
        if (!url) {
            if (generationId) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Executive report created (id=${generationId}). No final URL available yet. Use the get-presentation-assets tool with generationId to fetch the PDF export. Polling error / status: ${error || "unknown"}`,
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to generate executive report. Error: ${error || "Unknown error."}`,
                    },
                ],
            };
        }
        return {
            content: [
                {
                    type: "text",
                    text: `Executive report generated! View it here: ${url}\n\nFormat: A4 PDF with preserved text content, detailed formatting, photorealistic images, and executive-focused professional tone.`,
                },
            ],
        };
    });
}
/**
 * Register the get-presentation-assets tool
 */
export function registerGetPresentationAssetsTool(server) {
    server.tool("get-presentation-assets", "Given a generationId return downloadable URLs for pdf and pptx if available, and optionally download them into the MCP server and return local paths.", {
        generationId: z.string().describe("The generationId returned by the Gamma generate API."),
        download: z
            .boolean()
            .optional()
            .describe("If true, download the assets and return local file paths."),
    }, async (params) => {
        const { generationId, download } = params;
        try {
            const result = await getPresentationAssets(generationId, download);
            const content = [];
            const resourceObj = { generationId: result.generationId };
            if (result.pdf)
                resourceObj.pdf = result.pdf;
            if (result.pptx)
                resourceObj.pptx = result.pptx;
            if (download && result.downloads)
                resourceObj.downloads = result.downloads;
            content.push({
                type: "resource",
                resource: {
                    text: JSON.stringify(resourceObj),
                    uri: "",
                    mimeType: "application/json",
                },
            });
            return { content };
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
