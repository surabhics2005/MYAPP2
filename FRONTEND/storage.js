// storage.js — FULL (USER-SCOPED LOCAL + BACKEND SYNC + DELETE TOMBSTONES)
// ✅ Prevents deleted cards reappearing after refresh (tombstones)
// ✅ Prevents one user's drafts showing in another account (user-scoped keys)
// ✅ Adds Storage.deleteCardNow(cardId) (tries backend delete)
// ✅ syncNow() will NOT resurrect deleted cards
//
// Endpoints used:
//   GET    /cards
//   POST   /cards/save
//   GET    /card/<id>        (public)
//   DELETE /cards/<id>       (optional)
//   POST   /cards/delete     (optional fallback)

(function () {
  // ---- GLOBAL KEYS (session/token/user are global) ----
  const TOKEN_KEY = "mycard_token";
  const USER_KEY = "mycard_user";
  const API_BASE_KEY = "mycard_api_base";

  // ---- USER-SCOPED KEY BASES ----
  const KEY_BASE = "mycard_cards_v1_";
  const ACTIVE_BASE = "mycard_active_id_v1_";
  const DELETED_BASE = "mycard_deleted_ids_v1_";

  // Optional: if you still use session()
  const SESSION_BASE = "mycard_session_v1_";

  // ----------------- helpers -----------------
  function safeJsonParse(raw, fallback) {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function apiBase() {
    return (localStorage.getItem(API_BASE_KEY) || "http://127.0.0.1:5000").replace(/\/+$/, "");
  }

  function getToken() {
    const t = localStorage.getItem(TOKEN_KEY) || "";
    const s = String(t).trim();
    if (!s || s === "null" || s === "undefined") return "";
    return s.replace(/^Bearer\s+/i, "");
  }

  function getUser() {
    return safeJsonParse(localStorage.getItem(USER_KEY) || "{}", {});
  }

  // ✅ THIS IS THE MAIN FIX: scope id per user
  function scopeId() {
    const u = getUser();
    if (u && (u.id === 0 || u.id)) return "uid_" + String(u.id);
    const email = String(u?.email || "").trim().toLowerCase();
    if (email) return "em_" + email.replace(/[^a-z0-9@._-]/g, "_");
    return "guest";
  }

  function K() {
    const s = scopeId();
    return {
      CARDS: KEY_BASE + s,
      ACTIVE: ACTIVE_BASE + s,
      DELETED: DELETED_BASE + s,
      SESSION: SESSION_BASE + s,
    };
  }

  function uid() {
    return "c_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function ensureShape(card) {
    card = card || {};
    card.id = String(card.id || "").trim() || uid();

    card.wizard = card.wizard || {};
    card.basic = card.basic || {};
    card.links =
      card.links || { website: "", whatsapp: "", instagram: "", facebook: "", telegram: "" };
    card.theme = card.theme || {};
    card.services = Array.isArray(card.services) ? card.services : [];
    card.description = card.description || "";
    card.status = card.status || "draft";
    if (!card.createdAt) card.createdAt = Date.now();

    if (!card.theme.baseColor) card.theme.baseColor = "#0f7f75";
    if (!card.theme.backgroundStyle) card.theme.backgroundStyle = "gradient";
    if (!card.theme.headerStyle) card.theme.headerStyle = "left";
    if (!card.theme.template) card.theme.template = "classic";

    return card;
  }

  // ----------------- local load/save (scoped) -----------------
  function loadCardsRaw() {
    try {
      const raw = localStorage.getItem(K().CARDS);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveCardsRaw(cards) {
    localStorage.setItem(K().CARDS, JSON.stringify(cards || []));
  }

  // ----------------- tombstones (scoped) -----------------
  function loadDeletedSet() {
    const raw = localStorage.getItem(K().DELETED);
    const arr = safeJsonParse(raw, []);
    const set = new Set(Array.isArray(arr) ? arr.map(String) : []);
    return set;
  }

  function saveDeletedSet(set) {
    try {
      localStorage.setItem(K().DELETED, JSON.stringify(Array.from(set)));
    } catch {}
  }

  function markDeleted(id) {
    const set = loadDeletedSet();
    set.add(String(id));
    saveDeletedSet(set);
  }

  function unmarkDeleted(id) {
    const set = loadDeletedSet();
    set.delete(String(id));
    saveDeletedSet(set);
  }

  function isDeleted(id) {
    const set = loadDeletedSet();
    return set.has(String(id));
  }

  // ----------------- backend helpers -----------------
  async function fetchJSON(url, opts = {}) {
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  function mergeServerCardsIntoLocal(serverCards) {
    const deleted = loadDeletedSet();

    const local = loadCardsRaw().map(ensureShape).filter((c) => !deleted.has(String(c.id)));
    const map = new Map(local.map((c) => [String(c.id), c]));

    for (const s of serverCards || []) {
      const id = String(s?.id || "").trim();
      if (!id) continue;

      // ✅ Never resurrect deleted cards
      if (deleted.has(id)) continue;

      const dataObj = s.data || {};
      const merged = ensureShape({
        ...dataObj,
        id,
        status: dataObj.status || "draft",
      });

      map.set(id, merged);
    }

    const out = Array.from(map.values());
    out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    saveCardsRaw(out);
    return out;
  }

  // ----------------- Storage API -----------------
  window.Storage = {
    // config
    apiBase,
    setApiBase(url) {
      localStorage.setItem(API_BASE_KEY, String(url || "").trim());
    },

    // auth/session
    getToken,
    isLoggedIn() {
      return !!getToken();
    },
    session() {
      return safeJsonParse(localStorage.getItem(K().SESSION) || "null", null);
    },
    login(email) {
      // scope is based on mycard_user, so by the time you call this,
      // login.js should already store mycard_user. This just initializes.
      localStorage.setItem(K().SESSION, JSON.stringify({ email: String(email || ""), at: Date.now() }));

      // ensure scoped stores exist
      if (!localStorage.getItem(K().CARDS)) saveCardsRaw([]);
      if (!localStorage.getItem(K().ACTIVE)) localStorage.setItem(K().ACTIVE, "");
      if (!localStorage.getItem(K().DELETED)) localStorage.setItem(K().DELETED, "[]");
    },
    logout() {
      // only clears login identity, not other user data
      localStorage.removeItem(K().SESSION);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      // switch to guest scope automatically next page load
    },

    // cards local
    getCards() {
      const deleted = loadDeletedSet();
      return loadCardsRaw().map(ensureShape).filter((c) => !deleted.has(String(c.id)));
    },
    setCards(cards) {
      const deleted = loadDeletedSet();
      const safe = (cards || []).map(ensureShape).filter((c) => !deleted.has(String(c.id)));
      saveCardsRaw(safe);
    },
    setActiveId(id) {
      localStorage.setItem(K().ACTIVE, String(id || ""));
    },
    getActiveId() {
      return localStorage.getItem(K().ACTIVE) || "";
    },
    getActiveCard() {
      const id = this.getActiveId();
      if (!id || isDeleted(id)) return null;
      const cards = this.getCards();
      return cards.find((c) => String(c.id) === String(id)) || null;
    },

    // ✅ delete persists even after refresh + sync
    async removeCard(id) {
      const sid = String(id || "");
      if (!sid) return;

      // mark tombstone first (prevents resurrection)
      markDeleted(sid);

      // remove locally
      const cards = this.getCards().filter((c) => String(c.id) !== sid);
      saveCardsRaw(cards);

      if (String(this.getActiveId()) === sid) localStorage.setItem(K().ACTIVE, "");

      // try backend delete (optional)
      try {
        await this.deleteCardNow(sid);
      } catch {}
    },

    updateCard(id, updater) {
      const sid = String(id || "");
      if (!sid || isDeleted(sid)) return null;

      const cards = this.getCards();
      const idx = cards.findIndex((c) => String(c.id) === sid);
      if (idx < 0) return null;

      const copy = ensureShape(JSON.parse(JSON.stringify(cards[idx])));
      const updated = ensureShape((updater && updater(copy)) || copy);

      cards[idx] = updated;
      saveCardsRaw(cards);
      return updated;
    },

    // wizard draft creator (scoped)
    createDraftFromWizard(data) {
      const cards = this.getCards();

      const card = ensureShape({
        id: uid(),
        status: "draft",
        createdAt: Date.now(),
        wizard: {
          name: String(data?.name || "").trim(),
          jobTitle: String(data?.jobTitle || "").trim(),
          company: String(data?.company || "").trim(),
          email: String(data?.email || "").trim(),
          phone: String(data?.phone || "").trim(),
          location: String(data?.location || "").trim(),
        },
        basic: {
          displayName: String(data?.name || "").trim(),
          tagline: String(data?.jobTitle || "").trim(),
          company: String(data?.company || "").trim(),
          email: String(data?.email || "").trim(),
          phone: String(data?.phone || "").trim(),
          location: String(data?.location || "").trim(),
          bannerImage: "",
          profileImage: "",
        },
        links: { website: "", whatsapp: "", instagram: "", facebook: "", telegram: "" },
        theme: {
          baseColor: "#0f7f75",
          backgroundStyle: "gradient",
          headerStyle: "left",
          template: "classic",
        },
        services: [],
        description: "",
      });

      cards.unshift(card);
      saveCardsRaw(cards);
      this.setActiveId(card.id);

      // if it was previously deleted in THIS USER scope, unmark
      unmarkDeleted(card.id);

      return card;
    },

    // -------- BACKEND SYNC --------
    async syncNow() {
      const token = getToken();
      if (!token) return this.getCards();

      const { ok, data } = await fetchJSON(`${apiBase()}/cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!ok) return this.getCards();

      // backend payload could be array or object
      const list = Array.isArray(data) ? data : (data?.cards || data?.data || []);
      const merged = mergeServerCardsIntoLocal(list);

      // ensure active
      const active = this.getActiveId();
      if ((!active || isDeleted(active)) && merged.length) this.setActiveId(merged[0].id);

      return merged;
    },

    async pushCardNow(cardId) {
      const token = getToken();
      if (!token) return { ok: false, error: "No token" };

      const sid = String(cardId || "");
      if (!sid || isDeleted(sid)) return { ok: false, error: "Card deleted" };

      const card = this.getCards().find((c) => String(c.id) === sid);
      if (!card) return { ok: false, error: "Card not found" };

      const payload = {
        id: card.id,
        title: card.basic?.displayName || card.wizard?.name || "MYCARD",
        theme: card.theme?.template || "",
        data: card,
      };

      const { ok, status, data } = await fetchJSON(`${apiBase()}/cards/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      return { ok, status, data };
    },

    async pushActiveNow() {
      const a = this.getActiveId();
      if (!a) return { ok: false, error: "No active card" };
      return this.pushCardNow(a);
    },

    // optional backend delete
    async deleteCardNow(cardId) {
      const token = getToken();
      if (!token) return { ok: false, error: "No token" };

      const sid = String(cardId || "");
      if (!sid) return { ok: false, error: "No id" };

      // try DELETE /cards/<id>
      try {
        const res = await fetch(`${apiBase()}/cards/${encodeURIComponent(sid)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) return { ok: true, status: res.status, data: await res.json().catch(() => ({})) };
      } catch {}

      // fallback: POST /cards/delete
      try {
        const { ok, status, data } = await fetchJSON(`${apiBase()}/cards/delete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: sid }),
        });
        return { ok, status, data };
      } catch {
        return { ok: false, error: "Backend delete not available" };
      }
    },

    // public fetch (share)
    async fetchPublicCard(cardId) {
      const { ok, data } = await fetchJSON(`${apiBase()}/card/${encodeURIComponent(cardId)}`);
      return ok ? data : null;
    },
  };
})();
