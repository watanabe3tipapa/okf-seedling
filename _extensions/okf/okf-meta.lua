-- okf-meta.lua
-- Quarto / pandoc filter:
-- Renders the OKF frontmatter as a metadata block at the top of each concept page,
-- so the metadata (type, status, verified, sources, ...) is visible to humans
-- and machine-extractable by Playwright (stable DOM selector: .concept-meta).

local META_FIELDS = {
  "type",
  "status",
  "title",
  "description",
  "resource",
  "tags",
  "generated",
  "verified",
  "stale_after",
  "runtime",
  "method",
  "path",
  "parameters",
  "executor",
  "attester",
  "sources",
}

local function esc(s)
  s = s:gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;")
  return s
end

local function fmtPlain(t)
  local n, isMap = 0, false
  for k in pairs(t) do
    n = n + 1
    if type(k) ~= "number" then
      isMap = true
    end
  end
  if isMap then
    local parts = {}
    for k, val in pairs(t) do
      table.insert(parts, tostring(k) .. ": " .. fmt(val))
    end
    table.sort(parts)
    return table.concat(parts, ", ")
  end
  local items = {}
  for i = 1, n do
    if t[i] ~= nil then
      items[#items + 1] = t[i]
    end
  end
  local hasSpace = false
  for _, item in ipairs(items) do
    local it = type(item) == "userdata" and item.t or nil
    if it == "Space" or it == "SoftBreak" or it == "LineBreak" then
      hasSpace = true
      break
    end
  end
  if hasSpace then
    local buf = {}
    for _, item in ipairs(items) do
      local it = type(item) == "userdata" and item.t or nil
      if it == "Space" or it == "SoftBreak" then
        table.insert(buf, " ")
      elseif it == "LineBreak" then
        table.insert(buf, "\n")
      else
        table.insert(buf, pandoc.utils.stringify(item))
      end
    end
    return table.concat(buf)
  end
  local parts = {}
  for _, item in ipairs(items) do
    local s = fmt(item)
    if s ~= "" then
      table.insert(parts, s)
    end
  end
  return table.concat(parts, "; ")
end

function fmt(v)
  if v == nil then
    return ""
  end
  local tv = type(v)
  if tv == "boolean" or tv == "number" or tv == "string" then
    return tostring(v)
  end
  if tv == "table" then
    return fmtPlain(v)
  end
  local t = v.t
  if t == "MetaMap" then
    local parts = {}
    for k, val in pairs(v) do
      table.insert(parts, tostring(k) .. ": " .. fmt(val))
    end
    table.sort(parts)
    return table.concat(parts, ", ")
  elseif t == "MetaList" then
    local firstItem = v[1]
    if firstItem and firstItem.t == "MetaMap" then
      local parts = {}
      for _, item in ipairs(v) do
        table.insert(parts, fmt(item))
      end
      return table.concat(parts, "; ")
    end
    local hasSpace = false
    for _, item in ipairs(v) do
      if item.t == "Space" or item.t == "SoftBreak" or item.t == "LineBreak" or item.t == "MetaInlines" then
        hasSpace = true
        break
      end
    end
    if hasSpace then
      local buf = {}
      for _, item in ipairs(v) do
        if item.t == "Space" or item.t == "SoftBreak" then
          table.insert(buf, " ")
        elseif item.t == "LineBreak" then
          table.insert(buf, "\n")
        else
          table.insert(buf, pandoc.utils.stringify(item))
        end
      end
      return table.concat(buf)
    end
    local parts = {}
    for _, item in ipairs(v) do
      local s = pandoc.utils.stringify(item)
      if s ~= "" then
        table.insert(parts, s)
      end
    end
    return table.concat(parts, "; ")
  elseif t == "MetaInlines" then
    return pandoc.utils.stringify(v)
  elseif t == "MetaBlocks" then
    local parts = {}
    for _, item in ipairs(v) do
      local s = fmt(item)
      if s ~= "" then
        table.insert(parts, s)
      end
    end
    return table.concat(parts, "; ")
  end
  return pandoc.utils.stringify(v)
end

function Pandoc(doc)
  local meta = doc.meta
  if not meta or not meta["type"] then
    return doc
  end

  local rows = {}
  for _, field in ipairs(META_FIELDS) do
    local value = meta[field]
    if value ~= nil then
      table.insert(rows, {
        pandoc.RawBlock("html", "<dt>" .. esc(field) .. "</dt>"),
        pandoc.RawBlock("html", "<dd>" .. esc(fmt(value)) .. "</dd>"),
      })
    end
  end

  if #rows == 0 then
    return doc
  end

  local blocks = {}
  table.insert(blocks, pandoc.RawBlock("html", '<div class="concept-meta">'))
  for _, pair in ipairs(rows) do
    table.insert(blocks, pair[1])
    table.insert(blocks, pair[2])
  end
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
