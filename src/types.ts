/**
 * Gamma API Type Definitions
 */

import type {
  GAMMA_TEXT_MODES,
  GAMMA_TEXT_AMOUNTS,
  GAMMA_LEGACY_TEXT_AMOUNTS,
  GAMMA_FORMATS,
  GAMMA_EXPORT_FORMATS,
} from "./constants.js";

export type GammaTextMode = (typeof GAMMA_TEXT_MODES)[number];
export type GammaTextAmount = (typeof GAMMA_TEXT_AMOUNTS)[number];
export type GammaLegacyTextAmount = (typeof GAMMA_LEGACY_TEXT_AMOUNTS)[number];
export type GammaFormat = (typeof GAMMA_FORMATS)[number];
export type GammaExportFormat = (typeof GAMMA_EXPORT_FORMATS)[number];

export interface GammaTextOptions {
  amount?: GammaTextAmount;
  tone?: string;
  audience?: string;
  language?: string;
}

export interface GammaImageOptions {
  source?: string;
  model?: string;
  style?: string;
}

export interface GammaGenerationParams {
  inputText: string;
  format?: GammaFormat;
  textMode?: GammaTextMode;
  numCards?: number;
  exportAs?: GammaExportFormat;
  additionalInstructions?: string;
  textAmount?: GammaLegacyTextAmount;
  tone?: string;
  audience?: string;
  imageModel?: string;
  imageStyle?: string;
  textOptions?: GammaTextOptions;
  imageOptions?: GammaImageOptions;
  folderIds?: string[];
  cardSplit?: string;
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
  folderIds?: string[];
  cardSplit?: string;
  themeId?: string;
}

export interface GammaGenerationResult {
  url: string | null;
  generationId: string | null;
  error: string | null;
}

export interface GammaAPIResponse {
  generationId?: string;
  generation_id?: string;
  id?: string;
  gammaUrl?: string;
  url?: string;
  exportUrl?: string;
  export_url?: string;
  outputUrl?: string;
  output_url?: string;
  gamma_url?: string;
  pdfUrl?: string;
  pptxUrl?: string;
  status?: string;
  state?: string;
  outputs?: Array<{ url?: string }>;
  exports?: Array<{ url?: string } | string>;
  artifacts?: Array<{ url?: string }>;
}

export interface GammaAssetDownloads {
  pdf?: string;
  pdf_error?: string;
  pptx?: string;
  pptx_error?: string;
}

export interface GammaAssets {
  generationId: string;
  pdf?: string;
  pptx?: string;
  downloads?: GammaAssetDownloads;
}
