// contacts-store.js (NEW)
// Separate storage so we do NOT change your storage.js card logic.

(function(){
  const KEY = "mycard_contacts_v1";

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function save(arr){
    localStorage.setItem(KEY, JSON.stringify(arr));
  }

  function uid(){
    return "ct_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  window.ContactsStore = {
    getAll(){
      return load();
    },
    add(contact){
      const all = load();
      const item = {
        id: uid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        name: String(contact?.name||"").trim(),
        title: String(contact?.title||"").trim(),
        company: String(contact?.company||"").trim(),
        email: String(contact?.email||"").trim(),
        mobile: String(contact?.mobile||"").trim(),
        location: String(contact?.location||"").trim(),
      };
      all.unshift(item);
      save(all);
      return item;
    },
    update(id, patch){
      const all = load();
      const idx = all.findIndex(x => x.id === id);
      if (idx < 0) return null;

      const next = {
        ...all[idx],
        ...patch,
        updatedAt: Date.now(),
      };
      all[idx] = next;
      save(all);
      return next;
    },
    remove(id){
      const all = load().filter(x => x.id !== id);
      save(all);
    }
  };
})();
