// admin.js — FULL (Admin session isolated)
// ✅ Admin token stored in sessionStorage (NOT localStorage)
// ✅ Does NOT overwrite normal user login
// Backend used:
// POST /auth/login
// GET  /admin/users, /admin/cards
// POST /admin/delete_user, /admin/delete_card

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  const loginCard = $("loginCard");
  const panelCard = $("panelCard");

  const emailEl = $("adminEmail");
  const passEl  = $("adminPass");
  const loginBtn = $("adminLoginBtn");
  const loginMsg = $("loginMsg");

  const logoutBtn = $("logoutBtn");

  const tabUsers = $("tabUsers");
  const tabCards = $("tabCards");
  const refreshBtn = $("refreshBtn");
  const searchInput = $("searchInput");
  const statusMsg = $("statusMsg");
  const errorBox = $("errorBox");
  const tableHead = $("tableHead");
  const tableBody = $("tableBody");

  // ---------------- CONFIG ----------------
  function API() {
    return (localStorage.getItem("mycard_api_base") || "http://127.0.0.1:5000").replace(/\/+$/, "");
  }

  // ✅ ADMIN SESSION KEYS (isolated)
  const ADMIN_TOKEN_KEY = "mycard_admin_token";
  const ADMIN_USER_KEY  = "mycard_admin_user";

  function adminToken() {
    const t = sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
    return String(t).trim().replace(/^Bearer\s+/i, "");
  }

  function setAdminSession(token, user) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, String(token || "").trim());
    sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user || {}));
  }

  function clearAdminSession() {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_USER_KEY);
  }

  // ---------------- UI HELPERS ----------------
  function setLoginMsg(text, ok=false){
    if (!loginMsg) return;
    loginMsg.textContent = text || "";
    loginMsg.style.color = ok ? "var(--ok)" : "var(--err)";
  }

  function setStatus(text, ok=true){
    if (!statusMsg) return;
    statusMsg.textContent = text || "";
    statusMsg.style.color = ok ? "var(--ok)" : "var(--muted)";
  }

  function showError(text){
    if (!errorBox) return;
    if (!text){
      errorBox.style.display="none";
      errorBox.textContent="";
      return;
    }
    errorBox.style.display="block";
    errorBox.textContent=text;
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[m]));
  }

  function normalizeList(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.users)) return payload.users;
    if (payload && Array.isArray(payload.cards)) return payload.cards;
    if (payload && Array.isArray(payload.data)) return payload.data;
    return [];
  }

  function bestUserName(u) {
    const name =
      u?.name || u?.full_name || u?.fullname || u?.username ||
      u?.display_name || u?.displayName;
    if (name && String(name).trim()) return String(name).trim();
    const email = String(u?.email || "").trim();
    if (email.includes("@")) return email.split("@")[0];
    return "—";
  }

  function bestId(x) {
    return x?.id ?? x?._id ?? x?.uuid ?? x?.card_id ?? x?.cardId ?? "";
  }

  async function postJSON(url, body){
    const res = await fetch(url, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(body || {})
    });
    const data = await res.json().catch(()=>({}));
    return { ok: res.ok, status: res.status, data };
  }

  // ✅ IMPORTANT: admin requests use ADMIN token, not normal user token
  async function adminFetch(path, options){
    try{
      const res = await fetch(API() + path, {
        ...(options || {}),
        headers: {
          "Content-Type":"application/json",
          Authorization: "Bearer " + adminToken(),
          ...(options?.headers || {})
        }
      });
      const data = await res.json().catch(()=>({}));
      return { ok: res.ok, status: res.status, data };
    }catch{
      return { ok:false, status:0, data:{ error:"Backend not reachable. Run python app.py" } };
    }
  }

  function showPanel(){
    if (loginCard) loginCard.style.display = "none";
    if (panelCard) panelCard.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  }

  function showLogin(){
    if (panelCard) panelCard.style.display = "none";
    if (loginCard) loginCard.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "none";
  }

  // ---------------- LOGOUT (admin only) ----------------
  logoutBtn?.addEventListener("click", () => {
    clearAdminSession();
    showLogin();
    setLoginMsg("Admin logged out.", true);
  });

  // ---------------- ADMIN LOGIN (isolated) ----------------
  async function adminLogin(){
    setLoginMsg("");
    const email = String(emailEl?.value || "").trim().toLowerCase();
    const password = String(passEl?.value || "").trim();

    if (!email || !email.includes("@")) return setLoginMsg("Enter valid email.");
    if (!password) return setLoginMsg("Enter password.");

    loginBtn.disabled = true;
    loginBtn.textContent = "Checking...";

    try{
      // 1) login to get token
      const r = await postJSON(`${API()}/auth/login`, { email, password });
      if (!r.ok){
        setLoginMsg(r.status === 401 ? "Invalid credentials." : (r.data?.error || "Login failed."));
        return;
      }

      // 2) save ADMIN token in sessionStorage ONLY
      setAdminSession(r.data?.token, r.data?.user);

      // 3) verify admin access
      const v = await adminFetch("/admin/users");
      if (!v.ok){
        clearAdminSession();
        setLoginMsg(v.status === 403 ? "Admin only. This email is not in ADMIN_EMAILS." : (v.data?.error || "Admin verify failed."));
        return;
      }

      // ok
      setLoginMsg("Welcome admin ✅", true);
      showPanel();

      mode = "users";
      setActiveTab();
      rawRows = normalizeList(v.data);
      setStatus(`Users loaded: ${rawRows.length}`, true);
      render();

    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Enter Admin Panel";
    }
  }

  loginBtn?.addEventListener("click", adminLogin);
  passEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") adminLogin();
  });

  // ---------------- PANEL (USERS/CARDS) ----------------
  let mode = "users";
  let rawRows = [];

  function setActiveTab(){
    tabUsers?.classList.toggle("active", mode === "users");
    tabCards?.classList.toggle("active", mode === "cards");
  }

  tabUsers?.addEventListener("click", async () => {
    mode = "users";
    setActiveTab();
    await loadCurrent();
  });

  tabCards?.addEventListener("click", async () => {
    mode = "cards";
    setActiveTab();
    await loadCurrent();
  });

  refreshBtn?.addEventListener("click", loadCurrent);
  searchInput?.addEventListener("input", render);

  function matchesSearch(row, q){
    if (!q) return true;
    return JSON.stringify(row).toLowerCase().includes(q.toLowerCase());
  }

  async function loadCurrent(){
    showError("");
    setStatus("Loading...", true);

    if (!adminToken()){
      showLogin();
      setLoginMsg("Please login as admin.");
      return;
    }

    const path = mode === "users" ? "/admin/users" : "/admin/cards";
    const r = await adminFetch(path);

    if (!r.ok){
      showError(r.status === 403 ? "Admin only. Set ADMIN_EMAILS in backend." : (r.data?.error || "Failed to load."));
      setStatus("", false);
      rawRows = [];
      render();
      return;
    }

    rawRows = normalizeList(r.data);
    setStatus(`${mode === "users" ? "Users" : "Cards"} loaded: ${rawRows.length}`, true);
    render();
  }

  function render(){
    if (!tableHead || !tableBody) return;

    const q = String(searchInput?.value || "").trim();
    const rows = rawRows.filter(r => matchesSearch(r, q));

    if (mode === "users"){
      tableHead.innerHTML = `
        <tr>
          <th style="width:90px;">ID</th>
          <th style="width:240px;">NAME</th>
          <th>EMAIL</th>
          <th style="width:220px;">CREATED</th>
          <th style="width:160px; text-align:right;">ACTIONS</th>
        </tr>
      `;

      tableBody.innerHTML = rows.map(u => {
        const id = bestId(u);
        const name = bestUserName(u);
        const email = u?.email || "";
        const created = u?.created_at || u?.createdAt || u?.created || "";
        return `
          <tr>
            <td class="mono">${escapeHtml(id)}</td>
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(email)}</td>
            <td>${escapeHtml(created)}</td>
            <td>
              <div class="rowBtns">
                <button class="btn danger" data-action="delUser" data-id="${escapeHtml(id)}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    } else {
      tableHead.innerHTML = `
        <tr>
          <th style="width:220px;">ID</th>
          <th style="width:120px;">USER</th>
          <th>TITLE</th>
          <th style="width:140px;">THEME</th>
          <th style="width:220px;">UPDATED</th>
          <th style="width:160px; text-align:right;">ACTIONS</th>
        </tr>
      `;

      tableBody.innerHTML = rows.map(c => {
        const id = bestId(c);
        const userId = c?.user_id ?? c?.userId ?? c?.owner_id ?? c?.ownerId ?? "";
        const title = c?.title || "—";
        const theme = c?.theme || "—";
        const updated = c?.updated_at || c?.updatedAt || c?.created_at || c?.createdAt || "";
        return `
          <tr>
            <td class="mono">${escapeHtml(id)}</td>
            <td class="mono">${escapeHtml(userId)}</td>
            <td>${escapeHtml(title)}</td>
            <td><span class="badge">${escapeHtml(theme)}</span></td>
            <td>${escapeHtml(updated)}</td>
            <td>
              <div class="rowBtns">
                <button class="btn danger" data-action="delCard" data-id="${escapeHtml(id)}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }

    tableBody.querySelectorAll("button[data-action]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const action = btn.getAttribute("data-action");
        const id = btn.getAttribute("data-id");
        if (!id) return;

        if (!confirm("Are you sure?")) return;

        btn.disabled = true;
        const old = btn.textContent;
        btn.textContent = "Deleting...";

        try{
          if (action === "delUser"){
            const r = await adminFetch("/admin/delete_user", {
              method:"POST",
              body: JSON.stringify({ id: Number(id) })
            });
            if (!r.ok) { showError(r.data?.error || "Delete failed"); return; }
            await loadCurrent();
          }

          if (action === "delCard"){
            const r = await adminFetch("/admin/delete_card", {
              method:"POST",
              body: JSON.stringify({ id })
            });
            if (!r.ok) { showError(r.data?.error || "Delete failed"); return; }
            await loadCurrent();
          }
        } finally {
          btn.disabled = false;
          btn.textContent = old || "Delete";
        }
      });
    });
  }

  // ---------------- AUTO OPEN PANEL IF ADMIN SESSION EXISTS ----------------
  (async () => {
    if (adminToken()){
      const v = await adminFetch("/admin/users");
      if (v.ok){
        showPanel();
        mode = "users";
        setActiveTab();
        rawRows = normalizeList(v.data);
        setStatus(`Users loaded: ${rawRows.length}`, true);
        render();
        return;
      }
      clearAdminSession();
    }
    showLogin();
  })();
});
