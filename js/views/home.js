import { db } from "../db.js";
import { icon } from "../icons.js";
import { renderChartCard } from "../charts.js";
import { trendArrowHTML } from "../ui.js";
import { navigateTo } from "../nav.js";
import {
  lastNDates, shortDayLabel, todayStr, convert, fmt, round,
  trendOf, sum, avg,
} from "../utils.js";

const WINDOW_DAYS = 14;

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

function trendChip(label, valueStr, direction, deltaStr){
  return `
    <div class="trend-chip">
      <div class="trend-chip__top">
        <span class="trend-chip__label">${label}</span>
        ${trendArrowHTML(direction)}
      </div>
      <div class="trend-chip__value tabular">${valueStr}</div>
      <div class="trend-chip__delta ${direction}">${deltaStr}</div>
    </div>`;
}

function statTile(iconName, label, valueStr, unit, sub, gotoId){
  return `
    <div class="stat-tile" ${gotoId?`data-goto="${gotoId}" style="cursor:pointer"`:""}>
      <div class="stat-tile__label">${icon(iconName)}${label}</div>
      <div class="stat-tile__value tabular">${valueStr}${unit?`<small>${unit}</small>`:""}</div>
      ${sub?`<div class="stat-tile__sub">${sub}</div>`:""}
    </div>`;
}

