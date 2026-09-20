/**
 * Workspace discovery endpoints: themes and folders.
 *
 * These exist so a caller can look an ID up by name instead of copying it out
 * of the Gamma app by hand.
 */
import { apiRequest } from "./client.js";
/** GET /themes */
export async function listThemes(params = {}) {
    return apiRequest("/themes", {
        query: {
            query: params.query,
            type: params.type,
            limit: params.limit,
            after: params.after,
        },
    });
}
/** GET /folders */
export async function listFolders(params = {}) {
    return apiRequest("/folders", {
        query: {
            query: params.query,
            limit: params.limit,
            after: params.after,
        },
    });
}
