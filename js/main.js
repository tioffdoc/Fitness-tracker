import { db } from "./db.js";
import { applySettings, showToast, confirmDialog } from "./ui.js";
import { icon, ICONS } from "./icons.js";
import { setNavigator, navigateTo } from "./nav.js";

import { renderHome } from "./views/home.js";
import { renderGoals } from "./views/goals.js";
import { renderCalorieMacro } from "./views/calorieMacro.js";
import { renderFoodLogging } from "./views/foodLogging.js";
import { renderWeightTracking } from "./views/weightTracking.js";
import { renderProgressViz } from "./views/progressViz.js";
import { renderActivity } from "./views/activity.js";
import { renderWater } from "./views/water.js";
import { renderMicronutrients } from "./views/micronutrients.js";
import { renderReminders } from "./views/reminders.js";
import { renderDataExport } from "./views/dataExport.js";
import { renderSettings } from "./views/settings.js";
import { renderProfile } from "./views/profile.js";

const SIDEBAR_ROUTES = [
  { id: "home", label: "Home", title: "Overview", icon: "pulse", render: renderHome },
  { id: "goals", label: "Goals", title: "Goals", icon: "target", render: renderGoals },
  { id: "calorie-macro", label: "Calorie & Macro", title: "Calorie & Macro Engine", icon: "flame", render: renderCalorieMacro },
  { id: "food-logging", label: "Food Logging", title: "Food Logging", icon: "fork", render: renderFoodLogging },
  { id: "weight", label: "Weight Tracking", title: "Weight Tracking", icon: "scale", render: renderWeightTracking },
  { id: "progress-viz", label: "Progress", title: "Progress Visualization", icon: "chart", render: renderProgressViz },
  { id: "activity", label: "Activity", title: "Activity & Exercise", icon: "run", render: renderActivity },
  { id: "water", label: "Water Intake", title: "Water Intake", icon: "droplet", render: renderWater },
  { id: "micronutrients", label: "Micronutrients", title: "Micronutrients", icon: "leaf", render: renderMicronutrients },
  { id: "reminders", label: "Reminders", title: "Reminders", icon: "bell", render: renderReminders },
  { id: "data-export", label: "Data Export", title: "Data Export", icon: "export", render: renderDataExport },
];
const EXTRA_ROUTES = [
  { id: "profile", title: "My Profile", render: renderProfile },
  { id: "settings", title: "Settings", render: renderSettings },
];
const ALL_ROUTES = SIDEBAR_ROUTES.concat(EXTRA_ROUTES);

const LOCK_KEY = "vitals-locked";

function boot(){
  applySettings(db.settings());
  registerServiceWorker();
  watchSystemTheme();
  if(sessionStorage.getItem(LOCK_KEY) === "1"){
    showLockScreen(startApp);
  } else {
    startApp();
  }
}

function watchSystemTheme(){
  if(!window.matchMedia) return;
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ()=>{
    const s = db.settings();
    if(s.theme === "system") applySettings(s);
  });
}

function registerServiceWorker(){
  if("serviceWorker" in navigator){
    window.addEventListener("load", ()=>{
      navigator.serviceWorker.register("sw.js").catch(()=>{});
    });
  }
}

function profileInitials(){
  const name = (db.profile().name || "").trim();
  if(!name) return icon("user");
  return name.split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("");
}

function buildShell(){
  document.getElementById("app").innerHTML = `
    <button class="sidebar-toggle" id="sidebarToggle" aria-label="Open menu">${icon("menu")}</button>
    <div class="sidebar-scrim" id="sidebarScrim"></div>
    <nav class="sidebar" id="sidebar">
      <button class="sidebar__brand" id="sidebarClose" aria-label="Close menu">${ICONS.pulse}</button>
      ${SIDEBAR_ROUTES.map(r=>`
        <button class="navicon" data-route="${r.id}" aria-label="${r.label}">
          ${icon(r.icon)}
          <span class="navicon__tooltip">${r.label}</span>
        </button>`).join("")}
    </nav>
    <div class="main-col">
      <div class="offline-banner" id="offlineBanner">You're offline — everything you log is still saved on this device.</div>
      <div class="topbar">
        <div>
          <span class="topbar__eyebrow">Vitals</span>
          <div class="topbar__title" id="topbarTitle">Overview</div>
        </div>
        <div style="position:relative;">
          <button class="profile-btn" id="profileBtn" aria-label="Profile menu">${profileInitials()}</button>
        </div>
      </div>
      <div class="view-outlet" id="viewOutlet"><div class="view is-active" id="viewContent"></div></div>
    </div>
  `;

  document.querySelectorAll(".navicon").forEach(btn=>{
    btn.addEventListener("click", ()=>{ navigateTo(btn.getAttribute("data-route")); closeSidebar(); });
  });
  wireSidebarToggle();
  wireProfilePopover();
  updateOfflineBanner();
  window.addEventListener("online", updateOfflineBanner);
  window.addEventListener("offline", updateOfflineBanner);
}

function openSidebar(){
  document.getElementById("sidebar").classList.add("is-open");
  document.getElementById("sidebarScrim").classList.add("is-visible");
  document.getElementById("sidebarToggle").classList.add("is-hidden");
}
function closeSidebar(){
  document.getElementById("sidebar").classList.remove("is-open");
  document.getElementById("sidebarScrim").classList.remove("is-visible");
  document.getElementById("sidebarToggle").classList.remove("is-hidden");
}
function wireSidebarToggle(){
  document.getElementById("sidebarToggle").addEventListener("click", openSidebar);
  document.getElementById("sidebarClose").addEventListener("click", closeSidebar);
  document.getElementById("sidebarScrim").addEventListener("click", closeSidebar);
}

