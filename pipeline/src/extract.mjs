// extract.mjs
// DOM 抽出ロジック(_site/concepts/*.html を Playwright で読み、概念の知識を構造化して返す)
//
// 安定セレクタ戦略:
//   ルート    : #quarto-document-content (Quarto の本文ラッパ)
//   メタ情報  : .concept-meta 内の dt/dd (OKF frontmatter の HTML 表現)
//   セクション: h1 をトップレベル、h3 をサブセクションとして「見出し → 次見出しまで」を切り出す
//
// セレクタ単体に依存しすぎず、class 名や位置に依存しない作りにしている。

const CONTAINER_SELECTOR = "#quarto-document-content";
const META_SELECTOR = ".concept-meta";
const META_JSON_SELECTOR = ".concept-meta-json";

// ページ全体から知識を抽出する関数(ブラウザコンテキスト内で実行される)
// 注意: evaluate はこの関数と引数のみをシリアライズするため、全て内部で完結させる。
export const extractFn = ({ containerSelector, metaSelector, metaJsonSelector } = {}) => {
  const text = (el) => (el.textContent || "").replace(/\s+/g, " ").trim();

  const blockText = (node) => {
    const tag = node.tagName ? node.tagName.toUpperCase() : "";
    switch (tag) {
      case "TABLE":
        return Array.from(node.querySelectorAll("tr"))
          .map((tr) =>
            Array.from(tr.querySelectorAll("th, td"))
              .map((c) => text(c))
              .join(" | "),
          )
          .join("\n");
      case "UL":
      case "OL":
        return Array.from(node.querySelectorAll(":scope > li"))
          .map((li) => `- ${text(li)}`)
          .join("\n");
      case "PRE":
        return text(node);
      default:
        return text(node);
    }
  };

  const main = document.querySelector(containerSelector ?? CONTAINER_SELECTOR);
  if (!main) return null;

  const metaEl = main.querySelector(metaSelector ?? META_SELECTOR);

  // Prefer the structured JSON block (order/nesting/typing preserved); fall back
  // to the flattened dl for older rendered pages.
  let meta = null;
  const jsonEl = metaEl ? metaEl.querySelector(metaJsonSelector ?? META_JSON_SELECTOR) : null;
  if (jsonEl) {
    try {
      const parsed = JSON.parse(jsonEl.textContent);
      if (parsed && typeof parsed === "object") meta = parsed;
    } catch {
      meta = null;
    }
  }
  if (!meta && metaEl) {
    meta = {};
    const items = metaEl.querySelectorAll("dt, dd");
    for (let i = 0; i < items.length; i += 2) {
      const key = (items[i].textContent || "").trim();
      const value = items[i + 1] ? (items[i + 1].textContent || "").trim() : "";
      if (key) meta[key] = value;
    }
  }
  if (!meta) return null;

  // Quarto は見出しと本文を <section class="levelN"> でラップする。
  // 見出し(h1/h3)を文書順に列挙し、各見出しの直後から兄弟ノードを辿って
  // 「次の見出し(またはセクション境界)まで」を本文ブロックとして切り出す。
  const headings = Array.from(main.querySelectorAll("h1:not(.title), h3"));
  const sections = [];
  const nextOf = (el) => {
    while (el && el.nodeType === 1 && el.tagName !== "SECTION") el = el.nextSibling;
    return el;
  };

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const level = parseInt(h.tagName[1], 10);
    const limit = nextOf(h); // この見出しの属するセクション境界
    const blocks = [];
    let node = h.nextSibling;
    while (node) {
      if (node.nodeType !== 1) {
        node = node.nextSibling;
        continue;
      }
      const tag = node.tagName;
      if (node === limit || /^H[1-6]$/.test(tag)) break;
      if (node.classList && node.classList.contains("concept-meta")) {
        node = node.nextSibling;
        continue;
      }
      const t = blockText(node);
      if (t) blocks.push(t);
      node = node.nextSibling;
    }
    sections.push({ heading: h.textContent.trim(), level, blocks });
  }

  return { meta, sections };
};

export async function extractFromPage(page, { path, url } = {}) {
  await page.goto(url);
  return page.evaluate(extractFn, {
    containerSelector: CONTAINER_SELECTOR,
    metaSelector: META_SELECTOR,
    metaJsonSelector: META_JSON_SELECTOR,
  });
}
