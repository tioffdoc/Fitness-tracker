import { round } from "./utils.js";

let uidCounter = 0;

/**
 * Renders a "flowsheet" style line chart as an SVG string.
 * points: [{ label: string, value: number|null }]
 * opts: { width, height, unit, showMovingAvg: [values]|null, padTop, padBottom }
 */
export function lineChartSVG(points, opts={}){
  const width = opts.width || 320;
  const height = opts.height || 130;
  const padL = 6, padR = 6, padT = 14, padB = 20;
  const w = width - padL - padR;
  const h = height - padT - padB;
  const gid = "chartFill" + (uidCounter++);

  const vals = points.map(p=>p.value).filter(v=>v!=null);
  if(vals.length === 0){
    return `<div class="chart-empty">No data yet for this range</div>`;
  }
  let min = Math.min(...vals), max = Math.max(...vals);
  if(min === max){ min -= 1; max += 1; }
  const span = max - min;
  min -= span*0.12; max += span*0.12;

  const n = points.length;
  const xAt = i => padL + (n===1 ? w/2 : (w * i/(n-1)));
  const yAt = v => padT + h - ((v-min)/(max-min))*h;

  // build path skipping nulls as gaps
  let d = "", started = false;
  const coords = [];
  points.forEach((p,i)=>{
    if(p.value == null){ started = false; coords.push(null); return; }
    const x = xAt(i), y = yAt(p.value);
    coords.push([x,y]);
    d += (started ? " L " : "M ") + x.toFixed(1) + " " + y.toFixed(1);
    started = true;
  });

  // area path (close to bottom)
  let areaD = "";
  let firstX = null, lastX = null;
  coords.forEach((c,i)=>{
    if(!c) return;
    if(firstX===null) firstX = c[0];
    lastX = c[0];
  });
  if(firstX!=null){
    areaD = `M ${firstX.toFixed(1)} ${(padT+h).toFixed(1)} `;
    coords.forEach((c)=>{ if(c) areaD += `L ${c[0].toFixed(1)} ${c[1].toFixed(1)} `; });
    areaD += `L ${lastX.toFixed(1)} ${(padT+h).toFixed(1)} Z`;
  }

  // gridlines (3 horizontal)
  let grid = "";
  for(let i=0;i<=2;i++){
    const y = padT + (h*i/2);
    grid += `<line class="chart-grid-line" x1="${padL}" y1="${y.toFixed(1)}" x2="${padL+w}" y2="${y.toFixed(1)}"/>`;
  }

  // moving average overlay
  let avgPath = "";
  if(opts.showMovingAvg){
    let started2 = false, d2 = "";
    opts.showMovingAvg.forEach((v,i)=>{
      if(v==null){ started2=false; return; }
      const x = xAt(i), y = yAt(v);
      d2 += (started2 ? " L " : "M ") + x.toFixed(1) + " " + y.toFixed(1);
      started2 = true;
    });
    avgPath = `<path d="${d2}" fill="none" style="stroke:var(--text-faint)" stroke-width="1.6" stroke-dasharray="3 3" stroke-linecap="round"/>`;
  }

  // x-axis labels: show ~4 evenly spaced
  const labelCount = Math.min(4, n);
  let xLabels = "";
  if(n > 1){
    for(let i=0;i<labelCount;i++){
      const idx = Math.round(i * (n-1) / (labelCount-1 || 1));
      const x = xAt(idx);
      const anchor = idx===0 ? "start" : idx===n-1 ? "end" : "middle";
      xLabels += `<text class="chart-axis-label" x="${x.toFixed(1)}" y="${height-4}" text-anchor="${anchor}">${points[idx].label}</text>`;
    }
  }

  // last valid dot
  let dot = "";
  for(let i=coords.length-1;i>=0;i--){
    if(coords[i]){ dot = `<circle class="chart-dot" cx="${coords[i][0].toFixed(1)}" cy="${coords[i][1].toFixed(1)}" r="3"/>`; break; }
  }

  return `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="trend chart">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" style="stop-color:var(--accent);stop-opacity:0.35"/>
        <stop offset="100%" style="stop-color:var(--accent);stop-opacity:0"/>
      </linearGradient>
    </defs>
    ${grid}
    <path d="${areaD}" fill="url(#${gid})" opacity="0.6"/>
    ${avgPath}
    <path d="${d}" class="chart-line"/>
    ${dot}
    ${xLabels}
  </svg>`;
}

export function renderChartCard({ title, points, latestLabel, unit, showMovingAvg }){
  const svg = lineChartSVG(points, { showMovingAvg, width: 320, height: 130 });
  return `
    <div class="chart-card">
      <div class="chart-card__head">
        <span class="chart-card__title">${title}</span>
        <span class="chart-card__latest tabular">${latestLabel||""}</span>
      </div>
      ${svg}
    </div>`;
}
