# 🌿 Restio Wellness

> Site afiliado de bem-estar totalmente automatizado, otimizado para SEO e pronto para o GitHub Pages.

**Site ao vivo:** [restiowellness.com](https://restiowellness.com)

---

## 📁 Estrutura do Projeto

```
restiowellness/
├── index.html              # Página inicial
├── category.html           # Página de categoria (com filtros)
├── product.html            # Página de produto dinâmica
├── about.html              # Sobre nós
├── contact.html            # Contato
├── privacy-policy.html     # Política de Privacidade
├── terms.html              # Termos de Uso
├── cookies.html            # Política de Cookies
├── sitemap.xml             # Sitemap para SEO
├── robots.txt              # Instruções para crawlers
├── _config.yml             # Configuração do GitHub Pages
│
├── css/
│   └── styles.css          # Folha de estilos (Cormorant + DM Sans)
│
├── js/
│   ├── main.js             # JS principal (produtos, nav, cookies, animações)
│   └── product.js          # Lógica da página de produto
│
├── data/
│   └── products.json       # Dados dos produtos (atualizado automaticamente)
│
├── images/
│   ├── logo.svg            # Logo completo (ícone + texto)
│   └── favicon.svg         # Ícone da aba do navegador
│
├── scripts/
│   └── update_products.py  # Script Python de atualização
│
└── .github/
    └── workflows/
        └── update.yml      # GitHub Actions: atualização diária automática
```

---

## 🚀 Como Publicar no GitHub Pages

### Passo 1 — Faça o fork ou clone do repositório

```bash
git clone https://github.com/SEU_USUARIO/restiowellness.git
cd restiowellness
```

### Passo 2 — Ative o GitHub Pages

1. Acesse **Settings → Pages**
2. Em **Source**, selecione `Deploy from a branch`
3. Escolha o branch `main` e a pasta `/ (root)`
4. Clique em **Save**

O site estará no ar em `https://SEU_USUARIO.github.io/restiowellness/` em poucos minutos.

### Passo 3 — Domínio personalizado (opcional)

1. Crie um arquivo `CNAME` na raiz com o seu domínio: `restiowellness.com`
2. Configure o DNS do seu domínio para apontar para os IPs do GitHub Pages
3. Ative **Enforce HTTPS** nas configurações do GitHub Pages

---

## ⚙️ Automação

### Atualização Diária de Produtos

O GitHub Actions executa `scripts/update_products.py` todos os dias às 06:00 UTC.
O script atualiza `data/products.json` e faz commit automaticamente se houver mudanças.

O workflow já está configurado em `.github/workflows/update.yml`.
Não é necessária nenhuma configuração adicional — ele usa o `GITHUB_TOKEN` padrão do repositório.

### Amazon PA-API (opcional — para dados em tempo real)

Para buscar avaliações e preços reais da Amazon:

1. Solicite acesso à [Amazon Product Advertising API](https://affiliate-program.amazon.com/assoc_credentials/home)
2. Adicione suas credenciais como **GitHub Secrets**:
   - `AMAZON_ACCESS_KEY`
   - `AMAZON_SECRET_KEY`
3. Descomente o bloco PA-API em `scripts/update_products.py`
4. Descomente o `pip install` em `.github/workflows/update.yml`

---

## 💰 Configuração de Monetização

### Amazon Associates (Afiliados)

1. Cadastre-se no [Amazon Associates](https://affiliate-program.amazon.com/)
2. Substitua `restio-20` pela sua tag real nos seguintes arquivos:
   - `js/main.js` — linha 3: `const AFFILIATE_TAG = 'SUA-TAG';`
   - `js/product.js` — linha 3: `const AFFILIATE_TAG = 'SUA-TAG';`
   - `scripts/update_products.py` — linha 32: `AFFILIATE_TAG = "sua-tag"`

### Google AdSense

1. Cadastre-se no [Google AdSense](https://adsense.google.com/)
2. Substitua `ca-pub-XXXXXXXXXXXXXXXXX` pela sua ID de publisher em `js/main.js`
3. Descomente as tags `<ins>` de AdSense em `index.html` e `category.html`

### Google Analytics (GA4)

1. Crie uma propriedade GA4 em [analytics.google.com](https://analytics.google.com)
2. Substitua `G-XXXXXXXXXX` em `js/main.js` (função `loadAnalytics`)
3. O Analytics só carrega após o usuário aceitar os cookies ✅

---

## 📦 Como Adicionar Novos Produtos

Edite `data/products.json` diretamente **ou** adicione ao `PRODUCT_CATALOG` em `scripts/update_products.py`:

```json
{
  "asin": "B0XXXXXXXXX",
  "title": "Nome do Produto – Subtítulo",
  "category": "sleep",
  "image": "https://...",
  "rating": 4.5,
  "reviews": 5000,
  "badge": "Best Seller",
  "price": "$29.99",
  "features": ["Característica 1", "Característica 2", "Característica 3"],
  "generated_description": "Sua descrição aqui...",
  "affiliate_link": "https://www.amazon.com/dp/B0XXXXXXXXX?tag=SUA-TAG"
}
```

**Categorias disponíveis:** `sleep` | `stress` | `energy` | `focus`

---

## 🎨 Sistema de Design

| Elemento        | Valor             |
|-----------------|-------------------|
| Fonte display   | Cormorant Garamond |
| Fonte corpo     | DM Sans           |
| Verde escuro    | `#2C3E2D`         |
| Verde médio     | `#6B9E6B`         |
| Verde claro     | `#E8F0E0`         |
| Bege            | `#DDD0BC`         |

---

## ✅ Checklist Antes de Lançar

- [ ] Substituir `restio-20` pela sua tag real do Amazon Associates
- [ ] Adicionar o ID de publisher do Google AdSense (após aprovação)
- [ ] Adicionar o ID de medição do Google Analytics 4
- [ ] Configurar domínio personalizado + HTTPS no GitHub Pages
- [ ] Enviar `sitemap.xml` para o Google Search Console
- [ ] Verificar o site no painel do Amazon Associates

---

## 📄 Licença

MIT — livre para usar, modificar e publicar comercialmente.

---

*Feito com ❤️ para a comunidade de bem-estar.*
