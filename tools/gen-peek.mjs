#!/usr/bin/env node
// gen-peek.mjs
// post-render: okf/concepts/*.md -> 「知識の頭出し」データを _site/index.html に注入する。
//
// LP の Peek セクションに置かれた <!--PEEK_DATA--> を
// <script type="application/json" id="peek-data">...</script> に置き換える。
// fetch を使わないため file:// でも動作し、描画時の非同期フラッシュがない。
// プレースホルダが見つからない場合は警告のみで成功終了(CI 非破壊)。
//
// 使い方(任意の okf-seedling 派生バンドルで同じ):
//   _quarto.yml の post-render で node tools/stamp-okf.mjs の後に実行すること。

import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join, basename } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const BUNDLE_DIR = join(ROOT, "okf", "concepts");
const SITE_INDEX = join(ROOT, "_site", "index.html");
const PLACEHOLDER = "<!--PEEK_DATA-->";
const INJECTED_RE =
  /<script type="application\/json" id="peek-data">[\s\S]*?<\/script>/;
const HEAD_CHARS = 120;

// stamp-okf.mjs と同じ平 YAML 読み(バンドル .md は frontmatter を verbatim 保持)
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

// tags: "[finance, revenue]" / "finance; revenue" / "finance" を配列へ正規化
function parseTags(raw) {
  if (!raw) return [];
  const s = String(raw).replace(/^\[|\]$/g, "");
  const parts = s.split(/[,;]/).map((t) => t.trim().replace(/^["']|["']$/g, ""));
  return parts.filter(Boolean);
}

// 本文の「頭」: 最初の見出しでない非空ブロックを軽く Markdown 剥がして切り出す
function bodyHead(body) {
  const lines = body.split(/\r?\n/);
  let buf = [];
  for (const line of lines) {
    const t = line.trim();
    if (t === "") {
      if (buf.length) break;
      continue;
    }
    if (/^#{1,6}\s/.test(t)) continue;
    if (/^(```|~~~)/.test(t)) break;
    buf.push(t);
  }
  const text = buf
    .join(" ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > HEAD_CHARS ? text.slice(0, HEAD_CHARS - 1) + "…" : text;
}

async function main() {
  let files;
  try {
    files = (await readdir(BUNDLE_DIR)).filter((f) => f.endsWith(".md"));
  } catch {
    console.log("gen-peek: okf/concepts がない(先に stamp-okf.mjs を実行)。何もしない。");
    process.exit(0);
  }

  const items = [];
  for (const file of files.sort()) {
    const src = await readFile(join(BUNDLE_DIR, file), "utf8");
    const { yaml, body } = parseFrontmatter(src);
    if (!yaml.type) continue;
    items.push({
      id: basename(file, ".md"),
      type: yaml.type,
      title: yaml.title || yaml.id || basename(file, ".md"),
      description: yaml.description || "",
      status: yaml.status || "",
      staleAfter: yaml.stale_after || "",
      tags: parseTags(yaml.tags),
      head: bodyHead(body),
      url: `concepts/${basename(file, ".md")}.html`,
    });
  }
  items.sort((a, b) => a.id.localeCompare(b.id));

  const json = JSON.stringify(items).replace(/</g, "\\u003c");
  const block = `<script type="application/json" id="peek-data">${json}</script>`;

  let html;
  try {
    html = await readFile(SITE_INDEX, "utf8");
  } catch {
    console.log("gen-peek: _site/index.html がない(先に quarto render)。何もしない。");
    process.exit(0);
  }

  let next;
  if (html.includes(PLACEHOLDER)) {
    next = html.replace(PLACEHOLDER, block);
  } else if (INJECTED_RE.test(html)) {
    next = html.replace(INJECTED_RE, block); // 冪等: 再注入は既存ブロックを置換
  } else {
    console.log(
      "gen-peek: index.html に <!--PEEK_DATA--> が見つかりません(Peekセクションなし?)。何もしない。",
    );
    process.exit(0);
  }

  await writeFile(SITE_INDEX, next);
  console.log(`gen-peek: injected ${items.length} peek card(s) into _site/index.html`);
}

main().catch((err) => {
  console.error("gen-peek:", err.message);
  process.exit(1);
});
