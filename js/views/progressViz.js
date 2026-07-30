import { db } from "../db.js";
import { renderChartCard } from "../charts.js";
import { lastNDates, shortDateLabel, shortDayLabel, convert, fmt, round, sum } from "../utils.js";

let range = 30;

function dayMetrics(dateStr){
  const d = db.day(dateStr);
  const kcal = sum(d.calorieEntries.map(e=>e.kcal));
  const workoutMin = sum(d.workouts.map(w=>w.minutes));
  return {
    date: dateStr,
    kcal: d.calorieEntries.length ? kcal : null,
    weightKg: d.weightKg,
    steps: d.steps,
    distanceKm: d.distanceKm,
    workoutMin: d.workouts.length ? workoutMin : null,
  };
}

export function renderProgressViz(container){
  const units = db.settings().units;
  const dates = lastNDates(range);
  const metrics = dates.map(dayMetrics);
  const labelFn = range > 14 ? shortDateLabel : shortDayLabel;

  const kcalPoints = metrics.map(m=>({ label: labelFn(m.date), value: m.kcal==null?null:round(convert.energyToDisplay(m.kcal, units.energy)) }));
  const weightPoints = metrics.map(m=>({ label: labelFn(m.date), value: m.weightKg==null?null:round(convert.weightToDisplay(m.weightKg, units.weight),1) }));
  const stepPoints = metrics.map(m=>({ label: labelFn(m.date), value: m.steps }));
  const distPoints = metrics.map(m=>({ label: labelFn(m.date), value: m.distanceKm==null?null:round(convert.distanceToDisplay(m.distanceKm, units.distance),2) }));
  const workoutPoints = metrics.map(m=>({ label: labelFn(m.date), value: m.workoutMin }));

  const latest = arr => [...arr].reverse().find(p=>p.value!=null);
  const lk = latest(kcalPoints), lw = latest(weightPoints), ls = latest(stepPoints), ld = latest(distPoints), lwo = latest(workoutPoints);

  container.innerHTML = `
    <div class="view-header">
      <h1>Progress Visualization</h1>
      <p>Every tracked metric, plotted day by day.</p>
    </div>
    <div class="segmented" style="margin-bottom:16px;max-width:280px;">
      <button type="button" data-range="7" class="${range===7?"is-active":""}">7 days</button>
      <button type="button" data-range="30" class="${range===30?"is-active":""}">30 days</button>
      <button type="button" data-range="90" class="${range===90?"is-active":""}">90 days</button>
    </div>
    <div class="charts-row">
      ${renderChartCard({ title: "Calorie intake", points: kcalPoints, latestLabel: lk?`${fmt(lk.value)} ${convert.energyUnitLabel(units.energy)}`:"" })}
      ${renderChartCard({ title: "Weight", points: weightPoints, latestLabel: lw?`${fmt(lw.value,1)} ${convert.weightUnitLabel(units.weight)}`:"" })}
      ${renderChartCard({ title: "Step count", points: stepPoints, latestLabel: ls?fmt(ls.value):"" })}
      ${renderChartCard({ title: "Distance covered", points: distPoints, latestLabel: ld?`${fmt(ld.value,2)} ${convert.distanceUnitLabel(units.distance)}`:"" })}
      ${renderChartCard({ title: "Workout duration", points: workoutPoints, latestLabel: lwo?`${fmt(lwo.value)} min`:"" })}
    </div>
  `;

  container.querySelectorAll("[data-range]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      range = Number(btn.getAttribute("data-range"));
      renderProgressViz(container);
    });
  });
}
