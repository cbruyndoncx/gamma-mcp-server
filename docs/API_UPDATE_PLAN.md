# Gamma MCP Server — v1.0 API Update & Parity Plan

**Written:** 2026-09-20 · **Docs researched against:** developers.gamma.app (changelog through 2026-07-16)

Goal: bring this server current with the Gamma v1.0 REST API, and reach at least
feature parity with Gamma's official MCP server — while keeping the two things
this project has that the official server does not (JSON prompt templates with
hot-reload, and opinionated executive presets).

---

## 0. Contract

### 0.1 Acceptance criteria

This work is done when all of the following hold:

- **AC1** Every tool in §1 is registered under its official Gamma MCP name, and every parameter the v1.0 REST schema accepts for that endpoint is either exposed or deliberately listed in §0.3.
- **AC2** No request this server constructs is rejected for a stale enum, a missing length bound, or an out-of-range array — verified by the schema-conformance sweep in §5.1.
- **AC3** `warnings`, `pageWarnings`, and `credits.{deducted,remaining}` reach the MCP client on every generation call.
- **AC4** All 11 templates in `prompts/public/` generate successfully end-to-end after the tool rename.
- **AC5** `npm ci && npm run build` succeeds from a clean clone, and `build/` is committed in the same change as `src/`.
- **AC6** `README.md`, `CONFIGURATION.md`, `NPX_USAGE.md`, `PROMPTS_GUIDE.md`, `CONTRIBUTING.md` and `docs/*` describe the tools that actually exist.

### 0.2 Assumptions

Numbered so they can be contradicted individually. Each states how it would be falsified.

1. **Plan tier** — the Gamma account is Pro or higher, so the API is reachable and `numCards` may go to 75. *Falsified by:* 403 on `POST /v1.0/generations`.
2. **Search availability** — the workspace has `/gammas/search` enabled. Gamma documents a 403 meaning "not enabled for this workspace yet". *Falsified by:* 403 on `GET /v1.0/gammas/search` → Phase 6.1 ships but cannot be verified.
3. **Analytics permissions** — the API key owner has at least *edit* on any gamma used for analytics testing, and *manage* if full viewer lists are expected. *Falsified by:* 403, or a `scope: "self"` response showing only the key owner's row.
4. **Verification costs real credits** — cards bill 1–3 credits each and AI images 2–125 each, so a 10-card test deck with images runs roughly 20–60 credits. Live tests are therefore opt-in, not CI-default. *Falsified by:* `credits.deducted` coming back materially different.
5. **No external consumers of the current tool names** — npm's `gamma-mcp-server@1.0.0` was last modified 2025-04-02, this repo's first commit is 2025-05-14, and `package.json` carried no `version` field, so this fork was never published. Renaming tools breaks no third party. *Falsified by:* your own MCP client configs, or anyone you shared the repo with. **See blocking question Q2.**
6. **Single-user stdio server** — no concurrency, no shared state, no idempotency or transactionality obligations. Each tool call is independent. *Falsified by:* a decision to host this remotely, which would also force the OAuth work excluded in §0.3.
7. **Node 18+** — `node-fetch` is a dependency but the runtime has native `fetch`; the dependency can eventually be dropped. *Falsified by:* a deployment target older than Node 18.
8. **Generation is async-only** — Gamma exposes no streaming or progress API, so "blocking" means server-side polling and a long-running tool call. Some MCP clients impose their own call timeout. *Falsified by:* client timeouts during 1–3 minute generations, which is what `waitForCompletion: false` (§2.2) exists to escape.
9. **Prompt templates are free text** — the tool names inside `prompts/public/*.json` are not validated against registered tools, so a missed rename fails silently at runtime rather than at load. *Falsified by:* adding validation, which Task 8.1 should consider.

### 0.3 Deliberately out of scope

- **OAuth 2.0** — see §2.1. API-key auth only.
- **Remote/HTTP transport** — stdio only.
- **Editing an existing gamma** — no REST endpoint exists; `generate_from_template` is the closest available operation.
- **Full-content `read_gamma`** — no REST endpoint exists (§3.4). Metadata only.
- **A general test framework** — only the four targeted checks in §5. Adding Vitest/Jest is a separate decision.
- **Dropping `node-fetch` for native `fetch`** — worth doing, but not part of this work.

### 0.4 Blocking questions

