document.addEventListener("DOMContentLoaded", async () => {
  const sel = document.getElementById("anaCardSelect");
  const backDashBtn = document.getElementById("backDashBtn");
  const resetBtn = document.getElementById("resetAnaBtn");

  const stViews = document.getElementById("stViews");
  const stVisitors = document.getElementById("stVisitors");
  const stSaves = document.getElementById("stSaves");
  const stClicks = document.getElementById("stClicks");

  const clickList = document.getElementById("clickList");
  const srcList = document.getElementById("srcList");
  const activityRows = document.getElementById("activityRows");
  const anaEmpty = document.getElementById("anaEmpty");

  backDashBtn?.addEventListener("click", () => (location.href = "dashboard.html"));

  function API() {
    return (localStorage.getItem("mycard_api_base") || "http://127.0.0.1:5000").replace(/\/+$/, "");
  }
  function token() {
    const t = localStorage.getItem("mycard_token") || "";
    return String(t).trim().replace(/^Bearer\s+/i, "");
  }

  function cardLabel(c) {
    const name = c.basic?.displayName || c.wizard?.name || "Untitled";
    const company = c.basic?.company || c.wizard?.company || "";
    return company ? `${name} — ${company}` : name;
  }

  function fmtTime(ts) {
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return String(ts || "");
    }
  }

  function renderKVList(container, obj, pretty = null) {
    container.innerHTML = "";
    const entries = Object.entries(obj || {}).sort((a, b) => (b[1] || 0) - (a[1] || 0));
    if (!entries.length) {
      container.innerHTML = `<div class="anaRow"><div class="anaKey">—</div><div class="anaVal">0</div></div>`;
      return;
    }
    for (const [k, v] of entries) {
      const label = pretty ? pretty(k) : k;
      const row = document.createElement("div");
      row.className = "anaRow";
      row.innerHTML = `
        <div class="anaKey">${MyCard.escapeHtml(label)}</div>
        <div class="anaVal">${MyCard.escapeHtml(v)}</div>
      `;
      container.appendChild(row);
    }
  }

  function fillSelect() {
    const cards = Storage.getCards();
    if (!cards.length) {
      location.href = "wizard.html";
      return [];
    }

    sel.innerHTML = "";
    cards.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = cardLabel(c);
      sel.appendChild(opt);
    });

    const activeId = Storage.getActiveId();
    if (activeId && cards.some((c) => c.id === activeId)) sel.value = activeId;
    else Storage.setActiveId(cards[0].id);

    return cards;
  }

  async function fetchSummary(cardId) {
    const t = token();
    if (!t) return null;

    const res = await fetch(`${API()}/analytics/summary/${encodeURIComponent(cardId)}`, {
      headers: { Authorization: `Bearer ${t}` }
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return null;
    return data;
  }

  function renderFromBackend(summary) {
    stViews.textContent = String(summary?.views || 0);
    stVisitors.textContent = String(summary?.unique_visitors || 0);
    stSaves.textContent = String(summary?.saves || 0);
    stClicks.textContent = String(summary?.clicks || 0);

    // Click breakdown
    renderKVList(clickList, summary?.click_breakdown || {}, (k) => {
      const map = {
        whatsapp: "WhatsApp",
        call: "Call",
        email: "Email",
        website: "Website",
        instagram: "Instagram",
        facebook: "Facebook",
        telegram: "Telegram",
        save_contact: "Save Contact",
        share_link: "Share Link",
        share_jpg: "Share JPG",
        share_whatsapp_jpg: "WhatsApp JPG",
      };
      return map[k] || k;
    });

    // Sources
    renderKVList(srcList, summary?.src_breakdown || {}, (k) => {
      const map = { qr: "QR", wa: "WhatsApp", email: "Email", direct: "Direct", link: "Link" };
      return map[k] || k || "direct";
    });

    // Recent activity
    const recent = Array.isArray(summary?.recent) ? summary.recent : [];
    activityRows.innerHTML = "";

    if (!recent.length) {
      anaEmpty.style.display = "block";
      return;
    }

    anaEmpty.style.display = "none";
    recent.slice(0, 30).forEach((ev) => {
      const type = String(ev.event_type || "").toUpperCase();
      const detail = ev.action || ev.src || "";
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${MyCard.escapeHtml(fmtTime(ev.ts))}</td>
        <td>${MyCard.escapeHtml(type)}</td>
        <td>${MyCard.escapeHtml(detail)}</td>
      `;
      activityRows.appendChild(tr);
    });
  }

  async function loadAndRender() {
    const id = sel?.value || Storage.getActiveId();
    if (!id) return;

    const summary = await fetchSummary(id);
    if (summary) {
      renderFromBackend(summary);
    } else {
      // fallback (backend not reachable): show zeros
      stViews.textContent = "0";
      stVisitors.textContent = "0";
      stSaves.textContent = "0";
      stClicks.textContent = "0";
      renderKVList(clickList, {});
      renderKVList(srcList, {});
      activityRows.innerHTML = "";
      anaEmpty.style.display = "block";
    }
  }

  sel?.addEventListener("change", async () => {
    Storage.setActiveId(sel.value);
    await loadAndRender();
  });

  resetBtn?.addEventListener("click", () => {
    alert("Reset is backend-connected now.\nIf you want reset, I will add endpoint /analytics/reset/<card_id>.");
  });

  fillSelect();
  await loadAndRender();
});
