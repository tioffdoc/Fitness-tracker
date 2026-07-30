import { db } from "../db.js";
import { icon } from "../icons.js";
import { showToast, dateNavHTML, confirmDialog } from "../ui.js";
import { renderChartCard } from "../charts.js";
import { todayStr, addDays, friendlyDate, shortDateLabel, lastNDates, convert, fmt, movingAverage } from "../utils.js";

let currentDate = todayStr();

export function renderWeightTracking(container){
  const units = db.settings().units;
  const day = db.day(currentDate);
  const isToday = currentDate === todayStr();
  const displayVal = convert.weightToDisplay(day.weightKg, units.weight);

  const range = lastNDates(30);
  const points = range.map(d=>{
    const dd = db.day(d);
    return { label: shortDateLabel(d), value: dd.weightKg==null?null:Math.round(convert.weightToDisplay(dd.weightKg,units.weight)*10)/10 };
  });
  const movAvg = movingAverage(points.map(p=>p.value), 7);
  const latest = [...points].reverse().find(p=>p.value!=null);

  const history = range.slice().reverse().filter(d=>db.day(d).weightKg!=null).slice(0,14);

  container.innerHTML = `
    <div class="view-header">
      <h1>Weight Tracking</h1>
      <p>Daily weigh-ins with a 7-day moving average.</p>
    </div>

    ${dateNavHTML(friendlyDate(currentDate), isToday)}
    <div class="card">
      <div class="field">
        <label for="f-weight">Weight for ${friendlyDate(currentDate)}</label>
        <div class="unit-suffix"><input id="f-weight" type="number" step="0.1" value="${displayVal ?? ""}" placeholder="Enter weight"/><span>${convert.weightUnitLabel(units.weight)}</span></div>
      </div>
      <button class="btn btn-primary btn-block" id="save-weight">Save</button>
    </div>

    <div class="section-label">30-day trend</div>
    ${renderChartCard({ title: "Weight", points, latestLabel: latest?`${fmt(latest.value,1)} ${convert.weightUnitLabel(units.weight)}`:"", showMovingAvg: movAvg })}
    <p class="faint" style="font-size:.72rem;margin:8px 4px 0;">Dashed line = 7-day moving average</p>

    <div class="section-label">Recent entries</div>
    <div class="card" style="padding:4px 14px;">
      ${history.length===0 ? `<div class="empty-state">${icon("scale")}<p>No entries yet</p></div>` : history.map(d=>{
        const dd = db.day(d);
        const v = convert.weightToDisplay(dd.weightKg, units.weight);
        return `
        <div class="list-row">
          <div class="list-row__icon">${icon("scale")}</div>
          <div class="list-row__body"><div class="list-row__title">${friendlyDate(d)}</div></div>
          <div class="list-row__value tabular">${fmt(v,1)} ${convert.weightUnitLabel(units.weight)}</div>
          <button class="list-row__del" data-del="${d}" aria-label="Delete entry">${icon("trash")}</button>
        </div>`;
      }).join("")}
    </div>
  `;

  container.querySelector("#dateNavPrev").addEventListener("click", ()=>{ currentDate = addDays(currentDate,-1); renderWeightTracking(container); });
  const nextBtn = container.querySelector("#dateNavNext");
  if(nextBtn) nextBtn.addEventListener("click", ()=>{ if(currentDate!==todayStr()){ currentDate = addDays(currentDate,1); renderWeightTracking(container); } });

  container.querySelector("#save-weight").addEventListener("click", ()=>{
    const val = container.querySelector("#f-weight").value;
    const d = db.day(currentDate);
    d.weightKg = val==="" ? null : convert.weightToKg(Number(val), units.weight);
    db.saveDay(currentDate, d);
    showToast("Weight saved");
    renderWeightTracking(container);
  });

  container.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const ok = await confirmDialog("Delete this weight entry?");
      if(!ok) return;
      const dateStr = btn.getAttribute("data-del");
      const d = db.day(dateStr);
      d.weightKg = null;
      db.saveDay(dateStr, d);
      renderWeightTracking(container);
    });
  });
}
