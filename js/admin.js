/* =============================================
   RESTIO WELLNESS - admin.js
   Local admin dashboard for managing catalog mode,
   manual product content, and link overrides.
   ============================================= */

const ProductCatalog = window.RestioProducts || {};

const adminRefs = {
  modeInputs: Array.from(document.querySelectorAll('input[name="updateMode"]')),
  modePill: document.getElementById("admin-mode-pill"),
  modeHelp: document.getElementById("admin-mode-help"),
  syncManual: document.getElementById("admin-sync-manual"),
  exportJson: document.getElementById("admin-export-json"),
  addProduct: document.getElementById("admin-add-product"),
  search: document.getElementById("admin-search"),
  productsList: document.getElementById("admin-products-list"),
  count: document.getElementById("admin-count"),
  form: document.getElementById("admin-form"),
  editorTitle: document.getElementById("admin-editor-title"),
  editorHelp: document.getElementById("admin-editor-help"),
  editorMode: document.getElementById("admin-editor-mode"),
  previewImage: document.getElementById("admin-preview-image"),
  previewBadge: document.getElementById("admin-preview-badge"),
  previewTitle: document.getElementById("admin-preview-title"),
  previewDescription: document.getElementById("admin-preview-description"),
  previewPrice: document.getElementById("admin-preview-price"),
  previewLink: document.getElementById("admin-preview-link"),
  resetButton: document.getElementById("admin-reset"),
  deleteButton: document.getElementById("admin-delete"),
  clearUploadButton: document.getElementById("admin-clear-upload"),
  imageUpload: document.getElementById("admin-image-upload"),
  footerMode: document.getElementById("admin-footer-mode"),
  footerCount: document.getElementById("admin-footer-count"),
};

let baseCatalog = [];
let adminState = ProductCatalog.createDefaultAdminState
  ? ProductCatalog.createDefaultAdminState()
  : { settings: { updateMode: "auto" }, linkOverrides: {}, manualCatalog: [] };
let selectedProductId = "";
let searchTerm = "";

function createEmptyManualProduct() {
  const productId = `manual-${Date.now()}`;
  return ProductCatalog.normalizeProduct({
    asin: productId,
    title: "Novo produto",
    category: "sleep",
    image: "",
    cached_image: "",
    rating: 4.5,
    reviews: 0,
    badge: "",
    price: "",
    features: [],
    generated_description: "",
    affiliate_link: "",
    amazon_link_mode: "search",
    direct_link_verified: false,
    last_updated: new Date().toISOString().slice(0, 10),
  });
}

function getMode() {
  return "manual";
}

function getAutoPreviewState() {
  return {
    ...adminState,
    settings: { updateMode: "auto" },
  };
}

function getActiveCatalog() {
  return adminState.manualCatalog;
}

