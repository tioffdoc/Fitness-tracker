import { db, uid } from "../db.js";
import { icon } from "../icons.js";
import { showToast, openSheet, closeSheet, dateNavHTML, escapeHTML } from "../ui.js";
import { todayStr, addDays, friendlyDate, convert, fmt, sum } from "../utils.js";

let currentDate = todayStr();
const WORKOUT_TYPES = ["Run","Walk","Cycle","Swim","Strength","Yoga","HIIT","Sport","Other"];

export function renderActivity(container){
  const units = db.settings().units;
  const day = db.day(currentDate);
  const isToday = currentDate === todayStr();
  const workoutMin = sum(day.workouts.map(w=>w.minutes));

  container.innerHTML = `
    <div class="view-header">
      <h1>Activity &amp; Exercise</h1>
      <p>Steps, distance, and workouts.</p>
    </div>
    ${dateNavHTML(friendlyDate(currentDate), isToday)}

    <div class="card">
      <div class="field-row">
        <div class="field">
          <label for="f-steps">Steps</label>
          <input id="f-steps" type="number" min="0" value="${day.steps ?? ""}" placeholder="Step count"/>
        </div>
        <div class="field">
          <label for="f-distance">Distance</label>
          <div class="unit-suffix"><input id="f-distance" type="number" min="0" step="0.01" value="${day.distanceKm!=null?fmt(convert.distanceToDisplay(day.distanceKm,units.distance),2):""}" placeholder="Distance"/><span>${convert.distanceUnitLabel(units.distance)}</span></div>
        </div>
      </div>
      <button class="btn btn-primary btn-block" id="save-activity">Save</button>
    </div>

    <div class="section-label">Workouts — ${fmt(workoutMin)} min total</div>
    <div class="card" style="padding:4px 14px;">
      ${day.workouts.length===0 ? `<div class="empty-state">${icon("run")}<p>No workouts logged for this day</p></div>` : day.workouts.map(w=>`
        <div class="list-row">
          <div class="list-row__icon">${icon("run")}</div>
          <div class="list-row__body">
            <div class="list-row__title">${escapeHTML(w.type)}</div>
            <div class="list-row__meta">${w.minutes} min${w.caloriesBurned?` · ${fmt(w.caloriesBurned)} kcal burned`:""}</div>
          </div>
          <button class="list-row__del" data-del="${w.id}" aria-label="Delete workout">${icon("trash")}</button>
        </div>`).join("")}
    </div>
    <button class="fab" id="addWorkoutFab" aria-label="Add workout">${icon("plus")}</button>
  `;

  container.querySelector("#dateNavPrev").addEventListener("click", ()=>{ currentDate = addDays(currentDate,-1); renderActivity(container); });
  const nextBtn = container.querySelector("#dateNavNext");
  if(nextBtn) nextBtn.addEventListener("click", ()=>{ if(currentDate!==todayStr()){ currentDate = addDays(currentDate,1); renderActivity(container); } });

  container.querySelector("#save-activity").addEventListener("click", ()=>{
    const d = db.day(currentDate);
    const stepsVal = container.querySelector("#f-steps").value;
    const distVal = container.querySelector("#f-distance").value;
    d.steps = stepsVal==="" ? null : Number(stepsVal);
    d.distanceKm = distVal==="" ? null : convert.distanceToKm(Number(distVal), units.distance);
    db.saveDay(currentDate, d);
    showToast("Activity saved");
    renderActivity(container);
  });

  container.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const d = db.day(currentDate);
      d.workouts = d.workouts.filter(w=>w.id!==btn.getAttribute("data-del"));
      db.saveDay(currentDate, d);
      renderActivity(container);
    });
  });

  container.querySelector("#addWorkoutFab").addEventListener("click", ()=>{
    const sheet = openSheet(`
      <div class="sheet__head"><h2>Add workout</h2><button class="btn btn-icon" data-close-sheet aria-label="Close">${icon("close")}</button></div>
      <div class="field">
        <label for="w-type">Type</label>
        <select id="w-type">${WORKOUT_TYPES.map(t=>`<option value="${t}">${t}</option>`).join("")}</select>
      </div>
      <div class="field-row">
        <div class="field"><label for="w-minutes">Duration (min)</label><input id="w-minutes" type="number" min="1" placeholder="Minutes"/></div>
        <div class="field"><label for="w-kcal">Calories burned</label><input id="w-kcal" type="number" min="0" placeholder="Optional"/></div>
      </div>
      <button class="btn btn-primary btn-block" id="add-workout-btn">Add workout</button>
    `);
    sheet.querySelector("#add-workout-btn").addEventListener("click", ()=>{
      const minutes = Number(sheet.querySelector("#w-minutes").value);
      if(!minutes){ showToast("Enter a duration"); return; }
      const d = db.day(currentDate);
      d.workouts.push({ id: uid(), type: sheet.querySelector("#w-type").value, minutes, caloriesBurned: Number(sheet.querySelector("#w-kcal").value)||null });
      db.saveDay(currentDate, d);
      closeSheet();
      showToast("Workout added");
      renderActivity(container);
    });
  });
}
