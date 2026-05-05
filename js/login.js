/* =============================================
   RESTIO WELLNESS - login.js
   Login administrativo 100% client-side com:
   - E-mail + senha (hash SHA-256 + salt)
   - 2FA TOTP (RFC 6238) compatível com Google
     Authenticator, Authy, 1Password, etc.
   - Recuperação de senha via código local
   - Sessão persistida em localStorage/sessionStorage
   - Rate limiting básico (bloqueio após N erros)

   ⚠ AVISO: Este login é client-side. Para um nível
   de segurança real proteja /admin no servidor
   (htpasswd, Cloudflare Access, etc.). Use este
   arquivo como camada de UX + 2FA.
   ============================================= */

(() => {
  // ====== CONFIGURAÇÃO PADRÃO ======
  // Edite aqui seu e-mail e senha iniciais.
  // Após o primeiro login você pode trocar a senha
  // pelo fluxo "Esqueci minha senha".
  const DEFAULT_ADMIN = {
    email: "thiago.borzaquel@hotmail.com",
    // Senha padrão: "restio2025"  (TROQUE depois do primeiro login!)
    password: "restio2025",
  };

  const REDIRECT_AFTER_LOGIN = "admin.html";
  const STORAGE_KEY = "rw_admin_auth_v1";
  const SESSION_KEY = "rw_admin_session_v1";
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutos
  const REMEMBER_DAYS = 30;
  const ISSUER = "Restio Wellness";

  // ====== UTIL: BASE32 ======
  const B32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  function base32Encode(bytes) {
    let bits = 0, value = 0, output = "";
    for (const b of bytes) {
      value = (value << 8) | b;
      bits += 8;
      while (bits >= 5) {
        output += B32_CHARS[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    if (bits > 0) output += B32_CHARS[(value << (5 - bits)) & 31];
    return output;
  }
  function base32Decode(str) {
    const clean = String(str).toUpperCase().replace(/=+$/, "").replace(/\s+/g, "");
    let bits = 0, value = 0;
    const out = [];
    for (const ch of clean) {
      const idx = B32_CHARS.indexOf(ch);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        out.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return new Uint8Array(out);
  }

  // ====== UTIL: CRYPTO ======
  function randomBytes(len) {
    const a = new Uint8Array(len);
    crypto.getRandomValues(a);
    return a;
  }
  function bufToHex(buf) {
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0")).join("");
  }
  async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const h = await crypto.subtle.digest("SHA-256", data);
    return bufToHex(h);
  }
  async function hashPassword(password, saltHex) {
    return sha256Hex(saltHex + ":" + password);
  }

  // TOTP (RFC 6238) — passo 30s, 6 dígitos, SHA-1
  async function totp(secretBase32, timeStep = 30, digits = 6, t = Date.now()) {
    const key = base32Decode(secretBase32);
    const counter = Math.floor(t / 1000 / timeStep);
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setUint32(0, Math.floor(counter / 0x100000000));
    view.setUint32(4, counter >>> 0);
    const cryptoKey = await crypto.subtle.importKey(
      "raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
    );
    const sig = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buf));
    const offset = sig[sig.length - 1] & 0xf;
    const code = ((sig[offset] & 0x7f) << 24) |
      ((sig[offset + 1] & 0xff) << 16) |
      ((sig[offset + 2] & 0xff) << 8) |
      (sig[offset + 3] & 0xff);
    return String(code % 10 ** digits).padStart(digits, "0");
  }
  async function verifyTotp(secret, code, window = 1) {
    const now = Date.now();
    for (let i = -window; i <= window; i++) {
      const c = await totp(secret, 30, 6, now + i * 30000);
      if (c === String(code).trim()) return true;
    }
    return false;
  }

  // ====== STORAGE ======
  function loadAuth() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); }
    catch { return null; }
  }
  function saveAuth(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  async function ensureAuthInit() {
    let auth = loadAuth();
    if (!auth) {
      const salt = bufToHex(randomBytes(16));
      auth = {
        email: DEFAULT_ADMIN.email,
        salt,
        passwordHash: await hashPassword(DEFAULT_ADMIN.password, salt),
        totpSecret: null,
        attempts: 0,
        lockedUntil: 0,
        recovery: null,
      };
      saveAuth(auth);
    }
    return auth;
  }

  function setSession(remember) {
    const exp = remember
      ? Date.now() + REMEMBER_DAYS * 24 * 60 * 60 * 1000
      : Date.now() + 8 * 60 * 60 * 1000;
    const payload = JSON.stringify({ ok: true, exp });
    if (remember) localStorage.setItem(SESSION_KEY, payload);
    else sessionStorage.setItem(SESSION_KEY, payload);
  }
  function getSession() {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      if (s.exp && Date.now() < s.exp) return s;
    } catch {}
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }

  // ====== UI HELPERS ======
  function show(stepId) {
    document.querySelectorAll(".login-card").forEach(c => c.classList.add("hidden"));
    const el = document.getElementById(stepId);
    if (el) el.classList.remove("hidden");
  }
  function feedback(id, msg, type = "error") {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg || "";
    el.classList.remove("is-success", "is-info");
    if (type === "success") el.classList.add("is-success");
    if (type === "info") el.classList.add("is-info");
  }
  function buildOtpAuthUrl(secret, account) {
    const label = encodeURIComponent(`${ISSUER}:${account}`);
    const params = new URLSearchParams({
      secret, issuer: ISSUER, algorithm: "SHA1", digits: "6", period: "30",
    });
    return `otpauth://totp/${label}?${params}`;
  }
  function qrUrl(data, size = 200) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
  }

  // ====== INIT ======
  document.addEventListener("DOMContentLoaded", async () => {
    // Só inicializa o fluxo de login se estivermos na página de login.
    // (Evita loop de reload quando login.js é incluído em admin.html só para requireAuth.)
    const isLoginPage = !!document.getElementById("step-login");
    if (!isLoginPage) return;

    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    // Já autenticado? Redireciona.
    if (getSession()) {
      window.location.replace(REDIRECT_AFTER_LOGIN);
      return;
    }

    const auth = await ensureAuthInit();

    // Toggles de mostrar/ocultar senha
    document.querySelectorAll("[data-toggle]").forEach(btn => {
      btn.addEventListener("click", () => {
        const input = document.getElementById(btn.dataset.toggle);
        if (!input) return;
        input.type = input.type === "password" ? "text" : "password";
      });
    });

    // Navegação entre cards
    document.querySelectorAll("[data-go]").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.go;
        if (target === "step-setup-2fa") prepareSetup2FA(auth);
        show(target);
      });
    });

    // === LOGIN ===
    const loginForm = document.getElementById("login-form");
    let pendingRemember = false;

    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      feedback("login-feedback", "");
      const email = document.getElementById("login-email").value.trim().toLowerCase();
      const password = document.getElementById("login-password").value;
      const remember = document.getElementById("login-remember").checked;

      const current = loadAuth();
      if (current.lockedUntil && Date.now() < current.lockedUntil) {
        const mins = Math.ceil((current.lockedUntil - Date.now()) / 60000);
        feedback("login-feedback", `Muitas tentativas. Tente novamente em ~${mins} min.`);
        return;
      }
      if (email !== current.email.toLowerCase()) {
        return failLogin(current, "E-mail ou senha incorretos.");
      }
      const hash = await hashPassword(password, current.salt);
      if (hash !== current.passwordHash) {
        return failLogin(current, "E-mail ou senha incorretos.");
      }

      // Sucesso parcial — reseta tentativas
      current.attempts = 0;
      current.lockedUntil = 0;
      saveAuth(current);
      pendingRemember = remember;

      if (!current.totpSecret) {
        // Primeiro login → forçar configuração de 2FA
        feedback("login-feedback", "Configure o 2FA para concluir o acesso.", "info");
        prepareSetup2FA(current);
        show("step-setup-2fa");
      } else {
        show("step-2fa");
        focusFirstOtp();
      }
    });

    function failLogin(current, msg) {
      current.attempts = (current.attempts || 0) + 1;
      if (current.attempts >= MAX_ATTEMPTS) {
        current.lockedUntil = Date.now() + LOCKOUT_MS;
        current.attempts = 0;
        msg = `Conta bloqueada por 5 minutos após ${MAX_ATTEMPTS} tentativas.`;
      }
      saveAuth(current);
      feedback("login-feedback", msg);
    }

    // === OTP inputs ===
    const otpInputs = Array.from(document.querySelectorAll(".otp-input"));
    otpInputs.forEach((inp, i) => {
      inp.addEventListener("input", () => {
        inp.value = inp.value.replace(/\D/g, "").slice(0, 1);
        if (inp.value && i < otpInputs.length - 1) otpInputs[i + 1].focus();
      });
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !inp.value && i > 0) otpInputs[i - 1].focus();
      });
      inp.addEventListener("paste", (e) => {
        const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6);
        if (!text) return;
        e.preventDefault();
        otpInputs.forEach((x, idx) => x.value = text[idx] || "");
        const last = Math.min(text.length, otpInputs.length) - 1;
        if (last >= 0) otpInputs[last].focus();
      });
    });
    function focusFirstOtp() { setTimeout(() => otpInputs[0]?.focus(), 50); }
    function readOtp() { return otpInputs.map(i => i.value).join(""); }

    // === 2FA verify ===
    document.getElementById("twofa-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      feedback("twofa-feedback", "");
      const code = readOtp();
      if (code.length !== 6) return feedback("twofa-feedback", "Digite os 6 dígitos.");
      const current = loadAuth();
      if (!current.totpSecret) return feedback("twofa-feedback", "2FA não configurado.");
      const ok = await verifyTotp(current.totpSecret, code);
      if (!ok) return feedback("twofa-feedback", "Código inválido ou expirado.");
      setSession(pendingRemember);
      feedback("twofa-feedback", "Acesso concedido. Redirecionando…", "success");
      setTimeout(() => window.location.replace(REDIRECT_AFTER_LOGIN), 600);
    });

    // === SETUP 2FA ===
    function prepareSetup2FA(current) {
      const secret = base32Encode(randomBytes(20));
      const url = buildOtpAuthUrl(secret, current.email);
      document.getElementById("setup-secret").value = secret;
      document.getElementById("setup-account").textContent = current.email;
      document.getElementById("setup-qr-img").src = qrUrl(url, 200);
      document.getElementById("setup-form").dataset.secret = secret;
      feedback("setup-feedback", "");
      document.getElementById("setup-code").value = "";
    }
    document.getElementById("setup-copy").addEventListener("click", async () => {
      const v = document.getElementById("setup-secret").value;
      try { await navigator.clipboard.writeText(v); feedback("setup-feedback", "Segredo copiado.", "success"); }
      catch { feedback("setup-feedback", "Não foi possível copiar.", "error"); }
    });
    document.getElementById("setup-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      feedback("setup-feedback", "");
      const secret = e.currentTarget.dataset.secret;
      const code = document.getElementById("setup-code").value.trim();
      if (!/^\d{6}$/.test(code)) return feedback("setup-feedback", "Digite 6 dígitos.");
      const ok = await verifyTotp(secret, code);
      if (!ok) return feedback("setup-feedback", "Código incorreto. Verifique o relógio do dispositivo.");
      const current = loadAuth();
      current.totpSecret = secret;
      saveAuth(current);
      feedback("setup-feedback", "2FA ativado! Entrando…", "success");
      setSession(pendingRemember);
      setTimeout(() => window.location.replace(REDIRECT_AFTER_LOGIN), 700);
    });

    // === FORGOT ===
    document.getElementById("forgot-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      feedback("forgot-feedback", "");
      const email = document.getElementById("forgot-email").value.trim().toLowerCase();
      const current = loadAuth();
      if (email !== current.email.toLowerCase()) {
        // Mensagem genérica para não vazar contas
        feedback("forgot-feedback",
          "Se o e-mail estiver cadastrado, as instruções foram geradas.", "info");
        return;
      }
      // Gera código local (formato XXXX-XXXX-XXXX)
      const raw = bufToHex(randomBytes(6)).toUpperCase();
      const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
      const codeHash = await sha256Hex(code);
      current.recovery = { hash: codeHash, exp: Date.now() + 30 * 60 * 1000 };
      saveAuth(current);

      // Como não há backend, mostramos o código aqui mesmo.
      // Em produção, envie por e-mail (ex.: EmailJS, Resend, SES).
      feedback("forgot-feedback",
        `Código de recuperação (válido por 30 min): ${code}`, "success");
    });

    // === RESET ===
    document.getElementById("reset-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      feedback("reset-feedback", "");
      const code = document.getElementById("reset-code").value.trim().toUpperCase();
      const p1 = document.getElementById("reset-password").value;
      const p2 = document.getElementById("reset-password2").value;
      if (p1.length < 8) return feedback("reset-feedback", "Senha precisa ter ao menos 8 caracteres.");
      if (p1 !== p2) return feedback("reset-feedback", "As senhas não coincidem.");
      const current = loadAuth();
      if (!current.recovery || Date.now() > current.recovery.exp) {
        return feedback("reset-feedback", "Código expirado. Solicite outro.");
      }
      const codeHash = await sha256Hex(code);
      if (codeHash !== current.recovery.hash) {
        return feedback("reset-feedback", "Código inválido.");
      }
      const salt = bufToHex(randomBytes(16));
      current.salt = salt;
      current.passwordHash = await hashPassword(p1, salt);
      current.recovery = null;
      current.attempts = 0;
      current.lockedUntil = 0;
      saveAuth(current);
      feedback("reset-feedback", "Senha redefinida! Faça login novamente.", "success");
      setTimeout(() => show("step-login"), 800);
    });
  });

  // ====== Helper exposto para logout em admin.html ======
  window.RestioAuth = {
    logout() {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      window.location.replace("login.html");
    },
    requireAuth() {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      try {
        const s = JSON.parse(raw || "null");
        if (s && s.exp && Date.now() < s.exp) return true;
      } catch {}
      window.location.replace("login.html");
      return false;
    },
  };
})();
