// ---------------------------------------------------------------
// Storage layer. Everything is local (localStorage) — this app has
// no server, so "offline mode" is the only mode. Keys are namespaced
// under vitals: so the app can coexist with other localStorage use
// on the same origin.
// ---------------------------------------------------------------
const PREFIX = "vitals:";

function read(key, fallback){
  try{
    const raw = localStorage.getItem(PREFIX + key);
    if(raw === null) return fallback;
    return JSON.parse(raw);
  }catch(e){
    console.warn("db.read failed for", key, e);
    return fallback;
  }
}
function write(key, value){
  try{
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  }catch(e){
    console.warn("db.write failed for", key, e);
    return false;
  }
}

const DEFAULT_SETTINGS = {
  theme: "system",            // light | dark | system
  accent: "teal",
  fontSize: "medium",         // small | medium | large
  units: {
    weight: "kg",              // kg | lb
    height: "cm",               // cm | ftin
    water: "ml",                 // ml | oz
    energy: "kcal",              // kcal | kj
    distance: "km",              // km | mi
  },
  passcode: { enabled: false, code: "" },
  onboarded: false,
  waterGoalMl: 2000,
};

const DEFAULT_PROFILE = {
  name: "",
  sex: "female",              // female | male
  age: null,
  heightCm: null,
  currentWeightKg: null,
  targetWeightKg: null,
  activityLevel: "moderate",  // sedentary | light | moderate | active | veryActive
  goalType: "lose",            // lose | maintain | gain
  timelineWeeks: 12,
};

const DEFAULT_MACROS = {
  method: "auto",              // auto | manual
  calorieTarget: 2000,
  proteinPct: 30,
  carbPct: 40,
  fatPct: 30,
};

const DEFAULT_MICRO_TARGETS = {
  fiberG: 30,
  sodiumMg: 2300,
  calciumMg: 1000,
  ironMg: 18,
  vitaminCMg: 75,
  vitaminDMcg: 20,
};

export const db = {
  settings(){ return read("settings", DEFAULT_SETTINGS); },
  saveSettings(s){ return write("settings", s); },

  profile(){ return read("profile", DEFAULT_PROFILE); },
  saveProfile(p){ return write("profile", p); },

  macros(){ return read("macros", DEFAULT_MACROS); },
  saveMacros(m){ return write("macros", m); },

  microTargets(){ return read("microTargets", DEFAULT_MICRO_TARGETS); },
  saveMicroTargets(t){ return write("microTargets", t); },

  foodLibrary(){ return read("foodLibrary", []); },
  saveFoodLibrary(list){ return write("foodLibrary", list); },

  reminders(){ return read("reminders", []); },
  saveReminders(list){ return write("reminders", list); },

  // ---- daily log ----
  emptyDay(){
    return {
      calorieEntries: [],     // {id, name, meal, kcal, protein, carb, fat, time}
      weightKg: null,
      steps: null,
      distanceKm: null,
      workouts: [],           // {id, type, minutes, caloriesBurned}
      waterMl: 0,
      waterEntries: [],       // {id, ml, time}
      micronutrients: { fiberG: 0, sodiumMg: 0, calciumMg: 0, ironMg: 0, vitaminCMg: 0, vitaminDMcg: 0 },
    };
  },
  day(dateStr){
    const d = read("day:" + dateStr, null);
    if(!d) return this.emptyDay();
    // backfill any fields added after a user's first save
    return Object.assign(this.emptyDay(), d);
  },
  saveDay(dateStr, dayObj){ return write("day:" + dateStr, dayObj); },

  allDayKeys(){
    const keys = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.startsWith(PREFIX + "day:")) keys.push(k.slice((PREFIX+"day:").length));
    }
    return keys.sort();
  },

  exportAll(){
    const out = { exportedAt: new Date().toISOString(), version: 1 };
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.startsWith(PREFIX)){
        out[k.slice(PREFIX.length)] = JSON.parse(localStorage.getItem(k));
      }
    }
    return out;
  },
  importAll(obj){
    Object.keys(obj).forEach(k=>{
      if(k === "exportedAt" || k === "version") return;
      write(k, obj[k]);
    });
    return true;
  },
  wipeAll(){
    const keys = [];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach(k=>localStorage.removeItem(k));
  },
};

export function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}
