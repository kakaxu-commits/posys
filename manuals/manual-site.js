const documents = new Map([
  ["order-management-manual.md", "受注管理 操作マニュアル"],
  ["purchase-management-manual.md", "発注管理 操作マニュアル"],
  ["master-management-manual.md", "マスタ情報管理 操作マニュアル"],
  ["role-permission-guide.md", "権限・ロール説明書"],
  ["role-based-operation-guide.md", "ロール別操作ガイド"],
  ["README.md", "マニュアル一覧"],
  ["screenshot-checklist.md", "画面キャプチャチェックリスト"],
  ["quick-guides/order-sales-quick-guide.md", "受注営業担当者向け"],
  ["quick-guides/order-accounting-quick-guide.md", "受注経理担当者向け"],
  ["quick-guides/purchase-requester-quick-guide.md", "購買依頼者向け"],
  ["quick-guides/purchase-manager-quick-guide.md", "購買担当・承認者向け"],
  ["quick-guides/purchase-inspection-quick-guide.md", "検収担当者向け"],
  ["quick-guides/purchase-accounting-quick-guide.md", "発注経理担当者向け"],
]);

const home = document.querySelector("#home");
const documentView = document.querySelector("#document");
const breadcrumb = document.querySelector("#breadcrumb");
const overlay = document.querySelector(".overlay");
const menuButton = document.querySelector(".menu-button");
const navLinks = [...document.querySelectorAll("[data-doc]")];

menuButton.addEventListener("click", () => {
  document.body.classList.add("menu-open");
  overlay.hidden = false;
});

overlay.addEventListener("click", closeMenu);

function closeMenu() {
  document.body.classList.remove("menu-open");
  overlay.hidden = true;
}

window.addEventListener("hashchange", route);
document.addEventListener("click", (event) => {
  const link = event.target.closest("a");
  if (!link) return;
  if (link.hash?.startsWith("#/")) closeMenu();
});

route();

async function route() {
  const path = decodeURIComponent(location.hash.replace(/^#\//, ""));
  if (!path) {
    showHome();
    return;
  }
  await showDocument(path);
}

function showHome() {
  home.hidden = false;
  documentView.hidden = true;
  documentView.innerHTML = "";
  breadcrumb.textContent = "マニュアル一覧";
  setActive("");
}

async function showDocument(path) {
  home.hidden = true;
  documentView.hidden = false;
  breadcrumb.textContent = documents.get(path) || path;
  setActive(path);
  documentView.innerHTML = `<div class="loading">読み込み中...</div>`;

  try {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    documentView.innerHTML = `<div class="doc-body">${renderMarkdown(markdown, path)}</div>`;
    documentView.scrollIntoView({ block: "start" });
  } catch (error) {
    documentView.innerHTML = `<div class="error">マニュアルを読み込めませんでした。URL またはファイル配置を確認してください。<br>${escapeHtml(String(error.message || error))}</div>`;
  }
}

function setActive(path) {
  navLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.doc === path);
  });
}

function renderMarkdown(markdown, currentPath) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2], currentPath)}</h${level}>`);
      i += 1;
      continue;
    }

    if (isTableStart(lines, i)) {
      const rows = [];
      rows.push(parseTableRow(lines[i]));
      i += 2;
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(parseTableRow(lines[i]));
        i += 1;
      }
      html.push(renderTable(rows, currentPath));
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${inline(item, currentPath)}</li>`).join("")}</ol>`);
      continue;
    }

    if (/^-\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s+/, ""));
        i += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${inline(item, currentPath)}</li>`).join("")}</ul>`);
      continue;
    }

    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^-\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith("```") &&
      !isTableStart(lines, i)
    ) {
      para.push(lines[i]);
      i += 1;
    }
    html.push(`<p>${inline(para.join(" "), currentPath)}</p>`);
  }

  return html.join("\n");
}

function isTableStart(lines, index) {
  return /^\s*\|.*\|\s*$/.test(lines[index] || "") && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] || "");
}

function parseTableRow(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function renderTable(rows, currentPath) {
  if (!rows.length) return "";
  const [head, ...body] = rows;
  return `<table><thead><tr>${head.map((cell) => `<th>${inline(cell, currentPath)}</th>`).join("")}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell, currentPath)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function inline(text, currentPath) {
  let value = escapeHtml(text);

  value = value.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    return `<img alt="${escapeHtml(alt)}" src="${resolveAsset(src, currentPath)}">`;
  });

  value = value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const next = resolveLink(href, currentPath);
    return `<a href="${next}">${escapeHtml(label)}</a>`;
  });

  value = value.replace(/`([^`]+)`/g, "<code>$1</code>");
  value = value.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  return value;
}

function resolveAsset(src, currentPath) {
  if (/^(https?:|data:)/.test(src)) return src;
  const base = new URL(currentPath, location.href);
  return new URL(src, base).pathname.split("/").pop() === src
    ? src
    : new URL(src, base).href;
}

function resolveLink(href, currentPath) {
  if (/^(https?:|mailto:|#)/.test(href)) return href;
  if (href.endsWith(".md")) {
    const base = new URL(currentPath, location.href);
    const resolved = new URL(href, base);
    const root = new URL("./", location.href).pathname;
    return `#/${decodeURIComponent(resolved.pathname.replace(root, ""))}`;
  }
  return href;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
