import { db } from "../db.js";
import { showToast, escapeHTML } from "../ui.js";
import { convert, ACTIVITY_LABELS, fmt } from "../utils.js";

export function renderGoals(container){
  const p = db.profile();
  const units = db.settings().units;
  const heightFtIn = convert.cmToFtIn(p.heightCm);
  const wDisplay = convert.weightToDisplay(p.currentWeightKg, units.weight);
  const tDisplay = convert.weightToDisplay(p.targetWeightKg, units.weight);

  container.innerHTML = `
    <div class="view-header">
      <h1>Goals</h1>
      <p>Your profile drives the calorie &amp; macro engine, so keep it current.</p>
    </div>

    <div class="card">
      <div class="field">
        <label for="f-name">Name</label>
        <input id="f-name" type="text" value="${escapeHTML(p.name)}" placeholder="Your name" />
      </div>
      <div class="field-row">
        <div class="field">
          <label for="f-sex">Sex</label>
          <select id="f-sex">
            <option value="female" ${p.sex==="female"?"selected":""}>Female</option>
            <option value="male" ${p.sex==="male"?"selected":""}>Male</option>
          </select>
          <div class="field-hint">Used for the BMR formula only</div>
        </div>
        <div class="field">
          <label for="f-age">Age</label>
          <input id="f-age" type="number" min="10" max="100" value="${p.age ?? ""}" placeholder="Years" />
        </div>
      </div>

      <div class="field" id="height-field">
        <label>Height</label>
        ${units.height === "ftin" ? `
          <div class="field-row">
            <div class="unit-suffix"><input id="f-height-ft" type="number" min="0" max="8" value="${heightFtIn.ft ?? ""}" placeholder="Feet"/><span>ft</span></div>
            <div class="unit-suffix"><input id="f-height-in" type="number" min="0" max="11" value="${heightFtIn.inch ?? ""}" placeholder="Inches"/><span>in</span></div>
          </div>
        ` : `
          <div class="unit-suffix"><input id="f-height-cm" type="number" min="90" max="250" value="${p.heightCm ?? ""}" placeholder="Height"/><span>cm</span></div>
        `}
      </div>

      <div class="field-row">
        <div class="field">
          <label for="f-current-weight">Current weight</label>
          <div class="unit-suffix"><input id="f-current-weight" type="number" step="0.1" value="${wDisplay ?? ""}" placeholder="Weight"/><span>${convert.weightUnitLabel(units.weight)}</span></div>
        </div>
        <div class="field">
          <label for="f-target-weight">Target weight</label>
          <div class="unit-suffix"><input id="f-target-weight" type="number" step="0.1" value="${tDisplay ?? ""}" placeholder="Goal"/><span>${convert.weightUnitLabel(units.weight)}</span></div>
        </div>
      </div>

      <div class="field">
        <label for="f-activity">Activity level</label>
        <select id="f-activity">
          ${Object.entries(ACTIVITY_LABELS).map(([k,label])=>`<option value="${k}" ${p.activityLevel===k?"selected":""}>${label}</option>`).join("")}
        </select>
      </div>

      <div class="field">
        <label>Goal</label>
        <div class="segmented" id="goal-seg">
          <button type="button" data-val="lose" class="${p.goalType==="lose"?"is-active":""}">Lose weight</button>
          <button type="button" data-val="maintain" class="${p.goalType==="maintain"?"is-active":""}">Maintain</button>
          <button type="button" data-val="gain" class="${p.goalType==="gain"?"is-active":""}">Gain weight</button>
        </div>
      </div>

      <div class="field">
        <label for="f-timeline">Timeline</label>
        <div class="unit-suffix"><input id="f-timeline" type="number" min="1" max="104" value="${p.timelineWeeks ?? 12}"/><span>weeks</span></div>
        <div class="field-hint">${goalNote(p, units)}</div>
      </div>

      <button class="btn btn-primary btn-block" id="save-goals">Save goals</button>
    </div>
  `;

  let goalType = p.goalType;
  container.querySelector("#goal-seg").addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-val]");
    if(!btn) return;
    goalType = btn.getAttribute("data-val");
    container.querySelectorAll("#goal-seg button").forEach(b=>b.classList.toggle("is-active", b===btn));
  });

  container.querySelector("#save-goals").addEventListener("click", ()=>{
    const heightCm = units.height === "ftin"
      ? convert.ftInToCm(container.querySelector("#f-height-ft").value, container.querySelector("#f-height-in").value)
      : Number(container.querySelector("#f-height-cm").value) || null;

    const next = {
      name: container.querySelector("#f-name").value.trim(),
      sex: container.querySelector("#f-sex").value,
      age: Number(container.querySelector("#f-age").value) || null,
      heightCm: heightCm || null,
      currentWeightKg: convert.weightToKg(Number(container.querySelector("#f-current-weight").value) || null, units.weight),
      targetWeightKg: convert.weightToKg(Number(container.querySelector("#f-target-weight").value) || null, units.weight),
      activityLevel: container.querySelector("#f-activity").value,
      goalType,
      timelineWeeks: Number(container.querySelector("#f-timeline").value) || 12,
    };
    db.saveProfile(next);
    showToast("Goals saved");
    renderGoals(container);
  });
}

function goalNote(p, units){
  if(p.currentWeightKg==null || p.targetWeightKg==null) return "Add your current and target weight to see a pace estimate.";
  const diffKg = p.targetWeightKg - p.currentWeightKg;
  const diffDisplay = convert.weightToDisplay(Math.abs(diffKg), units.weight);
  const perWeek = p.timelineWeeks ? diffDisplay / p.timelineWeeks : 0;
  if(Math.abs(diffKg) < 0.1) return "You're already at your target weight.";
  return `That's ${fmt(diffDisplay,1)} ${convert.weightUnitLabel(units.weight)} ${diffKg>0?"to gain":"to lose"} — about ${fmt(perWeek,2)} ${convert.weightUnitLabel(units.weight)}/week.`;
}
