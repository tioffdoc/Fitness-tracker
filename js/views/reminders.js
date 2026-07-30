import { db, uid } from "../db.js";
import { icon } from "../icons.js";
import { showToast, openSheet, closeSheet, escapeHTML, confirmDialog } from "../ui.js";

export function renderReminders(container){
  const reminders = db.reminders();
  const permission = ("Notification" in window) ? Notification.permission : "unsupported";

  container.innerHTML = `
    <div class="view-header">
      <h1>Reminders</h1>
      <p>Local nudges to log meals, water, weight, or workouts.</p>
    </div>

    <div class="card" style="display:flex;align-items:center;gap:12px;">
      <div class="list-row__icon">${icon("bell")}</div>
      <div style="flex:1 1 auto;">
        <div style="font-weight:700;font-size:.85rem;">Notifications</div>
        <div class="faint" style="font-size:.76rem;">${permissionLabel(permission)}</div>
      </div>
      ${permission==="default" ? `<button class="btn btn-sm btn-primary" id="ask-perm">Enable</button>` : ""}
    </div>
    <p class="field-hint" style="margin:8px 4px 0;">Reminders fire while Vitals is open on this device. iOS limits background alerts for installed web apps, so keep the app open around the times you want a nudge.</p>

    <div class="section-label">Your reminders</div>
    <div class="card" style="padding:4px 14px;">
      ${reminders.length===0 ? `<div class="empty-state">${icon("bell")}<p>No reminders set</p></div>` : reminders.map(r=>`
        <div class="list-row">
          <div class="list-row__icon">${icon("bell")}</div>
          <div class="list-row__body">
            <div class="list-row__title">${escapeHTML(r.label)}</div>
            <div class="list-row__meta">${r.time}</div>
          </div>
          <label style="display:inline-flex;align-items:center;">
            <input type="checkbox" data-toggle="${r.id}" ${r.enabled?"checked":""} style="width:auto;"/>
          </label>
          <button class="list-row__del" data-del="${r.id}" aria-label="Delete reminder">${icon("trash")}</button>
        </div>`).join("")}
    </div>
    <button class="fab" id="addReminderFab" aria-label="Add reminder">${icon("plus")}</button>
  `;

  const askBtn = container.querySelector("#ask-perm");
  if(askBtn) askBtn.addEventListener("click", async ()=>{
    const res = await Notification.requestPermission();
    showToast(res === "granted" ? "Notifications enabled" : "Permission not granted");
    renderReminders(container);
  });

  container.querySelectorAll("[data-toggle]").forEach(cb=>{
    cb.addEventListener("change", ()=>{
      const list = db.reminders();
      const r = list.find(x=>x.id===cb.getAttribute("data-toggle"));
      if(r) r.enabled = cb.checked;
      db.saveReminders(list);
    });
  });
  container.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const ok = await confirmDialog("Delete this reminder?");
      if(!ok) return;
      db.saveReminders(db.reminders().filter(r=>r.id!==btn.getAttribute("data-del")));
      showToast("Reminder deleted");
      renderReminders(container);
    });
  });

  container.querySelector("#addReminderFab").addEventListener("click", ()=>{
    const sheet = openSheet(`
      <div class="sheet__head"><h2>New reminder</h2><button class="btn btn-icon" data-close-sheet aria-label="Close">${icon("close")}</button></div>
      <div class="field"><label for="r-label">Label</label><input id="r-label" type="text" placeholder="e.g. Log breakfast"/></div>
      <div class="field"><label for="r-time">Time</label><input id="r-time" type="time" value="08:00"/></div>
      <button class="btn btn-primary btn-block" id="add-reminder-btn">Add reminder</button>
    `);
    sheet.querySelector("#add-reminder-btn").addEventListener("click", ()=>{
      const label = sheet.querySelector("#r-label").value.trim();
      const time = sheet.querySelector("#r-time").value;
      if(!label || !time){ showToast("Add a label and time"); return; }
      const list = db.reminders();
      list.push({ id: uid(), label, time, enabled: true, lastFired: "" });
      db.saveReminders(list);
      closeSheet();
      renderReminders(container);
    });
  });
}

function permissionLabel(p){
  if(p==="granted") return "Enabled on this device";
  if(p==="denied") return "Blocked — enable in Safari settings for this site";
  if(p==="unsupported") return "Not supported in this browser";
  return "Not yet enabled";
}
