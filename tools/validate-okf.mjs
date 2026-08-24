#!/usr/bin/env node
// validate-okf.mjs
// Version-aware OKF conformance check for the okf/ bundle, driven by the type
// registry (tools/okf-types.json) and the version config (tools/okf-version.json).
//
// Reads the bundle's declared `okf_version` (okf/index.md) and compares it with
// tools/okf-version.json (single source of truth):
//   - declared in `supported`        -> strict validation with that version's rules
//   - declared NEWER than `current`  -> basic checks only + WARNING (non-fatal),
//                                       so bundles targeting a future OKF release
//                                       never break CI on day one
//   - declared OLDER / missing       -> warning + treated as `current`
//
// Per concept it enforces:
//   * YAML frontmatter present, `type` present and registered
//   * type-specific required frontmatter (shared + per-type from the registry)
//   * required provenance/headings conventions (warnings where stylistically soft)
//   * internal markdown links resolve inside the bundle (or are declared external)
//
// As a linter for information bundles it also warns on quality signals:
//   * stale_after が期限切れ(鮮度)
//   * title / description の欠落(発見可能性)
//   * 本文が空(学習可能性)
//   * 未登録 type / 推奨見出し / provenance 形式(規約からの逸脱)
//
// Errors exit 1 (CI ゲート)。Warnings は成功のまま報告されます(品質シグナル)。
//
// Upgrading to a new OKF version:
//   1. add the version to tools/okf-version.json (`supported` and bump `current`)
//   2. add a ruleset under RULES for that version (defaults apply otherwise)

import { readdir, readFile, mkdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import { resolve, join, relative, basename, dirname, extname, sep } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BUNDLE_ROOT = resolve(ROOT, process.argv.slice(2).find((a) => !a.startsWith("-")) ?? "okf");
const CFG_PATH = join(ROOT, "tools", "okf-version.json");
const TYPES_PATH = join(ROOT, "tools", "okf-types.json");
const SHOW_VERSIONS = process.argv.includes("--versions");

const okfVersion = JSON.parse(await readFile(CFG_PATH, "utf8"));
const CURRENT = String(okfVersion.current);
const SUPPORTED = okfVersion.supported.map(String);

const toolVersion = JSON.parse(await readFile(join(ROOT, "tools", "tool-version.json"), "utf8"));
const TOOL_VERSION = String(toolVersion.current);

const typeRegistry = JSON.parse(await readFile(TYPES_PATH, "utf8"));
const SHARED_FIELDS = typeRegistry.shared ?? [];
const TYPE_NAMES = Object.keys(typeRegistry).filter((k) => k !== "shared" && k !== "optional");

// Version-specific rules. Add a "0.3": { ... } entry when the next OKF lands.
const RULES = {
  "0.2": {
    reserved: ["index.md", "log.md"],
    requireType: true,
    checkHeadings: true,
    note: "v0.2: レジストリ駆動で frontmatter(必須 + type固有)・provenance・内部リンクを検証",
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
  console.log(`tool:      okf-seedling v${TOOL_VERSION}`);
  console.log(`current:   ${CURRENT}`);
  console.log(`supported: ${SUPPORTED.join(", ")}`);
  console.log(`types:     ${TYPE_NAMES.join(", ")}`);
  console.log("");
  for (const v of SUPPORTED) {
    console.log(`v${v}: ${RULES[v]?.note ?? "(バージョン固有ルールなし)"}`);
  }
}

// ---------- frontmatter helpers ----------

function splitFrontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(src);
  if (!m) return { yaml: "", body: src };
  return { yaml: m[1], body: m[2] };
}

// Returns top-level keys present in the YAML block (line-based; values ignored).
function topLevelKeys(yaml) {
  const keys = [];
  for (const line of yaml.split(/\r?\n/)) {
    const k = /^([A-Za-z_][A-Za-z0-9_]*):\s*/.exec(line);
    if (k) keys.push(k[1]);
  }
  return new Set(keys);
}

function extractType(yaml) {
  for (const line of yaml.split(/\r?\n/)) {
    const m = /^type:\s*["']?([^"' \n]+)/.exec(line);
    if (m) return m[1].replace(/["']/g, "").trim();
  }
  return null;
}

function nonEmptyValue(yaml, key) {
  // find the first line for key and confirm it isn't an empty value
  const lines = yaml.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(lines[i]);
    if (m && m[1] === key) {
      // If the value is empty, the next line may still be a nested list/map.
      if (m[2].trim() !== "") return true;
      // allow nested block continuation
      const next = lines[i + 1];
      return next !== undefined && /^\s+[-&]?/.test(next) && /^\s/.test(next);
    }
  }
  return false;
}

// ---------- link resolution ----------

function collectLinks(src) {
  const links = [];
  const re = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+[^)]*)?\)/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    let target = m[1];
    target = target.split("#")[0];
    target = target.split("?")[0];
    if (!target) continue;
    links.push(target);
  }
  return links;
}