Two, each with a recommended default so the answer can be "yes to both".

> **Both answered 2026-09-20: Q1 → remove, Q2 → skip.** Recorded below; §2.4 and Task 2.4 are struck accordingly.

**Q1 — Is the `numCards` multiple-of-5 rule something you hit in practice?** ✅ **ANSWERED: remove.**
`generate_executive_report` rounds to multiples of 5 above 15 and caps at 60 (commits `7c456b0`, `9bdd1f4`, `cf1c5f1`). Current docs describe a plain integer, 1–75. If you added that logic after a real 400, the docs are silent and Task 0.8 would reintroduce the bug.
*Decision:* rounding removed, `numCards` clamped to 1–75. No API key was available in the implementing session, so the confirming live call with `numCards: 23` is **still outstanding** — see the `TODO(verify)` comment in `src/mcp-tools.ts`. If it 400s, restore the rounding and record the empirical constraint in a comment.

**Q2 — Build the deprecated tool-name alias layer, or skip it?** ✅ **ANSWERED: skip.**
Assumption 5 says no third party depends on the current names, which makes §2.4's `GAMMA_LEGACY_TOOL_NAMES` machinery dead weight. But your own Claude Desktop / MCP client configs and any private `prompts/private/*.json` are invisible from here.
*Decision:* **alias layer skipped.** Phase 2 does the clean rename; `CHANGELOG.md` records it; your own MCP configs and any `prompts/private/*.json` must be updated by hand in the same sitting. `GAMMA_LEGACY_TOOL_NAMES` will not exist.

---

## 1. Tool comparison

Official tool names are adopted verbatim wherever the tool does the same job, so
that prompts and agent instructions written against Gamma's own server work here
unchanged.

| Official Gamma MCP tool | This server today | Target name | Backing REST call | Status |
|---|---|---|---|---|
| `generate` | `generate-presentation` | `generate` | `POST /v1.0/generations` | Rename + extend |
| `generate_multi_page_gamma` | — | `generate_multi_page_gamma` | `POST /v1.0/generations` with `pages[]` | New |
| `generate_from_template` | — | `generate_from_template` | `POST /v1.0/generations/from-template` | New |
| `get_generation_status` | partly `get-presentation-assets` | `get_generation_status` | `GET /v1.0/generations/{id}` | Rewrite |
| `generate_image` | — | `generate_image` | `POST /v1.0/images` | New |
| `get_image_generation_status` | — | `get_image_generation_status` | `GET /v1.0/images/{id}` | New |
| `export_gamma` | — | `export_gamma` | `POST /v1.0/gammas/{gammaId}/export` | New |
| `get_export_status` | — | `get_export_status` | `GET /v1.0/exports/{id}` | New |
| `get_gammas` | — | `get_gammas` | `GET /v1.0/gammas/search` + `GET /v1.0/templates/search` | New |
| `read_gamma` | — | `read_gamma` | `GET /v1.0/gammas/{gammaId}` | New — **partial**, see §3.4 |
| `get_gamma_comments` | — | `get_gamma_comments` | `GET /v1.0/gammas/{gammaId}/comments` | New |
| `get_themes` | — | `get_themes` | `GET /v1.0/themes` | New |
| `get_folders` | — | `get_folders` | `GET /v1.0/folders` | New |
| `get_gamma_analytics` | — | `get_gamma_analytics` | `GET /v1.0/gammas/{gammaId}/analytics` | New |
| `get_gamma_card_analytics` | — | `get_gamma_card_analytics` | `.../analytics/cards` | New |
| `get_gamma_viewer_analytics` | — | `get_gamma_viewer_analytics` | `.../analytics/viewers` | New |
| `get_gamma_viewer_detail_analytics` | — | `get_gamma_viewer_detail_analytics` | `.../analytics/viewers/{userId}` | New |

### Beyond parity — tools the official server does not have

| Tool | This server today | Target name | Backing REST call | Rationale |
|---|---|---|---|---|
| — | `generate-executive-presentation` | `generate_executive_presentation` | `POST /v1.0/generations` | Opinionated 16x9 PPTX preset |
| — | `generate-executive-report` | `generate_executive_report` | `POST /v1.0/generations` | Opinionated A4 PDF preset |
| — | download half of `get-presentation-assets` | `download_export` | none (fetches `exportUrl`) | Writes the export to local disk |
| — | — | `archive_gamma` | `POST /v1.0/gammas/{gammaId}/archive` | REST-only; optional |
| — | — | `delete_gamma` | `DELETE /v1.0/gammas/{gammaId}` | REST-only, admin-only; optional |
| — | — | `archive_image` | `POST /v1.0/images/media/{id}/archive` | REST-only; optional |

