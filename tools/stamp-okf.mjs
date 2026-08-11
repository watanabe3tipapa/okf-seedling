#!/usr/bin/env node
// stamp-okf.mjs
// post-render: concepts/*.qmd (source of truth) -> okf/ OKF v0.2 bundle (.md).
// Keeps the YAML frontmatter verbatim, preserving provenance/trust metadata for agents.

import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { resolve, join, basename, dirname } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SRC_DIR = join(ROOT, "concepts");
const OUT_DIR = join(ROOT, "okf");
const BUNDLE_ROOT = OUT_DIR;
const OKF_VERSION = JSON.parse(
  readFileSync(join(ROOT, "tools", "okf-version.json"), "utf8"),
).current;

function parseFrontmatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(src);
  if (!m) return { yaml: {}, body: src };
  const yaml = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([a-zA-Z0-9_]+):\s*(.*)$/.exec(line);
    if (kv) yaml[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return { yaml, body: m[2] };
}

async function walkQmd(dir, acc = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) await walkQmd(full, acc);
    else if (e.name.endsWith(".qmd")) acc.push(full);
  }
  return acc;
}

function mdPath(qmdPath) {
  const rel = qmdPath.replace(SRC_DIR + "/", "").replace(/\.qmd$/, ".md");
  return join(BUNDLE_ROOT, "concepts", rel);
}

// Rewrite relative ``.qmd`` links to ``.md`` so the standalone bundle's
// internal references resolve (see PLAN2.md 2-E). External/absolute/anchored
// links and footnotes are left untouched.
function rewriteLinks(src) {
  return src.replace(/(\]\()([^()\s)]+?\.qmd)(?:[#?][^)]*)?(\))/g, (m, pre, target, post) => {
    return pre + target.replace(/\.qmd$/, ".md") + post;
  });
}

async function writeIndex(concepts) {
  const byDir = new Map();
  for (const { yaml, path } of concepts) {
    const rel = path.replace(BUNDLE_ROOT + "/", "");
    const dir = dirname(rel);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push({
      title: yaml.title ?? basename(rel, ".md"),
      desc: yaml.description ?? "",
      file: basename(rel),
    });
  }

  const lines = [
    "---",
    `okf_version: "${OKF_VERSION}"`,
    "---",
    "",
    "# Open Knowledge Format bundle",
    "",
  ];
  for (const [dir, items] of byDir) {
    lines.push(`## ${dir === "." ? "Root" : dir}`);
    lines.push("");
    for (const it of items) {
      const href = dir === "." ? it.file : `${dir}/${it.file}`;
      lines.push(`* [${it.title}](${href}) - ${it.desc}`);
    }
    lines.push("");
  }
  await writeFile(join(BUNDLE_ROOT, "index.md"), lines.join("\n"));
}

async function writeLog(conceptCount) {
  const logPath = join(BUNDLE_ROOT, "log.md");
  const today = new Date().toISOString().slice(0, 10);
  let existing = "";
  try {
    existing = await readFile(logPath, "utf8");
  } catch {
    // will create below
  }
  if (existing.trim() === "") {
    await writeFile(
      logPath,
      [
        "# Directory Update Log",
        "",
        `## ${today}`,
        `* **Update**: Initialized bundle with ${conceptCount} concept(s).`,
        "",
      ].join("\n"),
    );
    return;
  }
  // Append a dated entry once per day (kept append-only, avoids per-render spam).
  if (existing.includes(`## ${today}`)) {
    return;
  }
  const update = [
    "",
    `## ${today}`,
    `* **Update**: Rebuilt bundle with ${conceptCount} concept(s).`,
    "",
    "",
  ].join("\n");
  await writeFile(logPath, existing.replace(/\s+$/, "") + "\n" + update.trimStart());
}

async function main() {
  const sources = await walkQmd(SRC_DIR);
  if (sources.length === 0) {
    console.log("stamp-okf: no concepts/*.qmd found; doing nothing.");
    return;
  }
  await mkdir(BUNDLE_ROOT, { recursive: true });
  const conceptsDir = join(BUNDLE_ROOT, "concepts");
  await rm(conceptsDir, { recursive: true, force: true });
  await mkdir(conceptsDir, { recursive: true });
  const concepts = [];
  for (const src of sources) {
    const content = await readFile(src, "utf8");
    const { yaml, body } = parseFrontmatter(content);
    const out = mdPath(src);
    await mkdir(dirname(out), { recursive: true });
    const outContent = body.trim()
      ? `${rewriteLinks(content).replace(/\s+$/m, "")}\n`
      : content;
    await writeFile(out, outContent);
    concepts.push({ yaml, path: out });
    console.log(`stamp-okf: wrote ${out.replace(ROOT + "/", "")}`);
  }
  await writeIndex(concepts);
  await writeLog(concepts.length);
  console.log(`stamp-okf: bundle ready at okf/ (${concepts.length} concepts)`);
}

main().catch((err) => {
  console.error("stamp-okf:", err.message);
  process.exit(1);
});