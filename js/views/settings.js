import { db } from "../db.js";
import { icon } from "../icons.js";
import { showToast, applySettings, openSheet, closeSheet, confirmDialog } from "../ui.js";
import { exportJSON, triggerImportDialog } from "./dataExport.js";
import { navigateTo } from "../nav.js";

const ACCENTS = [
  { id: "teal", hex: "#175C59" },
  { id: "blue", hex: "#2B5DA8" },
  { id: "coral", hex: "#C05A3D" },
  { id: "plum", hex: "#6B4694" },
  { id: "amber", hex: "#9C7A1E" },
];

export function renderSettings(container){
  const s = db.settings();

  container.innerHTML = `
    <div class="view-header">
      <h1>Settings</h1>
      <p>Appearance, units, and privacy.</p>
    </div>

    <div class="section-label">Appearance</div>
    <div class="card">
      <div class="field">
        <label>Theme</label>
        <div class="segmented" id="seg-theme">
          <button type="button" data-val="light" class="${s.theme==="light"?"is-active":""}">${icon("sun")} Light</button>
          <button type="button" data-val="dark" class="${s.theme==="dark"?"is-active":""}">${icon("moon")} Dark</button>
          <button type="button" data-val="system" class="${s.theme==="system"?"is-active":""}">${icon("monitor")} System</button>
        </div>
      </div>
      <div class="field">
        <label>Accent color</label>
        <div class="swatches" id="accent-swatches">
          ${ACCENTS.map(a=>`<button type="button" class="swatch ${s.accent===a.id?"is-active":""}" data-accent="${a.id}" style="background:${a.hex}" aria-label="${a.id}"></button>`).join("")}
        </div>
      </div>
      <div class="field" style="margin-bottom:0;">
        <label>Font size</label>
        <div class="segmented" id="seg-fontsize">
          <button type="button" data-val="small" class="${s.fontSize==="small"?"is-active":""}">Small</button>
          <button type="button" data-val="medium" class="${s.fontSize==="medium"?"is-active":""}">Medium</button>
          <button type="button" data-val="large" class="${s.fontSize==="large"?"is-active":""}">Large</button>
        </div>
      </div>
    </div>

    <div class="section-label">Units of measurement</div>
    <div class="card">
      ${unitRow("Weight", "weight", [["kg","kg"],["lb","lb"]], s.units.weight)}
      ${unitRow("Height", "height", [["cm","cm"],["ftin","ft/in"]], s.units.height)}
      ${unitRow("Water", "water", [["ml","ml"],["oz","fl oz"]], s.units.water)}
      ${unitRow("Energy", "energy", [["kcal","kcal"],["kj","kJ"]], s.units.energy)}
      ${unitRow("Distance", "distance", [["km","km"],["mi","mi"]], s.units.distance)}
    </div>

    <div class="section-label">Privacy &amp; security</div>
    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${s.passcode.enabled?"12px":"0"};">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="list-row__icon">${icon("lock")}</div>
          <div>
            <div style="font-weight:700;font-size:.85rem;">Passcode lock</div>
            <div class="faint" style="font-size:.76rem;">Require a 4-digit code to open Vitals</div>
          </div>
        </div>
        <label style="display:inline-flex;"><input type="checkbox" id="passcode-toggle" ${s.passcode.enabled?"checked":""} style="width:auto;"/></label>
      </div>
      ${s.passcode.enabled ? `<button class="btn btn-block" id="change-passcode">Change passcode</button>` : ""}
    </div>

    <div class="card">
      <div style="font-weight:700;font-size:.85rem;margin-bottom:10px;">Backup &amp; restore</div>
      <div class="field-row">
        <button class="btn btn-block" id="quick-export">${icon("download")} Export</button>
        <button class="btn btn-block" id="quick-import">Restore</button>
      </div>
      <p class="faint" style="font-size:.76rem;margin-top:10px;">For CSV exports per category, see <a href="#" id="go-export" style="color:var(--accent);font-weight:600;">Data Export</a>.</p>
    </div>

    <div class="card">
      <button class="btn btn-danger btn-block" id="erase-all">Erase all data</button>
    </div>
  `;

  // theme
  container.querySelector("#seg-theme").addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-val]"); if(!btn) return;
    const next = db.settings(); next.theme = btn.getAttribute("data-val");
    db.saveSettings(next); applySettings(next);
    container.querySelectorAll("#seg-theme button").forEach(b=>b.classList.toggle("is-active", b===btn));
  });
  // accent
  container.querySelector("#accent-swatches").addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-accent]"); if(!btn) return;
    const next = db.settings(); next.accent = btn.getAttribute("data-accent");
    db.saveSettings(next); applySettings(next);
    container.querySelectorAll(".swatch").forEach(b=>b.classList.toggle("is-active", b===btn));
  });
  // font size
  container.querySelector("#seg-fontsize").addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-val]"); if(!btn) return;
    const next = db.settings(); next.fontSize = btn.getAttribute("data-val");
    db.saveSettings(next); applySettings(next);
    container.querySelectorAll("#seg-fontsize button").forEach(b=>b.classList.toggle("is-active", b===btn));
  });
  // units
  container.querySelectorAll("[data-unit-group]").forEach(group=>{
    group.addEventListener("click", (e)=>{
      const btn = e.target.closest("button[data-val]"); if(!btn) return;
      const key = group.getAttribute("data-unit-group");
      const next = db.settings(); next.units[key] = btn.getAttribute("data-val");
      db.saveSettings(next);
      group.querySelectorAll("button").forEach(b=>b.classList.toggle("is-active", b===btn));
      showToast("Units updated");
    });
  });

  // passcode
  container.querySelector("#passcode-toggle").addEventListener("change", async (e)=>{
    const next = db.settings();
    if(e.target.checked){
      const code = await promptPasscode("Set a 4-digit passcode");
      if(code){ next.passcode = { enabled: true, code }; db.saveSettings(next); showToast("Passcode set"); }
      else e.target.checked = false;
    } else {
      next.passcode = { enabled: false, code: "" };
      db.saveSettings(next);
      showToast("Passcode removed");
    }
    renderSettings(container);
  });
  const changeBtn = container.querySelector("#change-passcode");
  if(changeBtn) changeBtn.addEventListener("click", async ()=>{
    const code = await promptPasscode("Set a new 4-digit passcode");
    if(code){ const next = db.settings(); next.passcode = { enabled: true, code }; db.saveSettings(next); showToast("Passcode updated"); }
  });

  container.querySelector("#quick-export").addEventListener("click", exportJSON);
  container.querySelector("#quick-import").addEventListener("click", ()=>triggerImportDialog(()=>renderSettings(container)));
  container.querySelector("#go-export").addEventListener("click", (e)=>{ e.preventDefault(); navigateTo("data-export"); });

  container.querySelector("#erase-all").addEventListener("click", async ()=>{
    const ok = await confirmDialog("This permanently deletes every log, goal, and setting on this device. This can't be undone.", { confirmLabel: "Erase everything" });
    if(!ok) return;
    db.wipeAll();
    showToast("All data erased");
    location.reload();
  });
}

