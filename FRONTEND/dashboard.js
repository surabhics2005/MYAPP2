// dashboard.js — FULL (proper card layout + reliable light/dark toggle)
// ✅ Uses ONLY #themeToggle
// ✅ Stops other scripts from double-handling theme toggle
// ✅ New Card always opens wizard.html
// ✅ Cards render in the same layout as your screenshot
// Requires: storage.js loaded before this file

document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id);

  const cardsGrid = $("cardsGrid");
  const emptyState = $("emptyState");
  const emptyCreateBtn = $("emptyCreateBtn");

  const themeBtn = $("themeToggle");
  const newCardBtn = $("newCardBtn");

  // ---------------- THEME (single button, reliable) ----------------
  function getTheme() {
    const saved = (localStorage.getItem("mycard_theme") || "").toLowerCase();
    const attr = (document.documentElement.getAttribute("data-theme") || "").toLowerCase();
    const t = saved || attr || "dark";
    return t === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    const v = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", v);
    document.documentElement.classList.toggle("is-light", v === "light");
    localStorage.setItem("mycard_theme", v);
    if (themeBtn) themeBtn.textContent = v === "light" ? "🌙" : "☀️";
  }

  function toggleTheme() {
    applyTheme(getTheme() === "dark" ? "light" : "dark");
  }

  applyTheme(getTheme());

  // IMPORTANT: stop other scripts from also toggling
  if (themeBtn) {
    themeBtn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        toggleTheme();
      },
      true // capture
    );
  }

  // ---------------- NEW CARD ----------------
  function goWizard() {
    window.location.href = "wizard.html";
  }
  newCardBtn?.addEventListener("click", goWizard);
  emptyCreateBtn?.addEventListener("click", goWizard);

  // ---------------- SHARE LINK (OPEN SYSTEM SHARE SHEET, DO NOT NAVIGATE) ----------------
  function pageBase() {
    return location.origin + location.pathname.replace(/\/[^/]*$/, "/");
  }
  function shareUrl(cardId) {
    return pageBase() + "card.html?id=" + encodeURIComponent(cardId);
  }

  async function shareLink(card) {
    const id = String(card?.id || "");
    if (!id) return;

    const url = shareUrl(id);
    const title = "MYCARD";
    const text = `${card?.basic?.displayName || card?.wizard?.name || "Card"}`;

    // ✅ This opens Nearby/Share options (if supported)
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (_) {
        // user cancelled / failed -> fallback below
      }
    }

    // Fallback: copy link
    try { await navigator.clipboard.writeText(url); } catch (_) {}
    alert("Share not supported here.\nLink copied:\n" + url);
  }

  // ---------------- HELPERS ----------------
  function ensureShape(c) {
    c = c || {};
    c.basic = c.basic || {};
    c.wizard = c.wizard || {};
    c.links = c.links || {};
    c.theme = c.theme || {};
    c.status = c.status || "draft";
    return c;
  }

  function bestName(c) {
    return c?.basic?.displayName || c?.wizard?.name || "MYCARD";
  }
  function bestMeta(c) {
    const a = c?.basic?.tagline || c?.wizard?.jobTitle || "";
    const b = c?.basic?.company || c?.wizard?.company || "";
    if (a && b) return `${a} • ${b}`;
    return a || b || "";
  }
  function bestEmail(c) {
    return c?.basic?.email || c?.wizard?.email || "";
  }

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
    }[m]));
  }

  // ---------------- RENDER (same layout as your screenshot) ----------------
  function render(cards) {
    if (!cardsGrid) return;

    if (!Array.isArray(cards) || cards.length === 0) {
      cardsGrid.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      return;
    }
    if (emptyState) emptyState.style.display = "none";

    cardsGrid.innerHTML = cards.map((c) => {
      const id = String(c.id);
      const name = esc(bestName(c));
      const meta = esc(bestMeta(c));
      const email = esc(bestEmail(c));
      const status = (c.status || "draft").toUpperCase();

      return `
        <article class="dashCard" data-id="${id}">
          <div class="dashCard__row">
            <div class="dashCard__left">
              <div class="dashCard__name">${name}</div>
              <div class="dashCard__meta">${meta}</div>
              <div class="dashCard__email">${email}</div>
            </div>

            <div class="dashCard__right">
              <span class="dashBadge">${status}</span>
            </div>
          </div>

          <div class="dashCard__btns">
            <button class="btnSmall actEdit" type="button">Edit</button>
            <button class="btnSmall actView" type="button">View</button>
            <button class="btnSmall actShare" type="button">Share</button>
            <button class="btnSmall btnSmall--danger actDel" type="button">Delete</button>
          </div>
        </article>
      `;
    }).join("");

    cardsGrid.querySelectorAll(".dashCard").forEach((cardEl) => {
      const id = cardEl.getAttribute("data-id");
      const card = cards.find((x) => String(x.id) === String(id));
      if (!id || !card) return;

      cardEl.querySelector(".actEdit")?.addEventListener("click", () => {
        window.Storage?.setActiveId?.(id);
        location.href = "editor.html?id=" + encodeURIComponent(id);
      });

      cardEl.querySelector(".actView")?.addEventListener("click", () => {
        window.Storage?.setActiveId?.(id);
        location.href = "card.html?id=" + encodeURIComponent(id);
      });

      cardEl.querySelector(".actShare")?.addEventListener("click", () => {
        window.Storage?.setActiveId?.(id);
        shareLink(card); // ✅ no navigation; opens share sheet
      });

      cardEl.querySelector(".actDel")?.addEventListener("click", async () => {
        if (!confirm("Delete this card?")) return;
        await window.Storage?.removeCard?.(id);
        const fresh = await loadCards();
        render(fresh);
      });
    });
  }

  async function loadCards() {
    try { await window.Storage?.syncNow?.(); } catch (_) {}

    const cards = (window.Storage?.getCards?.() || []).map(ensureShape);
    cards.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const active = window.Storage?.getActiveId?.() || "";
    if ((!active || !cards.find(c => String(c.id) === String(active))) && cards.length) {
      window.Storage?.setActiveId?.(cards[0].id);
    }
    return cards;
  }

  const cards = await loadCards();
  render(cards);
});
