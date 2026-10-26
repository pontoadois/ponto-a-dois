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
    check: "M20 6 9 17l-5-5",
    lock: "M7 11V7a5 5 0 0 1 10 0v4 M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z",
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

    // Plano e nomes: a seção "Jogo livre" mostra a coroa nas categorias premium e já traz o nome do perfil
    const p = auth().getProfile && auth().getProfile();
    app().setPremium(plan.premium);
    app().prefillPlayers(p && p.display_name ? p.display_name.split(" ")[0] : "", p && p.gender);

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
      b.addEventListener("click", () => { app().applyPlay({ categories: r.cats, mode: r.mode }); app().play(r.mode); });
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

  /* ---------- Meu plano ---------- */
  const FREE_FEAT = [[1, "Cartas do nível Leve"], [1, "Sequência diária"], [0, "Níveis Picante e Intenso"], [0, "Categoria Posições"], [0, "Noite de Encontro"]];
  const PAID_FEAT = [[1, "Todas as categorias e níveis"], [1, "Noite de Encontro completa"], [1, "Posições com ilustrações"]];

  function renderPlano() {
    const paid = plan.premium;
    $("#myPlanName").textContent = paid ? "Premium" : "Gratuito";
    const badge = $("#myPlanBadge");
    badge.textContent = paid ? "Ativa" : "R$ 0";
    badge.classList.toggle("is-ok", paid);
    $("#myPlanFeat").innerHTML = (paid ? PAID_FEAT : FREE_FEAT)
      .map(([on, t]) => `<li class="${on ? "is-on" : "is-off"}">${svg(on ? "check" : "lock", 18, 2.2)}<span>${t}</span></li>`).join("");
    $("#myPlanFree").hidden = paid;
    $("#myPlanActions").hidden = !paid;
    const info = $("#myPlanInfo");
    info.hidden = !paid;
    if (paid) {
      const until = plan.until ? new Date(plan.until).toLocaleDateString("pt-BR") : "";
      info.innerHTML = `<div class="plan-kv"><span>Situação</span><b>Assinatura ativa</b></div>` +
        (until ? `<div class="plan-kv"><span>Acesso garantido até</span><b>${until}</b></div>` : "");
    }
  }

  /* ---------- Parabéns pelo dia (uma vez por dia, ao entrar) ---------- */
  const WELCOME_KEY = "ponto-a-dois-welcome-day";
  let welcomedDay = null;
  const spToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  async function maybeWelcome() {
    const a = auth();
    if (!a || !a.getSession || !a.getSession()) return;
    const day = spToday();
    let seen = null;
    try { seen = localStorage.getItem(WELCOME_KEY); } catch { /* ignore */ }
    if (seen === day || welcomedDay === day) return;
    welcomedDay = day;
    await a.registerPlay(); // entrar no app já conta o dia na sequência
    let fresh = null;
    try { fresh = await a.getStreak(); } catch { /* ignore */ }
    if (!fresh) return; // sem conexão: não mostra nada e tenta de novo na próxima vez
    streak = fresh;
    try { localStorage.setItem(WELCOME_KEY, day); } catch { /* ignore */ }
    renderInicio();
    const n = streak.current || 1;
    $("#welTitle").textContent = n === 1 ? "Sequência iniciada!" : "Parabéns!";
    $("#welSub").textContent = n === 1 ? "Hoje é o primeiro dia. Voltem amanhã para continuar." : "Mais um dia com o Ponto a Dois.";
    $("#welNum").textContent = n;
    $("#welLbl").textContent = n === 1 ? "dia seguido" : "dias seguidos";
    $("#welWeek").innerHTML = weekHtml();
    app().openModal("welcome");
    const ok = $("#welOk");
    if (ok) ok.focus();
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
    inicio: async () => { markNav("inicio"); await load(); renderInicio(); maybeWelcome(); },
    streak: hook("streak", renderStreak),
    perfil: hook("perfil", renderPerfil),
    profile: hook("profile", renderProfile),
    plano: hook("plano", renderPlano),
    planos: hook("planos", renderPlanos),
  };

  document.addEventListener("DOMContentLoaded", () => {
    bindPlans();
    $("#profileForm").addEventListener("submit", saveProfile);
    $("#rowProfile").addEventListener("click", () => app().goTo("profile"));
    $("#rowPlan").addEventListener("click", () => app().goTo("plano"));
    $$("[data-soon]").forEach((b) => b.addEventListener("click", () => app().showToast("Disponível em breve, junto com o pagamento.")));
    $("#rowLogout").addEventListener("click", () => auth().signOut());
    $("#rowDelete").addEventListener("click", () => app().openModal("delete"));
    $("#delConfirm").addEventListener("click", confirmDelete);
    $("#recoPlay").addEventListener("click", () => {
      app().play("noite", D.categories.map((c) => c.id));
    });
  });
})();
