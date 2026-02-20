window.MyCard = {
  escapeHtml(str){
    const s = String(str ?? "");
    return s.replace(/[&<>"']/g, (m) => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
    }[m]));
  },

  normalizeUrl(raw){
    const v = String(raw||"").trim();
    if (!v) return "";
    if (/^https?:\/\//i.test(v)) return v;
    return "https://" + v;
  }
};


/* =====================================================
   SAFE EXTENSION — DOES NOT BREAK EXISTING DASHBOARD
   Adds WhatsApp + universal share everywhere
===================================================== */

(function(){
  function attachShare(){
    if (!window.MyCard) return;

    // if already added → skip
    if (window.MyCard.share) return;

    window.MyCard.share = {

      // System share (Android share sheet)
      async link({ title="MYCARD", text="", url="" } = {}) {
        try {
          if (navigator.share) {
            await navigator.share({ title, text, url });
            return true;
          }
        } catch(e){}

        // fallback copy
        try {
          await navigator.clipboard.writeText(url);
          alert("Link copied to clipboard");
        } catch {
          prompt("Copy this link:", url);
        }
        return false;
      },

      // WhatsApp share (ALWAYS WORKS)
      whatsapp({ text="", url="" } = {}) {
        const msg = `${text}${url ? "\n" + url : ""}`.trim();
        const wa = "https://wa.me/?text=" + encodeURIComponent(msg);
        window.open(wa, "_blank", "noopener,noreferrer");
      },

      // Share image / jpg card
      async file(file, { title="MYCARD", text="" } = {}) {
        if (!file) return false;

        try {
          if (navigator.canShare && navigator.canShare({ files:[file] }) && navigator.share) {
            await navigator.share({
              title,
              text,
              files:[file]
            });
            return true;
          }
        } catch(e){}

        return false;
      }

    };
  }

  // wait until page ready so we don't break dashboard
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", attachShare);
  else
    attachShare();

})();
