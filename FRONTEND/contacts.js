/* contacts.js - FULL
   - Contacts stored locally (per device)
   - Share action: choose card, then share JPG image + link
*/

document.addEventListener("DOMContentLoaded", () => {
  const CONTACTS_KEY = "mycard_contacts_v1";

  // Top buttons
  document.getElementById("backBtn")?.addEventListener("click", () => location.href = "dashboard.html");
  document.getElementById("newContactBtn")?.addEventListener("click", () => openContactModal());
  document.getElementById("newContactBtnTop")?.addEventListener("click", () => openContactModal());

  const searchInput = document.getElementById("searchInput");
  const tbody = document.getElementById("contactsBody");
  const empty = document.getElementById("contactsEmpty");

  // Contact modal
  const contactModal = document.getElementById("contactModal");
  const closeContactModal = document.getElementById("closeContactModal");
  const cancelContactBtn = document.getElementById("cancelContactBtn");
  const saveContactBtn = document.getElementById("saveContactBtn");
  const cErr = document.getElementById("cErr");

  const cName = document.getElementById("cName");
  const cTitle = document.getElementById("cTitle");
  const cCompany = document.getElementById("cCompany");
  const cEmail = document.getElementById("cEmail");
  const cMobile = document.getElementById("cMobile");
  const cLocation = document.getElementById("cLocation");

  // Share modal
  const shareModal = document.getElementById("shareModal");
  const closeShareModal = document.getElementById("closeShareModal");
  const closeShareBtn = document.getElementById("closeShareBtn");
  const shareCardSelect = document.getElementById("shareCardSelect");
  const shareImageBtn = document.getElementById("shareImageBtn");
  const shareLinkBtn = document.getElementById("shareLinkBtn");
  const copyLinkBtn = document.getElementById("copyLinkBtn");
  const shareErr = document.getElementById("shareErr");
  const shareHint = document.getElementById("shareHint");

  // capture elements
  const cardCapture = document.getElementById("cardCapture");
  const ccAvatar = document.getElementById("ccAvatar");
  const ccName = document.getElementById("ccName");
  const ccTag = document.getElementById("ccTag");
  const ccMeta = document.getElementById("ccMeta");
  const ccLinkText = document.getElementById("ccLinkText");
  const ccAccentBar = document.getElementById("ccAccentBar");

  let editingId = null;
  let sharingContact = null;

  // ---------- helpers ----------
  function loadContacts() {
    try {
      const raw = localStorage.getItem(CONTACTS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveContacts(list) {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(list || []));
  }

  function uid() {
    return "p_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function esc(s) {
    return MyCard.escapeHtml(s);
  }

  function normPhoneDigits(v){
    return String(v || "").replace(/\D/g, "");
  }

  function cardBasePath(){
    return location.origin + location.pathname.replace(/\/[^/]*$/, "/");
  }

  function cardLinkFor(id){
    return cardBasePath() + "card.html?card=" + encodeURIComponent(id);
  }

  function filenameSafe(name){
    return String(name || "mycard")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  // ---------- modal helpers ----------
  function openModal(modal){
    modal.style.display = "block";
    modal.setAttribute("aria-hidden","false");
    requestAnimationFrame(() => modal.classList.add("open"));
  }

  function closeModal(modal){
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
    setTimeout(() => { modal.style.display = "none"; }, 120);
  }

  function wireModalClose(modal){
    modal.addEventListener("click", (e) => {
      const t = e.target;
      if (t?.dataset?.close) closeModal(modal);
    });
  }
  wireModalClose(contactModal);
  wireModalClose(shareModal);

  // ---------- contacts UI ----------
  function rowHTML(c){
    return `
      <tr>
        <td>${esc(c.name)}</td>
        <td>${esc(c.title || "")}</td>
        <td>${esc(c.company || "")}</td>
        <td>${esc(c.email || "")}</td>
        <td>${esc(c.mobile || "")}</td>
        <td>${esc(c.location || "")}</td>
        <td>
          <div class="actBtns">
            <button class="btn btn--chip btn--ghost" data-act="share" data-id="${esc(c.id)}">Share</button>
            <button class="btn btn--chip btn--ghost" data-act="edit" data-id="${esc(c.id)}">Edit</button>
            <button class="btn btn--chip btn--ghost" data-act="del" data-id="${esc(c.id)}">Del</button>
          </div>
        </td>
      </tr>
    `;
  }

  function render(){
    const q = String(searchInput?.value || "").trim().toLowerCase();
    const list = loadContacts();

    const filtered = q
      ? list.filter(x =>
          [x.name,x.title,x.company,x.email,x.mobile,x.location].some(v => String(v||"").toLowerCase().includes(q))
        )
      : list;

    tbody.innerHTML = filtered.map(rowHTML).join("");

    empty.style.display = filtered.length ? "none" : "block";
  }

  // ---------- add/edit contact ----------
  function openContactModal(contact){
    cErr.textContent = "";
    if (contact) {
      editingId = contact.id;
      document.getElementById("contactModalTitle").textContent = "Edit Contact";
      cName.value = contact.name || "";
      cTitle.value = contact.title || "";
      cCompany.value = contact.company || "";
      cEmail.value = contact.email || "";
      cMobile.value = contact.mobile || "";
      cLocation.value = contact.location || "";
    } else {
      editingId = null;
      document.getElementById("contactModalTitle").textContent = "New Contact";
      cName.value = "";
      cTitle.value = "";
      cCompany.value = "";
      cEmail.value = "";
      cMobile.value = "";
      cLocation.value = "";
    }
    openModal(contactModal);
    setTimeout(() => cName.focus(), 50);
  }

  function validateEmail(v){
    const s = String(v||"").trim();
    if (!s) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  }

  function saveContact(){
    cErr.textContent = "";
    const name = String(cName.value||"").trim();
    if (!name) { cErr.textContent = "Name is required."; return; }

    const email = String(cEmail.value||"").trim();
    if (!validateEmail(email)) { cErr.textContent = "Enter a valid email."; return; }

    const mobile = String(cMobile.value||"").trim();

    const contact = {
      id: editingId || uid(),
      name,
      title: String(cTitle.value||"").trim(),
      company: String(cCompany.value||"").trim(),
      email,
      mobile,
      location: String(cLocation.value||"").trim(),
      updatedAt: Date.now()
    };

    const list = loadContacts();
    const idx = list.findIndex(x => x.id === contact.id);
    if (idx >= 0) list[idx] = contact;
    else list.unshift(contact);

    saveContacts(list);
    closeModal(contactModal);
    render();
  }

  closeContactModal?.addEventListener("click", () => closeModal(contactModal));
  cancelContactBtn?.addEventListener("click", () => closeModal(contactModal));
  saveContactBtn?.addEventListener("click", saveContact);

  // ---------- share ----------
  function fillCardSelect(){
    const cards = Storage.getCards();
    shareCardSelect.innerHTML = "";

    cards.forEach(card => {
      const opt = document.createElement("option");
      opt.value = card.id;
      const name = card.basic?.displayName || card.wizard?.name || "Untitled";
      const comp = (card.basic?.company || card.wizard?.company || "").trim();
      opt.textContent = comp ? `${name} — ${comp}` : name;
      shareCardSelect.appendChild(opt);
    });

    const active = Storage.getActiveId();
    if (active && cards.some(c => c.id === active)) shareCardSelect.value = active;
  }

  function hydrateCaptureForCard(card, link){
    // Accent
    const accent = card.theme?.baseColor || "#0f7f75";
    ccAccentBar.style.background = accent;

    // Avatar (profile image)
    const profile = card.basic?.profileImage || "";
    ccAvatar.style.backgroundImage = profile ? `url('${profile}')` : "";
    ccAvatar.textContent = profile ? "" : (card.basic?.displayName || "M").slice(0,1).toUpperCase();

    ccName.textContent = card.basic?.displayName || card.wizard?.name || "Name";
    ccTag.textContent = card.basic?.tagline || card.wizard?.jobTitle || "";

    const bits = [];
    const comp = card.basic?.company || card.wizard?.company || "";
    const email = card.basic?.email || card.wizard?.email || "";
    const phone = card.basic?.phone || card.wizard?.phone || "";
    const loc = card.basic?.location || card.wizard?.location || "";

    if (comp) bits.push("🏢 " + comp);
    if (email) bits.push("✉️ " + email);
    if (phone) bits.push("📞 " + phone);
    if (loc) bits.push("📍 " + loc);

    ccMeta.textContent = bits.join("  •  ");
    ccLinkText.textContent = link;
  }

  async function captureCardJpgBlob(){
    if (typeof html2canvas !== "function") {
      throw new Error("Capture library not loaded (html2canvas). Allow internet/CDN.");
    }
    const canvas = await html2canvas(cardCapture, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95));
    if (!blob) throw new Error("Failed to create image.");
    return blob;
  }

  async function shareFile(blob, filename, title, text){
    const file = new File([blob], filename, { type: blob.type });

    const can = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));
    if (can) {
      await navigator.share({ title, text, files: [file] });
      return true;
    }
    return false;
  }

  function downloadBlob(blob, filename){
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  async function doShareImage(){
    shareErr.textContent = "";
    shareHint.textContent = "";

    const cardId = shareCardSelect.value;
    const card = Storage.getCards().find(c => c.id === cardId);
    if (!card) { shareErr.textContent = "Card not found."; return; }

    Storage.setActiveId(cardId);

    const link = cardLinkFor(cardId);
    hydrateCaptureForCard(card, link);

    // give a tick for images to apply
    await new Promise(r => setTimeout(r, 60));

    const blob = await captureCardJpgBlob();
    const name = filenameSafe(card.basic?.displayName || "mycard");
    const filename = `${name}_card.jpg`;

    const contactName = sharingContact?.name || "contact";
    const msg = `MYCARD for ${contactName}\n${link}`;

    const ok = await shareFile(blob, filename, "MYCARD", msg);
    if (!ok) {
      downloadBlob(blob, filename);
      shareHint.textContent = "Your browser can't share image directly. Downloaded JPG instead.";
    } else {
      shareHint.textContent = "Shared card image successfully.";
    }
  }

  async function doShareLink(){
    shareErr.textContent = "";
    shareHint.textContent = "";

    const cardId = shareCardSelect.value;
    const link = cardLinkFor(cardId);

    const contactName = sharingContact?.name || "contact";
    const text = `MYCARD link for ${contactName}: ${link}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "MYCARD", text, url: link });
        shareHint.textContent = "Shared link successfully.";
        return;
      } catch {
        // fallthrough
      }
    }

    try {
      await navigator.clipboard.writeText(link);
      shareHint.textContent = "Link copied.";
    } catch {
      shareHint.textContent = link;
      alert("Copy not supported. Link shown in modal.");
    }
  }

  async function doCopyLink(){
    shareErr.textContent = "";
    shareHint.textContent = "";

    const cardId = shareCardSelect.value;
    const link = cardLinkFor(cardId);
    try {
      await navigator.clipboard.writeText(link);
      shareHint.textContent = "Link copied.";
    } catch {
      shareHint.textContent = link;
      alert("Copy not supported. Link shown in modal.");
    }
  }

  function openShareModal(contact){
    sharingContact = contact;
    shareErr.textContent = "";
    shareHint.textContent = "";
    fillCardSelect();

    // default select active card
    const active = Storage.getActiveId();
    if (active) shareCardSelect.value = active;

    openModal(shareModal);
  }

  closeShareModal?.addEventListener("click", () => closeModal(shareModal));
  closeShareBtn?.addEventListener("click", () => closeModal(shareModal));

  shareImageBtn?.addEventListener("click", () => {
    doShareImage().catch(e => shareErr.textContent = e?.message || "Share failed.");
  });
  shareLinkBtn?.addEventListener("click", () => {
    doShareLink().catch(e => shareErr.textContent = e?.message || "Share failed.");
  });
  copyLinkBtn?.addEventListener("click", () => {
    doCopyLink().catch(e => shareErr.textContent = e?.message || "Copy failed.");
  });

  // ---------- table actions ----------
  tbody.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    const id = btn.dataset.id;
    const act = btn.dataset.act;
    const list = loadContacts();
    const contact = list.find(x => x.id === id);
    if (!contact) return;

    if (act === "edit") openContactModal(contact);
    if (act === "del") {
      if (!confirm("Delete this contact?")) return;
      saveContacts(list.filter(x => x.id !== id));
      render();
    }
    if (act === "share") {
      openShareModal(contact);
    }
  });

  searchInput?.addEventListener("input", render);

  // ---------- init ----------
  render();
});
