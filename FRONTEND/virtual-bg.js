document.addEventListener("DOMContentLoaded", () => {
  // Back
  document.getElementById("goDashboardBtn")?.addEventListener("click", () => {
    location.href = "dashboard.html";
  });

  const cardSelect = document.getElementById("cardSelect");

  const optName = document.getElementById("optName");
  const optJob = document.getElementById("optJob");
  const optCompany = document.getElementById("optCompany");
  const optLocation = document.getElementById("optLocation");
  const optQr = document.getElementById("optQr");
  const optPhoto = document.getElementById("optPhoto");

  const vbBg = document.getElementById("vbBg");
  const vbPhoto = document.getElementById("vbPhoto");
  const vbName = document.getElementById("vbName");
  const vbJob = document.getElementById("vbJob");
  const vbCompany = document.getElementById("vbCompany");
  const vbLocation = document.getElementById("vbLocation");

  const vbQrWrap = document.getElementById("vbQrWrap");
  const vbQr = document.getElementById("vbQr");

  const bgUpload = document.getElementById("bgUpload");
  const chooseBgBtn = document.getElementById("chooseBgBtn");

  const bgColor = document.getElementById("bgColor");
  const bgColorText = document.getElementById("bgColorText");

  const vbPreview = document.getElementById("vbPreview");
  const downloadBtn = document.getElementById("downloadBtn");
  const shareBtn = document.getElementById("shareBtn");

  let card = null;
  let uploadedBgDataUrl = "";

  function baseCardUrlForId(id) {
    const base = location.origin + location.pathname.replace(/\/[^/]*$/, "/");
    return base + "card.html?card=" + encodeURIComponent(id);
  }

  // Online QR image (fast). If you want offline QR, tell me.
  function qrImg(url){
    const u = encodeURIComponent(url);
    return "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + u;
  }

  function ensureCard() {
    card = Storage.getActiveCard();
    if (!card) {
      const all = Storage.getCards();
      if (all.length) {
        Storage.setActiveId(all[0].id);
        card = Storage.getActiveCard();
      }
    }
    if (!card) {
      location.href = "wizard.html";
      return false;
    }
    return true;
  }

  function fillCardSelect() {
    const cards = Storage.getCards();
    cardSelect.innerHTML = "";

    cards.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      const name = c.basic?.displayName || c.wizard?.name || "Untitled";
      const meta = (c.basic?.company || c.wizard?.company || "").trim();
      opt.textContent = meta ? `${name} — ${meta}` : name;
      cardSelect.appendChild(opt);
    });

    const activeId = Storage.getActiveId();
    if (activeId && cards.some(x => x.id === activeId)) cardSelect.value = activeId;
    else {
      Storage.setActiveId(cards[0].id);
      cardSelect.value = cards[0].id;
    }
  }

  function readFileAsDataURL(file){
    return new Promise((resolve, reject) => {
      if (!file) return resolve("");
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(new Error("Failed to read"));
      r.readAsDataURL(file);
    });
  }

  function renderPreview() {
    if (!card) return;

    // Background: upload first, else color
    if (uploadedBgDataUrl) {
      vbBg.style.backgroundColor = "transparent";
      vbBg.style.backgroundImage = `url('${uploadedBgDataUrl}')`;
      vbBg.style.backgroundSize = "cover";
      vbBg.style.backgroundPosition = "center";
      vbBg.style.backgroundRepeat = "no-repeat";
    } else {
      const c = bgColor?.value || "#000000";
      vbBg.style.backgroundImage = "none";
      vbBg.style.background = c;
    }

    // Toggles
    vbName.style.display = optName.checked ? "inline-flex" : "none";
    vbJob.style.display = optJob.checked ? "inline-flex" : "none";
    vbCompany.style.display = optCompany.checked ? "inline-flex" : "none";
    vbLocation.style.display = optLocation.checked ? "inline-flex" : "none";
    vbPhoto.style.display = optPhoto.checked ? "block" : "none";
    vbQrWrap.style.display = optQr.checked ? "flex" : "none";

    // Values
    const n = card.basic?.displayName || card.wizard?.name || "Name";
    const job = card.basic?.tagline || card.wizard?.jobTitle || "";
    const comp = card.basic?.company || card.wizard?.company || "";
    const loc = card.basic?.location || card.wizard?.location || "";

    vbName.textContent = n;
    vbJob.textContent = job || "Job Title";
    vbCompany.textContent = comp || "Company";
    vbLocation.textContent = loc || "Location";

    // Profile photo
    const p = card.basic?.profileImage || "";
    vbPhoto.style.backgroundImage = p ? `url('${p}')` : "none";

    // QR (points to selected card)
    const url = baseCardUrlForId(card.id);
    vbQr.style.backgroundImage = `url('${qrImg(url)}')`;
    vbQr.style.backgroundSize = "cover";
    vbQr.style.backgroundPosition = "center";
    vbQr.style.backgroundRepeat = "no-repeat";
  }

  async function capturePngBlob() {
    if (typeof html2canvas !== "function") {
      alert("Capture library not loaded. Please allow internet (CDN) or ask me for offline version.");
      return null;
    }
    const canvas = await html2canvas(vbPreview, {
      backgroundColor: null,
      scale: 2,
      useCORS: true
    });
    return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  }

  function filenameSafe(name) {
    return String(name || "mycard")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  async function downloadPng() {
    const blob = await capturePngBlob();
    if (!blob) return;

    const name = filenameSafe(card?.basic?.displayName || "mycard");
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}_virtual_bg.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  async function sharePng() {
    const blob = await capturePngBlob();
    if (!blob) return;

    const name = filenameSafe(card?.basic?.displayName || "mycard");
    const file = new File([blob], `${name}_virtual_bg.png`, { type: "image/png" });

    const canFileShare = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));
    if (canFileShare) {
      try {
        await navigator.share({
          title: "MYCARD Virtual Background",
          files: [file],
        });
        return;
      } catch {}
    }

    await downloadPng();
    alert("Sharing not supported. Downloaded PNG instead.");
  }

  // Events
  [optName, optJob, optCompany, optLocation, optQr, optPhoto].forEach(el => {
    el?.addEventListener("change", renderPreview);
  });

  cardSelect?.addEventListener("change", () => {
    Storage.setActiveId(cardSelect.value);
    card = Storage.getActiveCard();
    renderPreview();
  });

  // Choose button opens gallery/file picker
  chooseBgBtn?.addEventListener("click", () => bgUpload.click());

  // Upload updates immediately
  bgUpload?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      uploadedBgDataUrl = await readFileAsDataURL(f);
      renderPreview();
    } catch {
      alert("Upload failed.");
    }
  });

  // Color picker clears uploaded image so color shows
  bgColor?.addEventListener("input", () => {
    bgColorText.value = bgColor.value;
    uploadedBgDataUrl = "";
    renderPreview();
  });

  bgColorText?.addEventListener("input", () => {
    const v = String(bgColorText.value || "").trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) {
      bgColor.value = v;
      uploadedBgDataUrl = "";
      renderPreview();
    }
  });

  downloadBtn?.addEventListener("click", downloadPng);
  shareBtn?.addEventListener("click", sharePng);

  // Init
  if (!ensureCard()) return;
  fillCardSelect();

  bgColor.value = "#000000";
  bgColorText.value = "#000000";

  card = Storage.getActiveCard();
  renderPreview();
});
