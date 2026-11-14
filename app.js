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
    flameOff: "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4 M4 4l16 16",
    crown: "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z M5 21h14",
    heart: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z",
    calendar: "M8 2v4 M16 2v4 M3 10h18 M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    heartFill: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z",
    card: "M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z M2 10h20",
    check: "M20 6 9 17l-5-5",
    x: "M18 6 6 18 M6 6l12 12",
    info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01",
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
    // Dias antes de a conta existir não contam como perdidos
    let since = null;
    try {
      const ses = auth() && auth().getSession && auth().getSession();
      const created = ses && ses.user && ses.user.created_at;
      if (created) since = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(created));
    } catch { /* sem data de criação: todo dia passado conta como perdido */ }
    return DOW.map((name, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() - dow + i);
      const iso = d.toISOString().slice(0, 10);
      let cls = played.has(iso) ? "is-on" : iso === today ? "is-today" : "";
      let icon = played.has(iso) || iso === today ? svg("flame", 20, 1.9, played.has(iso) ? "rgba(255,247,255,.3)" : "none") : "";
      // Dias vazios: perdido (chama riscada) ou futuro (chama só de contorno)
      if (!played.has(iso) && iso !== today) {
        if (iso > today) { cls = "is-future"; icon = svg("flame", 19, 1.7); }
        else if (!since || iso >= since) { cls = "is-missed"; icon = svg("flameOff", 19, 1.8); }
      }
      if (home) {
        // Início: check nos dias em que jogaram; chama e destaque no dia de hoje (a ofensiva já foi contada)
        if (played.has(iso)) { icon = svg("check", 20, 2.6); if (iso === today) cls = "is-on is-now"; }
        else if (iso === today) { cls = "is-today"; icon = svg("flame", 20, 1.9, "none"); }
      }
      return `<div class="wk-day ${cls}"><span class="wk-dot">${icon}</span>${name}</div>`;
    }).join("");
  }

  /* ---------- Moedas: saldo na barra de cima e formas de ganhar de graça ---------- */
  function renderCoins() {
    const g = game, c = (g && g.cfg) || {};
    const n = g ? g.coins : 0;
    const now = $("#coinsNow"); if (now) now.textContent = n;
    const bal = $("#coinsBal"); if (bal) bal.textContent = n;
    const earn = $("#coinsEarn"), spend = $("#coinsSpend");
    if (!earn || !spend) return;
    const daily = c.coins_daily != null ? c.coins_daily : 10, quick = c.coins_quick != null ? c.coins_quick : 10;
    const row = (ico, title, sub, tag) => `<li><span class="coins-ico" aria-hidden="true">${svg(ico, 20, 1.8)}</span><span class="coins-txt"><b>${title}</b><small>${sub}</small></span>${tag}</li>`;
    earn.innerHTML =
      row("calendar", "Entrar no app todo dia", "No primeiro acesso do dia. Se não entrarem, não ganham nada.", `<span class="coins-tag">+${daily}</span>`) +
      row("flame", "Conexão Rápida", "Na primeira do dia: três cartas leves, em uns 5 minutos.", g && g.quick_done ? '<span class="coins-tag is-done">Feita hoje</span>' : `<span class="coins-tag">+${quick}</span>`) +
      row("heart", "Subir de nível", "Um presente a cada novo estágio do casal, quando chegam nos pontos do próximo nível.", `<span class="coins-tag">+${c.levelup_coins_2 != null ? c.levelup_coins_2 : 60} e +${c.levelup_coins_3 != null ? c.levelup_coins_3 : 120}</span>`);
    const fc = c.freeze_cost != null ? c.freeze_cost : 50, pc = c.peek_cost != null ? c.peek_cost : 30;
    const need = (cost) => (n >= cost ? '<span class="coins-tag is-done">Já dá</span>' : `<span class="coins-tag is-need">faltam ${cost - n}</span>`);
    spend.innerHTML =
      row("lock", "Espiar uma carta premium", `${pc} moedas. Uma prévia do conteúdo Premium.`, need(pc)) +
      row("heart", "Bloqueio de ofensiva", `${fc} moedas. Protege a sequência num dia em que não der para jogar.`, need(fc));
  }

  { const cp = $("#coinPill"); if (cp) cp.addEventListener("click", renderCoins); }

  /* ---------- Início ---------- */
  function renderInicio() {
    $("#helloName").textContent = "Olá, " + nameOf();
    paintAvatars();
    $("#streakNow").textContent = (streak && streak.current) || 0;
    renderCoins();
    $("#weekHome").innerHTML = weekHtml(true);
    const nDays = ((streak && streak.week) || []).length;
    $("#weekLinkSub").textContent = nDays ? `${nDays} ${nDays === 1 ? "dia" : "dias"} de conexão nesta semana` : "Comecem a sequência de vocês";
    $("#premiumHome").hidden = plan.premium;

    // Plano e nomes: a seção "Jogo livre" mostra a coroa nas categorias premium e já traz o nome do perfil
    const p = auth().getProfile && auth().getProfile();
    app().setPremium(plan.premium);
    const onbPrefs = auth().getOnboarding && auth().getOnboarding();
    if (onbPrefs) app().applyPersonalization(onbPrefs, false);
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

  // Rótulos usados na avaliação inicial (vêm do formulário)
  const AREA_TXT = {
    conexao: "conexão emocional", comunicacao: "comunicação", tempo: "tempo a dois", fe: "vida de fé",
    diversao: "diversão e leveza", carinho: "carinho e romance", intimidade: "intimidade",
    habito: "hábito de tempo a dois", prep: "preparação para um relacionamento", self: "autoconhecimento",
  };

  function heatMessage(g, onb) {
    // Nos primeiros dias, mostra a avaliação inicial feita a partir do formulário
    if (onb && g.points < 30) {
      const parts = [];
      if (onb.strength && AREA_TXT[onb.strength]) parts.push(`Ponto forte: ${AREA_TXT[onb.strength]}.`);
      const f = (onb.focus || []).find((x) => AREA_TXT[x] && x !== onb.strength);
      if (f) parts.push(`Foco inicial: ${AREA_TXT[f]}.`);
      if (parts.length) return "Avaliação inicial. " + parts.join(" ");
    }
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
    const onb = auth().getOnboarding && auth().getOnboarding();
    // Atividade recomendada, conforme as respostas do formulário (a Noite de Encontro não depende dos pontos)
    $("#recoQuick").hidden = !(onb && onb.recommend === "quick");
    $("#recoNight").hidden = !(onb && onb.recommend === "night");
    $("#heatCard").hidden = !g;
    $(".exp-card--quick").hidden = !g; // a Noite de Encontro não depende do servidor de pontos e fica sempre visível
    $("#secretCard").hidden = !g;
    if (!g) { $("#peekBtn").hidden = true; return; }
    const p = auth().getProfile && auth().getProfile();
    const first = ((p && p.display_name) || "").split(" ")[0];
    const spouse = p && p.spouse_name;
    $("#heatLbl").textContent = spouse && first ? `Termômetro de ${first} e ${spouse}` : "Termômetro do casal";
    $("#heatStage").textContent = STAGES[g.stage - 1];
    $("#heatMsg").textContent = heatMessage(g, onb);
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
    renderCoins();
    const next = g.next_at ? `Faltam <b class="hl">${g.next_at - g.points} pontos</b> para o próximo nível. Continuem juntos!` : "Vocês chegaram ao estágio mais alto. Que bonito!";
    $("#heatNext").innerHTML = next + (spouse ? "" : ' <button type="button" class="link-btn" id="addSpouse">Adicionar o nome do cônjuge</button>');
    const add = $("#addSpouse");
    if (add) add.addEventListener("click", () => app().goTo("profile"));
    renderSpecialDate(p, g);
    $("#quickLbl").textContent = g.quick_done ? "Jogar de novo" : "Jogar agora";
    const sc = $("#secretCard");
    sc.classList.toggle("is-done", g.secret_done);
    $("#secretTitle").textContent = g.secret_done ? "Carta secreta do dia: feita" : "Carta secreta do dia";
    $("#secretSub").textContent = g.secret_done ? "Voltem amanhã para uma nova" : "Uma prévia do conteúdo Premium";
    const peek = $("#peekBtn");
    peek.hidden = plan.premium || g.peeks_left <= 0;
    peek.classList.toggle("is-low", g.coins < g.cfg.peek_cost);
    $("#peekLbl").textContent = `Espiar outra carta premium · ${g.cfg.peek_cost} moedas`;
  }

  /* ---------- Campo de data (digitar DD/MM/AAAA + calendário do site) ---------- */
  const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const pad2 = (n) => String(n).padStart(2, "0");
  function brToIso(s) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((s || "").trim());
    if (!m) return null;
    const d = +m[1], mo = +m[2], y = +m[3];
    const t = new Date(y, mo - 1, d);
    if (t.getFullYear() !== y || t.getMonth() !== mo - 1 || t.getDate() !== d) return null;
    return `${m[3]}-${m[2]}-${m[1]}`;
  }
  function isoToBr(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
  }
  function initCalendar() {
    const input = $("#pfSpecialDate"), btn = $("#pfCalBtn"), pop = $("#calPop");
    if (!input || !btn || !pop) return;
    let vy, vm; // ano e mês exibidos
    const sel = () => { const iso = brToIso(input.value); return iso ? iso : null; };
    function render() {
      const first = new Date(vy, vm, 1).getDay();
      const days = new Date(vy, vm + 1, 0).getDate();
      const s = sel(), now = new Date();
      const todayIso = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
      let cells = "";
      for (let i = 0; i < first; i++) cells += '<span class="cal-empty"></span>';
      for (let d = 1; d <= days; d++) {
        const iso = `${vy}-${pad2(vm + 1)}-${pad2(d)}`;
        cells += `<button type="button" class="cal-day${iso === s ? " is-sel" : ""}${iso === todayIso ? " is-today" : ""}" data-iso="${iso}">${d}</button>`;
      }
      pop.innerHTML =
        `<div class="cal-head">` +
        `<button type="button" class="cal-nav" data-step="-12" aria-label="Ano anterior">«</button>` +
        `<button type="button" class="cal-nav" data-step="-1" aria-label="Mês anterior">‹</button>` +
        `<b class="cal-title">${MESES[vm]} ${vy}</b>` +
        `<button type="button" class="cal-nav" data-step="1" aria-label="Próximo mês">›</button>` +
        `<button type="button" class="cal-nav" data-step="12" aria-label="Próximo ano">»</button></div>` +
        `<div class="cal-week"><span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span></div>` +
        `<div class="cal-grid">${cells}</div>` +
        `<div class="cal-foot"><button type="button" class="cal-link" data-act="clear">Limpar</button><button type="button" class="cal-link" data-act="today">Hoje</button></div>`;
    }
    function open() {
      const iso = sel();
      const base = iso ? new Date(iso + "T12:00:00") : new Date();
      vy = base.getFullYear(); vm = base.getMonth();
      render(); pop.hidden = false; btn.setAttribute("aria-expanded", "true");
    }
    function close() { pop.hidden = true; btn.setAttribute("aria-expanded", "false"); }
    btn.addEventListener("click", (e) => { e.stopPropagation(); pop.hidden ? open() : close(); });
    pop.addEventListener("click", (e) => {
      e.stopPropagation();
      const t = e.target.closest("button"); if (!t) return;
      if (t.dataset.step) { const n = vm + (+t.dataset.step); vy += Math.floor(n / 12); vm = ((n % 12) + 12) % 12; render(); }
      else if (t.dataset.iso) { input.value = isoToBr(t.dataset.iso); input.dispatchEvent(new Event("input", { bubbles: true })); close(); }
      else if (t.dataset.act === "clear") { input.value = ""; close(); }
      else if (t.dataset.act === "today") { const n = new Date(); input.value = `${pad2(n.getDate())}/${pad2(n.getMonth() + 1)}/${n.getFullYear()}`; close(); }
    });
    document.addEventListener("click", (e) => { if (!pop.hidden && !pop.contains(e.target) && e.target !== btn) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !pop.hidden) { close(); btn.focus(); } });
  }
  initCalendar();

  /* ---------- Data especial do casal ---------- */
  const DATE_PREFIX = { namoro: "Juntos há", noivado: "Noivos há", casamento: "Casados há", outro: "Juntos há" };
  const DATE_NOUN = { namoro: "de namoro", noivado: "de noivado", casamento: "de casados", outro: "juntos" };
  const DATE_FUTURE = { namoro: "o início do namoro", noivado: "o noivado", casamento: "o casamento", outro: "a data especial de vocês" };
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const ymd = (iso) => { const [y, m, d] = iso.split("-").map(Number); return { y, m, d }; };
  const utc = (o) => Date.UTC(o.y, o.m - 1, o.d);
  const dayDiff = (from, to) => Math.round((utc(to) - utc(from)) / 86400000);

  // Texto sobre a data especial (puro, para poder ser testado): { text } ou null
  const hl = (s) => `<b class="hl">${s}</b>`;
  function specialDateText(iso, label, todayIso) {
    if (!iso) return null;
    const from = ymd(iso), to = ymd(todayIso), lb = label || "outro";
    const total = dayDiff(from, to);
    if (total < 0) return { text: `Faltam ${plural(-total, "dia", "dias")} para ${DATE_FUTURE[lb]}.`, html: `Faltam ${hl(plural(-total, "dia", "dias"))} para ${DATE_FUTURE[lb]}.` };
    // Meses completos entre as duas datas; o dia do mês é ajustado ao tamanho do mês (31 de jan + 1 mês = 28 de fev)
    let total_m = (to.y - from.y) * 12 + (to.m - from.m);
    if (to.d < from.d) total_m -= 1;
    const am = from.m - 1 + total_m;
    const ay = from.y + Math.floor(am / 12), amo = ((am % 12) + 12) % 12;
    const dim = new Date(Date.UTC(ay, amo + 1, 0)).getUTCDate();
    const days = dayDiff({ y: ay, m: amo + 1, d: Math.min(from.d, dim) }, to);
    const years = Math.floor(total_m / 12), months = total_m % 12;
    const parts = [];
    if (years) parts.push(plural(years, "ano", "anos"));
    if (months) parts.push(plural(months, "mês", "meses"));
    if (days || !parts.length) parts.push(plural(days, "dia", "dias"));
    const span = parts.length > 1 ? parts.slice(0, -1).join(", ") + " e " + parts[parts.length - 1] : parts[0];
    // próximo aniversário
    let ny = to.y;
    if (utc({ y: ny, m: from.m, d: from.d }) < utc(to)) ny += 1;
    const toNext = dayDiff(to, { y: ny, m: from.m, d: from.d });
    const nth = ny - from.y;
    if (toNext === 0 && nth > 0) return { text: `Hoje vocês completam ${plural(nth, "ano", "anos")} ${DATE_NOUN[lb]}!`, html: `Hoje vocês completam ${hl(plural(nth, "ano", "anos"))} ${DATE_NOUN[lb]}!`, today: true };
    return {
      text: `${DATE_PREFIX[lb]} ${span} (${total.toLocaleString("pt-BR")} dias). Faltam ${plural(toNext, "dia", "dias")} para completarem ${plural(nth, "ano", "anos")}.`,
      html: `${DATE_PREFIX[lb]} ${hl(span)} (${total.toLocaleString("pt-BR")} dias). Faltam ${hl(plural(toNext, "dia", "dias"))} para completarem ${plural(nth, "ano", "anos")}.`,
    };
  }

  function renderSpecialDate(p, g) {
    const row = $("#heatDateRow");
    const info = p && p.special_date ? specialDateText(p.special_date, p.special_label, g.today) : null;
    row.hidden = !info;
    if (info) $("#heatDate").innerHTML = info.html || info.text;
    // Convite discreto para cadastrar a data (depois do nome do cônjuge)
    if (!info && p && p.spouse_name) {
      const hn = $("#heatNext");
      hn.innerHTML = hn.innerHTML + ' <button type="button" class="link-btn" id="addDate">Adicionar a data especial do casal</button>';
      $("#addDate").addEventListener("click", () => app().goTo("profile"));
    }
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
    const onb = a.getOnboarding && a.getOnboarding();
    const picked = [], seen = new Set();
    // Primeiro, uma carta de cada categoria que a pessoa quer trabalhar; depois, as outras categorias
    ((onb && onb.cats) || []).forEach((cat) => {
      const c = pool.find((x) => x.cat === cat && !picked.includes(x));
      if (c && picked.length < 3) { picked.push(c); seen.add(c.cat); }
    });
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

  // Janela única para "espiar" e para "comprar bloqueio": confirma o gasto ou avisa que faltam moedas
  let peekMode = "confirm";
  function setPeekDialog(mode, title, text, primary, cancel) {
    peekMode = mode;
    $("#pkTitle").textContent = title;
    $("#pkText").textContent = text;
    const go = $("#pkGo");
    go.hidden = !primary;
    if (primary) go.textContent = primary;
    $("#pkCancel").textContent = cancel;
    app().openModal("peek");
  }

  // Avisa que as moedas não bastam e diz quanto falta e como ganhar mais
  function showNeedCoins(cost, what) {
    const falta = Math.max(0, cost - game.coins);
    let text = `Para ${what} você precisa de ${cost} moedas e tem ${game.coins}. Faltam ${falta}.`;
    if (game.quick_done) text += " Hoje vocês já ganharam as moedas da Conexão Rápida. Voltem amanhã: entrar no app todos os dias também rende moedas.";
    else text += ` Ganhem moedas fazendo a Conexão Rápida (+${game.cfg.coins_quick}) e entrando no app todos os dias.`;
    setPeekDialog("coins", "Moedas insuficientes", text, game.quick_done ? "" : "Fazer Conexão Rápida", game.quick_done ? "Entendi" : "Agora não");
  }

  function askPeek() {
    if (!game) return;
    const c = game.cfg;
    if (game.coins < c.peek_cost) { showNeedCoins(c.peek_cost, "espiar uma carta premium"); return; }
    if (!app().namesOk()) return;
    const left = game.coins - c.peek_cost;
    setPeekDialog("confirm", "Espiar uma carta premium?",
      `Você vai gastar ${c.peek_cost} moedas para ver uma carta do conteúdo Premium. Hoje ainda dá para espiar ${game.peeks_left} ${game.peeks_left === 1 ? "carta" : "cartas"}. Você tem ${game.coins} moedas e fica com ${left} depois.`,
      "Espiar", "Agora não");
  }

  async function doPeek() {
    if (peekMode === "coins") { app().closeModal(); playQuick(); return; } // o aviso de moedas leva à Conexão Rápida
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
      if (res.level_coins) rows.push(["Moedas por subir de nível", "+" + res.level_coins]);
      if (res.freezes_used) rows.push(["Bloqueio de ofensiva usado", String(res.freezes_used)]);
    } else {
      title = "Que bom jogar de novo!";
      sub = "Os pontos desta atividade de hoje já foram contados.";
    }
    if (streak) rows.push(["Ofensiva", `${streak.current} ${streak.current === 1 ? "dia seguido" : "dias seguidos"}`]);
    if (granted && before && game && game.stage > before.stage) sub = `Vocês chegaram a um novo estágio: ${STAGES[game.stage - 1]}!` + (res.level_coins ? ` E ganharam ${res.level_coins} moedas de presente.` : "");
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
    if (game.freezes < game.cfg.freeze_max && game.coins < game.cfg.freeze_cost) { showNeedCoins(game.cfg.freeze_cost, "comprar um bloqueio de ofensiva"); return; }
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
    $("#pfSpecialDate").value = isoToBr(p && p.special_date);
    pfDateLabel = (p && p.special_label) || defaultDateLabel();
    renderDateLabel();
    paintAvatars();
  }

  // Tipo da data especial: já sugere o mais provável conforme a situação informada no formulário inicial
  let pfDateLabel = "outro";
  function defaultDateLabel() {
    const o = auth().getOnboarding && auth().getOnboarding();
    const st = o && o.answers && o.answers.status;
    return st === "casados" ? "casamento" : st === "noivos" ? "noivado" : st === "namorando" ? "namoro" : "outro";
  }
  function renderDateLabel() {
    const wrap = $("#pfDateLabel");
    wrap.innerHTML = "";
    [["namoro", "Namoro"], ["noivado", "Noivado"], ["casamento", "Casamento"], ["outro", "Outra data"]].forEach(([v, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "pf-opt" + (pfDateLabel === v ? " is-selected" : "");
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", pfDateLabel === v ? "true" : "false");
      b.textContent = label;
      b.addEventListener("click", () => { pfDateLabel = v; renderDateLabel(); });
      wrap.appendChild(b);
    });
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
    const sdText = $("#pfSpecialDate").value.trim();
    const sd = sdText ? brToIso(sdText) : ""; // vazio = sem data especial
    if (sdText && !sd) { err.textContent = "Digite a data especial no formato DD/MM/AAAA."; err.hidden = false; return; }
    if (sd) {
      const t = new Date(sd + "T12:00:00");
      const limit = new Date(); limit.setFullYear(limit.getFullYear() + 5);
      if (isNaN(t) || t.getFullYear() < 1950 || t > limit) { err.textContent = "Confira a data especial: use uma data a partir de 1950 e até 5 anos à frente."; err.hidden = false; return; }
    }
    const btn = $("#pfSave");
    btn.disabled = true;
    const ok = await auth().saveProfile({ name, gender: pfGender, spouse: $("#pfSpouse").value, specialDate: sd || null, specialLabel: sd ? pfDateLabel : null });
    btn.disabled = false;
    if (!ok) { err.textContent = "Não foi possível salvar agora. Tente de novo."; err.hidden = false; return; }
    app().showToast("Perfil atualizado.");
    app().goTo("perfil");
  }

  /* ---------- Alterar senha ---------- */
  function openPassword() {
    const has = auth().hasPassword();
    $("#passwordForm").reset();
    $("#pwError").hidden = true;
    $("#pwCurrentWrap").hidden = !has; // quem entrou só com o Google ainda não tem senha atual
    $("#pwTitle").textContent = has ? "Alterar senha" : "Criar senha";
    $("#pwSubmit").textContent = "Salvar senha";
    $$("#passwordForm .au-input input").forEach((i) => { i.type = "password"; });
    $$("#passwordForm .au-toggle").forEach((t) => { t.textContent = "Mostrar"; t.setAttribute("aria-pressed", "false"); });
    app().openModal("password");
  }

  async function submitPassword(e) {
    e.preventDefault();
    const err = $("#pwError");
    const has = auth().hasPassword();
    const cur = $("#pwCurrent").value, nw = $("#pwNew").value, cf = $("#pwConfirm").value;
    const fail = (m) => { err.textContent = m; err.hidden = false; };
    err.hidden = true;
    if (has && !cur) return fail("Digite a sua senha atual.");
    if (nw.length < 8) return fail("A nova senha precisa ter pelo menos 8 caracteres.");
    if (nw !== cf) return fail("As duas senhas novas não são iguais.");
    if (has && nw === cur) return fail("Escolha uma senha diferente da atual.");
    const btn = $("#pwSubmit");
    btn.disabled = true;
    btn.textContent = "Salvando…";
    const r = await auth().changePassword(cur, nw);
    btn.disabled = false;
    btn.textContent = "Salvar senha";
    if (!r.ok) {
      return fail({
        wrong_current: "A senha atual está incorreta.",
        same: "Escolha uma senha diferente da atual.",
        weak: "Essa senha é muito fraca. Use pelo menos 8 caracteres, misturando letras e números.",
        reauth: "Por segurança, saia da conta, entre de novo e tente outra vez.",
        rate: "Muitas tentativas seguidas. Espere um pouco e tente de novo.",
        network: "Sem conexão agora. Confira a internet e tente de novo.",
      }[r.error] || "Não foi possível alterar a senha agora. Tente de novo.");
    }
    app().closeModal();
    app().showToast(has ? "Senha alterada." : "Senha criada.");
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
    $("#plansContinue").addEventListener("click", goCheckout);
  }

  const BILLING_ERR = {
    already_subscribed: "Você já tem uma assinatura ativa.",
    billing_unavailable: "O pagamento ainda não está disponível. Tente mais tarde.",
    unauthorized: "Entre na sua conta para assinar.",
  };

  async function goCheckout() {
    const btn = $("#plansContinue");
    const sel = $(".plan-opt.is-selected");
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Abrindo o pagamento…";
    const r = await auth().startCheckout(sel ? sel.dataset.plan : "anual");
    if (r.ok) { window.location.href = r.url; return; }
    btn.disabled = false;
    btn.textContent = label;
    app().showToast(BILLING_ERR[r.error] || "Não foi possível abrir o pagamento. Tente de novo.");
  }

  async function goPortal(btn) {
    btn.disabled = true;
    const r = await auth().openPortal();
    if (r.ok) { window.location.href = r.url; return; }
    btn.disabled = false;
    app().showToast(BILLING_ERR[r.error] || "Não foi possível abrir a assinatura. Tente de novo.");
  }

  // Volta do pagamento: espera o aviso da Stripe chegar e libera o Premium
  async function afterCheckout() {
    const qs = new URLSearchParams(window.location.search);
    if (qs.get("portal") === "return") {
      try { history.replaceState(null, "", window.location.pathname); } catch { /* ignore */ }
      const t = setInterval(() => { if (auth().getSession && auth().getSession()) { clearInterval(t); app().goTo("plano"); } }, 400);
      setTimeout(() => clearInterval(t), 8000);
      return;
    }
    const q = qs.get("checkout");
    if (!q) return;
    try { history.replaceState(null, "", window.location.pathname); } catch { /* ignore */ }
    if (q !== "success") { app().showToast("O pagamento foi cancelado. Nada foi cobrado."); return; }
    app().showToast("Pagamento recebido! Liberando o Premium…");
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 2500));
      if (!auth().getSession || !auth().getSession()) continue;
      await load();
      if (plan.premium) { renderInicio(); app().showToast("Premium ativado. Aproveitem!"); return; }
    }
    app().showToast("O pagamento pode levar alguns minutos para aparecer. Atualize a página em instantes.");
  }

  async function renderFounders() {
    const left = await auth().foundersLeft();
    if (left === null || left > 0) return; // sem resposta ou ainda há vagas: mantém o preço Fundadores
    $("#planBadge").hidden = true;
    $("#planYearPrice").textContent = "R$ 79,90 por ano";
    $("#planYearNote").textContent = "Equivale a R$ 6,66 por mês";
    $("#planYearOff").textContent = "-55%";
  }

  function renderPlanos() {
    renderFounders();
    const a = $(".plans-fan");
    if (a && !a.innerHTML) {
      const get = (id) => D.categories.find((c) => c.id === id);
      const card = (c, cls) => `<div class="fan-card ${cls}">${c.icon}<span>${c.name}</span></div>`;
      a.innerHTML = card(get("diversao"), "fan-card--l") + card(get("intimidade"), "fan-card--r") + card(get("conexao"), "fan-card--c");
    }
  }

  /* ---------- Meu plano ---------- */
  // 1 = incluído, 0 = só no Premium
  const FREE_FEAT = [
    [1, "70 cartas do nível Leve"],
    [1, "Categorias Conexão, Diversão e Verdade"],
    [1, "Sequência diária, pontos e moedas"],
    [0, "Níveis Picante e Intenso"],
    [0, "Categorias Carinho, Intimidade e Posições"],
    [0, "Noite de Encontro"],
  ];
  const PAID_FEAT = [
    [1, "Mais de 240 cartas em 6 categorias"],
    [1, "Todos os níveis: Leve, Picante e Intenso"],
    [1, "Carinho, Intimidade e Posições (com ilustrações)"],
    [1, "Noite de Encontro completa"],
    [1, "Novas cartas toda semana"],
    [1, "Cada pessoa do casal assina o seu"],
  ];

  // Desistência: até 7 dias corridos depois do último pagamento (o servidor confere de novo)
  const canRefund = () => !!(plan.premium && plan.start && Date.now() - new Date(plan.start).getTime() < 7 * 24 * 3600 * 1000);

  /* ---------- Motivo do cancelamento / reembolso (opcional) ---------- */
  const REASONS = [["preco", "Está caro"], ["uso", "Não estamos usando"], ["recursos", "Faltam cartas ou recursos"], ["par", "Meu par não quis usar"], ["tecnico", "Tive algum problema"], ["outro", "Outro motivo"]];
  function bindReasons() {
    $$("[data-reasons]").forEach((box) => {
      box.innerHTML = REASONS.map(([k, t]) => `<button type="button" class="sup-chip" role="radio" aria-checked="false" data-reason="${k}">${t}</button>`).join("");
      box.addEventListener("click", (e) => {
        const c = e.target.closest(".sup-chip");
        if (!c) return;
        const on = c.getAttribute("aria-checked") !== "true"; // tocar de novo desmarca
        box.querySelectorAll(".sup-chip").forEach((x) => x.setAttribute("aria-checked", "false"));
        c.setAttribute("aria-checked", on ? "true" : "false");
      });
    });
  }
  function readReason(modalId) {
    const m = $(modalId);
    const c = m.querySelector('.sup-chip[aria-checked="true"]');
    const n = m.querySelector(".rs-note");
    return { reason: c ? c.dataset.reason : null, comment: n ? n.value.trim() : "" };
  }
  function resetReason(modalId) {
    const m = $(modalId);
    m.querySelectorAll(".sup-chip").forEach((x) => x.setAttribute("aria-checked", "false"));
    const n = m.querySelector(".rs-note"); if (n) n.value = "";
  }

  async function confirmCancel() {
    const err = $("#cnError"), btn = $("#cnConfirm");
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = "Cancelando…";
    const r = await auth().cancelSubscription(readReason("#modalCancel"));
    btn.disabled = false;
    btn.textContent = "Cancelar assinatura";
    if (!r.ok) {
      err.textContent = "Não foi possível cancelar agora. Tente de novo ou escreva para o suporte.";
      err.hidden = false;
      return;
    }
    app().closeModal();
    resetReason("#modalCancel");
    await load();
    renderPlano();
    app().showToast("Renovação cancelada. O Premium segue até o fim do período pago.");
  }

  function onPlanCancelRow(e) {
    if (plan.cancels) { goPortal(e.currentTarget); return; } // reativar: a Stripe cuida
    app().openModal("cancel");
  }

  async function confirmRefund() {
    const err = $("#rfError");
    const btn = $("#rfConfirm");
    err.hidden = true;
    btn.disabled = true;
    btn.textContent = "Reembolsando…";
    const r = await auth().requestRefund(readReason("#modalRefund"));
    btn.disabled = false;
    btn.textContent = "Cancelar e reembolsar";
    if (!r.ok) {
      err.textContent = r.error === "not_eligible"
        ? "O prazo de 7 dias já passou. Use \"Cancelar assinatura\" para parar a renovação."
        : "Não foi possível reembolsar agora. Tente de novo ou escreva para o suporte.";
      err.hidden = false;
      return;
    }
    app().closeModal();
    resetReason("#modalRefund");
    await load();
    renderPlano();
    renderInicio();
    app().showToast("Assinatura cancelada e valor reembolsado.");
  }

  /* ---------- Histórico de cobranças (comprovantes) ---------- */
  const BILL_PLAN = { mensal: "Premium mensal", anual: "Premium anual", fundadores: "Premium Fundadores (anual)" };
  const BILL_KIND = {
    purchase: ["Assinatura contratada", ""],
    renewal: ["Assinatura renovada", ""],
    cancel_scheduled: ["Cancelamento solicitado", "A renovação foi interrompida. O Premium continua até o fim do período pago."],
    reactivated: ["Assinatura reativada", "A renovação voltou a valer."],
    refund: ["Reembolso", "Valor devolvido ao cartão. O banco costuma mostrar na fatura em até 10 dias úteis."],
    ended: ["Assinatura encerrada", "O Premium terminou e a conta voltou ao plano gratuito."],
  };
  const money = (c) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  async function renderHistory() {
    const box = $("#planHistory");
    if (!box || !auth().getBillingEvents) return;
    const ev = await auth().getBillingEvents();
    box.hidden = !ev.length;
    if (!ev.length) return;
    $("#planHistoryList").innerHTML = ev.map((e) => {
      const [title, sub] = BILL_KIND[e.kind] || [e.kind, ""];
      const when = new Date(e.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const amt = e.amount_cents ? `<b class="bill-amt${e.kind === "refund" ? " is-refund" : ""}">${e.kind === "refund" ? "−" : ""}${money(e.amount_cents)}</b>` : "";
      return `<li class="bill-item"><div class="bill-main"><b>${title}</b>${e.plan ? `<span>${BILL_PLAN[e.plan] || ""}</span>` : ""}${sub ? `<small>${sub}</small>` : ""}<small>${when}${e.reference ? ` · Protocolo ${esc(e.reference)}` : ""}</small></div>${amt}</li>`;
    }).join("");
  }

  function renderPlano() {
    renderHistory();
    const paid = plan.premium;
    $("#myPlanName").textContent = paid ? "Premium" : "Gratuito";
    const badge = $("#myPlanBadge");
    badge.textContent = paid ? (plan.cancels ? "Cancelada" : "Ativa") : "R$ 0";
    badge.classList.toggle("is-ok", paid && !plan.cancels);
    $("#myPlanFeat").innerHTML = (paid ? PAID_FEAT : FREE_FEAT)
      .map(([on, t]) => `<li class="${on === 1 ? "is-on" : "is-off"}">${svg(on === 1 ? "check" : on === 2 ? "info" : "lock", 18, 2.2)}<span>${t}</span></li>`).join("");
    $("#myPlanPromoFeat").innerHTML = PAID_FEAT.map(([, t]) => `<li class="is-on">${svg("check", 18, 2.2)}<span>${t}</span></li>`).join("");
    $("#myPlanFree").hidden = paid;
    $("#myPlanActions").hidden = !paid;
    const info = $("#myPlanInfo");
    info.hidden = !paid;
    if (paid) {
      const until = plan.until ? new Date(plan.until).toLocaleDateString("pt-BR") : "";
      info.innerHTML = `<div class="plan-kv"><span>Situação</span><b>${plan.cancels ? "Cancelada, sem renovação" : "Assinatura ativa"}</b></div>` +
        (until ? `<div class="plan-kv"><span>${plan.cancels ? "Seu Premium termina em" : "Próxima renovação"}</span><b>${until}</b></div>` : "") +
        (plan.cancels ? `<p class="plan-card-note">Você continua com todos os benefícios até essa data. Depois, a conta volta para o plano gratuito. Para continuar com o Premium, toque em "Reativar assinatura".</p>` : "");
      const lbl = $("#planCancelLbl");
      if (lbl) lbl.textContent = plan.cancels ? "Reativar assinatura" : "Cancelar assinatura";
      const rf = $("#planRefundRow");
      if (rf) rf.hidden = !canRefund();
      const row = $("#planCancelRow");
      if (row) row.classList.toggle("menu-row--danger", !plan.cancels);
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
    const reg = await a.registerPlay(); // entrar no app só dá as moedas do dia; a ofensiva conta quando jogam
    let fresh = null;
    try { fresh = await a.getStreak(); } catch { /* ignore */ }
    if (!fresh) return; // sem conexão: não mostra nada e tenta de novo na próxima vez
    streak = fresh;
    try { game = await a.getGame(); } catch { /* ignore */ }
    try { localStorage.setItem(WELCOME_KEY, day); } catch { /* ignore */ }
    renderInicio();
    const n = streak.current || 0;
    const today = streak.today;
    const playedToday = ((streak.week) || []).includes(today);
    if (playedToday) {
      $("#welTitle").textContent = n === 1 ? "Sequência iniciada!" : "Parabéns!";
      $("#welSub").textContent = n === 1 ? "Hoje é o primeiro dia. Voltem amanhã para continuar." : "Mais um dia com o Ponto a Dois.";
    } else {
      $("#welTitle").textContent = n === 0 ? "Que bom ter vocês aqui!" : "Bem-vindos de volta!";
      $("#welSub").textContent = n === 0 ? "Joguem hoje para começar a sua ofensiva." : `Joguem hoje para manter a ofensiva de ${n} ${n === 1 ? "dia" : "dias"}.`;
    }
    if (reg && reg.coins) $("#welSub").textContent += ` Você ganhou ${reg.coins} moedas por entrar hoje.`;
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

  window.EntreNosDates = { specialDateText }; // usado nos testes
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
    const supSubject = () => "Ponto a Dois: " + $("#supSubject").value;
    const supLinks = () => {
      const su = encodeURIComponent(supSubject());
      $("#supGmail").href = "https://mail.google.com/mail/?view=cm&fs=1&to=suporte@pontoadois.com.br&su=" + su;
      $("#supApp").href = "mailto:suporte@pontoadois.com.br?subject=" + su;
    };
    $$("#supChips .sup-chip").forEach((c) => c.addEventListener("click", () => {
      $$("#supChips .sup-chip").forEach((x) => x.setAttribute("aria-checked", x === c ? "true" : "false"));
      $("#supSubject").value = c.textContent.trim();
      supLinks();
    }));
    supLinks();
    $("#supCopy").addEventListener("click", async () => {
      const mail = "suporte@pontoadois.com.br";
      try { await navigator.clipboard.writeText(mail + "\nAssunto: " + supSubject()); app().showToast("E-mail e assunto copiados."); }
      catch (e) { app().showToast(mail); }
    });
    $$("[data-portal]").forEach((b) => b.addEventListener("click", () => goPortal(b)));
    afterCheckout();
    $$("[data-soon]").forEach((b) => b.addEventListener("click", () => app().showToast("Disponível em breve, junto com o pagamento.")));
    $("#rowLogout").addEventListener("click", () => auth().signOut());
    $("#rowPassword").addEventListener("click", openPassword);
    $("#passwordForm").addEventListener("submit", submitPassword);
    $("#rowDelete").addEventListener("click", () => app().openModal("delete"));
    $("#delConfirm").addEventListener("click", confirmDelete);
    $("#rfConfirm").addEventListener("click", confirmRefund);
    bindReasons();
    $("#cnConfirm").addEventListener("click", confirmCancel);
    $("#planCancelRow").addEventListener("click", onPlanCancelRow);
    $("#recoPlay").addEventListener("click", () => {
      app().play("noite", D.categories.map((c) => c.id));
    });
  });
})();
