/**
 * Gamma API Configuration Constants
 */

export const GAMMA_API_CONFIG = {
  BASE_URL: "https://public-api.gamma.app/v1.0/generations",
  API_KEY_HEADER: "X-API-KEY",
  TIMEOUT_MS: 2 * 60_000, // 2 minutes total timeout for generation
  POLL_INTERVAL_MS: 1500, // 1.5 seconds between polls
} as const;

export const GAMMA_API_DEFAULTS = {
  FORMAT: "presentation",
  TEXT_MODE: "generate",
} as const;

export const GAMMA_TEXT_MODES = ["generate", "condense", "preserve"] as const;
export const GAMMA_TEXT_AMOUNTS = ["brief", "medium", "detailed", "extensive"] as const;
export const GAMMA_LEGACY_TEXT_AMOUNTS = ["short", "medium", "long"] as const;
export const GAMMA_FORMATS = ["presentation", "document", "social", "webpage"] as const;
export const GAMMA_EXPORT_FORMATS = ["pdf", "pptx"] as const;

export const GENERATION_STATUS = {
  COMPLETED: ["completed", "succeeded"],
  FAILED: ["failed", "error"],
} as const;

export const DOWNLOAD_PATH = "/tmp";

/**
 * Prompt directory paths - configurable via environment variables
 */
export const PROMPT_PATHS = {
  PUBLIC: process.env.GAMMA_PROMPTS_PUBLIC_DIR || "prompts/public",
  PRIVATE: process.env.GAMMA_PROMPTS_PRIVATE_DIR || "prompts/private",
} as const;

/**
 * Hot-reload configuration
 */
export const HOT_RELOAD_CONFIG = {
  ENABLED: process.env.GAMMA_PROMPTS_HOT_RELOAD !== "false", // Enabled by default
  DEBOUNCE_MS: 500, // Wait 500ms after last change before reloading
} as const;
