/**
 * Workspace discovery tools.
 *
 * Parameter names follow Gamma's official MCP server (`name` for the search
 * term), with the REST endpoint's pagination and filtering added on top.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listThemes, listFolders } from "../api/workspace.js";
import { textResult, jsonResult } from "./format.js";
import type { GammaThemeType } from "../types.js";

export function registerGetThemesTool(server: McpServer): void {
  server.tool(
    "get_themes",
    "Browse or search the workspace theme library, including custom themes. Use the returned id as themeId on a generation tool. If the user names a theme, search by name; otherwise list them and choose on tone and colour keywords.",
    {
      name: z.string().optional().describe("Search themes by name."),
      type: z
        .enum(["standard", "custom"])
        .optional()
        .describe("Filter to built-in ('standard') or workspace ('custom') themes."),
      limit: z.number().int().min(1).max(50).optional().describe("Max results, up to 50."),
      after: z.string().optional().describe("Cursor from a previous response."),
    },
    async ({ name, type, limit, after }) => {
      try {
        const response = await listThemes({
          query: name,
          type: type as GammaThemeType | undefined,
          limit,
          after,
        });

        return jsonResult({
          themes: response.data,
          count: response.data.length,
          hasMore: response.hasMore,
          nextCursor: response.nextCursor,
        });
      } catch (err: any) {
        return textResult(`Error listing themes: ${err?.message || err}`);
      }
    }
  );
}

export function registerGetFoldersTool(server: McpServer): void {
  server.tool(
    "get_folders",
    "Browse or search the folders you are a member of. Use the returned id as folderIds on a generation tool. You must be a member of a folder to put gammas in it.",
    {
      name: z.string().optional().describe("Search folders by name."),
      limit: z.number().int().min(1).max(50).optional().describe("Max results, up to 50."),
      after: z.string().optional().describe("Cursor from a previous response."),
    },
    async ({ name, limit, after }) => {
      try {
        const response = await listFolders({ query: name, limit, after });

        return jsonResult({
          folders: response.data,
          count: response.data.length,
          hasMore: response.hasMore,
          nextCursor: response.nextCursor,
        });
      } catch (err: any) {
        return textResult(`Error listing folders: ${err?.message || err}`);
      }
    }
  );
}
