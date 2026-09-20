/**
 * Gamma API Type Definitions
 */

import type {
  GAMMA_TEXT_MODES,
  GAMMA_TEXT_AMOUNTS,
  GAMMA_FORMATS,
  GAMMA_EXPORT_FORMATS,
  GAMMA_CARD_SPLIT,
  GAMMA_IMAGE_SOURCES,
  GAMMA_HEADER_FOOTER_TYPES,
  GAMMA_HEADER_FOOTER_IMAGE_SOURCES,
  GAMMA_HEADER_FOOTER_SIZES,
  GAMMA_SHARING_WORKSPACE_ACCESS,
  GAMMA_SHARING_EXTERNAL_ACCESS,
  GAMMA_SHARING_EMAIL_ACCESS,
} from "./constants.js";

export type GammaTextMode = (typeof GAMMA_TEXT_MODES)[number];
export type GammaTextAmount = (typeof GAMMA_TEXT_AMOUNTS)[number];
export type GammaFormat = (typeof GAMMA_FORMATS)[number];
export type GammaExportFormat = (typeof GAMMA_EXPORT_FORMATS)[number];
export type GammaCardSplit = (typeof GAMMA_CARD_SPLIT)[number];
export type GammaImageSource = (typeof GAMMA_IMAGE_SOURCES)[number];
export type GammaHeaderFooterType = (typeof GAMMA_HEADER_FOOTER_TYPES)[number];
export type GammaHeaderFooterImageSource = (typeof GAMMA_HEADER_FOOTER_IMAGE_SOURCES)[number];
export type GammaHeaderFooterSize = (typeof GAMMA_HEADER_FOOTER_SIZES)[number];

export interface GammaTextOptions {
  amount?: GammaTextAmount;
  tone?: string;
  audience?: string;
  language?: string;
}

export interface GammaImageOptions {
  source?: GammaImageSource;
  model?: string;
  style?: string;
}

export interface GammaHeaderFooterElement {
  type: GammaHeaderFooterType;
  value?: string; // For type="text": the text content
  source?: GammaHeaderFooterImageSource; // For type="image": image source
  src?: string; // For type="image" with source="custom": image URL
  size?: GammaHeaderFooterSize; // Optional size
}

export interface GammaHeaderFooter {
  topLeft?: GammaHeaderFooterElement;
  topRight?: GammaHeaderFooterElement;
  topCenter?: GammaHeaderFooterElement;
  bottomLeft?: GammaHeaderFooterElement;
  bottomRight?: GammaHeaderFooterElement;
  bottomCenter?: GammaHeaderFooterElement;
  hideFromFirstCard?: boolean;
  hideFromLastCard?: boolean;
}

export type GammaSharingWorkspaceAccess = (typeof GAMMA_SHARING_WORKSPACE_ACCESS)[number];
export type GammaSharingExternalAccess = (typeof GAMMA_SHARING_EXTERNAL_ACCESS)[number];
export type GammaSharingEmailAccess = (typeof GAMMA_SHARING_EMAIL_ACCESS)[number];

export interface GammaEmailOptions {
  recipients: string[];
  access?: GammaSharingEmailAccess;
}

export interface GammaSharingOptions {
  workspaceAccess?: GammaSharingWorkspaceAccess;
  externalAccess?: GammaSharingExternalAccess;
  emailOptions?: GammaEmailOptions;
}

export interface GammaCardOptions {
  dimensions?: string;
  headerFooter?: GammaHeaderFooter;
}

export interface GammaGenerationParams {
  inputText: string;
  format?: GammaFormat;
  textMode?: GammaTextMode;
  numCards?: number;
  exportAs?: GammaExportFormat;
  additionalInstructions?: string;
  textOptions?: GammaTextOptions;
  imageOptions?: GammaImageOptions;
  cardOptions?: GammaCardOptions;
  folderIds?: string[];
  cardSplit?: GammaCardSplit;
  themeId?: string;
}

export interface GammaAPIRequestBody {
  inputText: string;
  format?: string;
  textMode?: string;
  numCards?: number;
  exportAs?: string;
  additionalInstructions?: string;
  textOptions?: GammaTextOptions;
  imageOptions?: GammaImageOptions;
  cardOptions?: GammaCardOptions;
  folderIds?: string[];
  cardSplit?: string;
  themeId?: string;
}

/** Credit accounting returned on a completed or failed generation. */
export interface GammaCredits {
  deducted: number;
  remaining: number;
}

/** Error envelope used across the v1.0 API. */
export interface GammaErrorResponse {
  message: string;
  statusCode: number;
}

/** Response to POST /v1.0/generations. Carries no URLs - those come from polling. */
export interface GammaCreateGenerationResponse {
  generationId: string;
  /** File-level warnings about ignored or adjusted options. */
  warnings?: string;
  /** Per-page warnings, index-aligned with the `pages` request array. */
  pageWarnings?: (string | null)[];
}

/** One page's result within a multi-page generation. */
export interface GammaPageGenerationResult {
  gammaId: string;
  gammaUrl: string;
  status: GammaGenerationStatus;
  error?: GammaErrorResponse;
  exportUrl?: string;
}

export type GammaGenerationStatus = "pending" | "completed" | "failed";

/** Response to GET /v1.0/generations/{id}. */
export interface GammaGenerationStatusResponse {
  generationId: string;
  status: GammaGenerationStatus;
  gammaId?: string;
  gammaUrl?: string;
  /**
   * Download URL for the export, when `exportAs` was set. Expires after about a
   * week and is NOT tied to the API key - anyone with the link can download it.
   * Treat as a secret: do not log it.
   */
  exportUrl?: string;
  error?: GammaErrorResponse;
  credits?: GammaCredits;
  pages?: GammaPageGenerationResult[];
}

/** Normalized result this server hands back to its tools. */
export interface GammaGenerationResult {
  url: string | null;
  generationId: string | null;
  gammaId: string | null;
  exportUrl: string | null;
  credits: GammaCredits | null;
  warnings: string | null;
  error: string | null;
}

export interface GammaAssetDownloads {
  path?: string;
  error?: string;
}

export interface GammaAssets {
  generationId: string;
  status: GammaGenerationStatus;
  gammaId?: string;
  gammaUrl?: string;
  /** Single export URL - the API permits only one `exportAs` per generation. */
  exportUrl?: string;
  /** Format inferred from the export URL, for convenience. */
  exportFormat?: string;
  credits?: GammaCredits;
  download?: GammaAssetDownloads;
}
