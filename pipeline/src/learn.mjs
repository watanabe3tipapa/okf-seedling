// learn.mjs
// Playwright 学習パイプライン: _site/concepts/*.html を concept 単位で読み取り、
// pipeline/knowledge/ に「知識」として蓄積する(同一 content hash はスキップ = 差分更新)。

import { chromium } from "playwright";
import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join, basename } from "node:path";
import { extractFromPage } from "./extract.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..");
const SITE_CONCEPTS = join(ROOT, "_site", "concepts");
const KNOWLEDGE_DIR = join(ROOT, "pipeline", "knowledge");
const CONCEPTS_DIR = join(KNOWLEDGE_DIR, "concepts");

const INDEX_PATH = join(KNOWLEDGE_DIR, "index.json");

function contentHash(meta, sections) {
  return createHash("sha256")
    .update(JSON.stringify({ meta, sections }))
    .digest("hex")
    .slice(0, 16);
}

function fileUrl(p) {
  return "file://" + p;
}

async function main() {
  let htmlFiles;
  try {
    await stat(SITE_CONCEPTS);
    htmlFiles = (await readdir(SITE_CONCEPTS)).filter((f) => f.endsWith(".html"));
  } catch {
    console.error("learn: _site/concepts が見つかりません。先に quarto render を実行してください。");
    process.exit(1);
  }

  await mkdir(CONCEPTS_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const summary = [];

  for (const file of htmlFiles) {
    const id = basename(file, ".html");
    const abs = join(SITE_CONCEPTS, file);
    const data = await extractFromPage(page, { url: fileUrl(abs) });
    if (!data || !data.meta || !data.meta.type) {
      console.log(`skip: ${id} (concept-meta なし)`);
      continue;
    }

    const hash = contentHash(data.meta, data.sections);
    const entry = {
      id,
      type: data.meta.type,
      url: `concepts/${file}`,
      title: data.meta.title ?? id,
      meta: data.meta,
      sections: data.sections,
      learnedAt: new Date().toISOString(),
      hash,
    };

    const dest = join(CONCEPTS_DIR, `${id}.json`);
    let status = "new";
    try {
      const prev = JSON.parse(await readFile(dest, "utf8"));
      status = prev.hash === hash ? "unchanged" : "updated";
    } catch {
      status = "new";
    }

    if (status !== "unchanged") {
      await writeFile(dest, JSON.stringify(entry, null, 2));
    }
    summary.push({ id, type: data.meta.type, status, sections: data.sections.length });
    console.log(`${status.padEnd(10)} ${id} (${data.meta.type}, ${data.sections.length} sections)`);
  }

  await browser.close();

  const index = {
    generatedAt: new Date().toISOString(),
    total: summary.length,
    byStatus: summary.reduce((acc, s) => ((acc[s.status] = (acc[s.status] ?? 0) + 1), acc), {}),
    concepts: summary,
  };
  await writeFile(INDEX_PATH, JSON.stringify(index, null, 2));
  console.log(`\nlearn: done. ${summary.length} concepts. ${JSON.stringify(index.byStatus)}`);
}

main().catch((err) => {
  console.error("learn:", err.message);
  process.exit(1);
});
