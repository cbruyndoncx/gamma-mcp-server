/**
 * Gamma management tools: search, read, comments, export, archive, delete.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  searchGammas,
  searchTemplates,
  getGamma,
  getGammaComments,
  exportAndWait,
  getExportStatus,
  archiveGamma,
  deleteGamma,
} from "../api/management.js";
import { textResult, jsonResult } from "./format.js";
import { GAMMA_EXPORT_FORMATS } from "../constants.js";
import type { GammaExportFormat, GammaExportStatusResponse } from "../types.js";

const GAMMA_ID_DESC =
  "Gamma file ID or a full gamma.app/docs/... URL. The URL form is accepted and the ID extracted; " +
  "note the API wants the file ID, not the human-readable slug.";

export function registerGetGammasTool(server: McpServer): void {
  server.tool(
    "get_gammas",
    "Browse or search existing gammas and templates. Use type 'template' to find a template ID for generate_from_template.",
    {
      query: z.string().optional().describe("Full-text search over titles and body text."),
      type: z
        .enum(["all", "regular", "template"])
        .optional()
        .describe("Which to return. Defaults to all."),
      limit: z.number().int().min(1).max(50).optional().describe("Max results, up to 50."),
      includeArchived: z.boolean().optional().describe("Include archived gammas."),
      createdBy: z.string().optional().describe("Filter to a creator."),
      updatedAfter: z.string().optional().describe("ISO-8601 lower bound on last update."),
      updatedBefore: z.string().optional().describe("ISO-8601 upper bound on last update."),
    },
    async ({ query, type = "all", limit, includeArchived, createdBy, updatedAfter, updatedBefore }) => {
      const payload: Record<string, unknown> = {};

      try {
        if (type === "all" || type === "regular") {
          const result = await searchGammas({
            q: query,
            limit,
            includeArchived,
            createdBy,
            updatedAfter,
            updatedBefore,
          });
          payload.gammas = result.hits ?? [];
        }

        if (type === "all" || type === "template") {
          const result = await searchTemplates({ q: query, limit });
          payload.workspaceTemplates = result.workspaceTemplates ?? [];
          payload.exploreTemplates = result.exploreTemplates ?? [];
          if (result.workspaceDegraded) {
            payload.note =
              "Workspace template results fell back to last-edited order rather than relevance.";
          }
        }

        return jsonResult(payload);
      } catch (err: any) {
        if (err?.statusCode === 403) {
          return textResult(
            "Search is not enabled for this workspace yet. It is rolling out gradually - " +
              "contact support@gamma.app to request access. This is not an invalid API key."
          );
        }
        return textResult(`Error searching gammas: ${err?.message || err}`);
      }
    }
  );
}

export function registerReadGammaTool(server: McpServer): void {
  server.tool(
    "read_gamma",
    "Read an existing Gamma's metadata: title, type, URL, thumbnail, description, author and timestamps. " +
      "NOTE: the public REST API exposes metadata only - unlike Gamma's official MCP server, this cannot " +
      "return the card-by-card content of a gamma, because no public endpoint provides it.",
    {
      gammaIdOrUrl: z.string().describe(GAMMA_ID_DESC),
    },
    async ({ gammaIdOrUrl }) => {
      try {
        return jsonResult(await getGamma(gammaIdOrUrl));
      } catch (err: any) {
        return textResult(`Error reading gamma: ${err?.message || err}`);
      }
    }
  );
}

export function registerGetGammaCommentsTool(server: McpServer): void {
  server.tool(
    "get_gamma_comments",
    "List comment threads and replies on a Gamma, oldest activity first. Read-only, cursor-paginated.",
    {
      gammaIdOrUrl: z.string().describe(GAMMA_ID_DESC),
      limit: z.number().int().min(1).max(50).optional().describe("Max threads per page, up to 50."),
      after: z.string().optional().describe("Cursor from a previous response."),
      updatedSince: z
        .string()
        .optional()
        .describe("ISO-8601 timestamp; return only threads with activity since then."),
      includeArchived: z.boolean().optional().describe("Include deleted comments and replies."),
    },
    async ({ gammaIdOrUrl, ...params }) => {
      try {
        const response = await getGammaComments(gammaIdOrUrl, params);
        return jsonResult({
          comments: response.data,
          hasMore: response.hasMore,
          nextCursor: response.nextCursor,
        });
      } catch (err: any) {
        return textResult(`Error fetching comments: ${err?.message || err}`);
      }
    }
  );
}

function renderExportStatus(result: GammaExportStatusResponse): string {
  if (result.status === "completed" && result.exportUrl) {
    return [
      `Export ready (${result.exportAs}): ${result.exportUrl}`,
      result.exportAs === "png" ? "This is a .zip with one PNG per card." : "",
      "This link expires in about a week and is not tied to your API key - treat it as a secret.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (result.status === "failed") {
    const reason = result.error?.reason;
    const hint =
      reason === "deck_too_large"
        ? " The deck is too large to export; try exporting fewer cards."
        : reason === "render_timeout"
          ? " Rendering timed out; retrying may help."
          : "";
    return `Export failed${reason ? ` (${reason})` : ""}: ${result.error?.message || "unknown"}.${hint}`;
  }

  return `Export still pending (exportId=${result.exportId}). Poll get_export_status with this id.`;
}

export function registerExportGammaTool(server: McpServer): void {
  server.tool(
    "export_gamma",
    "Export an existing gamma to a downloadable file. Waits for the export to finish. The connected user needs view access, and archived gammas cannot be exported.",
    {
      gammaIdOrUrl: z.string().describe(GAMMA_ID_DESC),
      exportAs: z
        .enum(GAMMA_EXPORT_FORMATS)
        .describe(
          `Format (${GAMMA_EXPORT_FORMATS.join(" | ")}). 'png' returns a .zip with one PNG per card.`
        ),
    },
    async ({ gammaIdOrUrl, exportAs }) => {
      try {
        const result = await exportAndWait(gammaIdOrUrl, exportAs as GammaExportFormat);
        return textResult(renderExportStatus(result));
      } catch (err: any) {
        return textResult(`Error exporting gamma: ${err?.message || err}`);
      }
    }
  );
}

export function registerGetExportStatusTool(server: McpServer): void {
  server.tool(
    "get_export_status",
    "Check an export started by export_gamma and get the download link once ready.",
    {
      exportId: z.string().describe("The exportId returned by export_gamma."),
    },
    async ({ exportId }) => {
      try {
        return textResult(renderExportStatus(await getExportStatus(exportId)));
      } catch (err: any) {
        return textResult(`Error fetching export status: ${err?.message || err}`);
      }
    }
  );
}

export function registerArchiveGammaTool(server: McpServer): void {
  server.tool(
    "archive_gamma",
    "Archive a Gamma, removing it from the active workspace. Idempotent. Requires edit permission. Not available on Gamma's official MCP server.",
    {
      gammaIdOrUrl: z.string().describe(GAMMA_ID_DESC),
    },
    async ({ gammaIdOrUrl }) => {
      try {
        await archiveGamma(gammaIdOrUrl);
        return textResult(`Archived ${gammaIdOrUrl}.`);
      } catch (err: any) {
        if (err?.statusCode === 403) {
          return textResult(
            `Access denied archiving ${gammaIdOrUrl}. Common causes: the ID is a web app URL slug ` +
              `rather than the API file ID (which usually starts 'g_'), the gamma is in a different ` +
              `workspace than the API key, or the key owner lacks edit permission.`
          );
        }
        return textResult(`Error archiving gamma: ${err?.message || err}`);
      }
    }
  );
}

export function registerDeleteGammaTool(server: McpServer): void {
  server.tool(
    "delete_gamma",
    "PERMANENTLY DELETE a Gamma. This cannot be undone. Requires a workspace admin role on the API key's workspace. " +
      "Prefer archive_gamma unless the user has explicitly asked for permanent deletion. " +
      "Not available on Gamma's official MCP server.",
    {
      gammaIdOrUrl: z.string().describe(GAMMA_ID_DESC),
      confirmDelete: z
        .literal(true)
        .describe("Must be exactly true. A guard against accidental deletion."),
    },
    async ({ gammaIdOrUrl }) => {
      try {
        await deleteGamma(gammaIdOrUrl);
        return textResult(`Permanently deleted ${gammaIdOrUrl}.`);
      } catch (err: any) {
        if (err?.statusCode === 403) {
          return textResult(
            `Access denied. DELETE requires a workspace admin role on the API key's workspace.`
          );
        }
        return textResult(`Error deleting gamma: ${err?.message || err}`);
      }
    }
  );
}