`generate-presentation` → `generate` is a **breaking rename**. All 11 files in
`prompts/public/*.json` embed the string `generate-presentation` in their
templates and must be updated in the same change (Task 8.1).

---

## 2. Design decisions

**2.1 Authentication stays API-key.** The official server is OAuth-2.0-only
because it is a hosted remote server. This is a local stdio server; `X-API-KEY`
is the right fit and the REST API supports both identically. Not a parity gap.
Revisit only if this server is ever hosted remotely.

**2.2 Generation tools keep blocking-by-default, and gain an escape hatch.**
Today `generate-presentation` blocks until the generation completes. The official
server returns a `generationId` immediately. Rather than pick one, add
`waitForCompletion?: boolean` (default `true`) to every generation tool:

- `true` → current behaviour, poll internally, return the finished URL.
- `false` → return `{ generationId, status: "pending" }` immediately, matching
  the official server exactly.

This preserves the one-call UX in Claude Desktop while giving agents the async
contract they may expect. `get_generation_status` works either way.

**2.3 Snake_case everywhere.** Official tools are snake_case; the two executive
presets get renamed to match (`generate_executive_presentation`,
`generate_executive_report`) so the server presents one consistent convention.

**2.4 Back-compat window — ~~dropped~~.** Originally this section proposed registering
the old kebab-case names as deprecated aliases behind `GAMMA_LEGACY_TOOL_NAMES`.
**Resolved by Q2 (§0.4): skipped.** Assumption 5 establishes that no third party
consumes the current names, so the rename in Phase 2 is clean and unversioned-alias.
Local MCP client configs and private prompt templates are updated by hand.

---

## 3. Findings this plan is based on

### 3.1 Live defects in current code

| # | Issue | Location |
|---|---|---|
| D1 | `unsplash` is no longer a valid `imageOptions.source` — the API now returns 400. Replaced by `pexels`; `themeAccent` added. | `src/constants.ts:29` |
| D2 | Poll interval is 30 s; Gamma documents 5 s. Adds up to 30 s of dead latency per generation. | `src/constants.ts:9` |
| D3 | `warnings` / `pageWarnings` from the create response are discarded — this is how Gamma reports silently-ignored parameters. | `src/gamma-api.ts` |
| D4 | Rate-limit headers (`x-ratelimit-remaining-burst`, `-remaining`, `-remaining-daily`) are never read. | `src/gamma-api.ts` |
| D5 | `credits.deducted` / `credits.remaining` never surfaced; they are the documented way to avoid 402s. | `src/gamma-api.ts` |
| D6 | `folderIds` accepts an unbounded array; API caps it at 1 item. | `src/mcp-tools.ts` |
| D7 | `additionalInstructions` has no length cap; API allows 0–5000. `inputText` cap is 400,000. `tone`/`audience` 0–500, `style` 0–5000. | `src/mcp-tools.ts` |
| D8 | `get-presentation-assets` tries to return PDF *and* PPTX from one generation. Only one `exportAs` is permitted per request, and the response carries a single `exportUrl`. | `src/gamma-api.ts` |
| D9 | `extractUrl`/`extractGenerationId` probe fields that do not exist in v1.0 (`pdfUrl`, `pptxUrl`, `exports[]`, `outputs[]`, `artifacts[]`, snake_case variants). Dead code that hides real failures. | `src/gamma-api.ts` |
| D10 | `generate_executive_report` rounds `numCards` to multiples of 5 above 15 and caps at 60. No such rule appears in current docs — `numCards` is a plain integer, 1–75 on Pro and above. Likely a v0.2 artifact. | `src/mcp-tools.ts` |
| D11 | `exportUrl` is an unauthenticated, ~1-week link that docs say to treat as a secret; it is currently returned in plain tool output and logged. | `src/mcp-tools.ts` |
| D12 | The six `headerFooter` slot schemas are copy-pasted identically in `mcp-tools.ts`. | `src/mcp-tools.ts` |
| D13 | `typescript` and `@types/node` were absent from `package.json`, so `npm run build` failed on any clean clone. Fixed 2026-09-20. | `package.json` |

