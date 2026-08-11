-- okf-meta.lua
-- Quarto / pandoc filter:
-- Renders the OKF frontmatter as a metadata block at the top of each concept page,
-- so the metadata (type, status, verified, sources, ...) is visible to humans
-- and machine-extractable. The schema table below is GENERATED from
-- tools/okf-types.json by tools/gen-schema.mjs (the single type registry).

-- @@OKF_SCHEMA_BEGIN@@
local schema = {
  meta_fields = { "type", "status", "generated", "verified", "stale_after", "resource", "tags", "method", "path", "runtime", "parameters", "executor", "attester" },
  optional = { "title", "description", "resource", "tags", "sources" },
  by_type = {
    ["APIOverview"] = {
      fields = { "type", "status", "generated", "verified", "stale_after", "resource", "tags" },
      headings = { "Base URL", "Versioning", "Authentication", "Common Errors" },
    },
    ["APIEndpoint"] = {
      fields = { "type", "status", "generated", "verified", "stale_after", "resource", "tags", "method", "path" },
      headings = { "Summary", "Path Params", "Query Params", "Headers", "Responses", "Examples" },
    },
    ["APISchema"] = {
      fields = { "type", "status", "generated", "verified", "stale_after", "resource", "tags" },
      headings = { "Fields", "JSON Example" },
    },
    ["Playbook"] = {
      fields = { "type", "status", "generated", "verified", "stale_after", "tags" },
      headings = { "Trigger", "Steps" },
    },
    ["Metric"] = {
      fields = { "type", "status", "generated", "verified", "stale_after", "tags", "resource" },
      headings = { "Definition" },
    },
    ["AttestedComputation"] = {
      fields = { "type", "status", "generated", "verified", "stale_after", "tags", "runtime", "parameters", "executor", "attester" },
      headings = { "Computation" },
    },
  },
}
-- @@OKF_SCHEMA_END@@
local META_FIELDS = schema.meta_fields or {}
local BY_TYPE = schema.by_type or {}

local function esc(s)
  s = s:gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;"):gsub('"', "&quot;")
  return s
end

-- ---------- JSON (structural) serialization ----------

-- Normalize a pandoc value into a plain Lua value (scalar / array / map).
local function norm(v)
  if v == nil then
    return nil
  end
  local tv = type(v)
  if tv == "userdata" then
    local t = v.t
    if t == "MetaMap" then
      local out = {}
      for k, val in pairs(v) do
        out[tostring(k)] = norm(val)
      end
      return out
    end
    if t == "MetaList" then
      local out = {}
      for i, item in ipairs(v) do
        out[i] = norm(item)
      end
      return out
    end
    return pandoc.utils.stringify(v)
  end
  if tv == "table" then
    -- pandoc inline list (e.g. MetaInlines): a sequence of inline nodes that
    -- should be joined into a single string, not treated as a JSON array.
    if #v > 0 then
      local looksInline = true
      for i = 1, #v do
        local item = v[i]
        if type(item) ~= "userdata" or item.t == nil then
          looksInline = false
          break
        end
      end
      if looksInline then
        return pandoc.utils.stringify(v)
      end
    end
    local isArr = true
    for k in pairs(v) do
      if type(k) ~= "number" then
        isArr = false
        break
      end
    end
    if isArr then
      local out = {}
      for i = 1, #v do
        out[i] = norm(v[i])
      end
      return out
    end
    if next(v) == nil then
      return {}
    end
    local out = {}
    for k, val in pairs(v) do
      out[tostring(k)] = norm(val)
    end
    return out
  end
  return v
end

