// app.js — GLOBAL (Theme + Route Guard + Landing Buttons)
// ✅ card.html + qr.html are PUBLIC
// ✅ Protected pages require login (token)
// ✅ No API Base UI, no modal login, no loops
// Uses:
// - mycard_token
// - mycard_user

document.addEventListener("DOMContentLoaded", () => {
  requestAnimationFrame(() => document.body.classList.add("ready"));

  /* ---------------- THEME ---------------- */
  const html = document.documentElement;
  const toggle = document.getElementById("themeToggle");

  const savedTheme = localStorage.getItem("mycard_theme");
  if (savedTheme) html.setAttribute("data-theme", savedTheme);

  function refreshToggleIcon() {
    const t = html.getAttribute("data-theme") || "dark";
    if (toggle) toggle.textContent = t === "dark" ? "☀️" : "🌙";
  }
  refreshToggleIcon();

  toggle?.addEventListener("click", () => {
    const cur = html.getAttribute("data-theme") || "dark";
    const next = cur === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", next);
    localStorage.setItem("mycard_theme", next);
    refreshToggleIcon();
  });

  /* ---------------- AUTH HELPERS ---------------- */
  function getToken() {
    const t = localStorage.getItem("mycard_token");
    if (!t) return "";
    const s = String(t).trim();
    if (!s || s === "null" || s === "undefined") return "";
    return s.replace(/^Bearer\s+/i, "");
  }

  function isLoggedIn() {
    const t = getToken();
    // must be non-empty and not tiny garbage
    return t.length >= 10;
  }

  /* ---------------- ROUTE GUARD ---------------- */
  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  const publicPages = new Set(["", "index.html", "login.html", "card.html", "qr.html"]);

  const protectedPages = new Set([
    "dashboard.html",
    "wizard.html",
    "editor.html",
    "analytics.html",
    "contacts.html",
    "virtual-bg.html",
    "email-signature.html",
    "admin.html",
  ]);

  function safeRedirect(path) {
    const k = "mycard_redirect_lock";
    const now = Date.now();
    const last = Number(sessionStorage.getItem(k) || "0");
    if (now - last < 1200) return;
    sessionStorage.setItem(k, String(now));
    window.location.replace(path);
  }

  if (protectedPages.has(page) && !isLoggedIn()) {
    safeRedirect("login.html");
    return;
  }

  if (page === "login.html" && isLoggedIn()) {
    safeRedirect("dashboard.html");
    return;
  }

  /* ---------------- LANDING (index.html buttons) ---------------- */
  if (page !== "index.html" && page !== "") return;

  const loginBtn = document.getElementById("loginBtn");
  const createBtn = document.getElementById("createBtn");
  const dashboardBtn = document.getElementById("dashboardBtn");

  loginBtn?.addEventListener("click", () => {
    window.location.assign("login.html");
  });

  createBtn?.addEventListener("click", () => {
    if (!isLoggedIn()) window.location.assign("login.html");
    else window.location.assign("wizard.html");
  });

  dashboardBtn?.addEventListener("click", () => {
    if (!isLoggedIn()) window.location.assign("login.html");
    else window.location.assign("dashboard.html");
  });
});
