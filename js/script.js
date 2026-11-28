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

/* ---------- Pestañas y copiado del código de ejemplo ---------- */
const codeTabs = [...document.querySelectorAll(".code__tab")];
const codePanels = [...document.querySelectorAll(".code__body[data-panel]")];
codeTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    codeTabs.forEach(t => {
      const active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
    });
    codePanels.forEach(p => (p.hidden = p.dataset.panel !== tab.dataset.sample));
  });
});

const copyBtn = document.querySelector(".code__copy");
if (copyBtn) {
  copyBtn.addEventListener("click", async () => {
    const visible = codePanels.find(p => !p.hidden);
    try {
      await navigator.clipboard.writeText(visible ? visible.innerText : "");
      copyBtn.textContent = "¡Copiado!";
      showToast("Código copiado al portapapeles");
    } catch {
      copyBtn.textContent = "Error";
    }
    setTimeout(() => (copyBtn.textContent = "Copiar"), 1800);
  });
}

/* ---------- Menú móvil ---------- */
const menuBtn = document.querySelector(".menu-toggle");
const nav = document.getElementById("nav");
if (menuBtn && nav) {
  const setMenu = open => {
    nav.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  };
  menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", e => { if (e.key === "Escape") setMenu(false); });
}

/* ---------- Precio mensual / anual ---------- */
document.querySelectorAll("[data-billing]").forEach(btn => {
  btn.addEventListener("click", () => {
    const yearly = btn.dataset.billing === "anual";
    document.querySelectorAll("[data-billing]").forEach(b => {
      const active = b === btn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-monthly]").forEach(node => {
      node.textContent = yearly ? node.dataset.yearly : node.dataset.monthly;
    });
  });
});

/* ---------- Elegir plan: llena el formulario de registro ---------- */
const perfilSelect = document.getElementById("perfil");
document.querySelectorAll("[data-plan]").forEach(btn => {
  btn.addEventListener("click", () => {
    const plan = btn.dataset.plan;
    if (perfilSelect) perfilSelect.value = plan;
    showToast(plan === "Institución educativa"
      ? "Completa el registro como institución educativa."
      : `Elegiste el plan ${plan}. Completa tu registro.`);
  });
});

/* ---------- Formulario de registro ----------
   GitHub Pages no procesa formularios. Para recibir los registros, crea un
   formulario gratuito (por ejemplo en Formspree o Google Forms) y pega su
   URL de envío en FORM_ENDPOINT. Mientras esté vacío, el formulario solo
   valida los datos y muestra la confirmación. */
const FORM_ENDPOINT = "https://formspree.io/f/mdegvezo";

const form = document.getElementById("signup");
const formMsg = document.getElementById("signup-msg");
if (form) {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    formMsg.className = "signup__msg";
    let firstBad = null;
    form.querySelectorAll("input[required]").forEach(input => {
      const ok = input.type === "checkbox" ? input.checked : input.checkValidity() && input.value.trim() !== "";
      input.setAttribute("aria-invalid", String(!ok));
      if (!ok && !firstBad) firstBad = input;
    });
    if (firstBad) {
      formMsg.textContent = firstBad.type === "checkbox"
        ? "Acepta recibir correos para enviarte la descarga."
        : "Revisa tu nombre y correo.";
      formMsg.classList.add("is-error");
      firstBad.focus();
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    try {
      if (FORM_ENDPOINT) {
        const res = await fetch(FORM_ENDPOINT, {
          method: "POST",
          headers: { Accept: "application/json" },
          body: new FormData(form),
        });
        if (!res.ok) throw new Error(res.statusText);
      }
      formMsg.textContent = `¡Listo, ${data.nombre.split(" ")[0]}! Te enviaremos la Beta a ${data.correo}.`;
      formMsg.classList.add("is-ok");
      form.reset();
    } catch {
      formMsg.textContent = "No pudimos enviar tu registro. Intenta de nuevo en unos minutos.";
      formMsg.classList.add("is-error");
    }
  });
}

/* ---------- Ilustración de la cueva (sección "Hecho con Project AK") ---------- */
(function buildCave() {
  const g = document.getElementById("cave-floor");
  if (!g) return;
  const NS = "http://www.w3.org/2000/svg";
  const HW = 22, HH = 11, CX = 200, TOP = 34, N = 9;
  const P = (a, b, z = 0) => [CX + (a - b) * HW, TOP + (a + b) * HH - z];
  const pts = (...l) => l.map(p => p.join(",")).join(" ");
  const add = (tag, attrs) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    g.appendChild(n);
    return n;
  };
  // Piso con variación de tono, como un tileset de roca
  const tones = ["#141921", "#171d26", "#12161d"];
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
    add("polygon", { points: pts(P(a, b), P(a + 1, b), P(a + 1, b + 1), P(a, b + 1)),
      fill: tones[(a * 7 + b * 3) % 3], stroke: "#222a35", "stroke-width": 0.8 });
  }
  // Paredes de roca en el borde trasero
  const wall = (a, b, h, side) => {
    const [l, r] = side === "x" ? [P(a, b), P(a + 1, b)] : [P(a, b), P(a, b + 1)];
    add("polygon", { points: pts(l, r, [r[0], r[1] - h], [l[0], l[1] - h]),
      fill: side === "x" ? "#262e3a" : "#1e2530", stroke: "#2f3a48", "stroke-width": 0.8 });
  };
  for (let a = 0; a < N; a++) wall(a, 0, 26 + ((a * 5) % 3) * 6, "x");
  for (let b = 0; b < N; b++) wall(0, b, 26 + ((b * 7) % 3) * 6, "y");
  // Rocas
  [[3, 5, 12], [6, 2, 16], [7, 6, 10]].forEach(([a, b, h]) => {
    add("polygon", { points: pts(P(a, b + 1), P(a + 1, b + 1), P(a + 1, b + 1, h), P(a, b + 1, h)), fill: "#2a323e" });
    add("polygon", { points: pts(P(a + 1, b), P(a + 1, b + 1), P(a + 1, b + 1, h), P(a + 1, b, h)), fill: "#212833" });
    add("polygon", { points: pts(P(a, b, h), P(a + 1, b, h), P(a + 1, b + 1, h), P(a, b + 1, h)), fill: "#3a4452" });
  });
  // Antorcha
  const [tx, ty] = P(5.5, 4.5);
  add("rect", { x: tx - 1.5, y: ty - 22, width: 3, height: 22, fill: "#5b4a33" });
  add("circle", { cx: tx, cy: ty - 25, r: 4, fill: "#f5a623" });
  add("circle", { cx: tx, cy: ty - 26, r: 2, fill: "#ffe2a6" });
  // Personaje
  const [hx, hy] = P(4.5, 6.5);
  add("ellipse", { cx: hx, cy: hy, rx: 8, ry: 4, fill: "rgba(0,0,0,.45)" });
  add("rect", { x: hx - 5, y: hy - 20, width: 10, height: 16, rx: 3, fill: "#5fb8d4" });
  add("circle", { cx: hx, cy: hy - 25, r: 5, fill: "#e8ebf0" });
})();
