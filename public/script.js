const productsList = document.getElementById("products-list");
const productRowTemplate = document.getElementById("product-row-template");
const addProductBtn = document.getElementById("add-product");
const form = document.getElementById("script-form");
const generateBtn = document.getElementById("generate-btn");

const resultEmpty = document.getElementById("result-empty");
const resultLoading = document.getElementById("result-loading");
const resultError = document.getElementById("result-error");
const resultContent = document.getElementById("result-content");
const resultActions = document.getElementById("result-actions");
const copyBtn = document.getElementById("copy-btn");
const exportBtn = document.getElementById("export-btn");

let lastScriptText = "";

function addProductRow() {
  const fragment = productRowTemplate.content.cloneNode(true);
  productsList.appendChild(fragment);
  renumberProducts();
}

function renumberProducts() {
  const rows = productsList.querySelectorAll(".product-row");
  rows.forEach((row, i) => {
    row.querySelector(".product-index").textContent = `Produto ${i + 1}`;
  });

  const removeButtons = productsList.querySelectorAll(".remove-product");
  removeButtons.forEach((btn) => {
    btn.disabled = rows.length <= 1;
    btn.style.visibility = rows.length <= 1 ? "hidden" : "visible";
  });
}

productsList.addEventListener("click", (event) => {
  if (event.target.classList.contains("remove-product")) {
    const row = event.target.closest(".product-row");
    if (productsList.querySelectorAll(".product-row").length > 1) {
      row.remove();
      renumberProducts();
    }
  }
});

addProductBtn.addEventListener("click", addProductRow);

// Start with two empty product rows.
addProductRow();
addProductRow();

function collectProducts() {
  const rows = productsList.querySelectorAll(".product-row");
  return Array.from(rows).map((row) => ({
    name: row.querySelector(".product-name").value.trim(),
    price: row.querySelector(".product-price").value.trim(),
    features: row.querySelector(".product-features").value.trim(),
  }));
}

function setLoading(isLoading) {
  generateBtn.disabled = isLoading;
  generateBtn.textContent = isLoading ? "Gerando..." : "Gerar roteiro";
  resultLoading.hidden = !isLoading;
  if (isLoading) {
    resultEmpty.hidden = true;
    resultError.hidden = true;
    resultContent.hidden = true;
    resultActions.hidden = true;
  }
}

function showError(message) {
  resultError.textContent = message;
  resultError.hidden = false;
  resultEmpty.hidden = true;
  resultContent.hidden = true;
  resultActions.hidden = true;
}

// Minimal markdown-to-HTML: ## headers, **bold**, numbered/bulleted lists, paragraphs.
function renderMarkdown(text) {
  const escapeHtml = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const withInline = (s) =>
    escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  const lines = text.split(/\r?\n/);
  let html = "";
  let listBuffer = [];
  let listType = null;

  const flushList = () => {
    if (listBuffer.length) {
      html += `<${listType}>${listBuffer.map((li) => `<li>${withInline(li)}</li>`).join("")}</${listType}>`;
      listBuffer = [];
      listType = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line)) {
      flushList();
      html += "<hr>";
    } else if (line.startsWith("### ")) {
      flushList();
      html += `<h3>${withInline(line.slice(4))}</h3>`;
    } else if (line.startsWith("## ")) {
      flushList();
      html += `<h3>${withInline(line.slice(3))}</h3>`;
    } else if (line.startsWith("# ")) {
      flushList();
      html += `<h2>${withInline(line.slice(2))}</h2>`;
    } else if (/^[-*]\s+/.test(line)) {
      if (listType !== "ul") { flushList(); listType = "ul"; }
      listBuffer.push(line.replace(/^[-*]\s+/, ""));
    } else if (/^\d+[.)]\s+/.test(line)) {
      if (listType !== "ol") { flushList(); listType = "ol"; }
      listBuffer.push(line.replace(/^\d+[.)]\s+/, ""));
    } else {
      flushList();
      html += `<p>${withInline(line)}</p>`;
    }
  }
  flushList();
  return html;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const businessDescription = document.getElementById("business-description").value.trim();
  const language = document.getElementById("language").value;
  const products = collectProducts();

  if (!businessDescription) {
    showError("Descreva o negócio/marca antes de gerar o roteiro.");
    return;
  }
  if (products.some((p) => !p.name || !p.price)) {
    showError("Preencha nome e preço de todos os produtos.");
    return;
  }

  setLoading(true);

  try {
    const response = await fetch("/api/generate-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessDescription, language, products }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao gerar o roteiro.");
    }

    lastScriptText = data.script;
    resultContent.innerHTML = renderMarkdown(data.script);
    resultContent.hidden = false;
    resultActions.hidden = false;
    resultEmpty.hidden = true;
    resultError.hidden = true;
  } catch (error) {
    showError(error.message || "Erro inesperado ao gerar o roteiro.");
  } finally {
    setLoading(false);
  }
});

copyBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(lastScriptText);
    const original = copyBtn.textContent;
    copyBtn.textContent = "Copiado!";
    setTimeout(() => { copyBtn.textContent = original; }, 1500);
  } catch {
    showError("Não foi possível copiar automaticamente. Selecione o texto manualmente.");
  }
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([lastScriptText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "roteiro-live-commerce.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});
