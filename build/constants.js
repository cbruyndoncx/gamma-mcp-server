/**
 * Gamma API Configuration Constants
 */
export const GAMMA_API_CONFIG = {
    BASE_URL: "https://public-api.gamma.app/v1.0/generations",
    API_KEY_HEADER: "X-API-KEY",
    TIMEOUT_MS: 2 * 60000,
    POLL_INTERVAL_MS: 1500, // 1.5 seconds between polls
};
export const GAMMA_API_DEFAULTS = {
    FORMAT: "presentation",
    TEXT_MODE: "generate",
};
export const GAMMA_TEXT_MODES = ["generate", "condense", "preserve"];
export const GAMMA_TEXT_AMOUNTS = ["brief", "medium", "detailed", "extensive"];
export const GAMMA_LEGACY_TEXT_AMOUNTS = ["short", "medium", "long"];
export const GAMMA_FORMATS = ["presentation", "document", "social", "webpage"];
export const GAMMA_EXPORT_FORMATS = ["pdf", "pptx"];
export const GENERATION_STATUS = {
    COMPLETED: ["completed", "succeeded"],
    FAILED: ["failed", "error"],
};
export const DOWNLOAD_PATH = "/tmp";
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
    ENABLED: process.env.GAMMA_PROMPTS_HOT_RELOAD !== "false",
    DEBOUNCE_MS: 500, // Wait 500ms after last change before reloading
};
