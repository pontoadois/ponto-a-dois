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
    heartFill: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z",
    card: "M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z M2 10h20",
    check: "M20 6 9 17l-5-5",
    lock: "M7 11V7a5 5 0 0 1 10 0v4 M5 11h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z",
  };
  const svg = (k, s = 22, sw = 1.9, fill = "none") =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${PATHS[k]}"/></svg>`;

  let streak = null;
  let game = null; // pontos, moedas, termômetro e bloqueios (vêm do servidor)
  let plan = { premium: false };

  const nameOf = () => {
    const p = auth().getProfile && auth().getProfile();
    const s = auth().getSession && auth().getSession();
    return (p && p.display_name) || (s && s.user.email.split("@")[0]) || "você";
  };
  const initialOf = () => nameOf().trim().charAt(0).toUpperCase() || "P";

  // Mostra a foto de perfil (ou a inicial do nome) em todos os avatares
  function paintAvatars() {
    const a = auth();
    const url = (a.getAvatarUrl && a.getAvatarUrl()) || "";
    const letter = initialOf();
    [["#avatarInitial", true], ["#navAvatar", false], ["#profAvatar", false], ["#pfAvatarText", true]].forEach(([sel, inner]) => {
      const el = $(sel);
      if (!el) return;
      const box = inner ? el.parentElement : el;
      box.style.backgroundImage = url ? `url("${url}")` : "";
      el.textContent = url ? "" : letter;
    });
    const nn = $("#navName");
    if (nn) nn.textContent = nameOf();
    const rm = $("#pfPhotoRemove");
    if (rm) rm.hidden = !url;
  }

  async function load() {
    const a = auth();
    if (!a || !a.getSession || !a.getSession()) return;
    try {
      [streak, plan, game] = await Promise.all([a.getStreak(), a.getPlan(), a.getGame ? a.getGame() : null]);
    } catch { /* sem conexão: mostra o que tiver */ }
  }

  /* ---------- Semana (domingo a sábado) ---------- */
  const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  function weekHtml(home) {
    const today = (streak && streak.today) || new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const played = new Set((streak && streak.week) || []);
    const base = new Date(today + "T12:00:00");
    const dow = base.getDay();
    return DOW.map((name, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - dow + i);
      const iso = d.toISOString().slice(0, 10);
      let cls = played.has(iso) ? "is-on" : iso === today ? "is-today" : "";
      let icon = played.has(iso) || iso === today ? svg("flame", 20, 1.9, played.has(iso) ? "rgba(255,247,255,.3)" : "none") : "";
      if (home) {
        // Início: check nos dias em que jogaram; coração e destaque no dia de hoje
        if (iso === today) { cls = "is-today"; icon = svg("heartFill", 20, 1.9, "currentColor"); }
        else if (played.has(iso)) icon = svg("check", 20, 2.6);
      }
      return `<div class="wk-day ${cls}"><span class="wk-dot">${icon}</span>${name}</div>`;
    }).join("");
  }

  /* ---------- Início ---------- */
  function renderInicio() {
    $("#helloName").textContent = "Olá, " + nameOf();
    paintAvatars();
    $("#streakNow").textContent = (streak && streak.current) || 0;
    $("#weekHome").innerHTML = weekHtml(true);
    const nDays = ((streak && streak.week) || []).length;
    $("#weekLinkSub").textContent = nDays ? `${nDays} ${nDays === 1 ? "dia" : "dias"} de conexão nesta semana` : "Comecem a sequência de vocês";
    $("#premiumHome").hidden = plan.premium;

    // Plano e nomes: a seção "Jogo livre" mostra a coroa nas categorias premium e já traz o nome do perfil
    const p = auth().getProfile && auth().getProfile();
    app().setPremium(plan.premium);
    app().prefillPlayers(p && p.display_name ? p.display_name.split(" ")[0] : "", p && p.gender, p && p.spouse_name);
    renderHeat();

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

  /* ---------- Termômetro, pontos e moedas ---------- */
  const STAGES = ["Casal Próspero", "Companheiros de Aliança", "Intimidade Fortalecida"];

  function heatMessage(g) {
    if (!g.points && !g.heat) return "Comecem a jogar para esquentar o termômetro.";
    if (g.heat >= 70) return "Em chamas! Vocês estão em sintonia.";
    if (g.heat >= 40) return "Quentinho: vocês têm jogado juntos.";
    if (g.heat > 10) return "Esfriando um pouco. Que tal reacender hoje?";
    return "Está frio por aqui, mas uma Conexão Rápida reacende em 5 minutos.";
  }

  const STAGE_INFO = [
    ["Casal Próspero", "O começo da jornada: vocês estão construindo o hábito de se encontrar."],
    ["Companheiros de Aliança", "Constância e cumplicidade: o carinho de cada dia fortalece a aliança."],
    ["Intimidade Fortalecida", "Conexão profunda: a confiança e o desejo crescendo juntos."],
  ];

  function renderHeat() {
    const g = game;
    $("#heatCard").hidden = !g;
    $(".exp-card--quick").hidden = !g; // a Noite de Encontro não depende do servidor de pontos e fica sempre visível
    $("#secretCard").hidden = !g;
    if (!g) { $("#peekBtn").hidden = true; return; }
    const p = auth().getProfile && auth().getProfile();
    const first = ((p && p.display_name) || "").split(" ")[0];
    const spouse = p && p.spouse_name;
    $("#heatLbl").textContent = spouse && first ? `Termômetro de ${first} e ${spouse}` : "Termômetro do casal";
    $("#heatStage").textContent = STAGES[g.stage - 1];
    $("#heatMsg").textContent = heatMessage(g);
    $("#heatPct").textContent = g.heat + "%";
    $("#heatGauge").style.setProperty("--p", g.heat);
    // A barra mostra o caminho até o próximo estágio (os pontos nunca diminuem)
    const span = g.next_at ? g.next_at - g.stage_start : 1;
    const pct = g.next_at ? Math.min(100, Math.round(((g.points - g.stage_start) / span) * 100)) : 100;
    $("#heatFill").style.width = pct + "%";
    $("#heatBar").setAttribute("aria-valuenow", pct);
    $("#stPoints").textContent = g.points;
    $("#stNext").textContent = g.next_at ? g.next_at - g.points : "Máximo";
    $("#stNextLbl").textContent = g.next_at ? "para o próximo nível" : "estágio mais alto";
    $("#stFreezes").textContent = g.freezes;
    $("#stFreezesLbl").textContent = g.freezes === 1 ? "bloqueio de ofensiva" : "bloqueios de ofensiva";
    $("#stCoins").textContent = g.coins;
    const next = g.next_at ? `Faltam ${g.next_at - g.points} pontos para o próximo nível. Continuem juntos!` : "Vocês chegaram ao estágio mais alto. Que bonito!";
    $("#heatNext").innerHTML = next + (spouse ? "" : ' <button type="button" class="link-btn" id="addSpouse">Adicionar o nome do cônjuge</button>');
    const add = $("#addSpouse");
    if (add) add.addEventListener("click", () => app().goTo("profile"));
    $("#quickLbl").textContent = g.quick_done ? "Jogar de novo" : "Jogar agora";
    const sc = $("#secretCard");
    sc.classList.toggle("is-done", g.secret_done);
    $("#secretTitle").textContent = g.secret_done ? "Carta secreta do dia: feita" : "Carta secreta do dia";
    $("#secretSub").textContent = g.secret_done ? "Voltem amanhã para uma nova" : "Uma prévia do conteúdo Premium";
    const peek = $("#peekBtn");
    peek.hidden = plan.premium || g.peeks_left <= 0;
    $("#peekLbl").textContent = `Espiar outra carta premium · ${g.cfg.peek_cost} moedas`;
  }

  function openLevels() {
    if (!game) return;
    const at = [0, game.cfg.stage2_at, game.cfg.stage3_at];
    $("#levelsList").innerHTML = STAGE_INFO.map(([name, desc], i) => {
      const cur = game.stage === i + 1, done = game.stage > i + 1;
      const icon = done ? svg("check", 20, 2.4) : cur ? svg("heartFill", 18, 1.9, "currentColor") : svg("lock", 18);
      return `<div class="lv-row ${cur ? "is-current" : ""} ${done ? "is-done" : ""}"><span class="lv-ico">${icon}</span><span class="lv-txt"><span class="lv-name">${name}</span><span class="lv-sub">${i ? "A partir de " + at[i] + " pontos. " : ""}${desc}</span></span>${cur ? '<span class="lv-tag">Atual</span>' : ""}</div>`;
    }).join("");
    app().openModal("levels");
  }

  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  async function playQuick() {
    const a = auth();
    try { await a.loadContent(); } catch { app().showToast("Não foi possível carregar as cartas. Verifique a conexão."); return; }
    const pool = shuffle(D.cards.filter((c) => c.int === "leve" && !c.forGender && !(c.tags || []).includes("fim") && c.fmt !== "missao"));
    const picked = [], seen = new Set();
    pool.forEach((c) => { if (picked.length < 3 && !seen.has(c.cat)) { seen.add(c.cat); picked.push(c); } });
    pool.forEach((c) => { if (picked.length < 3 && !picked.includes(c)) picked.push(c); });
    if (picked.length < 3) { app().showToast("Não há cartas suficientes agora."); return; }
    app().playPreset({
      mode: "rapida", cards: picked, reserve: pool.filter((c) => !picked.includes(c)).slice(0, 12),
      onEnd: () => a.completeQuick(),
      afterEnd: (r) => showDone("quick", r),
    });
  }

  async function openSecret() {
    if (game && game.secret_done) { app().showToast("Vocês já fizeram a carta secreta de hoje. Voltem amanhã!"); return; }
    if (!app().namesOk()) return;
    const r = await auth().getSecret();
    if (!r || !r.card) { app().showToast("Não foi possível abrir a carta secreta agora."); return; }
    if (r.done) { app().showToast("Vocês já fizeram a carta secreta de hoje. Voltem amanhã!"); return; }
    app().playPreset({
      mode: "secreta", cards: [r.card], reserve: [], noOther: "A carta secreta é uma só por dia.",
      onEnd: () => auth().completeSecret(),
      afterEnd: (res) => showDone("secret", res),
    });
  }

  function askPeek() {
    if (!game) return;
    const c = game.cfg;
    if (game.coins < c.peek_cost) {
      app().showToast(`Você precisa de ${c.peek_cost} moedas. A Conexão Rápida dá ${c.coins_quick} por dia.`);
      return;
    }
    if (!app().namesOk()) return;
    $("#pkText").textContent = `Você vai gastar ${c.peek_cost} moedas para ver uma carta do conteúdo Premium. Hoje ainda dá para espiar ${game.peeks_left} ${game.peeks_left === 1 ? "carta" : "cartas"}, e você tem ${game.coins} moedas.`;
    app().openModal("peek");
  }

  async function doPeek() {
    const btn = $("#pkGo");
    btn.disabled = true;
    const r = await auth().peekCard();
    btn.disabled = false;
    app().closeModal();
    if (!r || !r.card) {
      const why = { coins: "Você não tem moedas suficientes.", limit: "Você já espiou as cartas de hoje. Volte amanhã!", premium: "Com o Premium todas as cartas já estão liberadas.", empty: "Não há cartas para espiar agora." };
      app().showToast((r && why[r.reason]) || "Não foi possível espiar agora.");
      return;
    }
    app().playPreset({
      mode: "espiar", cards: [r.card], reserve: [], noOther: "Esta prévia é de uma carta só.",
      onEnd: null,
      afterEnd: async () => { await load(); renderInicio(); app().showToast("Gostaram? Com o Premium todas ficam liberadas."); },
    });
  }

  // Recompensa depois de uma atividade (os números vêm do servidor)
  async function showDone(kind, res) {
    const before = game;
    await load();
    renderInicio();
    const granted = res && res.granted;
    const rows = [];
    let title = kind === "quick" ? "Conexão feita!" : "Carta secreta feita!";
    let sub = "Vocês dedicaram um tempo um ao outro hoje.";
    if (granted) {
      rows.push(["Pontos de conexão", "+" + res.points]);
      if (res.coins) rows.push(["Moedas", "+" + res.coins]);
    } else {
      title = "Que bom jogar de novo!";
      sub = "Os pontos desta atividade de hoje já foram contados.";
    }
    if (streak) rows.push(["Ofensiva", `${streak.current} ${streak.current === 1 ? "dia seguido" : "dias seguidos"}`]);
    if (granted && before && game && game.stage > before.stage) sub = `Vocês chegaram a um novo estágio: ${STAGES[game.stage - 1]}!`;
    $("#doneTitle").textContent = title;
    $("#doneSub").textContent = sub;
    $("#doneList").innerHTML = rows.map(([k, v]) => `<div class="plan-kv"><span>${k}</span><b>${v}</b></div>`).join("");
    const to = game ? game.heat : 0;
    const from = granted ? res.heat_before : to;
    $("#doneHeatTxt").textContent = granted && from !== to ? `${from}% → ${to}%` : `${to}%`;
    $("#doneHeatFill").style.width = from + "%";
    app().openModal("done");
    requestAnimationFrame(() => requestAnimationFrame(() => { $("#doneHeatFill").style.width = to + "%"; }));
  }

  async function buyFreeze() {
    if (!game) return;
    const btn = $("#buyFreeze");
    btn.disabled = true;
    const r = await auth().buyFreeze();
    if (r && r.ok) app().showToast("Bloqueio de ofensiva comprado.");
    else app().showToast({ coins: `Você precisa de ${game.cfg.freeze_cost} moedas.`, max: "Você já tem o máximo de bloqueios." }[r && r.reason] || "Não foi possível comprar agora.");
    await load();
    renderStreak();
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
    if (game) {
      $("#shieldCount").textContent = `${game.freezes} de ${game.cfg.freeze_max}`;
      const buy = $("#buyFreeze");
      buy.textContent = `Comprar · ${game.cfg.freeze_cost} moedas`;
      buy.disabled = game.freezes >= game.cfg.freeze_max;
    }
    $("#statList").innerHTML = stats.map(([v, l, k]) => `<div class="stat"><span class="stat-ico">${svg(k, 24)}</span><span class="stat-lbl">${l}</span><span class="stat-val">${v}</span></div>`).join("");
  }

  /* ---------- Perfil ---------- */
  function renderPerfil() {
    paintAvatars();
    $("#profName").textContent = nameOf();
    $("#profPlan").textContent = plan.premium ? "Premium" : "Plano gratuito";
  }

  function renderProfile() {
    const p = auth().getProfile();
    const s = auth().getSession();
    $("#pfName").value = (p && p.display_name) || "";
    $("#pfSpouse").value = (p && p.spouse_name) || "";
    $("#pfEmail").value = s ? s.user.email : "";
    if (p && p.birth_date) {
      const [y, m, d] = p.birth_date.split("-");
      $("#pfBirth").value = `${d}/${m}/${y}`;
    }
    $("#pfError").hidden = true;
    pfGender = (p && p.gender) || "";
    renderGender();
    paintAvatars();
  }

  let pfGender = "";
  function renderGender() {
    const wrap = $("#pfGender");
    wrap.innerHTML = "";
    [["h", "Homem"], ["m", "Mulher"], ["", "Prefiro não informar"]].forEach(([v, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pf-opt" + (pfGender === v ? " is-selected" : "");
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", pfGender === v ? "true" : "false");
      b.textContent = label;
      b.addEventListener("click", () => { pfGender = v; renderGender(); });
      wrap.appendChild(b);
    });
  }

  /* ---------- Foto de perfil: posicionar (arrastar e aproximar) ---------- */
  const crop = { w: 0, h: 0, S: 0, base: 1, z: 1, ox: 0, oy: 0, url: "" };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function cropApply() {
    const s = crop.base * crop.z;
    const mx = Math.max(0, (crop.w * s - crop.S) / 2);
    const my = Math.max(0, (crop.h * s - crop.S) / 2);
    crop.ox = clamp(crop.ox, -mx, mx);
    crop.oy = clamp(crop.oy, -my, my);
    $("#cropImg").style.transform = `translate(-50%, -50%) translate(${crop.ox}px, ${crop.oy}px) scale(${s})`;
  }

  function cropSetZoom(z) {
    crop.z = clamp(z, 1, 4);
    $("#cropZoom").value = crop.z;
    cropApply();
  }

  async function openCropper(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
      app().showToast("Use uma foto JPG, PNG ou WebP de até 10 MB.");
      return;
    }
    if (crop.url) URL.revokeObjectURL(crop.url);
    crop.url = URL.createObjectURL(file);
    const img = $("#cropImg");
    try {
      await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = crop.url; });
    } catch {
      app().showToast("Não foi possível abrir essa foto. Tente outra.");
      return;
    }
    crop.w = img.naturalWidth;
    crop.h = img.naturalHeight;
    img.style.width = crop.w + "px";
    img.style.height = crop.h + "px";
    $("#peError").hidden = true;
    app().openModal("photoedit");
    crop.S = $("#cropStage").clientWidth;
    crop.base = crop.S / Math.min(crop.w, crop.h); // a foto sempre cobre o círculo
    crop.ox = 0;
    crop.oy = 0;
    cropSetZoom(1);
  }

  function bindCropper() {
    const stage = $("#cropStage");
    const pts = new Map();
    let startDist = 0, startZ = 1;
    const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
    stage.addEventListener("pointerdown", (e) => {
      stage.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) { startDist = dist(); startZ = crop.z; }
    });
    stage.addEventListener("pointermove", (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      if (pts.size === 1) { crop.ox += e.clientX - p.x; crop.oy += e.clientY - p.y; }
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 2) { cropSetZoom(startZ * dist() / startDist); return; }
      cropApply();
    });
    const up = (e) => pts.delete(e.pointerId);
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    stage.addEventListener("wheel", (e) => { e.preventDefault(); cropSetZoom(crop.z * (e.deltaY < 0 ? 1.07 : 1 / 1.07)); }, { passive: false });
    $("#cropZoom").addEventListener("input", (e) => cropSetZoom(parseFloat(e.target.value)));
    $("#cropSave").addEventListener("click", saveCrop);
  }

  async function saveCrop() {
    const btn = $("#cropSave");
    const err = $("#peError");
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = "Salvando…";
    // Desenha exatamente o que aparece dentro do círculo, em 512 x 512 (isso também apaga dados de localização)
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const k = 512 / crop.S, s = crop.base * crop.z;
    c.getContext("2d").drawImage($("#cropImg"), (crop.S / 2 + crop.ox - (crop.w * s) / 2) * k, (crop.S / 2 + crop.oy - (crop.h * s) / 2) * k, crop.w * s * k, crop.h * s * k);
    const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.88));
    const ok = blob ? await auth().uploadAvatarBlob(blob) : false;
    btn.disabled = false;
    btn.textContent = "Salvar foto";
    if (!ok) { err.textContent = "Não foi possível salvar a foto agora. Tente de novo."; err.hidden = false; return; }
    if (crop.url) { URL.revokeObjectURL(crop.url); crop.url = ""; }
    app().closeModal();
    paintAvatars();
    app().showToast("Foto atualizada.");
  }

  /* ---------- Foto de perfil: ver em tamanho grande (como no WhatsApp) ---------- */
  function onAvatarClick() {
    const url = auth().getAvatarUrl && auth().getAvatarUrl();
    if (!url) { $("#pfPhotoInput").click(); return; }
    $("#pvImg").src = url;
    app().openModal("photoview");
  }

  async function removePhoto() {
    const ok = await auth().removeAvatar();
    if (!ok) { app().showToast("Não foi possível remover a foto agora."); return; }
    paintAvatars();
    if ($("#modalPhotoView").classList.contains("is-open")) app().closeModal();
    app().showToast("Foto removida.");
  }

  async function saveProfile(e) {
    e.preventDefault();
    const err = $("#pfError");
    const name = $("#pfName").value.trim();
    err.hidden = true;
    if (name.length < 2) { err.textContent = "Escreva pelo menos 2 letras."; err.hidden = false; return; }
    const btn = $("#pfSave");
    btn.disabled = true;
    const ok = await auth().saveProfile({ name, gender: pfGender, spouse: $("#pfSpouse").value });
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
    const reg = await a.registerPlay(); // entrar no app já conta o dia na sequência (e dá as moedas do dia)
    let fresh = null;
    try { fresh = await a.getStreak(); } catch { /* ignore */ }
    if (!fresh) return; // sem conexão: não mostra nada e tenta de novo na próxima vez
    streak = fresh;
    try { game = await a.getGame(); } catch { /* ignore */ }
    try { localStorage.setItem(WELCOME_KEY, day); } catch { /* ignore */ }
    renderInicio();
    const n = streak.current || 1;
    $("#welTitle").textContent = n === 1 ? "Sequência iniciada!" : "Parabéns!";
    $("#welSub").textContent = n === 1 ? "Hoje é o primeiro dia. Voltem amanhã para continuar." : "Mais um dia com o Ponto a Dois.";
    if (reg && reg.freezes_used) $("#welSub").textContent = "Um bloqueio de ofensiva protegeu a sua sequência. Que bom ter vocês de volta!";
    else if (reg && reg.coins) $("#welSub").textContent += ` Você ganhou ${reg.coins} moedas de conexão.`;
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
    $("#quickPlay").addEventListener("click", playQuick);
    $("#levelsBtn").addEventListener("click", openLevels);
    $("#secretCard").addEventListener("click", openSecret);
    $("#peekBtn").addEventListener("click", askPeek);
    $("#pkGo").addEventListener("click", doPeek);
    $("#buyFreeze").addEventListener("click", buyFreeze);
    $("#pfPhotoBtn").addEventListener("click", () => $("#pfPhotoInput").click());
    $("#pfPhotoInput").addEventListener("change", (e) => { openCropper(e.target.files[0]); e.target.value = ""; });
    $("#pfAvatar").addEventListener("click", onAvatarClick);
    $("#pvChange").addEventListener("click", () => { app().closeModal(); $("#pfPhotoInput").click(); });
    $("#pvRemove").addEventListener("click", removePhoto);
    bindCropper();
    $("#pfPhotoRemove").addEventListener("click", removePhoto);
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
