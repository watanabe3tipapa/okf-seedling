#!/usr/bin/env node
// validate-okf.mjs
// OKF v0.2 conformance check for the okf/ bundle.
// Rules (§11): every non-reserved .md has a parseable YAML frontmatter with non-empty `type`;
// reserved files (index.md / log.md) follow §8 / §9 when present.

import { readdir, readFile, mkdir } from "node:fs/promises";
import { resolve, join, relative, basename } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BUNDLE_ROOT = join(ROOT, process.argv[2] ?? "okf");

const RESERVED = new Set(["index.md", "log.md"]);

function hasFrontmatterBlock(src) {
  return /^---\r?\n[\s\S]*?\r?\n---\r?\n?/.test(src);
}

function extractType(src) {
  const m = /^---\r?\n[\s\S]*?^type:\s*["']?([^"' \n]+)[\s\S]*?\r?\n---\r?\n?/m.exec(src);
  return m ? m[1] : null;
}

async function walk(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(full, acc);
    else if (e.name.endsWith(".md")) acc.push(full);
  }
  return acc;
}

async function main() {
  await mkdir(BUNDLE_ROOT, { recursive: true });
  const files = await walk(BUNDLE_ROOT);
  const errors = [];

  for (const file of files) {
    const rel = relative(BUNDLE_ROOT, file);
    const name = basename(file);
    const src = await readFile(file, "utf8");

    if (RESERVED.has(name)) {
      if (name === "log.md" && !/^#\s/.test(src.trim())) {
        errors.push(`${rel}: log.md は日付見出し形式で記述してください`);
      }
      continue;
    }

    if (!hasFrontmatterBlock(src)) {
      errors.push(`${rel}: YAML frontmatter ブロックがありません`);
      continue;
    }
    const type = extractType(src);
    if (!type) {
      errors.push(`${rel}: 必須フィールド type がありません`);
    }
  }

  if (errors.length > 0) {
    console.error("OKF v0.2 validation FAILED:");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`OKF v0.2 validation PASSED (${files.length} files in ${relative(ROOT, BUNDLE_ROOT)})`);
}

main().catch((err) => {
  console.error("validate-okf:", err.message);
  process.exit(1);
});