### 3.2 Parameters the API has that no tool exposes

`title` (1–500) · `sharingOptions{workspaceAccess, externalAccess, emailOptions{recipients, access}}` ·
`pages[]` (1–50, each `inputText`/`title`/`path`/`format`/`numCards`/`cardSplit`/`textMode`/`additionalInstructions`/`textOptions`/`imageOptions`) ·
`publish` · `exportAs: "png"` (returns a **.zip of one PNG per card**, not an image).

### 3.3 Image models

The enum is now 42 entries and includes video models (`veo-3.1`, `veo-3.1-fast`,
`luma-ray-2`, `luma-ray-2-flash`). Keep `imageOptions.model` a free string rather
than pinning an enum that churns this fast — but document the tiers, since cost
ranges from 2 to 125 credits per image.

Note: the official MCP server exposes an `imageOptions.stylePreset` enum
(`photorealistic`, `illustration`, `abstract`, `3D`, `lineArt`, `custom`). This
is a **convenience layer in their server** — the REST API has no such field. To
match, map `stylePreset` onto `imageOptions.style` client-side.

### 3.4 `read_gamma` cannot reach full parity

The official `read_gamma` returns the full rendered content of every page.
`GET /v1.0/gammas/{gammaId}` returns **metadata only**: `id`, `title`, `type`,
`url`, `thumbnailUrl`, `description`, `author`, `createdTime`, `updatedTime`.
There is no public REST endpoint for card-level content. Implement `read_gamma`
against the metadata endpoint and state the limitation in its tool description
rather than implying full-content reads.

---

## 4. Implementation tasks

### Phase 0 — Correctness (ship first, no breaking changes) ✅ **COMPLETE 2026-09-20**

> One follow-up outstanding: the `numCards: 23` live check from Task 0.8 (see the
> `TODO(verify)` in `src/mcp-tools.ts`). No API key was available in the implementing session.

- [x] **0.1** `constants.ts`: replace `unsplash` with `pexels`, add `themeAccent` to `GAMMA_IMAGE_SOURCES`. *(D1)*
- [x] **0.2** `constants.ts`: `POLL_INTERVAL_MS` 30 000 → 5 000; reduce `TIMEOUT_MS` to 5 min (60 polls) per docs' "1–3 minutes typical". *(D2)*
- [x] **0.3** `constants.ts`: add `"png"` to `GAMMA_EXPORT_FORMATS`; document the .zip behaviour in the tool description. *(§3.2)*
- [x] **0.4** `gamma-api.ts`: strip the dead alias probing from `extractUrl`/`extractGenerationId`; read `gammaUrl`, `exportUrl`, `gammaId`, `generationId` directly. Surface real errors instead of `"Unexpected response shape"`. *(D9)*
- [x] **0.5** `gamma-api.ts`: capture `warnings` and `pageWarnings` from the POST response and include them in tool output. *(D3)*
- [x] **0.6** `gamma-api.ts`: parse `credits.deducted` / `credits.remaining` from the poll response and return them. *(D5)*
- [x] **0.7** `mcp-tools.ts`: add Zod length limits — `inputText` ≤400 000, `additionalInstructions` ≤5000, `tone`/`audience` ≤500, `style` ≤5000, `title` 1–500, `folderIds` `.max(1)`. *(D6, D7)*
- [x] **0.8** `mcp-tools.ts`: remove the multiple-of-5 `numCards` rounding in `generate-executive-report`; clamp to 1–75. Verify against a live call before merging. *(D10)*
- [x] **0.9** `mcp-tools.ts`: stop logging `exportUrl`; add a one-line "treat as secret, expires ~1 week" note to any tool output that returns one. *(D11)*

### Phase 1 — Foundation refactor ✅ **COMPLETE 2026-09-20**

> `src/api/` holds `client.ts` and `generations.ts`. The `images.ts`,
> `workspace.ts`, `management.ts` and `analytics.ts` modules are created by
> their own phases rather than landing as empty stubs.

