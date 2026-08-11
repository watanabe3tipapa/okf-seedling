#!/usr/bin/env node
// validate-okf.mjs
// Version-aware OKF conformance check for the okf/ bundle.
//
// Reads the bundle's declared `okf_version` (okf/index.md) and compares it with
// tools/okf-version.json (single source of truth):
//   - declared in `supported`        -> strict validation with that version's rules
//   - declared NEWER than `current`  -> basic checks only + WARNING (non-fatal),
//                                       so bundles targeting a future OKF release
//                                       never break CI on day one
//   - declared OLDER / missing       -> warning + treated as `current`
//
// Upgrading to a new OKF version:
//   1. add the version to tools/okf-version.json (`supported` and bump `current`)
//   2. add a ruleset under RULES for that version (defaults apply otherwise)

import { readdir, readFile, mkdir } from "node:fs/promises";
import { resolve, join, relative, basename } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BUNDLE_ROOT = resolve(ROOT, process.argv.slice(2).find((a) => !a.startsWith("-")) ?? "okf");
const CFG_PATH = join(ROOT, "tools", "okf-version.json");
const SHOW_VERSIONS = process.argv.includes("--versions");

const okfVersion = JSON.parse(await readFile(CFG_PATH, "utf8"));
const CURRENT = String(okfVersion.current);
const SUPPORTED = okfVersion.supported.map(String);

// Version-specific rules. Add a "0.3": { ... } entry when the next OKF lands.
const RULES = {
  "0.2": {
    reserved: ["index.md", "log.md"],
    requireType: true,
    note: "v0.2: non-reserved .md は frontmatter + 非空 type が必須",
  },
};

function parseVersion(v) {
  const m = /^(\d+)(?:\.(\d+))?/.exec(String(v).trim());
  return m ? { major: Number(m[1]), minor: m[2] ? Number(m[2]) : 0 } : null;
}

function cmpVersion(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  return a.minor - b.minor;
}

function printVersions() {
  console.log(`current:   ${CURRENT}`);
  console.log(`supported: ${SUPPORTED.join(", ")}`);
  console.log("");
  for (const v of SUPPORTED) {
    console.log(`v${v}: ${RULES[v]?.note ?? "(バージョン固有ルールなし)"}`);
  }
  console.log("");
  console.log(
    "upgrade flow: 1) okf-version.json に version 追加 + current 更新 " +
      "2) validate-okf.mjs の RULES にルールセット追加",
  );
}

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

async function readDeclaredVersion() {
  try {
    const src = await readFile(join(BUNDLE_ROOT, "index.md"), "utf8");
    const m = /^---\r?\n[\s\S]*?^okf_version:\s*["']?([^"'\r\n]+)/m.exec(src);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

async function main() {
  if (SHOW_VERSIONS) {
    printVersions();
    return;
  }

  await mkdir(BUNDLE_ROOT, { recursive: true });
  const files = await walk(BUNDLE_ROOT);
  const declared = await readDeclaredVersion();

  const warnings = [];
  let ruleVersion = null;

  if (!declared) {
    warnings.push(`okf_version が宣言されていません(okf/index.md)。current=${CURRENT} として検証します`);
    ruleVersion = CURRENT;
  } else if (SUPPORTED.includes(declared)) {
    ruleVersion = declared;
  } else {
    const dv = parseVersion(declared);
    const cv = parseVersion(CURRENT);
    if (dv && cv && cmpVersion(dv, cv) > 0) {
      warnings.push(
        `bundle は OKF ${declared} を対象にしていますが、この validator は ${CURRENT}(${SUPPORTED.join(", ")}) まで対応です。基本チェックのみ実施します`,
      );
    } else {
      warnings.push(
        `bundle の okf_version=${declared} は supported(${SUPPORTED.join(", ")}) にありません。current=${CURRENT} として検証します`,
      );
      ruleVersion = CURRENT;
    }
  }

  const rules = ruleVersion ? RULES[ruleVersion] ?? {} : {};
  const reserved = new Set(rules.reserved ?? ["index.md", "log.md"]);
  const requireType = rules.requireType ?? true;

  const errors = [];
  for (const file of files) {
    const rel = relative(BUNDLE_ROOT, file);
    const name = basename(file);
    const src = await readFile(file, "utf8");

    if (reserved.has(name)) {
      if (name === "log.md" && !/^#\s/.test(src.trim())) {
        errors.push(`${rel}: log.md は日付見出し形式で記述してください`);
      }
      continue;
    }

    if (!hasFrontmatterBlock(src)) {
      errors.push(`${rel}: YAML frontmatter ブロックがありません`);
      continue;
    }
    if (requireType) {
      const type = extractType(src);
      if (!type) errors.push(`${rel}: 必須フィールド type がありません`);
    }
  }

  for (const w of warnings) console.warn(`WARN: ${w}`);
  const label = ruleVersion ? `OKF v${ruleVersion}` : `OKF ${declared}(basic checks)`;

  if (errors.length > 0) {
    console.error(`${label} validation FAILED:`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`${label} validation PASSED (${files.length} files in ${relative(ROOT, BUNDLE_ROOT)})`);
  if (warnings.length > 0) {
    console.log(`note: ${warnings.length} 件の警告(basic/migration) — 上記 WARN を確認してください`);
  }
}

main().catch((err) => {
  console.error("validate-okf:", err.message);
  process.exit(1);
});