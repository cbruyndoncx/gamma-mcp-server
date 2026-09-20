/**
 * Workspace discovery endpoints: themes and folders.
 *
 * These exist so a caller can look an ID up by name instead of copying it out
 * of the Gamma app by hand.
 */

import { apiRequest } from "./client.js";
import type {
  GammaThemeItem,
  GammaFolderItem,
  GammaListResponse,
  GammaThemeType,
} from "../types.js";

export interface ListThemesParams {
  /** Substring match on the theme name. */
  query?: string;
  type?: GammaThemeType;
  limit?: number;
  after?: string;
}

export interface ListFoldersParams {
  query?: string;
  limit?: number;
  after?: string;
}

/** GET /themes */
export async function listThemes(
  params: ListThemesParams = {}
): Promise<GammaListResponse<GammaThemeItem>> {
  return apiRequest<GammaListResponse<GammaThemeItem>>("/themes", {
    query: {
      query: params.query,
      type: params.type,
      limit: params.limit,
      after: params.after,
    },
  });
}

/** GET /folders */
export async function listFolders(
  params: ListFoldersParams = {}
): Promise<GammaListResponse<GammaFolderItem>> {
  return apiRequest<GammaListResponse<GammaFolderItem>>("/folders", {
    query: {
      query: params.query,
      limit: params.limit,
      after: params.after,
    },
  });
}
