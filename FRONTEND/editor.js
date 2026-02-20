// editor.js — FULL REPLACE (Finish ALWAYS redirects to dashboard)
// - Saves locally first
// - Tries online push (timeout)
// - Redirect is forced (replace + assign fallback + timer fallback)

document.addEventListener("DOMContentLoaded", () => {
  const backToDash = document.getElementById("backToDash");
  backToDash?.addEventListener("click", () => hardGoDashboard());

  function hardGoDashboard() {
    // 3-layer redirect (some browsers/extensions block one method)
    try { window.location.replace("dashboard.html"); return; } catch (_) {}
    try { window.location.assign("dashboard.html"); return; } catch (_) {}
    window.location.href = "dashboard.html";
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeUrl(raw) {
    const v = String(raw || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    return "https://" + v;
  }

  // ---- Load active card ----
  let card = null;

  try {
    card = window.Storage?.getActiveCard?.() || null;
  } catch (_) {}

  if (!card) {
    try {
      const all = window.Storage?.getCards?.() || [];
      if (all.length) {
        window.Storage?.setActiveId?.(all[0].id);
        card = window.Storage?.getActiveCard?.() || null;
      }
    } catch (_) {}
  }

  if (!card) {
    window.location.assign("wizard.html");
    return;
  }

  const cardId = card.id;

  function ensureCardShape(c) {
    c = c || {};
    c.wizard = c.wizard || {};
    c.basic = c.basic || {};
    c.links = c.links || {};
    c.theme = c.theme || {};
    c.services = Array.isArray(c.services) ? c.services : [];
    c.description = c.description || "";

    if (!c.basic.displayName && c.wizard.name) c.basic.displayName = c.wizard.name;
    if (!c.basic.tagline && c.wizard.jobTitle) c.basic.tagline = c.wizard.jobTitle;
    if (!c.basic.company && c.wizard.company) c.basic.company = c.wizard.company;
    if (!c.basic.email && c.wizard.email) c.basic.email = c.wizard.email;
    if (!c.basic.phone && c.wizard.phone) c.basic.phone = c.wizard.phone;
    if (!c.basic.location && c.wizard.location) c.basic.location = c.wizard.location;

    if (!c.theme.baseColor) c.theme.baseColor = "#0f7f75";
    if (!c.theme.backgroundStyle) c.theme.backgroundStyle = "gradient";
    if (!c.theme.headerStyle) c.theme.headerStyle = "left";
    if (!c.theme.template) c.theme.template = "classic";

    return c;
  }

  // Persist ensured shape once
  try {
    window.Storage?.updateCard?.(cardId, (c) => ensureCardShape(c));
    card = window.Storage?.getActiveCard?.() || ensureCardShape(card);
  } catch (_) {
    card = ensureCardShape(card);
  }

  /* ---- Tabs ---- */
  const tabs = Array.from(document.querySelectorAll(".stepTab"));
  const panels = {
    basic: document.getElementById("panel-basic"),
    desc: document.getElementById("panel-desc"),
    links: document.getElementById("panel-links"),
    theme: document.getElementById("panel-theme"),
    services: document.getElementById("panel-services"),
  };

  function showTab(name) {
    tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    Object.entries(panels).forEach(([k, el]) => el?.classList.toggle("active", k === name));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  tabs.forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));

  /* ---- Inputs ---- */
  const inName = document.getElementById("inName");
  const inTagline = document.getElementById("inTagline");
  const inCompany = document.getElementById("inCompany");
  const inEmail = document.getElementById("inEmail");
  const inPhone = document.getElementById("inPhone");
  const inLocation = document.getElementById("inLocation");

  const bannerFile = document.getElementById("bannerFile");
  const profileFile = document.getElementById("profileFile");

  const inDesc = document.getElementById("inDesc");

  const inWebsite = document.getElementById("inWebsite");
  const inWhatsapp = document.getElementById("inWhatsapp");
  const inInstagram = document.getElementById("inInstagram");
  const inFacebook = document.getElementById("inFacebook");
  const inTelegram = document.getElementById("inTelegram");

  const inColor = document.getElementById("inColor");

  /* ---- Preview ---- */
  const liveCard = document.getElementById("liveCard");
  const pvBanner = document.getElementById("pvBanner");
  const pvProfile = document.getElementById("pvProfile");
  const pvName = document.getElementById("pvName");
  const pvMeta = document.getElementById("pvMeta");
  const pvCompany = document.getElementById("pvCompany");
  const pvEmail = document.getElementById("pvEmail");
  const pvPhone = document.getElementById("pvPhone");
  const pvLocation = document.getElementById("pvLocation");
  const pvDesc = document.getElementById("pvDesc");
  const pvLinks = document.getElementById("pvLinks");
  const pvServices = document.getElementById("pvServices");

  const headerChoices = document.getElementById("headerChoices");
  const bgChoices = document.getElementById("bgChoices");
  const tplChoices = document.getElementById("tplChoices");

  const svcInput = document.getElementById("svcInput");
  const svcAddBtn = document.getElementById("svcAddBtn");
  const svcList = document.getElementById("svcList");

  /* ---- Navigation buttons ---- */
  document.getElementById("basicBack")?.addEventListener("click", (e) => {
    e.preventDefault();
    hardGoDashboard();
  });
  document.getElementById("basicNext")?.addEventListener("click", (e) => {
    e.preventDefault();
    saveBasic();
    showTab("desc");
  });
  document.getElementById("descBack")?.addEventListener("click", (e) => {
    e.preventDefault();
    showTab("basic");
  });
  document.getElementById("descNext")?.addEventListener("click", (e) => {
    e.preventDefault();
    saveDesc();
    showTab("links");
  });
  document.getElementById("linksBack")?.addEventListener("click", (e) => {
    e.preventDefault();
    showTab("desc");
  });
  document.getElementById("linksNext")?.addEventListener("click", (e) => {
    e.preventDefault();
    saveLinks();
    showTab("theme");
  });
  document.getElementById("themeBack")?.addEventListener("click", (e) => {
    e.preventDefault();
    showTab("links");
  });
  document.getElementById("themeNext")?.addEventListener("click", (e) => {
    e.preventDefault();
    saveTheme();
    showTab("services");
  });
  document.getElementById("servicesBack")?.addEventListener("click", (e) => {
    e.preventDefault();
    showTab("theme");
  });

  /* ==========================
     FINISH (FORCED REDIRECT)
     ========================== */
  const finishBtn = document.getElementById("finishBtn");
  let finishing = false;

  finishBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (finishing) return;
    finishing = true;

    // If anything goes wrong, still redirect after 900ms
    const failSafeTimer = setTimeout(() => {
      hardGoDashboard();
    }, 900);

    (async () => {
      try {
        finishBtn.disabled = true;
        finishBtn.textContent = "Saving...";

        // Save locally (fast)
        saveBasic();
        saveDesc();
        saveLinks();
        saveTheme();
        saveServices();

        // Try online push but NEVER block redirect
        if (window.Storage?.isLoggedIn?.() && typeof window.Storage?.pushCardNow === "function") {
          try {
            const push = window.Storage.pushCardNow(cardId);
            await Promise.race([
              push,
              new Promise((resolve) => setTimeout(resolve, 2500)),
            ]);
          } catch (_) {}
        }
      } catch (err) {
        console.warn("Finish error:", err);
      } finally {
        clearTimeout(failSafeTimer);
        // Immediate hard redirect
        hardGoDashboard();
      }
    })();
  });

  /* ---- Helpers ---- */
  function readImageAsDataURL(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve("");
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });
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

  function updateCard(fn) {
    try {
      if (typeof window.Storage?.updateCard === "function") {
        window.Storage.updateCard(cardId, (c) => fn(ensureCardShape(c)));
        return window.Storage.getActiveCard();
      }
    } catch (_) {}
    card = fn(ensureCardShape(card));
    return card;
  }

  function loadToInputs(c) {
    c = ensureCardShape(c);

    inName.value = c.basic.displayName || "";
    inTagline.value = c.basic.tagline || "";
    inCompany.value = c.basic.company || "";
    inEmail.value = c.basic.email || "";
    inPhone.value = c.basic.phone || "";
    inLocation.value = c.basic.location || "";

    inDesc.value = c.description || "";

    inWebsite.value = c.links.website || "";
    inWhatsapp.value = c.links.whatsapp || "";
    inInstagram.value = c.links.instagram || "";
    inFacebook.value = c.links.facebook || "";
    inTelegram.value = c.links.telegram || "";

    inColor.value = c.theme.baseColor || "#0f7f75";
  }

  function applyPreviewFromCard(c) {
    c = ensureCardShape(c);

    liveCard?.style.setProperty("--accent", c.theme.baseColor || "#0f7f75");
    liveCard?.setAttribute("data-bg", c.theme.backgroundStyle || "gradient");
    liveCard?.setAttribute("data-header", c.theme.headerStyle || "left");
    liveCard?.setAttribute("data-template", c.theme.template || "classic");

    if (pvBanner) pvBanner.style.backgroundImage = c.basic.bannerImage ? `url('${c.basic.bannerImage}')` : "";
    if (pvProfile) pvProfile.style.backgroundImage = c.basic.profileImage ? `url('${c.basic.profileImage}')` : "";

    if (pvName) pvName.textContent = c.basic.displayName || "Name";
    if (pvMeta) pvMeta.textContent = c.basic.tagline || "";

    if (pvCompany) pvCompany.textContent = c.basic.company ? `🏢 ${c.basic.company}` : "";
    if (pvEmail) pvEmail.textContent = c.basic.email ? `✉️ ${c.basic.email}` : "";
    if (pvPhone) pvPhone.textContent = c.basic.phone ? `📞 ${c.basic.phone}` : "";
    if (pvLocation) pvLocation.textContent = c.basic.location ? `📍 ${c.basic.location}` : "";

    const d = String(c.description || "").trim();
    if (pvDesc) {
      if (d) {
        pvDesc.style.display = "block";
        pvDesc.textContent = d;
      } else {
        pvDesc.style.display = "none";
        pvDesc.textContent = "";
      }
    }

    if (pvLinks) {
      pvLinks.innerHTML = "";
      const linkOrder = [
        ["website", "🌐 Website"],
        ["whatsapp", "💬 WhatsApp"],
        ["instagram", "📷 Instagram"],
        ["facebook", "📘 Facebook"],
        ["telegram", "✈️ Telegram"],
      ];
      linkOrder.forEach(([k, label]) => {
        const raw = c.links?.[k] || "";
        const url = openableUrl(k, raw);
        if (!url) return;
        const a = document.createElement("a");
        a.className = "linkChip";
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = label;
        pvLinks.appendChild(a);
      });
    }

    if (pvServices) {
      pvServices.innerHTML = "";
      (c.services || []).forEach((s) => {
        const chip = document.createElement("div");
        chip.className = "svcChip";
        chip.textContent = s;
        pvServices.appendChild(chip);
      });
    }
  }

  /* ---- Theme Options ---- */
  const headerOptions = [
    { id: "left", name: "Left" },
    { id: "center", name: "Center" },
    { id: "right", name: "Right" },
  ];
  const bgOptions = [
    { id: "flat", name: "Flat" },
    { id: "gradient", name: "Aurora Gradient" },
    { id: "waves", name: "Soft Waves" },
    { id: "stripes", name: "Stripes" },
    { id: "zigzag", name: "Zigzag" },
    { id: "blur", name: "Blur Glow" },
  ];
  const tplOptions = [
    { id: "classic", name: "Classic" },
    { id: "soft", name: "Soft" },
    { id: "bold", name: "Bold" },
    { id: "neon", name: "Neon" },
    { id: "minimal", name: "Minimal" },
    { id: "glass", name: "Glass" },
    { id: "outline", name: "Outline" },
    { id: "gradientFrame", name: "Gradient Frame" },
    { id: "shadowHeavy", name: "Heavy Shadow" },
    { id: "roundedMax", name: "Rounded Max" },
  ];

  function renderChoices() {
    headerChoices && (headerChoices.innerHTML = "");
    bgChoices && (bgChoices.innerHTML = "");
    tplChoices && (tplChoices.innerHTML = "");

    headerOptions.forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choiceCard";
      b.dataset.value = opt.id;
      b.innerHTML = `
        <div class="miniPhone"><div class="miniBar" style="background: var(--accent)"></div></div>
        <div class="choiceName">${escapeHtml(opt.name)}</div>
      `;
      b.addEventListener("click", () => {
        card = updateCard((c) => ((c.theme.headerStyle = opt.id), c));
        syncUI();
      });
      headerChoices?.appendChild(b);
    });

    bgOptions.forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choiceCard";
      b.dataset.value = opt.id;
      b.innerHTML = `
        <div class="miniBg" data-bg="${opt.id}"></div>
        <div class="choiceName">${escapeHtml(opt.name)}</div>
      `;
      b.addEventListener("click", () => {
        card = updateCard((c) => ((c.theme.backgroundStyle = opt.id), c));
        syncUI();
      });
      bgChoices?.appendChild(b);
    });

    tplOptions.forEach((opt) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "choiceCard";
      b.dataset.value = opt.id;
      b.innerHTML = `
        <div class="miniPhone" style="border-radius:14px; border:6px solid rgba(255,255,255,.25);"></div>
        <div class="choiceName">${escapeHtml(opt.name)}</div>
      `;
      b.addEventListener("click", () => {
        card = updateCard((c) => ((c.theme.template = opt.id), c));
        syncUI();
      });
      tplChoices?.appendChild(b);
    });
  }

  function highlightChoices() {
    headerChoices?.querySelectorAll(".choiceCard").forEach((x) => {
      x.classList.toggle("active", x.dataset.value === (card.theme.headerStyle || "left"));
    });
    bgChoices?.querySelectorAll(".choiceCard").forEach((x) => {
      x.classList.toggle("active", x.dataset.value === (card.theme.backgroundStyle || "gradient"));
    });
    tplChoices?.querySelectorAll(".choiceCard").forEach((x) => {
      x.classList.toggle("active", x.dataset.value === (card.theme.template || "classic"));
    });
  }

  /* ---- Save functions ---- */
  function saveBasic() {
    card = updateCard((c) => {
      c.basic.displayName = String(inName.value || "").trim();
      c.basic.tagline = String(inTagline.value || "").trim();
      c.basic.company = String(inCompany.value || "").trim();
      c.basic.email = String(inEmail.value || "").trim();
      c.basic.phone = String(inPhone.value || "").trim();
      c.basic.location = String(inLocation.value || "").trim();
      return c;
    });
    syncUI();
  }

  function saveDesc() {
    card = updateCard((c) => ((c.description = String(inDesc.value || "")), c));
    syncUI();
  }

  function saveLinks() {
    card = updateCard((c) => {
      c.links.website = String(inWebsite.value || "").trim();
      c.links.whatsapp = String(inWhatsapp.value || "").trim();
      c.links.instagram = String(inInstagram.value || "").trim();
      c.links.facebook = String(inFacebook.value || "").trim();
      c.links.telegram = String(inTelegram.value || "").trim();
      return c;
    });
    syncUI();
  }

  function saveTheme() {
    card = updateCard((c) => ((c.theme.baseColor = String(inColor.value || "#0f7f75")), c));
    syncUI();
  }

  function saveServices() {
    card = updateCard((c) => {
      c.services = Array.isArray(c.services) ? c.services : [];
      return c;
    });
    syncUI();
  }

  // Upload handlers
  bannerFile?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImageAsDataURL(file);
      card = updateCard((c) => ((c.basic.bannerImage = dataUrl), c));
      syncUI();
    } catch {
      alert("Banner upload failed.");
    }
  });

  profileFile?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImageAsDataURL(file);
      card = updateCard((c) => ((c.basic.profileImage = dataUrl), c));
      syncUI();
    } catch {
      alert("Profile upload failed.");
    }
  });

  inColor?.addEventListener("input", () => {
    card = updateCard((c) => ((c.theme.baseColor = String(inColor.value || "#0f7f75")), c));
    syncUI();
  });

  function renderServices() {
    if (!svcList) return;
    svcList.innerHTML = "";
    (card.services || []).forEach((s, idx) => {
      const row = document.createElement("div");
      row.className = "svcRow";
      row.innerHTML = `
        <div class="svcText">${escapeHtml(s)}</div>
        <button class="btn btn--chip danger" type="button">Remove</button>
      `;
      row.querySelector("button")?.addEventListener("click", () => {
        const copy = (card.services || []).slice();
        copy.splice(idx, 1);
        card = updateCard((c) => ((c.services = copy), c));
        syncUI();
      });
      svcList.appendChild(row);
    });
  }

  svcAddBtn?.addEventListener("click", () => {
    const v = String(svcInput.value || "").trim();
    if (!v) return;
    const copy = (card.services || []).slice();
    copy.push(v);
    svcInput.value = "";
    card = updateCard((c) => ((c.services = copy), c));
    syncUI();
  });

  function syncUI() {
    try {
      card = ensureCardShape(window.Storage?.getActiveCard?.() || card);
    } catch (_) {
      card = ensureCardShape(card);
    }
    loadToInputs(card);
    applyPreviewFromCard(card);
    highlightChoices();
    renderServices();
  }

  renderChoices();
  syncUI();
});