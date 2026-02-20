document.addEventListener("DOMContentLoaded", () => {
  // Sidebar elements (must exist in page HTML)
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sideOverlay");
  const menuBtn = document.getElementById("menuBtn");
  const closeBtn = document.getElementById("closeMenu");

  function openMenu(){
    if (!sidebar || !overlay) return;
    sidebar.classList.add("open");
    overlay.classList.add("show");
    sidebar.setAttribute("aria-hidden", "false");
    overlay.setAttribute("aria-hidden", "false");
  }
  function closeMenu(){
    if (!sidebar || !overlay) return;
    sidebar.classList.remove("open");
    overlay.classList.remove("show");
    sidebar.setAttribute("aria-hidden", "true");
    overlay.setAttribute("aria-hidden", "true");
  }

  menuBtn?.addEventListener("click", openMenu);
  closeBtn?.addEventListener("click", closeMenu);
  overlay?.addEventListener("click", closeMenu);

  // Fill sidebar user info
  try{
    const active = Storage.getActiveCard();
    const session = Storage.session?.();

    const name = active?.basic?.displayName || active?.wizard?.name || "MYCARD";
    const email = active?.basic?.email || active?.wizard?.email || session?.email || "Welcome";

    const avatar = document.getElementById("avatar");
    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");

    if (avatar) avatar.textContent = (name || "M").trim().slice(0,1).toUpperCase();
    if (userName) userName.textContent = name;
    if (userEmail) userEmail.textContent = email;
  }catch{}

  // Highlight active menu item automatically
  try{
    const page = (location.pathname.split("/").pop() || "").toLowerCase();
    document.querySelectorAll(".menu a.menuItem").forEach(a => {
      const href = (a.getAttribute("href") || "").toLowerCase();
      a.classList.toggle("active", href === page);
    });
  }catch{}

  // Logout
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    try { Storage.logout(); } catch {}
    location.href = "index.html";
  });
});