function wireProfilePopover(){
  const btn = document.getElementById("profileBtn");
  const wrap = btn.parentElement;
  btn.addEventListener("click", (e)=>{
    e.stopPropagation();
    const existing = document.getElementById("profilePopover");
    if(existing){ existing.remove(); return; }
    const pop = document.createElement("div");
    pop.className = "popover";
    pop.id = "profilePopover";
    pop.innerHTML = `
      <button data-nav="profile">${icon("user")} My Profile</button>
      <button data-nav="settings">${icon("settings")} Settings</button>
      <hr/>
      <button class="danger" id="signOutBtn">${icon("logout")} Sign out</button>
    `;
    wrap.appendChild(pop);
    pop.querySelectorAll("[data-nav]").forEach(b=>{
      b.addEventListener("click", ()=>{ navigateTo(b.getAttribute("data-nav")); pop.remove(); });
    });
    pop.querySelector("#signOutBtn").addEventListener("click", async ()=>{
      pop.remove();
      const ok = await confirmDialog("Sign out of Vitals on this device? Your data stays saved locally.", { confirmLabel: "Sign out", danger: false });
      if(!ok) return;
      sessionStorage.setItem(LOCK_KEY, "1");
      showLockScreen(startApp);
    });
  });
  document.addEventListener("click", (e)=>{
    const pop = document.getElementById("profilePopover");
    if(pop && !pop.contains(e.target) && e.target !== btn) pop.remove();
  });
}

function activate(id){
  const route = ALL_ROUTES.find(r=>r.id===id) || SIDEBAR_ROUTES[0];
  document.querySelectorAll(".navicon").forEach(b=>b.classList.toggle("is-active", b.getAttribute("data-route")===route.id));
  const titleEl = document.getElementById("topbarTitle");
  if(titleEl) titleEl.textContent = route.title;
  const content = document.getElementById("viewContent");
  const outlet = document.getElementById("viewOutlet");
  if(outlet) outlet.scrollTop = 0;
  route.render(content);
  const pbtn = document.getElementById("profileBtn");
  if(pbtn) pbtn.innerHTML = profileInitials();
}

function updateOfflineBanner(){
  const el = document.getElementById("offlineBanner");
  if(el) el.classList.toggle("is-visible", !navigator.onLine);
}

function startApp(){
  buildShell();
  const initial = (location.hash || "#home").slice(1);
  activate(ALL_ROUTES.some(r=>r.id===initial) ? initial : "home");
  window.addEventListener("hashchange", ()=>{
    activate(location.hash.slice(1));
  });
  setNavigator((id)=>{
    if(location.hash.slice(1) === id) activate(id);
    else location.hash = id;
  });
  startReminderLoop();
}

function startReminderLoop(){
  checkReminders();
  setInterval(checkReminders, 30000);
}
function checkReminders(){
  if(!("Notification" in window) || Notification.permission !== "granted") return;
  const list = db.reminders();
  const now = new Date();
  const hhmm = String(now.getHours()).padStart(2,"0") + ":" + String(now.getMinutes()).padStart(2,"0");
  const todayKey = now.toISOString().slice(0,10);
  let changed = false;
  list.forEach(r=>{
    if(r.enabled && r.time === hhmm && r.lastFired !== todayKey){
      try{ new Notification("Vitals", { body: r.label, icon: "icons/icon-192.png" }); }catch(e){ /* ignore */ }
      r.lastFired = todayKey;
      changed = true;
    }
  });
  if(changed) db.saveReminders(list);
}

function showLockScreen(onUnlock){
  const s = db.settings();
  const usePasscode = s.passcode.enabled;
  document.getElementById("app").innerHTML = `
    <div style="height:100%;width:100%;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:24px;">
      <div class="card" style="max-width:320px;width:100%;text-align:center;">
        <div style="width:56px;height:56px;border-radius:14px;background:var(--accent);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;color:#fff;">${ICONS.pulse}</div>
        <h1 style="font-size:1.15rem;font-weight:700;margin-bottom:4px;">Welcome back</h1>
        <p class="faint" style="font-size:.82rem;margin-bottom:18px;">${usePasscode ? "Enter your passcode to continue." : "Tap continue to reopen Vitals."}</p>
        ${usePasscode ? `
          <input id="lock-code" type="password" inputmode="numeric" maxlength="4" placeholder="••••" style="text-align:center;letter-spacing:.5em;font-size:1.3rem;width:100%;background:var(--bg-sunken);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px;"/>
          <p id="lock-error" style="color:var(--trend-down);font-size:.78rem;min-height:16px;margin-bottom:2px;"></p>
        ` : ""}
        <button class="btn btn-primary btn-block" id="lock-continue" style="margin-top:10px;">${usePasscode ? "Unlock" : "Continue"}</button>
      </div>
    </div>
  `;
  const go = ()=>{
    const s2 = db.settings();
    if(s2.passcode.enabled){
      const val = document.getElementById("lock-code").value;
      if(val !== s2.passcode.code){
        document.getElementById("lock-error").textContent = "Incorrect passcode";
        return;
      }
    }
    sessionStorage.removeItem(LOCK_KEY);
    onUnlock();
  };
  document.getElementById("lock-continue").addEventListener("click", go);
  const codeInput = document.getElementById("lock-code");
  if(codeInput){
    codeInput.focus();
    codeInput.addEventListener("keydown", (e)=>{ if(e.key === "Enter") go(); });
  }
}

boot();