function isExternal(target) {
  return /^(https?:)?\/\//.test(target) || /^(mailto:|tel:|#|\/)/.test(target);
}

// ---------- traversal ----------

async function walk(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) await walk(full, acc);
    else if (e.name.endsWith(".md")) acc.push(full);
  }
  return acc;
}

async function readDeclaredVersion(yaml) {
  for (const line of yaml.split(/\r?\n/)) {
    const m = /^okf_version:\s*["']?([^"'\r\n]+)/.exec(line);
    if (m) return m[1].replace(/["']/g, "").trim();
  }
  return null;
}

// ---------- main ----------

// notes/ はローカル専用の秘密領域(.gitignore 対象)。誤って追跡されたら即エラーにする。
function checkNotesUntracked() {
  try {
    const out = execSync("git ls-files -- notes/", { cwd: ROOT, encoding: "utf8" });
    const tracked = out.split(/\r?\n/).filter(Boolean);
    if (tracked.length > 0) {
      console.error("notes/ validation FAILED:");
      for (const f of tracked) console.error(`  - ${f} が git 追跡されています`);
      console.error(
        "notes/ はローカル専用のシークレット領域です。追跡を外すには:\n  git rm -r --cached notes",
      );
      process.exit(1);
    }
  } catch {
    // git コマンド不在 / 非 git 環境(git ls-files が非ゼロ終了): 検査をスキップ(非破壊)
  }
}

async function main() {
  if (SHOW_VERSIONS) {
    printVersions();
    return;
  }

  checkNotesUntracked();

  await mkdir(BUNDLE_ROOT, { recursive: true });
  const files = await walk(BUNDLE_ROOT);
  const indexSrc = await readFile(join(BUNDLE_ROOT, "index.md"), "utf8").catch(() => null);
  const declared = indexSrc ? await readDeclaredVersion(splitFrontmatter(indexSrc).yaml) : null;

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
  const checkHeadings = rules.checkHeadings ?? true;

  const errors = [];
  const allFiles = new Set(files.map((f) => f));

  for (const file of files) {
    const rel = relative(BUNDLE_ROOT, file);
    const name = basename(file);
    const src = await readFile(file, "utf8");
    const { yaml, body } = splitFrontmatter(src);

    if (reserved.has(name)) {
      if (name === "log.md" && !/^#\s/.test(src.trim())) {
        errors.push(`${rel}: log.md は日付見出し形式で記述してください`);
      }
      continue;
    }

    if (!yaml) {
      errors.push(`${rel}: YAML frontmatter ブロックがありません`);
      continue;
    }

    // -- type required + registered --
    if (requireType) {
      const type = extractType(yaml);
      if (!type) {
        errors.push(`${rel}: 必須フィールド type がありません`);
        continue;
      }
      if (!TYPE_NAMES.includes(type)) {
        warnings.push(`${rel}: type="${type}" はレジストリ(tools/okf-types.json)に未登録です(基本チェックのみ)`);
      }
    }

    // -- required frontmatter (shared + per-type) --
    const keys = topLevelKeys(yaml);
    const type = extractType(yaml);
    const requiredFields = type && TYPE_NAMES.includes(type) ? [...SHARED_FIELDS, ...(typeRegistry[type]?.frontmatter ?? [])] : [...SHARED_FIELDS];
    for (const f of new Set(requiredFields)) {
      if (!keys.has(f) || !nonEmptyValue(yaml, f)) {
        errors.push(`${rel}: 必須フィールド ${f} がありません(または空)`);
      }
    }

    // -- provenance shape (soft) --
    for (const p of ["generated", "verified"]) {
      if (keys.has(p)) {
        const v = valueBlock(yaml, p);
        if (!/by:|at:/.test(v)) {
          warnings.push(`${rel}: ${p} は { by, at } 形式を推奨します`);
        }
      }
    }

    // -- linter: freshness / discoverability / completeness (soft, quality) --
    const staleRaw = scalarValue(yaml, "stale_after");
    if (staleRaw) {
      const stale = new Date(staleRaw.replace(/["']/g, ""));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!Number.isNaN(stale.getTime()) && stale < today) {
        warnings.push(`${rel}: stale_after(${staleRaw}) は期限切れです。見直し・更新を推奨します`);
      }
    }
    if (!scalarValue(yaml, "title")) {
      warnings.push(`${rel}: title がありません。エージェントのインデックスに効く表示名を推奨します`);
    }
    if (!scalarValue(yaml, "description")) {
      warnings.push(`${rel}: description がありません。検索・要約の手がかりになる一言要約を推奨します`);
    }
    if (!body.trim()) {
      warnings.push(`${rel}: 本文が空です。frontmatter だけの概念はエージェントが学習できません`);
    }

    // -- required headings (convention) --
    if (checkHeadings && type && TYPE_NAMES.includes(type)) {
      const thr = typeRegistry[type]?.headings ?? [];
      const lowerBody = body.replace(/```[\s\S]*?```/g, "");
      for (const h of thr) {
        const re = new RegExp(`^#{1,6}\\s+${escapeRe(h)}`, "m");
        if (!re.test(lowerBody)) {
          warnings.push(`${rel}: 見出し "# ${h}" がありません(推奨見出し規約)`);
        }
      }
    }

    // -- internal link resolution --
    for (const target of collectLinks(src)) {
      if (isExternal(target)) continue;
      if (target.startsWith("references/")) {
        warnings.push(`${rel}: 内部参照 ${target} はバンドル外(references/)を指します`);
        continue;
      }
      if (extname(target) === ".qmd") {
        errors.push(`${rel}: リンク ${target} は .qmd のままです。stamp-okf で .md に変換してください`);
        continue;
      }
      const resolved = resolve(dirname(file), target);
      if (!allFiles.has(resolved)) {
        errors.push(`${rel}: 内部リンク ${target} がバンドル内に解決できません`);
      }
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
    console.log(`note: ${warnings.length} 件の警告 — 上記 WARN を確認してください`);
  }
}

// helpers for provenance value extraction (soft check)
function valueBlock(yaml, key) {
  const lines = yaml.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (/^([A-Za-z_][A-Za-z0-9_]*):\s*/.test(lines[i]) && lines[i].startsWith(key + ":")) {
      let buf = lines[i];
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\s+/.test(lines[j])) buf += "\n" + lines[j];
        else break;
      }
      return buf;
    }
  }
  return "";
}
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// scalar (first-line) string value of a top-level key; "" if missing or nested.
function scalarValue(yaml, key) {
  for (const line of yaml.split(/\r?\n/)) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (m && m[1] === key) {
      return m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
  return "";
}

main().catch((err) => {
  console.error("validate-okf:", err.message);
  process.exit(1);
});