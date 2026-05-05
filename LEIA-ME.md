# Restio Wellness — Correções

## O que foi corrigido

### 1. Tag de afiliado errada
Antes: `restiowellnes-20` (sem o "s")
Depois: `restiowellness-20`

Aplicado em: `js/main.js`, `js/product.js`, `data/products.json` (campo `affiliate_link`).

> ⚠️ **Confirme no painel Amazon Associates qual é o seu Tracking ID exato.**
> Se for outro, faça um find/replace global de `restiowellness-20` pelo correto.

### 2. Imagens dos produtos não apareciam
**Causa:** as URLs anteriores em `images-na.ssl-images-amazon.com/...` usavam IDs inventados pelo seed do `update_products.py` — não eram imagens reais. Mesmo se fossem, a Amazon bloqueia hotlink fora da PA-API.

**Solução temporária aplicada:** imagens via Unsplash (carregam sem bloqueio) + fallback `via.placeholder.com` à prova de loop infinito.

**Solução definitiva (recomendada):**
- Habilite a **Amazon Product Advertising API (PA-API 5.0)** e use as URLs oficiais retornadas (`m.media-amazon.com/images/I/...`); ou
- Baixe as imagens manualmente e hospede em `/images/products/` no seu repositório.

### 3. Links de produto retornando "página não encontrada" na Amazon
**Causa:** os ASINs no `products.json` antigo eram fictícios (gerados pelo script seed).

**Solução aplicada:** substituídos por ASINs de produtos reais e populares na Amazon US:
- B07YFF43F7 — Manta Sleep Mask
- B00WUOFV0W — URPOWER Diffuser
- B077JBQZPX — Hydro Flask 32oz
- B0019LRY8A — Natural Vitality Calm
- B07D9YM6VL — Gaiam Yoga Mat
- B0040EGNIU — TriggerPoint GRID
- B00RU22F62 — Gamma Ray Blue Light Glasses
- B08JLTVNDV — Theragun Mini

> ⚠️ **Verifique cada link manualmente** antes de publicar — abra `https://www.amazon.com/dp/<ASIN>` e confirme que o produto existe e corresponde ao título. ASINs mudam quando a Amazon descontinua um SKU.

### 4. CSS — placeholder não aparecia ao falhar
Adicionei `css/fixes.css` com `min-height: 220px` em `.product-image-wrap` e `320px` em `.product-image-main`, além de fundo neutro. Inclua no `<head>` de `index.html`, `category.html` e `product.html`:

```html
<link rel="stylesheet" href="css/fixes.css">
```

(coloque APÓS o `styles.css` original).

### 5. Onerror sem loop
O `onerror` antigo podia entrar em loop se o placeholder também falhasse. Agora marca `data-fallback="1"` na primeira tentativa e não reentra.

---

## Estrutura dos arquivos entregues

```
data/products.json     ← substitui /data/products.json
js/main.js             ← substitui /js/main.js
js/product.js          ← substitui /js/product.js
css/fixes.css          ← NOVO — adicionar ao <head> das páginas
```
