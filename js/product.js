/* =============================================
   RESTIO WELLNESS — product.js
   Dynamic product page loader
   ============================================= */

const AFFILIATE_TAG = 'restio-20';

/* ─── Helpers ─── */
function buildAmazonLink(asin) {
  return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

function renderStars(rating) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  let html = '';
  for (let i = 0; i < full;  i++) html += '<span class="star">★</span>';
  if (half)                        html += '<span class="star">⭒</span>';
  for (let i = 0; i < empty; i++) html += '<span class="star empty">★</span>';
  return html;
}

function formatReviews(n) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : n.toString();
}

/* ─── Generate FAQ from product ─── */
function generateFAQ(product) {
  const cat = product.category;
  const baseFAQs = [
    {
      q: `Is the ${product.title.split('–')[0].trim()} worth the price?`,
      a: `Based on ${formatReviews(product.reviews)} verified customer reviews and a ${product.rating}/5 rating, this product consistently delivers on its promises. The consensus is clear: for the wellness benefits it provides, it represents excellent value. Many customers report that it quickly becomes an indispensable part of their daily routine.`
    },
    {
      q: `Where is this product made?`,
      a: `This product is manufactured to high quality standards. For specific country of origin information, we recommend checking the product listing on Amazon directly, where manufacturer details are listed. Amazon's A-to-Z Guarantee also ensures you're protected with every purchase.`
    },
    {
      q: `Does it come with a warranty or return policy?`,
      a: `Yes — all Amazon purchases come with Amazon's standard return policy, allowing returns within 30 days of receipt. Many wellness products also include manufacturer warranties. Full warranty information is listed on the Amazon product page.`
    },
    {
      q: `How quickly will I see results?`,
      a: `Results vary by individual, but most customers in the reviews report noticing improvements within the first 1–2 weeks of consistent use. As with any wellness product, the best results come from regular, dedicated use as part of a broader healthy routine.`
    }
  ];

  const categoryFAQs = {
    sleep: [
      {
        q: `Can this help with insomnia or sleep disorders?`,
        a: `While this product is not a medical device and is not intended to diagnose or treat sleep disorders, many customers with mild sleep difficulties report meaningful improvements. If you have a diagnosed sleep disorder, we recommend consulting a healthcare professional alongside using any wellness product.`
      }
    ],
    stress: [
      {
        q: `Is this suitable for people with anxiety?`,
        a: `Many customers dealing with day-to-day stress and anxiety find this product helpful as part of a broader self-care routine. However, it is not a substitute for professional mental health support. If you're experiencing significant anxiety, please speak with a qualified healthcare provider.`
      }
    ],
    energy: [
      {
        q: `Will this affect my sleep if used in the evening?`,
        a: `This depends on the specific product and your individual sensitivities. We recommend checking the product description and customer reviews for guidance on best use timing. Most wellness and recovery products are suitable for evening use.`
      }
    ],
    focus: [
      {
        q: `Is this suitable for meditation practice?`,
        a: `Absolutely — many customers specifically use this product to enhance their meditation and mindfulness practice. The calming benefits often complement breathwork and mindfulness sessions beautifully.`
      }
    ]
  };

  const allFAQs = [...baseFAQs, ...(categoryFAQs[cat] || [])];
  return allFAQs;
}

/* ─── Build Page Structured Data (JSON-LD) ─── */
function buildJSONLD(product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "image": product.image,
    "description": product.generated_description,
    "brand": { "@type": "Brand", "name": "Amazon" },
    "offers": {
      "@type": "Offer",
      "url": buildAmazonLink(product.asin),
      "priceCurrency": "USD",
      "price": product.price ? product.price.replace(/[^0-9.]/g, '') : undefined,
      "availability": "https://schema.org/InStock",
      "seller": { "@type": "Organization", "name": "Amazon" }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": product.rating,
      "reviewCount": product.reviews,
      "bestRating": "5",
      "worstRating": "1"
    }
  };
}

/* ─── Inject JSON-LD ─── */
function injectJSONLD(data) {
  const script = document.createElement('script');
  script.type  = 'application/ld+json';
  script.textContent = JSON.stringify(data, null, 2);
  document.head.appendChild(script);
}

