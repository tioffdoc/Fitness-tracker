import { db, uid } from "../db.js";
import { icon } from "../icons.js";
import { showToast, dateNavHTML } from "../ui.js";
import { todayStr, addDays, friendlyDate, convert, fmt } from "../utils.js";

let currentDate = todayStr();
const QUICK_ML = [150, 250, 350, 500];

export function renderWater(container){
  const settings = db.settings();
  const units = settings.units;
  const day = db.day(currentDate);
  const isToday = currentDate === todayStr();
  const goal = settings.waterGoalMl || 2000;
  const pct = Math.max(0, Math.min(100, Math.round((day.waterMl/goal)*100)));

  container.innerHTML = `
    <div class="view-header">
      <h1>Water Intake</h1>
      <p>Quick-log your hydration through the day.</p>
    </div>
    ${dateNavHTML(friendlyDate(currentDate), isToday)}

    <div class="card">
      <div class="pbar-row" style="margin-bottom:6px;">
        <div class="pbar-row__top"><span>Today's intake</span><b class="tabular">${fmt(convert.volumeToDisplay(day.waterMl,units.water))} / ${fmt(convert.volumeToDisplay(goal,units.water))} ${convert.volumeUnitLabel(units.water)}</b></div>
        <div class="pbar"><div class="pbar__fill" style="width:${pct}%"></div></div>
      </div>
      <div class="quickadd-row" style="margin-top:14px;margin-bottom:4px;">
        ${QUICK_ML.map(ml=>`<button type="button" data-add="${ml}">+${fmt(convert.volumeToDisplay(ml,units.water))} ${convert.volumeUnitLabel(units.water)}</button>`).join("")}
      </div>
      <div class="field-row" style="margin-top:10px;">
        <div class="field" style="margin-bottom:0;">
          <div class="unit-suffix"><input id="f-custom" type="number" min="0" placeholder="Custom amount"/><span>${convert.volumeUnitLabel(units.water)}</span></div>
        </div>
        <button class="btn btn-primary" id="add-custom" type="button" style="flex:0 0 auto;">Add</button>
      </div>
    </div>

    <div class="section-label">Daily goal</div>
    <div class="card">
      <div class="unit-suffix"><input id="f-goal" type="number" min="0" value="${fmt(convert.volumeToDisplay(goal,units.water))}"/><span>${convert.volumeUnitLabel(units.water)}</span></div>
      <button class="btn btn-block" id="save-goal" style="margin-top:10px;">Update goal</button>
    </div>

    <div class="section-label">Log</div>
    <div class="card" style="padding:4px 14px;">
      ${day.waterEntries.length===0 ? `<div class="empty-state">${icon("droplet")}<p>No entries yet</p></div>` : day.waterEntries.slice().reverse().map(e=>`
        <div class="list-row">
          <div class="list-row__icon">${icon("droplet")}</div>
          <div class="list-row__body"><div class="list-row__title">${fmt(convert.volumeToDisplay(e.ml,units.water))} ${convert.volumeUnitLabel(units.water)}</div><div class="list-row__meta">${new Date(e.time).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"})}</div></div>
          <button class="list-row__del" data-del="${e.id}" aria-label="Delete entry">${icon("trash")}</button>
        </div>`).join("")}
    </div>
  `;

  container.querySelector("#dateNavPrev").addEventListener("click", ()=>{ currentDate = addDays(currentDate,-1); renderWater(container); });
  const nextBtn = container.querySelector("#dateNavNext");
  if(nextBtn) nextBtn.addEventListener("click", ()=>{ if(currentDate!==todayStr()){ currentDate = addDays(currentDate,1); renderWater(container); } });

  function addWater(ml){
    if(!ml) return;
    const d = db.day(currentDate);
    d.waterEntries.push({ id: uid(), ml, time: new Date().toISOString() });
    d.waterMl = (d.waterMl||0) + ml;
    db.saveDay(currentDate, d);
    renderWater(container);
  }

  container.querySelectorAll("[data-add]").forEach(btn=>{
    btn.addEventListener("click", ()=>addWater(Number(btn.getAttribute("data-add"))));
  });
  container.querySelector("#add-custom").addEventListener("click", ()=>{
    const val = Number(container.querySelector("#f-custom").value);
    addWater(convert.volumeToMl(val, units.water));
  });

  container.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const d = db.day(currentDate);
      const entry = d.waterEntries.find(e=>e.id===btn.getAttribute("data-del"));
      if(entry) d.waterMl = Math.max(0, (d.waterMl||0) - entry.ml);
      d.waterEntries = d.waterEntries.filter(e=>e.id!==btn.getAttribute("data-del"));
      db.saveDay(currentDate, d);
      renderWater(container);
    });
  });

  container.querySelector("#save-goal").addEventListener("click", ()=>{
    const val = Number(container.querySelector("#f-goal").value) || 2000;
    const s = db.settings();
    s.waterGoalMl = convert.volumeToMl(val, units.water);
    db.saveSettings(s);
    showToast("Goal updated");
    renderWater(container);
  });
}
