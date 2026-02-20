// qr.js — FULL (ONLINE SYNC SAFE + NO REDIRECT LOOP)
document.addEventListener("DOMContentLoaded", async () => {
  const qrCardSelect = document.getElementById("qrCardSelect");
  const qrType = document.getElementById("qrType");
  const typeFields = document.getElementById("typeFields");
  const createQrBtn = document.getElementById("createQrBtn");

  const qrCanvas = document.getElementById("qrCanvas");
  const qrValueText = document.getElementById("qrValueText");
  const downloadQrBtn = document.getElementById("downloadQrBtn");
  const shareQrBtn = document.getElementById("shareQrBtn");

  // ---------- SAFE ONLINE SYNC ----------
  try {
    // If backend token exists, this will pull cards from server into local
    if (typeof Storage?.syncNow === "function") {
      await Storage.syncNow();
    }
  } catch (e) {
    console.warn("syncNow failed:", e);
  }

  let cards = [];
  try {
    cards = Storage.getCards();
  } catch (e) {
    console.error("Storage.getCards failed:", e);
    cards = [];
  }

  // If still no cards, DO NOT redirect (prevents refresh loop)
  if (!cards.length) {
    qrValueText.textContent = "No cards found. Create a card in Wizard first.";
    createQrBtn.disabled = true;
    downloadQrBtn.disabled = true;
    shareQrBtn.disabled = true;
    return;
  }

  // ---------- SITE BASE (for other devices) ----------
  // IMPORTANT:
  // If your frontend is on localhost/127.0.0.1, other devices can't open it.
  // Set this once in console (on the device where you generate QR):
  // localStorage.setItem("mycard_site_base","http://YOUR-LAN-IP:5500/")
  const SITE_BASE =
    (localStorage.getItem("mycard_site_base") || "").trim() ||
    (location.origin + location.pathname.replace(/\/[^/]*$/, "/"));

  function makeCardUrl(cardId) {
    // Prefer ?id= because your card.js supports it
    return SITE_BASE + "card.html?id=" + encodeURIComponent(cardId);
  }

  // ---------- Fill selector ----------
  qrCardSelect.innerHTML = "";
  cards.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent =
      (c.basic?.displayName || c.wizard?.name || "Untitled") +
      " — " +
      (c.basic?.company || c.wizard?.company || "");
    qrCardSelect.appendChild(opt);
  });

  // Default active
  const active = Storage.getActiveId?.() || "";
  if (active && cards.some((c) => c.id === active)) qrCardSelect.value = active;

  // ---------- QR engine ----------
  const qr = new QRious({
    element: qrCanvas,
    size: 320,
    value: "—",
    level: "H",
  });

  function normalizeUrl(raw) {
    const v = String(raw || "").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    return "https://" + v;
  }

  function buildTypeFields() {
    const t = qrType.value;
    typeFields.innerHTML = "";

    if (t === "card") {
      typeFields.innerHTML = `<div class="hint">This QR will open the selected card page.</div>`;
      return;
    }
    if (t === "link") {
      typeFields.innerHTML = `
        <label class="field">
          <span>Link</span>
          <input class="input" id="inLink" type="text" placeholder="example.com or https://example.com" />
          <div class="error" id="errLink"></div>
        </label>`;
      return;
    }
    if (t === "email") {
      typeFields.innerHTML = `
        <label class="field">
          <span>Email</span>
          <input class="input" id="inEmail" type="email" placeholder="name@example.com" />
          <div class="error" id="errEmail"></div>
        </label>`;
      return;
    }
    if (t === "call") {
      typeFields.innerHTML = `
        <label class="field">
          <span>Phone</span>
          <input class="input" id="inPhone" type="tel" placeholder="+91 9876543210" />
          <div class="error" id="errPhone"></div>
        </label>`;
      return;
    }
    if (t === "whatsapp") {
      typeFields.innerHTML = `
        <label class="field">
          <span>WhatsApp Number</span>
          <input class="input" id="inWa" type="tel" placeholder="+91 9876543210" />
          <div class="error" id="errWa"></div>
        </label>`;
      return;
    }
  }

  function isEmailValid(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim());
  }
  function digitsOnly(v) {
    return String(v || "").replace(/\D/g, "");
  }

  function buildQrValue() {
    const t = qrType.value;
    const cardId = qrCardSelect.value;

    if (t === "card") return makeCardUrl(cardId);

    if (t === "link") {
      const el = document.getElementById("inLink");
      const err = document.getElementById("errLink");
      if (err) err.textContent = "";
      const v = normalizeUrl(el?.value || "");
      if (!v) {
        if (err) err.textContent = "Enter a link.";
        return "";
      }
      return v;
    }

    if (t === "email") {
      const el = document.getElementById("inEmail");
      const err = document.getElementById("errEmail");
      if (err) err.textContent = "";
      const v = String(el?.value || "").trim();
      if (!isEmailValid(v)) {
        if (err) err.textContent = "Enter a valid email.";
        return "";
      }
      return "mailto:" + v;
    }

    if (t === "call") {
      const el = document.getElementById("inPhone");
      const err = document.getElementById("errPhone");
      if (err) err.textContent = "";
      const d = digitsOnly(el?.value || "");
      if (d.length < 8 || d.length > 15) {
        if (err) err.textContent = "Enter valid phone (8-15 digits).";
        return "";
      }
      return "tel:+" + d;
    }

    if (t === "whatsapp") {
      const el = document.getElementById("inWa");
      const err = document.getElementById("errWa");
      if (err) err.textContent = "";
      const d = digitsOnly(el?.value || "");
      if (d.length < 8 || d.length > 15) {
        if (err) err.textContent = "Enter valid WhatsApp no (8-15 digits).";
        return "";
      }
      return "https://wa.me/" + d;
    }

    return "";
  }

  function updateQr() {
    const value = buildQrValue();
    if (!value) return;
    qr.set({ value });
    qrValueText.textContent = value;
  }

  async function canvasToJpgBlob(canvas) {
    return await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.95);
    });
  }

  async function downloadJpg() {
    const blob = await canvasToJpgBlob(qrCanvas);
    if (!blob) return alert("Failed to download.");

    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = "mycard-qr.jpg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(u);
  }

  async function shareJpg() {
    const blob = await canvasToJpgBlob(qrCanvas);
    if (!blob) return alert("Failed to share.");

    const file = new File([blob], "mycard-qr.jpg", { type: "image/jpeg" });

    if (navigator.canShare && navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: "MYCARD QR",
          text: "MYCARD QR Code",
          files: [file],
        });
        return;
      } catch {}
    }

    await downloadJpg();
    alert("Sharing not supported on this device/browser. Downloaded instead.");
  }

  // Events
  qrType.addEventListener("change", () => {
    buildTypeFields();
    if (qrType.value === "card") updateQr();
  });

  qrCardSelect.addEventListener("change", () => {
    Storage.setActiveId?.(qrCardSelect.value);
    if (qrType.value === "card") updateQr();
  });

  createQrBtn.addEventListener("click", updateQr);
  downloadQrBtn.addEventListener("click", downloadJpg);
  shareQrBtn.addEventListener("click", shareJpg);

  // Init
  buildTypeFields();
  updateQr();
});
