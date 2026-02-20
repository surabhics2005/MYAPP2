document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("backDashBtn")?.addEventListener("click", () => {
    location.href = "dashboard.html";
  });

  const selCard = document.getElementById("esCardSelect");
  const sigText = document.getElementById("sigText");
  const sigFile = document.getElementById("sigFile");
  const chooseSigImgBtn = document.getElementById("chooseSigImgBtn");
  const removeSigImgBtn = document.getElementById("removeSigImgBtn");
  const sigImgMini = document.getElementById("sigImgMini");

  const downloadSigBtn = document.getElementById("downloadSigBtn");
  const shareSigBtn = document.getElementById("shareSigBtn");
  const waShareBtn = document.getElementById("waShareBtn");

  const esCapture = document.getElementById("esCapture");

  const pvName = document.getElementById("pvName");
  const pvMeta = document.getElementById("pvMeta");
  const pvEmail = document.getElementById("pvEmail");
  const pvPhone = document.getElementById("pvPhone");
  const pvLocation = document.getElementById("pvLocation");
  const pvWebsite = document.getElementById("pvWebsite");
  const pvSigText = document.getElementById("pvSigText");
  const pvSigImg = document.getElementById("pvSigImg");

  const cards = Storage.getCards();
  if (!cards.length) {
    location.href = "wizard.html";
    return;
  }

  function cardLabel(c) {
    const name = c.basic?.displayName || c.wizard?.name || "Untitled";
    const company = c.basic?.company || c.wizard?.company || "";
    return company ? `${name} — ${company}` : name;
  }

  selCard.innerHTML = cards.map(c => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = cardLabel(c);
    return opt.outerHTML;
  }).join("");

  const activeId = Storage.getActiveId();
  if (activeId && cards.some(c => c.id === activeId)) selCard.value = activeId;
  else Storage.setActiveId(cards[0].id);

  let card = Storage.getActiveCard();
  if (!card) {
    Storage.setActiveId(cards[0].id);
    card = Storage.getActiveCard();
  }

  function baseCardUrlFor(id) {
    const base = location.origin + location.pathname.replace(/\/[^/]*$/, "/");
    return base + "card.html?card=" + encodeURIComponent(id);
  }

  function readImageAsDataURL(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve("");
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(new Error("Failed to read image"));
      r.readAsDataURL(file);
    });
  }

  function saveSignatureToCard(partial) {
    const id = card.id;
    const updated = Storage.updateCard(id, (c) => {
      c.emailSignature = c.emailSignature || { text: "", image: "" };
      if (typeof partial.text === "string") c.emailSignature.text = partial.text;
      if (typeof partial.image === "string") c.emailSignature.image = partial.image;
      return c;
    });
    if (updated) card = updated;
  }

  function render() {
    card = Storage.getActiveCard() || card;

    // follow theme: preview uses theme-aware CSS now
    esCapture.setAttribute("data-theme", document.documentElement.getAttribute("data-theme") || "dark");

    const name = card.basic?.displayName || card.wizard?.name || "Name";
    const job = card.basic?.tagline || card.wizard?.jobTitle || "";
    const company = card.basic?.company || card.wizard?.company || "";
    const email = card.basic?.email || card.wizard?.email || "";
    const phone = card.basic?.phone || card.wizard?.phone || "";
    const loc = card.basic?.location || card.wizard?.location || "";
    const website = card.links?.website || "";

    pvName.textContent = name;
    pvMeta.textContent = [job, company].filter(Boolean).join(" • ") || "—";

    pvEmail.textContent = email ? `✉️ ${email}` : "";
    pvPhone.textContent = phone ? `📞 ${phone}` : "";
    pvLocation.textContent = loc ? `📍 ${loc}` : "";
    pvWebsite.textContent = website ? `🌐 ${MyCard.normalizeUrl(website).replace(/^https?:\/\//i, "")}` : "";

    const sig = card.emailSignature || { text: "", image: "" };

    const t = String(sig.text || "").trim();
    if (t) {
      pvSigText.style.display = "block";
      pvSigText.textContent = t;
    } else {
      pvSigText.style.display = "none";
      pvSigText.textContent = "";
    }

    if (sig.image) {
      pvSigImg.style.display = "block";
      pvSigImg.style.backgroundImage = `url('${sig.image}')`;

      sigImgMini.style.display = "block";
      sigImgMini.style.backgroundImage = `url('${sig.image}')`;
    } else {
      pvSigImg.style.display = "none";
      pvSigImg.style.backgroundImage = "";

      sigImgMini.style.display = "none";
      sigImgMini.style.backgroundImage = "";
    }

    if (sigText.value !== (sig.text || "")) sigText.value = sig.text || "";
  }

  selCard.addEventListener("change", () => {
    Storage.setActiveId(selCard.value);
    card = Storage.getActiveCard();
    render();
  });

  sigText.addEventListener("input", () => {
    saveSignatureToCard({ text: String(sigText.value || "") });
    render();
  });

  chooseSigImgBtn?.addEventListener("click", () => sigFile?.click());

  sigFile?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await readImageAsDataURL(file);
      saveSignatureToCard({ image: data });
      sigFile.value = "";
      render();
    } catch {
      alert("Image upload failed.");
    }
  });

  removeSigImgBtn?.addEventListener("click", () => {
    saveSignatureToCard({ image: "" });
    render();
  });

  async function capturePngBlob() {
    if (typeof html2canvas !== "function") {
      alert("Capture library not loaded. Please allow internet (CDN).");
      return null;
    }
    // background set by CSS based on theme
    const canvas = await html2canvas(esCapture, {
      backgroundColor: null,
      scale: 2,
      useCORS: true
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    return blob || null;
  }

  function filenameSafe(name) {
    return String(name || "mycard")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  async function downloadPNG() {
    const blob = await capturePngBlob();
    if (!blob) return;

    const name = filenameSafe(card.basic?.displayName || "mycard");
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}_email_signature.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  async function sharePNG() {
    const blob = await capturePngBlob();
    if (!blob) return;

    const name = filenameSafe(card.basic?.displayName || "mycard");
    const file = new File([blob], `${name}_email_signature.png`, { type: "image/png" });

    const url = baseCardUrlFor(card.id);
    const text = `MYCARD: ${card.basic?.displayName || "Card"}\n${url}`;

    const canFiles = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));

    if (canFiles) {
      try {
        await navigator.share({ title: "MYCARD Email Signature", text, files: [file] });
        return;
      } catch {}
    }

    // fallback: share link only
    if (navigator.share) {
      try {
        await navigator.share({ title: "MYCARD", text, url });
        return;
      } catch {}
    }

    // last fallback
    try { await navigator.clipboard.writeText(url); } catch {}
    await downloadPNG();
    alert("Sharing not supported. Link copied (if allowed) and PNG downloaded.");
  }

  function shareWhatsApp() {
    const url = baseCardUrlFor(card.id);
    const msg = `MYCARD: ${card.basic?.displayName || "Card"}\n${url}`;
    const wa = "https://wa.me/?text=" + encodeURIComponent(msg);
    window.open(wa, "_blank");
  }

  downloadSigBtn?.addEventListener("click", downloadPNG);
  shareSigBtn?.addEventListener("click", sharePNG);
  waShareBtn?.addEventListener("click", shareWhatsApp);

  render();
});