export function renderHome(container){
  const settings = db.settings();
  const profile = db.profile();
  const macros = db.macros();
  const units = settings.units;

  const dates = lastNDates(WINDOW_DAYS);
  const metrics = dates.map(dayMetrics);

  // ---------- charts ----------
  const kcalPoints = metrics.map(m=>({ label: shortDayLabel(m.date), value: m.kcal==null?null:round(convert.energyToDisplay(m.kcal, units.energy)) }));
  const weightPoints = metrics.map(m=>({ label: shortDayLabel(m.date), value: m.weightKg==null?null:round(convert.weightToDisplay(m.weightKg, units.weight),1) }));
  const stepPoints = metrics.map(m=>({ label: shortDayLabel(m.date), value: m.steps }));
  const distPoints = metrics.map(m=>({ label: shortDayLabel(m.date), value: m.distanceKm==null?null:round(convert.distanceToDisplay(m.distanceKm, units.distance),2) }));

  const latestKcal = [...kcalPoints].reverse().find(p=>p.value!=null);
  const latestWeight = [...weightPoints].reverse().find(p=>p.value!=null);
  const latestSteps = [...stepPoints].reverse().find(p=>p.value!=null);
  const latestDist = [...distPoints].reverse().find(p=>p.value!=null);

  const chartsHTML = `
    <div class="charts-row">
      ${renderChartCard({ title: `Calorie intake (${WINDOW_DAYS}d)`, points: kcalPoints, latestLabel: latestKcal? `${fmt(latestKcal.value)} ${convert.energyUnitLabel(units.energy)}`:"" })}
      ${renderChartCard({ title: `Weight (${WINDOW_DAYS}d)`, points: weightPoints, latestLabel: latestWeight? `${fmt(latestWeight.value,1)} ${convert.weightUnitLabel(units.weight)}`:"" })}
      ${renderChartCard({ title: `Step count (${WINDOW_DAYS}d)`, points: stepPoints, latestLabel: latestSteps? fmt(latestSteps.value):"" })}
      ${renderChartCard({ title: `Distance covered (${WINDOW_DAYS}d)`, points: distPoints, latestLabel: latestDist? `${fmt(latestDist.value,2)} ${convert.distanceUnitLabel(units.distance)}`:"" })}
    </div>`;

  // ---------- trends ----------
  const kcalSeries = metrics.map(m=>m.kcal);
  const stepSeries = metrics.map(m=>m.steps);
  const distSeries = metrics.map(m=>m.distanceKm);
  const workoutSeries = metrics.map(m=>m.workoutMin);
  const weightSeries = metrics.map(m=>m.weightKg).filter(v=>v!=null);

  const kcalTrend = trendOf(kcalSeries);
  const stepTrend = trendOf(stepSeries);
  const distTrend = trendOf(distSeries);
  const workoutTrend = trendOf(workoutSeries);

  // avg weight change: mean day-over-day delta across logged entries, shown per week
  let weightChangePerWeek = 0, weightDir = "flat";
  if(weightSeries.length >= 2){
    const deltas = [];
    for(let i=1;i<weightSeries.length;i++) deltas.push(weightSeries[i]-weightSeries[i-1]);
    const meanDelta = avg(deltas) || 0;
    weightChangePerWeek = meanDelta * 7;
    weightDir = weightChangePerWeek > 0.02 ? "up" : weightChangePerWeek < -0.02 ? "down" : "flat";
  }
  const weightChangeDisplay = convert.weightToDisplay(weightChangePerWeek, units.weight);

  const trendsHTML = `
    <div class="grid grid-2 grid-3-sm">
      ${trendChip("Avg Calorie Intake", `${fmt(convert.energyToDisplay(avg(kcalSeries), units.energy))}<span style="font-size:.62rem;font-weight:600;color:var(--text-faint)"> ${convert.energyUnitLabel(units.energy)}</span>`, kcalTrend.direction, kcalTrend.direction==="flat"?"Stable":`${kcalTrend.direction==="up"?"+":""}${fmt(kcalTrend.deltaPct,0)}%`)}
      ${trendChip("Avg Weight Change", `${weightChangePerWeek>0?"+":""}${fmt(weightChangeDisplay,2)}<span style="font-size:.62rem;font-weight:600;color:var(--text-faint)"> ${convert.weightUnitLabel(units.weight)}/wk</span>`, weightDir, weightDir==="flat"?"Stable":weightDir==="up"?"Trending up":"Trending down")}
      ${trendChip("Avg Distance", `${fmt(convert.distanceToDisplay(avg(distSeries),units.distance),2)}<span style="font-size:.62rem;font-weight:600;color:var(--text-faint)"> ${convert.distanceUnitLabel(units.distance)}</span>`, distTrend.direction, distTrend.direction==="flat"?"Stable":`${distTrend.direction==="up"?"+":""}${fmt(distTrend.deltaPct,0)}%`)}
      ${trendChip("Avg Step Count", fmt(avg(stepSeries)), stepTrend.direction, stepTrend.direction==="flat"?"Stable":`${stepTrend.direction==="up"?"+":""}${fmt(stepTrend.deltaPct,0)}%`)}
      ${trendChip("Avg Workout Duration", `${fmt(avg(workoutSeries))}<span style="font-size:.62rem;font-weight:600;color:var(--text-faint)"> min</span>`, workoutTrend.direction, workoutTrend.direction==="flat"?"Stable":`${workoutTrend.direction==="up"?"+":""}${fmt(workoutTrend.deltaPct,0)}%`)}
    </div>`;

  // ---------- daily ----------
  const today = db.day(todayStr());
  const todayKcal = sum(today.calorieEntries.map(e=>e.kcal));
  const todayWorkoutMin = sum(today.workouts.map(w=>w.minutes));
  const target = macros.calorieTarget;

  const dailyHTML = `
    <div class="grid grid-2 grid-3-sm">
      ${statTile("flame","Calorie Intake", fmt(convert.energyToDisplay(todayKcal, units.energy)), convert.energyUnitLabel(units.energy), target? `of ${fmt(convert.energyToDisplay(target,units.energy))} target`:"", "calorie-macro")}
      ${statTile("scale","Weight", today.weightKg!=null?fmt(convert.weightToDisplay(today.weightKg,units.weight),1):"—", today.weightKg!=null?convert.weightUnitLabel(units.weight):"", today.weightKg==null?"Not logged today":"", "weight")}
      ${statTile("run","Step Count", today.steps!=null?fmt(today.steps):"—", "", "", "activity")}
      ${statTile("chart","Distance", today.distanceKm!=null?fmt(convert.distanceToDisplay(today.distanceKm,units.distance),2):"—", today.distanceKm!=null?convert.distanceUnitLabel(units.distance):"", "", "activity")}
      ${statTile("clock","Workout Duration", todayWorkoutMin?fmt(todayWorkoutMin):"—", todayWorkoutMin?"min":"", "", "activity")}
    </div>`;

  // ---------- weekly ----------
  const last7 = lastNDates(7).map(dayMetrics);
  const weekKcal = sum(last7.map(m=>m.kcal));
  const weekWeightAvg = avg(last7.map(m=>m.weightKg));
  const weekSteps = sum(last7.map(m=>m.steps));
  const weekDist = sum(last7.map(m=>m.distanceKm));
  const weekWorkout = sum(last7.map(m=>m.workoutMin));

  const weeklyHTML = `
    <div class="grid grid-2 grid-3-sm">
      ${statTile("flame","Overall Calorie Intake", fmt(convert.energyToDisplay(weekKcal,units.energy)), convert.energyUnitLabel(units.energy), "Last 7 days", "calorie-macro")}
      ${statTile("scale","Weight (avg)", weekWeightAvg!=null?fmt(convert.weightToDisplay(weekWeightAvg,units.weight),1):"—", weekWeightAvg!=null?convert.weightUnitLabel(units.weight):"", "Last 7 days", "weight")}
      ${statTile("run","Total Steps", fmt(weekSteps), "", "Last 7 days", "activity")}
      ${statTile("chart","Distance Covered", fmt(convert.distanceToDisplay(weekDist,units.distance),1), convert.distanceUnitLabel(units.distance), "Last 7 days", "activity")}
      ${statTile("clock","Workout Duration", fmt(weekWorkout), weekWorkout?"min":"", "Last 7 days", "activity")}
    </div>`;

  container.innerHTML = `
    <div class="view-header">
      <span class="topbar__eyebrow">${greeting()}</span>
      <h1>${profile.name ? profile.name.split(" ")[0]+"'s Overview" : "Overview"}</h1>
      <p>Your last ${WINDOW_DAYS} days at a glance.</p>
    </div>

    <div class="section-label">Trend graphs</div>
    ${chartsHTML}

    <div class="section-label">Trends</div>
    ${trendsHTML}

    <div class="section-label">Daily progress · Today</div>
    ${dailyHTML}

    <div class="section-label">Weekly progress · Last 7 days</div>
    ${weeklyHTML}
  `;

  container.querySelectorAll("[data-goto]").forEach(el=>{
    el.addEventListener("click", ()=>navigateTo(el.getAttribute("data-goto")));
  });
}

function greeting(){
  const h = new Date().getHours();
  if(h < 5) return "Late night check-in";
  if(h < 12) return "Good morning";
  if(h < 17) return "Good afternoon";
  return "Good evening";
}