/* ─── Render Related Products ─── */
function renderRelated(allProducts, currentAsin, category) {
  const related = allProducts
    .filter(p => p.asin !== currentAsin && p.category === category)
    .slice(0, 3);

  if (!related.length) return '';

  return related.map(p => {
    const link = `product.html?asin=${p.asin}`;
    return `
    <article class="product-card fade-in">
      <div class="product-image-wrap">
        <a href="${link}">
          <img src="${p.image}" alt="${p.title}" loading="lazy"
               onerror="this.src='https://via.placeholder.com/400x300/E8F0E0/6B9E6B?text=Product'">
        </a>
      </div>
      <div class="product-body">
        <span class="product-category">${p.category}</span>
        <h3 class="product-title"><a href="${link}">${p.title}</a></h3>
        <div class="product-rating">
          <span class="stars">${renderStars(p.rating)}</span>
          <span class="rating-count">${formatReviews(p.reviews)} reviews</span>
        </div>
        <div class="product-card-actions">
          <a href="${link}" class="btn-view-detail">View Details</a>
          <a href="${buildAmazonLink(p.asin)}" class="btn-amazon-card" rel="nofollow sponsored" target="_blank">Amazon →</a>
        </div>
      </div>
    </article>`;
  }).join('');
}

/* ─── Main Product Page Init ─── */
async function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const asin   = params.get('asin');

  if (!asin) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const res      = await fetch('/data/products.json');
    const products = await res.json();
    const product  = products.find(p => p.asin === asin);

    if (!product) {
      document.getElementById('product-content').innerHTML = `
        <div class="container" style="padding:80px 24px;text-align:center">
          <h2>Product not found</h2>
          <p style="margin:16px 0 24px">We couldn't find that product.</p>
          <a href="index.html" class="btn btn-primary">Return Home</a>
        </div>`;
      return;
    }

    // ── Update page meta ──
    document.title = `${product.title} – Restio Wellness`;
    document.querySelector('meta[name="description"]')
      ?.setAttribute('content', product.generated_description.slice(0, 155) + '…');
    document.querySelector('meta[property="og:title"]')
      ?.setAttribute('content', `${product.title} – Restio Wellness`);
    document.querySelector('meta[property="og:image"]')
      ?.setAttribute('content', product.image);

    // ── Inject JSON-LD ──
    injectJSONLD(buildJSONLD(product));

    const amazonLink = buildAmazonLink(product.asin);
    const badgeClass = product.badge === 'Best Seller' ? 'badge-bestseller' : 'badge-toprated';

    // ── Breadcrumb ──
    const breadcrumb = document.getElementById('product-breadcrumb');
    if (breadcrumb) {
      breadcrumb.innerHTML = `
        <a href="index.html">Home</a>
        <span>›</span>
        <a href="category.html?category=${product.category}">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</a>
        <span>›</span>
        <span>${product.title.split('–')[0].trim()}</span>`;
    }

    // ── Hero ──
    const heroEl = document.getElementById('product-hero');
    if (heroEl) {
      heroEl.innerHTML = `
        <div class="product-hero-inner">
          <div class="product-image-main fade-in">
            <img src="${product.image}" alt="${product.title}" loading="eager"
                 onerror="this.src='https://via.placeholder.com/500x400/E8F0E0/6B9E6B?text=Product+Image'">
          </div>
          <div class="product-info fade-in">
            <div class="product-info-header">
              ${product.badge ? `<span class="badge ${badgeClass}">${product.badge}</span>` : ''}
            </div>
            <h1 class="product-info-title">${product.title}</h1>
            <div class="product-info-rating">
              <div class="stars">${renderStars(product.rating)}</div>
              <span class="rating-number">${product.rating}</span>
              <span class="rating-count">(${formatReviews(product.reviews).toLocaleString()} verified reviews)</span>
            </div>
            ${product.price ? `<div class="product-info-price">${product.price}</div>` : ''}
            <div class="product-cta-block">
              <a href="${amazonLink}" class="btn btn-amazon btn-lg" rel="nofollow sponsored" target="_blank">
                🛒 Check Price on Amazon
              </a>
              <a href="${amazonLink}#customerReviews" class="btn btn-secondary" rel="nofollow sponsored" target="_blank">
                View All Reviews on Amazon
              </a>
            </div>
            <div class="product-features-quick">
              <h4>Key Features</h4>
              <ul>
                ${product.features.map(f => `
                  <li>
                    <span class="feature-check">✓</span>
                    <span>${f}</span>
                  </li>`).join('')}
              </ul>
            </div>
          </div>
        </div>`;
    }

    // ── Description ──
    const descEl = document.getElementById('product-description');
    if (descEl) {
      const paragraphs = product.generated_description.split('. ').reduce((acc, sent, i) => {
        const group = Math.floor(i / 3);
        acc[group] = (acc[group] || '') + sent + (sent.endsWith('.') ? ' ' : '. ');
        return acc;
      }, []);

      descEl.innerHTML = `
        <div class="product-description-inner">
          <div class="description-text fade-in">
            <div class="section-label">Why We Love It</div>
            <h2>An Honest Look at ${product.title.split('–')[0].trim()}</h2>
            ${paragraphs.map(p => `<p>${p.trim()}</p>`).join('')}
            <div class="affiliate-notice">
              ⓘ This page contains affiliate links. If you purchase through our links, we may earn a small commission at no extra cost to you.
              <a href="privacy-policy.html">Learn more</a>.
            </div>
          </div>
          <aside class="product-sidebar">
            <div class="sidebar-card">
              <h4>Quick Verdict</h4>
              <div class="product-rating" style="margin-bottom:16px">
                <div class="stars">${renderStars(product.rating)}</div>
                <span class="rating-number">${product.rating}/5</span>
              </div>
              <ul style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">
                <li style="display:flex;gap:8px;align-items:flex-start;font-size:0.85rem">
                  <span style="color:var(--green-soft);font-weight:600">✓</span>
                  <span>Highly rated by ${formatReviews(product.reviews)} buyers</span>
                </li>
                <li style="display:flex;gap:8px;align-items:flex-start;font-size:0.85rem">
                  <span style="color:var(--green-soft);font-weight:600">✓</span>
                  <span>Ships via Amazon with fast delivery</span>
                </li>
                <li style="display:flex;gap:8px;align-items:flex-start;font-size:0.85rem">
                  <span style="color:var(--green-soft);font-weight:600">✓</span>
                  <span>Covered by Amazon's A-to-Z Guarantee</span>
                </li>
              </ul>
              <a href="${amazonLink}" class="btn btn-amazon" style="width:100%;text-align:center;justify-content:center" rel="nofollow sponsored" target="_blank">
                Buy on Amazon
              </a>
            </div>
          </aside>
        </div>`;
    }

    // ── FAQ ──
    const faqEl = document.getElementById('product-faq');
    if (faqEl) {
      const faqs = generateFAQ(product);
      faqEl.innerHTML = faqs.map(faq => `
        <div class="faq-item">
          <div class="faq-question">
            <span>${faq.q}</span>
            <span class="faq-icon">+</span>
          </div>
          <div class="faq-answer"><p>${faq.a}</p></div>
        </div>`).join('');
    }

    // ── Related Products ──
    const relatedEl = document.getElementById('related-products');
    if (relatedEl) {
      const html = renderRelated(products, asin, product.category);
      relatedEl.innerHTML = html || '<p style="color:var(--gray-mid)">No related products found.</p>';
    }

    // ── Breadcrumb JSON-LD ──
    const breadcrumbLD = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home",    "item": "https://restiowellness.com/" },
        { "@type": "ListItem", "position": 2, "name": product.category,   "item": `https://restiowellness.com/category.html?category=${product.category}` },
        { "@type": "ListItem", "position": 3, "name": product.title }
      ]
    };
    injectJSONLD(breadcrumbLD);

    // ── Trigger fade-in ──
    if (window.initFadeIn) window.initFadeIn();
    else {
      setTimeout(() => {
        document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
      }, 100);
    }

  } catch (err) {
    console.error('Product load error:', err);
    const content = document.getElementById('product-content');
    if (content) {
      content.innerHTML = `<div class="container" style="padding:80px;text-align:center">
        <p>Error loading product. <a href="index.html" style="color:var(--green-mid)">Return home</a></p>
      </div>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', initProductPage);
