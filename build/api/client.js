/**
 * Gamma API HTTP client
 *
 * One place for authentication, error mapping, rate-limit accounting and
 * retries. Every endpoint module goes through `apiRequest`.
 */
import fetch from "node-fetch";
import dotenv from "dotenv";
import { GAMMA_API_CONFIG, GAMMA_RATE_LIMIT } from "../constants.js";
dotenv.config();
/**
 * An error returned by the Gamma API, carrying the status code so callers can
 * distinguish "your request was wrong" from "try again later".
 */
export class GammaApiError extends Error {
    statusCode;
    retryable;
    constructor(statusCode, message, retryable) {
        super(message);
        this.statusCode = statusCode;
        this.retryable = retryable;
        this.name = "GammaApiError";
    }
}
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
/**
 * Map a failed response onto a message that says what to do about it.
 * The API returns { message, statusCode } on error.
 */
function describeFailure(status, body) {
    let apiMessage = body;
    try {
        const parsed = JSON.parse(body);
        if (parsed?.message)
            apiMessage = parsed.message;
    }
    catch {
        // not JSON - keep the raw body
    }
    const hint = (() => {
        switch (status) {
            case 400:
                return "Check enum spelling (they are case-sensitive) and that values are valid for the chosen format.";
            case 401:
                return "Check GAMMA_API_KEY - it should start with 'sk-gamma-' and be sent as the X-API-KEY header.";
            case 402:
                return "The workspace is out of credits. Top up or enable auto-recharge at gamma.app/settings/billing.";
            case 403:
                return "The API key's workspace lacks permission for this resource, or the feature is not enabled on this plan.";
            case 404:
                return "Check the ID. Gamma file IDs start with 'g_' and are not the slug from a gamma.app/docs/... URL.";
            case 429:
                return "Rate limited. Slow down and retry.";
            default:
                return status >= 500 ? "Temporary Gamma-side failure; retrying may help." : null;
        }
    })();
    return hint ? `${status}: ${apiMessage} (${hint})` : `${status}: ${apiMessage}`;
}
function readRateLimit(headers) {
    const num = (name) => {
        const raw = headers.get(name);
        if (raw === null)
            return undefined;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : undefined;
    };
    return {
        burstRemaining: num("x-ratelimit-remaining-burst"),
        burstLimit: num("x-ratelimit-limit-burst"),
        hourlyRemaining: num("x-ratelimit-remaining"),
        dailyRemaining: num("x-ratelimit-remaining-daily"),
    };
}
/** The rate-limit state seen on the most recent response. */
let lastRateLimit = {};
export function getLastRateLimit() {
    return lastRateLimit;
}
/**
 * How long to wait before the next poll.
 *
 * Reads burst capacity from the last response and backs off before hitting a
 * 429, rather than after.
 */
export function nextPollDelay(baseMs) {
    const remaining = lastRateLimit.burstRemaining;
    if (remaining !== undefined && remaining < GAMMA_RATE_LIMIT.BURST_LOW_WATER) {
        return baseMs * GAMMA_RATE_LIMIT.BACKOFF_FACTOR;
    }
    return baseMs;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Call the Gamma API.
 *
 * Retries transient failures (429, 5xx) with backoff. A 429 waits the
 * documented 30s before the first retry, then doubles.
 */
export async function apiRequest(path, options = {}) {
    const { method = "GET", body, query } = options;
    const url = new URL(`${GAMMA_API_CONFIG.BASE_URL}${path}`);
    if (query) {
        for (const [key, value] of Object.entries(query)) {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, String(value));
            }
        }
    }
    const headers = {
        Accept: "application/json",
        [GAMMA_API_CONFIG.API_KEY_HEADER]: process.env.GAMMA_API_KEY || "",
    };
    if (body !== undefined)
        headers["Content-Type"] = "application/json";
    let attempt = 0;
    let backoff = GAMMA_RATE_LIMIT.RETRY_AFTER_429_MS;
    while (true) {
        const response = await fetch(url.toString(), {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        lastRateLimit = readRateLimit(response.headers);
        if (response.ok) {
            const text = await response.text();
            return (text ? JSON.parse(text) : {});
        }
        const failureBody = await response.text();
        const retryable = RETRYABLE_STATUSES.has(response.status);
        if (!retryable || attempt >= GAMMA_RATE_LIMIT.MAX_RETRIES) {
            throw new GammaApiError(response.status, describeFailure(response.status, failureBody), retryable);
        }
        // Honour Retry-After when the server sends one.
        const retryAfter = Number(response.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoff;
        await sleep(waitMs);
        backoff *= 2;
        attempt += 1;
    }
}
