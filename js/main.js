/* =============================================
   RESTIO WELLNESS — main.js
   Core site functionality
   ============================================= */

const AFFILIATE_TAG = 'restio-20';
const PRODUCTS_URL  = '/data/products.json';

/* ─── Amazon Link Builder ─── */
function buildAmazonLink(asin) {
  return `https://www.amazon.com/dp/${asin}?tag=${AFFILIATE_TAG}`;
}

/* ─── Stars HTML Generator ─── */
function buildStarsHTML(rating) {
  const full  = Math.floor(rating);
  const half  = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  let html = '<span class="stars">';
  for (let i = 0; i < full;  i++) html += '<span class="star">★</span>';
  if (half)                        html += '<span class="star">⭒</span>';
  for (let i = 0; i < empty; i++) html += '<span class="star empty">★</span>';
  html += '</span>';
  return html;
}

/* ─── Format Review Count ─── */
function formatReviews(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toString();
}

/* ─── Build Product Card ─── */
function buildProductCard(p) {
  const amazonLink = buildAmazonLink(p.asin);
  const detailLink = `product.html?asin=${p.asin}`;
  const badgeHTML  = p.badge
    ? `<span class="badge ${p.badge === 'Best Seller' ? 'badge-bestseller' : 'badge-toprated'}">${p.badge}</span>`
    : '';

  return `
  <article class="product-card fade-in" data-category="${p.category}" itemscope itemtype="https://schema.org/Product">
    <div class="product-image-wrap">
      <a href="${detailLink}">
        <img src="${p.image}" alt="${p.title}" loading="lazy" itemprop="image"
             onerror="this.src='https://via.placeholder.com/400x300/E8F0E0/6B9E6B?text=Product'">
      </a>
      <div class="product-badge">${badgeHTML}</div>
    </div>
    <div class="product-body">
      <span class="product-category">${p.category}</span>
      <h3 class="product-title" itemprop="name">
        <a href="${detailLink}">${p.title}</a>
      </h3>
      <div class="product-rating">
        ${buildStarsHTML(p.rating)}
        <span class="rating-number">${p.rating}</span>
        <span class="rating-count">(${formatReviews(p.reviews)} reviews)</span>
      </div>
      ${p.price ? `<div class="product-price">${p.price}</div>` : ''}
      <div class="product-card-actions">
        <a href="${detailLink}" class="btn-view-detail">View Details</a>
        <a href="${amazonLink}" class="btn-amazon-card" rel="nofollow sponsored" target="_blank" aria-label="Buy on Amazon">Amazon →</a>
      </div>
    </div>
  </article>`;
}

/* ─── Load & Render Products ─── */
async function loadProducts(options = {}) {
  const { category = null, containerId = 'products-grid', limit = null } = options;

  const container = document.getElementById(containerId);
  if (!container) return [];

  // Skeleton loaders
  container.innerHTML = Array(limit || 4).fill(0).map(() => `
    <div class="product-card">
      <div class="product-image-wrap skeleton" style="height:220px"></div>
      <div class="product-body">
        <div class="skeleton" style="height:12px;width:60px;margin-bottom:10px"></div>
        <div class="skeleton" style="height:20px;width:80%;margin-bottom:8px"></div>
        <div class="skeleton" style="height:16px;width:50%;margin-bottom:16px"></div>
        <div class="skeleton" style="height:40px"></div>
      </div>
    </div>`).join('');

  try {
    const res      = await fetch(PRODUCTS_URL);
    let products   = await res.json();

    if (category) {
      products = products.filter(p => p.category === category);
    }
    if (limit) {
      products = products.slice(0, limit);
    }

    container.innerHTML = products.map(buildProductCard).join('');
    initFadeIn();
    return products;
  } catch (err) {
    console.error('Failed to load products:', err);
    container.innerHTML = `<p style="color:var(--gray-mid);text-align:center;padding:40px">Unable to load products. Please try again later.</p>`;
    return [];
  }
}

/* ─── Load Featured Products by Category ─── */
async function loadFeaturedByCategory() {
  const sections = document.querySelectorAll('[data-products-category]');
  if (!sections.length) return;

  let products = [];
  try {
    const res = await fetch(PRODUCTS_URL);
    products  = await res.json();
  } catch { return; }

  sections.forEach(section => {
    const cat = section.getAttribute('data-products-category');
    const subset = products.filter(p => p.category === cat).slice(0, 4);
    section.innerHTML = subset.map(buildProductCard).join('');
  });
  initFadeIn();
}

/* ─── Header Scroll Effect ─── */
function initHeader() {
  const header = document.querySelector('.site-header');
  if (!header) return;
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ─── Mobile Menu ─── */
function initMobileMenu() {
  const hamburger  = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const closeBtn   = document.querySelector('.mobile-menu-close');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    mobileMenu.classList.add('open');
    document.body.style.overflow = 'hidden';
  });

  const close = () => {
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  };

  if (closeBtn) closeBtn.addEventListener('click', close);
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
}

/* ─── Intersection Observer – Fade-in ─── */
function initFadeIn() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('visible'), i * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}

/* ─── Cookie Consent ─── */
function initCookies() {
  const banner     = document.getElementById('cookie-banner');
  const acceptBtn  = document.getElementById('cookie-accept');
  const rejectBtn  = document.getElementById('cookie-reject');
  if (!banner) return;

  const consent = localStorage.getItem('rw_cookie_consent');
  if (!consent) {
    setTimeout(() => banner.classList.add('active'), 1500);
  }

  const dismiss = (value) => {
    localStorage.setItem('rw_cookie_consent', value);
    banner.classList.remove('active');
    if (value === 'accepted') {
      loadAnalytics(); // Placeholder for GA loading
    }
  };

  if (acceptBtn) acceptBtn.addEventListener('click', () => dismiss('accepted'));
  if (rejectBtn) rejectBtn.addEventListener('click', () => dismiss('rejected'));
}

/* ─── Load Analytics (conditionally) ─── */
function loadAnalytics() {
  // Load Google Analytics only after consent
  // Replace G-XXXXXXXXXX with your actual GA4 ID
  /*
  const script = document.createElement('script');
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
  script.async = true;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
  */
}

/* ─── FAQ Accordion ─── */
function initFAQ() {
  const items = document.querySelectorAll('.faq-item');
  items.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;
    question.addEventListener('click', () => {
      const wasOpen = item.classList.contains('open');
      items.forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
}

/* ─── Active Nav Link ─── */
function initActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    if (href === path) a.style.color = 'var(--green-mid)';
  });
}

/* ─── AdSense Placeholder Insert ─── */
function insertAdSense() {
  // Replace ca-pub-XXXXXXXXXXXXXXXXX with your AdSense publisher ID
  /*
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXXX';
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
  */
}

/* ─── Newsletter Form ─── */
function initNewsletter() {
  const form = document.querySelector('.newsletter-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = form.querySelector('input[type="email"]').value;
    if (email) {
      form.innerHTML = '<p style="color:var(--green-light);font-size:1rem;">✓ Thank you! You\'re on the list.</p>';
    }
  });
}

/* ─── Init All ─── */
document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initMobileMenu();
  initCookies();
  initFAQ();
  initActiveNav();
  initNewsletter();
  initFadeIn();

  // Page-specific init
  if (document.getElementById('products-grid')) {
    const cat = new URLSearchParams(window.location.search).get('category');
    loadProducts({ category: cat, containerId: 'products-grid' });
  }

  if (document.querySelector('[data-products-category]')) {
    loadFeaturedByCategory();
  }
});
