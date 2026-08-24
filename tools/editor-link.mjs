#!/usr/bin/env node
/**
 * editor-link.mjs
 *
 * OKF concept 雛形から Quarto Editor PE の直接編集 URL を生成する。
 *
 * Usage:
 *   node tools/editor-link.mjs <owner/repo> [ref]
 *   node tools/editor-link.mjs watanabe3tipapa/okf-seedling main
 *   node tools/editor-link.mjs YOURNAME/my-knowledge-bundle
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const EDITOR_BASE = 'https://quarto-editor-pe.vercel.app/editor';

// concept 雛形のリスト（okf-types.json から動的に読むことも可能）
const DEFAULT_CONCEPTS = [
  'concepts/api-overview.qmd',
  'concepts/api-endpoint.qmd',
  'concepts/api-schema.qmd',
  'concepts/playbook.qmd',
  'concepts/metric.qmd',
  'concepts/attested-computation.qmd'
];

function usage() {
  console.error(`Usage: node tools/editor-link.mjs <owner/repo> [ref]`);
  console.error(`  ref defaults to "main"`);
  process.exit(1);
}

const repo = process.argv[2];
if (!repo || repo.includes('help') || repo === '-h') {
  usage();
}

const ref = process.argv[3] || 'main';

// okf-types.json から型名を読取る（あれば）
let types = {};
try {
  const typesJson = readFileSync(join(__dirname, 'okf-types.json'), 'utf-8');
  types = JSON.parse(typesJson);
} catch (e) {
  // okf-types.json がなくてもデフォルトで動作
}

console.log(`# Quarto Editor PE 深層リンク`);
console.log(`# Repository: ${repo}`);
console.log(`# Ref: ${ref}`);
console.log(`# Editor: ${EDITOR_BASE}`);
console.log('');

for (const conceptPath of DEFAULT_CONCEPTS) {
  const url = `${EDITOR_BASE}?repo=${encodeURIComponent(repo)}&file=${encodeURIComponent(conceptPath)}&ref=${encodeURIComponent(ref)}`;
  // 型名をファイル名から推定
  const baseName = conceptPath.replace('concepts/', '').replace('.qmd', '');
  const typeName = baseName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  console.log(`## ${typeName}`);
  console.log(`  File : ${conceptPath}`);
  console.log(`  Link : ${url}`);
  console.log('');
}

// Markdown テーブル形式でも出力
console.log(`## まとめ（テーブル）`);
console.log(`| 型 | ファイル | 編集リンク |`);
console.log(`|---|---|---|`);
for (const conceptPath of DEFAULT_CONCEPTS) {
  const baseName = conceptPath.replace('concepts/', '').replace('.qmd', '');
  const typeName = baseName.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  const url = `${EDITOR_BASE}?repo=${encodeURIComponent(repo)}&file=${encodeURIComponent(conceptPath)}&ref=${encodeURIComponent(ref)}`;
  console.log(`| ${typeName} | \`${conceptPath}\` | [Edit](${url}) |`);
}
