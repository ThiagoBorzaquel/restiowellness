/* =============================================
   RESTIO WELLNESS - main.js
   Shared product catalog, safe link generation,
   image fallback, and global site behavior.
   ============================================= */

const AFFILIATE_TAG = "restiowellness-20";
const PRODUCTS_URL = "data/products.json";
const BACKUP_PRODUCTS_URL = "data/products.last-good.json";
const PRODUCTS_STORAGE_KEY = "rw_products_cache_v3";

let productsPromise = null;

const CATEGORY_IMAGE_THEME = {
  sleep: {
    bgStart: "#edf4ea",
    bgEnd: "#d7e7d4",
    accent: "#5f8b6f",
    chip: "SLEEP",
  },
  stress: {
    bgStart: "#f5efe7",
    bgEnd: "#eadcc9",
    accent: "#a36e33",
    chip: "STRESS",
  },
  energy: {
    bgStart: "#f3f1e6",
    bgEnd: "#e8dcc1",
    accent: "#b7682b",
    chip: "ENERGY",
  },
  focus: {
    bgStart: "#f0edf7",
    bgEnd: "#ddd6ef",
    accent: "#7a5ba7",
    chip: "FOCUS",
  },
  wellness: {
    bgStart: "#eef2ee",
    bgEnd: "#dde6dd",
    accent: "#587158",
    chip: "WELLNESS",
  },
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function escapeSvg(value) {
  return String(value ?? "").replace(/[&<>"]/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
}

function normalizeCategory(value) {
  const category = String(value ?? "").trim().toLowerCase();
  return category || "wellness";
}

function stripProductTitle(title) {
  const text = String(title ?? "").trim();
  const parts = text.split(/\s+-\s+/);
  return (parts[0] || text).trim();
}

function wrapTitle(title, maxLength = 22, maxLines = 2) {
  const words = String(title ?? "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLength || !current) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (!lines.length) {
    lines.push("Wellness Product");
  }

  if (words.length && lines.length === maxLines) {
    const renderedWords = lines.join(" ").split(/\s+/).length;
    if (renderedWords < words.length) {
      lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, maxLength - 1)}...`;
    }
  }

  return lines.slice(0, maxLines);
}

function formatReviews(count) {
  const value = Number(count) || 0;
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(value);
}

function buildStarsHTML(rating) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0));
  const full = Math.floor(safeRating);
  const hasHalf = safeRating - full >= 0.5;
  const empty = Math.max(0, 5 - full - (hasHalf ? 1 : 0));

  let html = '<span class="stars" aria-hidden="true">';
  for (let i = 0; i < full; i += 1) {
    html += '<span class="star">&#9733;</span>';
  }
  if (hasHalf) {
    html += '<span class="star half">&#9733;</span>';
  }
  for (let i = 0; i < empty; i += 1) {
    html += '<span class="star empty">&#9733;</span>';
  }
  html += "</span>";
  return html;
}

function buildProductDetailLink(product) {
  return `product.html?asin=${encodeURIComponent(product.asin)}`;
}

function buildAmazonSearchLink(product) {
  const title = stripProductTitle(product?.title || product?.asin || "wellness product");
  const params = new URLSearchParams({
    k: title,
    tag: AFFILIATE_TAG,
    language: "en_US",
  });
  return `https://www.amazon.com/s?${params.toString()}`;
}

function buildAmazonProductLink(product) {
  const asin = String(product?.asin || "").trim();
  if (!asin) {
    return buildAmazonSearchLink(product);
  }

  const params = new URLSearchParams({
    tag: AFFILIATE_TAG,
    language: "en_US",
  });
  return `https://www.amazon.com/dp/${encodeURIComponent(asin)}?${params.toString()}`;
}

function normalizeAmazonLink(link, product) {
  if (!link) {
    return buildAmazonSearchLink(product);
  }

  try {
    const url = new URL(link);
    if (!url.hostname.includes("amazon.")) {
      return buildAmazonSearchLink(product);
    }
    url.searchParams.set("tag", AFFILIATE_TAG);
    return url.toString();
  } catch {
    return buildAmazonSearchLink(product);
  }
}

function normalizeAmazonAnchors(scope = document) {
  scope.querySelectorAll('a[href*="amazon."]').forEach((anchor) => {
    const product = {
      title: anchor.dataset.productTitle || anchor.getAttribute("aria-label") || anchor.textContent || "",
    };
    anchor.href = normalizeAmazonLink(anchor.getAttribute("href"), product);
    if (!anchor.hasAttribute("target")) {
      anchor.target = "_blank";
    }
    const relValues = new Set((anchor.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
    relValues.add("nofollow");
    relValues.add("sponsored");
    anchor.setAttribute("rel", Array.from(relValues).join(" "));
  });
}

function buildAmazonLinkForProduct(product) {
  if (product?.asin) {
    return normalizeAmazonLink(buildAmazonProductLink(product), product);
  }

  if (product?.amazon_link_mode === "search" && product?.affiliate_link) {
    return normalizeAmazonLink(product.affiliate_link, product);
  }

  return buildAmazonSearchLink(product);
}

function buildProductFallbackImage(product) {
  const category = normalizeCategory(product?.category);
  const theme = CATEGORY_IMAGE_THEME[category] || CATEGORY_IMAGE_THEME.wellness;
  const shortTitle = stripProductTitle(product?.title || "Wellness Product");
  const titleLines = wrapTitle(shortTitle);
  const lineMarkup = titleLines
    .map(
      (line, index) =>
        `<text x="60" y="${250 + index * 40}" font-size="28" font-family="Georgia, serif" fill="#223022">${escapeSvg(
          line,
        )}</text>`,
    )
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" role="img" aria-label="${escapeSvg(
      shortTitle,
    )}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${theme.bgStart}" />
          <stop offset="100%" stop-color="${theme.bgEnd}" />
        </linearGradient>
      </defs>
      <rect width="600" height="450" rx="28" fill="url(#bg)" />
      <rect x="42" y="42" width="516" height="366" rx="24" fill="#ffffff" fill-opacity="0.72" />
      <circle cx="120" cy="118" r="42" fill="${theme.accent}" fill-opacity="0.16" />
      <circle cx="480" cy="330" r="58" fill="${theme.accent}" fill-opacity="0.12" />
      <rect x="60" y="78" width="122" height="34" rx="17" fill="${theme.accent}" fill-opacity="0.16" />
      <text x="82" y="100" font-size="16" font-family="Arial, sans-serif" letter-spacing="1.6" fill="${theme.accent}">${escapeSvg(
        theme.chip,
      )}</text>
      <path d="M120 190c30-56 64-84 102-84 34 0 58 20 72 54 14-34 38-54 72-54 40 0 74 28 100 84" fill="none" stroke="${theme.accent}" stroke-opacity="0.22" stroke-width="16" stroke-linecap="round" />
      <path d="M126 180c18-24 34-36 48-36 18 0 28 12 32 34 4-22 14-34 32-34 16 0 32 12 48 36" fill="none" stroke="${theme.accent}" stroke-width="10" stroke-linecap="round" />
      ${lineMarkup}
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildProductImageSrc(product) {
  return product?.cached_image || product?.image || buildProductFallbackImage(product);
}

function applyProductImageFallback(image) {
  if (!image || image.dataset.fallbackApplied === "true") {
    return;
  }

  image.dataset.fallbackApplied = "true";
  if (image.dataset.fallbackImage) {
    image.src = image.dataset.fallbackImage;
  }
}

function bindProductImages(scope = document) {
  scope.querySelectorAll("img[data-fallback-image]").forEach((image) => {
    if (image.dataset.fallbackBound === "true") {
      return;
    }

    image.dataset.fallbackBound = "true";
    image.addEventListener("error", () => applyProductImageFallback(image));

    if (!image.getAttribute("src")) {
      applyProductImageFallback(image);
    }
  });
}

function normalizeProduct(product) {
  return {
    ...product,
    asin: String(product?.asin || "").trim(),
    title: String(product?.title || "").trim(),
    category: normalizeCategory(product?.category),
    image: typeof product?.image === "string" ? product.image.trim() : "",
    cached_image: typeof product?.cached_image === "string" ? product.cached_image.trim() : "",
    rating: Number(product?.rating) || 0,
    reviews: Number(product?.reviews) || 0,
    badge: typeof product?.badge === "string" ? product.badge.trim() : "",
    price: typeof product?.price === "string" ? product.price.trim() : "",
    features: Array.isArray(product?.features)
      ? product.features.filter(Boolean).map((feature) => String(feature))
      : [],
    generated_description:
      typeof product?.generated_description === "string"
        ? product.generated_description.trim()
        : "",
    affiliate_link: typeof product?.affiliate_link === "string" ? product.affiliate_link.trim() : "",
    amazon_link_mode:
      product?.amazon_link_mode === "dp" && product?.direct_link_verified === true ? "dp" : "search",
    direct_link_verified: product?.direct_link_verified === true,
  };
}

function normalizeProducts(products) {
  if (!Array.isArray(products)) {
    return [];
  }

  return products
    .map(normalizeProduct)
    .filter((product) => product.asin && product.title);
}

function readProductsFromStorage() {
  try {
    const raw = window.localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return normalizeProducts(parsed?.products || []);
  } catch {
    return [];
  }
}

function writeProductsToStorage(products) {
  try {
    window.localStorage.setItem(
      PRODUCTS_STORAGE_KEY,
      JSON.stringify({
        savedAt: new Date().toISOString(),
        products,
      }),
    );
  } catch {
    /* localStorage can be blocked; ignore */
  }
}

async function fetchProductsFromUrl(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${url}: ${response.status}`);
  }

  const data = normalizeProducts(await response.json());
  if (!data.length) {
    throw new Error(`No products found in ${url}`);
  }
  return data;
}

async function loadProductCatalog() {
  if (!productsPromise) {
    productsPromise = (async () => {
      try {
        const liveProducts = await fetchProductsFromUrl(PRODUCTS_URL);
        writeProductsToStorage(liveProducts);
        return liveProducts;
      } catch (liveError) {
        try {
          const backupProducts = await fetchProductsFromUrl(BACKUP_PRODUCTS_URL);
          writeProductsToStorage(backupProducts);
          return backupProducts;
        } catch (backupError) {
          console.warn("Backup catalog load failed.", backupError);
        }
        const cachedProducts = readProductsFromStorage();
        if (cachedProducts.length) {
          console.warn("Using cached products after live load failure.", liveError);
          return cachedProducts;
        }
        throw liveError;
      }
    })().catch((error) => {
      productsPromise = null;
      throw error;
    });
  }

  return productsPromise;
}

function buildProductCard(product) {
  const imageSrc = buildProductImageSrc(product);
  const fallbackImage = buildProductFallbackImage(product);
  const detailLink = buildProductDetailLink(product);
  const amazonLink = buildAmazonLinkForProduct(product);
  const badgeHTML = product.badge
    ? `<span class="badge ${
        product.badge === "Best Seller" ? "badge-bestseller" : "badge-toprated"
      }">${escapeHtml(product.badge)}</span>`
    : "";

  return `
    <article class="product-card fade-in" data-category="${escapeHtml(product.category)}" itemscope itemtype="https://schema.org/Product">
      <div class="product-image-wrap">
        <a href="${detailLink}" aria-label="View details for ${escapeHtml(product.title)}">
          <img
            src="${escapeHtml(imageSrc)}"
            data-fallback-image="${escapeHtml(fallbackImage)}"
            alt="${escapeHtml(product.title)}"
            loading="lazy"
            itemprop="image"
          >
        </a>
        <div class="product-badge">${badgeHTML}</div>
      </div>
      <div class="product-body">
        <span class="product-category">${escapeHtml(product.category)}</span>
        <h3 class="product-title" itemprop="name">
          <a href="${detailLink}">${escapeHtml(product.title)}</a>
        </h3>
        <div class="product-rating">
          ${buildStarsHTML(product.rating)}
          <span class="rating-number">${escapeHtml(product.rating)}</span>
          <span class="rating-count">(${escapeHtml(formatReviews(product.reviews))} reviews)</span>
        </div>
        ${product.price ? `<div class="product-price">${escapeHtml(product.price)}</div>` : ""}
        <div class="product-card-actions">
          <a href="${detailLink}" class="btn-view-detail">View Details</a>
          <a href="${amazonLink}" class="btn-amazon-card" rel="nofollow sponsored" target="_blank" data-product-title="${escapeHtml(product.title)}">Amazon</a>
        </div>
      </div>
    </article>
  `;
}

function renderSkeletonCards(count) {
  return Array(count)
    .fill(0)
    .map(
      () => `
        <div class="product-card">
          <div class="product-image-wrap skeleton" style="min-height:220px"></div>
          <div class="product-body">
            <div class="skeleton" style="height:12px;width:60px;margin-bottom:10px"></div>
            <div class="skeleton" style="height:20px;width:80%;margin-bottom:8px"></div>
            <div class="skeleton" style="height:16px;width:50%;margin-bottom:16px"></div>
            <div class="skeleton" style="height:40px"></div>
          </div>
        </div>
      `,
    )
    .join("");
}

function enhanceDynamicContent(scope = document) {
  bindProductImages(scope);
  normalizeAmazonAnchors(scope);
  initFadeIn(scope);
}

function initAffiliateLinkGuard() {
  document.addEventListener("click", (event) => {
    const anchor = event.target.closest('a[href*="amazon."]');
    if (!anchor) {
      return;
    }

    const product = {
      title: anchor.dataset.productTitle || anchor.getAttribute("aria-label") || anchor.textContent || "",
    };
    anchor.href = normalizeAmazonLink(anchor.getAttribute("href"), product);
  });
}

async function loadProducts(options = {}) {
  const { category = null, containerId = "products-grid", limit = null } = options;
  const container = document.getElementById(containerId);
  if (!container) {
    return [];
  }

  container.innerHTML = renderSkeletonCards(limit || 4);

  try {
    let products = await loadProductCatalog();
    if (category) {
      products = products.filter((product) => product.category === category);
    }
    if (limit) {
      products = products.slice(0, limit);
    }

    container.innerHTML = products.map(buildProductCard).join("");
    enhanceDynamicContent(container);
    return products;
  } catch (error) {
    console.error("Failed to load products:", error);
    container.innerHTML =
      '<p style="color:var(--gray-mid);text-align:center;padding:40px">Unable to load products right now.</p>';
    return [];
  }
}

async function loadFeaturedByCategory() {
  const sections = document.querySelectorAll("[data-products-category]");
  if (!sections.length) {
    return;
  }

  try {
    const products = await loadProductCatalog();
    sections.forEach((section) => {
      const category = section.getAttribute("data-products-category");
      const subset = products.filter((product) => product.category === category).slice(0, 4);
      section.innerHTML = subset.map(buildProductCard).join("");
      enhanceDynamicContent(section);
    });
  } catch (error) {
    console.error("Failed to load featured products:", error);
  }
}

function initHeader() {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  window.addEventListener(
    "scroll",
    () => {
      header.classList.toggle("scrolled", window.scrollY > 20);
    },
    { passive: true },
  );
}

function initMobileMenu() {
  const hamburger = document.querySelector(".hamburger");
  const mobileMenu = document.querySelector(".mobile-menu");
  const closeButton = document.querySelector(".mobile-menu-close");
  if (!hamburger || !mobileMenu) {
    return;
  }

  hamburger.addEventListener("click", () => {
    mobileMenu.classList.add("open");
    hamburger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  });

  const closeMenu = () => {
    mobileMenu.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  };

  if (closeButton) {
    closeButton.addEventListener("click", closeMenu);
  }
  mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
}

function initFadeIn(scope = document) {
  const items = scope.querySelectorAll(".fade-in");
  if (!items.length) {
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (!entry.isIntersecting) {
          return;
        }
        setTimeout(() => entry.target.classList.add("visible"), index * 60);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.1 },
  );

  items.forEach((item) => observer.observe(item));
}

function initCookies() {
  const banner = document.getElementById("cookie-banner");
  const acceptButton = document.getElementById("cookie-accept");
  const rejectButton = document.getElementById("cookie-reject");
  if (!banner) {
    return;
  }

  if (!localStorage.getItem("rw_cookie_consent")) {
    setTimeout(() => banner.classList.add("active"), 1500);
  }

  const dismiss = (value) => {
    localStorage.setItem("rw_cookie_consent", value);
    banner.classList.remove("active");
  };

  if (acceptButton) {
    acceptButton.addEventListener("click", () => dismiss("accepted"));
  }
  if (rejectButton) {
    rejectButton.addEventListener("click", () => dismiss("rejected"));
  }
}

function initFAQ() {
  const items = document.querySelectorAll(".faq-item");
  items.forEach((item) => {
    const question = item.querySelector(".faq-question");
    if (!question || question.dataset.bound === "true") {
      return;
    }

    question.dataset.bound = "true";
    question.addEventListener("click", () => {
      const wasOpen = item.classList.contains("open");
      items.forEach((entry) => entry.classList.remove("open"));
      if (!wasOpen) {
        item.classList.add("open");
      }
    });
  });
}

function initActiveNav() {
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((link) => {
    const href = (link.getAttribute("href") || "").split("/").pop();
    if (href === path) {
      link.style.color = "var(--green-mid)";
    }
  });
}

function initNewsletter() {
  const form = document.querySelector(".newsletter-form");
  if (!form) {
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const emailField = form.querySelector('input[type="email"]');
    if (!emailField || !emailField.value) {
      return;
    }

    form.innerHTML =
      '<p style="color:var(--green-light);font-size:1rem;">Thanks. You are on the list.</p>';
  });
}

window.RestioProducts = {
  AFFILIATE_TAG,
  stripProductTitle,
  formatReviews,
  buildStarsHTML,
  buildProductCard,
  buildProductDetailLink,
  buildAmazonProductLink,
  buildAmazonLinkForProduct,
  buildProductImageSrc,
  buildProductFallbackImage,
  loadProductCatalog,
  loadProducts,
  normalizeAmazonLink,
  normalizeAmazonAnchors,
  enhanceDynamicContent,
};

window.initFadeIn = initFadeIn;
window.initFAQ = initFAQ;

document.addEventListener("DOMContentLoaded", () => {
  initHeader();
  initMobileMenu();
  initCookies();
  initFAQ();
  initActiveNav();
  initNewsletter();
  initAffiliateLinkGuard();
  enhanceDynamicContent(document);

  const productsGrid = document.getElementById("products-grid");
  if (productsGrid && !productsGrid.dataset.pageManaged) {
    const category = new URLSearchParams(window.location.search).get("category");
    loadProducts({ category, containerId: "products-grid" });
  }

  if (document.querySelector("[data-products-category]")) {
    loadFeaturedByCategory();
  }
});