function getVisibleCatalog() {
  const catalog = getActiveCatalog();
  if (!searchTerm) {
    return catalog;
  }

  const query = searchTerm.toLowerCase();
  return catalog.filter((product) => {
    return [
      product.title,
      product.category,
      product.asin,
      product.price,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
}

function findSelectedProduct() {
  return getActiveCatalog().find((product) => product.asin === selectedProductId) || null;
}

function ensureManualCatalog() {
  if (adminState.manualCatalog.length) {
    return;
  }

  adminState.manualCatalog = ProductCatalog.createManualCatalog(
    ProductCatalog.applyAdminStateToProducts(baseCatalog, getAutoPreviewState()),
  );
  adminState = ProductCatalog.writeAdminState(adminState);
}

function ensureSelectedProduct() {
  const visibleCatalog = getVisibleCatalog();
  const activeCatalog = getActiveCatalog();
  const exists = activeCatalog.some((product) => product.asin === selectedProductId);

  if (!exists) {
    selectedProductId = visibleCatalog[0]?.asin || activeCatalog[0]?.asin || "";
  }
}

function updateModeCopy() {
  const manualMode = getMode() === "manual";
  adminRefs.modePill.textContent = manualMode ? "Manual" : "Automática";
  adminRefs.editorMode.textContent = manualMode ? "Edição completa" : "Links manuais";
  adminRefs.modeHelp.textContent = manualMode
    ? "No modo manual, o catálogo exibido no site passa a usar os dados editados aqui: título, descrição, imagens, links e preço."
    : "No modo automático, o site continua usando o catálogo do arquivo, mas você pode sobrescrever os links manualmente por produto.";
  adminRefs.editorHelp.textContent = manualMode
    ? "Todos os campos do anúncio podem ser editados e novos produtos podem ser adicionados."
    : "Neste modo, somente o link do produto fica editável. Os demais campos refletem o catálogo automático atual.";
  adminRefs.addProduct.disabled = !manualMode;
  adminRefs.syncManual.disabled = !manualMode;
  adminRefs.deleteButton.disabled = !manualMode;
  adminRefs.footerMode.textContent = `Modo: ${manualMode ? "manual" : "automático"}`;

  adminRefs.modeInputs.forEach((input) => {
    input.checked = input.value === getMode();
  });
}

function updateFooterCount(count) {
  adminRefs.count.textContent = `${count} item${count === 1 ? "" : "s"}`;
  adminRefs.footerCount.textContent = `Produtos: ${count}`;
}

function buildPreviewImage(product) {
  return ProductCatalog.buildProductImageSrc(product);
}

function renderPreview(product) {
  const fallbackProduct = product || createEmptyManualProduct();
  const image = buildPreviewImage(fallbackProduct);
  const fallbackImage = ProductCatalog.buildProductFallbackImage(fallbackProduct);
  const badgeText = fallbackProduct.badge || "Sem badge";
  const description =
    fallbackProduct.generated_description ||
    "Edite o produto para atualizar a descrição e visualizar o anúncio antes de publicá-lo.";
  const linkText = ProductCatalog.buildAmazonLinkForProduct(fallbackProduct) || "Link ainda não definido.";

  adminRefs.previewImage.src = image;
  adminRefs.previewImage.alt = fallbackProduct.title || "Prévia do produto";
  adminRefs.previewImage.dataset.fallbackImage = fallbackImage;
  adminRefs.previewImage.onerror = () => {
    adminRefs.previewImage.src = adminRefs.previewImage.dataset.fallbackImage || fallbackImage;
  };
  adminRefs.previewBadge.textContent = badgeText;
  adminRefs.previewTitle.textContent = fallbackProduct.title || "Novo produto";
  adminRefs.previewDescription.textContent = description;
  adminRefs.previewPrice.textContent = fallbackProduct.price || "--";
  adminRefs.previewLink.textContent = linkText;
}

function renderProductsList() {
  const visibleCatalog = getVisibleCatalog();
  updateFooterCount(visibleCatalog.length);

  if (!visibleCatalog.length) {
    adminRefs.productsList.innerHTML =
      '<div class="admin-help">Nenhum produto encontrado com esse filtro.</div>';
    return;
  }

  const mode = getMode();
  adminRefs.productsList.innerHTML = visibleCatalog
    .map((product) => {
      const isActive = product.asin === selectedProductId;
      const hasManualLink = Boolean(adminState.linkOverrides[product.asin]);
      const image = buildPreviewImage(product);
      const fallbackImage = ProductCatalog.buildProductFallbackImage(product);
      return `
        <button class="admin-product-item ${isActive ? "is-active" : ""}" type="button" data-product-id="${product.asin}">
          <div class="admin-product-thumb">
            <img src="${image}" data-fallback-image="${fallbackImage}" alt="${product.title}">
          </div>
          <div class="admin-product-copy">
            <h3>${product.title}</h3>
            <p>${product.category} · ${product.price || "Sem preço"}</p>
            <div class="admin-product-meta">
              <span class="admin-chip">${product.asin}</span>
              ${
                mode === "manual"
                  ? '<span class="admin-chip admin-chip--manual">Manual</span>'
                  : hasManualLink
                    ? '<span class="admin-chip admin-chip--manual">Link sobrescrito</span>'
                    : '<span class="admin-chip">Automático</span>'
              }
            </div>
          </div>
        </button>
      `;
    })
    .join("");
  ProductCatalog.enhanceDynamicContent?.(adminRefs.productsList);
}

function setFieldState(fieldName, disabled) {
  const field = adminRefs.form.elements[fieldName];
  if (field) {
    field.disabled = disabled;
  }
}

function renderForm() {
  ensureSelectedProduct();
  const product = findSelectedProduct();
  const manualMode = getMode() === "manual";

  if (!product) {
    adminRefs.form.reset();
    adminRefs.form.dataset.originalAsin = "";
    renderPreview(null);
    return;
  }

  adminRefs.form.dataset.originalAsin = product.asin;
  adminRefs.form.elements.asin.value = product.asin || "";
  adminRefs.form.elements.category.value = product.category || "sleep";
  adminRefs.form.elements.title.value = product.title || "";
  adminRefs.form.elements.generated_description.value = product.generated_description || "";
  adminRefs.form.elements.affiliate_link.value = product.affiliate_link || "";
  adminRefs.form.elements.price.value = product.price || "";
  adminRefs.form.elements.badge.value = product.badge || "";
  adminRefs.form.elements.rating.value = product.rating ?? "";
  adminRefs.form.elements.reviews.value = product.reviews ?? "";
  adminRefs.form.elements.image.value = product.image || "";
  adminRefs.form.elements.cached_image.value = product.cached_image || "";
  adminRefs.form.elements.features.value = (product.features || []).join("\n");

  setFieldState("asin", !manualMode);
  setFieldState("category", !manualMode);
  setFieldState("title", !manualMode);
  setFieldState("generated_description", !manualMode);
  setFieldState("price", !manualMode);
  setFieldState("badge", !manualMode);
  setFieldState("rating", !manualMode);
  setFieldState("reviews", !manualMode);
  setFieldState("image", !manualMode);
  setFieldState("features", !manualMode);
  adminRefs.imageUpload.disabled = false;
  adminRefs.clearUploadButton.disabled = false;

  adminRefs.editorTitle.textContent = manualMode
    ? `Editando ${product.title}`
    : `Editando link de ${product.title}`;

  renderPreview(product);
}

function persistState() {
  adminState = ProductCatalog.writeAdminState(adminState);
  ProductCatalog.resetProductCatalogCache?.();
}

function normalizeLinkInput(rawLink, productDraft) {
  const link = String(rawLink || "").trim();
  if (!link) {
    return ProductCatalog.buildAmazonLinkForProduct(productDraft);
  }
  if (link.includes("amazon.")) {
    return ProductCatalog.normalizeAmazonLink(link, productDraft);
  }
  return link;
}

function collectFormProduct() {
  const asin = String(adminRefs.form.elements.asin.value || "").trim() || `manual-${Date.now()}`;
  const title = String(adminRefs.form.elements.title.value || "").trim() || "Novo produto";
  const category = String(adminRefs.form.elements.category.value || "sleep").trim();
  const generatedDescription = String(adminRefs.form.elements.generated_description.value || "").trim();
  const image = String(adminRefs.form.elements.image.value || "").trim();
  const cachedImage = String(adminRefs.form.elements.cached_image.value || "").trim();
  const rawLink = String(adminRefs.form.elements.affiliate_link.value || "").trim();
  const price = String(adminRefs.form.elements.price.value || "").trim();
  const badge = String(adminRefs.form.elements.badge.value || "").trim();
  const rating = Number(adminRefs.form.elements.rating.value || 0);
  const reviews = Number(adminRefs.form.elements.reviews.value || 0);
  const features = String(adminRefs.form.elements.features.value || "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  const productDraft = {
    asin,
    title,
    category,
    generated_description: generatedDescription,
    image,
    cached_image: cachedImage,
    price,
    badge,
    rating,
    reviews,
    features,
    last_updated: new Date().toISOString().slice(0, 10),
  };

  const affiliateLink = normalizeLinkInput(rawLink, productDraft);
  const hasAmazonAsin = Boolean(ProductCatalog.extractAmazonAsin(affiliateLink));

  return ProductCatalog.normalizeProduct({
    ...productDraft,
    affiliate_link: affiliateLink,
    amazon_link_mode: hasAmazonAsin ? "dp" : "search",
    direct_link_verified: hasAmazonAsin,
  });
}

function saveManualProduct() {
  const originalAsin = adminRefs.form.dataset.originalAsin || "";
  const product = collectFormProduct();
  const duplicate = adminState.manualCatalog.find(
    (entry) => entry.asin === product.asin && entry.asin !== originalAsin,
  );

  if (duplicate) {
    alert("Já existe um produto com esse ID / ASIN no catálogo manual.");
    return;
  }

  const nextCatalog = adminState.manualCatalog.filter((entry) => entry.asin !== originalAsin);
  nextCatalog.push(product);
  adminState.manualCatalog = ProductCatalog.normalizeProducts(nextCatalog);
  selectedProductId = product.asin;
  persistState();
}

function saveAutoLinkOverride() {
  const originalAsin = adminRefs.form.dataset.originalAsin || "";
  const baseProduct = baseCatalog.find((product) => product.asin === originalAsin);
  if (!baseProduct) {
    return;
  }

  const rawLink = String(adminRefs.form.elements.affiliate_link.value || "").trim();
  const normalizedLink = rawLink
    ? normalizeLinkInput(rawLink, baseProduct)
    : ProductCatalog.buildAmazonLinkForProduct(baseProduct);
  const defaultLink = ProductCatalog.buildAmazonLinkForProduct(baseProduct);

  if (normalizedLink && normalizedLink !== defaultLink) {
    adminState.linkOverrides[originalAsin] = normalizedLink;
  } else {
    delete adminState.linkOverrides[originalAsin];
  }

  persistState();
}

function syncManualCatalog() {
  adminState.manualCatalog = ProductCatalog.createManualCatalog(
    ProductCatalog.applyAdminStateToProducts(baseCatalog, getAutoPreviewState()),
  );
  persistState();
}

function exportCatalog() {
  const payload = JSON.stringify(getActiveCatalog(), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `restio-catalog-${getMode()}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function updateFormPreview() {
  const product = collectFormProduct();
  renderPreview(product);
}

function renderDashboard() {
  updateModeCopy();
  ensureSelectedProduct();
  renderProductsList();
  renderForm();
}

function handleModeChange(event) {
  const nextMode = event.target.value === "manual" ? "manual" : "auto";
  adminState.settings.updateMode = nextMode;

  if (nextMode === "manual") {
    ensureManualCatalog();
  }

  persistState();
  renderDashboard();
}

function handleProductClick(event) {
  const item = event.target.closest("[data-product-id]");
  if (!item) {
    return;
  }
  selectedProductId = item.dataset.productId;
  renderDashboard();
}

function handleAddProduct() {
  if (getMode() !== "manual") {
    return;
  }

  ensureManualCatalog();
  const newProduct = createEmptyManualProduct();
  adminState.manualCatalog.push(newProduct);
  selectedProductId = newProduct.asin;
  persistState();
  renderDashboard();
}

function handleDeleteProduct() {
  if (getMode() !== "manual") {
    return;
  }

  const originalAsin = adminRefs.form.dataset.originalAsin || "";
  if (!originalAsin) {
    return;
  }

  adminState.manualCatalog = adminState.manualCatalog.filter((product) => product.asin !== originalAsin);
  selectedProductId = adminState.manualCatalog[0]?.asin || "";
  persistState();
  renderDashboard();
}

function handleImageUpload(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    adminRefs.form.elements.cached_image.value = String(reader.result || "");
    updateFormPreview();
  };
  reader.readAsDataURL(file);
}

function handleClearUpload() {
  adminRefs.form.elements.cached_image.value = "";
  adminRefs.imageUpload.value = "";
  updateFormPreview();
}

function handleFormSubmit(event) {
  event.preventDefault();

  if (getMode() === "manual") {
    saveManualProduct();
  } else {
    saveAutoLinkOverride();
  }

  renderDashboard();
}

function bindAdminEvents() {
  adminRefs.modeInputs.forEach((input) => input.addEventListener("change", handleModeChange));
  adminRefs.productsList.addEventListener("click", handleProductClick);
  adminRefs.search.addEventListener("input", (event) => {
    searchTerm = String(event.target.value || "").trim();
    renderDashboard();
  });
  adminRefs.addProduct.addEventListener("click", handleAddProduct);
  adminRefs.syncManual.addEventListener("click", () => {
    syncManualCatalog();
    renderDashboard();
  });
  adminRefs.exportJson.addEventListener("click", exportCatalog);
  adminRefs.resetButton.addEventListener("click", renderDashboard);
  adminRefs.deleteButton.addEventListener("click", handleDeleteProduct);
  adminRefs.clearUploadButton.addEventListener("click", handleClearUpload);
  adminRefs.imageUpload.addEventListener("change", handleImageUpload);
  adminRefs.form.addEventListener("submit", handleFormSubmit);
  adminRefs.form.addEventListener("input", updateFormPreview);
}

async function initAdminDashboard() {
  try {
    baseCatalog = await ProductCatalog.loadSourceProductCatalog(true);
    adminState = ProductCatalog.readAdminState();
    if (getMode() === "manual") {
      ensureManualCatalog();
    }
    selectedProductId = getActiveCatalog()[0]?.asin || "";
    bindAdminEvents();
    renderDashboard();
  } catch (error) {
    console.error("Admin dashboard failed to load:", error);
    adminRefs.productsList.innerHTML =
      '<div class="admin-help">Não foi possível carregar o catálogo agora. Verifique o arquivo de produtos e tente novamente.</div>';
  }
}




function downloadProducts() {
  const data = adminState.manualCatalog || [];

  const json = JSON.stringify(data, null, 2);

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "products.json";
  a.click();

  URL.revokeObjectURL(url);

  alert("Arquivo baixado! Substitua em /data/products.json");
}

console.log("BOTÃO CLICADO");

document.addEventListener("DOMContentLoaded", initAdminDashboard);
