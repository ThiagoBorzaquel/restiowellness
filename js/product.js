/* =============================================
   RESTIO WELLNESS - product.js
   Product detail page rendering powered by the
   shared catalog helpers in main.js.
   ============================================= */

const ProductCatalog = window.RestioProducts || {};

function renderStars(rating) {
  return ProductCatalog.buildStarsHTML
    ? ProductCatalog.buildStarsHTML(rating)
    : "";
}

function formatReviews(count) {
  return ProductCatalog.formatReviews
    ? ProductCatalog.formatReviews(count)
    : String(Number(count) || 0);
}

function stripProductTitle(title) {
  return ProductCatalog.stripProductTitle
    ? ProductCatalog.stripProductTitle(title)
    : String(title || "");
}

function buildAmazonLink(product) {
  return ProductCatalog.buildAmazonLinkForProduct
    ? ProductCatalog.buildAmazonLinkForProduct(product)
    : product?.affiliate_link || "#";
}

function buildProductImage(product) {
  return ProductCatalog.buildProductImageSrc
    ? ProductCatalog.buildProductImageSrc(product)
    : product?.image || "";
}

function buildProductFallbackImage(product) {
  return ProductCatalog.buildProductFallbackImage
    ? ProductCatalog.buildProductFallbackImage(product)
    : buildProductImage(product);
}

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

function generateFAQ(product) {
  const shortTitle = stripProductTitle(product.title);
  const baseFAQs = [
    {
      q: `Is the ${shortTitle} worth the price?`,
      a: `Based on ${formatReviews(product.reviews)} verified customer reviews and a ${product.rating}/5 rating, this product consistently delivers on its promises.`,
    },
    {
      q: "Where is this product made?",
      a: "For country of origin and manufacturer details, check the current Amazon listing directly.",
    },
    {
      q: "Does it come with a warranty or return policy?",
      a: "Amazon purchases follow Amazon's standard return flow, and any manufacturer warranty appears on the listing itself.",
    },
    {
      q: "How quickly will I see results?",
      a: "Results vary by person, but most reviewers report the best experience after consistent use for at least one to two weeks.",
    },
  ];

  const categoryFAQs = {
    sleep: [
      {
        q: "Can this help with insomnia?",
        a: "Many customers with mild sleep difficulties report meaningful improvement, but diagnosed sleep disorders should still be discussed with a healthcare professional.",
      },
    ],
    stress: [
      {
        q: "Is this suitable for people with anxiety?",
        a: "It can be a helpful part of a broader self-care routine, but it is not a substitute for professional mental health care.",
      },
    ],
    energy: [
      {
        q: "Will this affect my sleep if used in the evening?",
        a: "That depends on the product type, so it is best to check the product listing notes and customer reviews for timing guidance.",
      },
    ],
    focus: [
      {
        q: "Is this suitable for meditation practice?",
        a: "Yes. Many customers use products in this category to support mindfulness, stretching, breathwork, and focused routines.",
      },
    ],
  };

  return [...baseFAQs, ...(categoryFAQs[product.category] || [])];
}

function buildJSONLD(product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: buildProductImage(product),
    description: product.generated_description,
    brand: {
      "@type": "Brand",
      name: "Amazon",
    },
    offers: {
      "@type": "Offer",
      url: buildAmazonLink(product),
      priceCurrency: "USD",
      price: product.price ? product.price.replace(/[^0-9.]/g, "") : undefined,
      availability: "https://schema.org/InStock",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviews,
      bestRating: "5",
      worstRating: "1",
    },
  };
}

function injectJSONLD(data) {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(data, null, 2);
  document.head.appendChild(script);
}

function renderRelated(allProducts, currentAsin, category) {
  const related = allProducts
    .filter((product) => product.asin !== currentAsin && product.category === category)
    .slice(0, 3);

  if (!related.length) {
    return "";
  }

  if (ProductCatalog.buildProductCard) {
    return related.map(ProductCatalog.buildProductCard).join("");
  }

  return related
    .map((product) => {
      const detailLink = `product.html?asin=${encodeURIComponent(product.asin)}`;
      const imageSrc = buildProductImage(product);
      const fallbackImage = buildProductFallbackImage(product);
      return `
        <article class="product-card fade-in">
          <div class="product-image-wrap">
            <a href="${detailLink}">
              <img src="${escapeHtml(imageSrc)}" data-fallback-image="${escapeHtml(fallbackImage)}" alt="${escapeHtml(
                product.title,
              )}" loading="lazy">
            </a>
          </div>
          <div class="product-body">
            <span class="product-category">${escapeHtml(product.category)}</span>
            <h3 class="product-title"><a href="${detailLink}">${escapeHtml(product.title)}</a></h3>
          </div>
        </article>
      `;
    })
    .join("");
}

