import { db } from "./db.js";
import { icon } from "./icons.js";
import { todayStr } from "./utils.js";

export function applySettings(settings){
  const s = settings || db.settings();
  const html = document.documentElement;
  html.setAttribute("data-theme", s.theme || "system");
  html.setAttribute("data-accent", s.accent || "teal");
  html.setAttribute("data-fontsize", s.fontSize || "medium");
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta){
    const resolvedDark = s.theme === "dark" || (s.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    meta.setAttribute("content", resolvedDark ? "#0F1417" : "#FAFAF8");
  }
}

let toastTimer = null;
export function showToast(msg){
  let el = document.getElementById("toast");
  if(!el){
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>el.classList.remove("is-visible"), 2200);
}

export function openSheet(innerHTML, { onMount } = {}){
  closeSheet();
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  scrim.id = "activeSheet";
  scrim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet__handle"></div>${innerHTML}</div>`;
  scrim.addEventListener("click", (e)=>{ if(e.target === scrim) closeSheet(); });
  document.body.appendChild(scrim);
  const sheet = scrim.querySelector(".sheet");
  sheet.querySelectorAll("[data-close-sheet]").forEach(b=>b.addEventListener("click", closeSheet));
  if(onMount) onMount(sheet);
  return sheet;
}
export function closeSheet(){
  const el = document.getElementById("activeSheet");
  if(el) el.remove();
}

export function confirmDialog(message, { confirmLabel = "Confirm", danger = true } = {}){
  return new Promise((resolve)=>{
    const sheet = openSheet(`
      <div class="sheet__head"><h2>Please confirm</h2></div>
      <p class="muted" style="font-size:.88rem;margin-bottom:18px;">${message}</p>
      <div class="field-row">
        <button class="btn btn-block" data-close-sheet type="button">Cancel</button>
        <button class="btn btn-block ${danger?'btn-danger':'btn-primary'}" id="confirmYes" type="button">${confirmLabel}</button>
      </div>
    `);
    sheet.querySelector("#confirmYes").addEventListener("click", ()=>{ closeSheet(); resolve(true); });
    sheet.querySelectorAll("[data-close-sheet]").forEach(b=>b.addEventListener("click", ()=>resolve(false)));
  });
}

export function trendArrowHTML(direction){
  const cls = direction === "up" ? "up" : direction === "down" ? "down" : "flat";
  const name = direction === "up" ? "up" : direction === "down" ? "down" : "flat";
  return `<span class="trend-arrow ${cls}">${icon(name)}</span>`;
}

export function dateNavHTML(label, isToday){
  return `
    <div class="field-row" style="align-items:center;margin-bottom:16px;">
      <button class="btn btn-icon" id="dateNavPrev" type="button" aria-label="Previous day" style="transform:scaleX(-1)">${icon("chevronRight")}</button>
      <button class="btn" id="dateNavLabel" type="button" style="flex:1 1 auto;justify-content:center;gap:7px;">${icon("calendar")}${label}</button>
      <button class="btn btn-icon" id="dateNavNext" type="button" aria-label="Next day" ${isToday?"disabled":""}>${icon("chevronRight")}</button>
    </div>`;
}

// Opens a sheet with a native date picker so the user can jump straight to any
// date rather than stepping through prev/next one day at a time. onSelect
// receives the chosen date as "YYYY-MM-DD".
export function openDateJumpSheet(currentDateStr, onSelect){
  const sheet = openSheet(`
    <div class="sheet__head"><h2>Go to date</h2><button class="btn btn-icon" data-close-sheet aria-label="Close">${icon("close")}</button></div>
    <div class="field">
      <label for="jump-date">Date</label>
      <input id="jump-date" type="date" value="${currentDateStr}" max="${todayStr()}"/>
    </div>
    <button class="btn btn-primary btn-block" id="jump-go">Go to date</button>
  `);
  sheet.querySelector("#jump-go").addEventListener("click", ()=>{
    const val = sheet.querySelector("#jump-date").value;
    if(!val) return;
    closeSheet();
    onSelect(val);
  });
}

export function escapeHTML(str){
  return String(str ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}
