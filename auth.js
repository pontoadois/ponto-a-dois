/* ============================================================
   PONTO A DOIS — LOGIN, CADASTRO E PERFIL (Supabase Auth)
   ============================================================ */
(function () {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const cfg = window.EntreNosConfig || {};
  const D = window.EntreNosData;
  const canUse = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase);
  const enabled = canUse && cfg.requireLogin !== false;
  const client = canUse ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey) : null;
  const app = () => window.EntreNosApp;

  let session = null;
  let profile = null;
  let avatarUrl = null; // endereço temporário da foto (a pasta é privada)
  let pending = null; // tela que a pessoa queria abrir antes de entrar

  const redirectUrl = () => location.origin + location.pathname;
  const activeScreen = () => ($(".screen.is-active") || {}).dataset?.screen;

  /* ---------- Utilidades de formulário ---------- */
  function showMsg(el, msg, kind) {
    if (!el) return;
    el.textContent = msg || "";
    el.hidden = !msg;
    el.classList.toggle("is-info", kind === "info");
  }
  function busy(btn, on, label) {
    if (!btn) return;
    btn.disabled = on;
    if (label) btn.dataset.label = btn.dataset.label || btn.textContent;
    btn.textContent = on ? (label || "Aguarde…") : btn.dataset.label || btn.textContent;
  }
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  function parseBirth(str) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((str || "").trim());
    if (!m) return { error: "Informe a data no formato DD/MM/AAAA." };
    const d = +m[1], mo = +m[2], y = +m[3];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d || y < 1900)
      return { error: "Essa data não existe." };
    const now = new Date();
    if (dt > now) return { error: "A data de nascimento está no futuro." };
    let age = now.getFullYear() - y;
    const had = now.getMonth() + 1 > mo || (now.getMonth() + 1 === mo && now.getDate() >= d);
    if (!had) age--;
    if (age < 18) return { error: "Este jogo é só para maiores de 18 anos." };
    return { iso: `${m[3]}-${m[2]}-${m[1]}` };
  }

  function maskDate(input) {
    input.addEventListener("input", () => {
      const v = input.value.replace(/\D/g, "").slice(0, 8);
      input.value = v.length > 4 ? `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}` : v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v;
    });
  }

  function friendly(err) {
    const m = ((err && err.message) || "").toLowerCase();
    if (m.includes("invalid login")) return "E-mail ou senha incorretos.";
    if (m.includes("not confirmed")) return "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.";
    if (m.includes("already registered")) return "Já existe uma conta com esse e-mail.";
    if (m.includes("database error saving")) return "Não foi possível criar a conta. Confira a data de nascimento.";
    if (m.includes("password should be")) return "A senha precisa ter pelo menos 8 caracteres.";
    if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
    if (m.includes("same password")) return "Escolha uma senha diferente da atual.";
    if (m.includes("failed to fetch") || m.includes("network")) return "Sem conexão. Verifique a internet e tente de novo.";
    return "Algo deu errado. Tente novamente.";
  }

  /* ---------- Sessão e perfil ---------- */
  async function loadProfile() {
    if (!session) { profile = null; avatarUrl = null; return; }
    const { data } = await client
      .from("profiles")
      .select("id, display_name, birth_date, terms_accepted_at, age_verified_at, gender, avatar_path, spouse_name")
      .eq("id", session.user.id)
      .maybeSingle();
    profile = data || null;
    avatarUrl = null;
    if (profile && profile.avatar_path) {
      try {
        const r = await client.storage.from("avatars").createSignedUrl(profile.avatar_path, 86400);
        avatarUrl = r.data ? r.data.signedUrl : null;
      } catch { /* sem foto por enquanto */ }
    }
  }

  function needs() {
    if (!enabled) return null;
    if (!session) return "login";
    if (!profile) return null;
    if (!profile.birth_date || !profile.terms_accepted_at) { prefillComplete(); return "complete"; }
    return null;
  }

  function renderHomeUser() {
    const el = $("#homeUser");
    if (!el) return;
    el.hidden = !enabled;
    el.textContent = "";
    if (!enabled) return;
    if (session) {
      const hi = document.createElement("span");
      hi.append("Olá, ");
      const b = document.createElement("b");
      b.textContent = (profile && profile.display_name) || session.user.email.split("@")[0];
      hi.appendChild(b);
      const out = document.createElement("button");
      out.type = "button";
      out.className = "au-link";
      out.textContent = "Sair";
      out.addEventListener("click", signOut);
      el.append(hi, out);
    } else {
      const inn = document.createElement("button");
      inn.type = "button";
      inn.className = "au-link";
      inn.textContent = "Entrar";
      inn.addEventListener("click", () => app().goTo("login"));
      el.appendChild(inn);
    }
  }

  async function signOut() {
    await client.auth.signOut();
    session = null; profile = null; avatarUrl = null; pending = null;
    clearContent();
    renderHomeUser();
    app().goTo("home");
  }

  // Depois de entrar: completa o cadastro (se faltar) ou segue para o jogo
  function proceed() {
    const need = needs();
    if (need === "complete") { prefillComplete(); app().goTo("complete"); return; }
    const target = pending || sessionStorage.getItem("en_next") || "inicio";
    pending = null;
    sessionStorage.removeItem("en_next");
    app().goTo(target);
  }

  async function refresh(event) {
    await loadProfile();
    renderHomeUser();
    if (needs() === "complete") prefillComplete();
    const screen = activeScreen();
    if (event === "PASSWORD_RECOVERY") { app().goTo("newpass"); return; }
    if (!session) return;
    const returningFromOAuth = !!sessionStorage.getItem("en_next");
    if (["login", "signup"].includes(screen) || (returningFromOAuth && screen === "home")) proceed();
    else if (event === "INITIAL" && screen === "home" && !needs()) app().goTo("inicio"); // quem já está logado entra direto no app
  }

  /* ---------- Conteúdo do jogo (vem do banco, só para quem tem idade verificada) ---------- */
  let contentLoaded = false;

  function clearContent() {
    contentLoaded = false;
    if (D) { D.cards.length = 0; D.positions.length = 0; }
  }

  // Converte uma linha do banco no formato de carta usado pelo jogo
  function rowToCard(r) {
    const card = { id: r.id, cat: r.cat, int: r.intensity, fmt: r.fmt, text: r.body };
    if (r.options) card.options = r.options;
    if (r.seconds) card.seconds = r.seconds;
    if (r.truth) { card.truth = r.truth; card.dare = r.dare; }
    if (r.dare_seconds) card.dareSeconds = r.dare_seconds;
    if (r.who) card.who = r.who;
    if (r.tags && r.tags.length) card.tags = r.tags;
    if (r.for_gender && r.for_gender !== "ambos") card.forGender = r.for_gender;
    return card;
  }

  async function loadContent(force) {
    if (!client || !session) return false;
    if (contentLoaded && !force) return true;
    const [c, p] = await Promise.all([
      client.from("cards").select("*").order("id"),
      client.from("positions").select("*").order("sort"),
    ]);
    if (c.error || p.error) throw new Error((c.error || p.error).message);
    D.cards.length = 0;
    (c.data || []).forEach((r) => D.cards.push(rowToCard(r)));
    D.positions.length = 0;
    (p.data || []).forEach((r) => D.positions.push({ name: r.name, int: r.intensity, image: r.image || "", desc: r.description || "" }));
    contentLoaded = true;
    return true;
  }

  /* ---------- Telas ---------- */
  function prefillComplete() {
    const name = $("#completeName");
    if (name && !name.value) {
      const meta = (session && session.user.user_metadata) || {};
      name.value = (profile && profile.display_name) || meta.full_name || meta.name || "";
    }
  }

  function bindPasswordToggles() {
    $$(".au-toggle").forEach((btn) => {
      btn.addEventListener("click", () => {
        const input = $("input", btn.parentElement);
        const show = input.type === "password";
        input.type = show ? "text" : "password";
        btn.textContent = show ? "Ocultar" : "Mostrar";
        btn.setAttribute("aria-pressed", show ? "true" : "false");
      });
    });
  }

  function renderHeroFans() {
    if (!D) return;
    const get = (id) => D.categories.find((c) => c.id === id);
    const card = (c, cls) => (c ? `<div class="fan-card ${cls}">${c.icon}<span>${c.name}</span></div>` : "");
    const html = card(get("diversao"), "fan-card--l") + card(get("intimidade"), "fan-card--r") + card(get("conexao"), "fan-card--c");
    $$(".au-fan").forEach((el) => { el.innerHTML = html; });
  }

  async function onLogin(e) {
    e.preventDefault();
    const err = $("#loginError");
    showMsg(err, "");
    const email = $("#loginEmail").value.trim();
    const password = $("#loginPassword").value;
    if (!validEmail(email) || !password) return showMsg(err, "Preencha o e-mail e a senha.");
    const btn = $("#loginSubmit");
    busy(btn, true, "Entrando…");
    const { error } = await client.auth.signInWithPassword({ email, password });
    busy(btn, false);
    if (error) showMsg(err, friendly(error));
  }

  async function onForgot() {
    const err = $("#loginError");
    const email = $("#loginEmail").value.trim();
    if (!validEmail(email)) return showMsg(err, "Digite seu e-mail acima para receber o link de nova senha.");
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
    if (error) showMsg(err, friendly(error));
    else showMsg(err, "Se existir uma conta com esse e-mail, enviamos o link para criar uma nova senha.", "info");
  }

  function readProfileFields(prefix) {
    const err = $(`#${prefix}Error`);
    const name = $(`#${prefix}Name`).value.trim();
    const birth = parseBirth($(`#${prefix}Birth`).value);
    if (name.length < 2) { showMsg(err, "Como quer ser chamado(a)? Escreva pelo menos 2 letras."); return null; }
    if (birth.error) { showMsg(err, birth.error); return null; }
    if (!$(`#${prefix}Age`).checked) { showMsg(err, "Confirme que você tem 18 anos ou mais."); return null; }
    if (!$(`#${prefix}Terms`).checked) { showMsg(err, "Aceite os Termos de Uso e a Política de Privacidade para continuar."); return null; }
    return { name, birth_date: birth.iso };
  }

  async function onSignup(e) {
    e.preventDefault();
    const err = $("#signupError");
    showMsg(err, "");
    const email = $("#signupEmail").value.trim();
    const password = $("#signupPassword").value;
    if (!validEmail(email)) return showMsg(err, "Digite um e-mail válido.");
    if (password.length < 8) return showMsg(err, "A senha precisa ter pelo menos 8 caracteres.");
    const f = readProfileFields("signup");
    if (!f) return;
    const btn = $("#signupSubmit");
    busy(btn, true, "Criando conta…");
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl(),
        data: { display_name: f.name, birth_date: f.birth_date, terms_accepted: true },
      },
    });
    busy(btn, false);
    if (error) return showMsg(err, friendly(error));
    if (data.user && data.user.identities && data.user.identities.length === 0)
      return showMsg(err, "Já existe uma conta com esse e-mail. Tente entrar.");
    if (!data.session) {
      $("#signupForm").hidden = true;
      $("#signupDoneEmail").textContent = email;
      $("#signupDone").hidden = false;
    }
  }

  async function onComplete(e) {
    e.preventDefault();
    const err = $("#completeError");
    showMsg(err, "");
    const f = readProfileFields("complete");
    if (!f) return;
    const btn = $("#completeSubmit");
    busy(btn, true, "Salvando…");
    const { error } = await client
      .from("profiles")
      .update({ display_name: f.name, birth_date: f.birth_date, terms_accepted_at: new Date().toISOString() })
      .eq("id", session.user.id);
    busy(btn, false);
    if (error) return showMsg(err, "Não foi possível salvar. Confira a data de nascimento.");
    await loadProfile();
    renderHomeUser();
    proceed();
  }

  async function onNewPass(e) {
    e.preventDefault();
    const err = $("#newpassError");
    showMsg(err, "");
    const password = $("#newpassPassword").value;
    if (password.length < 8) return showMsg(err, "A senha precisa ter pelo menos 8 caracteres.");
    const btn = $("#newpassSubmit");
    busy(btn, true, "Salvando…");
    const { error } = await client.auth.updateUser({ password });
    busy(btn, false);
    if (error) return showMsg(err, friendly(error));
    app().showToast("Senha atualizada.");
    proceed();
  }

  async function onGoogle() {
    sessionStorage.setItem("en_next", pending || "inicio");
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectUrl() },
    });
    if (error) {
      sessionStorage.removeItem("en_next");
      app().showToast("Não foi possível entrar com o Google agora.");
    }
  }

  /* ---------- Init ---------- */
  async function init() {
    renderHeroFans();
    bindPasswordToggles();
    $$("input[data-mask='date']").forEach(maskDate);
    $$("[data-soon]").forEach((b) => b.addEventListener("click", () => app().showToast(b.dataset.soon)));

    if (!client) { renderHomeUser(); return; }

    $("#loginForm").addEventListener("submit", onLogin);
    $("#signupForm").addEventListener("submit", onSignup);
    $("#completeForm").addEventListener("submit", onComplete);
    $("#newpassForm").addEventListener("submit", onNewPass);
    $("#forgotBtn").addEventListener("click", onForgot);
    $$("[data-auth='google']").forEach((b) => b.addEventListener("click", onGoogle));
    $("#completeLogout").addEventListener("click", signOut);


    // Importante: não chamar o Supabase dentro do callback (evita travar). Usa setTimeout.
    client.auth.onAuthStateChange((event, s) => {
      session = s;
      setTimeout(() => refresh(event), 0);
    });
    const { data } = await client.auth.getSession();
    session = data.session;
    await refresh("INITIAL");
  }

  /* ---------- Dia jogado (sequência) e plano ---------- */
  let playedKey = null;
  const spToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());

  async function registerPlay() {
    if (!client || !session) return null;
    const day = spToday();
    if (playedKey === day) return null;
    playedKey = day;
    // O servidor registra o dia, aplica um bloqueio de ofensiva se for preciso e dá as moedas do dia
    try {
      const { data, error } = await client.rpc("register_day");
      if (error) throw error;
      return data;
    } catch { playedKey = null; /* tenta de novo na próxima vez */ return null; }
  }

  /* ---------- Pontos, moedas, termômetro (tudo calculado no servidor) ---------- */
  async function rpc(name) {
    if (!client || !session) return null;
    try {
      const { data, error } = await client.rpc(name);
      return error ? null : data;
    } catch { return null; }
  }
  const getGame = () => rpc("game_state");
  const completeQuick = () => rpc("complete_quick");
  const completeGame = () => rpc("complete_game");
  const completeSecret = () => rpc("complete_secret");
  const buyFreeze = () => rpc("buy_freeze");
  async function getSecret() {
    const r = await rpc("get_secret_card");
    return r && r.ok ? { card: rowToCard(r.card), done: !!r.done } : r;
  }
  async function peekCard() {
    const r = await rpc("peek_card");
    return r && r.ok ? { ...r, card: rowToCard(r.card) } : r;
  }
  async function getStreak() {
    if (!client || !session) return null;
    const { data, error } = await client.rpc("my_streak");
    return error ? null : data;
  }

  async function getPlan() {
    if (!client || !session) return { premium: false };
    const { data } = await client.from("subscriptions").select("status, current_period_end").eq("user_id", session.user.id).maybeSingle();
    const ok = data && ["active", "trialing"].includes(data.status) && (!data.current_period_end || new Date(data.current_period_end) > new Date());
    return { premium: !!ok, status: data ? data.status : null, until: data ? data.current_period_end : null };
  }

  // Salva o nome e o gênero ("h", "m" ou "" para não informar)
  async function saveProfile({ name, gender, spouse }) {
    const g = gender === "h" || gender === "m" ? gender : null;
    const sp = String(spouse || "").trim().slice(0, 16) || null;
    const { error } = await client.from("profiles").update({ display_name: name, gender: g, spouse_name: sp }).eq("id", session.user.id);
    if (!error) { await loadProfile(); renderHomeUser(); }
    return !error;
  }

  // Recorta no centro, reduz para 512 px e salva em JPEG (isso também apaga dados de localização da foto)
  function toAvatarBlob(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const size = 512;
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const side = Math.min(img.width, img.height);
        c.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/jpeg", 0.85);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
      img.src = url;
    });
  }

  // Envia uma foto já recortada (JPEG quadrado) para a pasta privada da pessoa
  async function uploadAvatarBlob(blob) {
    if (!client || !session || !blob || blob.size > 1024 * 1024) return false;
    try {
      const path = `${session.user.id}/avatar.jpg`;
      const up = await client.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", upsert: true });
      if (up.error) return false;
      const { error } = await client.from("profiles").update({ avatar_path: path }).eq("id", session.user.id);
      if (error) return false;
      await loadProfile();
      return true;
    } catch { return false; }
  }

  async function uploadAvatar(file) {
    if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) return false;
    try { return await uploadAvatarBlob(await toAvatarBlob(file)); } catch { return false; }
  }

  async function removeAvatar() {
    if (!client || !session || !profile || !profile.avatar_path) return true;
    try {
      const rm = await client.storage.from("avatars").remove([profile.avatar_path]);
      if (rm.error) return false;
      const { error } = await client.from("profiles").update({ avatar_path: null }).eq("id", session.user.id);
      if (error) return false;
      await loadProfile();
      return true;
    } catch { return false; }
  }

  async function saveName(name) {
    const { error } = await client.from("profiles").update({ display_name: name }).eq("id", session.user.id);
    if (!error) { await loadProfile(); renderHomeUser(); }
    return !error;
  }

  async function deleteAccount() {
    const { error } = await client.functions.invoke("delete-account");
    if (error) return false;
    await client.auth.signOut();
    session = null; profile = null; pending = null;
    clearContent();
    renderHomeUser();
    return true;
  }

  window.EntreNosAuth = {
    registerPlay, getStreak, getPlan, getGame, completeQuick, completeGame, getSecret, completeSecret, peekCard, buyFreeze, saveName, saveProfile, uploadAvatar, uploadAvatarBlob, removeAvatar, deleteAccount,
    getAvatarUrl: () => avatarUrl,
    getSession: () => session,
    getProfile: () => profile,
    enabled,
    needs,
    setPending: (t) => { pending = t; },
    loadContent,
    signOut,
  };

  document.addEventListener("DOMContentLoaded", init);
})();
