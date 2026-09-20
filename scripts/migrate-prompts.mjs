#!/usr/bin/env node
/**
 * Rewrite prompt templates for the v1.0 tool rename.
 *
 * Portable across macOS and Linux, unlike `sed -i`, which differs between
 * BSD and GNU. Run with --dry-run first.
 *
 *   node scripts/migrate-prompts.mjs --dry-run /path/to/private-prompts
 *   node scripts/migrate-prompts.mjs           /path/to/private-prompts
 */

import { readdir, readFile, writeFile, copyFile } from "fs/promises";
import { join } from "path";

/** Order-independent: no pattern is a substring of another's replacement. */
const REPLACEMENTS = [
  ["generate-executive-presentation", "generate_executive_presentation"],
  ["generate-executive-report", "generate_executive_report"],
  ["generate-presentation", "generate"],
  ["get-presentation-assets", "get_generation_status"],
  ["unsplash", "pexels"],
];

function rewrite(text) {
  const hits = [];
  let out = text;
  for (const [from, to] of REPLACEMENTS) {
    const count = out.split(from).length - 1;
    if (count > 0) {
      hits.push(`${from} -> ${to} (${count}x)`);
      out = out.split(from).join(to);
    }
  }
  return { out, hits };
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dir = args.find((a) => !a.startsWith("--"));

if (!dir) {
  console.error("Usage: node scripts/migrate-prompts.mjs [--dry-run] <prompts-dir>");
  process.exit(1);
}

const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
if (files.length === 0) {
  console.error(`No .json files in ${dir}`);
  process.exit(1);
}

let changed = 0;
let invalid = 0;

for (const file of files) {
  const path = join(dir, file);
  const original = await readFile(path, "utf-8");
  const { out, hits } = rewrite(original);

  if (hits.length === 0) {
    console.log(`  ${file}: no change`);
    continue;
  }

  // Never write something that would not load.
  try {
    JSON.parse(out);
  } catch (err) {
    console.error(`! ${file}: rewrite produced invalid JSON, skipped (${err.message})`);
    invalid += 1;
    continue;
  }

  console.log(`${dryRun ? "would change" : "changed"} ${file}: ${hits.join(", ")}`);

  if (!dryRun) {
    await copyFile(path, `${path}.bak`);
    await writeFile(path, out, "utf-8");
  }
  changed += 1;
}

console.log(
  `\n${dryRun ? "Would update" : "Updated"} ${changed} of ${files.length} file(s)` +
    (invalid ? `, ${invalid} skipped as invalid` : "") +
    (dryRun ? ". Re-run without --dry-run to apply." : ". Originals saved as *.json.bak.")
);
