import { db } from "../db.js";
import { showToast, dateNavHTML, confirmDialog, openDateJumpSheet } from "../ui.js";
import { todayStr, addDays, dateNavLabel, fmt } from "../utils.js";

let currentDate = todayStr();

const NUTRIENTS = [
  { key: "fiberG", label: "Fiber", unit: "g" },
  { key: "sodiumMg", label: "Sodium", unit: "mg" },
  { key: "calciumMg", label: "Calcium", unit: "mg" },
  { key: "ironMg", label: "Iron", unit: "mg" },
  { key: "vitaminCMg", label: "Vitamin C", unit: "mg" },
  { key: "vitaminDMcg", label: "Vitamin D", unit: "mcg" },
];

export function renderMicronutrients(container){
  const day = db.day(currentDate);
  const targets = db.microTargets();
  const isToday = currentDate === todayStr();
  const dateFormat = db.settings().dateFormat;

  container.innerHTML = `
    <div class="view-header">
      <h1>Micronutrients</h1>
      <p>Track intake against your daily targets.</p>
    </div>
    ${dateNavHTML(dateNavLabel(currentDate, dateFormat), isToday)}

    <div class="card">
      ${NUTRIENTS.map(n=>{
        const val = day.micronutrients[n.key] || 0;
        const target = targets[n.key] || 1;
        const pct = Math.max(0, Math.min(100, Math.round((val/target)*100)));
        return `
        <div class="pbar-row">
          <div class="pbar-row__top"><span>${n.label}</span><b class="tabular">${fmt(val,1)} / ${fmt(target,1)} ${n.unit}</b></div>
          <div class="pbar"><div class="pbar__fill" style="width:${pct}%"></div></div>
        </div>`;
      }).join("")}
      <p class="section-label" style="margin-top:18px;">Log today's intake</p>
      <div class="grid grid-2">
        ${NUTRIENTS.map(n=>`
          <div class="field" style="margin-bottom:8px;">
            <label for="n-${n.key}">${n.label} (${n.unit})</label>
            <input id="n-${n.key}" type="number" min="0" step="0.1" value="${day.micronutrients[n.key] ?? ""}"/>
          </div>`).join("")}
      </div>
      <div class="field-row">
        <button class="btn btn-primary btn-block" id="save-micro" style="margin-top:6px;">Save intake</button>
        <button class="btn btn-block" id="clear-micro" type="button" style="margin-top:6px;flex:0 0 auto;">Clear</button>
      </div>
    </div>

    <div class="section-label">Daily targets</div>
    <div class="card">
      <div class="grid grid-2">
        ${NUTRIENTS.map(n=>`
          <div class="field" style="margin-bottom:8px;">
            <label for="t-${n.key}">${n.label} (${n.unit})</label>
            <input id="t-${n.key}" type="number" min="0" step="0.1" value="${targets[n.key] ?? ""}"/>
          </div>`).join("")}
      </div>
      <button class="btn btn-block" id="save-targets" style="margin-top:6px;">Update targets</button>
    </div>
  `;

  container.querySelector("#dateNavPrev").addEventListener("click", ()=>{ currentDate = addDays(currentDate,-1); renderMicronutrients(container); });
  const nextBtn = container.querySelector("#dateNavNext");
  if(nextBtn) nextBtn.addEventListener("click", ()=>{ if(currentDate!==todayStr()){ currentDate = addDays(currentDate,1); renderMicronutrients(container); } });
  container.querySelector("#dateNavLabel").addEventListener("click", ()=>{
    openDateJumpSheet(currentDate, (newDate)=>{ currentDate = newDate; renderMicronutrients(container); });
  });

  container.querySelector("#save-micro").addEventListener("click", ()=>{
    const d = db.day(currentDate);
    NUTRIENTS.forEach(n=>{
      const v = container.querySelector("#n-"+n.key).value;
      d.micronutrients[n.key] = v==="" ? 0 : Number(v);
    });
    db.saveDay(currentDate, d);
    showToast("Intake saved");
    renderMicronutrients(container);
  });

  container.querySelector("#clear-micro").addEventListener("click", async ()=>{
    const ok = await confirmDialog("Clear all logged micronutrient intake for this day?");
    if(!ok) return;
    const d = db.day(currentDate);
    NUTRIENTS.forEach(n=>{ d.micronutrients[n.key] = 0; });
    db.saveDay(currentDate, d);
    showToast("Cleared");
    renderMicronutrients(container);
  });

  container.querySelector("#save-targets").addEventListener("click", ()=>{
    const t = db.microTargets();
    NUTRIENTS.forEach(n=>{
      const v = container.querySelector("#t-"+n.key).value;
      t[n.key] = v==="" ? t[n.key] : Number(v);
    });
    db.saveMicroTargets(t);
    showToast("Targets updated");
    renderMicronutrients(container);
  });
}
