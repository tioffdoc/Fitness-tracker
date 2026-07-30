import { db, uid } from "../db.js";
import { icon } from "../icons.js";
import { showToast, openSheet, closeSheet, dateNavHTML, escapeHTML } from "../ui.js";
import { todayStr, addDays, friendlyDate, sum, fmt } from "../utils.js";

const MEALS = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snack" },
];

let currentDate = todayStr();

export function renderFoodLogging(container){
  const day = db.day(currentDate);
  const totalKcal = sum(day.calorieEntries.map(e=>e.kcal));
  const isToday = currentDate === todayStr();

  const mealBlocks = MEALS.map(meal=>{
    const entries = day.calorieEntries.filter(e=>e.meal===meal.id);
    const mealKcal = sum(entries.map(e=>e.kcal));
    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-weight:700;font-size:.85rem;">${meal.label}</span>
          <span class="faint tabular" style="font-size:.78rem;">${fmt(mealKcal)} kcal</span>
        </div>
        ${entries.length === 0 ? `<p class="faint" style="font-size:.78rem;padding:6px 2px;">Nothing logged</p>` : entries.map(e=>`
          <div class="list-row">
            <div class="list-row__icon">${icon("fork")}</div>
            <div class="list-row__body">
              <div class="list-row__title">${escapeHTML(e.name)}</div>
              <div class="list-row__meta">P ${fmt(e.protein)}g · C ${fmt(e.carb)}g · F ${fmt(e.fat)}g</div>
            </div>
            <div class="list-row__value tabular">${fmt(e.kcal)}</div>
            <button class="list-row__del" data-del="${e.id}" aria-label="Delete entry">${icon("trash")}</button>
          </div>`).join("")}
      </div>`;
  }).join("");

  container.innerHTML = `
    <div class="view-header">
      <h1>Food Logging</h1>
      <p>Log meals and track calories &amp; macros day by day.</p>
    </div>
    ${dateNavHTML(friendlyDate(currentDate), isToday)}
    <div class="stat-tile" style="margin-bottom:16px;">
      <div class="stat-tile__label">${icon("flame")}Total logged</div>
      <div class="stat-tile__value tabular">${fmt(totalKcal)}<small>kcal</small></div>
    </div>
    ${mealBlocks}
    <button class="fab" id="addFoodFab" aria-label="Add food">${icon("plus")}</button>
  `;

  container.querySelector("#dateNavPrev").addEventListener("click", ()=>{ currentDate = addDays(currentDate,-1); renderFoodLogging(container); });
  const nextBtn = container.querySelector("#dateNavNext");
  if(nextBtn) nextBtn.addEventListener("click", ()=>{ if(currentDate!==todayStr()){ currentDate = addDays(currentDate,1); renderFoodLogging(container); } });

  container.querySelectorAll("[data-del]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const d = db.day(currentDate);
      d.calorieEntries = d.calorieEntries.filter(e=>e.id !== btn.getAttribute("data-del"));
      db.saveDay(currentDate, d);
      renderFoodLogging(container);
    });
  });

  container.querySelector("#addFoodFab").addEventListener("click", ()=>openAddFoodSheet(container));
}

function openAddFoodSheet(container){
  let meal = "breakfast";
  const library = db.foodLibrary();

  const sheet = openSheet(`
    <div class="sheet__head"><h2>Add food</h2><button class="btn btn-icon" data-close-sheet aria-label="Close">${icon("close")}</button></div>
    <div class="field">
      <label>Meal</label>
      <div class="segmented" id="meal-seg">
        ${MEALS.map((m,i)=>`<button type="button" data-val="${m.id}" class="${i===0?"is-active":""}">${m.label}</button>`).join("")}
      </div>
    </div>
    <div class="field">
      <label for="food-search">Search My Foods</label>
      <input id="food-search" type="text" placeholder="Type to filter saved foods…" />
    </div>
    <div id="food-lib-list" style="max-height:160px;overflow-y:auto;margin-bottom:6px;"></div>
    <div class="divider"></div>
    <p class="section-label" style="margin-top:0;">Or add new</p>
    <div class="field"><label for="f-name">Food name</label><input id="f-name" type="text" placeholder="e.g. Grilled chicken breast"/></div>
    <div class="field-row">
      <div class="field"><label for="f-kcal">Calories</label><input id="f-kcal" type="number" min="0" placeholder="kcal"/></div>
      <div class="field"><label for="f-protein">Protein (g)</label><input id="f-protein" type="number" min="0" placeholder="g"/></div>
    </div>
    <div class="field-row">
      <div class="field"><label for="f-carb">Carbs (g)</label><input id="f-carb" type="number" min="0" placeholder="g"/></div>
      <div class="field"><label for="f-fat">Fat (g)</label><input id="f-fat" type="number" min="0" placeholder="g"/></div>
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-size:.8rem;color:var(--text-muted);margin-bottom:14px;">
      <input id="f-save-lib" type="checkbox" style="width:auto;" checked/> Save to My Foods for reuse
    </label>
    <button class="btn btn-primary btn-block" id="add-food-btn">Add to log</button>
  `);

  sheet.querySelector("#meal-seg").addEventListener("click", (e)=>{
    const btn = e.target.closest("button[data-val]");
    if(!btn) return;
    meal = btn.getAttribute("data-val");
    sheet.querySelectorAll("#meal-seg button").forEach(b=>b.classList.toggle("is-active", b===btn));
  });

  function renderLibList(filter=""){
    const list = library.filter(f=>f.name.toLowerCase().includes(filter.toLowerCase()));
    const el = sheet.querySelector("#food-lib-list");
    if(list.length === 0){
      el.innerHTML = `<p class="faint" style="font-size:.78rem;padding:4px 2px;">${library.length? "No matches":"No saved foods yet — add one below"}</p>`;
      return;
    }
    el.innerHTML = list.map(f=>`
      <div class="list-row" data-lib="${f.id}" style="cursor:pointer;">
        <div class="list-row__icon">${icon("fork")}</div>
        <div class="list-row__body">
          <div class="list-row__title">${escapeHTML(f.name)}</div>
          <div class="list-row__meta">${fmt(f.kcal)} kcal · P${fmt(f.protein)} C${fmt(f.carb)} F${fmt(f.fat)}</div>
        </div>
        <div class="list-row__value">${icon("plus")}</div>
      </div>`).join("");
    el.querySelectorAll("[data-lib]").forEach(row=>{
      row.addEventListener("click", ()=>{
        const food = library.find(f=>f.id===row.getAttribute("data-lib"));
        addEntry({ name: food.name, kcal: food.kcal, protein: food.protein, carb: food.carb, fat: food.fat, meal });
      });
    });
  }
  renderLibList();
  sheet.querySelector("#food-search").addEventListener("input", (e)=>renderLibList(e.target.value));

  function addEntry({ name, kcal, protein, carb, fat, meal }){
    if(!name || !kcal){ showToast("Add a name and calories"); return; }
    const entry = { id: uid(), name, meal, kcal: Number(kcal)||0, protein: Number(protein)||0, carb: Number(carb)||0, fat: Number(fat)||0, time: new Date().toISOString() };
    const d = db.day(currentDate);
    d.calorieEntries.push(entry);
    db.saveDay(currentDate, d);

    if(sheet.querySelector("#f-save-lib") && sheet.querySelector("#f-save-lib").checked && sheet.querySelector("#f-name").value.trim()===name){
      const lib = db.foodLibrary();
      if(!lib.some(f=>f.name.toLowerCase()===name.toLowerCase())){
        lib.push({ id: uid(), name, kcal: entry.kcal, protein: entry.protein, carb: entry.carb, fat: entry.fat });
        db.saveFoodLibrary(lib);
      }
    }
    closeSheet();
    showToast("Added to log");
    renderFoodLogging(container);
  }

  sheet.querySelector("#add-food-btn").addEventListener("click", ()=>{
    addEntry({
      name: sheet.querySelector("#f-name").value.trim(),
      kcal: sheet.querySelector("#f-kcal").value,
      protein: sheet.querySelector("#f-protein").value,
      carb: sheet.querySelector("#f-carb").value,
      fat: sheet.querySelector("#f-fat").value,
      meal,
    });
  });
}
