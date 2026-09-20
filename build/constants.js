/**
 * Gamma API Configuration Constants
 */
export const GAMMA_API_CONFIG = {
    BASE_URL: "https://public-api.gamma.app/v1.0/generations",
    API_KEY_HEADER: "X-API-KEY",
    TIMEOUT_MS: 5 * 60_000, // 5 minutes; Gamma documents 1-3 minutes as typical
    POLL_INTERVAL_MS: 5_000, // 5 seconds, per Gamma's documented polling cadence
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