async function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const asin = params.get("asin");

  if (!asin) {
    window.location.href = "index.html";
    return;
  }

  try {
    const products = await ProductCatalog.loadProductCatalog();
    const product = products.find((entry) => entry.asin === asin);

    if (!product) {
      const content = document.getElementById("product-content");
      if (content) {
        content.innerHTML = `
          <div class="container" style="padding:80px 24px;text-align:center">
            <h2>Product not found</h2>
            <p style="margin:16px 0 24px">This product is no longer available in the active catalog.</p>
            <a href="category.html" class="btn btn-primary">Browse All Products</a>
          </div>
        `;
      }
      return;
    }

    document.title = `${product.title} - Restio Wellness`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", `${product.generated_description.slice(0, 155)}...`);
    document
      .querySelector('meta[property="og:title"]')
      ?.setAttribute("content", `${product.title} - Restio Wellness`);
    document
      .querySelector('meta[property="og:image"]')
      ?.setAttribute("content", buildProductImage(product));

    injectJSONLD(buildJSONLD(product));

    const amazonLink = buildAmazonLink(product);
    const badgeClass = product.badge === "Best Seller" ? "badge-bestseller" : "badge-toprated";
    const imageSrc = buildProductImage(product);
    const fallbackImage = buildProductFallbackImage(product);
    const categoryLabel = `${product.category.charAt(0).toUpperCase()}${product.category.slice(1)}`;

    const breadcrumb = document.getElementById("product-breadcrumb");
    if (breadcrumb) {
      breadcrumb.innerHTML = `
        <a href="index.html">Home</a>
        <span>&rsaquo;</span>
        <a href="category.html?category=${encodeURIComponent(product.category)}">${escapeHtml(categoryLabel)}</a>
        <span>&rsaquo;</span>
        <span>${escapeHtml(stripProductTitle(product.title))}</span>
      `;
    }

    const hero = document.getElementById("product-hero");
    if (hero) {
      hero.innerHTML = `
        <div class="product-hero-inner">
          <div class="product-image-main fade-in">
            <img
              src="${escapeHtml(imageSrc)}"
              data-fallback-image="${escapeHtml(fallbackImage)}"
              alt="${escapeHtml(product.title)}"
              loading="eager"
            >
          </div>
          <div class="product-info fade-in">
            <div class="product-info-header">
              ${product.badge ? `<span class="badge ${badgeClass}">${escapeHtml(product.badge)}</span>` : ""}
            </div>
            <h1 class="product-info-title">${escapeHtml(product.title)}</h1>
            <div class="product-info-rating">
              <div class="stars">${renderStars(product.rating)}</div>
              <span class="rating-number">${escapeHtml(product.rating)}</span>
              <span class="rating-count">(${escapeHtml(formatReviews(product.reviews))} verified reviews)</span>
            </div>
            ${product.price ? `<div class="product-info-price">${escapeHtml(product.price)}</div>` : ""}
            <div class="product-cta-block">
              <a href="${amazonLink}" class="btn btn-amazon btn-lg" rel="nofollow sponsored" target="_blank" data-product-title="${escapeHtml(product.title)}">Check Price on Amazon</a>
              <a href="${amazonLink}" class="btn btn-secondary" rel="nofollow sponsored" target="_blank" data-product-title="${escapeHtml(product.title)}">Open on Amazon</a>
            </div>
            <div class="product-features-quick">
              <h4>Key Features</h4>
              <ul>
                ${product.features
                  .map(
                    (feature) =>
                      `<li><span class="feature-check">&#10003;</span><span>${escapeHtml(feature)}</span></li>`,
                  )
                  .join("")}
              </ul>
            </div>
          </div>
        </div>
      `;
    }

    const description = document.getElementById("product-description");
    if (description) {
      const sentences = product.generated_description.split(". ").filter(Boolean);
      const paragraphs = [];
      for (let index = 0; index < sentences.length; index += 3) {
        const paragraph = sentences.slice(index, index + 3).join(". ").trim();
        if (paragraph) {
          paragraphs.push(paragraph.endsWith(".") ? paragraph : `${paragraph}.`);
        }
      }

      description.innerHTML = `
        <div class="product-description-inner">
          <div class="description-text fade-in">
            <div class="section-label">Why We Love It</div>
            <h2>An honest look at ${escapeHtml(stripProductTitle(product.title))}</h2>
            ${paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
            <div class="affiliate-notice">
              This page contains affiliate links. <a href="privacy-policy.html">Learn more</a>.
            </div>
          </div>
          <aside class="product-sidebar">
            <div class="sidebar-card">
              <h4>Quick Verdict</h4>
              <div class="product-rating" style="margin-bottom:16px">
                <div class="stars">${renderStars(product.rating)}</div>
                <span class="rating-number">${escapeHtml(product.rating)}/5</span>
              </div>
              <a href="${amazonLink}" class="btn btn-amazon" style="width:100%;text-align:center;justify-content:center" rel="nofollow sponsored" target="_blank" data-product-title="${escapeHtml(product.title)}">See It on Amazon</a>
            </div>
          </aside>
        </div>
      `;
    }

    const faq = document.getElementById("product-faq");
    if (faq) {
      faq.innerHTML = generateFAQ(product)
        .map(
          (item) => `
            <div class="faq-item">
              <div class="faq-question"><span>${escapeHtml(item.q)}</span><span class="faq-icon">+</span></div>
              <div class="faq-answer"><p>${escapeHtml(item.a)}</p></div>
            </div>
          `,
        )
        .join("");
    }

    const related = document.getElementById("related-products");
    if (related) {
      const html = renderRelated(products, asin, product.category);
      related.innerHTML = html || '<p style="color:var(--gray-mid)">No related products found.</p>';
    }

    injectJSONLD({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://restiowellness.com/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: categoryLabel,
          item: `https://restiowellness.com/category.html?category=${encodeURIComponent(product.category)}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: product.title,
        },
      ],
    });

    ProductCatalog.enhanceDynamicContent?.(document.getElementById("product-content") || document);
    window.initFAQ?.();
  } catch (error) {
    console.error("Product load error:", error);
    const content = document.getElementById("product-content");
    if (content) {
      content.innerHTML = `
        <div class="container" style="padding:80px;text-align:center">
          <p>Error loading this product right now. <a href="category.html">Browse all products</a>.</p>
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initProductPage);