- [x] **1.1** New `src/schemas.ts`: extract shared Zod fragments — `headerFooterElementSchema` (kills the 6× duplication), `headerFooterSchema`, `textOptionsSchema`, `imageOptionsSchema`, `cardOptionsSchema`, `sharingOptionsSchema`, `pageSchema`. *(D12)*
- [x] **1.2** Split `gamma-api.ts` into `src/api/client.ts` (single `request()` with `X-API-KEY`, JSON handling, typed error mapping for 400/401/402/403/404/429/500/502, and rate-limit header capture) plus `generations.ts`, `images.ts`, `workspace.ts`, `management.ts`, `analytics.ts`.
- [x] **1.3** `client.ts`: adaptive polling — read `x-ratelimit-remaining-burst` and back off when low; on 429, wait 30 s then exponential backoff. *(D4)*
- [x] **1.4** `constants.ts`: change `BASE_URL` to the API root (`https://public-api.gamma.app/v1.0`) so non-generation endpoints can be built from it.
- [x] **1.5** `types.ts`: replace `GammaAPIResponse` with the real v1.0 shapes — `CreateGenerationResponse`, `GenerationStatusResponse`, `CreditsResponse`, `PageGenerationResult`, `ErrorResponse`, `ExportStatusResponse`, `ThemeItem`, `FolderItem`, and the analytics types.
- [x] **1.6** Split `mcp-tools.ts` into `src/tools/` — `generation.ts`, `images.ts`, `workspace.ts`, `management.ts`, `analytics.ts`, `presets.ts`, with `registerAllTools` composing them.

### Phase 2 — `generate` parity ✅ **COMPLETE 2026-09-20**

- [x] **2.1** Rename `generate-presentation` → `generate`.
- [x] **2.2** Add `title`, `sharingOptions`, `waitForCompletion`. *(§2.2, §3.2)*
- [x] **2.3** Add `imageOptions.stylePreset` mapped onto `style`. *(§3.3)*
- [x] ~~**2.4** Register deprecated kebab-case aliases behind `GAMMA_LEGACY_TOOL_NAMES`.~~ **Dropped per Q2.**

### Phase 3 — Remaining generation tools ✅ **COMPLETE 2026-09-20**

- [x] **3.1** `generate_multi_page_gamma` — `pages[]` 1–50, `publish`, file-level `title`/`themeId`/`folderIds`/`cardOptions`/`sharingOptions`/`exportAs`. Surface per-page results and `pageWarnings`.
- [x] **3.2** `generate_from_template` — `POST /generations/from-template`, required `gammaId` + `prompt`; optional `title`, `themeId`, `imageOptions{model,style}`, `sharingOptions`, `folderIds`, `exportAs`.
- [x] **3.3** `get_generation_status` — replaces `get-presentation-assets`. Returns `status`, `gammaUrl`, `exportUrl`, `gammaId`, `credits`, `pages[]`.
- [x] **3.4** `download_export` — the download behaviour split out of the old tool. ~~Move the target directory off hardcoded `/tmp` to a `GAMMA_DOWNLOAD_DIR` env var~~ *(done early in Phase 0)*.

### Phase 4 — Workspace discovery ✅ **COMPLETE 2026-09-20**

- [x] **4.1** `get_themes` — `GET /themes`, params `query`/`limit`/`after`/`type`. Returns `id`, `name`, `type`, `colorKeywords`, `toneKeywords`.
- [x] **4.2** `get_folders` — `GET /folders`, params `query`/`limit`/`after`.
- [x] **4.3** Remove the hardcoded workspace theme ID from the `generate-executive-presentation` comment now that themes are discoverable.

### Phase 5 — Images ✅ **COMPLETE 2026-09-20**

- [x] **5.1** `generate_image` — `POST /images`; `prompt` (≤5000), `type` (`illustration`|`scene`|`photo`|`abstract`), `sizePreset` (`social-square`|`social-portrait`|`story`|`banner`|`slide`), `themeId`, `referenceImages[]` (≤4, `https://` URLs, `role: "subject"`).
- [x] **5.2** `get_image_generation_status` — `GET /images/{id}`; returns `image{url,width,height,aspectRatioUsed}`, `warnings[]`, `retryable`, `credits`.
- [x] **5.3** *(optional)* `archive_image` — `POST /images/media/{savedMediaId}/archive`.

### Phase 6 — Management ✅ **COMPLETE 2026-09-20**

