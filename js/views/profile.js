import { db } from "../db.js";
import { icon } from "../icons.js";
import { escapeHTML } from "../ui.js";
import { navigateTo } from "../nav.js";
import { convert, ACTIVITY_LABELS, fmt } from "../utils.js";

export function renderProfile(container){
  const p = db.profile();
  const units = db.settings().units;
  const initials = (p.name||"").trim().split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join("") || "—";

  container.innerHTML = `
    <div class="view-header">
      <h1>My Profile</h1>
      <p>A summary of what drives your calorie and macro targets.</p>
    </div>

    <div class="card" style="display:flex;align-items:center;gap:14px;">
      <div style="width:54px;height:54px;border-radius:50%;background:var(--accent-soft);color:var(--accent-strong);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;flex:0 0 auto;">${initials}</div>
      <div>
        <div style="font-weight:700;font-size:1.02rem;">${p.name ? escapeHTML(p.name) : "No name set"}</div>
        <div class="faint" style="font-size:.78rem;">${p.sex==="male"?"Male":"Female"}${p.age?` · ${p.age} yrs`:""}</div>
      </div>
    </div>

    <div class="section-label">Body &amp; goal</div>
    <div class="grid grid-2">
      <div class="stat-tile"><div class="stat-tile__label">${icon("ruler")}Height</div><div class="stat-tile__value tabular">${heightLabel(p.heightCm, units.height)}</div></div>
      <div class="stat-tile"><div class="stat-tile__label">${icon("scale")}Current weight</div><div class="stat-tile__value tabular">${p.currentWeightKg!=null?fmt(convert.weightToDisplay(p.currentWeightKg,units.weight),1):"—"}<small>${convert.weightUnitLabel(units.weight)}</small></div></div>
      <div class="stat-tile"><div class="stat-tile__label">${icon("target")}Target weight</div><div class="stat-tile__value tabular">${p.targetWeightKg!=null?fmt(convert.weightToDisplay(p.targetWeightKg,units.weight),1):"—"}<small>${convert.weightUnitLabel(units.weight)}</small></div></div>
      <div class="stat-tile"><div class="stat-tile__label">${icon("clock")}Timeline</div><div class="stat-tile__value tabular">${p.timelineWeeks||"—"}<small>weeks</small></div></div>
    </div>

    <div class="section-label">Activity &amp; goal type</div>
    <div class="card">
      <p style="font-size:.86rem;margin-bottom:6px;"><b>${ACTIVITY_LABELS[p.activityLevel]||"—"}</b></p>
      <p class="faint" style="font-size:.8rem;">Goal: ${goalLabel(p.goalType)}</p>
    </div>

    <button class="btn btn-primary btn-block" id="edit-profile" style="margin-top:16px;">Edit in Goals</button>
  `;

  container.querySelector("#edit-profile").addEventListener("click", ()=>navigateTo("goals"));
}

function heightLabel(cm, unit){
  if(cm==null) return "—";
  if(unit === "ftin"){
    const { ft, inch } = convert.cmToFtIn(cm);
    return `${ft}'${inch}"`;
  }
  return `${fmt(cm)} cm`;
}
function goalLabel(g){
  if(g==="lose") return "Lose weight";
  if(g==="gain") return "Gain weight";
  return "Maintain weight";
}
