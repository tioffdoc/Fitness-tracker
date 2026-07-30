import { db } from "../db.js";
import { showToast } from "../ui.js";
import { calcBMR, calcTDEE, calcCalorieTarget, convert, fmt, sum, todayStr } from "../utils.js";

export function renderCalorieMacro(container){
  const profile = db.profile();
  const macros = db.macros();
  const units = db.settings().units;

  const bmr = calcBMR(profile);
  const tdee = calcTDEE(bmr, profile.activityLevel);
  const suggested = calcCalorieTarget(tdee, profile.goalType);
  const calorieTarget = macros.method === "auto" && suggested!=null ? Math.round(suggested) : macros.calorieTarget;

  const proteinG = Math.round((calorieTarget * macros.proteinPct/100) / 4);
  const carbG = Math.round((calorieTarget * macros.carbPct/100) / 4);
  const fatG = Math.round((calorieTarget * macros.fatPct/100) / 9);
  const pctTotal = macros.proteinPct + macros.carbPct + macros.fatPct;

  const today = db.day(todayStr());
  const consumedKcal = sum(today.calorieEntries.map(e=>e.kcal));
  const consumedP = sum(today.calorieEntries.map(e=>e.protein));
  const consumedC = sum(today.calorieEntries.map(e=>e.carb));
  const consumedF = sum(today.calorieEntries.map(e=>e.fat));

  container.innerHTML = `
    <div class="view-header">
      <h1>Calorie &amp; Macro Engine</h1>
      <p>Mifflin-St Jeor BMR, activity-adjusted TDEE, and your macro split.</p>
    </div>

    <div class="card">
      <div class="field">
        <label>Target method</label>
        <div class="segmented" id="method-seg">
          <button type="button" data-val="auto" class="${macros.method==="auto"?"is-active":""}">Auto (from Goals)</button>
          <button type="button" data-val="manual" class="${macros.method==="manual"?"is-active":""}">Manual</button>
        </div>
      </div>

      ${bmr==null ? `<p class="field-hint" style="margin-bottom:10px;">Complete your age, height and weight in <b>Goals</b> to auto-calculate BMR/TDEE.</p>` : `
      <div class="grid grid-2" style="margin-bottom:14px;">
        <div class="stat-tile"><div class="stat-tile__label">BMR</div><div class="stat-tile__value tabular">${fmt(convert.energyToDisplay(bmr,units.energy))}<small>${convert.energyUnitLabel(units.energy)}/day</small></div></div>
        <div class="stat-tile"><div class="stat-tile__label">TDEE</div><div class="stat-tile__value tabular">${fmt(convert.energyToDisplay(tdee,units.energy))}<small>${convert.energyUnitLabel(units.energy)}/day</small></div></div>
      </div>`}

      <div class="field" id="target-field">
        <label for="f-target">Daily calorie target</label>
        <div class="unit-suffix">
          <input id="f-target" type="number" ${macros.method==="auto"?"disabled":""} value="${Math.round(convert.energyToDisplay(calorieTarget,units.energy))}" />
          <span>${convert.energyUnitLabel(units.energy)}</span>
        </div>
        ${macros.method==="auto"?`<div class="field-hint">Calculated from TDEE and your goal in Goals (±500 kcal).</div>`:""}
      </div>
    </div>

    <div class="section-label">Macro split</div>
    <div class="card">
      <div class="field-row">
        <div class="field"><label for="f-protein">Protein %</label><input id="f-protein" type="number" min="0" max="100" value="${macros.proteinPct}"/></div>
        <div class="field"><label for="f-carb">Carbs %</label><input id="f-carb" type="number" min="0" max="100" value="${macros.carbPct}"/></div>
        <div class="field"><label for="f-fat">Fat %</label><input id="f-fat" type="number" min="0" max="100" value="${macros.fatPct}"/></div>
      </div>
      <div class="field-hint" id="pct-hint" style="margin-bottom:10px;color:${pctTotal===100?"var(--text-faint)":"var(--trend-down)"}">Total: ${pctTotal}% ${pctTotal===100?"":"— will be normalized to 100% on save"}</div>
      <div class="grid grid-3">
        <div class="stat-tile"><div class="stat-tile__label">Protein</div><div class="stat-tile__value tabular">${proteinG}<small>g</small></div></div>
        <div class="stat-tile"><div class="stat-tile__label">Carbs</div><div class="stat-tile__value tabular">${carbG}<small>g</small></div></div>
        <div class="stat-tile"><div class="stat-tile__label">Fat</div><div class="stat-tile__value tabular">${fatG}<small>g</small></div></div>
      </div>
      <button class="btn btn-primary btn-block" id="save-macros" style="margin-top:14px;">Save</button>
    </div>

    <div class="section-label">Today so far</div>
    <div class="card">
      <div class="pbar-row">
        <div class="pbar-row__top"><span>Calories</span><b class="tabular">${fmt(convert.energyToDisplay(consumedKcal,units.energy))} / ${fmt(convert.energyToDisplay(calorieTarget,units.energy))} ${convert.energyUnitLabel(units.energy)}</b></div>
        <div class="pbar"><div class="pbar__fill" style="width:${pct(consumedKcal,calorieTarget)}%"></div></div>
      </div>
      <div class="pbar-row">
        <div class="pbar-row__top"><span>Protein</span><b class="tabular">${fmt(consumedP)} / ${proteinG} g</b></div>
        <div class="pbar"><div class="pbar__fill" style="width:${pct(consumedP,proteinG)}%"></div></div>
      </div>
      <div class="pbar-row">
        <div class="pbar-row__top"><span>Carbs</span><b class="tabular">${fmt(consumedC)} / ${carbG} g</b></div>
        <div class="pbar"><div class="pbar__fill" style="width:${pct(consumedC,carbG)}%"></div></div>
      </div>
      <div class="pbar-row" style="margin-bottom:0;">
        <div class="pbar-row__top"><span>Fat</span><b class="tabular">${fmt(consumedF)} / ${fatG} g</b></div>
        <div class="pbar"><div class="pbar__fill" style="width:${pct(consumedF,fatG)}%"></div></div>
      </div>
    </div>
  `;

  let method = macros.method;
  container.querySelector("#method-seg").addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-val]");
    if(!btn) return;
    method = btn.getAttribute("data-val");
    container.querySelectorAll("#method-seg button").forEach(b=>b.classList.toggle("is-active", b===btn));
    container.querySelector("#f-target").disabled = method === "auto";
  });

  container.querySelector("#save-macros").addEventListener("click", ()=>{
    let protein = Number(container.querySelector("#f-protein").value) || 0;
    let carb = Number(container.querySelector("#f-carb").value) || 0;
    let fat = Number(container.querySelector("#f-fat").value) || 0;
    const total = protein + carb + fat;
    if(total > 0 && total !== 100){
      protein = Math.round(protein / total * 100);
      carb = Math.round(carb / total * 100);
      fat = 100 - protein - carb;
    }
    const targetInputVal = Number(container.querySelector("#f-target").value) || 2000;
    const nextTarget = method === "auto" && suggested!=null ? Math.round(suggested) : Math.round(convert.energyToKcal(targetInputVal, units.energy));

    db.saveMacros({ method, calorieTarget: nextTarget, proteinPct: protein, carbPct: carb, fatPct: fat });
    showToast("Macro settings saved");
    renderCalorieMacro(container);
  });
}

function pct(val, target){
  if(!target) return 0;
  return Math.max(0, Math.min(100, Math.round((val/target)*100)));
}
