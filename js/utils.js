// ---------------------------------------------------------------
// Dates
// ---------------------------------------------------------------
export function toDateStr(d){
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
export function todayStr(){ return toDateStr(new Date()); }
export function addDays(dateStr, n){
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}
export function lastNDates(n){
  const out = [];
  for(let i=n-1;i>=0;i--) out.push(addDays(todayStr(), -i));
  return out;
}
export function shortDayLabel(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" }).slice(0,2);
}
export function shortDateLabel(dateStr, format){
  const [, m, d] = dateStr.split("-");
  const mm = Number(m), dd = Number(d);
  return format === "mdy" ? `${mm}/${dd}` : `${dd}/${mm}`;
}
export function weekStart(dateStr){
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0 Sun
  d.setDate(d.getDate() - day);
  return toDateStr(d);
}
export function friendlyDate(dateStr){
  if(dateStr === todayStr()) return "Today";
  if(dateStr === addDays(todayStr(), -1)) return "Yesterday";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday:"short", month:"short", day:"numeric" });
}

// Numeric date string respecting the user's chosen format setting.
export function formatDateNumeric(dateStr, format){
  const [y,m,d] = dateStr.split("-");
  if(format === "mdy") return `${m}/${d}/${y}`;
  if(format === "iso") return `${y}-${m}-${d}`;
  return `${d}/${m}/${y}`; // dmy (default)
}

// Label used in the date-nav header: "Today · 30/07/2026", "Yesterday · 29/07/2026",
// or just the numeric date further back.
export function dateNavLabel(dateStr, format){
  const numeric = formatDateNumeric(dateStr, format);
  if(dateStr === todayStr()) return `Today · ${numeric}`;
  if(dateStr === addDays(todayStr(), -1)) return `Yesterday · ${numeric}`;
  return numeric;
}

// ---------------------------------------------------------------
// Unit conversions — storage is always metric (kg, cm, ml, kcal, km);
// these convert only for display / input.
// ---------------------------------------------------------------
export const convert = {
  weightToDisplay(kg, unit){ if(kg==null) return null; return unit==="lb" ? kg*2.20462 : kg; },
  weightToKg(val, unit){ if(val==null||val==="") return null; return unit==="lb" ? val/2.20462 : val; },
  weightUnitLabel(unit){ return unit==="lb" ? "lb" : "kg"; },

  heightToDisplayCm(cm){ return cm; },
  cmToFtIn(cm){
    if(cm==null) return { ft:null, inch:null };
    const totalIn = cm/2.54;
    const ft = Math.floor(totalIn/12);
    const inch = Math.round(totalIn - ft*12);
    return { ft, inch };
  },
  ftInToCm(ft, inch){
    ft = Number(ft)||0; inch = Number(inch)||0;
    return (ft*12+inch)*2.54;
  },

  energyToDisplay(kcal, unit){ if(kcal==null) return null; return unit==="kj" ? kcal*4.184 : kcal; },
  energyToKcal(val, unit){ if(val==null||val==="") return null; return unit==="kj" ? val/4.184 : val; },
  energyUnitLabel(unit){ return unit==="kj" ? "kJ" : "kcal"; },

  distanceToDisplay(km, unit){ if(km==null) return null; return unit==="mi" ? km*0.621371 : km; },
  distanceToKm(val, unit){ if(val==null||val==="") return null; return unit==="mi" ? val/0.621371 : val; },
  distanceUnitLabel(unit){ return unit==="mi" ? "mi" : "km"; },

  volumeToDisplay(ml, unit){ if(ml==null) return null; return unit==="oz" ? ml*0.033814 : ml; },
  volumeToMl(val, unit){ if(val==null||val==="") return null; return unit==="oz" ? val/0.033814 : val; },
  volumeUnitLabel(unit){ return unit==="oz" ? "oz" : "ml"; },
};

export function round(n, dp=0){
  if(n==null || isNaN(n)) return null;
  const f = Math.pow(10,dp);
  return Math.round(n*f)/f;
}
export function fmt(n, dp=0){
  const r = round(n, dp);
  if(r==null) return "—";
  return r.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

// ---------------------------------------------------------------
// BMR / TDEE — Mifflin-St Jeor
// ---------------------------------------------------------------
const ACTIVITY_MULT = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};
export const ACTIVITY_LABELS = {
  sedentary: "Sedentary (little/no exercise)",
  light: "Light (1-3 days/week)",
  moderate: "Moderate (3-5 days/week)",
  active: "Active (6-7 days/week)",
  veryActive: "Very active (2x/day, physical job)",
};
export function calcBMR({ sex, age, heightCm, currentWeightKg }){
  if(!age || !heightCm || !currentWeightKg) return null;
  const base = 10*currentWeightKg + 6.25*heightCm - 5*age;
  return sex === "male" ? base + 5 : base - 161;
}
export function calcTDEE(bmr, activityLevel){
  if(bmr==null) return null;
  return bmr * (ACTIVITY_MULT[activityLevel] || 1.2);
}
export function calcCalorieTarget(tdee, goalType){
  if(tdee==null) return null;
  if(goalType === "lose") return tdee - 500;
  if(goalType === "gain") return tdee + 350;
  return tdee;
}

// ---------------------------------------------------------------
// Trend arrows — compare mean of the earlier half of a window to the
// later half. Direction is purely about the number's movement
// (up = increasing, down = decreasing), not whether that's "good".
// ---------------------------------------------------------------
export function trendOf(values){
  const v = values.filter(x=>x!=null && !isNaN(x));
  if(v.length < 2) return { direction: "flat", deltaAbs: 0, deltaPct: 0 };
  const mid = Math.floor(v.length/2);
  const first = v.slice(0, mid);
  const second = v.slice(mid);
  const avg = arr => arr.reduce((a,b)=>a+b,0)/arr.length;
  const a = avg(first), b = avg(second);
  const deltaAbs = b - a;
  const deltaPct = a !== 0 ? (deltaAbs/Math.abs(a))*100 : 0;
  let direction = "flat";
  const threshold = Math.abs(a) * 0.01; // ignore noise under ~1%
  if(deltaAbs > threshold) direction = "up";
  else if(deltaAbs < -threshold) direction = "down";
  return { direction, deltaAbs, deltaPct };
}

export function movingAverage(values, windowSize){
  const out = [];
  for(let i=0;i<values.length;i++){
    const start = Math.max(0, i-windowSize+1);
    const slice = values.slice(start, i+1).filter(v=>v!=null);
    out.push(slice.length ? slice.reduce((a,b)=>a+b,0)/slice.length : null);
  }
  return out;
}

export function sum(arr){ return arr.filter(v=>v!=null).reduce((a,b)=>a+b,0); }
export function avg(arr){
  const v = arr.filter(v=>v!=null);
  return v.length ? sum(v)/v.length : null;
}
