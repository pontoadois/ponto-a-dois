/* ============================================================
   PONTO A DOIS — TELAS DO APLICATIVO
   Início, Sequência, Perfil, Gerenciar perfil e Seja Premium.
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const D = window.EntreNosData;
  const auth = () => window.EntreNosAuth;
  const app = () => window.EntreNosApp;

  const PATHS = {
    flame: "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4",
    crown: "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z M5 21h14",
    heart: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z",
    calendar: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    card: "M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z M2 10h20",
  };
  const svg = (k, s = 22, sw = 1.9, fill = "none") =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[k]}"/></svg>`;

  let streak = null;
  let plan = { premium: false };

  const nameOf = () => {
    const p = auth().getProfile && auth().getProfile();
    const s = auth().getSession && auth().getSession();
    return (p && p.display_name) || (s && s.user.email.split("@")[0]) || "você";
  };
  const initialOf = () => nameOf().trim().charAt(0).toUpperCase() || "P";

  async function load() {
    const a = auth();
    if (!a || !a.getSession || !a.getSession()) return;
    try {
      [streak, plan] = await Promise.all([a.getStreak(), a.getPlan()]);
    } catch { /* sem conexão: mostra o que tiver */ }
  }

  /* ---------- Semana (domingo a sábado) ---------- */
  const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  function weekHtml() {
    const today = (streak && streak.today) || new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const played = new Set((streak && streak.week) || []);
    const base = new Date(today + "T12:00:00");
    const dow = base.getDay();
    return DOW.map((name, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - dow + i);
      const iso = d.toISOString().slice(0, 10);
      const cls = played.has(iso) ? "is-on" : iso === today ? "is-today" : "";
      const icon = played.has(iso) || iso === today ? svg("flame", 20, 1.9, played.has(iso) ? "rgba(255,247,255,.3)" : "none") : "";
      return `<div class="wk-day ${cls}"><span class="wk-dot">${icon}</span>${name}</div>`;
    }).join("");
  }

  /* ---------- Início ---------- */
  function renderInicio() {
    $("#helloName").textContent = "Olá, " + nameOf();
    $("#avatarInitial").textContent = initialOf();
    $("#navAvatar").textContent = initialOf();
    $("#streakNow").textContent = (streak && streak.current) || 0;
    $("#weekHome").innerHTML = weekHtml();
    $("#premiumHome").hidden = plan.premium;

    const grid = $("#gameGrid");
    grid.innerHTML = "";
    D.categories.forEach((cat) => {
      const lock = !plan.premium && D.premiumCats.includes(cat.id);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "game-tile";
      b.innerHTML = `<span class="game-top"><span class="game-ico">${cat.icon}</span>${lock ? `<span class="game-crown" title="Parte do conteúdo é premium">${svg("crown", 16)}</span>` : ""}</span>
        <span class="game-name">${cat.name}</span><span class="game-sub">${cat.sub || ""}</span>`;
      b.addEventListener("click", () => { app().applyPlay({ categories: [cat.id], mode: "livre" }); app().navigate("setup"); });
      grid.appendChild(b);
    });

    const recents = app().getRecent();
    $("#recentWrap").hidden = !recents.length;
    const list = $("#recentList");
    list.innerHTML = "";
    recents.forEach((r) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "recent-item";
      b.innerHTML = `<span>${svg("heart", 22)}</span><span class="recent-name"></span>`;
      $(".recent-name", b).textContent = r.label;
      b.addEventListener("click", () => { app().applyPlay({ categories: r.cats, mode: r.mode }); app().navigate("setup"); });
      list.appendChild(b);
    });
  }

  /* ---------- Sequência ---------- */
  function renderStreak() {
    const n = (streak && streak.current) || 0;
    $("#streakBig").textContent = n;
    $("#streakLbl").textContent = n === 1 ? "dia seguido" : "dias seguidos";
    $("#weekBig").innerHTML = weekHtml();
    const stats = [
      [(streak && streak.best) || 0, "Sequência mais longa", "flame"],
      [(streak && streak.month_days) || 0, "Dias jogados neste mês", "heart"],
      [(streak && streak.total_days) || 0, "Dias jogados no total", "calendar"],
    ];
    $("#statList").innerHTML = stats.map(([v, l, k]) => `<div class="stat"><span class="stat-ico">${svg(k, 24)}</span><span class="stat-lbl">${l}</span><span class="stat-val">${v}</span></div>`).join("");
  }

  /* ---------- Perfil ---------- */
  function renderPerfil() {
    $("#profAvatar").textContent = initialOf();
    $("#navAvatar").textContent = initialOf();
    $("#profName").textContent = nameOf();
    $("#profPlan").textContent = plan.premium ? "Premium" : "Plano gratuito";
    $("#premiumProf").hidden = plan.premium;
    $("#rowPlan small").textContent = plan.premium ? "Premium" : "Gratuito";
  }

  function renderProfile() {
    const p = auth().getProfile();
    const s = auth().getSession();
    $("#pfName").value = (p && p.display_name) || "";
    $("#pfEmail").value = s ? s.user.email : "";
    if (p && p.birth_date) {
      const [y, m, d] = p.birth_date.split("-");
      $("#pfBirth").value = `${d}/${m}/${y}`;
    }
    $("#pfError").hidden = true;
  }

  async function saveProfile(e) {
    e.preventDefault();
    const err = $("#pfError");
    const name = $("#pfName").value.trim();
    err.hidden = true;
    if (name.length < 2) { err.textContent = "Escreva pelo menos 2 letras."; err.hidden = false; return; }
    const btn = $("#pfSave");
    btn.disabled = true;
    const ok = await auth().saveName(name);
    btn.disabled = false;
    if (!ok) { err.textContent = "Não foi possível salvar agora. Tente de novo."; err.hidden = false; return; }
    app().showToast("Perfil atualizado.");
    app().goTo("perfil");
  }

  /* ---------- Excluir conta ---------- */
  async function confirmDelete() {
    const err = $("#delError");
    const btn = $("#delConfirm");
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = "Excluindo…";
    const ok = await auth().deleteAccount();
    btn.disabled = false;
    btn.textContent = "Excluir definitivamente";
    if (!ok) { err.textContent = "Não foi possível excluir agora. Tente de novo ou escreva para o suporte."; err.hidden = false; return; }
    app().closeModal();
    app().goTo("home");
    app().showToast("Conta excluída.");
  }

  /* ---------- Planos ---------- */
  function bindPlans() {
    $$(".plan-opt").forEach((opt) => {
      opt.addEventListener("click", () => {
        $$(".plan-opt").forEach((o) => { o.classList.toggle("is-selected", o === opt); o.setAttribute("aria-checked", o === opt ? "true" : "false"); });
      });
    });
    // O pagamento entra na etapa da Stripe
    $("#plansContinue").addEventListener("click", () => app().showToast("O pagamento ficará disponível em breve."));
  }

  function renderPlanos() {
    const a = $(".plans-fan");
    if (a && !a.innerHTML) {
      const get = (id) => D.categories.find((c) => c.id === id);
      const card = (c, cls) => `<div class="fan-card ${cls}">${c.icon}<span>${c.name}</span></div>`;
      a.innerHTML = card(get("diversao"), "fan-card--l") + card(get("intimidade"), "fan-card--r") + card(get("conexao"), "fan-card--c");
    }
  }

  /* ---------- Barra de navegação: item atual ---------- */
  function markNav(screen) {
    $$("#appNav [data-nav]").forEach((b) => {
      if (b.dataset.nav === screen) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
    });
  }

  function hook(screen, fn) {
    return async () => {
      markNav(screen === "profile" ? "perfil" : screen);
      await load();
      fn();
    };
  }

  window.EntreNosHooks = {
    inicio: hook("inicio", renderInicio),
    streak: hook("streak", renderStreak),
    perfil: hook("perfil", renderPerfil),
    profile: hook("profile", renderProfile),
    planos: hook("planos", renderPlanos),
  };

  document.addEventListener("DOMContentLoaded", () => {
    bindPlans();
    $("#profileForm").addEventListener("submit", saveProfile);
    $("#rowProfile").addEventListener("click", () => app().goTo("profile"));
    $("#rowPlan").addEventListener("click", () => app().goTo("planos"));
    $("#rowPrefs").addEventListener("click", () => app().navigate("setup"));
    $("#rowLogout").addEventListener("click", () => auth().signOut());
    $("#rowDelete").addEventListener("click", () => app().openModal("delete"));
    $("#delConfirm").addEventListener("click", confirmDelete);
    $("#recoPlay").addEventListener("click", () => {
      app().applyPlay({ categories: D.categories.map((c) => c.id), mode: "noite" });
      app().navigate("setup");
    });
  });
})();
