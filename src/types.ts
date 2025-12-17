/**
 * Gamma API Type Definitions
 */

import type {
  GAMMA_TEXT_MODES,
  GAMMA_TEXT_AMOUNTS,
  GAMMA_FORMATS,
  GAMMA_EXPORT_FORMATS,
  GAMMA_IMAGE_SOURCES,
  GAMMA_HEADER_FOOTER_TYPES,
  GAMMA_HEADER_FOOTER_IMAGE_SOURCES,
  GAMMA_HEADER_FOOTER_SIZES,
} from "./constants.js";

export type GammaTextMode = (typeof GAMMA_TEXT_MODES)[number];
export type GammaTextAmount = (typeof GAMMA_TEXT_AMOUNTS)[number];
export type GammaFormat = (typeof GAMMA_FORMATS)[number];
export type GammaExportFormat = (typeof GAMMA_EXPORT_FORMATS)[number];
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
  cardOptions?: GammaCardOptions;
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
