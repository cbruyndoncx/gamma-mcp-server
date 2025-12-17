/**
 * Gamma API Configuration Constants
 */

export const GAMMA_API_CONFIG = {
  BASE_URL: "https://public-api.gamma.app/v1.0/generations",
  API_KEY_HEADER: "X-API-KEY",
  TIMEOUT_MS: 10 * 60_000, // 10 minutes total timeout for generation
  POLL_INTERVAL_MS: 30_000, // 30 seconds between polls
} as const;

export const GAMMA_API_DEFAULTS = {
  FORMAT: "presentation",
  TEXT_MODE: "generate",
} as const;

export const GAMMA_TEXT_MODES = ["generate", "condense", "preserve"] as const;
export const GAMMA_TEXT_AMOUNTS = ["brief", "medium", "detailed", "extensive"] as const;
export const GAMMA_FORMATS = ["presentation", "document", "social", "webpage"] as const;
export const GAMMA_EXPORT_FORMATS = ["pdf", "pptx"] as const;

/**
 * Image source options for Gamma API
 */
export const GAMMA_IMAGE_SOURCES = [
  "aiGenerated",
  "pictographic",
  "unsplash",
  "giphy",
  "webAllImages",
  "webFreeToUse",
  "webFreeToUseCommercially",
  "placeholder",
  "noImages",
] as const;

/**
 * Card/slide dimension options by format type
 */
export const GAMMA_CARD_DIMENSIONS = {
  PRESENTATION: ["fluid", "16x9", "4x3"],
  DOCUMENT: ["fluid", "pageless", "letter", "a4"],
  SOCIAL: ["1x1", "4x5", "9x16"],
} as const;

/**
 * Header/Footer element types
 */
export const GAMMA_HEADER_FOOTER_TYPES = ["text", "image", "cardNumber"] as const;

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
] as const;

/**
 * Header/Footer image sources
 */
export const GAMMA_HEADER_FOOTER_IMAGE_SOURCES = ["themeLogo", "custom"] as const;

/**
 * Header/Footer element sizes
 */
export const GAMMA_HEADER_FOOTER_SIZES = ["sm", "md", "lg", "xl"] as const;

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
