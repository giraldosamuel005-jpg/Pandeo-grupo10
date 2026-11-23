/* Cálculo de pandeo. Traducción directa de app_pandeo.py.
   Unidades internas: mm, N, MPa. Cargas en kN. */
const Pandeo = (() => {
  const PI = Math.PI;
  const K_TEORICO = { "Empotrado - Libre": 2.0, "Articulado - Articulado": 1.0,
                      "Empotrado - Articulado": 0.7, "Empotrado - Empotrado": 0.5 };
  const K_DISENO  = { "Empotrado - Libre": 2.1, "Articulado - Articulado": 1.0,
                      "Empotrado - Articulado": 0.8, "Empotrado - Empotrado": 0.65 };
  const MATERIALES = { "Acero A36 (Fy=250 MPa)": [200000, 250],
                       "Acero A572 Gr.50 (Fy=345 MPa)": [200000, 345],
                       "Acero personalizado": [200000, 250],
                       "Concreto reforzado (simplificado)": null };
  const MODELOS = ["NSR-10 F.2.5 (AISC 360)", "Euler-Johnson (parábola)", "Euler truncado en Fy"];
  // clave, etiqueta, mínimo, máximo, paso, valor inicial
  const DIMS = {
    "Rectangular maciza":        [["b", "b (mm)", 10, 1000, 5, 50], ["h", "h (mm)", 10, 1000, 5, 100]],
    "Circular maciza":           [["D", "Diámetro D (mm)", 10, 1000, 5, 100]],
    "Tubular circular (CHS)":    [["D", "Diámetro exterior D (mm)", 20, 1000, 5, 100], ["t", "Espesor t (mm)", 1, 50, 0.5, 5]],
    "Tubular rectangular (HSS)": [["b", "b exterior (mm)", 20, 1000, 5, 100], ["h", "h exterior (mm)", 20, 1000, 5, 150], ["t", "Espesor t (mm)", 1, 50, 0.5, 5]]
  };

  function propiedades(tipo, d) {
    let A, Ix, Iy;
    if (tipo === "Rectangular maciza") {
      A = d.b * d.h; Ix = d.b * d.h ** 3 / 12; Iy = d.h * d.b ** 3 / 12;
    } else if (tipo === "Circular maciza") {
      A = PI * d.D ** 2 / 4; Ix = Iy = PI * d.D ** 4 / 64;
    } else if (tipo === "Tubular circular (CHS)") {
      const Di = d.D - 2 * d.t;
      A = PI / 4 * (d.D ** 2 - Di ** 2); Ix = Iy = PI / 64 * (d.D ** 4 - Di ** 4);
    } else {
      const bi = d.b - 2 * d.t, hi = d.h - 2 * d.t;
      A = d.b * d.h - bi * hi;
      Ix = (d.b * d.h ** 3 - bi * hi ** 3) / 12;
      Iy = (d.h * d.b ** 3 - hi * bi ** 3) / 12;
    }
    const I = Math.min(Ix, Iy);            // el pandeo ocurre por el eje débil
    return { A, Ix, Iy, I, r: Math.sqrt(I / A) };
  }

  function esfuerzoCritico(lam, E, Fy, modelo) {
    lam = Math.max(lam, 1e-6);
    const Fe = PI ** 2 * E / lam ** 2;
    if (modelo === MODELOS[2]) return Math.min(Fe, Fy);
    if (modelo === MODELOS[1]) {
      const Cc = Math.sqrt(2 * PI ** 2 * E / Fy);
      return lam <= Cc ? Fy * (1 - lam ** 2 / (2 * Cc ** 2)) : Fe;
    }
    const lim = 4.71 * Math.sqrt(E / Fy);
    return lam <= lim ? Fy * 0.658 ** (Fy / Fe) : 0.877 * Fe;
  }

  function esbeltezLimite(E, Fy, modelo) {
    if (modelo === MODELOS[2]) return PI * Math.sqrt(E / Fy);
    if (modelo === MODELOS[1]) return Math.sqrt(2 * PI ** 2 * E / Fy);
    return 4.71 * Math.sqrt(E / Fy);
  }

  function resolver(tipo, dims, Lmm, K, E, Fy, modelo) {
    const p = propiedades(tipo, dims);
    const lam = K * Lmm / p.r, lamLim = esbeltezLimite(E, Fy, modelo);
    const Fcr = esfuerzoCritico(lam, E, Fy, modelo);
    const elastico = lam > lamLim;
    return { ...p, lam, lamLim, Fcr, Fe: PI ** 2 * E / lam ** 2, Pcr: Fcr * p.A / 1000, elastico,
             rango: elastico ? "Elástico (Euler)" : "Inelástico / fluencia" };
  }

  function escalarDims(tipo, d, pct) {
    const f = 1 - pct / 100;
    if (tipo.startsWith("Tubular")) return { ...d, t: d.t * f };
    return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v * f]));
  }

  function igualArea(A0, razon) {
    const a = Math.sqrt(A0), m = Math.sqrt(A0 / 2);
    const tc = Math.sqrt(A0 / (PI * (razon - 1))), th = Math.sqrt(A0 / (4 * (razon - 1)));
    return {
      "Cuadrada maciza": ["Rectangular maciza", { b: a, h: a }],
      "Rectangular 1:2 maciza": ["Rectangular maciza", { b: m, h: 2 * m }],
      "Circular maciza": ["Circular maciza", { D: Math.sqrt(4 * A0 / PI) }],
      "Tubo circular": ["Tubular circular (CHS)", { D: razon * tc, t: tc }],
      "Tubo cuadrado": ["Tubular rectangular (HSS)", { b: razon * th, h: razon * th, t: th }]
    };
  }

  function concreto(fc, bd) {
    const Ec = 3900 * Math.sqrt(fc);
    return { Ec, E: 0.4 * Ec / (1 + bd), Fy: 0.85 * fc };
  }

  return { K_TEORICO, K_DISENO, MATERIALES, MODELOS, DIMS, propiedades, esfuerzoCritico,
           esbeltezLimite, resolver, escalarDims, igualArea, concreto };
})();
