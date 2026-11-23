/* Las cuatro columnas de la portada, con su forma real de pandeo. */
(() => {
  const E = 200000, Fy = 250, dims = { D: 100, t: 5 }, tipo = "Tubular circular (CHS)";
  const z = 4.493409458;                    // raíz de tan(z) = z
  const formas = {
    "Empotrado - Libre": x => 1 - Math.cos(Math.PI * x / 2),
    "Articulado - Articulado": x => Math.sin(Math.PI * x),
    "Empotrado - Articulado": x => Math.sin(z * x) - z * Math.cos(z * x) + z * (1 - x),
    "Empotrado - Empotrado": x => (1 - Math.cos(2 * Math.PI * x)) / 2
  };
  const hatch = (y, s) => `<path d="M26 ${y}h48" class="ap"/>` + [0, 1, 2, 3, 4].map(i => `<path d="M${30 + i * 10} ${y}l${-7 * s} ${8 * s}"/>`).join("");
  const pin = (y, s) => `<path d="M50 ${y}l-10 ${14 * s}h20z" class="pin"/><circle cx="50" cy="${y}" r="3.5" class="nudo"/>`;
  const slider = document.getElementById("hl"), cont = document.getElementById("columnas");
  function render() {
    const L = parseFloat(slider.value);
    document.getElementById("hlOut").textContent = L.toFixed(1) + " m";
    cont.innerHTML = Object.entries(Pandeo.K_TEORICO).map(([n, K]) => {
      const R = Pandeo.resolver(tipo, dims, L * 1000, K, E, Fy, Pandeo.MODELOS[0]);
      const y0 = 270, H = 100 + 120 * L / 8, f = formas[n], xs = Array.from({ length: 61 }, (_, i) => i / 60);
      const max = Math.max(...xs.map(x => Math.abs(f(x))));
      const pts = xs.map(x => `${(50 + 22 * f(x) / max).toFixed(2)},${(y0 - H * x).toFixed(2)}`).join(" ");
      const [ab, ar] = n.split(" - "), yt = y0 - H, xt = ar === "Libre" ? 72 : 50, dy = ar === "Articulado" ? 38 : ar === "Empotrado" ? 30 : 24;
      return `<figure><svg viewBox="0 0 100 290" role="img" aria-label="${n}, K = ${K}">
        <path d="M50 ${y0}V${yt}" class="eje"/>${ab === "Empotrado" ? hatch(y0, 1) : pin(y0, 1)}
        <polyline points="${pts}" class="col ${R.elastico ? "el" : "in"}"/>
        ${ar === "Empotrado" ? hatch(yt, -1) : ar === "Articulado" ? pin(yt, -1) : ""}
        <path d="M${xt} ${yt - dy}v18m-4 -6l4 6l4 -6" class="carga"/></svg>
        <figcaption><b>${n.replace(" - ", " – ")}</b><span>K = ${K} · KL/r = ${R.lam.toFixed(0)}</span>
        <strong>${R.Pcr.toFixed(0)} kN</strong><span class="chip ${R.elastico ? "el" : "in"}">${R.elastico ? "Elástico" : "Inelástico"}</span></figcaption></figure>`;
    }).join("");
  }
  slider.addEventListener("input", render);
  render();
})();
