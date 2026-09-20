/**
 * Analytics tools.
 *
 * Every one of these needs at least edit permission on the gamma and returns a
 * 403 otherwise, so they share a permission-aware error handler. Analytics data
 * is eventually consistent and can lag by about an hour - stated in each tool
 * description so a caller does not treat a zero as authoritative.
 */
import { z } from "zod";
import { getGammaAnalytics, getGammaCardAnalytics, getGammaViewerAnalytics, getGammaViewerDetailAnalytics, } from "../api/analytics.js";
import { textResult, jsonResult } from "./format.js";
const GAMMA_ID_DESC = "Gamma file ID or a full gamma.app/docs/... URL.";
const LAG_NOTE = "Data is eventually consistent and can lag by about an hour.";
async function analyticsCall(run, what) {
    try {
        return jsonResult(await run());
    }
    catch (err) {
        if (err?.statusCode === 403) {
            return textResult(`Access denied reading ${what}. Analytics need at least edit permission on the gamma; ` +
                `full viewer lists need manage permission. Check that the gamma is in the API key's workspace.`);
        }
        return textResult(`Error reading ${what}: ${err?.message || err}`);
    }
}
export function registerGammaAnalyticsTools(server) {
    server.tool("get_gamma_analytics", `Engagement summary for a Gamma: total views, unique viewers and editors, card count, when it was last opened, and a 30-day daily viewer trend. Use this as the default when asked how a gamma is performing. ${LAG_NOTE}`, { gammaIdOrUrl: z.string().describe(GAMMA_ID_DESC) }, async ({ gammaIdOrUrl }) => analyticsCall(() => getGammaAnalytics(gammaIdOrUrl), "gamma analytics"));
    server.tool("get_gamma_card_analytics", `Card-by-card engagement: time spent on each card and the share of viewers who reached it. Every card is included in deck order, so a zero means "nobody got here", not "missing data". Use this for which cards performed best or where viewers dropped off. ${LAG_NOTE}`, { gammaIdOrUrl: z.string().describe(GAMMA_ID_DESC) }, async ({ gammaIdOrUrl }) => analyticsCall(() => getGammaCardAnalytics(gammaIdOrUrl), "card analytics"));
    server.tool("get_gamma_viewer_analytics", `List the people who viewed a Gamma, with display name and email for signed-in viewers (null for anonymous), when they last opened it, and how many cards they saw. Requires at least edit permission; with edit only you see just your own row. Paginated. ${LAG_NOTE}`, {
        gammaIdOrUrl: z.string().describe(GAMMA_ID_DESC),
        limit: z.number().int().min(1).max(50).optional().describe("Max viewers, up to 50."),
        after: z.string().optional().describe("Cursor from a previous response."),
        sortDirection: z
            .enum(["desc", "asc"])
            .optional()
            .describe("Sort by most recent open time. Defaults to desc."),
    }, async ({ gammaIdOrUrl, ...params }) => analyticsCall(() => getGammaViewerAnalytics(gammaIdOrUrl, params), "viewer analytics"));
    server.tool("get_gamma_viewer_detail_analytics", `One viewer's engagement with a Gamma: name, email, last opened, cards viewed, and the share of their total view time spent on each card. ${LAG_NOTE}`, {
        gammaIdOrUrl: z.string().describe(GAMMA_ID_DESC),
        userId: z
            .string()
            .describe("The viewer's user ID - the viewerId from get_gamma_viewer_analytics. " +
            "Anonymous viewers are not addressable and return 404."),
    }, async ({ gammaIdOrUrl, userId }) => analyticsCall(() => getGammaViewerDetailAnalytics(gammaIdOrUrl, userId), "viewer detail analytics"));
}
