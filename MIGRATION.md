# Migration Guide — v1.0 API update

This release renames every tool and the npm package. Nothing breaks loudly: prompt
templates name tools as **free text that is never validated**, so a stale tool name
fails at generation time with the model saying it cannot find the tool — not at
startup. Work through the checklist below on each machine.

**Back up first.** The `sed` commands below edit files in place.

```bash
cp -r "$GAMMA_PROMPTS_PRIVATE_DIR" "$GAMMA_PROMPTS_PRIVATE_DIR.bak-$(date +%F)"
```

---

## 1. What changed

### Tool names

| Old | New |
|---|---|
| `generate-presentation` | `generate` |
| `get-presentation-assets` | `get_generation_status` — plus `download_export` for the download half |
| `generate-executive-presentation` | `generate_executive_presentation` |
| `generate-executive-report` | `generate_executive_report` |

There is **no alias layer**. The old names are gone.

Names now match [Gamma's official MCP server](https://developers.gamma.app/mcp/mcp-tools-reference),
so prompts written against that server work here unchanged.

### Package and server identity

| | Old | New |
|---|---|---|
| npm package | `gamma-mcp-server` | `thirdbrain-gamma-mcp-server` |
| MCP server name | `gamma-presentation` | `thirdbrain-gamma` |

npm forbids capitals in new package names, so the package is lowercase even though
the project is "ThirdBrain Gamma MCP Server".

### A value that now errors

`imageOptions.source: "unsplash"` was removed from the Gamma API — it returns a
**400**. Use `pexels`. `themeAccent` is also new.

---

## 2. Update your MCP client config

In `claude_desktop_config.json` (or your client's equivalent):

```json
{
  "mcpServers": {
    "thirdbrain-gamma": {
      "command": "npx",
      "args": ["-y", "thirdbrain-gamma-mcp-server"],
      "env": {
        "GAMMA_API_KEY": "sk-gamma-...",
        "GAMMA_PROMPTS_PRIVATE_DIR": "/absolute/path/to/your/private-prompts",
        "GAMMA_DOWNLOAD_DIR": "/where/exports/should/land"
      }
    }
  }
}
```

The `mcpServers` key is yours to choose, but renaming it from `gamma-presentation`
avoids confusion if you also connect Gamma's official server.

`GAMMA_DOWNLOAD_DIR` is new — it replaces the hardcoded `/tmp` that
`download_export` used to write to. Optional; defaults to `/tmp`.

> If you run from a git clone rather than npx, pull this branch and run
> `npm install && npm run build`. `typescript` and `@types/node` were missing from
> the manifest before, so a clean clone could never build.

---

## 3. Update your private prompt templates

### Find what needs changing

```bash
cd "$GAMMA_PROMPTS_PRIVATE_DIR"
grep -l 'generate-presentation\|get-presentation-assets\|generate-executive-\|unsplash' *.json
```

### Apply the renames

```bash
# Tool names
sed -i 's/generate-presentation/generate/g' *.json
sed -i 's/generate-executive-presentation/generate_executive_presentation/g' *.json
sed -i 's/generate-executive-report/generate_executive_report/g' *.json
sed -i 's/get-presentation-assets/get_generation_status/g' *.json

# Removed API value
sed -i 's/"unsplash"/"pexels"/g; s/\bunsplash\b/pexels/g' *.json
```

> **Order matters.** Run the `generate-executive-*` lines *before* the plain
> `generate-presentation` line if you reorder them — otherwise
> `generate-executive-presentation` gets partially rewritten. As listed above the
> first command is safe because `generate-executive-presentation` does not contain
> the substring `generate-presentation`.

### Verify the JSON still parses

```bash
for f in *.json; do python3 -c "import json;json.load(open('$f'))" || echo "INVALID: $f"; done
```

### Check nothing was missed

```bash
grep -n 'generate-presentation\|get-presentation-assets\|generate-executive-\|unsplash' *.json
# expect: no output
```

---

## 4. Optional: fix the parameter vocabulary

The bundled templates — and probably yours, if they were copied from them — end
with a block like this:

```
Use the generate tool with these parameters:
- numCards: 12
- textAmount: medium
- tone: professional and confident
- audience: investors and venture capitalists
- imageStyle: photo-realistic and professional
- exportAs: pptx
```

`textAmount` and `imageStyle` **are not real parameter names**, and `tone` /
`audience` are nested, not top-level. This is prose the model interprets, so it
mostly works — but naming the real parameters makes it reliable:

| Prose name used in templates | Actual parameter |
|---|---|
| `textAmount` | `textOptions.amount` |
| `tone` | `textOptions.tone` |
| `audience` | `textOptions.audience` |
| `imageStyle` | `imageOptions.style` |
| `numCards`, `exportAs`, `additionalInstructions` | unchanged — already correct |

A clearer version:

```
Use the generate tool with:
- numCards: 12
- exportAs: pptx
- textOptions: { amount: "medium", tone: "professional and confident",
                 audience: "investors and venture capitalists" }
- imageOptions: { source: "aiGenerated", stylePreset: "photorealistic" }
```

---

## 5. New capabilities worth adopting in your templates

| Instead of | Consider |
|---|---|
| Hardcoding a `themeId` | `get_themes` — look one up by name |
| Hardcoding a folder ID | `get_folders` |
| Telling the model to guess a card count | `title` to pin the name; `numCards` is a plain 1–75 integer |
| Nothing | `sharingOptions` — set workspace/external access, or email it to named recipients at generation time |
| A single deck | `generate_multi_page_gamma` — up to 50 pages under one URL, optionally published as a site |
| Rebuilding a deck from scratch each time | `generate_from_template` — remix an existing gamma |

Generation tools block until finished by default. If your client times out on long
calls, pass `waitForCompletion: false` and poll `get_generation_status`.

---

## 6. Verify

```bash
npm run build
node scripts/parity-check.mjs          # expect: 17/17, no missing tools
GAMMA_API_KEY=sk-gamma-... node build/index.js
```

On startup the server prints how many prompts it loaded from each directory. If
your private count is lower than expected, a file failed to parse — the reason is
printed to stderr above that line.

Then, in your client, run one of your private prompts end to end.

---

## 7. One thing to confirm with a live call

`generate_executive_report` used to round `numCards` up to a multiple of 5 above 15
and cap it at 60. The current Gamma spec documents a plain 1–75 integer, so that
rounding was removed — but no live call has confirmed it.

If your reports start failing with a 400 mentioning `numCards`, the stepping rule
is real but undocumented. Restore it in `src/tools/presets.ts` (see the
`TODO(verify)` comment there) and please note the constraint in that comment.
