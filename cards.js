/* ============================================================
   PONTO A DOIS — DADOS DO JOGO
   ------------------------------------------------------------
   Aqui ficam só as CONFIGURAÇÕES públicas (categorias, formatos,
   etapas da Noite de Encontro). O texto das cartas está no Supabase.
   O arquivo completo antigo foi guardado em BACKUP-PRIVADO (não suba
   essa pasta para o GitHub).

   Carta:
   {
     id:       "conexao-001"   (gerado automaticamente, estável)
     cat:      "conexao" | "diversao" | "carinho" | "intimidade" | "posicoes"
     int:      "leve" | "picante" | "intenso"
     fmt:      formato (veja FORMATS)
     text:     texto principal (aceita {atual} e {outro} = nomes)
     options:  ["A", "B"]      (formato "escolha")
     truth / dare: textos do formato "vd" (verdade ou desafio)
     dareSeconds:  cronômetro que só aparece se a pessoa escolher o desafio
     seconds:  número          (mostra cronômetro)
     who:      "vez" | "ambos" (padrão vem do formato)
     tags:     ["fim", ...]    ("fim" = só na Noite de Encontro)
     forGender: "h" | "m"    (carta só para quando o homem / a mulher está na vez)
   }

   IMPORTANTE: para não quebrar os ids, adicione novas cartas
   sempre no FINAL do bloco da categoria.
   ============================================================ */
(function () {
  const svg = (inner) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

  /* ---------- Categorias ---------- */
  const categories = [
    {
      id: "conexao",
      name: "Conexão",
      sub: "Perguntas e memórias",
      icon: svg('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/>'),
    },
    {
      id: "diversao",
      name: "Diversão",
      sub: "Brincadeiras e risadas",
      icon: svg('<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>'),
    },
    {
      id: "verdade",
      name: "Verdade ou Desafio",
      sub: "Você escolhe o lado",
      icon: svg('<rect width="12" height="12" x="2" y="10" rx="2" ry="2"/><path d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6"/><path d="M6 18h.01"/><path d="M10 14h.01"/><path d="M15 6h.01"/><path d="M18 9h.01"/>'),
    },
    {
      id: "carinho",
      name: "Carinho",
      sub: "Toques e beijos",
      icon: svg('<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/>'),
    },
    {
      id: "intimidade",
      name: "Intimidade",
      sub: "Desejo e cumplicidade",
      icon: svg('<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>'),
    },
    {
      id: "posicoes",
      name: "Posições",
      sub: "Ideias para os dois",
      icon: svg('<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/>'),
    },
  ];

  /* Categorias que ganham uma coroa no menu para quem ainda não assina
     (têm pouco ou nenhum conteúdo gratuito) */
  const premiumCats = ["carinho", "intimidade", "posicoes"];

  /* ---------- Intensidades (cumulativas: "Picante" inclui "Leve") ---------- */
  const intensities = [
    { id: "leve",    name: "Leve",    desc: "Carinho, risadas e conversa" },
    { id: "picante", name: "Picante", desc: "Mais envolvente e provocante" },
    { id: "intenso", name: "Intenso", desc: "Mais profundo e ousado" },
  ];

  // Nomes da intensidade que fazem mais sentido em cada categoria
  const intLabels = {
    conexao:  { leve: "Leve", picante: "Profundo", intenso: "Muito profundo" },
    diversao: { leve: "Leve", picante: "Animado",  intenso: "Ousado" },
  };

  /* ---------- Formatos ---------- */
  const formats = {
    acao:        { label: "Ação", help: "Uma ação para fazer, às vezes com cronômetro.",             who: "vez",   hint: "" },
    pergunta:    { label: "Pergunta", help: "Cada um responde, um de cada vez.",         who: "ambos", hint: "Cada um responde, um de cada vez." },
    escolha:     { label: "Escolha", help: "Duas opções (A ou B). Quem está na vez escolhe.",          who: "vez",   hint: "{atual} escolhe e conta o porquê." },
    adivinha:    { label: "Adivinha", help: "Um tenta adivinhar algo sobre o outro.",         who: "vez",   hint: "{atual} tenta adivinhar. Depois, {outro} revela." },
    juntos:      { label: "Juntos", help: "Os dois ao mesmo tempo, com contagem 3, 2, 1.",           who: "ambos", hint: "Os dois ao mesmo tempo.", countdown: true },
    frase:       { label: "Complete a frase", help: "Cada um completa a frase em voz alta.", who: "ambos", hint: "Cada um completa, em voz alta." },
    historia:    { label: "Nossa história", help: "Um conta uma lembrança e o outro escuta.",   who: "ambos", hint: "Um conta, o outro escuta. Depois invertam." },
    brincadeira: { label: "Brincadeira", help: "Algo leve para rir juntos.",      who: "vez",   hint: "" },
    vd:          { label: "Você escolhe", help: "Quem está na vez escolhe verdade ou desafio.",     who: "vez",   hint: "{atual} escolhe. Pode mudar de ideia ou pedir outra carta." },
    missao:      { label: "Missão", help: "Um combinado para depois do jogo.",           who: "ambos", hint: "Combinem agora. Vale para depois do jogo." },
  };

  /* ---------- Noite de Encontro (sessão guiada) ---------- */
  const stages = [
    { id: "aquecimento", name: "Aquecimento", n: 3, cats: ["conexao", "diversao"], ints: ["leve"], tags: ["abertura"] },
    { id: "conexao",     name: "Conexão",     n: 4, cats: ["conexao"],             ints: ["leve", "picante"] },
    { id: "diversao",    name: "Diversão",    n: 3, cats: ["diversao", "verdade"],            ints: ["leve", "picante"] },
    { id: "carinho",     name: "Carinho",     n: 3, cats: ["carinho"],             ints: ["leve", "picante", "intenso"], ascending: true },
    { id: "intimidade",  name: "Intimidade",  n: 3, cats: ["intimidade", "posicoes"], ints: ["picante", "intenso"], ascending: true },
    { id: "fechamento",  name: "Fechamento",  n: 1, cats: ["conexao"],             ints: ["leve", "picante", "intenso"], tags: ["fim"], only: true },
  ];

  /* ---------- Cartas e posições ----------
     O CONTEÚDO DAS CARTAS NÃO FICA MAIS NESTE ARQUIVO (ele é público).
     As cartas e as posições vivem no Supabase (tabelas "cards" e
     "positions") e só chegam a quem tem a idade verificada; as
     premium, só a quem assina. O auth.js preenche as duas listas
     abaixo depois do login.
     Imagens das posições: preencha a URL base e, no banco, a coluna
     "image" de cada posição com o nome do arquivo.
       positionImageBase = "https://seusite.com/posicoes/";            */
  /* Capas das categorias do Jogo Livre: quando a imagem existir, informe o caminho aqui.
     Exemplo: { diversao: "img/capas/diversao.webp", carinho: "img/capas/carinho.webp" }
     Categorias sem imagem ficam como estão. */
  const categoryArt = {};

  const cards = [];
  const positions = [];
  const positionImageBase = "";

  window.EntreNosData = {
    categories, premiumCats, categoryArt, intensities, intLabels, formats, stages,
    cards, positions, positionImageBase,
  };
})();
