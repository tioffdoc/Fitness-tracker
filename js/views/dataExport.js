import { db } from "../db.js";
import { icon } from "../icons.js";
import { showToast, confirmDialog } from "../ui.js";
import { todayStr, addDays, sum } from "../utils.js";

export function downloadBlob(filename, content, mime){
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
}

export function exportJSON(){
  const data = db.exportAll();
  downloadBlob(`vitals-backup-${todayStr()}.json`, JSON.stringify(data, null, 2), "application/json");
  showToast("Backup downloaded");
}

export function triggerImportDialog(onDone){
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.addEventListener("change", async ()=>{
    const file = input.files[0];
    if(!file) return;
    const ok = await confirmDialog("Importing will overwrite any existing data with the same dates. Continue?", { confirmLabel: "Import" });
    if(!ok) return;
    try{
      const text = await file.text();
      const obj = JSON.parse(text);
      db.importAll(obj);
      showToast("Backup restored");
      if(onDone) onDone();
    }catch(e){
      showToast("Couldn't read that file");
    }
  });
  input.click();
}

function toCSV(rows){
  return rows.map(r => r.map(cell=>{
    const s = String(cell ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }).join(",")).join("\n");
}

function last90(){
  const out = [];
  for(let i=89;i>=0;i--) out.push(addDays(todayStr(), -i));
  return out;
}

function exportWeightCSV(){
  const rows = [["date","weight_kg"]];
  last90().forEach(d=>{
    const day = db.day(d);
    if(day.weightKg!=null) rows.push([d, day.weightKg]);
  });
  downloadBlob("vitals-weight.csv", toCSV(rows), "text/csv");
}
function exportFoodCSV(){
  const rows = [["date","meal","name","kcal","protein_g","carb_g","fat_g"]];
  last90().forEach(d=>{
    const day = db.day(d);
    day.calorieEntries.forEach(e=>rows.push([d, e.meal, e.name, e.kcal, e.protein, e.carb, e.fat]));
  });
  downloadBlob("vitals-food-log.csv", toCSV(rows), "text/csv");
}
function exportActivityCSV(){
  const rows = [["date","steps","distance_km","workout_type","workout_minutes","calories_burned"]];
  last90().forEach(d=>{
    const day = db.day(d);
    if(day.workouts.length===0){
      if(day.steps!=null || day.distanceKm!=null) rows.push([d, day.steps??"", day.distanceKm??"", "", "", ""]);
    } else {
      day.workouts.forEach((w,i)=>rows.push([d, i===0?(day.steps??""):"", i===0?(day.distanceKm??""):"", w.type, w.minutes, w.caloriesBurned??""]));
    }
  });
  downloadBlob("vitals-activity.csv", toCSV(rows), "text/csv");
}
function exportWaterCSV(){
  const rows = [["date","total_ml"]];
  last90().forEach(d=>{
    const day = db.day(d);
    if(day.waterMl) rows.push([d, day.waterMl]);
  });
  downloadBlob("vitals-water.csv", toCSV(rows), "text/csv");
}

export function renderDataExport(container){
  container.innerHTML = `
    <div class="view-header">
      <h1>Data Export</h1>
      <p>Your data lives only on this device — back it up or export it anytime.</p>
    </div>

    <div class="card">
      <div style="font-weight:700;font-size:.85rem;margin-bottom:6px;">Full backup</div>
      <p class="faint" style="font-size:.78rem;margin-bottom:12px;">A complete JSON snapshot of your profile, settings, and logs — the fastest way to move to a new device.</p>
      <div class="field-row">
        <button class="btn btn-primary btn-block" id="exp-json">${icon("download")} Export backup</button>
        <button class="btn btn-block" id="imp-json">Restore backup</button>
      </div>
    </div>

    <div class="section-label">Export as CSV</div>
    <div class="card" style="padding:4px 14px;">
      ${csvRow("scale","Weight log (90d)","exp-weight")}
      ${csvRow("fork","Food log (90d)","exp-food")}
      ${csvRow("run","Activity log (90d)","exp-activity")}
      ${csvRow("droplet","Water log (90d)","exp-water")}
    </div>
  `;

  container.querySelector("#exp-json").addEventListener("click", exportJSON);
  container.querySelector("#imp-json").addEventListener("click", ()=>triggerImportDialog());
  container.querySelector("#exp-weight").addEventListener("click", exportWeightCSV);
  container.querySelector("#exp-food").addEventListener("click", exportFoodCSV);
  container.querySelector("#exp-activity").addEventListener("click", exportActivityCSV);
  container.querySelector("#exp-water").addEventListener("click", exportWaterCSV);
}

function csvRow(iconName, label, id){
  return `
    <div class="list-row" style="cursor:pointer;" id="${id}">
      <div class="list-row__icon">${icon(iconName)}</div>
      <div class="list-row__body"><div class="list-row__title">${label}</div></div>
      <div class="list-row__value">${icon("download")}</div>
    </div>`;
}
