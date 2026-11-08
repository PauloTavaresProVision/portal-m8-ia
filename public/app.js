/* Portal M8 · IA na Liderança — ecrã do formando (versão simples)
   1) Entrar: escolher o nome e «Estou presente».
   2) Trabalhar: chat à esquerda, exercício do momento à direita (o formador muda o passo). */
(() => {
  "use strict";
  // Conteúdos por nível (public/conteudos-*.js); escolhidos pela turma activa.
  const NIVEIS = window.CONTEUDOS_NIVEIS;
  let C, PASSOS, passoPorId;
  function usarNivel(nivel) {
    C = NIVEIS[nivel] || NIVEIS.supervisores;
    PASSOS = C.passos;
    passoPorId = Object.fromEntries(PASSOS.map((p) => [p.id, p]));
  }
  usarNivel("supervisores");
  const S = { cfg: {}, sessao: null, turma: null, pessoa: null, est: null, passoChat: "inicio",
    mensagens: [], anexos: [], aEnviar: false, timer: null };

  // ------------------------------------------------------------ utilitários
  const guardar = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } };
  const ler = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  function h(tag, attrs, ...filhos) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const f of filhos.flat()) if (f != null && f !== false) el.append(f instanceof Node ? f : document.createTextNode(String(f)));
    return el;
  }
  const md = (txt) => DOMPurify.sanitize(marked.parse(txt || "", { breaks: false, gfm: true }));
  const horaDe = (iso) => iso ? new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "";
  const dataLonga = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
  const primeiroNome = (n) => n.split(" ")[0];
  function toast(msg) {
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const t = h("div", { class: "toast", role: "status" }, msg);
    document.body.append(t);
    setTimeout(() => t.remove(), 2800);
  }
  const cabecalhos = () => ({ "Content-Type": "application/json", "x-turma": S.turma?.id || "", "x-pessoa": S.pessoa?.id || "" });
  async function api(metodo, url, corpo) {
    const r = await fetch(url, { method: metodo, headers: cabecalhos(), body: corpo ? JSON.stringify(corpo) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.erro || `Erro ${r.status}`); e.status = r.status; e.dados = j; throw e; }
    return j;
  }
  async function copiar(texto) {
    try { await navigator.clipboard.writeText(texto); }
    catch (e) {
      const ta = h("textarea", { style: "position:absolute;left:-9999px" }); ta.value = texto; document.body.append(ta); ta.select();
      try { document.execCommand("copy"); } finally { ta.remove(); }
    }
    toast("Copiado");
  }
  function descarregar(blob, nome) {
    const a = h("a", { href: URL.createObjectURL(blob), download: nome }); document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function modal(conteudo) {
    const fundo = h("div", { class: "fundo-modal", onclick: (e) => { if (e.target === fundo) fundo.remove(); } }, h("div", { class: "modal", role: "dialog", "aria-modal": "true" }, conteudo));
    document.body.append(fundo);
    return () => fundo.remove();
  }
  const render = (el) => document.getElementById("raiz").replaceChildren(el);
  const logo = (cor) => h("img", { class: "logo", src: `/marca/logo-${cor}.svg`, alt: "UCALL" });

  const NOMES_PII = { email: ["e-mail", "e-mails"], nif: ["NIF", "NIF"], telefone: ["número de telefone", "números de telefone"], iban: ["IBAN", "IBAN"] };
  function mostrarPii(achados) {
    const itens = Object.entries(achados).filter(([k]) => k !== "colunas").map(([k, n]) => h("li", {}, `${n} ${(NOMES_PII[k] || [k, k])[n === 1 ? 0 : 1]}`));
    if (achados.colunas) itens.push(h("li", {}, `Colunas: ${achados.colunas.join(", ")}`));
    let fechar;
    fechar = modal(h("div", { class: "alerta-pii" }, h("div", { class: "luz", "aria-hidden": "true" }),
      h("div", {}, h("h2", { class: "t-marca" }, "Não enviado"),
        h("p", {}, "O ficheiro ou a mensagem tem dados pessoais. Isto ia sair da empresa:"), h("ul", {}, itens),
        h("p", { class: "mudo" }, "Tira o anexo (×). A IA não precisa dos dados: diz-lhe só os nomes das colunas e o que queres saber. Ou apaga essas colunas no Excel e lê os textos linha a linha: às vezes há telefones ou e-mails escondidos."),
        h("button", { class: "prim", onclick: () => fechar() }, "Percebi"))));
  }

  // ------------------------------------------------------------ ficheiros para o chat
  function base64(buf) {
    let s = ""; const b = new Uint8Array(buf);
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  }
  async function lerFicheiro(file) {
    const nome = file.name, ext = nome.split(".").pop().toLowerCase();
    if (file.size > 6 * 1024 * 1024) throw new Error("O ficheiro tem mais de 6 MB.");
    if (["xlsx", "xls", "xlsm", "ods"].includes(ext)) {
      const wb = XLSX.read(await file.arrayBuffer());
      let txt = "";
      for (const sn of wb.SheetNames) txt += `### Folha: ${sn}\n${XLSX.utils.sheet_to_csv(wb.Sheets[sn], { blankrows: false })}\n\n`;
      return { nome, tipo: "texto", conteudo: txt };
    }
    if (ext === "pdf") return { nome, tipo: "pdf", conteudo: base64(await file.arrayBuffer()) };
    if (["csv", "txt", "md"].includes(ext)) return { nome, tipo: "texto", conteudo: await file.text() };
    throw new Error("Esse tipo de ficheiro não dá. Usa Excel, CSV, TXT ou PDF.");
  }
  async function anexarDaFormacao(chave) {
    const f = C.ficheiros[chave];
    const blob = await fetch(`/ficheiros/${f.ficheiro}`).then((r) => r.blob());
    await adicionarAnexo(new File([blob], f.ficheiro));
  }
  async function adicionarAnexo(file) {
    try {
      const a = await lerFicheiro(file);
      S.anexos = S.anexos.filter((x) => x.nome !== a.nome).concat(a);
      desenharAnexos();
    } catch (e) { toast(e.message); }
  }

  // ------------------------------------------------------------ arranque e entrada
  async function iniciar() {
    S.cfg = await fetch("/api/config").then((r) => r.json()).catch(() => ({}));
    S.sessao = await fetch("/api/sessao").then((r) => r.json());
    S.turma = S.sessao.turma;
    usarNivel(S.turma.nivel);
    const pid = ler("m8.pessoa"), tid = ler("m8.turma");
    const p = tid === S.turma.id && S.sessao.participantes.find((x) => x.id === pid);
    if (p) { S.pessoa = p; return abrirApp(); }
    ecraEntrada();
  }

  function ecraEntrada() {
    const t = S.turma;
    let escolhido = null;
    const grelha = h("div", { class: "grelha-nomes" });
    const busca = h("input", { type: "search", placeholder: "Procura o teu nome", "aria-label": "Procura o teu nome" });
    const barraConfirmar = h("div", { class: "confirmar" });
    const desenhar = () => {
      const q = busca.value.trim().toLowerCase();
      grelha.replaceChildren(...S.sessao.participantes.filter((p) => !q || p.nome.toLowerCase().includes(q)).map((p) =>
        h("button", { class: escolhido?.id === p.id ? "sel" : null, "aria-pressed": escolhido?.id === p.id ? "true" : "false", onclick: () => { escolhido = p; desenhar(); } },
          h("span", {}, p.nome), p.presente ? h("span", { class: "ja" }, "já entrou") : "")));
      barraConfirmar.replaceChildren(
        escolhido
          ? h("button", { class: "prim grande", onclick: entrar }, "Estou presente")
          : h("button", { class: "prim grande", disabled: true }, "Estou presente"),
        h("span", { class: "mudo" }, escolhido ? `Vais entrar como ${escolhido.nome}.` : "Carrega no teu nome."));
    };
    async function entrar() {
      S.pessoa = escolhido;
      try {
        await api("POST", "/api/presenca", { momento: "entrada" });
        guardar("m8.pessoa", escolhido.id); guardar("m8.turma", t.id);
        abrirApp();
      } catch (e) { S.pessoa = null; toast(e.message); }
    }
    busca.addEventListener("input", desenhar);
    desenhar();
    render(h("div", { class: "entrada" },
      h("div", { class: "lado" },
        logo("white"),
        h("div", {}, h("p", { class: "sobre" }, "M8 · Academia UCALL"), h("h1", { class: "t-marca" }, "IA na liderança")),
        h("div", { class: "info" }, h("strong", {}, t.nome), `${dataLonga(t.data)} · ${t.inicio}–${t.fim}`, h("br"), `Sala ${t.sala}`)),
      h("div", { class: "nomes" },
        h("h2", { class: "t-marca" }, "Quem és?"),
        S.sessao.participantes.length > 14 ? busca : "",
        grelha, barraConfirmar)));
  }

  // ------------------------------------------------------------ ecrã de trabalho
  async function abrirApp() {
    try { S.est = await api("GET", "/api/estado"); }
    catch (e) {
      if (e.status === 401) { guardar("m8.pessoa", null); S.pessoa = null; return ecraEntrada(); }
      toast("O portal não respondeu. Recarrega a página."); return;
    }
    // Sem entrada registada (por exemplo, dados de teste apagados): volta a escolher o nome.
    if (!S.est.presenca?.entrada) { guardar("m8.pessoa", null); S.pessoa = null; return ecraEntrada(); }
    // Na pausa, o chat continua na conversa do exercício anterior.
    const iPasso = PASSOS.findIndex((p) => p.id === S.est.passo);
    if (iPasso >= 0) S.passoChat = S.est.passo === "pausa" ? PASSOS[iPasso - 1].id : S.est.passo;
    render(h("div", { class: "app" },
      h("header", { class: "barra", id: "barra" }),
      h("div", { class: "trabalho" },
        h("section", { class: "chat", id: "chat", "aria-label": "Chat com a IA" }),
        h("aside", { class: "exercicio", id: "exercicio", "aria-label": "Exercício" }))));
    desenharBarra(); desenharExercicio(); montarChat(); await carregarConversa();
    clearInterval(S.timer);
    S.timer = setInterval(sincronizar, 4000);
  }

  async function sincronizar() {
    try {
      const antes = S.est;
      const novo = await api("GET", "/api/estado");
      if (!novo.presenca?.entrada) { clearInterval(S.timer); guardar("m8.pessoa", null); S.pessoa = null; return iniciar(); }
      S.est = novo;
      if (novo.passo !== antes.passo) {
        desenharBarra();
        if (!document.querySelector("#exercicio textarea:focus, #exercicio input:focus")) desenharExercicio();
        if (novo.passo !== "pausa" && novo.passo !== S.passoChat) {
          S.passoChat = novo.passo; S.anexos = []; desenharAnexos(); desenharCabChat(); await carregarConversa();
        }
        toast(`Agora: ${passoPorId[novo.passo]?.titulo || ""}`);
      } else if (JSON.stringify(novo.presenca) !== JSON.stringify(antes.presenca)) desenharBarra();
    } catch (e) {
      if (e.status === 401) { clearInterval(S.timer); guardar("m8.pessoa", null); iniciar(); }
    }
  }

  function botaoPresenca() {
    const p = S.est.presenca || {}, passo = S.est.passo;
    const depoisPausa = ["pausa", "ex4", "aovivo", "compromisso"].includes(passo);
    if (depoisPausa && !p.regresso) return h("button", { class: "destaque", onclick: () => marcar("regresso") }, "Voltei da pausa");
    if (passo === "compromisso" && !p.saida) return h("button", { class: "destaque", onclick: () => marcar("saida") }, "Vou sair");
    if (p.saida) return h("span", { class: "pequeno-txt" }, `Saída às ${horaDe(p.saida)}`);
    return h("span", { class: "pequeno-txt" }, `Presente desde ${horaDe(p.entrada)}`);
  }
  async function marcar(momento) {
    if (momento === "saida" && !confirm("Marcar a tua saída agora?")) return;
    try {
      const r = await api("POST", "/api/presenca", { momento });
      S.est.presenca = r.presenca;
      toast(momento === "regresso" ? "Regresso marcado. Bom trabalho!" : "Saída marcada. Obrigado!");
      desenharBarra(); desenharExercicio();
    } catch (e) { toast(e.message); }
  }
  function desenharBarra() {
    const barra = document.getElementById("barra");
    if (!barra) return;
    const i = PASSOS.findIndex((p) => p.id === S.est.passo);
    barra.replaceChildren(
      logo("white"), h("span", { class: "modulo" }, "M8 · IA na Liderança"),
      h("nav", { class: "trilho", "aria-label": "Passos da sessão" }, PASSOS.map((p, j) => h("span", { class: j === i ? "agora" : j < i ? "feito" : null, "aria-current": j === i ? "step" : null }, p.etiqueta))),
      h("span", { class: "espaco" }),
      botaoPresenca(),
      h("span", { class: "quem" }, primeiroNome(S.pessoa.nome)),
      h("button", { class: "peq", title: "Trocar de pessoa", onclick: () => {
        if (!confirm(`Não és ${S.pessoa.nome}? Vais voltar à lista de nomes.`)) return;
        clearInterval(S.timer); guardar("m8.pessoa", null); S.pessoa = null; S.mensagens = []; iniciar();
      } }, "Não sou eu"));
  }

  // ------------------------------------------------------------ painel do exercício (direita)
  function desenharExercicio() {
    const caixa = document.getElementById("exercicio");
    if (!caixa) return;
    const p = passoPorId[S.est.passo] || PASSOS[0];
    const blocos = [];
    if (S.cfg.demo) blocos.push(h("div", { class: "cartao", style: "padding:10px 14px;background:var(--amarelo-suave);border-color:#f3dc8f" }, h("span", { class: "pequeno-txt" }, h("b", {}, "Modo de ensaio: "), "o chat dá respostas fixas, sem IA.")));

    if (p.tipo === "info") {
      blocos.push(h("div", { class: "cartao ex-cab bloco-cor" }, h("p", { class: "sobre" }, "Início"), h("h2", { class: "t-marca" }, `Bem-vindo/a, ${primeiroNome(S.pessoa.nome)}`), h("p", { style: "margin:0" }, p.texto)));
      blocos.push(h("div", { class: "cartao" }, h("p", { class: "sobre" }, "Enquanto esperas"), h("ol", { class: "passos" }, p.passos.map((x) => h("li", {}, x)))));
    }

    if (p.tipo === "exercicio") {
      const cor = { Usar: "usar", Validar: "validar", Proteger: "proteger", Decidir: "usar", Governar: "proteger", Medir: "validar",
        "Relatório": "usar", Alertas: "proteger", Pessoas: "validar", Rotina: "usar" }[p.bloco];
      blocos.push(h("div", { class: `cartao ex-cab bloco-cor ${cor}` },
        h("p", { class: "sobre" }, `Exercício ${p.n} de 4 · ${p.bloco}`), h("h2", { class: "t-marca" }, p.titulo), h("p", { style: "margin:0" }, p.texto),
        p.diferenca ? h("p", { class: "diferenca" }, h("b", {}, "A diferença: "), p.diferenca) : ""));
      // Passos com botões próprios (juntar o ficheiro, ver o exemplo, abrir o Excel) em cada linha.
      if (p.passos.some((x) => typeof x !== "string")) {
        blocos.push(h("div", { class: "cartao" }, h("p", { class: "sobre" }, "Faz assim"), h("ol", { class: "passos" }, p.passos.map((x) => itemPasso(p, x)))));
        blocos.push(cartaoEntrega(p));
        caixa.replaceChildren(...blocos);
        return;
      }
      // Com "juntar": o formando escreve o pedido e só junta os ficheiros; o pedido pronto é um exemplo, se ficar parado.
      const acoes = p.juntar
        ? [h("div", { class: "botoes-pedido" }, p.juntar.map((k, j) => h("button", { class: j === 0 ? "prim" : "contorno", onclick: () => juntarFicheiro(k) },
            h("span", {}, C.ficheiros[k].juntar), h("span", { "aria-hidden": "true" }, "+")))),
          h("div", { class: "exemplos" }, h("span", { class: "mudo" }, "Ficaste parado?"),
            p.pedidos.map((pd, k) => h("button", { class: "subtil peq", onclick: () => prepararPedido(pd) }, p.pedidos.length > 1 ? `Ver exemplo ${k + 1}` : "Ver um exemplo")))]
        : [h("div", { class: "botoes-pedido" }, p.pedidos.map((pd, k) => h("button", { class: k === 0 ? "prim" : "contorno", onclick: () => prepararPedido(pd) },
            h("span", {}, `Preparar pedido ${k + 1}`), h("span", { "aria-hidden": "true" }, "→"))))];
      blocos.push(h("div", { class: "cartao" }, h("p", { class: "sobre" }, "Faz assim"),
        h("ol", { class: "passos" }, p.passos.map((x) => h("li", {}, x))),
        ...acoes,
        h("div", { class: "ficheiros" }, p.abrir.map((k) => h("a", { href: `/ficheiros/${C.ficheiros[k].ficheiro}`, download: C.ficheiros[k].ficheiro, title: C.ficheiros[k].nome }, C.ficheiros[k].botao)))));
      blocos.push(cartaoEntrega(p));
    }

    if (p.tipo === "pausa") {
      const reg = S.est.presenca?.regresso;
      blocos.push(h("div", { class: "cartao pausa-cartao" }, h("h2", { class: "t-marca" }, "Pausa"),
        h("p", {}, `Voltamos às ${S.turma.pausaFim}.`),
        reg ? h("p", { class: "entregue", style: "justify-content:center;color:var(--tinta)" }, `✓ Regresso marcado às ${horaDe(reg)}`)
          : h("button", { class: "grande", style: "background:#fff;border-color:#fff", onclick: () => marcar("regresso") }, "Voltei da pausa")));
    }

    if (p.tipo === "aovivo") {
      blocos.push(h("div", { class: "cartao ex-cab bloco-cor aovivo" },
        h("p", { class: "sobre" }, h("span", { class: "ponto-vivo", "aria-hidden": "true" }), "Ao vivo · GoContact TAAG"),
        h("h2", { class: "t-marca" }, p.titulo), h("p", { style: "margin:0" }, p.texto)));
      blocos.push(h("div", { class: "cartao" }, h("p", { class: "sobre" }, "Faz assim"), h("ol", { class: "passos" }, p.passos.map((x) => itemPasso(p, x)))));
    }

    if (p.tipo === "compromisso") blocos.push(...cartoesCompromisso(p));
    caixa.replaceChildren(...blocos);
  }

  // Um passo do exercício, com os botões desse passo por baixo do texto.
  function itemPasso(p, x) {
    if (typeof x === "string") return h("li", {}, x);
    const botoes = [];
    if (x.juntar) botoes.push(h("button", { class: "prim peq", onclick: () => juntarFicheiro(x.juntar) }, `${C.ficheiros[x.juntar].juntar} +`));
    if (x.exemplo != null) botoes.push(h("button", { class: "contorno peq", onclick: () => prepararPedido(p.pedidos[x.exemplo]) }, "Ver o exemplo"));
    if (x.abrir) { const f = C.ficheiros[x.abrir]; botoes.push(h("a", { class: "botao-link", href: `/ficheiros/${f.ficheiro}`, download: f.ficheiro, title: f.nome }, f.botao)); }
    if (x.pagina) botoes.push(botaoPagina());
    return h("li", {}, h("div", {}, h("div", {}, x.texto), botoes.length ? h("div", { class: "botoes-passo" }, botoes) : ""));
  }
  const paginaPronta = () => S.passoChat === "aovivo" && S.mensagens.some((m) => m.pagina);
  const abrirPagina = () => window.open("/aovivo.html", "_blank");
  function botaoPagina() {
    return paginaPronta()
      ? h("button", { class: "prim", onclick: abrirPagina }, "Abrir a página →")
      : h("span", { class: "pequeno-txt mudo" }, "O botão aparece quando a página estiver pronta.");
  }

  async function prepararPedido(pd) {
    const ta = document.getElementById("caixa-texto");
    for (const k of pd.anexar || []) await anexarDaFormacao(k);
    ta.value = pd.texto;
    ta.focus();
    toast(pd.anexar?.length ? "Pedido e ficheiro prontos. Podes mudar o texto antes de enviar." : "Pedido pronto. Podes mudar o texto antes de enviar.");
  }
  async function juntarFicheiro(k) {
    await anexarDaFormacao(k);
    document.getElementById("caixa-texto")?.focus();
    toast("Ficheiro junto. Agora escreve o teu pedido e carrega em Enviar.");
  }

  function cartaoEntrega(p) {
    const actual = S.est.entregas?.[p.id];
    const ta = h("textarea", { rows: "6", placeholder: p.entrega, "aria-label": "A tua entrega" });
    const msg = h("div", { class: "erro-txt", role: "alert" });
    ta.addEventListener("input", () => { msg.textContent = ""; });
    if (actual) ta.value = actual.texto;
    const enviar = async () => {
      if (!ta.value.trim()) { msg.textContent = "Escreve ou cola a tua resposta primeiro."; return; }
      try {
        await api("POST", "/api/entrega", { passo: p.id, texto: ta.value });
        S.est = await api("GET", "/api/estado");
        toast("Entregue. Obrigado!"); desenharExercicio();
      } catch (e) { msg.textContent = e.message; }
    };
    return h("div", { class: "cartao" }, h("p", { class: "sobre" }, "Entregar"),
      actual ? h("div", { class: "entregue" }, `✓ Entregue às ${horaDe(actual.ts)}`) : h("p", { style: "margin:0 0 8px" }, p.entrega),
      ta,
      h("div", { class: "linha entre", style: "margin-top:10px" },
        h("button", { class: "subtil", onclick: () => {
          const u = ultimaResposta();
          if (u) { ta.value = u; msg.textContent = ""; } else toast("Ainda não há respostas da IA neste exercício.");
        } }, "Usar a última resposta da IA"),
        h("button", { class: "prim", onclick: enviar }, actual ? "Entregar de novo" : "Entregar")), msg);
  }
  const ultimaResposta = () => [...S.mensagens].reverse().find((m) => m.role === "assistant" && m.texto)?.texto || "";

  function cartoesCompromisso(p) {
    const actual = S.est.compromisso || {};
    const campos = {};
    const msg = h("div", { class: "erro-txt", role: "alert" });
    const linhas = p.campos.map((c) => {
      const ta = h("textarea", { id: `c-${c.id}`, rows: "2", placeholder: c.exemplo });
      ta.value = actual[c.id] || "";
      ta.addEventListener("input", () => { msg.textContent = ""; });
      campos[c.id] = ta;
      return h("div", { style: "display:grid;gap:4px;margin-bottom:12px" },
        h("div", { class: "linha entre" }, h("label", { for: `c-${c.id}` }, h("b", {}, c.rotulo)),
          h("button", { class: "subtil peq", onclick: () => { ta.value = c.exemplo; } }, "Usar o exemplo")), ta);
    });
    const saida = S.est.presenca?.saida;
    return [
      h("div", { class: "cartao ex-cab bloco-cor" }, h("p", { class: "sobre" }, "Para terminar"), h("h2", { class: "t-marca" }, p.titulo), h("p", { style: "margin:0" }, p.texto)),
      h("div", { class: "cartao" },
        actual.ts ? h("div", { class: "entregue" }, `✓ Guardado às ${horaDe(actual.ts)}`) : "",
        linhas,
        h("button", { class: "prim", onclick: async () => {
          const valores = Object.fromEntries(Object.entries(campos).map(([k, ta]) => [k, ta.value.trim()]));
          if (Object.values(valores).some((v) => !v)) { msg.textContent = "Preenche os 3 campos."; return; }
          try { await api("POST", "/api/compromisso", { campos: valores }); S.est = await api("GET", "/api/estado"); toast("Compromisso guardado"); desenharExercicio(); }
          catch (e) { msg.textContent = e.message; }
        } }, actual.ts ? "Guardar de novo" : "Guardar"), msg),
      actual.ts ? h("div", { class: "cartao" }, h("p", { class: "sobre" }, "Depois de guardar"),
        h("ol", { class: "passos" },
          h("li", {}, "Regista o mesmo compromisso no formulário da Academia: ", h("a", { href: p.formulario, target: "_blank", rel: "noopener" }, "abrir o formulário"), "."),
          h("li", {}, saida ? `Saída marcada às ${horaDe(saida)}. Obrigado!` : h("span", {}, "No fim da sessão, marca a saída: ", h("button", { class: "contorno peq", onclick: () => marcar("saida") }, "Vou sair"))))) : "",
    ];
  }

  // ------------------------------------------------------------ chat (esquerda)
  function montarChat() {
    const chat = document.getElementById("chat");
    const ficheiro = h("input", { type: "file", accept: ".xlsx,.xls,.xlsm,.ods,.csv,.txt,.md,.pdf", multiple: true, class: "oculto", onchange: async () => { for (const f of ficheiro.files) await adicionarAnexo(f); ficheiro.value = ""; } });
    const ta = h("textarea", { id: "caixa-texto", placeholder: "Escreve aqui. Enter envia; Shift+Enter muda de linha.", "aria-label": "Mensagem para a IA" });
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); enviar(); } });
    chat.replaceChildren(
      h("div", { class: "cab", id: "cab-chat" }),
      h("div", { class: "mensagens", id: "mensagens", "aria-live": "polite" }),
      h("div", { class: "escrever" }, h("div", { class: "caixa" },
        h("div", { class: "linha", id: "chips" }), ta,
        h("div", { class: "linha entre" },
          h("span", {}, h("button", { class: "peq", onclick: () => ficheiro.click() }, "Anexar ficheiro"), ficheiro),
          h("button", { class: "prim", id: "botao-enviar", onclick: () => enviar() }, "Enviar")))));
    desenharCabChat(); desenharAnexos();
  }
  function desenharCabChat() {
    const cab = document.getElementById("cab-chat");
    if (!cab) return;
    const p = passoPorId[S.passoChat];
    cab.replaceChildren(h("div", { class: "linha" }, h("h2", { class: "t-marca" }, "Chat com a IA"),
      p?.tipo === "exercicio" ? h("span", { class: "etiq" }, `Exercício ${p.n}`) : p?.tipo === "aovivo" ? h("span", { class: "etiq mau" }, "Ao vivo") : ""),
      h("button", { class: "subtil peq", onclick: async () => {
        if (!S.mensagens.length || !confirm("Começar uma conversa nova neste exercício? A anterior fica guardada para o formador.")) return;
        await api("POST", `/api/conversa/${S.passoChat}/limpar`); S.mensagens = []; desenharMensagens();
        if (S.passoChat === "aovivo") desenharExercicio();
      } }, "Começar de novo"));
  }
  async function carregarConversa() {
    try { S.mensagens = (await api("GET", `/api/conversa/${S.passoChat}`)).mensagens; } catch (e) { S.mensagens = []; }
    desenharMensagens();
    if (S.passoChat === "aovivo") desenharExercicio(); // o botão «Abrir a página» depende da conversa
  }
  function desenharMensagens() {
    const caixa = document.getElementById("mensagens");
    if (!caixa) return;
    if (!S.mensagens.length) {
      const p = passoPorId[S.passoChat];
      caixa.replaceChildren(h("div", { class: "vazio-chat" }, h("h3", { class: "t-marca" }, "Pronto"),
        h("p", {}, p?.tipo === "aovivo" ? "Escreve em baixo o que gostavas de ver no teu ecrã durante o turno e carrega em Enviar. Se ficares parado, há um exemplo à direita."
          : p?.tipo !== "exercicio" ? "Escreve a tua pergunta em baixo e carrega em Enviar."
          : p.juntar || p.passos.some((x) => x.juntar) ? "Junta o ficheiro (à direita), escreve o teu pedido em baixo e carrega em Enviar. Se ficares parado, há um exemplo."
          : "Carrega em «Preparar pedido 1», à direita. O pedido aparece aqui em baixo: depois é só Enviar."),
        h("p", { class: "pequeno-txt" }, "Usa só dados da formação ou sem nomes. Confere sempre o que a IA diz.")));
      return;
    }
    caixa.replaceChildren(...S.mensagens.map(bolha));
    caixa.scrollTop = caixa.scrollHeight;
  }
  function desenharAnexos() {
    const chips = document.getElementById("chips");
    if (!chips) return;
    chips.replaceChildren(...S.anexos.map((a) => h("span", { class: "chip" }, a.nome,
      h("button", { "aria-label": `Tirar ${a.nome}`, onclick: () => { S.anexos = S.anexos.filter((x) => x !== a); desenharAnexos(); } }, "×"))));
    chips.classList.toggle("oculto", !S.anexos.length);
  }

  async function enviar() {
    if (S.aEnviar) return;
    const ta = document.getElementById("caixa-texto"), botao = document.getElementById("botao-enviar");
    const texto = ta.value.trim();
    if (!texto && !S.anexos.length) { ta.focus(); toast("Escreve uma mensagem."); return; }
    const passo = S.passoChat, anexos = S.anexos;
    S.aEnviar = true; botao.disabled = true;
    const msgUser = { role: "user", texto, anexos: anexos.map((a) => a.nome) };
    const msgIa = { role: "assistant", texto: "", aPensar: true };
    S.mensagens.push(msgUser, msgIa);
    ta.value = ""; S.anexos = []; desenharAnexos(); desenharMensagens();
    const repor = () => { S.mensagens = S.mensagens.filter((m) => m !== msgUser && m !== msgIa); ta.value = texto; S.anexos = anexos; desenharAnexos(); desenharMensagens(); };
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: cabecalhos(), body: JSON.stringify({ passo, texto, anexos }) });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        repor();
        if (r.status === 422 && j.pii) mostrarPii(j.pii); else toast(j.erro || `Erro ${r.status}`);
        return;
      }
      const leitor = r.body.getReader(); const dec = new TextDecoder(); let buf = "", agendado = false;
      const refrescar = () => { if (agendado) return; agendado = true; requestAnimationFrame(() => { agendado = false; if (S.passoChat === passo) desenharMensagens(); }); };
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n\n")) >= 0) {
          const linha = buf.slice(0, i); buf = buf.slice(i + 2);
          if (!linha.startsWith("data: ")) continue;
          const ev = JSON.parse(linha.slice(6));
          if (ev.t === "delta") { msgIa.aPensar = false; msgIa.texto += ev.v; refrescar(); }
          else if (ev.t === "aviso") { S.mensagens.push({ role: "aviso", texto: ev.v }); refrescar(); }
          else if (ev.t === "erro") { msgIa.aPensar = false; msgIa.erro = ev.v; refrescar(); }
          else if (ev.t === "pagina") { msgIa.pagina = true; refrescar(); }
        }
      }
      if (msgIa.erro && !msgIa.texto) { repor(); toast(msgIa.erro); }
      if (msgIa.pagina && S.passoChat === "aovivo") { desenharExercicio(); toast("A página está pronta."); }
    } catch (e) {
      repor(); toast("Sem ligação ao portal. Tenta outra vez.");
    } finally {
      msgIa.aPensar = false; S.aEnviar = false; botao.disabled = false;
      if (S.passoChat === passo) desenharMensagens();
      ta.focus();
    }
  }

  function bolha(m) {
    if (m.role === "user") {
      return h("div", { class: "msg user" }, m.anexos?.length ? h("div", { class: "linha" }, m.anexos.map((n) => h("span", { class: "chip" }, n))) : "",
        m.texto ? h("div", { class: "bolha" }, m.texto) : "");
    }
    if (m.role === "aviso") return h("div", { class: "msg aviso" }, h("div", { class: "corpo" }, m.texto));
    const corpo = h("div", { class: "corpo" });
    if (m.aPensar && !m.texto) corpo.append(h("span", { class: "a-pensar mudo" }, "A IA está a pensar"));
    else corpo.innerHTML = md(m.texto);
    if (m.erro) corpo.append(h("p", { class: "erro-txt" }, m.erro));
    if (m.pagina) return h("div", { class: "msg ia construcao" }, corpo, h("button", { class: "prim grande", onclick: abrirPagina }, "Abrir a página →"));
    const temTabela = /\n\s*\|?\s*:?-{3,}/.test(m.texto || "");
    const accoes = !m.aPensar && m.texto ? h("div", { class: "accoes" },
      h("button", { class: "subtil peq", onclick: () => copiar(m.texto) }, "Copiar"),
      h("button", { class: "subtil peq", onclick: () => paraWord(m.texto) }, "Word"),
      temTabela ? h("button", { class: "subtil peq", onclick: () => paraExcel(m.texto) }, "Excel") : "") : "";
    return h("div", { class: "msg ia" }, corpo, accoes);
  }

  async function paraWord(texto) {
    try {
      const r = await fetch("/api/export/docx", { method: "POST", headers: cabecalhos(), body: JSON.stringify({ markdown: texto, titulo: "Resposta da IA" }) });
      if (!r.ok) throw new Error("Não foi possível criar o Word.");
      descarregar(await r.blob(), `M8_resposta_${Date.now()}.docx`);
    } catch (e) { toast(e.message); }
  }
  function celula(txt) {
    const t = txt.replace(/\*\*/g, "").trim();
    const n = t.replace(/\s/g, "");
    if (/^-?\d+(?:[.,]\d+)?%$/.test(n)) return Number(n.replace("%", "").replace(",", ".")) / 100;
    if (/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(n)) return Number(n.replace(/\./g, "").replace(",", "."));
    if (/^-?\d+(?:,\d+)?$/.test(n)) return Number(n.replace(",", "."));
    if (/^-?\d+\.\d+$/.test(n)) return Number(n);
    return t;
  }
  function paraExcel(texto) {
    const tabelas = marked.lexer(texto).filter((t) => t.type === "table");
    if (!tabelas.length) { toast("Não há tabelas nesta resposta."); return; }
    const wb = XLSX.utils.book_new();
    tabelas.forEach((t, i) => {
      const aoa = [t.header.map((c) => c.text.replace(/\*\*/g, "")), ...t.rows.map((r) => r.map((c) => celula(c.text)))];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      t.rows.forEach((r, li) => r.forEach((c, ci) => {
        if (/%\s*$/.test(c.text.replace(/\*\*/g, "").trim())) { const cel = ws[XLSX.utils.encode_cell({ r: li + 1, c: ci })]; if (cel && typeof cel.v === "number") cel.z = "0.0%"; }
      }));
      ws["!cols"] = aoa[0].map(() => ({ wch: 18 }));
      XLSX.utils.book_append_sheet(wb, ws, `Tabela ${i + 1}`);
    });
    XLSX.writeFile(wb, `M8_tabelas_${Date.now()}.xlsx`);
  }

  iniciar().catch((e) => {
    console.error(e);
    render(h("div", { class: "login" }, h("div", { class: "cartao" }, h("h2", { class: "t-marca" }, "Sem ligação"), h("p", {}, "O portal não respondeu. Confirma a rede e recarrega a página."))));
  });
})();
