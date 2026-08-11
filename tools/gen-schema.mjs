#!/usr/bin/env node
// gen-schema.mjs
// Generates the schema table inside _extensions/okf/okf-meta.lua from
// tools/okf-types.json so the Quarto filter is driven by the single type registry.
//
// Usage:
//   node tools/gen-schema.mjs            # write the schema block into okf-meta.lua
//   node tools/gen-schema.mjs --check    # exit 1 if the generated block is stale
//
// Adding/editing a concept type ONLY touches tools/okf-types.json:
//   node tools/gen-schema.mjs   (commit the regenerated okf-meta.lua too)

import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const TYPES_PATH = join(ROOT, "tools", "okf-types.json");
const FILTER_PATH = join(ROOT, "_extensions", "okf", "okf-meta.lua");
const CHECK = process.argv.includes("--check");

function luaQuote(s) {
  return '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

function luaList(items) {
  return "{ " + items.map(luaQuote).join(", ") + " }";
}

const types = JSON.parse(await readFile(TYPES_PATH, "utf8"));
const SHARED = types.shared ?? [];
const OPTIONAL = types.optional ?? [];

// Stable field order: shared first, then per-type extras in first-seen order.
const metaFields = [...SHARED];
for (const name of Object.keys(types)) {
  if (name === "shared" || name === "optional") continue;
  for (const f of types[name].frontmatter ?? []) {
    if (!metaFields.includes(f)) metaFields.push(f);
  }
}

const byType = {};
for (const name of Object.keys(types)) {
  if (name === "shared" || name === "optional") continue;
  const def = types[name];
  byType[name] = {
    fields: [...new Set([...SHARED, ...(def.frontmatter ?? [])])],
    headings: def.headings ?? [],
  };
}

let block = "local schema = {\n";
block += "  meta_fields = " + luaList(metaFields) + ",\n";
block += "  optional = " + luaList(OPTIONAL) + ",\n";
block += "  by_type = {\n";
for (const name of Object.keys(byType)) {
  block += "    [" + luaQuote(name) + "] = {\n";
  block += "      fields = " + luaList(byType[name].fields) + ",\n";
  block += "      headings = " + luaList(byType[name].headings) + ",\n";
  block += "    },\n";
}
block += "  },\n";
block += "}\n";

const filter = await readFile(FILTER_PATH, "utf8");
const beginMarker = "-- @@OKF_SCHEMA_BEGIN@@\n";
const endMarker = "-- @@OKF_SCHEMA_END@@\n";
const b = filter.indexOf(beginMarker);
const e = filter.indexOf(endMarker);
if (b < 0 || e < 0) {
  console.error(`gen-schema: ${FILTER_PATH} に schema マーカーが見つかりません`);
  process.exit(1);
}
const head = filter.slice(0, b + beginMarker.length);
const tail = filter.slice(e);
const generated = head + block + tail;

if (CHECK) {
  if (generated === filter) {
    console.log("gen-schema: okf-meta.lua schema block is up to date.");
    process.exit(0);
  }
  console.error(
    "gen-schema: okf-meta.lua の schema が古い。`node tools/gen-schema.mjs` を実行してコミットしてください。",
  );
  process.exit(1);
}

await writeFile(FILTER_PATH, generated);
console.log(
  `gen-schema: updated schema in ${FILTER_PATH.replace(ROOT + "/", "")} (${Object.keys(byType).length} types, ${metaFields.length} fields)`,
);