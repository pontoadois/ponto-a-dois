/* ============================================================
   PONTO A DOIS — FORMULÁRIO INICIAL DE PERSONALIZAÇÃO
   Aparece uma única vez, logo depois do cadastro, e só enquanto
   o preenchimento estiver pendente. As perguntas se adaptam à
   situação amorosa da pessoa. A validação final e o cálculo da
   avaliação inicial do termômetro são feitos no servidor
   (função submit_onboarding).
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const A = () => window.EntreNosAuth;
  const app = () => window.EntreNosApp;

  /* ---------- Conteúdo das perguntas ---------- */
  const STATUS = [
    { v: "conhecendo", t: "Estamos nos conhecendo", s: "Ainda não somos um casal oficial" },
    { v: "namorando", t: "Namorando" },
    { v: "noivos", t: "Noivos" },
    { v: "casados", t: "Casados" },
    { v: "solteiro", t: "Estou solteiro(a)", s: "Sem um relacionamento agora" },
  ];

  const TIME = {
    conhecendo: ["Menos de 1 mês", "De 1 a 3 meses", "De 3 a 6 meses", "Mais de 6 meses"],
    namorando: ["Menos de 6 meses", "De 6 meses a 1 ano", "De 1 a 3 anos", "Mais de 3 anos"],
    noivos: ["Menos de 1 ano juntos", "De 1 a 3 anos juntos", "De 3 a 5 anos juntos", "Mais de 5 anos juntos"],
    casados: ["Menos de 1 ano de casados", "De 1 a 5 anos", "De 5 a 10 anos", "Mais de 10 anos"],
    solteiro: ["Menos de 1 ano", "De 1 a 3 anos", "Mais de 3 anos", "Nunca tive um relacionamento sério"],
  };
  const TIME_TITLE = {
    conhecendo: "Há quanto tempo vocês estão se conhecendo?",
    namorando: "Há quanto tempo vocês namoram?",
    noivos: "Há quanto tempo vocês estão juntos?",
    casados: "Há quanto tempo vocês são casados?",
    solteiro: "Há quanto tempo você está sem um relacionamento?",
  };

  const LIVING_DATING = [
    "Nos vemos quase todos os dias",
    "Nos vemos algumas vezes por semana",
    "Nos vemos poucas vezes por mês",
    "Moramos em cidades diferentes",
  ];
  const LIVING_MARRIED = [
    "Moramos juntos e temos bastante tempo a dois",
    "Moramos juntos, mas a rotina deixa pouco tempo a dois",
    "Temos filhos pequenos e o tempo a dois é raro",
    "Moramos em lugares diferentes por enquanto",
  ];
  const CONNECTION = [
    "Muito próximos: compartilhamos o que sentimos com facilidade",
    "Próximos, mas queremos aprofundar",
    "Às vezes distantes, principalmente na correria",
    "Distantes: precisamos nos reconectar",
  ];
  const COMM_COUPLE = [
    "Conversamos de tudo, com sinceridade e respeito",
    "Conversamos bem, mas evitamos alguns assuntos",
    "Conversamos pouco sobre o que sentimos",
    "Discutimos com frequência",
  ];
  const COMM_SINGLE = [
    "Converso com calma e sinceridade",
    "Converso, mas evito alguns assuntos",
    "Tenho dificuldade de me abrir",
    "Costumo me irritar ou me afastar",
  ];
  const FAITH_COUPLE = [
    "Oramos e vivemos a fé juntos",
    "Temos fé, mas pouco praticamos juntos",
    "Queremos começar a viver a fé a dois",
    "Cada um vive a fé do seu jeito",
    "Prefiro não responder",
  ];
  const FAITH_SINGLE = [
    "Ativa e constante",
    "Tenho fé, mas com pouca rotina",
    "Quero me reaproximar",
    "Estou buscando",
    "Prefiro não responder",
  ];

  const GOALS_COUPLE = ["conexao", "diversao", "comunicacao", "fe", "carinho", "habito", "intimidade"];
  const GOAL_TEXT = {
    conexao: (st) => (st === "conhecendo" ? "Criar conexão e nos conhecer melhor" : "Fortalecer a conexão emocional"),
    diversao: () => "Ter mais diversão e leveza",
    comunicacao: () => "Melhorar a comunicação",
    fe: () => "Crescer espiritualmente juntos",
    carinho: (st) => (st === "casados" || st === "noivos" ? "Reacender o carinho e o romance" : "Demonstrar mais carinho"),
    habito: () => "Criar o hábito de tempo a dois",
    intimidade: () => "Aprofundar a intimidade",
  };
  const GOALS_SINGLE = [
    ["prep", "Me preparar para um relacionamento"],
    ["self", "Me conhecer melhor"],
    ["fe", "Crescer na minha fé"],
    ["comunicacao", "Melhorar a minha comunicação"],
    ["carinho", "Aprender a demonstrar carinho"],
  ];

  const opts = (list, prefix) => list.map((t, i) => ({ v: prefix + (i + 1), t }));

  function goalOptions(st) {
    if (st === "solteiro") return GOALS_SINGLE.map(([v, t]) => ({ v, t }));
    return GOALS_COUPLE
      .filter((g) => g !== "intimidade" || st === "noivos" || st === "casados") // só faz sentido para quem já é noivo(a) ou casado(a)
      .map((g) => ({ v: g, t: GOAL_TEXT[g](st) }));
  }

  /* Monta a lista de perguntas conforme a situação da pessoa (5 a 7 perguntas) */
  function stepsFor(a) {
    const st = a.status;
    const list = [{ key: "status", title: "Qual é a sua situação amorosa hoje?", options: STATUS.map((o) => ({ v: o.v, t: o.t, s: o.s })) }];
    if (!st) return list;
    const single = st === "solteiro";
    list.push({ key: "time", title: TIME_TITLE[st], options: opts(TIME[st], "t") });
    if (!single) {
      list.push({ key: "living", title: "Como é a convivência de vocês hoje?", options: opts(st === "casados" ? LIVING_MARRIED : LIVING_DATING, "c") });
      list.push({
        key: "connection",
        title: st === "conhecendo" ? "Como é a conexão emocional entre vocês até agora?" : "Como vocês sentem a conexão emocional hoje?",
        options: opts(CONNECTION, "k"),
      });
    }
    list.push({
      key: "communication",
      title: single ? "Como você costuma lidar com conversas difíceis?" : "Como é a comunicação entre vocês?",
      options: opts(single ? COMM_SINGLE : COMM_COUPLE, "m"),
    });
    list.push({
      key: "faith",
      title: single ? "Como está a sua vida de fé hoje?" : st === "conhecendo" ? "Como a fé aparece entre vocês?" : "Como a fé está presente no relacionamento de vocês?",
      hint: "Usamos só para personalizar as cartas. Se preferir, escolha “Prefiro não responder”.",
      options: opts(single ? FAITH_SINGLE : FAITH_COUPLE, "f"),
    });
    list.push({
      key: "goals", multi: true, max: 3,
      title: single ? "O que você quer alcançar com o Ponto a Dois?" : "O que vocês querem alcançar com o Ponto a Dois?",
      hint: "Escolha de 1 a 3 opções.",
      options: goalOptions(st),
    });
    return list;
  }

  /* ---------- Estado e rascunho (só nesta aba, para não perder o progresso ao recarregar) ---------- */
  let ob = { step: 0, answers: {} };
  let sending = false;

  function draftKey() {
    const a = A();
    const s = a && a.getSession && a.getSession();
    return s ? "pad-onb-draft:" + s.user.id : null;
  }
  function loadDraft() {
    try {
      const k = draftKey();
      const raw = k && sessionStorage.getItem(k);
      const d = raw && JSON.parse(raw);
      if (d && typeof d.step === "number" && d.answers && typeof d.answers === "object") return d;
    } catch { /* sem rascunho */ }
    return null;
  }
  function saveDraft() {
    try { const k = draftKey(); if (k) sessionStorage.setItem(k, JSON.stringify(ob)); } catch { /* ignore */ }
  }
  function clearDraft() {
    try { const k = draftKey(); if (k) sessionStorage.removeItem(k); } catch { /* ignore */ }
  }

  /* ---------- Validação ---------- */
  function isValid(step) {
    const v = ob.answers[step.key];
    if (step.multi) return Array.isArray(v) && v.length >= 1 && v.length <= step.max && v.every((g) => step.options.some((o) => o.v === g));
    return typeof v === "string" && step.options.some((o) => o.v === v);
  }

  function showMsg(text) {
    const el = $("#obError");
    el.textContent = text || "";
    el.hidden = !text;
  }

  /* ---------- Tela ---------- */
  function current() {
    const list = stepsFor(ob.answers);
    ob.step = Math.max(0, Math.min(ob.step, list.length - 1));
    return { list, step: list[ob.step] };
  }

  function render(focusTitle) {
    const { list, step } = current();
    const total = ob.answers.status ? list.length : 7; // antes de escolher a situação, mostramos o caso mais comum
    const n = ob.step + 1;
    $("#obCount").textContent = `Pergunta ${n} de ${total}`;
    $("#obBar").style.width = Math.round((n / total) * 100) + "%";
    $("#obBarWrap").setAttribute("aria-valuenow", n);
    $("#obBarWrap").setAttribute("aria-valuemax", total);
    const title = $("#obTitle");
    title.textContent = step.title;
    const hint = $("#obHint");
    hint.textContent = step.hint || "";
    hint.hidden = !step.hint;

    const wrap = $("#obOptions");
    wrap.setAttribute("role", step.multi ? "group" : "radiogroup");
    wrap.innerHTML = "";
    const sel = step.multi ? ob.answers[step.key] || [] : [ob.answers[step.key]];
    step.options.forEach((o) => {
      const on = sel.includes(o.v);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ob-opt" + (on ? " is-selected" : "");
      b.dataset.v = o.v;
      b.setAttribute("role", step.multi ? "checkbox" : "radio");
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.innerHTML = `<span class="ob-mark" aria-hidden="true"></span><span class="ob-opt-txt"><span class="ob-opt-t"></span>${o.s ? '<small class="ob-opt-s"></small>' : ""}</span>`;
      $(".ob-opt-t", b).textContent = o.t;
      if (o.s) $(".ob-opt-s", b).textContent = o.s;
      b.addEventListener("click", () => choose(step, o.v));
      wrap.appendChild(b);
    });

    $("#obBack").hidden = ob.step === 0;
    const last = ob.step === list.length - 1;
    const next = $("#obNext");
    next.textContent = last ? "Concluir" : "Continuar";
    next.disabled = !isValid(step) || sending;
    showMsg("");
    if (focusTitle) { title.setAttribute("tabindex", "-1"); title.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "smooth" }); }
  }

  function choose(step, v) {
    if (sending) return;
    if (step.multi) {
      const arr = (ob.answers[step.key] || []).slice();
      const i = arr.indexOf(v);
      if (i >= 0) arr.splice(i, 1);
      else if (arr.length >= step.max) { showMsg(`Você pode escolher até ${step.max} opções. Desmarque uma para trocar.`); return; }
      else arr.push(v);
      ob.answers[step.key] = arr;
    } else if (step.key === "status" && ob.answers.status !== v) {
      ob.answers = { status: v }; // outra situação tem outras perguntas: recomeça o resto
    } else {
      ob.answers[step.key] = v;
    }
    saveDraft();
    render(false);
  }

  function back() {
    if (sending || ob.step === 0) return;
    ob.step -= 1;
    saveDraft();
    render(true);
  }

  async function next(e) {
    if (e) e.preventDefault();
    if (sending) return;
    const { list, step } = current();
    if (!isValid(step)) { showMsg(step.multi ? "Escolha de 1 a 3 opções para continuar." : "Escolha uma opção para continuar."); return; }
    if (ob.step < list.length - 1) { ob.step += 1; saveDraft(); render(true); return; }
    await submit(list);
  }

  function payload(list) {
    const a = ob.answers;
    const out = {};
    list.forEach((s) => { out[s.key] = a[s.key]; }); // só as perguntas que fazem sentido para a situação
    return out;
  }

  async function submit(list) {
    const btn = $("#obNext");
    sending = true;
    btn.disabled = true;
    btn.textContent = "Salvando…";
    const res = await A().submitOnboarding(payload(list));
    sending = false;
    if (!res || !res.ok) {
      showMsg("Não foi possível salvar agora. Confira a conexão e tente de novo.");
      btn.disabled = false;
      btn.textContent = "Concluir";
      return;
    }
    clearDraft();
    const onb = A().getOnboarding && A().getOnboarding();
    if (onb && app().applyPersonalization) app().applyPersonalization(onb, true);
    ob = { step: 0, answers: {} };
    A().proceed(); // vai direto para a Home (ou para a tela que a pessoa queria abrir)
  }

  function start() {
    const a = A();
    // Quem já respondeu nunca volta para cá
    if (a && a.getOnboarding && a.getOnboarding()) { app().goTo("inicio"); return; }
    ob = loadDraft() || { step: 0, answers: {} };
    sending = false;
    render(false);
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = $("#obForm");
    if (!form) return;
    form.addEventListener("submit", next);
    $("#obBack").addEventListener("click", back);
    $("#obLogout").addEventListener("click", () => { clearDraft(); A().signOut(); });
  });

  window.EntreNosHooks = window.EntreNosHooks || {};
  window.EntreNosHooks.onboarding = start;
  window.EntreNosOnboarding = { stepsFor }; // usado nos testes
})();
