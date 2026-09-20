/**
 * Engagement analytics for an existing gamma.
 *
 * All four endpoints need at least edit permission on the gamma. With edit
 * only, viewer endpoints return the key owner's own row (scope "self"); manage
 * permission returns everyone (scope "all"). Data is eventually consistent and
 * can lag by about an hour.
 */
import { apiRequest } from "./client.js";
import { resolveGammaId } from "./management.js";
/** GET /gammas/{gammaId}/analytics */
export async function getGammaAnalytics(gammaIdOrUrl) {
    return apiRequest(`/gammas/${resolveGammaId(gammaIdOrUrl)}/analytics`);
}
/** GET /gammas/{gammaId}/analytics/cards */
export async function getGammaCardAnalytics(gammaIdOrUrl) {
    return apiRequest(`/gammas/${resolveGammaId(gammaIdOrUrl)}/analytics/cards`);
}
/** GET /gammas/{gammaId}/analytics/viewers */
export async function getGammaViewerAnalytics(gammaIdOrUrl, params = {}) {
    return apiRequest(`/gammas/${resolveGammaId(gammaIdOrUrl)}/analytics/viewers`, { query: { ...params } });
}
/** GET /gammas/{gammaId}/analytics/viewers/{userId} */
export async function getGammaViewerDetailAnalytics(gammaIdOrUrl, userId) {
    return apiRequest(`/gammas/${resolveGammaId(gammaIdOrUrl)}/analytics/viewers/${userId}`);
}
