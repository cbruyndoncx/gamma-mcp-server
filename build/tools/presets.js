/**
 * Opinionated presets.
 *
 * These are this server's own additions - Gamma's official MCP server has no
 * equivalent. They exist so a caller can ask for "an executive deck" without
 * restating the same dozen parameters each time.
 */
import { z } from "zod";
import { generatePresentation } from "../api/generations.js";
import { formatGenerationResult, textResult } from "./format.js";
import { inputTextSchema } from "../schemas.js";
/** Shared by both presets. */
const EXECUTIVE_TEXT = {
    tone: "professional and confident",
    audience: "executives and senior leadership",
};
const EXECUTIVE_IMAGES = {
    source: "aiGenerated",
    style: "photorealistic",
};
export function registerGenerateExecutivePresentationTool(server) {
    server.tool("generate-executive-presentation", "Generate an executive presentation: 16x9 PPTX, condensed text, photorealistic images, theme logo and card numbers in the footer.", {
        inputText: inputTextSchema.describe("Markdown slide outline for the executive presentation."),
        themeId: z
            .string()
            .optional()
            .describe("Optional theme ID. Defaults to the workspace theme. Use get-themes to look one up."),
    }, async (params) => {
        const executiveParams = {
            inputText: params.inputText,
            format: "presentation",
            textMode: "condense",
            exportAs: "pptx",
            cardSplit: "inputTextBreaks",
            textOptions: { amount: "medium", ...EXECUTIVE_TEXT },
            imageOptions: { ...EXECUTIVE_IMAGES },
            cardOptions: {
                dimensions: "16x9",
                headerFooter: {
                    bottomLeft: { type: "image", source: "themeLogo", size: "sm" },
                    bottomRight: { type: "cardNumber" },
                    hideFromFirstCard: true,
                    hideFromLastCard: false,
                },
            },
        };
        if (params.themeId)
            executiveParams.themeId = params.themeId;
        const result = await generatePresentation(executiveParams);
        return formatGenerationResult(result, "Executive presentation", "Format: Professional PPTX with condensed text, photorealistic images, and executive-focused tone.");
    });
}
/**
 * Estimate how many A4 pages a body of text needs.
 *
 * ~1000 characters per page for detailed reports. The v1.0 API documents
 * numCards as a plain integer, 1-75 on Pro and above.
 *
 * An earlier version rounded to multiples of 5 above 15 and capped at 60; no
 * such rule appears in the current spec, so it was removed.
 *
 * TODO(verify): confirm with one live call using numCards: 23. If the API
 * returns a 400, the stepping rule is real but undocumented - restore it here
 * and record the constraint in this comment.
 */
export function estimateReportCards(contentText) {
    const estimated = Math.ceil(contentText.trim().length / 1000);
    return Math.min(75, Math.max(1, estimated));
}
export function registerGenerateExecutiveReportTool(server) {
    server.tool("generate-executive-report", "Generate a detailed executive report as an A4 PDF: preserves your exact text, detailed formatting, photorealistic images. Provide either inputText or filePath.", {
        inputText: inputTextSchema
            .optional()
            .describe("Report content, Markdown supported. Either this or filePath is required."),
        filePath: z
            .string()
            .optional()
            .describe("Path to a file holding the report content. Either this or inputText is required."),
        themeId: z
            .string()
            .optional()
            .describe("Optional theme ID. Defaults to the workspace theme. Use get-themes to look one up."),
    }, async (params) => {
        let contentText = params.inputText || "";
        if (params.filePath) {
            try {
                const fs = await import("fs/promises");
                contentText = await fs.readFile(params.filePath, "utf-8");
            }
            catch (err) {
                return textResult(`Failed to read file at ${params.filePath}: ${err?.message || err}`);
            }
        }
        if (!contentText.trim()) {
            return textResult("Error: provide either inputText or filePath with non-empty content.");
        }
        const reportParams = {
            inputText: contentText,
            format: "document",
            textMode: "preserve",
            numCards: estimateReportCards(contentText),
            cardSplit: "auto",
            exportAs: "pdf",
            cardOptions: {
                dimensions: "a4",
                headerFooter: {
                    topLeft: { type: "image", source: "themeLogo", size: "sm" },
                    bottomRight: { type: "cardNumber" },
                    hideFromFirstCard: true,
                    hideFromLastCard: false,
                },
            },
            textOptions: { amount: "detailed", ...EXECUTIVE_TEXT },
            imageOptions: { ...EXECUTIVE_IMAGES },
        };
        if (params.themeId)
            reportParams.themeId = params.themeId;
        const result = await generatePresentation(reportParams);
        return formatGenerationResult(result, "Executive report", "Format: A4 PDF with preserved text content, detailed formatting, photorealistic images, and executive-focused professional tone.");
    });
}
