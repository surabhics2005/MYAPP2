// login.js — Login/Register page logic (login.html)
// Backend:
// POST /auth/login    {email,password} -> {token,user}
// POST /auth/register {name,email,password} -> {token,user}

document.addEventListener("DOMContentLoaded", () => {
  const nameEl = document.getElementById("authName");
  const emailEl = document.getElementById("authEmail");
  const passEl = document.getElementById("authPass");
  const msgEl = document.getElementById("authMsg");
  const loginBtn = document.getElementById("loginBtn");
  const registerBtn = document.getElementById("registerBtn");

  function API() {
    return (localStorage.getItem("mycard_api_base") || "http://127.0.0.1:5000").replace(/\/+$/, "");
  }

  function setMsg(text, ok = false) {
    if (!msgEl) return;
    msgEl.textContent = text || "";
    msgEl.style.color = ok ? "var(--ok)" : "var(--err)";
  }

  function validEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim());
  }

  async function postJSON(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  // ✅ Clears old pre-scope keys so another user's drafts won't appear
  function clearLegacyGlobalCardKeysOnce() {
    // If you previously stored cards globally, remove them once after login
    // (new storage.js uses user-scoped keys, so these are not needed anymore)
    try {
      localStorage.removeItem("mycard_cards_v1");
      localStorage.removeItem("mycard_active_id_v1");
      localStorage.removeItem("mycard_deleted_ids_v1");
      localStorage.removeItem("mycard_session_v1");
    } catch (_) {}
  }

  function saveSession(token, user) {
    const t = String(token || "").trim();
    if (t) localStorage.setItem("mycard_token", t);

    // IMPORTANT: save user first (scope depends on it)
    localStorage.setItem("mycard_user", JSON.stringify(user || {}));

    // Optional: if storage.js has Storage.login, call it AFTER user is stored
    try {
      if (typeof window.Storage?.login === "function") {
        window.Storage.login(user?.email || "");
      }
    } catch (_) {}
  }

  function goDashboard() {
    // Strong redirect (avoids back-button returning to login)
    window.location.replace("dashboard.html");
  }

  async function doLogin() {
    setMsg("");

    const email = String(emailEl?.value || "").trim().toLowerCase();
    const password = String(passEl?.value || "").trim();

    if (!validEmail(email)) return setMsg("Enter a valid email.");
    if (!password) return setMsg("Password is required.");

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = "Logging in...";
    }

    try {
      const { ok, status, data } = await postJSON(`${API()}/auth/login`, { email, password });

      if (!ok) {
        if (status === 401) return setMsg("Invalid credentials.");
        return setMsg(data?.error || "Login failed.");
      }

      if (!data?.token) return setMsg("Backend response missing token.");

      // ✅ stop cross-user mixing from old storage version
      clearLegacyGlobalCardKeysOnce();

      saveSession(data.token, data.user);

      setMsg("Login success ✅", true);

      // Optional: sync cards for this user after login
      try {
        await window.Storage?.syncNow?.();
      } catch (_) {}

      goDashboard();
    } catch (e) {
      setMsg("Backend not running / API not reachable.");
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = "Login";
      }
    }
  }

  async function doRegister() {
    setMsg("");

    const name = String(nameEl?.value || "").trim();
    const email = String(emailEl?.value || "").trim().toLowerCase();
    const password = String(passEl?.value || "").trim();

    if (!name) return setMsg("Name is required for Sign up.");
    if (!validEmail(email)) return setMsg("Enter a valid email.");
    if (!password) return setMsg("Password is required.");

    if (registerBtn) {
      registerBtn.disabled = true;
      registerBtn.textContent = "Creating...";
    }

    try {
      const { ok, status, data } = await postJSON(`${API()}/auth/register`, {
        name,
        email,
        password,
      });

      if (!ok) {
        if (status === 409) return setMsg("This email is already registered.");
        return setMsg(data?.error || "Register failed.");
      }

      if (!data?.token) return setMsg("Backend response missing token.");

      // ✅ stop cross-user mixing from old storage version
      clearLegacyGlobalCardKeysOnce();

      saveSession(data.token, data.user);

      setMsg("Account created ✅", true);

      // Optional: new user has no cards; ensure local empty scope is ready
      try {
        await window.Storage?.syncNow?.();
      } catch (_) {}

      goDashboard();
    } catch (e) {
      setMsg("Backend not running / API not reachable.");
    } finally {
      if (registerBtn) {
        registerBtn.disabled = false;
        registerBtn.textContent = "Sign up (Create Account)";
      }
    }
  }

  loginBtn?.addEventListener("click", doLogin);
  registerBtn?.addEventListener("click", doRegister);

  passEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") doLogin();
  });
});
