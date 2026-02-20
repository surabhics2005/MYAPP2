// card.js — FIXED + MATCH PREVIEW
// - Theme works
// - Header align works
// - Background/template works
// - Download JPG works (export-safe mode to avoid unsupported CSS color functions)
// - 2-column info layout (company+email left, phone+location right)
// - No duplicate text, never blank

(function () {
  const $ = (id) => document.getElementById(id);

  const msg = $("msg");
  function showMsg(t) {
    if (!msg) return;
    msg.style.display = "block";
    msg.textContent = String(t || "");
  }

  // Silence some extension noise
  window.addEventListener("unhandledrejection", (e) => {
    const m = String(e?.reason?.message || e?.reason || "");
    if (m.includes("Receiving end does not exist") || m.includes("Could not establish connection")) {
      e.preventDefault();
    }
  });

  // THEME
  const themeBtn = $("themeToggle");
  function getTheme() {
    const saved = (localStorage.getItem("mycard_theme") || "").toLowerCase();
    const attr = (document.documentElement.getAttribute("data-theme") || "").toLowerCase();
    const t = saved || attr || "dark";
    return t === "light" ? "light" : "dark";
  }
  function applyTheme(t) {
    const v = t === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", v);
    localStorage.setItem("mycard_theme", v);
    if (themeBtn) themeBtn.textContent = v === "light" ? "🌙" : "☀️";
  }
  applyTheme(getTheme());
  themeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    applyTheme(getTheme() === "dark" ? "light" : "dark");
  });

  // DOM
  const cardView = $("cardView");

  const cvBanner = $("cvBanner");
  const cvProfile = $("cvProfile");
  const cvName = $("cvName");
  const cvMeta = $("cvMeta");

  const cvCompany = $("cvCompany");
  const cvEmail = $("cvEmail");
  const cvPhone = $("cvPhone");
  const cvLocation = $("cvLocation");

  const cvDesc = $("cvDesc");

  const linksTitle = $("linksTitle");
  const cvLinks = $("cvLinks");

  const servicesTitle = $("servicesTitle");
  const cvServices = $("cvServices");

  const backDash = $("backDash");
  const editBtn = $("editBtn");
  const shareBtn = $("shareBtn");
  const downloadBtn = $("downloadBtn");

  function qid() {
    try {
      return new URLSearchParams(location.search || "").get("id") || "";
    } catch {
      return "";
    }
  }

  function pageBase() {
    return location.origin + location.pathname.replace(/\/[^/]*$/, "/");
  }

  function shareUrl(id) {
    return pageBase() + "card.html?id=" + encodeURIComponent(id);
  }

  function normalizeUrl(raw) {
    const v = String(raw || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    return "https://" + v;
  }

  function openableUrl(key, raw) {
    const v = String(raw || "").trim();
    if (!v) return "";
    if (key === "whatsapp") {
      const digits = v.replace(/\D/g, "");
      if (digits.length >= 8) return "https://wa.me/" + digits;
      return normalizeUrl(v);
    }
    if (key === "telegram") {
      if (/^@/.test(v)) return "https://t.me/" + v.slice(1);
      if (!/^https?:\/\//i.test(v) && /^[A-Za-z0-9_]{3,}$/.test(v)) return "https://t.me/" + v;
      return normalizeUrl(v);
    }
    if (key === "instagram") {
      if (!/^https?:\/\//i.test(v) && /^[A-Za-z0-9_.]{3,}$/.test(v)) return "https://instagram.com/" + v;
      return normalizeUrl(v);
    }
    if (key === "facebook") {
      if (!/^https?:\/\//i.test(v) && /^[A-Za-z0-9.]{3,}$/.test(v)) return "https://facebook.com/" + v;
      return normalizeUrl(v);
    }
    if (key === "website") return normalizeUrl(v);
    return normalizeUrl(v);
  }

  function bestName(c) {
    return c?.basic?.displayName || c?.wizard?.name || "MYCARD";
  }
  function bestMeta(c) {
    const a = c?.basic?.tagline || c?.wizard?.jobTitle || "";
    const b = c?.basic?.company || c?.wizard?.company || "";
    return (a && b) ? `${a} • ${b}` : (a || b || "");
  }

  function ensureShape(c) {
    c = c || {};
    c.id = String(c.id || "").trim();
    c.wizard = c.wizard || {};
    c.basic = c.basic || {};
    c.links = c.links || {};
    c.theme = c.theme || {};
    c.services = Array.isArray(c.services) ? c.services : [];
    c.description = c.description || "";

    // defaults
    if (!c.theme.baseColor) c.theme.baseColor = "#0f7f75";
    if (!c.theme.headerAlign) c.theme.headerAlign = c.theme.header || "left";
    if (!c.theme.bgStyle) c.theme.bgStyle = c.theme.bg || c.theme.background || "gradient";
    if (!c.theme.template) c.theme.template = "classic";

    return c;
  }

  function setText(el, t) {
    if (!el) return;
    el.textContent = t || "";
  }

  function show(el, yes) {
    if (!el) return;
    el.style.display = yes ? "" : "none";
  }

  function renderCard(card) {
    const c = ensureShape(card);

    // Apply theme selections to card attributes (IMPORTANT for preview match)
    if (cardView) {
      cardView.style.setProperty("--accent", c.theme.baseColor || "#0f7f75");

      cardView.setAttribute("data-header", (c.theme.headerAlign || "left").toLowerCase());
      cardView.setAttribute("data-bg", (c.theme.bgStyle || "gradient").toLowerCase());
      cardView.setAttribute("data-template", (c.theme.template || "classic").toLowerCase());
    }

    // Banner
    const b = c.basic.bannerImage || "";
    if (cvBanner) cvBanner.style.backgroundImage = b ? `url('${b}')` : "";

    // Profile
    const p = c.basic.profileImage || "";
    if (cvProfile) {
      if (p) {
        cvProfile.style.backgroundImage = `url('${p}')`;
        cvProfile.textContent = "";
      } else {
        cvProfile.style.backgroundImage = "";
        const n = bestName(c).trim();
        cvProfile.textContent = n ? n[0].toUpperCase() : "M";
      }
    }

    setText(cvName, bestName(c));
    setText(cvMeta, bestMeta(c));

    // 2-column info (no duplicates)
    const company = c.basic.company || c.wizard.company || "";
    const email = c.basic.email || c.wizard.email || "";
    const phone = c.basic.phone || c.wizard.phone || "";
    const loc = c.basic.location || c.wizard.location || "";

    function setLine(el, icon, value){
  if (!el) return;
  const v = String(value || "").trim();
  if (!v) { el.innerHTML = ""; return; }
  el.innerHTML = `<span class="ico">${icon}</span><span class="txt">${escapeHtml(v)}</span>`;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (m) => (
    m === "&" ? "&amp;" :
    m === "<" ? "&lt;" :
    m === ">" ? "&gt;" :
    m === '"' ? "&quot;" : "&#39;"
  ));
}

setLine(cvCompany, "🏢", company);
setLine(cvEmail, "✉️", email);
setLine(cvPhone, "📞", phone);
setLine(cvLocation, "📍", loc);

    // Description
    const d = String(c.description || "").trim();
    if (cvDesc) {
      if (d) {
        cvDesc.style.display = "block";
        cvDesc.textContent = d;
      } else {
        cvDesc.style.display = "none";
        cvDesc.textContent = "";
      }
    }

    // Links
    if (cvLinks) {
      cvLinks.innerHTML = "";
      const order = [
        ["website", "🌐 Website"],
        ["whatsapp", "💬 WhatsApp"],
        ["instagram", "📷 Instagram"],
        ["facebook", "📘 Facebook"],
        ["telegram", "✈️ Telegram"],
      ];

      let any = false;
      for (const [k, label] of order) {
        const url = openableUrl(k, c.links?.[k] || "");
        if (!url) continue;
        any = true;

        const a = document.createElement("a");
        a.className = "linkChip";
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = label;
        cvLinks.appendChild(a);
      }

      show(linksTitle, any);
      show(cvLinks, any);
    }

    // Services
    if (cvServices) {
      cvServices.innerHTML = "";
      const list = Array.isArray(c.services) ? c.services : [];
      for (const s of list) {
        const div = document.createElement("div");
        div.className = "svcChip";
        div.textContent = s;
        cvServices.appendChild(div);
      }
      show(servicesTitle, list.length > 0);
      show(cvServices, list.length > 0);
    }

    return c;
  }

  async function loadCard() {
    const id = qid();

    if (!window.Storage) {
      showMsg("ERROR: storage.js not loaded. Keep card.html and storage.js in the SAME folder (frontend).");
      return null;
    }

    try { await window.Storage.syncNow?.(); } catch (_) {}

    if (id) {
      const local = (window.Storage.getCards?.() || []).find((x) => String(x.id) === String(id));
      if (local) {
        try { window.Storage.setActiveId?.(id); } catch (_) {}
        return ensureShape(local);
      }

      try {
        const pub = await window.Storage.fetchPublicCard?.(id);
        const data = pub?.data || pub;
        if (data) {
          const shaped = ensureShape({ ...data, id });
          try {
            const existing = window.Storage.getCards?.() || [];
            const filtered = existing.filter((c) => String(c.id) !== String(id));
            filtered.unshift(shaped);
            window.Storage.setCards?.(filtered);
            window.Storage.setActiveId?.(id);
          } catch (_) {}
          return shaped;
        }
      } catch (e) {
        showMsg("Public card fetch failed. Is backend running on http://127.0.0.1:5000 ?\n" + (e?.message || e));
        return null;
      }

      showMsg("Card id not found: " + id);
      return null;
    }

    const active = window.Storage.getActiveCard?.();
    if (active) return ensureShape(active);

    const all = window.Storage.getCards?.() || [];
    if (all.length) {
      try { window.Storage.setActiveId?.(all[0].id); } catch (_) {}
      return ensureShape(all[0]);
    }

    showMsg("No cards found. Create one in wizard.html first.");
    return null;
  }

  // EXPORT SAFE: avoids html2canvas failing on modern color functions
  async function renderToBlobJpg() {
    if (!window.html2canvas) throw new Error("html2canvas blocked (no internet).");
    if (!cardView) throw new Error("cardView missing");

    // Turn on export mode (disables heavy CSS that breaks html2canvas)
    cardView.classList.add("exportMode");

    // Force accent to a simple hex (avoid color-mix propagation)
    const accent = getComputedStyle(cardView).getPropertyValue("--accent").trim() || "#0f7f75";
    cardView.style.setProperty("--accent", accent);

    try {
      const canvas = await window.html2canvas(cardView, {
        scale: 2,
        backgroundColor: null,
        useCORS: true
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("Export failed");
      return blob;
    } finally {
      cardView.classList.remove("exportMode");
    }
  }

  async function downloadJpg() {
    try {
      if (downloadBtn) downloadBtn.disabled = true;
      const blob = await renderToBlobJpg();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "mycard.jpg";
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1200);
    } catch (e) {
      showMsg("Download failed:\n" + (e?.message || e));
      alert("Download failed:\n" + (e?.message || e));
    } finally {
      if (downloadBtn) downloadBtn.disabled = false;
    }
  }

  async function shareLink(card) {
    const url = shareUrl(card.id);
    const text = `MYCARD: ${bestName(card)}\n${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "MYCARD", text, url });
        return;
      } catch (_) {}
    }
    try { await navigator.clipboard.writeText(url); } catch (_) {}
    alert("Link copied:\n" + url);
  }

  // INIT
  (async () => {
    try {
      backDash?.addEventListener("click", () => (location.href = "dashboard.html"));

      const card = await loadCard();
      if (!card) {
        setText(cvName, "MYCARD");
        return;
      }

      const rendered = renderCard(card);

      editBtn?.addEventListener("click", () => {
        try { window.Storage?.setActiveId?.(rendered.id); } catch (_) {}
        location.href = "editor.html?id=" + encodeURIComponent(rendered.id);
      });

      shareBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        shareLink(rendered);
      });

      downloadBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        downloadJpg();
      });
    } catch (err) {
      showMsg("Card page crashed:\n" + (err?.stack || err?.message || err));
    }
  })();
})();
