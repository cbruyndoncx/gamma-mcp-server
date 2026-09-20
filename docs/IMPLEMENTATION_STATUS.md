# Implementation Status

**Last updated:** 2026-09-20

## Summary

This server exposes **every documented endpoint** of the Gamma v1.0 REST API, and
has **full tool parity** with Gamma's official MCP server (17/17 tools), plus six
tools beyond it.

Verify parity at any time:

```bash
npm run build && node scripts/parity-check.mjs
```

## Tools

### Parity with Gamma's official MCP server

`generate` · `generate_multi_page_gamma` · `generate_from_template` ·
`get_generation_status` · `generate_image` · `get_image_generation_status` ·
`export_gamma` · `get_export_status` · `get_gammas` · `read_gamma` ·
`get_gamma_comments` · `get_gamma_analytics` · `get_gamma_card_analytics` ·
`get_gamma_viewer_analytics` · `get_gamma_viewer_detail_analytics` · `get_themes` ·
`get_folders`

### Beyond the official server

| Tool | Why it exists here |
|---|---|
| `download_export` | Writes an export to the machine running the server — a hosted server cannot do this |
| `archive_gamma` | REST endpoint exists but the official server does not expose it |
| `delete_gamma` | As above. Permanent and admin-only, so it requires `confirmDelete: true` |
| `archive_image` | As above, for the media library |
| `generate_executive_presentation` | Opinionated 16x9 PPTX preset |
| `generate_executive_report` | Opinionated A4 PDF preset |

Plus the JSON prompt-template system with hot-reload, which the official server
has no equivalent for.

## Known limitations

1. **`read_gamma` is metadata only.** No public REST endpoint returns card content.
2. **`imageOptions.model` and `textOptions.language` are free strings.** Both enums
   change often enough that pinning them would cause spurious rejections.
3. **`cardOptions.dimensions` is a free string.** Valid values depend on `format`;
   an invalid pairing is silently defaulted by Gamma and reported in `warnings`,
   which this server surfaces.
4. **API-key auth only.** OAuth is deliberate scope — see [API_COVERAGE.md](API_COVERAGE.md).

## Outstanding verification

One item needs a live API call to settle:

- **`numCards` stepping.** `generate_executive_report` previously rounded to
  multiples of 5 above 15 and capped at 60. The current spec documents a plain
  1–75 integer, so the rounding was removed. Confirm with a single call using
  `numCards: 23`; if it returns a 400, the rule is real but undocumented — restore
  it and record the constraint. See the `TODO(verify)` in `src/tools/presets.ts`.

No API key was available in the session that made these changes, so no live call
has been made against any endpoint.
