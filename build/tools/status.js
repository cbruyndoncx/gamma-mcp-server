/**
 * Generation status and export download.
 *
 * `get_generation_status` matches Gamma's official MCP tool of the same name.
 * `download_export` is this server's own addition - the official server has no
 * equivalent, since it cannot write to the caller's filesystem.
 */
import { z } from "zod";
import { getPresentationAssets } from "../api/generations.js";
import { textResult } from "./format.js";
const EXPORT_URL_CAVEAT = "Export URLs expire after about a week and are not tied to your API key - anyone with the link can download the file, so treat it as a secret.";
export function registerGetGenerationStatusTool(server) {
    server.tool("get_generation_status", `Check the status of a generation started by generate, generate_multi_page_gamma or generate_from_template. Returns status, gammaUrl, gammaId, exportUrl and credit usage. Poll until status is completed or failed. ${EXPORT_URL_CAVEAT}`, {
        generationId: z.string().describe("The generationId returned by a generate tool."),
    }, async ({ generationId }) => {
        try {
            const result = await getPresentationAssets(generationId, false);
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
            return textResult(`Error fetching generation ${generationId}: ${err?.message || err}`);
        }
    });
}
export function registerDownloadExportTool(server) {
    server.tool("download_export", `Download a completed generation's export to the machine running this MCP server, and return the local file path. The generation must have been created with exportAs set. Set GAMMA_DOWNLOAD_DIR to choose the destination (defaults to /tmp). ${EXPORT_URL_CAVEAT}`, {
        generationId: z.string().describe("The generationId whose export should be downloaded."),
    }, async ({ generationId }) => {
        try {
            const result = await getPresentationAssets(generationId, true);
            if (!result.exportUrl) {
                return textResult(`Generation ${generationId} has no export. Its status is '${result.status}'. ` +
                    `An export only exists if the generation was created with exportAs set; ` +
                    `otherwise use export_gamma on the finished gamma.`);
            }
            if (result.download?.error) {
                return textResult(`Download failed: ${result.download.error}`);
            }
            return textResult(`Export downloaded to ${result.download?.path}`);
        }
        catch (err) {
            return textResult(`Error downloading export for ${generationId}: ${err?.message || err}`);
        }
    });
}
