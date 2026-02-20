document.addEventListener("DOMContentLoaded", () => {
  const step1 = document.getElementById("step1");
  const step2 = document.getElementById("step2");
  const step3 = document.getElementById("step3");

  const pill1 = document.getElementById("pill1");
  const pill2 = document.getElementById("pill2");
  const pill3 = document.getElementById("pill3");

  const name = document.getElementById("name");
  const jobTitle = document.getElementById("jobTitle");
  const company = document.getElementById("company");
  const email = document.getElementById("email");
  const phone = document.getElementById("phone");
  const locationEl = document.getElementById("location");

  const errName = document.getElementById("errName");
  const errJobTitle = document.getElementById("errJobTitle");
  const errCompany = document.getElementById("errCompany");
  const errEmail = document.getElementById("errEmail");
  const errPhone = document.getElementById("errPhone");
  const errLocation = document.getElementById("errLocation");

  const backBtn = document.getElementById("backBtn");

  let currentStep = 1;

  function setStep(n){
    currentStep = n;
    step1.classList.toggle("step--active", n === 1);
    step2.classList.toggle("step--active", n === 2);
    step3.classList.toggle("step--active", n === 3);

    pill1.className = "pill " + (n === 1 ? "pill--active" : (n > 1 ? "pill--done" : ""));
    pill2.className = "pill " + (n === 2 ? "pill--active" : (n > 2 ? "pill--done" : ""));
    pill3.className = "pill " + (n === 3 ? "pill--active" : "");
  }

  function clearErrors(){
    errName.textContent = "";
    errJobTitle.textContent = "";
    errCompany.textContent = "";
    errEmail.textContent = "";
    errPhone.textContent = "";
    errLocation.textContent = "";
  }

  function isEmailValid(v){
    const s = String(v||"").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  }

  function isPhoneValid(v){
    const s = String(v||"").trim();
    const digits = s.replace(/\D/g,"");
    return digits.length >= 8 && digits.length <= 15;
  }

  function req(val){ return String(val||"").trim().length > 0; }

  document.getElementById("continue1")?.addEventListener("click", () => {
    clearErrors();
    if (!req(name.value)) {
      errName.textContent = "Please enter your name.";
      return;
    }
    setStep(2);
  });

  document.getElementById("back2")?.addEventListener("click", () => setStep(1));
  document.getElementById("continue2")?.addEventListener("click", () => {
    clearErrors();
    if (!req(jobTitle.value)) { errJobTitle.textContent = "Please enter job title."; return; }
    if (!req(company.value)) { errCompany.textContent = "Please enter company."; return; }
    setStep(3);
  });

  document.getElementById("back3")?.addEventListener("click", () => setStep(2));

  document.getElementById("finish")?.addEventListener("click", async () => {
    clearErrors();

    if (!isEmailValid(email.value)) { errEmail.textContent = "Enter a valid email (example@domain.com)."; return; }
    if (!isPhoneValid(phone.value)) { errPhone.textContent = "Enter a valid phone number (8-15 digits)."; return; }
    if (!req(locationEl.value)) { errLocation.textContent = "Please enter location."; return; }

    const data = {
      name: name.value,
      jobTitle: jobTitle.value,
      company: company.value,
      email: email.value,
      phone: phone.value,
      location: locationEl.value
    };

    try {
      const newCard = Storage.createDraftFromWizard(data);

      // ✅ PUSH TO BACKEND so it becomes ONLINE immediately
      if (typeof Storage.pushCardNow === "function") {
        const r = await Storage.pushCardNow(newCard.id);
        if (!r?.ok) {
          alert("Card created locally, but failed to save online. Check backend is running.");
        }
      }

      location.href = "dashboard.html";
    } catch (e) {
      alert(e?.message || "Failed to create card.");
    }
  });

  backBtn?.addEventListener("click", () => {
    if (currentStep === 1) location.href = "index.html";
    else setStep(currentStep - 1);
  });

  setStep(1);
});
