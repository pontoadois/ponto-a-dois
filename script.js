/* ============================================================
   Ponto a Dois — Lógica do jogo
   JavaScript puro. Sem frameworks.
   Estrutura de dados em arrays/objetos para fácil edição.
   ============================================================ */

(function () {
  "use strict";

  /* ============================================================
     1. DADOS — vêm de cards.js (window.EntreNosData)
     Para editar o conteúdo, mexa em cards.js.
     ============================================================ */
  const D = window.EntreNosData;
  if (!D) { console.error("cards.js não foi carregado."); return; }
  const CATEGORIES = D.categories;
  const INTENSITIES = D.intensities;
  const INT_ORDER = ["leve", "picante", "intenso"];
  const PREMIUM_CATS = D.premiumCats || [];

  function formatLabel(value) {
    if (value === null || value === undefined) return "";
    const str = String(value).trim();
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function positionImageUrl(p) {
    if (!p.image) return "";
    if (/^https?:\/\//i.test(p.image)) return p.image; // URL completa
    return D.positionImageBase ? D.positionImageBase + p.image : "";
  }

  /* ============================================================
     3. ESTADO + localStorage
     ============================================================ */
  const STORAGE_KEY = "entre-nos-settings-v1";

  const defaultSettings = {
    categories: ["conexao", "diversao", "verdade", "carinho", "intimidade", "posicoes"],
    catsVersion: 3,
    intensities: ["leve", "picante"],
    mode: "livre",   // "livre" | "noite"
    player1: "",   // Ele (o homem)
    player2: "",   // Ela (a mulher)
  };

  let state = {
    settings: loadSettings(),
    // jogo
    deck: [],        // baralho filtrado atual
    drawIndex: 0,    // próxima posição do deck embaralhado
    round: 1,
    mode: "livre",
    reserve: {},     // cartas extras por etapa (Noite de Encontro)
    ended: false,
    turnsPlayed: 0,  // cada jogada concluída; 2 jogadas = 1 rodada
    turn: 1,         // 1 ou 2
    currentCard: null,
  };

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaultSettings };
      const parsed = JSON.parse(raw);
      const merged = { ...defaultSettings, ...parsed };
      // Migração: categorias antigas "romance", "picante" e "surpresa" foram removidas
      if (Array.isArray(merged.categories)) {
        const removed = ["romance", "picante", "surpresa"];
        const hasOld = merged.categories.some((c) => removed.includes(c));
        if (hasOld) {
          merged.categories = merged.categories.filter((c) => !removed.includes(c));
          if (!merged.categories.includes("intimidade")) merged.categories.push("intimidade");
        }
      }
      // Migração v2: "beijos" virou "carinho" e "desafios" virou "diversao";
      // "conexao" é nova e entra automaticamente
      if (Array.isArray(merged.categories)) {
        const map = { beijos: "carinho", desafios: "diversao" };
        const hadOld = merged.categories.some((c) => map[c]);
        merged.categories = Array.from(new Set(merged.categories.map((c) => map[c] || c)));
        if (hadOld && !merged.categories.includes("conexao")) merged.categories.unshift("conexao");
        merged.categories = merged.categories.filter((c) => CATEGORIES.some((x) => x.id === c));
        if (!merged.categories.length) merged.categories = [...defaultSettings.categories];
      }
      // Migração v3: a categoria "verdade" (Verdade ou Desafio) entra para quem já tinha configuração
      if ((parsed.catsVersion || 0) < 3) {
        if (!merged.categories.includes("verdade")) merged.categories.push("verdade");
        merged.catsVersion = 3;
      }
      if (merged.mode !== "livre" && merged.mode !== "noite") merged.mode = "livre";
      // Migração: antes havia um único nível cumulativo ("intensity"); agora é uma lista de níveis
      if (!Array.isArray(parsed.intensities)) {
        const idx = INT_ORDER.indexOf(parsed.intensity);
        merged.intensities = idx >= 0 ? INT_ORDER.slice(0, idx + 1) : [...defaultSettings.intensities];
      }
      merged.intensities = INT_ORDER.filter((i) => merged.intensities.includes(i));
      if (!merged.intensities.length) merged.intensities = [...defaultSettings.intensities];
      delete merged.intensity;
      delete merged.couple;
      delete merged.man; // a escolha "quem é o homem" foi substituída pelos campos Ele e Ela
      return merged;
    } catch {
      return { ...defaultSettings };
    }
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.settings));
    } catch { /* ignore */ }
  }

  /* ============================================================
     4. UTILITÁRIOS
     ============================================================ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function catById(id) { return CATEGORIES.find((c) => c.id === id); }
  function intById(id) { return INTENSITIES.find((i) => i.id === id); }

  function showToast(msg, ms = 2200) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove("is-show"), ms);
  }

  /* Ajusta dinamicamente o tamanho do texto da carta para evitar overflow
     Adiciona classes `text--small` ou `text--xsmall` quando necessário. */
  function adjustCardText() {
    const el = $("#cardText");
    if (!el) return;
    el.classList.remove("text--small", "text--xsmall");
    // Se couber, nada a fazer
    if (el.scrollHeight <= el.clientHeight) return;

    // Primeiro nível de redução
    el.classList.add("text--small");
    if (el.scrollHeight <= el.clientHeight) return;

    // Segundo nível de redução
    el.classList.remove("text--small");
    el.classList.add("text--xsmall");
  }

  /* ============================================================
     5. NAVEGAÇÃO ENTRE TELAS
     ============================================================ */
  // Telas do jogo exigem login (quando o login está ativo)
  function navigate(target) {
    const A = window.EntreNosAuth;
    if (target === "setup") target = "inicio"; // a antiga tela "Monte o seu jogo" agora vive no Início
    // Quem já está logado nunca volta para a capa: o "Voltar" leva ao Início do app
    if (target === "home" && A && A.enabled && A.getSession && A.getSession() && !A.needs()) target = "inicio";
    if (A && A.enabled && ["game", "inicio", "streak", "perfil", "profile", "plano", "planos"].includes(target)) {
      const need = A.needs();
      if (need) { A.setPending(target); goTo(need); return; }
    }
    goTo(target);
  }

  function goTo(screenName) {
    $$(".screen").forEach((s) => s.classList.remove("is-active"));
    const target = $(`.screen[data-screen="${screenName}"]`);
    if (target) target.classList.add("is-active");

    document.body.dataset.screen = screenName;
    if (screenName !== "game") clearWidgets();
    const hook = window.EntreNosHooks && window.EntreNosHooks[screenName];
    if (hook) hook();
    if (screenName === "game") startGame();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  let lastFocus = null;

  function renderHowtoTypes() {
    const ul = $("#howtoTypes");
    if (!ul) return;
    ul.innerHTML = "";
    Object.values(D.formats).forEach((f) => {
      const li = document.createElement("li");
      const n = document.createElement("span");
      n.className = "howto-type-name";
      n.textContent = f.label;
      const t = document.createElement("span");
      t.className = "howto-type-help";
      t.textContent = f.help || "";
      li.append(n, t);
      ul.appendChild(li);
    });
  }

  function openModal(name) {
    const m = $(`.modal[data-modal="${name}"]`);
    if (!m) return;
    lastFocus = document.activeElement;
    m.classList.add("is-open");
    m.setAttribute("aria-hidden", "false");
    const closeBtn = $(".modal-close", m);
    if (closeBtn) closeBtn.focus();
  }
  function closeModal() {
    $$(".modal.is-open").forEach((m) => {
      m.classList.remove("is-open");
      m.setAttribute("aria-hidden", "true");
    });
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  /* ============================================================
     6. TELA DE CONFIGURAÇÃO — render e interação
     ============================================================ */

  const CHECK_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  // Ordem de "toque" das categorias: a mais recente vai para o centro do leque
  const touch = {};
  let touchN = 0;
  CATEGORIES.slice().reverse().forEach((c) => { touch[c.id] = ++touchN; });

  function renderFan() {
    const wrap = $("#stFan");
    if (!wrap) return;
    const picks = state.settings.categories
      .map((id) => catById(id))
      .filter(Boolean)
      .sort((a, b) => touch[b.id] - touch[a.id])
      .slice(0, 3);
    const [center, left, right] = picks;
    const card = (cat, cls) =>
      cat
        ? `<div class="fan-card ${cls}">${cat.icon}<span>${cat.name}</span></div>`
        : "";
    wrap.innerHTML = card(left, "fan-card--l") + card(right, "fan-card--r") + card(center, "fan-card--c is-pop");
  }

  function levelsLabel() {
    const on = INT_ORDER.filter((i) => state.settings.intensities.includes(i));
    if (on.length === INT_ORDER.length) return "Todos os níveis";
    return on.map((id) => INTENSITIES.find((i) => i.id === id).name).join(" + ");
  }

  function renderSummary() {
    const el = $("#stSummary");
    if (!el) return;
    const n = state.settings.categories.length;
    el.textContent = `${n} ${n === 1 ? "categoria" : "categorias"} · ${levelsLabel()}`;
  }

  // O plano muda a coroa das categorias (quem assina não vê a coroa)
  let isPremium = false;
  function setPremium(v) {
    if (isPremium === !!v) return;
    isPremium = !!v;
    renderSetup();
  }

  const CROWN_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z M5 21h14"/></svg>';

  function renderSetup() {
    const catWrap = $("#categoryChips");
    if (!catWrap) return;
    // Categorias (a pessoa marca quantas quiser)
    catWrap.innerHTML = "";
    CATEGORIES.forEach((cat) => {
      const on = state.settings.categories.includes(cat.id);
      const locked = !isPremium && PREMIUM_CATS.includes(cat.id);
      const art = (D.categoryArt || {})[cat.id] || "";
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "st-tile" + (on ? " is-selected" : "");
      tile.dataset.cat = cat.id;
      tile.setAttribute("aria-pressed", on ? "true" : "false");
      tile.innerHTML = `<span class="st-check">${CHECK_SVG}</span>
        ${locked ? `<span class="st-crown" title="Parte do conteúdo é premium">${CROWN_SVG}</span>` : ""}
        <span class="st-tile-ico">${cat.icon}</span>
        <span class="st-tile-name">${cat.name}</span>
        <span class="st-tile-sub">${cat.sub || ""}</span>
        ${art ? `<img class="tile-art" src="${art}" alt="" loading="lazy" decoding="async">` : ""}`;
      if (art) tile.classList.add("has-art");
      tile.addEventListener("click", () => toggleCategory(cat.id));
      catWrap.appendChild(tile);
    });

    // Intensidade (a pessoa marca os níveis que quiser)
    const on = INT_ORDER.filter((i) => state.settings.intensities.includes(i));
    const idxs = on.map((i) => INT_ORDER.indexOf(i));
    const lo = Math.min(...idxs), hi = Math.max(...idxs);
    const intWrap = $("#intensityGrid");
    intWrap.innerHTML = "";
    INTENSITIES.forEach((it) => {
      const sel = on.includes(it.id);
      const opt = document.createElement("button");
      opt.type = "button";
      opt.className = "st-step" + (sel ? " is-on" : "");
      opt.dataset.int = it.id;
      opt.setAttribute("role", "checkbox");
      opt.setAttribute("aria-checked", sel ? "true" : "false");
      opt.innerHTML = `<span class="st-dotwrap"><span class="st-dot"></span></span>${it.name}`;
      opt.addEventListener("click", () => toggleIntensity(it.id));
      intWrap.appendChild(opt);
    });
    const fill = $("#intFill");
    fill.style.marginLeft = lo * 50 + "%";
    fill.style.width = (hi - lo) * 50 + "%";
    $("#intLevel").textContent = levelsLabel();
    $("#intHelp").textContent =
      on.length === 1
        ? INTENSITIES.find((i) => i.id === on[0]).desc + "."
        : "Mistura as cartas dos níveis escolhidos.";

    renderSummary();

    // Nomes (só atualiza se o campo não está sendo digitado)
    const n1 = $("#player1Name"), n2 = $("#player2Name");
    if (document.activeElement !== n1) n1.value = state.settings.player1;
    if (document.activeElement !== n2) n2.value = state.settings.player2;
  }

  function toggleCategory(id) {
    const list = state.settings.categories;
    const idx = list.indexOf(id);
    if (idx >= 0) {
      if (list.length <= 1) { showToast("Escolha ao menos uma categoria."); return; }
      list.splice(idx, 1);
    } else {
      list.push(id);
      touch[id] = ++touchN;
    }
    saveSettings();
    renderSetup();
  }

  function toggleIntensity(id) {
    const list = state.settings.intensities;
    const i = list.indexOf(id);
    if (i >= 0) {
      if (list.length <= 1) { showToast("Escolha ao menos um nível de intensidade."); return; }
      list.splice(i, 1);
    } else {
      list.push(id);
    }
    state.settings.intensities = INT_ORDER.filter((x) => list.includes(x));
    saveSettings();
    renderSetup();
  }

  function bindPlayerInputs() {
    [["#player1Name", "player1"], ["#player2Name", "player2"]].forEach(([sel, key]) => {
      const el = $(sel);
      el.addEventListener("input", () => {
        state.settings[key] = el.value.trim();
        el.classList.remove("is-invalid");
        saveSettings();
      });
    });
    $("#freePlay").addEventListener("click", () => play("livre"));
  }

  // Os dois nomes são obrigatórios: "Ele" é o homem e "Ela" é a mulher
  function namesOk() {
    const fields = [["#player1Name", state.settings.player1], ["#player2Name", state.settings.player2]];
    let first = null;
    fields.forEach(([sel, v]) => {
      const el = $(sel);
      const bad = !String(v || "").trim();
      el.classList.toggle("is-invalid", bad);
      if (bad && !first) first = el;
    });
    if (first) {
      showToast("Escreva o nome dele e o nome dela para começar.");
      first.scrollIntoView({ behavior: "smooth", block: "center" });
      first.focus({ preventScroll: true });
      return false;
    }
    return true;
  }

  // Começa uma partida direto do Início. "cats" (opcional) vale só para esta partida.
  function play(mode, cats) {
    if (!namesOk()) return;
    state.preset = null;
    state.settings.mode = mode === "noite" ? "noite" : "livre";
    state.playCats = Array.isArray(cats) && cats.length ? cats : null;
    saveSettings();
    navigate("game");
  }

  // Partidas prontas (Conexão Rápida, Carta Secreta, prévia de carta premium) usam a mesma tela de jogo.
  // preset = { mode, cards, reserve, noOther, onEnd, afterEnd }
  function playPreset(preset) {
    if (!namesOk()) return false;
    state.preset = preset;
    state.playCats = null;
    navigate("game");
    return true;
  }

  // Preenche o seu nome e o do cônjuge nos campos certos (Ele = homem, Ela = mulher), se ainda estiverem vazios
  function prefillPlayers(name, gender, spouse) {
    const mine = gender === "h" ? "player1" : gender === "m" ? "player2" : null;
    const other = gender === "h" ? "player2" : gender === "m" ? "player1" : null;
    let changed = false;
    [[mine, name], [other, spouse]].forEach(([key, val]) => {
      if (key && val && !state.settings[key]) { state.settings[key] = String(val).trim().slice(0, 16); changed = true; }
    });
    if (changed) { saveSettings(); renderSetup(); }
  }

  /* ============================================================
     7. JOGO — baralho, sorteio, formatos e ações
     ============================================================ */

  // Níveis escolhidos pela pessoa (qualquer combinação)
  function allowedInts() {
    return INT_ORDER.filter((i) => state.settings.intensities.includes(i));
  }

  function playerName(n) {
    const v = n === 1 ? state.settings.player1 : state.settings.player2;
    return v || `Jogador ${n}`;
  }

  // Jogador 1 é "Ele" (homem) e o jogador 2 é "Ela" (mulher)
  function genderOf(n) {
    return n === 1 ? "h" : "m";
  }

  // Categorias da partida: as da Noite de Encontro ignoram a seleção do jogo livre
  function activeCats() {
    return state.playCats || state.settings.categories;
  }

  // Ajusta "amado(a)" para "amado"/"amada" quando se sabe de quem o texto fala.
  // Cartas para os dois ficam neutras. Se o texto cita {outro}, fala da outra pessoa.
  function agree(str, card, raw) {
    if (!card || cardWho(card) === "ambos") return str;
    const subject = raw.includes("{outro}") ? (state.turn === 1 ? 2 : 1) : state.turn;
    const g = genderOf(subject);
    if (!g) return str;
    return str
      .replace(/\bele\(a\)/g, g === "h" ? "ele" : "ela")
      .replace(/o\(a\)/g, g === "h" ? "o" : "a");
  }

  function genderOk(c, g) {
    return !c.forGender || c.forGender === "ambos" || c.forGender === g;
  }

  // Pega a próxima carta que serve para quem está na vez (cartas "h"/"m" respeitam o gênero)
  function pullCard() {
    const g = genderOf(state.turn);
    while (state.drawIndex < state.deck.length) {
      const i = state.drawIndex;
      if (genderOk(state.deck[i], g)) return state.deck[i];
      const j = state.deck.findIndex((x, idx) => idx > i && genderOk(x, g));
      if (j > -1) { [state.deck[i], state.deck[j]] = [state.deck[j], state.deck[i]]; continue; }
      state.deck.splice(i, 1); // nenhuma carta restante serve para esta vez
    }
    return null;
  }

  // {atual} = quem está na vez; {outro} = a outra pessoa
  function fillTokens(str, card) {
    if (!str) return "";
    const cur = state.turn;
    const oth = cur === 1 ? 2 : 1;
    const named = str.replace(/\{atual\}/g, playerName(cur)).replace(/\{outro\}/g, playerName(oth));
    return agree(named, card, str);
  }

  function cardWho(c) {
    const f = D.formats[c.fmt];
    return c.who || (f && f.who) || "vez";
  }

  // Cartas ilustradas de posições (geradas de D.positions)
  function positionCards(ints) {
    return D.positions
      .filter((p) => ints.includes(p.int))
      .map((p, i) => ({
        id: "posicoes-img-" + String(i + 1).padStart(2, "0"),
        cat: "posicoes",
        int: p.int,
        fmt: "acao",
        who: "ambos",
        text: p.name + (p.desc ? " — " + p.desc : ""),
        positionImage: positionImageUrl(p),
        positionName: p.name,
      }));
  }

  function cardPool(cats, ints) {
    let pool = D.cards.filter((c) => cats.includes(c.cat) && ints.includes(c.int));
    if (cats.includes("posicoes")) pool = pool.concat(positionCards(ints));
    return pool;
  }

  const hasTag = (c, t) => (c.tags || []).includes(t);

  /* Embaralha evitando repetir o formato em sequência e
     evitando 3 cartas seguidas da mesma categoria. */
  function smartOrder(cards, last) {
    const pool = shuffle(cards);
    const out = [];
    let prev = last || null;
    let prev2 = null;
    while (pool.length) {
      const okFmt = (c) => !prev || c.fmt !== prev.fmt;
      const okCat = (c) => !(prev && prev2 && c.cat === prev.cat && c.cat === prev2.cat);
      let idx = pool.findIndex((c) => okFmt(c) && okCat(c));
      if (idx < 0) idx = pool.findIndex(okFmt);
      if (idx < 0) idx = 0;
      const [pick] = pool.splice(idx, 1);
      out.push(pick);
      prev2 = prev;
      prev = pick;
    }
    return out;
  }

  function buildFreeDeck(last) {
    const pool = cardPool(activeCats(), allowedInts()).filter((c) => !hasTag(c, "fim"));
    return smartOrder(pool, last);
  }

  /* Noite de Encontro: etapas em ordem, ~16 cartas */
  function buildGuidedDeck() {
    const cats = activeCats();
    const allowed = allowedInts();
    const deck = [];
    state.reserve = {};
    let prev = null;

    D.stages.forEach((stage) => {
      const stageCats = stage.cats.filter((c) => cats.includes(c));
      if (!stageCats.length) return;

      let ints = stage.ints.filter((i) => allowed.includes(i));
      if (!ints.length) ints = allowed;

      let pool = cardPool(stageCats, ints).filter((c) =>
        stage.only ? stage.tags.every((t) => hasTag(c, t)) : !hasTag(c, "fim")
      );
      if (!pool.length) return;

      let rest = shuffle(pool);
      const chosen = [];

      // Cartas preferidas da etapa (ex.: "abertura" no aquecimento)
      if (stage.tags && !stage.only) {
        // até 2 cartas preferidas, com formatos diferentes entre si
        const pref = [];
        rest.filter((c) => stage.tags.some((t) => hasTag(c, t))).forEach((c) => {
          if (pref.length < 2 && !pref.some((x) => x.fmt === c.fmt)) pref.push(c);
        });
        pref.forEach((c) => chosen.push(c));
        rest = rest.filter((c) => !pref.includes(c));
      }

      while (chosen.length < stage.n && rest.length) {
        const last = chosen[chosen.length - 1] || prev;
        let idx = rest.findIndex((c) => !last || c.fmt !== last.fmt);
        if (idx < 0) idx = 0;
        chosen.push(rest.splice(idx, 1)[0]);
      }

      if (stage.ascending) {
        chosen.sort((a, b) => INT_ORDER.indexOf(a.int) - INT_ORDER.indexOf(b.int));
      }

      chosen.forEach((c) => deck.push({ ...c, stage: stage.id }));
      state.reserve[stage.id] = rest.map((c) => ({ ...c, stage: stage.id }));
      prev = chosen[chosen.length - 1] || prev;
    });

    return deck;
  }

  /* ---------- "Jogados recentemente" (fica só no aparelho) ---------- */
  const RECENT_KEY = "entre-nos-recent";
  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; }
  }
  function rememberRecent() {
    const cats = [...activeCats()];
    const mode = state.settings.mode;
    const one = cats.length === 1 ? CATEGORIES.find((c) => c.id === cats[0]) : null;
    const label = mode === "noite" ? "Noite de Encontro" : one ? one.name : "Jogo livre";
    const key = mode + "|" + cats.join(",");
    const list = getRecent().filter((x) => x.key !== key);
    list.unshift({ key, label, cats, mode });
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 2))); } catch { /* ignore */ }
  }

  // Usado pelo menu do app: já deixa a configuração pronta antes de abrir a tela
  function applyPlay({ categories, mode }) {
    const valid = (categories || []).filter((id) => CATEGORIES.some((c) => c.id === id));
    if (valid.length) state.settings.categories = valid;
    if (mode === "livre" || mode === "noite") state.settings.mode = mode;
    saveSettings();
    renderSetup();
  }

  async function startGame() {
    clearWidgets();
    // As cartas vêm do banco (só para quem tem idade verificada)
    const A = window.EntreNosAuth;
    if (A && A.enabled) {
      try {
        await A.loadContent();
      } catch (e) {
        showToast("Não foi possível carregar as cartas. Verifique a conexão.");
        goTo("inicio");
        return;
      }
    }
    const pre = state.preset || null;
    state.mode = pre ? pre.mode : state.settings.mode === "noite" ? "noite" : "livre";
    state.presetReserve = pre ? (pre.reserve || []).slice() : [];
    state.deck = pre ? pre.cards.slice() : state.mode === "noite" ? buildGuidedDeck() : buildFreeDeck();
    if (state.deck.length === 0) {
      showToast("Nenhuma carta disponível para essas escolhas. Ajuste as categorias ou os níveis.");
      goTo("inicio");
      return;
    }
    // Jogo começou: conta o dia na sequência (o servidor também dá os pontos do jogo)
    if (A && A.registerPlay) A.registerPlay();
    if (!pre) {
      if (A && A.completeGame) A.completeGame();
      rememberRecent();
    }
    state.drawIndex = 0;
    state.round = 1;
    state.turnsPlayed = 0;
    state.turn = 1;
    // Carta só para ela (ou só para ele): começa pela vez de quem pode jogá-la
    if (pre && state.deck[0] && !genderOk(state.deck[0], genderOf(1))) state.turn = 2;
    state.ended = false;
    state.currentCard = null;
    setEndUi(false);
    if (pre) $("#nextLabel").textContent = "Fizemos";
    drawCard(true);
  }

  function drawCard(noAnim) {
    let c = pullCard();
    if (!c) {
      if (state.preset) { finishPreset(); return; }
      if (state.mode === "noite") { showEnd(); return; }
      // Modo livre: reembaralha sem repetir a carta anterior
      state.deck = buildFreeDeck(state.currentCard);
      state.drawIndex = 0;
      c = pullCard();
      if (!c) { showToast("Nenhuma carta disponível para essas escolhas."); goTo("inicio"); return; }
    }
    state.drawIndex++;
    state.currentCard = c;
    renderCard(c, noAnim);
    updateHUD();
    updateTurn();
  }

  function showEnd() {
    state.ended = true;
    const end = {
      id: "fim",
      cat: "fim",
      fmt: "fim",
      who: "ambos",
      text: "Vocês chegaram ao fim da noite. Obrigado por dedicarem esse tempo um ao outro.",
      hint: "Que tal terminar com um beijo?",
    };
    state.currentCard = end;
    renderCard(end);
    updateHUD();
    updateTurn();
    setEndUi(true);
    burstParticles();
  }

  function setEndUi(isEnd) {
    $("#nextLabel").textContent = isEnd ? "Concluir" : "Próximo";
    $("#anotherBtn").disabled = isEnd;
  }

  /* ---------- Widgets da carta: cronômetro, contagem, escolhas ---------- */
  let timerHandle = null;
  let cdHandle = null;

  function clearWidgets() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    if (cdHandle) { clearTimeout(cdHandle); cdHandle = null; }
  }

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    return `${m}:${String(sec % 60).padStart(2, "0")}`;
  }

  let audioCtx = null;
  function ensureAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
      return audioCtx;
    } catch { return null; }
  }
  function beep() {
    const ctx = ensureAudio();
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.65);
    } catch { /* ignore */ }
  }
  function buzz(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch { /* ignore */ }
  }

  function makeXBtn(mainText, subText) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "xbtn";
    const main = document.createElement("span");
    main.className = "xbtn-main";
    main.textContent = mainText;
    const sub = document.createElement("span");
    sub.className = "xbtn-sub";
    sub.textContent = subText;
    btn.append(main, sub);
    return { btn, main, sub };
  }

  function buildTimer(seconds) {
    const { btn, main, sub } = makeXBtn(fmtTime(seconds), "Toque para iniciar");
    const setIdle = () => {
      btn.classList.remove("is-running", "is-done");
      main.textContent = fmtTime(seconds);
      sub.textContent = "Toque para iniciar";
    };
    btn.addEventListener("click", () => {
      if (timerHandle) { clearInterval(timerHandle); timerHandle = null; setIdle(); return; }
      ensureAudio();
      const end = Date.now() + seconds * 1000;
      btn.classList.remove("is-done");
      btn.classList.add("is-running");
      sub.textContent = "Toque para parar";
      const tick = () => {
        const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        main.textContent = fmtTime(left);
        if (left <= 0) {
          clearInterval(timerHandle);
          timerHandle = null;
          btn.classList.remove("is-running");
          btn.classList.add("is-done");
          main.textContent = "Tempo!";
          sub.textContent = "Toque para repetir";
          buzz([200, 100, 200]);
          beep();
        }
      };
      tick();
      timerHandle = setInterval(tick, 250);
    });
    return btn;
  }

  function buildCountdown() {
    const { btn, main, sub } = makeXBtn("Contar até 3", "Toquem quando estiverem prontos");
    btn.addEventListener("click", () => {
      if (cdHandle) return;
      ensureAudio();
      const steps = ["3", "2", "1", "Já!"];
      let i = 0;
      btn.classList.add("is-running");
      sub.textContent = "";
      const run = () => {
        main.textContent = steps[i];
        if (i < 3) buzz(40); else { buzz([120, 60, 120]); beep(); }
        i++;
        if (i < steps.length) {
          cdHandle = setTimeout(run, 900);
        } else {
          cdHandle = setTimeout(() => {
            cdHandle = null;
            btn.classList.remove("is-running");
            main.textContent = "Contar de novo";
          }, 1400);
        }
      };
      run();
    });
    return btn;
  }

  function buildOptions(opts, card) {
    const wrap = document.createElement("div");
    wrap.className = "xopts";
    opts.forEach((txt, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "xopt";
      const letter = document.createElement("span");
      letter.className = "xopt-letter";
      letter.textContent = "AB"[i] || String(i + 1);
      const t = document.createElement("span");
      t.className = "xopt-text";
      t.textContent = fillTokens(txt, card);
      b.append(letter, t);
      b.addEventListener("click", () => {
        const all = $$(".xopt", wrap);
        const already = b.classList.contains("is-picked");
        all.forEach((x) => x.classList.remove("is-picked", "is-dim"));
        if (!already) {
          b.classList.add("is-picked");
          all.forEach((x) => { if (x !== b) x.classList.add("is-dim"); });
        }
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  /* Verdade ou Desafio: a pessoa escolhe um lado e o texto aparece */
  function buildVD(c, f) {
    const wrap = document.createElement("div");
    wrap.className = "xvd";
    const row = document.createElement("div");
    row.className = "xvd-row";
    const slot = document.createElement("div");
    slot.className = "xvd-slot";
    const textEl = $("#cardText");
    const fmtEl = $("#cardFormat");
    const buttons = {};

    const pick = (kind) => {
      if (buttons[kind].classList.contains("is-picked")) return;
      clearWidgets();
      slot.textContent = "";
      Object.entries(buttons).forEach(([k, b]) => {
        b.classList.toggle("is-picked", k === kind);
        b.classList.toggle("is-dim", k !== kind);
      });
      textEl.textContent = fillTokens(kind === "truth" ? c.truth : c.dare, c);
      fmtEl.textContent = kind === "truth" ? "Verdade" : "Desafio";
      if (kind === "dare" && c.dareSeconds) slot.appendChild(buildTimer(c.dareSeconds));
      adjustCardText();
    };

    [["truth", "Verdade"], ["dare", "Desafio"]].forEach(([kind, label]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "xvd-btn";
      b.textContent = label;
      b.addEventListener("click", () => pick(kind));
      buttons[kind] = b;
      row.appendChild(b);
    });
    wrap.append(row, slot);
    return wrap;
  }

  function renderExtra(c, f) {
    clearWidgets();
    const box = $("#cardExtra");
    box.textContent = "";
    let node = null;
    if (c.fmt === "vd") node = buildVD(c, f);
    else if (c.options && c.options.length) node = buildOptions(c.options, c);
    else if (c.seconds) node = buildTimer(c.seconds);
    else if (f && f.countdown) node = buildCountdown();
    if (node) box.appendChild(node);
    box.hidden = !node;
  }

  /* ---------- Render da carta ---------- */
  function renderCard(c, noAnim) {
    const el = $("#gameCard");
    const apply = () => {
      const isEnd = c.cat === "fim";
      const f = D.formats[c.fmt];
      const cat = isEnd
        ? { name: "Noite de Encontro", icon: catById("carinho").icon }
        : catById(c.cat);

      // Categoria
      $("#cardCategoryName").textContent = cat ? cat.name : c.cat;
      $("#cardCategoryIcon").innerHTML = cat ? cat.icon : "";

      // Intensidade (com nome adaptado à categoria)
      const intEl = $("#cardIntensity");
      const intName =
        (D.intLabels[c.cat] && D.intLabels[c.cat][c.int]) ||
        (intById(c.int) ? intById(c.int).name : "");
      intEl.textContent = intName;
      intEl.hidden = !intName;

      // Ícone / imagem central
      const iconEl = $("#cardIcon");
      const isPosition = c.cat === "posicoes" && !!c.positionName;
      el.classList.toggle("card--compact", !isPosition);
      if (isPosition) {
        iconEl.textContent = "";
        const showPlaceholder = () => {
          iconEl.textContent = "";
          const ph = document.createElement("div");
          ph.className = "card-position-placeholder";
          ph.textContent = c.positionName;
          iconEl.appendChild(ph);
        };
        if (c.positionImage) {
          const img = document.createElement("img");
          img.className = "card-position-image";
          img.alt = c.positionName;
          img.addEventListener("error", showPlaceholder, { once: true });
          img.src = c.positionImage;
          iconEl.appendChild(img);
        } else {
          showPlaceholder();
        }
      } else {
        iconEl.innerHTML = cat ? cat.icon : "";
      }

      // Formato
      const fmtEl = $("#cardFormat");
      fmtEl.textContent = f ? f.label : "";
      fmtEl.hidden = !f;

      // Texto e dica
      $("#cardText").textContent = fillTokens(c.text, c);
      const hintText = fillTokens(c.hint !== undefined ? c.hint : f ? f.hint : "");
      const hintEl = $("#cardHint");
      hintEl.textContent = hintText;
      hintEl.hidden = !hintText;

      // Cronômetro / contagem / escolhas
      renderExtra(c, f);

      // Ajusta o tamanho do texto depois de montar tudo
      adjustCardText();
      updateStage();
    };
    if (noAnim) {
      apply();
      el.classList.remove("is-flip-in", "is-flip-out");
      return;
    }
    el.classList.remove("is-flip-in");
    el.classList.add("is-flip-out");
    setTimeout(() => {
      apply();
      el.classList.remove("is-flip-out");
      el.classList.add("is-flip-in");
    }, 280);
  }

  function updateStage() {
    const line = $("#stageLine");
    const guided = state.mode === "noite";
    line.hidden = !guided;
    if (!guided) return;
    const c = state.currentCard;
    let name = "Fim";
    if (c && c.stage) {
      const st = D.stages.find((x) => x.id === c.stage);
      name = st ? st.name : "";
    }
    $("#stageName").textContent = state.ended ? "Fim da noite" : name;
    const total = Math.max(1, state.deck.length);
    const done = state.ended ? total : Math.max(0, state.drawIndex - 1);
    $("#stageBar").style.width = Math.round((done / total) * 100) + "%";
  }

  function updateHUD() {
    const lbl = $("#roundLabel");
    if (state.preset) {
      const total = state.deck.length;
      lbl.innerHTML = `${total > 1 ? "Carta" : "Sua carta"} <b id="roundCount">${total > 1 ? Math.min(state.drawIndex, total) : ""}</b>${total > 1 ? " de " + total : ""}`;
    } else {
      lbl.innerHTML = `Rodada <b id="roundCount">${state.round}</b>`;
    }
  }

  function updateTurn() {
    const isPlayer1 = state.turn === 1;
    const c = state.currentCard;
    const both = c && cardWho(c) === "ambos";
    const isEnd = c && c.cat === "fim";

    $("#turnLabel").textContent = isEnd ? "Para" : both ? "Começa" : "Vez de";
    const el = $("#turnName");
    const avatar = $("#turnAvatar");
    el.textContent = isEnd ? "Vocês dois" : playerName(state.turn);
    el.classList.toggle("p1", isPlayer1);
    el.classList.toggle("p2", !isPlayer1);
    avatar.classList.toggle("p1", isPlayer1);
    avatar.classList.toggle("p2", !isPlayer1);
  }

  function nextTurn() {
    state.turn = state.turn === 1 ? 2 : 1;
    state.turnsPlayed++;
    state.round = Math.floor(state.turnsPlayed / 2) + 1;
  }

  // Evita cliques repetidos durante a animação da carta
  let busy = false;
  function lock(ms = 320) {
    if (busy) return false;
    busy = true;
    setTimeout(() => { busy = false; }, ms);
    return true;
  }

  // ---- Ações ----
  function actionNext() {
    if (!lock()) return;
    if (state.ended) {
      clearWidgets();
      setEndUi(false);
      goTo("inicio");
      showToast("Que a noite continue por aí.");
      return;
    }
    if (state.preset && state.drawIndex >= state.deck.length) { finishPreset(); return; }
    nextTurn();
    drawCard();
  }

  // Fim de uma partida pronta: o servidor dá os pontos, volta ao Início e mostra a recompensa
  async function finishPreset() {
    const p = state.preset;
    if (!p || state.finishing) return;
    state.finishing = true; // evita concluir duas vezes enquanto o servidor responde
    let res = null;
    try { res = p.onEnd ? await p.onEnd() : null; } catch { res = null; }
    state.finishing = false;
    clearWidgets();
    state.preset = null;
    goTo("inicio");
    if (p.afterEnd) setTimeout(() => p.afterEnd(res), 350);
  }

  // "Outra": troca a carta para a mesma pessoa (não avança a vez).
  // Serve também para recusar uma carta com tranquilidade.
  function actionAnother() {
    if (!lock()) return;
    if (state.ended) return;
    if (state.preset) {
      const list = state.presetReserve || [];
      const gi = list.findIndex((x) => genderOk(x, genderOf(state.turn)));
      if (gi < 0) { showToast(state.preset.noOther || "Não há outra carta para trocar."); return; }
      const repl = list.splice(gi, 1)[0];
      state.deck[state.drawIndex - 1] = repl;
      state.currentCard = repl;
      renderCard(repl);
      updateTurn();
      return;
    }
    if (state.mode === "noite") {
      const cur = state.currentCard;
      const list = (cur && state.reserve[cur.stage]) || [];
      if (!list.length) { showToast("Não há mais cartas nesta etapa."); return; }
      const gi = list.findIndex((x) => genderOk(x, genderOf(state.turn)));
      if (gi < 0) { showToast("Não há mais cartas nesta etapa."); return; }
      const repl = list.splice(gi, 1)[0];
      state.deck[state.drawIndex - 1] = repl;
      state.currentCard = repl;
      renderCard(repl);
      updateTurn();
      return;
    }
    drawCard();
  }

  function actionRestart() {
    startGame();
    showToast("Jogo reiniciado.");
  }

  /* ============================================================
     8. PARTÍCULAS / CONFETES
     ============================================================ */
  const canvas = $("#particles");
  const ctx = canvas.getContext("2d");
  let particles = [];
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  let particlesRunning = false;

  function burstParticles() {
    const colors = ["#e91e63", "#9c27b0", "#ff6b9d", "#c084fc", "#fff5f8"];
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.012 + Math.random() * 0.01,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.2,
      });
    }
    if (!particlesRunning) {
      particlesRunning = true;
      requestAnimationFrame(tickParticles);
    }
  }

  function tickParticles() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08; // gravidade
      p.vx *= 0.99;
      p.life -= p.decay;
      p.rot += p.vr;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
      ctx.restore();
    }
    if (particles.length > 0) {
      requestAnimationFrame(tickParticles);
    } else {
      particlesRunning = false;
    }
  }

  /* ============================================================
     9. BIND DE EVENTOS
     ============================================================ */
  function bindEvents() {
    // Navegação por data-goto
    $$("[data-goto]").forEach((btn) => {
      btn.addEventListener("click", () => navigate(btn.dataset.goto));
    });
    // Modais
    $$("[data-open-modal]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(btn.dataset.openModal));
    });
    $$("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", closeModal);
    });
    // Ações do jogo
    $("#nextBtn").addEventListener("click", actionNext);
    $("#anotherBtn").addEventListener("click", actionAnother);
    $("#restartBtn").addEventListener("click", actionRestart);

    // Tecla ESC fecha modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });
  }

  /* ============================================================
     10. INIT
     ============================================================ */
  function init() {
    renderSetup();
    renderHowtoTypes();
    bindPlayerInputs();
    bindEvents();
    // Garante tela inicial ativa
    $$(".screen").forEach((s) => s.classList.remove("is-active"));
    $(".screen--home").classList.add("is-active");
  }

  window.EntreNosApp = { goTo, navigate, showToast, openModal, closeModal, applyPlay, getRecent, play, playPreset, namesOk, prefillPlayers, setPremium };

  document.addEventListener("DOMContentLoaded", init);
})();
