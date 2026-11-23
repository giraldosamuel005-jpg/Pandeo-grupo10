/* Tema claro/oscuro y funcionamiento sin conexión. */
(() => {
  const root = document.documentElement, btn = document.getElementById("tema");
  const oscuro = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const pintar = () => { if (btn) btn.textContent = oscuro() ? "Modo claro" : "Modo oscuro"; };
  if (btn) btn.addEventListener("click", () => {
    root.dataset.theme = oscuro() ? "light" : "dark";
    try { localStorage.setItem("tema", root.dataset.theme); } catch (e) {}
    pintar();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", pintar);
  pintar();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