- [x] **6.1** `get_gammas` — merge `GET /gammas/search` (`q`, `createdBy`, `updatedAfter`, `updatedBefore`, `includeArchived`, `limit`) and `GET /templates/search` (`q`, `limit`) behind one `type: template|regular|all` param, matching the official tool's shape. Handle the documented 403 ("search not enabled for this workspace") with a clear message.
- [x] **6.2** `read_gamma` — `GET /gammas/{gammaId}`; accept a file ID *or* a full `gamma.app/docs/...` URL and extract the ID. Tool description must say metadata-only. *(§3.4)*
- [x] **6.3** `get_gamma_comments` — `limit`/`after`/`updatedSince`/`includeArchived`, cursor pagination.
- [x] **6.4** `export_gamma` + `get_export_status` — `POST /gammas/{gammaId}/export` then `GET /exports/{id}`. Surface the `reason` enum on failure (`render_timeout`, `deck_too_large`, `no_content`, `export_failed`).
- [x] **6.5** *(optional)* `archive_gamma`, `delete_gamma`. Delete requires workspace admin — mark destructive and non-idempotent in the tool description.

### Phase 7 — Analytics ✅ **COMPLETE 2026-09-20**

- [x] **7.1** `get_gamma_analytics` — totals plus the 30-day `dailyViews` window.
- [x] **7.2** `get_gamma_card_analytics` — per-card `cardName`, `cardPosition`, `viewTimeSeconds`, `viewersPercent`.
- [x] **7.3** `get_gamma_viewer_analytics` — paginated, `sortDirection`.
- [x] **7.4** `get_gamma_viewer_detail_analytics` — per-viewer `perCardTimeSpent`.
- [x] **7.5** Shared: all four need ≥edit permission and return 403 otherwise; data lags ~1 hour. Say both in the tool descriptions.

### Phase 8 — Prompts, docs, release

- [x] **8.1** *(done with Phase 2)* Update all 11 `prompts/public/*.json` templates: `generate-presentation` → `generate`. Add `title` and `themeId` guidance where useful.
- [ ] **8.2** Rewrite `docs/API_COVERAGE.md` and `docs/IMPLEMENTATION_STATUS.md` (both still dated 2025-01-17).
- [ ] **8.3** Update `README.md` (tool list is 4 tools), `CONFIGURATION.md` (new env vars), `PROMPTS_GUIDE.md` (tool name in examples).
- [ ] **8.4** Fix `CONTRIBUTING.md`, which wrongly calls `build/` git-ignored — it is committed and must be rebuilt with every `src` change.
- [ ] **8.5** `CHANGELOG.md` entry covering the rename, the `unsplash` removal, and the new tools.
- [x] **8.6a** ~~Add `version` and `description` to `package.json`~~ and `typescript`/`@types/node` to `devDependencies`. *Done 2026-09-20 alongside the project rename.*
- [ ] **8.6b** Keep the version in `src/index.ts` in step with `package.json` on release (currently both `1.0.0`); consider reading it from the manifest rather than hardcoding.

---

## 5. Verification

No test suite exists today. Minimum bar before merging:

0. **Parity check** — `node scripts/parity-check.mjs` asserts every tool on Gamma's
   official MCP server is registered here. Currently: 17/17, plus 6 beyond.
1. **Schema conformance** — a script that posts each tool's Zod schema shape against the live API with a trivial `inputText`, asserting no 400s. Catches enum drift like D1 directly.
2. **One live generation per generation tool** — `generate`, `generate_multi_page_gamma`, `generate_from_template`, each polled to `completed`, asserting `gammaUrl` and `credits` are present. These cost credits; keep them behind an opt-in flag.
3. **Read-only sweep** — `get_themes`, `get_folders`, `get_gammas`, `read_gamma`, and the four analytics tools against a known gamma. Free of charge, safe to run in CI with a key.
4. **Clean-clone build** — `rm -rf node_modules && npm ci && npm run build` must succeed. This would have caught D13.
5. ~~**Alias check**~~ — dropped with §2.4. Instead: after Phase 2, grep `prompts/` and your own MCP client configs for the old kebab-case names and confirm zero hits.

## 6. Suggested sequencing

Phase 0 is independently shippable and fixes a live 400-causing bug — do it
first and release it on its own. Phase 1 is pure refactor with no user-visible
change. Phases 2–3 carry the breaking rename and should land together as one
minor-version bump. Phases 4–7 are additive and can land in any order; Phase 4
(themes/folders) delivers the most value per line of code, since without it a
user has to copy IDs out of the Gamma app by hand.
