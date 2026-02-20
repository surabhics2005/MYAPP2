document.addEventListener("DOMContentLoaded",()=>{

const btn=document.getElementById("loginBtn");
if(!btn) return;

btn.onclick=()=>{
 const e=document.getElementById("loginEmail").value.trim();
 const p=document.getElementById("loginPass").value.trim();
 if(!Storage.login(e,p)){alert("Enter email & password");return;}
 location.href="dashboard.html";
};

});