function unitRow(label, key, options, current){
  return `
    <div class="field">
      <label>${label}</label>
      <div class="segmented" data-unit-group="${key}">
        ${options.map(([val,text])=>`<button type="button" data-val="${val}" class="${current===val?"is-active":""}">${text}</button>`).join("")}
      </div>
    </div>`;
}

function promptPasscode(title){
  return new Promise((resolve)=>{
    const sheet = openSheet(`
      <div class="sheet__head"><h2>${title}</h2><button class="btn btn-icon" data-close-sheet aria-label="Close">${icon("close")}</button></div>
      <div class="field"><label for="pc-1">Passcode</label><input id="pc-1" type="password" inputmode="numeric" maxlength="4" placeholder="4 digits"/></div>
      <div class="field"><label for="pc-2">Confirm passcode</label><input id="pc-2" type="password" inputmode="numeric" maxlength="4" placeholder="4 digits"/></div>
      <button class="btn btn-primary btn-block" id="pc-save">Save passcode</button>
    `);
    let resolved = false;
    sheet.querySelectorAll("[data-close-sheet]").forEach(b=>b.addEventListener("click", ()=>{ if(!resolved) resolve(null); }));
    sheet.querySelector("#pc-save").addEventListener("click", ()=>{
      const a = sheet.querySelector("#pc-1").value, b = sheet.querySelector("#pc-2").value;
      if(!/^\d{4}$/.test(a)){ showToast("Enter a 4-digit code"); return; }
      if(a !== b){ showToast("Codes don't match"); return; }
      resolved = true;
      closeSheet();
      resolve(a);
    });
  });
}
