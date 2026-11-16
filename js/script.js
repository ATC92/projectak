/* =========================================================
   Project AK · Catálogo web — interacciones
   ========================================================= */
document.documentElement.classList.add("js");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Mapa isométrico del hero ---------- */
(function buildIsoMap() {
  const svg = document.getElementById("iso-map");
  if (!svg) return;

  const NS = "http://www.w3.org/2000/svg";
  const N = 8;            // celdas por lado
  const HW = 20;          // medio ancho de una celda (32×16 escalado)
  const HH = 10;          // medio alto
  const CX = 200;         // centro horizontal
  const TOP = 30;         // esquina superior del mapa

  // Proyección isométrica: (columna, fila, altura) -> coordenadas SVG
  const P = (a, b, z = 0) => [CX + (a - b) * HW, TOP + (a + b) * HH - z];
  const pts = (...list) => list.map(p => p.join(",")).join(" ");
  const el = (tag, attrs = {}, parent = svg) => {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    parent.appendChild(node);
    return node;
  };

  // Rejilla
  const grid = el("g", { class: "iso-grid" });
  for (let k = 0; k <= N; k++) {
    const [x1, y1] = P(k, 0), [x2, y2] = P(k, N);
    const [x3, y3] = P(0, k), [x4, y4] = P(N, k);
    el("line", { x1, y1, x2, y2 }, grid);
    el("line", { x1: x3, y1: y3, x2: x4, y2: y4 }, grid);
  }

  // Jugador (celda naranja)
  const player = el("polygon", {
    class: "iso-player",
    points: pts(P(0, 0), P(1, 0), P(1, 1), P(0, 1)),
  });

  // Bloques (obstáculos)
  const boxes = [
    { i: 1, j: 2, w: 2, d: 1, h: 18 },
    { i: 4, j: 3, w: 1, d: 2, h: 18 },
  ];
  const blocked = new Set();
  boxes.forEach(({ i, j, w, d, h }) => {
    for (let a = i; a < i + w; a++) for (let b = j; b < j + d; b++) blocked.add(`${a},${b}`);
    const g = el("g", { class: "iso-box" });
    el("polygon", { class: "left",  points: pts(P(i, j + d), P(i + w, j + d), P(i + w, j + d, h), P(i, j + d, h)) }, g);
    el("polygon", { class: "right", points: pts(P(i + w, j), P(i + w, j + d), P(i + w, j + d, h), P(i + w, j, h)) }, g);
    el("polygon", { class: "top",   points: pts(P(i, j, h), P(i + w, j, h), P(i + w, j + d, h), P(i, j + d, h)) }, g);
  });

  // Cámara (región visible / culling)
  const CAM_W = 180, CAM_H = 112;
  const camera = el("rect", { class: "iso-camera", x: 0, y: 0, width: CAM_W, height: CAM_H });
  const label = el("text", { class: "iso-camera-label", x: 4, y: -4 });
  label.textContent = "Camera2D · culling";

  let pos = { i: 4, j: 6 };

  function render() {
    const [ox, oy] = P(0, 0);
    const [px, py] = P(pos.i, pos.j);
    player.style.transform = `translate(${px - ox}px, ${py - oy}px)`;

    // La cámara sigue al jugador, limitada al área del lienzo
    const cx = Math.min(Math.max(px - CAM_W / 2, 8), 400 - CAM_W - 8);
    const cy = Math.min(Math.max(py + HH - CAM_H / 2 - 18, 14), 200 - CAM_H - 4);
    camera.style.transform = `translate(${cx}px, ${cy}px)`;
    label.style.transform = `translate(${cx}px, ${cy}px)`;
  }

  function step() {
    const moves = [[1, 0], [-1, 0], [0, 1], [0, -1]]
      .map(([di, dj]) => ({ i: pos.i + di, j: pos.j + dj }))
      .filter(({ i, j }) => i >= 0 && j >= 0 && i < N && j < N && !blocked.has(`${i},${j}`));
    pos = moves[Math.floor(Math.random() * moves.length)];
    render();
  }

  render();
  if (!prefersReducedMotion) setInterval(step, 1400);
})();

/* ---------- Encabezado con sombra al desplazarse ---------- */
const header = document.getElementById("header");
const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

/* ---------- Enlace activo en la navegación ---------- */
const navLinks = [...document.querySelectorAll(".nav__link")];
const sections = navLinks
  .map(link => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

if ("IntersectionObserver" in window) {
  const navObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link =>
        link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`)
      );
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach(s => navObserver.observe(s));

  /* ---------- Aparición al hacer scroll ---------- */
  const revealObserver = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((node, idx) => {
    node.style.transitionDelay = `${(idx % 4) * 60}ms`;
    revealObserver.observe(node);
  });
} else {
  document.querySelectorAll(".reveal").forEach(n => n.classList.add("is-visible"));
}

/* ---------- Notificación breve ---------- */
const toast = document.getElementById("toast");
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

/* ---------- Copiar el código de ejemplo ---------- */
const copyBtn = document.querySelector(".code__copy");
const codeSample = document.getElementById("code-sample");
if (copyBtn && codeSample) {
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(codeSample.innerText);
      copyBtn.textContent = "¡Copiado!";
      showToast("Código copiado al portapapeles");
    } catch {
      copyBtn.textContent = "Error";
    }
    setTimeout(() => (copyBtn.textContent = "Copiar"), 1800);
  });
}

/* ---------- Selección de plan ---------- */
document.querySelectorAll("[data-plan]").forEach(btn => {
  btn.addEventListener("click", () => {
    const plan = btn.dataset.plan;
    const msg = plan === "Estudio"
      ? "Plan Estudio: te contactaremos para tu equipo."
      : `Elegiste el plan ${plan}.`;
    showToast(msg);
  });
});
