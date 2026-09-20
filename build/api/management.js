/**
 * Gamma management: search, metadata, comments, exports, archive, delete.
 */
import { apiRequest } from "./client.js";
import { GAMMA_API_CONFIG } from "../constants.js";
/**
 * Accept either a bare file ID or a full Gamma URL.
 *
 * The API wants the file ID; a gamma.app/docs/Title-abc123 URL ends in the
 * doc ID, which the endpoint also resolves. Passing the whole URL 404s.
 */
export function resolveGammaId(gammaIdOrUrl) {
    const trimmed = gammaIdOrUrl.trim();
    if (!/^https?:\/\//i.test(trimmed))
        return trimmed;
    try {
        const { pathname } = new URL(trimmed);
        const lastSegment = pathname.split("/").filter(Boolean).pop() ?? "";
        // "My-Deck-g5aykcic8ujm71s" -> "g5aykcic8ujm71s"
        const idPart = lastSegment.split("-").pop() ?? lastSegment;
        return idPart || trimmed;
    }
    catch {
        return trimmed;
    }
}
/** GET /gammas/search */
export async function searchGammas(params) {
    return apiRequest("/gammas/search", { query: { ...params } });
}
/** GET /templates/search */
export async function searchTemplates(params) {
    return apiRequest("/templates/search", { query: { ...params } });
}
/** GET /gammas/{gammaId} - metadata only. */
export async function getGamma(gammaIdOrUrl) {
    return apiRequest(`/gammas/${resolveGammaId(gammaIdOrUrl)}`);
}
/** GET /gammas/{gammaId}/comments */
export async function getGammaComments(gammaIdOrUrl, params = {}) {
    return apiRequest(`/gammas/${resolveGammaId(gammaIdOrUrl)}/comments`, { query: { ...params } });
}
/** POST /gammas/{gammaId}/export */
export async function createExport(gammaIdOrUrl, exportAs) {
    return apiRequest(`/gammas/${resolveGammaId(gammaIdOrUrl)}/export`, { method: "POST", body: { exportAs } });
}
/** GET /exports/{id} */
export async function getExportStatus(exportId) {
    return apiRequest(`/exports/${exportId}`);
}
/** Start an export and poll until it finishes. */
export async function exportAndWait(gammaIdOrUrl, exportAs) {
    const { exportId } = await createExport(gammaIdOrUrl, exportAs);
    const start = Date.now();
    while (Date.now() - start < GAMMA_API_CONFIG.TIMEOUT_MS) {
        await new Promise((r) => setTimeout(r, GAMMA_API_CONFIG.POLL_INTERVAL_MS));
        const status = await getExportStatus(exportId);
        if (status.status !== "pending")
            return status;
    }
    return {
        exportId,
        status: "pending",
        gammaId: resolveGammaId(gammaIdOrUrl),
        exportAs,
        error: { message: `Timed out. Poll get_export_status with exportId ${exportId}.` },
    };
}
/** POST /gammas/{gammaId}/archive - idempotent. */
export async function archiveGamma(gammaIdOrUrl) {
    return apiRequest(`/gammas/${resolveGammaId(gammaIdOrUrl)}/archive`, { method: "POST" });
}
/** DELETE /gammas/{gammaId} - requires a workspace admin role. */
export async function deleteGamma(gammaIdOrUrl) {
    return apiRequest(`/gammas/${resolveGammaId(gammaIdOrUrl)}`, { method: "DELETE" });
}
