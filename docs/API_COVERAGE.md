# Gamma API Coverage

Which parts of the Gamma v1.0 REST API this server exposes.

**Last verified:** 2026-09-20 against developers.gamma.app (changelog through 2026-07-16)

Legend: ✅ exposed · ⚠️ partial · ❌ not exposed · n/a no REST endpoint exists

---

## Endpoints

| Endpoint | Method | Tool | Status |
|---|---|---|---|
| `/generations` | POST | `generate`, `generate_multi_page_gamma` | ✅ |
| `/generations/from-template` | POST | `generate_from_template` | ✅ |
| `/generations/{id}` | GET | `get_generation_status`, `download_export` | ✅ |
| `/images` | POST | `generate_image` | ✅ |
| `/images/{id}` | GET | `get_image_generation_status` | ✅ |
| `/images/media/{id}/archive` | POST | `archive_image` | ✅ |
| `/themes` | GET | `get_themes` | ✅ |
| `/folders` | GET | `get_folders` | ✅ |
| `/gammas/search` | GET | `get_gammas` | ✅ |
| `/templates/search` | GET | `get_gammas` | ✅ |
| `/gammas/{id}` | GET | `read_gamma` | ✅ |
| `/gammas/{id}/comments` | GET | `get_gamma_comments` | ✅ |
| `/gammas/{id}/archive` | POST | `archive_gamma` | ✅ |
| `/gammas/{id}/export` | POST | `export_gamma` | ✅ |
| `/exports/{id}` | GET | `get_export_status` | ✅ |
| `/gammas/{id}` | DELETE | `delete_gamma` | ✅ |
| `/gammas/{id}/analytics` | GET | `get_gamma_analytics` | ✅ |
| `/gammas/{id}/analytics/cards` | GET | `get_gamma_card_analytics` | ✅ |
| `/gammas/{id}/analytics/viewers` | GET | `get_gamma_viewer_analytics` | ✅ |
| `/gammas/{id}/analytics/viewers/{userId}` | GET | `get_gamma_viewer_detail_analytics` | ✅ |

Every documented v1.0 endpoint is covered.

---

## `POST /generations` parameters

| Parameter | Bounds | Status |
|---|---|---|
| `inputText` | 1–400,000 chars | ✅ enforced in the schema |
| `pages[]` | 1–50 entries | ✅ via `generate_multi_page_gamma` |
| `publish` | boolean | ✅ |
| `title` | 1–500 | ✅ |
| `format` | `presentation`/`document`/`social`/`webpage` | ✅ |
| `textMode` | `generate`/`condense`/`preserve` | ✅ |
| `numCards` | 1–75 | ✅ |
| `cardSplit` | `auto`/`inputTextBreaks` | ✅ |
| `additionalInstructions` | 0–5,000 | ✅ enforced |
| `themeId` | — | ✅ (discoverable via `get_themes`) |
| `folderIds` | max 1 item | ✅ enforced |
| `exportAs` | `pdf`/`pptx`/`png` | ✅ |
| `textOptions.amount` | 4 values | ✅ |
| `textOptions.tone` | 0–500 | ✅ enforced |
| `textOptions.audience` | 0–500 | ✅ enforced |
| `textOptions.language` | 79 codes | ⚠️ free string, not enum-checked |
| `imageOptions.source` | 10 values | ✅ |
| `imageOptions.model` | 42 values | ⚠️ free string — the enum churns often, so it is deliberately not pinned |
| `imageOptions.style` | 0–5,000 | ✅ enforced |
| `cardOptions.dimensions` | per-format | ⚠️ free string; a mismatch is reported in `warnings` |
| `cardOptions.headerFooter` | 6 slots | ✅ |
| `sharingOptions.workspaceAccess` | 5 values | ✅ |
| `sharingOptions.externalAccess` | 4 values | ✅ |
| `sharingOptions.emailOptions` | recipients + access | ✅ |

### Response fields

| Field | Status |
|---|---|
| `generationId` | ✅ |
| `warnings` / `pageWarnings` | ✅ surfaced in tool output |
| `status` | ✅ |
| `gammaUrl` / `gammaId` / `exportUrl` | ✅ |
| `credits.deducted` / `.remaining` | ✅ surfaced |
| `pages[]` | ✅ |
| `error.message` / `.statusCode` | ✅ mapped to an actionable message |

---

## Known gaps

| Gap | Why |
|---|---|
| Card-level content in `read_gamma` | **No REST endpoint exists.** Gamma's official MCP server returns full page content; the public API exposes metadata only. |
| `imageOptions.stylePreset` | Not a REST field — it is a convenience layer in Gamma's own MCP server. Accepted here and folded into `style`. |
| OAuth 2.0 | Deliberate. This is a local stdio server; API-key auth is the right fit. Both are supported by the API and behave identically. |
| Editing an existing gamma | No REST endpoint exists. `generate_from_template` is the nearest operation. |
| Video image models (`veo-3.1`, `luma-ray-2`, …) | Present in the `model` enum but undocumented; usable since `model` is a free string. |

---

## See also

- [API_UPDATE_PLAN.md](API_UPDATE_PLAN.md) — the plan this work followed, with the
  tool-name parity table against Gamma's official MCP server
- `scripts/parity-check.mjs` — asserts all 17 official tools are registered