local function jencode(v)
  local function escs(s)
    return s:gsub("\\", "\\\\"):gsub('"', '\\"'):gsub("\n", "\\n"):gsub("\r", "\\r"):gsub("\t", "\\t")
  end
  local function enc(x)
    local tx = type(x)
    if tx == "nil" then
      return "null"
    elseif tx == "number" then
      return tostring(x)
    elseif tx == "boolean" then
      return tostring(x)
    elseif tx == "string" then
      return '"' .. escs(x) .. '"'
    elseif tx == "table" then
      local isArr = true
      for k in pairs(x) do
        if type(k) ~= "number" then
          isArr = false
          break
        end
      end
      if isArr then
        local parts = {}
        for i = 1, #x do
          parts[i] = enc(x[i])
        end
        return "[" .. table.concat(parts, ",") .. "]"
      end
      local keys = {}
      for k in pairs(x) do
        table.insert(keys, k)
      end
      table.sort(keys)
      local parts = {}
      for _, k in ipairs(keys) do
        parts[#parts + 1] = enc(k) .. ":" .. enc(x[k])
      end
      return "{" .. table.concat(parts, ",") .. "}"
    end
    return "null"
  end
  return enc(v)
end

-- ---------- Human-readable flattened rendering ----------

function fmt(v)
  if v == nil then
    return ""
  end
  local tv = type(v)
  if tv == "boolean" or tv == "number" or tv == "string" then
    return tostring(v)
  end
  if tv == "table" then
    if #v > 0 then
      local looksInline = true
      for i = 1, #v do
        local item = v[i]
        if type(item) ~= "userdata" or item.t == nil then
          looksInline = false
          break
        end
      end
      if looksInline then
        return pandoc.utils.stringify(v)
      end
    end
    local keys = {}
    local isArr = true
    for k in pairs(v) do
      if type(k) ~= "number" then
        isArr = false
      end
      table.insert(keys, k)
    end
    if isArr then
      local parts = {}
      for _, item in ipairs(v) do
        local s = fmt(item)
        if s ~= "" then
          parts[#parts + 1] = s
        end
      end
      return table.concat(parts, "; ")
    end
    table.sort(keys, function(a, b)
      return tostring(a) < tostring(b)
    end)
    local parts = {}
    for _, k in ipairs(keys) do
      table.insert(parts, tostring(k) .. ": " .. fmt(v[k]))
    end
    return table.concat(parts, ", ")
  end
  return pandoc.utils.stringify(v)
end

function Pandoc(doc)
  local meta = doc.meta
  if not meta or not meta["type"] then
    return doc
  end

  local typeName = tostring(pandoc.utils.stringify(meta["type"]))
  -- optional validation hint, not enforced by the filter
  local typeDef = BY_TYPE[typeName]

  local rows = {}
  local structured = {}
  local seen = {}
  for _, field in ipairs(META_FIELDS) do
    local value = meta[field]
    if value ~= nil then
      table.insert(rows, {
        pandoc.RawBlock("html", "<dt>" .. esc(field) .. "</dt>"),
        pandoc.RawBlock("html", "<dd>" .. esc(fmt(value)) .. "</dd>"),
      })
      structured[field] = norm(value)
      seen[field] = true
    end
  end
  -- also surface any present optional/custom fields not in the core list
  for k, value in pairs(meta) do
    if not seen[k] then
      table.insert(rows, {
        pandoc.RawBlock("html", "<dt>" .. esc(tostring(k)) .. "</dt>"),
        pandoc.RawBlock("html", "<dd>" .. esc(fmt(value)) .. "</dd>"),
      })
      structured[tostring(k)] = norm(value)
    end
  end

  if #rows == 0 then
    return doc
  end

  local blocks = {}
  table.insert(blocks, pandoc.RawBlock("html", '<div class="concept-meta">'))
  -- structured JSON for machine consumers (Playwright parse .concept-meta-json)
  table.insert(
    blocks,
    pandoc.RawBlock(
      "html",
      '<script type="application/json" class="concept-meta-json">' .. jencode(structured) .. "</script>"
    )
  )
  table.insert(blocks, pandoc.RawBlock("html", '<dl class="concept-meta-dl">'))
  for _, pair in ipairs(rows) do
    table.insert(blocks, pair[1])
    table.insert(blocks, pair[2])
  end
  table.insert(blocks, pandoc.RawBlock("html", "</dl>"))
  table.insert(blocks, pandoc.RawBlock("html", "</div>"))

  local insertAt = 1
  local first = doc.blocks[1]
  if first and first.t == "Header" and first.level == 1 then
    insertAt = 2
  end
  for i = #blocks, 1, -1 do
    table.insert(doc.blocks, insertAt, blocks[i])
  end

  return doc
end