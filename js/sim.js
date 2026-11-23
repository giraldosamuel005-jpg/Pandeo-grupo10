/* Interfaz del simulador. */
(() => {
const P = Pandeo, $ = id => document.getElementById(id);
const fmt = (x, d = 1) => Number(x).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fill = (sel, items) => { const prev = sel.value; sel.innerHTML = items.map(v => `<option>${v}</option>`).join(""); if (items.includes(prev)) sel.value = prev; };
const num = el => {
  let v = parseFloat(el.value);
  if (!isFinite(v)) v = parseFloat(el.defaultValue);
  return Math.min(parseFloat(el.max), Math.max(parseFloat(el.min), v));
};
const apoyos = Object.keys(P.K_TEORICO), mats = Object.keys(P.MATERIALES), tipos = Object.keys(P.DIMS);
let diseno = false, tab = 0, ultimo = null;
const TK = () => diseno ? P.K_DISENO : P.K_TEORICO;
const esConcreto = () => $("mat").value.startsWith("Concreto");
const tabsEl = [...document.querySelectorAll("#tabs [role=tab]")], paneles = [...document.querySelectorAll(".tabpanel")];

function armarDims() {
  $("dimsBox").innerHTML = P.DIMS[$("tipo").value].map(([k, lab, mn, mx, st, def]) =>
    `<label class="f">${lab}<input type="number" inputmode="decimal" id="dim_${k}" min="${mn}" max="${mx}" step="${st}" value="${def}"></label>`).join("");
}
function armarMaterial() {
  const conc = esConcreto();
  $("steelBox").hidden = conc; $("concBox").hidden = !conc;
  if (conc) { fill($("modelo"), [P.MODELOS[2]]); return; }
  const veniaDeConcreto = $("modelo").options.length === 1;
  fill($("modelo"), P.MODELOS);
  if (veniaDeConcreto) $("modelo").value = P.MODELOS[0];
  const [E0, F0] = P.MATERIALES[$("mat").value], custom = $("mat").value === "Acero personalizado";
  $("E").value = E0; $("Fy").value = F0; $("E").disabled = $("Fy").disabled = !custom;
}
function setK(d) { diseno = d; $("kT").setAttribute("aria-pressed", !d); $("kD").setAttribute("aria-pressed", d); }
function setTab(n, foco) {
  tab = n;
  tabsEl.forEach((b, i) => { b.setAttribute("aria-selected", i === n); b.tabIndex = i === n ? 0 : -1; if (foco && i === n) b.focus(); });
  paneles.forEach((p, i) => { p.hidden = i !== n; });
}

/* ---------- Enlace con los datos ---------- */
function estado() {
  const q = new URLSearchParams();
  q.set("L", num($("L"))); q.set("k", diseno ? "d" : "t"); q.set("ap", apoyos.indexOf($("apoyo").value)); q.set("m", mats.indexOf($("mat").value));
  if (esConcreto()) { q.set("fc", num($("fc"))); q.set("bd", $("bd").value); }
  else { q.set("mod", P.MODELOS.indexOf($("modelo").value)); if (!$("E").disabled) { q.set("E", num($("E"))); q.set("Fy", num($("Fy"))); } }
  q.set("s", tipos.indexOf($("tipo").value));
  for (const [k] of P.DIMS[$("tipo").value]) q.set(k, num($("dim_" + k)));
  q.set("Pu", num($("Pu"))); q.set("rz", $("razon").value); q.set("pc", $("pct").value); q.set("ad", apoyos.indexOf($("apoyoD").value)); q.set("v", tab);
  return q;
}
function restaurar() {
  const q = new URLSearchParams(location.search);
  const pick = (key, arr, el) => { const v = arr[parseInt(q.get(key), 10)]; if (v !== undefined) el.value = v; };
  const val = (key, el) => { if (q.has(key) && isFinite(parseFloat(q.get(key)))) { el.value = parseFloat(q.get(key)); el.value = num(el); } };
  val("L", $("L")); if (q.get("k") === "d") setK(true);
  pick("ap", apoyos, $("apoyo")); pick("m", mats, $("mat")); armarMaterial();
  if (esConcreto()) { val("fc", $("fc")); val("bd", $("bd")); }
  else { pick("mod", P.MODELOS, $("modelo")); if (!$("E").disabled) { val("E", $("E")); val("Fy", $("Fy")); } }
  pick("s", tipos, $("tipo")); armarDims();
  for (const [k] of P.DIMS[$("tipo").value]) val(k, $("dim_" + k));
  val("Pu", $("Pu")); val("rz", $("razon")); val("pc", $("pct")); pick("ad", apoyos, $("apoyoD"));
  const v = parseInt(q.get("v"), 10); if (v >= 0 && v <= 4) setTab(v);
}

/* ---------- Gráficas ---------- */
function colores() {
  const s = getComputedStyle(document.documentElement), g = n => s.getPropertyValue(n).trim();
  return { fg: g("--fg"), muted: g("--muted"), grid: g("--grid"), line: g("--line"), el: g("--s1"), in: g("--s2"),
           ok: g("--ok"), danger: g("--danger"), panel: g("--panel"), sop: [g("--s1"), g("--s2"), g("--s3"), g("--s4")] };
}
function layout(c, xt, yt, o = {}) {
  const chico = window.innerWidth < 640;
  const eje = t => ({ title: { text: t, standoff: 10 }, gridcolor: c.grid, zerolinecolor: c.line, linecolor: c.line, automargin: true, fixedrange: chico,
                      tickfont: { family: "JetBrains Mono, monospace", size: 11, color: c.muted } });
  const { xaxis, yaxis, ...resto } = o;
  return { paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)", height: chico ? 430 : 500,
    font: { family: "SourceSans, Segoe UI, sans-serif", color: c.fg, size: 14 }, margin: { l: 56, r: 18, t: 40, b: 50 },
    legend: { orientation: "h", x: 0, y: -0.2, yanchor: "top" }, hoverlabel: { bgcolor: c.panel, bordercolor: c.line, font: { color: c.fg } },
    xaxis: { ...eje(xt), ...xaxis }, yaxis: { ...eje(yt), ...yaxis }, ...resto };
}
function dibujar(id, data, lay) {
  if (!window.Plotly) { $(id).textContent = "No se pudo cargar la librería de gráficas. Recargue la página."; return; }
  Plotly.react(id, data, lay, { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d"] });
}
const tabla = (cols, filas, hl = -1) => `<table><thead><tr>${cols.map((c, i) => `<th scope="col"${i ? ' class="n"' : ""}>${c}</th>`).join("")}</tr></thead><tbody>` +
  filas.map((f, j) => `<tr${j === hl ? ' class="hl"' : ""}>${f.map((v, i) => `<td${i ? ' class="n"' : ""}>${v}</td>`).join("")}</tr>`).join("") + "</tbody></table>";
const linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
const linea = (x, y, name, line) => ({ x, y, name, mode: "lines", line: { simplify: false, ...line } });
const barras = (x, y, color) => [{ type: "bar", x, y, text: y.map(v => fmt(v, 1)), textposition: "outside", cliponaxis: false, width: 0.55,
  marker: { color }, hovertemplate: "%{x}<br>Pcr = %{y:,.1f} kN<extra></extra>" }];
const partir = s => s.replace(" - ", "<br>").replace(" maciza", "<br>maciza").replace("Tubo ", "Tubo<br>");

function render() {
  const mat = $("mat").value, modelo = $("modelo").value, tipo = $("tipo").value, L = num($("L")), K = TK()[$("apoyo").value], Pu = num($("Pu"));
  let E, Fy;
  if (esConcreto()) {
    const c = P.concreto(num($("fc")), num($("bd"))); E = c.E; Fy = c.Fy;
    $("concNote").innerHTML = `Ec = ${fmt(c.Ec, 0)} MPa<br>E efectivo = ${fmt(E, 0)} MPa<br>0.85f'c = ${fmt(Fy, 2)} MPa`;
  } else { E = num($("E")); Fy = num($("Fy")); }
  const dims = Object.fromEntries(P.DIMS[tipo].map(([k]) => [k, num($("dim_" + k))]));
  $("kOut").textContent = K.toFixed(2); $("bdOut").textContent = (+$("bd").value).toFixed(2);
  $("razonOut").textContent = $("razon").value; $("pctOut").textContent = $("pct").value + " %";

  const otras = Object.entries(dims).filter(([k]) => k !== "t").map(([, v]) => v);
  const mal = "t" in dims && dims.t >= Math.min(...otras) / 2;
  $("errBox").hidden = !mal; $("results").hidden = mal; $("barra").hidden = mal;
  if (mal) { ultimo = null; return; }

  const R = P.resolver(tipo, dims, L * 1000, K, E, Fy, modelo);
  const chip = `<span class="chip ${R.elastico ? "el" : "in"}">${R.rango}</span>`;
  const m = (k, v, u = "") => `<div class="metric"><span class="k">${k}</span><span class="v">${v}${u && ` <small>${u}</small>`}</span></div>`;
  $("principal").innerHTML = `<div><span class="k">Carga crítica Pcr</span><span class="big">${fmt(R.Pcr, 1)} <small>kN</small></span></div>
    <div><span class="k">Esbeltez KL/r</span><span class="big">${fmt(R.lam, 1)}</span><span class="k">Esbeltez límite (transición): ${fmt(R.lamLim, 1)}</span></div>
    <div><span class="k">Rango de comportamiento</span>${chip}</div>`;
  $("metrics").innerHTML = m("Área A", fmt(R.A, 1), "mm²") + m("Inercia mínima I", fmt(R.I, 0), "mm⁴") + m("Radio de giro r", fmt(R.r, 2), "mm") + m("Esfuerzo crítico Fcr", fmt(R.Fcr, 2), "MPa");
  $("barra").innerHTML = `<b>${fmt(R.Pcr, 1)} kN</b><span>KL/r ${fmt(R.lam, 1)}</span>${chip}`;

  let msgs = "";
  if (Pu > 0) {
    const conc = esConcreto(), phi = conc ? 1 : 0.9, dc = Pu / (phi * R.Pcr);
    msgs += `<div class="msg info">Demanda/capacidad = Pu / (φ·Pcr) = ${fmt(Pu, 1)} / (${phi.toFixed(2)} × ${fmt(R.Pcr, 1)}) = <strong>${dc.toFixed(2)}</strong>. ` +
      (conc ? "Para concreto se compara solo con la carga crítica simplificada; no es una verificación de diseño." : dc > 1 ? "<strong>La demanda supera la capacidad</strong> (φ = 0.90)." : "La demanda no supera la capacidad (φ = 0.90).") + "</div>";
  }
  if (R.lam > 200) msgs += `<div class="msg warn">KL/r &gt; 200: supera el límite de esbeltez recomendado para miembros en compresión (NSR-10 F.2.5).</div>`;
  if (tipo.startsWith("Tubular")) msgs += `<p class="note">No se verifica pandeo local de las paredes del tubo (relación ancho/espesor).</p>`;
  $("msgs").innerHTML = msgs;

  const entradas = [["Longitud L (m)", L], ["Apoyo", $("apoyo").value], ["K", K], ["Material", mat], ["E (MPa)", +E.toFixed(1)], ["Fy o 0.85f'c (MPa)", +Fy.toFixed(2)],
    ["Modelo", modelo], ["Sección", tipo], ...P.DIMS[tipo].map(([k, lab]) => [lab, dims[k]]), ["Pu (kN)", Pu]];
  $("resumen").innerHTML = "<h2>Datos de entrada</h2>" + tabla(["Dato", "Valor"], entradas);
  ultimo = { entradas, R };

  const c = colores(), fcr = l => P.esfuerzoCritico(l, E, Fy, modelo);
  if (tab === 0) {
    const mx = Math.max(250, 1.2 * R.lam), x = linspace(5, mx, 600), vis = Math.min(R.lamLim, mx);
    dibujar("plot0", [
      linea(x, x.map(l => Math.PI ** 2 * E / l ** 2), "Hipérbola de Euler", { dash: "dash", color: c.el, width: 2 }),
      linea([0, mx], [Fy, Fy], "Fluencia / límite del material", { dash: "dot", color: c.danger, width: 2 }),
      linea(x, x.map(fcr), "Fcr del modelo", { color: c.fg, width: 3.5 }),
      { x: [R.lam], y: [R.Fcr], mode: "markers", name: "Columna analizada", marker: { size: 14, color: c.in, line: { width: 2, color: c.panel } } }
    ], layout(c, "Relación de esbeltez KL/r", "Esfuerzo (MPa)", { xaxis: { range: [0, mx], hoverformat: ".1f" }, yaxis: { range: [0, 1.3 * Fy], hoverformat: ".1f" }, hovermode: "x unified",
      shapes: [{ type: "rect", yref: "paper", x0: 0, x1: vis, y0: 0, y1: 1, fillcolor: c.in, opacity: 0.09, line: { width: 0 }, layer: "below" },
               { type: "rect", yref: "paper", x0: vis, x1: mx, y0: 0, y1: 1, fillcolor: c.el, opacity: 0.08, line: { width: 0 }, layer: "below" },
               { type: "line", yref: "paper", x0: R.lamLim, x1: R.lamLim, y0: 0, y1: 1, line: { dash: "dashdot", color: c.muted, width: 1.5 } }],
      annotations: [{ x: R.lam, y: R.Fcr, text: `Columna: ${fmt(R.Fcr, 1)} MPa`, arrowcolor: c.muted, arrowwidth: 1, arrowhead: 0, standoff: 9, ax: R.lam > 0.6 * mx ? -20 : 60, ay: -62, bgcolor: c.panel, borderpad: 3 },
                    { x: R.lamLim, y: 1, yref: "paper", yanchor: "bottom", text: `Transición = ${fmt(R.lamLim, 1)}`, showarrow: false },
                    { x: vis / 2, y: 0.02, yref: "paper", yanchor: "bottom", text: "Inelástico", showarrow: false },
                    { x: (vis + mx) / 2, y: 0.92, yref: "paper", yanchor: "bottom", text: "Elástico", showarrow: false }] }));
  } else if (tab === 1) {
    const f = Object.entries(TK()).map(([n, k]) => ({ n, k, r: P.resolver(tipo, dims, L * 1000, k, E, Fy, modelo) }));
    $("tbl1").innerHTML = tabla(["Apoyo", "K", "KL/r", "Fcr (MPa)", "Pcr (kN)", "Rango"], f.map(o => [o.n, o.k, fmt(o.r.lam, 1), fmt(o.r.Fcr, 2), fmt(o.r.Pcr, 1), o.r.rango]), apoyos.indexOf($("apoyo").value));
    dibujar("plot1", barras(f.map(o => partir(o.n)), f.map(o => o.r.Pcr), c.sop), layout(c, "", "Pcr (kN)", { xaxis: { showgrid: false } }));
  } else if (tab === 2) {
    const f = Object.entries(P.igualArea(R.A, +$("razon").value)).map(([n, [tp, dm]]) => ({ n, r: P.resolver(tp, dm, L * 1000, K, E, Fy, modelo) }));
    $("tbl2").innerHTML = tabla(["Geometría", "A (mm²)", "r (mm)", "KL/r", "Fcr (MPa)", "Pcr (kN)"], f.map(o => [o.n, fmt(o.r.A, 1), fmt(o.r.r, 2), fmt(o.r.lam, 1), fmt(o.r.Fcr, 2), fmt(o.r.Pcr, 1)]));
    dibujar("plot2", barras(f.map(o => partir(o.n)), f.map(o => o.r.Pcr), c.el), layout(c, "", "Pcr (kN)", { xaxis: { showgrid: false } }));
  } else if (tab === 3) {
    const x = linspace(0.3, Math.max(8, 1.5 * L), 250);
    dibujar("plot3", [...Object.entries(TK()).map(([n, k], i) => linea(x, x.map(l => fcr(k * l * 1000 / R.r) * R.A / 1000), `${n} (K=${k})`, { color: c.sop[i], width: 2.5 })),
      { x: [L], y: [R.Pcr], mode: "markers", name: "Caso actual", marker: { size: 12, color: c.fg, symbol: "x", line: { width: 2, color: c.panel } } }],
      layout(c, "Longitud L (m)", "Pcr (kN)", { hovermode: "x unified", xaxis: { hoverformat: ".2f" }, yaxis: { rangemode: "tozero", hoverformat: ",.1f" } }));
  } else {
    const Kd = TK()[$("apoyoD").value], Rd = P.resolver(tipo, P.escalarDims(tipo, dims, +$("pct").value), L * 1000, Kd, E, Fy, modelo);
    $("tbl4").innerHTML = tabla(["Parámetro", "Íntegra", "Dañada"], [["K", K, Kd], ["A (mm²)", fmt(R.A, 1), fmt(Rd.A, 1)], ["r (mm)", fmt(R.r, 2), fmt(Rd.r, 2)], ["KL/r", fmt(R.lam, 1), fmt(Rd.lam, 1)],
      ["Fcr (MPa)", fmt(R.Fcr, 2), fmt(Rd.Fcr, 2)], ["Pcr (kN)", fmt(R.Pcr, 1), fmt(Rd.Pcr, 1)], ["Rango", R.rango, Rd.rango]]);
    $("lossOut").textContent = fmt(100 * (1 - Rd.Pcr / R.Pcr), 1) + " %";
    const x = linspace(5, Math.max(250, 1.2 * Math.max(R.lam, Rd.lam)), 500);
    dibujar("plot4", [linea(x, x.map(fcr), "Curva Fcr", { color: c.fg, width: 3 }),
      { x: [R.lam], y: [R.Fcr], mode: "markers", name: "Íntegra", marker: { size: 14, color: c.ok, line: { width: 2, color: c.panel } } },
      { x: [Rd.lam], y: [Rd.Fcr], mode: "markers", name: "Dañada", marker: { size: 14, color: c.danger, symbol: "diamond", line: { width: 2, color: c.panel } } }],
      layout(c, "KL/r", "Fcr (MPa)", { xaxis: { rangemode: "tozero" }, yaxis: { range: [0, 1.3 * Fy] } }));
  }
}

/* ---------- Inicio y eventos ---------- */
fill($("apoyo"), apoyos); fill($("apoyoD"), apoyos); fill($("mat"), mats); fill($("tipo"), tipos);
setTab(0); restaurar();
let m0 = $("mat").value, t0 = $("tipo").value;
const form = $("entradas");
form.addEventListener("submit", e => e.preventDefault());
function actualizar() {
  if ($("mat").value !== m0) { m0 = $("mat").value; armarMaterial(); }
  if ($("tipo").value !== t0) { t0 = $("tipo").value; armarDims(); }
  render();
}
form.addEventListener("input", actualizar);
form.addEventListener("change", e => {
  if (e.target.type === "number") e.target.value = num(e.target);   // muestra el valor que realmente se usó
  actualizar();
});
["razon", "pct", "apoyoD"].forEach(id => $(id).addEventListener("input", render));
$("kT").addEventListener("click", () => { setK(false); render(); });
$("kD").addEventListener("click", () => { setK(true); render(); });
tabsEl.forEach((b, i) => {
  b.addEventListener("click", () => { setTab(i); render(); });
  b.addEventListener("keydown", e => { const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (d) { e.preventDefault(); setTab((i + d + 5) % 5, true); render(); } });
});
let tAviso;
const aviso = t => { $("aviso").textContent = t; clearTimeout(tAviso); tAviso = setTimeout(() => { $("aviso").textContent = ""; }, 4000); };
$("bLink").addEventListener("click", async () => {
  history.replaceState(null, "", "?" + estado());
  try { await navigator.clipboard.writeText(location.href); aviso("Enlace copiado"); } catch (e) { aviso("Copie el enlace de la barra de direcciones"); }
});
$("bCsv").addEventListener("click", () => {
  if (!ultimo) { aviso("Corrija los datos antes de descargar"); return; }
  const r = ultimo.R, es = v => typeof v === "number" ? String(v).replace(".", ",") : v;
  const filas = [["DATOS", ""], ...ultimo.entradas, ["RESULTADOS", ""], ["A (mm²)", +r.A.toFixed(2)], ["I mínima (mm⁴)", +r.I.toFixed(0)], ["r (mm)", +r.r.toFixed(3)], ["KL/r", +r.lam.toFixed(2)],
    ["Esbeltez límite", +r.lamLim.toFixed(2)], ["Fe Euler (MPa)", +r.Fe.toFixed(3)], ["Fcr (MPa)", +r.Fcr.toFixed(3)], ["Pcr (kN)", +r.Pcr.toFixed(3)], ["Rango", r.rango]];
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + filas.map(f => f.map(v => `"${es(v)}"`).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
  a.download = "pandeo_resultados.csv"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); aviso("Archivo CSV descargado");
});
$("bPrint").addEventListener("click", () => window.print());
new MutationObserver(render).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", render);
let rz, ancho = innerWidth;
addEventListener("resize", () => { if (innerWidth === ancho) return; ancho = innerWidth; clearTimeout(rz); rz = setTimeout(render, 150); });
render();
// Las leyendas se miden con la fuente definitiva
if (document.fonts) document.fonts.ready.then(() => { paneles.forEach((_, i) => { if ($("plot" + i)._fullLayout) Plotly.purge("plot" + i); }); render(); });
})();
