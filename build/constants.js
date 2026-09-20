/**
 * Gamma API Configuration Constants
 */
export const GAMMA_API_CONFIG = {
    /** API root. Endpoint paths are appended to this. */
    BASE_URL: "https://public-api.gamma.app/v1.0",
    API_KEY_HEADER: "X-API-KEY",
    TIMEOUT_MS: 5 * 60_000, // 5 minutes; Gamma documents 1-3 minutes as typical
    POLL_INTERVAL_MS: 5_000, // 5 seconds, per Gamma's documented polling cadence
};
/**
 * Rate limiting. Every response carries x-ratelimit-* headers; when burst
 * capacity runs low we slow polling down rather than waiting for a 429.
 */
export const GAMMA_RATE_LIMIT = {
    /** Below this many burst requests remaining, back off. */
    BURST_LOW_WATER: 100,
    /** Multiplier applied to the poll interval when running low. */
    BACKOFF_FACTOR: 3,
    /** Documented pause after a 429 before the first retry. */
    RETRY_AFTER_429_MS: 30_000,
    /** Maximum retries for a transient failure (429, 500, 502). */
    MAX_RETRIES: 3,
};
export const GAMMA_API_DEFAULTS = {
    FORMAT: "presentation",
    TEXT_MODE: "generate",
};
export const GAMMA_TEXT_MODES = ["generate", "condense", "preserve"];
export const GAMMA_TEXT_AMOUNTS = ["brief", "medium", "detailed", "extensive"];
export const GAMMA_FORMATS = ["presentation", "document", "social", "webpage"];
/** `png` returns a .zip containing one PNG per card, not a single image file. */
export const GAMMA_EXPORT_FORMATS = ["pdf", "pptx", "png"];
export const GAMMA_CARD_SPLIT = ["auto", "inputTextBreaks"];
/**
 * Image source options for Gamma API
 */
export const GAMMA_IMAGE_SOURCES = [
    "aiGenerated",
    "pictographic",
    "pexels", // replaced "unsplash", which the v1.0 API now rejects with a 400
    "giphy",
    "webAllImages",
    "webFreeToUse",
    "webFreeToUseCommercially",
    "themeAccent",
    "placeholder",
    "noImages",
];
/**
 * Card/slide dimension options by format type
 */
export const GAMMA_CARD_DIMENSIONS = {
    PRESENTATION: ["fluid", "16x9", "4x3"],
    DOCUMENT: ["fluid", "pageless", "letter", "a4"],
    SOCIAL: ["1x1", "4x5", "9x16"],
};
/**
 * Header/Footer element types
 */
export const GAMMA_HEADER_FOOTER_TYPES = ["text", "image", "cardNumber"];
/**
 * Header/Footer positions
 */
export const GAMMA_HEADER_FOOTER_POSITIONS = [
    "topLeft",
    "topRight",
    "topCenter",
    "bottomLeft",
    "bottomRight",
    "bottomCenter",
];
/**
 * Header/Footer image sources
 */
export const GAMMA_HEADER_FOOTER_IMAGE_SOURCES = ["themeLogo", "custom"];
/**
 * Header/Footer element sizes
 */
export const GAMMA_HEADER_FOOTER_SIZES = ["sm", "md", "lg", "xl"];
/**
 * Art style presets.
 *
 * Gamma's official MCP server exposes these as `imageOptions.stylePreset`, but
 * the REST API has no such field - it is a convenience layer in their server.
 * We match the interface and fold the preset into `imageOptions.style`.
 */
export const GAMMA_IMAGE_STYLE_PRESETS = [
    "photorealistic",
    "illustration",
    "abstract",
    "3D",
    "lineArt",
    "custom",
];
/**
 * Sharing access levels. `fullAccess` is workspace-members-only.
 */
export const GAMMA_SHARING_WORKSPACE_ACCESS = [
    "noAccess",
    "view",
    "comment",
    "edit",
    "fullAccess",
];
export const GAMMA_SHARING_EXTERNAL_ACCESS = ["noAccess", "view", "comment", "edit"];
export const GAMMA_SHARING_EMAIL_ACCESS = ["view", "comment", "edit", "fullAccess"];
export const GENERATION_STATUS = {
    PENDING: "pending",
    COMPLETED: "completed",
    FAILED: "failed",
};
export const DOWNLOAD_PATH = process.env.GAMMA_DOWNLOAD_DIR || "/tmp";
/**
 * Prompt directory paths - configurable via environment variables
 */
export const PROMPT_PATHS = {
    PUBLIC: process.env.GAMMA_PROMPTS_PUBLIC_DIR || "prompts/public",
    PRIVATE: process.env.GAMMA_PROMPTS_PRIVATE_DIR || "prompts/private",
};
/**
 * Hot-reload configuration
 */
export const HOT_RELOAD_CONFIG = {
    ENABLED: process.env.GAMMA_PROMPTS_HOT_RELOAD !== "false", // Enabled by default
    DEBOUNCE_MS: 500, // Wait 500ms after last change before reloading
};
