/* Página ao vivo do passo «Ao vivo» (Supervisores): a operação TAAG na GoContact, em tempo real.
   Dados: GET /api/aovivo/dados a cada 15 s (o servidor guarda em cache). Chat: /api/chat, passo "aovivo".
   Entra como o formando deste PC ou, se aberta a partir do painel, como o formador (PIN da sessão). */
(() => {
  "use strict";
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
  const ler = (st, k) => { try { return st.getItem(k); } catch (e) { return null; } };
  const PIN = ler(sessionStorage, "m8.pin"), PESSOA = ler(localStorage, "m8.pessoa"), TURMA = ler(localStorage, "m8.turma");
  const cabecalhos = () => ({ "Content-Type": "application/json", ...(PIN ? { "x-pin": PIN } : { "x-turma": TURMA || "", "x-pessoa": PESSOA || "" }) });
  const $ = (id) => document.getElementById(id);
  const md = (txt) => DOMPurify.sanitize(marked.parse(txt || "", { breaks: false, gfm: true }));
  const mmss = (seg) => seg == null ? "—" : `${Math.floor(seg / 60)}:${String(Math.floor(seg % 60)).padStart(2, "0")}`;
  const num = (v, casas = 0) => v == null ? "—" : Number(v).toLocaleString("pt-PT", { maximumFractionDigits: casas });
  const pct = (v) => v == null ? "—" : `${num(v, 1)}%`;

  const S = { dados: null, recebido: 0, filtro: "todos", mensagens: [], aEnviar: false, semAcesso: false };

  // ------------------------------------------------------------ dados
  async function carregar() {
    try {
      const r = await fetch("/api/aovivo/dados", { headers: cabecalhos() });
      if (r.status === 401) return semAcesso();
      if (!r.ok) throw new Error();
      S.dados = await r.json(); S.recebido = Date.now();
      desenhar();
    } catch (e) {
      $("estado-vivo").replaceChildren("Sem ligação ao portal · a tentar outra vez");
    }
  }
  function semAcesso() {
    S.semAcesso = true;
    $("aviso").replaceChildren(h("div", { class: "aviso-vivo mau" }, h("b", {}, "Abre esta página a partir do portal. "),
      "No portal do formando, entra com o teu nome e vai ao passo «Ao vivo». O formador abre-a no painel."));
    $("estado-vivo").replaceChildren("Sem acesso");
  }

  const ORDEM = { pausa: 1, toque: 2, espera: 3, conversa: 4, pos: 5, disponivel: 6, outro: 7 };
  const CHIP = { conversa: "azul", espera: "roxo", toque: "aviso", pos: "azul", disponivel: "ok", pausa: "aviso", outro: "" };
  function desenhar() {
    const d = S.dados, r = d.resumo;
    $("estado-vivo").replaceChildren(h("span", { class: "ponto-vivo branco", "aria-hidden": "true" }),
      d.fonte === "gocontact" ? `GoContact · dados das ${d.hora}` : `Dados de exemplo · ${d.hora}`);
    $("aviso").replaceChildren(
      d.fonte !== "gocontact" ? h("div", { class: "aviso-vivo" }, h("b", {}, "Dados de exemplo, não são da operação real. "), d.motivo || "") : "",
      d.aviso ? h("div", { class: "aviso-vivo" }, d.aviso) : "");

    const kpi = (valor, rotulo, mau) => h("div", { class: `cartao kpi${mau ? " mau" : ""}` }, h("b", {}, valor), h("span", {}, rotulo));
    $("kpis").replaceChildren(
      kpi(num(r.emEspera), r.emEspera === 1 ? "chamada em espera" : "chamadas em espera", r.emEspera > 0),
      kpi(num(r.agentes), "agentes com sessão"),
      kpi(num(r.emChamada), "em chamada"),
      kpi(num(r.disponiveis), r.disponiveis === 1 ? "disponível" : "disponíveis"),
      kpi(num(r.emPausa), "em pausa"),
      kpi(num(r.pausasExcedidas), r.pausasExcedidas === 1 ? "pausa acima do limite" : "pausas acima do limite", r.pausasExcedidas > 0));

    $("t-filas").replaceChildren(
      h("thead", {}, h("tr", {}, ["Fila", "Em espera", "Espera mais longa", "Oferecidas", "Atendidas", "Abandono", "TMA", "TME", "SLA 20 s"].map((c) => h("th", {}, c)))),
      h("tbody", {}, d.filas.length ? d.filas.map((f) => h("tr", {},
        h("td", { class: "nome" }, h("b", {}, f.nome), h("small", {}, f.agentesEmChamada ? `${f.agentesEmChamada} em chamada agora` : "")),
        h("td", { class: f.emEspera ? "alerta-num" : null }, num(f.emEspera)),
        h("td", { class: f.emEspera ? "alerta-num" : null }, f.emEspera ? mmss(f.esperaMaisLongaSeg) : "—"),
        h("td", {}, num(f.oferecidas)), h("td", {}, num(f.atendidas)),
        h("td", {}, f.abandonoPct == null ? "—" : `${pct(f.abandonoPct)} (${num(f.abandonadas)})`),
        h("td", {}, mmss(f.tmaSeg)), h("td", {}, mmss(f.tmeSeg)), h("td", {}, pct(f.sla20Pct))))
        : h("tr", {}, h("td", { colspan: "9", class: "mudo" }, "Ainda não há chamadas hoje."))));

    const agentes = [...d.agentes].sort((a, b) => (b.excedeSeg > 0) - (a.excedeSeg > 0) || ORDEM[a.tipo] - ORDEM[b.tipo] || b.noEstadoSeg - a.noEstadoSeg);
    const conta = { todos: agentes.length, pausa: 0, conversa: 0, disponivel: 0 };
    for (const a of agentes) { if (a.tipo === "pausa") conta.pausa++; else if (a.tipo === "disponivel") conta.disponivel++; else if (a.tipo !== "outro") conta.conversa++; }
    const grupoFiltro = (a) => a.tipo === "pausa" ? "pausa" : a.tipo === "disponivel" ? "disponivel" : "conversa";
    $("filtros").replaceChildren(...[["todos", "Todos"], ["pausa", "Em pausa"], ["conversa", "Em chamada"], ["disponivel", "Disponíveis"]].map(([k, rot]) =>
      h("button", { class: `peq${S.filtro === k ? " sel" : ""}`, "aria-pressed": S.filtro === k ? "true" : "false", onclick: () => { S.filtro = k; desenhar(); } }, `${rot} · ${conta[k]}`)));
    const visiveis = agentes.filter((a) => S.filtro === "todos" || grupoFiltro(a) === S.filtro);
    $("t-agentes").replaceChildren(
      h("thead", {}, h("tr", {}, ["Agente", "Estado · fila", "No estado há", "Atendidas hoje", "TMA hoje", "Pausas hoje", "Limite da pausa"].map((c) => h("th", {}, c)))),
      h("tbody", {}, visiveis.length ? visiveis.map((a) => h("tr", { class: a.excedeSeg > 0 ? "excedido" : null },
        h("td", { class: "nome" }, h("b", {}, a.nome), h("small", {}, `${a.codigo}${a.grupo ? ` · ${a.grupo}` : ""}`)),
        h("td", { class: "estado" }, h("span", { class: `etiq ${a.excedeSeg > 0 ? "mau" : CHIP[a.tipo] || ""}` }, a.estado), a.fila ? h("small", {}, a.fila) : ""),
        h("td", { class: a.excedeSeg > 0 ? "alerta-num" : null, "data-base": a.noEstadoSeg }, mmss(a.noEstadoSeg)),
        h("td", {}, a.atendidasHoje == null ? h("span", { class: "mudo" }, "…") : num(a.atendidasHoje)),
        h("td", {}, a.tmaHojeSeg == null ? h("span", { class: "mudo" }, "—") : mmss(a.tmaHojeSeg)),
        h("td", {}, `${num(Math.round(a.pausasHojeSeg / 60))} min`),
        h("td", {}, a.limiteMin != null ? `${a.limiteMin} min${a.excedeSeg > 0 ? ` · +${Math.ceil(a.excedeSeg / 60)} min` : ""}` : h("span", { class: "mudo" }, "—"))))
        : h("tr", {}, h("td", { colspan: "7", class: "mudo" }, "Nenhum agente neste filtro."))));
  }
  // Os relógios andam sozinhos entre actualizações.
  function tique() {
    if (!S.recebido) return;
    const passou = (Date.now() - S.recebido) / 1000;
    document.querySelectorAll("[data-base]").forEach((el) => { el.textContent = mmss(Number(el.dataset.base) + passou); });
  }

  // ------------------------------------------------------------ chat
  const SUGESTOES = [
    "Que fila precisa de ajuda agora?",
    "Quem está em pausa há mais tempo do que devia?",
    "Compara os agentes de hoje: chamadas atendidas e TMA.",
    "Posso mandar mais alguém para pausa agora?",
    "Resume a operação em 5 linhas para o coordenador.",
  ];
  function desenharSugestoes() {
    $("sugestoes").replaceChildren(...SUGESTOES.map((s) => h("button", { class: "peq sugestao", onclick: () => enviar(s) }, s)));
  }
  async function carregarConversa() {
    try {
      const r = await fetch("/api/conversa/aovivo", { headers: cabecalhos() });
      if (!r.ok) return;
      const todas = (await r.json()).mensagens;
      const i = todas.map((m) => !!m.pagina).lastIndexOf(true); // só o que veio depois de a página ser montada
      S.mensagens = todas.slice(i + 1);
    } catch (e) { /* sem histórico */ }
    desenharMensagens();
  }
  function desenharMensagens() {
    const caixa = $("mensagens");
    if (!S.mensagens.length) {
      caixa.replaceChildren(h("div", { class: "vazio-chat" }, h("h3", { class: "t-marca" }, "Pergunta"),
        h("p", {}, "Escolhe uma pergunta acima ou escreve a tua. A IA lê os dados da GoContact no momento em que perguntas.")));
      return;
    }
    caixa.replaceChildren(...S.mensagens.map((m) => {
      if (m.role === "user") return h("div", { class: "msg user" }, h("div", { class: "bolha" }, m.texto));
      if (m.role === "aviso") return h("div", { class: "msg aviso" }, h("div", { class: "corpo" }, m.texto));
      const corpo = h("div", { class: "corpo" });
      if (m.aPensar && !m.texto) corpo.append(h("span", { class: "a-pensar mudo" }, "A IA está a ler a operação"));
      else corpo.innerHTML = md(m.texto);
      if (m.erro) corpo.append(h("p", { class: "erro-txt" }, m.erro));
      return h("div", { class: "msg ia" }, corpo);
    }));
    caixa.scrollTop = caixa.scrollHeight;
  }
  async function enviar(textoDado) {
    if (S.aEnviar || S.semAcesso) return;
    const ta = $("caixa-texto"), botao = $("botao-enviar");
    const texto = (textoDado ?? ta.value).trim();
    if (!texto) { ta.focus(); return; }
    S.aEnviar = true; botao.disabled = true;
    const msgUser = { role: "user", texto }, msgIa = { role: "assistant", texto: "", aPensar: true };
    S.mensagens.push(msgUser, msgIa);
    if (textoDado == null) ta.value = "";
    desenharMensagens();
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: cabecalhos(), body: JSON.stringify({ passo: "aovivo", texto, anexos: [], origem: "pagina" }) });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        msgIa.aPensar = false; msgIa.erro = j.erro || `Erro ${r.status}`;
        return;
      }
      const leitor = r.body.getReader(); const dec = new TextDecoder(); let buf = "", agendado = false;
      const refrescar = () => { if (agendado) return; agendado = true; requestAnimationFrame(() => { agendado = false; desenharMensagens(); }); };
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
        }
      }
    } catch (e) {
      msgIa.erro = "Sem ligação ao portal. Tenta outra vez.";
    } finally {
      msgIa.aPensar = false; S.aEnviar = false; botao.disabled = false;
      desenharMensagens(); carregar();
    }
  }

  // ------------------------------------------------------------ arranque
  $("botao-enviar").addEventListener("click", () => enviar());
  $("caixa-texto").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); enviar(); } });
  if (!PIN && !(PESSOA && TURMA)) semAcesso();
  else { desenharSugestoes(); carregar(); carregarConversa(); setInterval(carregar, 15000); setInterval(tique, 1000); }
})();
