/* Portal M8 · painel do formador (um só ecrã)
   Escolhe o passo que todos vêem, acompanha presenças e entregas, dá as notas e exporta para o DTP. */
(() => {
  "use strict";
  // Conteúdos por nível (public/conteudos-*.js); escolhidos pela turma activa.
  const NIVEIS = window.CONTEUDOS_NIVEIS;
  let PASSOS, passoPorId;
  function usarNivel(nivel) {
    PASSOS = (NIVEIS[nivel] || NIVEIS.supervisores).passos;
    passoPorId = Object.fromEntries(PASSOS.map((p) => [p.id, p]));
  }
  usarNivel("supervisores");
  const ENTREGAS = [["ex1", "1"], ["ex2", "2"], ["ex3", "3"], ["ex4", "4"], ["compromisso", "C"]];
  const S = { pin: null, d: null, timer: null };

  // ------------------------------------------------------------ utilitários
  const lerS = (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const guardarS = (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } };
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
  const md = (txt) => DOMPurify.sanitize(marked.parse(txt || "", { gfm: true }));
  const horaDe = (iso) => iso ? new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "";
  const dataLonga = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
  const dataPt = (d) => d.split("-").reverse().join("/");
  const min = (hhmm) => { const [a, b] = hhmm.split(":").map(Number); return a * 60 + b; };
  const render = (el) => document.getElementById("raiz").replaceChildren(el);
  const logo = (cor) => h("img", { class: "logo", src: `/marca/logo-${cor}.svg`, alt: "UCALL" });
  function toast(msg) {
    document.querySelectorAll(".toast").forEach((t) => t.remove());
    const t = h("div", { class: "toast", role: "status" }, msg);
    document.body.append(t); setTimeout(() => t.remove(), 2600);
  }
  async function api(metodo, url, corpo) {
    const r = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json", "x-pin": S.pin || "" }, body: corpo ? JSON.stringify(corpo) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.erro || `Erro ${r.status}`); e.status = r.status; throw e; }
    return j;
  }
  function modal(conteudo) {
    const fundo = h("div", { class: "fundo-modal", onclick: (e) => { if (e.target === fundo) fechar(); } }, h("div", { class: "modal largo", role: "dialog", "aria-modal": "true" }, conteudo));
    const fechar = () => { fundo.remove(); actualizar(); };
    document.body.append(fundo);
    return fechar;
  }

  // ------------------------------------------------------------ entrada com PIN
  function ecraPin(msgErro) {
    const pin = h("input", { type: "password", inputmode: "numeric", autocomplete: "off", "aria-label": "PIN do formador", placeholder: "PIN" });
    const msg = h("div", { class: "erro-txt", role: "alert" }, msgErro || "");
    const ir = async () => {
      S.pin = pin.value.trim();
      try { S.d = await api("GET", "/api/painel"); guardarS("m8.pin", S.pin); montar(); }
      catch (e) { msg.textContent = e.status === 401 ? "PIN errado." : e.message; }
    };
    pin.addEventListener("keydown", (e) => { if (e.key === "Enter") ir(); });
    render(h("div", { class: "login" }, h("div", { class: "cartao" }, logo("red"),
      h("h1", { class: "t-marca", style: "font-size:28px;margin-bottom:6px" }, "Painel do formador"),
      h("p", { class: "mudo", style: "margin:0 0 16px" }, "M8 · IA na Liderança"),
      pin, msg, h("button", { class: "prim grande", style: "width:100%;margin-top:8px", onclick: ir }, "Entrar"))));
    pin.focus();
  }

  // ------------------------------------------------------------ ecrã principal
  function montar() {
    render(h("div", { class: "painel" }, h("header", { class: "barra", id: "barra" }), h("main", { class: "area", id: "area" })));
    desenhar();
    clearInterval(S.timer);
    S.timer = setInterval(actualizar, 5000);
  }
  async function actualizar(forcar) {
    if (document.querySelector(".fundo-modal")) return;
    const foco = document.activeElement;
    if (!forcar && foco && foco.closest?.("#area") && ["SELECT", "TEXTAREA", "INPUT"].includes(foco.tagName)) return;
    try {
      const novo = await api("GET", "/api/painel");
      if (!forcar && JSON.stringify(novo) === JSON.stringify(S.d)) return; // nada mudou: não redesenha
      S.d = novo; desenhar();
    }
    catch (e) { if (e.status === 401) { clearInterval(S.timer); guardarS("m8.pin", null); ecraPin("A sessão expirou. Volta a escrever o PIN."); } }
  }

  function desenhar() {
    const d = S.d, t = d.turma;
    usarNivel(t.nivel);
    const barra = document.getElementById("barra"), area = document.getElementById("area");
    const sel = h("select", { "aria-label": "Turma nos PCs da sala", onchange: async () => {
      const nova = d.turmas.find((x) => x.id === sel.value);
      if (!confirm(`Os PCs da sala passam a mostrar «${nova.nome}». Continuar?`)) { sel.value = t.id; return; }
      await api("POST", "/api/painel/turma", { turma: sel.value }); await actualizar(); toast(`Turma: ${nova.nome}`);
    } }, d.turmas.map((x) => h("option", { value: x.id, selected: x.id === t.id || null }, `${x.nome} · ${dataPt(x.data)}`)));
    barra.replaceChildren(logo("white"), h("span", { class: "modulo" }, "Painel do formador · M8"), h("span", { class: "espaco" }), sel,
      h("button", { class: "peq", onclick: () => { clearInterval(S.timer); guardarS("m8.pin", null); S.pin = null; ecraPin(); } }, "Sair"));

    const n = d.pessoas.length;
    const entraram = d.pessoas.filter((p) => p.presenca.entrada).length;
    const voltaram = d.pessoas.filter((p) => p.presenca.regresso).length;
    const sairam = d.pessoas.filter((p) => p.presenca.saida).length;
    const endereco = d.enderecos[0] || location.origin;

    area.replaceChildren(
      d.demo ? h("div", { class: "cartao", style: "padding:10px 16px;background:var(--amarelo-suave);border-color:#f3dc8f" }, h("b", {}, "Modo de ensaio: "), "o chat dá respostas fixas, sem IA.") : "",
      h("div", { class: "topo-painel" },
        h("div", { class: "cartao" }, h("p", { class: "sobre" }, "Endereço para os formandos"), h("div", { class: "endereco" }, endereco.replace(/^http:\/\//, "")),
          h("p", { class: "mudo", style: "margin:8px 0 0" }, `${t.nome} · ${dataLonga(t.data)} · ${t.inicio}–${t.fim} · pausa ${t.pausaInicio}–${t.pausaFim}`)),
        h("div", { class: "cartao" }, h("p", { class: "sobre" }, "Presenças"),
          h("div", { class: "contagens" },
            h("div", {}, h("b", {}, `${entraram}/${n}`), h("span", {}, "entraram")),
            h("div", {}, h("b", {}, voltaram), h("span", {}, "voltaram da pausa")),
            h("div", {}, h("b", {}, sairam), h("span", {}, "saíram")))),
        h("div", { class: "cartao", style: "display:flex;flex-direction:column;gap:8px;justify-content:center" },
          h("button", { class: "prim grande", onclick: exportar }, "Exportar para o DTP"),
          t.teste ? h("button", { class: "subtil peq", onclick: apagarTeste }, "Apagar dados de teste") : "")),
      h("div", { class: "cartao", style: "padding:18px 20px" },
        h("div", { class: "linha entre", style: "margin-bottom:12px" },
          h("p", { class: "sobre", style: "margin:0" }, "Os formandos estão a ver"),
          h("span", { class: "pequeno-txt mudo" }, "Carrega noutro passo para todos mudarem.")),
        h("div", { class: "passos-painel" }, PASSOS.map((p) => h("button", { class: p.id === d.passo ? "agora" : null, "aria-pressed": p.id === d.passo ? "true" : "false", onclick: () => mudarPasso(p) },
          h("b", {}, p.etiqueta), h("small", {}, p.tipo === "exercicio" ? p.titulo : p.tipo === "aovivo" ? "TAAG em tempo real" : p.id === "inicio" ? "Boas-vindas" : p.id === "pausa" ? `${t.pausaInicio}–${t.pausaFim}` : "Fecho")))),
        PASSOS.some((p) => p.tipo === "aovivo") ? h("div", { class: "linha", style: "margin-top:12px" },
          h("button", { class: "contorno peq", onclick: () => window.open("/aovivo.html", "_blank") }, "Abrir a página ao vivo (para projectar)"),
          h("span", { class: "pequeno-txt mudo" }, d.gocontact ? `GoContact: ${d.gocontact}` : "")) : ""),
      h("div", { class: "cartao" }, h("div", { class: "tabela-envolve" }, tabela(d))),
      h("p", { class: "regras" },
        `Assiduidade: 1 + um ponto por momento a horas (entrada até ${somar(t.inicio, 10)}, regresso até ${somar(t.pausaFim, 5)}, saída a partir de ${somar(t.fim, -15)}). `,
        "Participação: entregas feitas (5 = 4 · 4 = 3 · 2–3 = 2 · 0–1 = 1). Escolher 1–4 à mão substitui o automático. Assertividade: dada por ti. ",
        "Nota = média × 25; aprovado a partir de 75%. ",
        d.demo ? "" : `Modelo: ${d.modelo} · tokens: ${d.tokens.entrada.toLocaleString("pt-PT")} entrada / ${d.tokens.saida.toLocaleString("pt-PT")} saída.`));
  }
  function somar(hhmm, m) { const t = min(hhmm) + m; return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; }

  async function mudarPasso(p) {
    try { await api("POST", "/api/painel/passo", { passo: p.id }); await actualizar(); toast(`Todos vêem: ${p.titulo}`); }
    catch (e) { toast(e.message); }
  }

  function tabela(d) {
    const t = d.turma;
    const hora = (v, tarde) => v ? h("span", { class: tarde ? "atraso" : null, title: tarde ? "Fora da tolerância" : null }, v) : h("span", { class: "mudo" }, "—");
    const seletor = (p, campo, auto) => {
      const manual = p.avaliacao.manual?.[campo] ?? (campo === "assertividade" ? p.avaliacao.assertividade : null);
      const s = h("select", { class: campo !== "assertividade" && manual != null ? "manual" : null, "aria-label": `${campo} de ${p.nome}`, onchange: () => gravarNota(p, campo, s.value) },
        h("option", { value: "" }, campo === "assertividade" ? "—" : `Auto (${auto ?? "—"})`),
        [1, 2, 3, 4].map((n) => h("option", { value: n, selected: manual === n || null }, n)));
      return s;
    };
    return h("table", { class: "tabela" },
      h("thead", {}, h("tr", {}, ["Formando", "Entrada", "Pausa", "Saída", "Entregas", "Assiduidade", "Participação", "Assertividade", "Nota", "Resultado", ""].map((c) => h("th", {}, c)))),
      h("tbody", {}, d.pessoas.map((p) => {
        const a = p.avaliacao, pr = p.presenca;
        return h("tr", {},
          h("td", { class: "nome" }, h("b", {}, p.nome), h("small", {}, (p.categoria || "").toLowerCase()), p.pii ? h("span", { class: "etiq mau", style: "margin-left:6px", title: "Tentou enviar dados pessoais para a IA" }, `dados pessoais ×${p.pii}`) : ""),
          h("td", {}, hora(pr.entrada, pr.entrada && min(pr.entrada) > min(t.inicio) + 10)),
          h("td", {}, hora(pr.regresso, pr.regresso && min(pr.regresso) > min(t.pausaFim) + 5)),
          h("td", {}, hora(pr.saida, pr.saida && min(pr.saida) < min(t.fim) - 15)),
          h("td", {}, h("span", { class: "pontos" }, ENTREGAS.map(([id, r]) => h("i", { class: p.entregas.includes(id) ? "s" : null, title: id === "compromisso" ? "Compromisso" : `Exercício ${r}` }, r)))),
          h("td", {}, seletor(p, "assiduidade", a.assAuto)),
          h("td", {}, seletor(p, "participacao", a.parAuto)),
          h("td", {}, seletor(p, "assertividade")),
          h("td", { class: "nota-pct" }, a.pct == null ? h("span", { class: "mudo" }, "—") : `${Math.round(a.pct)}%`),
          h("td", {}, a.completa ? h("span", { class: a.resultado === "Aprovado" ? "res-ok" : "res-mau" }, a.resultado) : h("span", { class: "mudo pequeno-txt" }, "falta nota")),
          h("td", {}, h("button", { class: "peq", onclick: () => detalhe(p) }, "Ver")));
      })));
  }
  async function gravarNota(p, campo, valor) {
    try { await api("POST", "/api/painel/avaliacao", { pessoa: p.id, campo, valor: valor || null }); document.activeElement?.blur(); await actualizar(); }
    catch (e) { toast(e.message); }
  }

  // ------------------------------------------------------------ detalhe de um formando
  async function detalhe(p) {
    let det;
    try { det = await api("GET", `/api/painel/pessoa/${p.id}`); } catch (e) { toast(e.message); return; }
    const horas = Object.fromEntries(["entrada", "regresso", "saida"].map((m) => [m, h("input", { type: "time", value: p.presenca[m] || "", "aria-label": m })]));
    const comentario = h("textarea", { rows: "3", placeholder: "Vai para a coluna «Comentários/Observações» do DTP" });
    comentario.value = p.avaliacao.comentario || "";
    const ex = PASSOS.filter((x) => x.tipo === "exercicio");
    let fechar;
    fechar = modal([
      h("div", { class: "linha entre" }, h("div", {}, h("p", { class: "sobre" }, p.categoria || ""), h("h2", { class: "t-marca", style: "font-size:26px" }, p.nome)),
        h("button", { class: "subtil", onclick: () => fechar() }, "Fechar")),
      h("div", { class: "detalhe-bloco" }, h("p", { class: "sobre" }, "Horas (corrigir se alguém se esqueceu)"),
        h("div", { class: "linha" }, h("label", {}, "Entrada ", horas.entrada), h("label", {}, "Pausa ", horas.regresso), h("label", {}, "Saída ", horas.saida),
          h("button", { class: "peq", onclick: async () => {
            try { for (const [m, el] of Object.entries(horas)) if ((el.value || "") !== (p.presenca[m] || "")) await api("POST", "/api/painel/presenca", { pessoa: p.id, momento: m, hora: el.value || null }); toast("Horas guardadas"); }
            catch (e) { toast(e.message); }
          } }, "Guardar horas"))),
      h("div", { class: "detalhe-bloco" }, h("p", { class: "sobre" }, "Comentário para o DTP"), comentario,
        h("button", { class: "peq", style: "margin-top:8px", onclick: async () => { await api("POST", "/api/painel/avaliacao", { pessoa: p.id, campo: "comentario", valor: comentario.value }); toast("Comentário guardado"); } }, "Guardar comentário")),
      h("div", { class: "detalhe-bloco" }, h("p", { class: "sobre" }, "Entregas"),
        ex.map((x) => {
          const e = det.entregas[x.id];
          return h("div", { style: "margin-bottom:10px" }, h("b", {}, `Ex. ${x.n} · ${x.titulo}`), " ", e ? h("span", { class: "etiq ok" }, horaDe(e.ts)) : h("span", { class: "etiq" }, "não entregou"), e ? h("pre", {}, e.texto) : "");
        }),
        h("div", {}, h("b", {}, "Compromisso"), " ", det.compromisso ? h("span", { class: "etiq ok" }, horaDe(det.compromisso.ts)) : h("span", { class: "etiq" }, "não entregou"),
          det.compromisso ? h("pre", {}, passoPorId.compromisso.campos.map((c) => `${c.rotulo}: ${det.compromisso[c.id]}`).join("\n")) : "")),
      det.eventosPii.length ? h("div", { class: "detalhe-bloco" }, h("p", { class: "sobre" }, "Tentativas com dados pessoais (bloqueadas)"),
        h("ul", {}, det.eventosPii.map((e) => h("li", {}, `${horaDe(e.ts)} · ${Object.entries(e.achados).map(([k, v]) => (k === "colunas" ? `colunas ${v.join(", ")}` : `${v} ${k}`)).join(", ")}${e.ficheiros?.length ? ` · ${e.ficheiros.join(", ")}` : ""}`)))) : "",
      h("div", { class: "detalhe-bloco" }, h("p", { class: "sobre" }, "Conversas com a IA"),
        Object.keys(det.conversas).length ? Object.entries(det.conversas).filter(([, m]) => m.length).map(([passo, msgs]) => h("details", { class: "conv" },
          h("summary", {}, `${passoPorId[passo]?.etiqueta || passo} · ${msgs.length} mensagens`),
          msgs.map((m) => m.role === "user"
            ? h("div", { class: "msg user" }, m.anexos?.length ? h("div", { class: "linha" }, m.anexos.map((n) => h("span", { class: "chip" }, n))) : "", m.texto ? h("div", { class: "bolha" }, m.texto) : "")
            : (() => { const c = h("div", { class: "corpo" }); c.innerHTML = md(m.texto); return h("div", { class: "msg ia" }, c); })())))
          : h("p", { class: "mudo" }, "Ainda não usou o chat.")),
    ]);
  }

  async function apagarTeste() {
    if (!confirm("Apagar presenças, entregas e conversas da turma de teste?")) return;
    try { await api("POST", "/api/painel/apagar-teste"); await actualizar(); toast("Dados de teste apagados"); } catch (e) { toast(e.message); }
  }

  // ------------------------------------------------------------ exportar para o DTP
  function folha(aoa, larguras) { const ws = XLSX.utils.aoa_to_sheet(aoa); ws["!cols"] = larguras.map((w) => ({ wch: w })); return ws; }
  async function exportar() {
    let d;
    try { d = await api("GET", "/api/painel/exportar"); } catch (e) { toast(e.message); return; }
    const wb = XLSX.utils.book_new();
    const vazio = (v) => (v == null ? "" : v);
    const cab = ["Formando", "Categoria", "Projecto", "Grupo", "Assiduidade", "Participação", "Assertividade", "Média", "%", "Resultado", "Comentários/Observações", "Data da Formação/Avaliação"];
    const aoa = [cab, ...d.linhas.map((l) => { const a = l.avaliacao; return [l.pessoa.nome, vazio(l.pessoa.categoria), vazio(l.pessoa.projecto), vazio(l.pessoa.grupo), vazio(a.assiduidade), vazio(a.participacao), vazio(a.assertividade), "", "", "", a.comentario || "", dataPt(d.turma.data)]; })];
    const ws = folha(aoa, [34, 16, 16, 14, 12, 13, 13, 9, 8, 12, 40, 14]);
    d.linhas.forEach((l, i) => {
      const r = i + 2, a = l.avaliacao;
      ws[`H${r}`] = a.media == null ? { t: "s", v: "", f: `IFERROR(AVERAGE(E${r}:G${r}),"")` } : { t: "n", v: a.media, z: "0.00", f: `IFERROR(AVERAGE(E${r}:G${r}),"")` };
      ws[`I${r}`] = a.pct == null ? { t: "s", v: "", f: `IFERROR(H${r}*25,"")` } : { t: "n", v: a.pct, z: "0", f: `IFERROR(H${r}*25,"")` };
      ws[`J${r}`] = { t: "s", v: a.completa ? a.resultado : "", f: `IF(COUNT(E${r}:G${r})<3,"",IF(I${r}>=75,"Aprovado","Reprovado"))` };
    });
    XLSX.utils.book_append_sheet(wb, ws, String(d.turma.folhaDTP || "Avaliação").replace(/[\\/?*[\]:]/g, " ").slice(0, 31));

    const sim = (b) => (b ? "Sim" : "Não");
    XLSX.utils.book_append_sheet(wb, folha([
      ["Formando", "Entrada", "Regresso da pausa", "Saída", "Assiduidade (auto)", "Participação (auto)", "Ex. 1", "Ex. 2", "Ex. 3", "Ex. 4", "Compromisso"],
      ...d.linhas.map((l) => [l.pessoa.nome, l.presenca.entrada, l.presenca.regresso, l.presenca.saida, vazio(l.avaliacao.assAuto), vazio(l.avaliacao.parAuto), ...ENTREGAS.map(([id]) => sim(l.entregas.includes(id)))]),
    ], [34, 9, 12, 9, 12, 12, 7, 7, 7, 7, 12]), "Detalhe");

    const campos = passoPorId.compromisso.campos;
    XLSX.utils.book_append_sheet(wb, folha([["Formando", ...campos.map((c) => c.rotulo), "Hora"],
      ...d.linhas.filter((l) => l.compromisso).map((l) => [l.pessoa.nome, ...campos.map((c) => l.compromisso[c.id]), horaDe(l.compromisso.ts)])], [30, 50, 25, 50, 8]), "Compromissos");

    const ent = [["Formando", "Exercício", "Hora", "Texto entregue"]];
    for (const l of d.linhas) for (const x of PASSOS.filter((p) => p.tipo === "exercicio")) {
      const e = l.textos[x.id];
      if (e) ent.push([l.pessoa.nome, `Ex. ${x.n} · ${x.titulo}`, horaDe(e.ts), e.texto]);
    }
    XLSX.utils.book_append_sheet(wb, folha(ent, [30, 30, 8, 100]), "Entregas");
    XLSX.writeFile(wb, `M8_Avaliacao_${d.turma.nome.replace(/\s+/g, "_")}_${d.turma.data}.xlsx`);
    toast("Excel exportado");
  }

  // ------------------------------------------------------------ arranque
  S.pin = lerS("m8.pin");
  if (S.pin) api("GET", "/api/painel").then((d) => { S.d = d; montar(); }).catch(() => ecraPin());
  else ecraPin();
})();
