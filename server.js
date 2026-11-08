// Portal da formação M8 · IA na Liderança (UCALL) — versão simples.
// Formando: entra com o nome e trabalha num só ecrã (chat + exercício do momento).
// Formador: um só ecrã em /painel (passo da sessão, presenças, entregas, notas, exportação).
// Arranque: npm start   (configuração no ficheiro .env — ver .env.example)

import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { marked } from "marked";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType } from "docx";
import { obterDados, textoParaIA, estadoLigacao } from "./gocontact.js";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(AQUI, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------------------------------------------------------------- configuração
const PORTA = Number(process.env.PORTA || 3000);
const MODO_DEMO = process.argv.includes("--demo") || process.env.MODO_DEMO === "1";
const MODELO = process.env.MODELO || "claude-opus-5-5";
const ESFORCO = process.env.ESFORCO || "medium"; // low | medium | high
const LIMITE_MENSAGENS = Number(process.env.LIMITE_MENSAGENS || 80); // por formando e por sessão
const FUSO = process.env.FUSO || "Africa/Luanda";
let PIN = process.env.FORMADOR_PIN;
if (!PIN) {
  PIN = String(crypto.randomInt(100000, 999999));
  console.warn(`\n[aviso] FORMADOR_PIN não está no .env. PIN temporário desta execução: ${PIN}\n`);
}

// Os nomes reais ficam em config/turmas.json (fora do GitHub). Sem ele, só as turmas de teste.
const FICH_TURMAS = ["turmas.json", "turmas.exemplo.json"].map((f) => path.join(AQUI, "config", f)).find((f) => fs.existsSync(f));
const TURMAS = JSON.parse(fs.readFileSync(FICH_TURMAS, "utf8")).turmas;
const turmaPorId = Object.fromEntries(TURMAS.map((t) => [t.id, t]));

// Passos da sessão (têm de bater com public/conteudos-*.js; "aovivo" só existe nos Supervisores)
const PASSOS = ["inicio", "ex1", "ex2", "ex3", "pausa", "ex4", "aovivo", "compromisso"];
const ENTREGAS = ["ex1", "ex2", "ex3", "ex4"]; // + compromisso = 5 entregas
const PASSOS_CHAT = ["inicio", "ex1", "ex2", "ex3", "ex4", "aovivo", "compromisso"];

const client = MODO_DEMO ? null : new Anthropic();

// Com quem a IA fala, por nível da turma (campo "nivel" em config/turmas.json).
const PUBLICO = {
  supervisores: "supervisores de contact center",
  directores: "directores, directores-gerais adjuntos (DGAs) e membros da Comissão Executiva de uma empresa de contact center",
};
const systemPrompt = (turma, passo) => `És o assistente de IA da formação «M8 · IA na Liderança» da Academia UCALL, em Luanda. Falas com ${PUBLICO[turma.nivel] || PUBLICO.supervisores} durante uma sessão prática.

Como respondes:
- Em português europeu (norma usada em Angola), claro, directo e sem floreados. Começa logo pela resposta.
${turma.nivel === "directores" ? "" : "- Sê curto: no máximo 250 palavras, a não ser que te peçam mais. Uma tabela pequena vale mais do que vários parágrafos. Sem introdução nem resumo no fim.\n"}- Quando te dão ficheiros, usa apenas os dados desses ficheiros. Não inventes números, nomes, datas nem regras. Se um dado estiver em falta ou vazio, diz explicitamente que está em falta.
- Quando calculares totais, médias ou percentagens, mostra a conta.
- Separa o que os dados mostram (factos) do que é interpretação tua.
- Usa Markdown: tabelas quando te pedirem tabelas ou quando comparares valores; listas curtas; títulos só quando ajudarem.
- Não decides por quem te pergunta, sobretudo sobre pessoas ou investimentos: apresentas evidência, opções e riscos; a decisão é sempre de quem te pergunta.
- Não consegues criar ficheiros. Se te pedirem um Excel ou um Word, escreve o conteúdo na resposta; o portal tem botões para o descarregar em Word e em Excel.
- Os ficheiros desta formação são fictícios. Se mesmo assim encontrares dados pessoais de clientes (nomes, telefones, NIF, contas, e-mails), lembra que não devem ser colocados numa ferramenta de IA e não os repitas na resposta.${passo === "aovivo" ? `

Nesta parte da sessão estás ligado à GoContact da operação TAAG. Em cada mensagem recebes os dados desse momento entre <dados_gocontact> (filas de hoje, agentes agora, pausas e os limites configurados na GoContact, e as chamadas atendidas hoje por agente).
- Responde só com esses dados e diz a hora a que se referem. No máximo 120 palavras ou uma tabela pequena.
- As metas da operação (SLA, abandono, TME) não vêm nos dados: não as inventes. Se precisares delas, pergunta ou compara as filas entre si.
- Os agentes são colegas de quem te pergunta: fala de factos (estado, tempos, limites), sem julgar as pessoas.
- Se te pedirem para comparar agentes (quem atende mais ou menos, TMA, produtividade), responde com nomes e números da tabela AGENTES HOJE. Compara agentes da mesma fila e com horários parecidos (vê a 1.ª e a última chamada: quem entrou há pouco tem menos chamadas), junta as pausas de hoje e diz que não há horas de sessão. A conclusão sobre cada pessoa fica com o supervisor.
- Se a fonte disser EXEMPLO, avisa no início que são dados de exemplo e não da operação real.` : ""}`;
const eTeste = (t) => t.id.startsWith("teste");

// ---------------------------------------------------------------- armazenamento (JSON)
const cache = new Map(); // ficheiro -> { obj, sujo }
function carregar(nome, vazio) {
  const f = path.join(DATA_DIR, `${nome}.json`);
  if (!cache.has(f)) {
    let obj = vazio();
    if (fs.existsSync(f)) {
      try { obj = { ...vazio(), ...JSON.parse(fs.readFileSync(f, "utf8")) }; } catch (e) { console.error("Erro a ler", f, e); }
    }
    cache.set(f, { obj, sujo: false });
  }
  return cache.get(f);
}
const vazioEstado = () => ({ passo: "inicio", presencas: {}, entregas: {}, compromissos: {}, avaliacao: {}, eventosPii: [], uso: {} });
const estado = (turmaId) => carregar(turmaId, vazioEstado);
const conversas = (turmaId) => carregar(`${turmaId}.conversas`, () => ({}));
const geral = () => carregar("geral", () => ({ turmaActiva: null }));
function marcar(entry) { entry.sujo = true; }
function gravarTudo() {
  for (const [f, e] of cache) {
    if (!e.sujo) continue;
    const tmp = f + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(e.obj, null, 1));
    fs.renameSync(tmp, f);
    e.sujo = false;
  }
}
setInterval(gravarTudo, 1000).unref();
for (const sinal of ["SIGINT", "SIGTERM"]) process.on(sinal, () => { gravarTudo(); process.exit(0); });

// ---------------------------------------------------------------- utilitários
const hojeLocal = () => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());
const horaLocal = (iso) => new Intl.DateTimeFormat("pt-PT", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
const minutos = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

// Turma que os PCs da sala mostram: a escolhida no painel; senão a de hoje; senão a próxima.
function turmaActiva() {
  const g = geral().obj;
  if (g.turmaActiva && turmaPorId[g.turmaActiva]) return turmaPorId[g.turmaActiva];
  const hoje = hojeLocal();
  return TURMAS.find((t) => t.data === hoje && !eTeste(t))
    || TURMAS.filter((t) => t.data >= hoje && !eTeste(t)).sort((a, b) => a.data.localeCompare(b.data))[0]
    || TURMAS[0];
}

function pontuacaoAssiduidade(turma, p) {
  if (!p?.entrada) return null;
  let ok = 0;
  if (minutos(horaLocal(p.entrada)) <= minutos(turma.inicio) + 10) ok++;
  if (p.regresso && minutos(horaLocal(p.regresso)) <= minutos(turma.pausaFim) + 5) ok++;
  if (p.saida && minutos(horaLocal(p.saida)) >= minutos(turma.fim) - 15) ok++;
  return 1 + ok;
}
function entregasFeitas(est, pid) {
  const e = est.entregas[pid] || {};
  return [...ENTREGAS.filter((k) => e[k]), ...(est.compromissos[pid] ? ["compromisso"] : [])];
}
function pontuacaoParticipacao(est, pid) {
  if (!est.presencas[pid]?.entrada) return null;
  const n = entregasFeitas(est, pid).length;
  return n >= 5 ? 4 : n === 4 ? 3 : n >= 2 ? 2 : 1;
}
function avaliacaoDe(turma, est, pid) {
  const av = est.avaliacao[pid] || {};
  const assAuto = pontuacaoAssiduidade(turma, est.presencas[pid]);
  const parAuto = pontuacaoParticipacao(est, pid);
  const assiduidade = av.assiduidade ?? assAuto;
  const participacao = av.participacao ?? parAuto;
  const assertividade = av.assertividade ?? null;
  const notas = [assiduidade, participacao, assertividade].filter((v) => typeof v === "number");
  const completa = notas.length === 3;
  const media = completa ? notas.reduce((a, b) => a + b, 0) / 3 : null;
  const pct = media == null ? null : media * 25;
  return { assAuto, parAuto, assiduidade, participacao, assertividade, media, pct, completa,
    resultado: pct == null ? "" : pct >= 75 ? "Aprovado" : "Reprovado", comentario: av.comentario || "",
    manual: { assiduidade: av.assiduidade ?? null, participacao: av.participacao ?? null } };
}
function enderecos() {
  if (process.env.SERVIDOR === "1") return []; // no Docker, o painel mostra o endereço do próprio browser
  return Object.values(os.networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => `http://${i.address}:${PORTA}`);
}

// Detector de dados pessoais: bloqueia antes de saírem para a IA.
const PADROES = {
  email: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  nif: /\b\d{9}[A-Z]{2}\d{3}\b/g,
  telefone: /(?:\+?244[\s.-]?)?\b9\d{2}[\s.-]?\d{3}[\s.-]?\d{3}\b/g,
  iban: /\bAO\d{2}(?:\s?\d{4}){5}\d?\b/gi,
};
const COLUNAS_PESSOAIS = /^(nome do cliente|nome|cliente|telefone|telem[oó]vel|nif|bi|n\.?º? ?de conta|conta|iban|e-?mail|email)$/i;
function detectarDadosPessoais(texto, anexosTexto) {
  const achados = {};
  const tudo = [texto, ...anexosTexto.map((a) => a.conteudo)].join("\n");
  for (const [tipo, re] of Object.entries(PADROES)) {
    const n = (tudo.match(re) || []).length;
    if (n) achados[tipo] = n;
  }
  const colunas = new Set();
  for (const a of anexosTexto) {
    for (const linha of a.conteudo.split("\n")) {
      if (!linha.includes(",") && !linha.includes(";") && !linha.includes("\t")) continue;
      for (const cel of linha.split(/[,;\t]/)) {
        const c = cel.trim().replace(/^"|"$/g, "");
        if (COLUNAS_PESSOAIS.test(c)) colunas.add(c);
      }
    }
  }
  if (colunas.size) achados.colunas = [...colunas];
  return Object.keys(achados).length ? achados : null;
}

// ---------------------------------------------------------------- app
const app = express();
app.use(express.json({ limit: "15mb" }));
// Online (servidor): com SENHA_SALA no .env, o portal abre com o ecrã «Palavra-passe da sala» (/entrar).
// Quem acerta fica com um cookie durante 30 dias. O formador entra no painel só com o PIN.
// Na rede da sala (sem SENHA_SALA) fica tudo como antes.
const SENHA_SALA = process.env.SENHA_SALA || "";
if (SENHA_SALA) {
  app.set("trust proxy", true);
  const FICHA = crypto.createHmac("sha256", SENHA_SALA).update("portal-m8-sala").digest("hex");
  const igual = (a, b) => { const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || "")); return x.length === y.length && crypto.timingSafeEqual(x, y); };
  const fichaDe = (req) => (req.get("cookie") || "").split(";").map((s) => s.trim()).find((s) => s.startsWith("m8_sala="))?.slice(8);
  const darFicha = (req, res) => res.append("Set-Cookie", `m8_sala=${FICHA}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${req.secure ? "; Secure" : ""}`);
  const falhas = new Map(); // por IP: tentativas erradas nos últimos 15 min
  app.post("/api/entrar", (req, res) => {
    const ip = req.get("cf-connecting-ip") || req.ip, agora = Date.now();
    const f = falhas.get(ip);
    if (f && agora - f.desde > 15 * 60_000) falhas.delete(ip);
    if ((falhas.get(ip)?.n || 0) >= 30) return erro(res, 429, "Demasiadas tentativas. Espera uns minutos.");
    if (!igual(String(req.body?.senha || "").trim(), SENHA_SALA)) {
      const g = falhas.get(ip) || { n: 0, desde: agora }; g.n++; falhas.set(ip, g);
      return setTimeout(() => erro(res, 401, "Palavra-passe errada."), 400);
    }
    darFicha(req, res);
    res.json({ ok: true });
  });
  const PAGINAS = new Set(["/", "/index.html", "/aovivo", "/aovivo.html"]);
  app.use((req, res, next) => {
    if (igual(fichaDe(req), FICHA)) return next();
    if (req.path.startsWith("/api/")) {
      if (req.path === "/api/config") return next();
      if (req.get("x-pin") && igual(req.get("x-pin"), PIN)) { darFicha(req, res); return next(); } // o formador (PIN) também fica com o cookie
      return res.set("x-sala", "1").status(401).json({ erro: "Escreve a palavra-passe da sala." });
    }
    if (PAGINAS.has(req.path)) return res.redirect(302, `/entrar?volta=${encodeURIComponent(req.originalUrl)}`);
    next(); // estilos, scripts, logótipos e ficheiros dos exercícios (estão no GitHub); o painel tem o PIN
  });
}
app.use(express.static(path.join(AQUI, "public"), { extensions: ["html"] }));
const vendor = {
  "marked.umd.js": "node_modules/marked/lib/marked.umd.js",
  "purify.min.js": "node_modules/dompurify/dist/purify.min.js",
  "xlsx.full.min.js": "node_modules/xlsx/dist/xlsx.full.min.js",
};
app.get("/vendor/:f", (req, res) => {
  const f = vendor[req.params.f];
  if (!f) return res.sendStatus(404);
  res.sendFile(path.join(AQUI, f));
});

function erro(res, status, mensagem) { return res.status(status).json({ erro: mensagem }); }
const dadosTurma = (t) => ({ id: t.id, nome: t.nome, data: t.data, inicio: t.inicio, pausaInicio: t.pausaInicio, pausaFim: t.pausaFim, fim: t.fim, sala: t.sala, nivel: t.nivel, teste: eTeste(t) });

// Formando: turma + pessoa (sem código: a sala é uma rede local)
function formando(req, res, next) {
  const t = turmaPorId[req.get("x-turma")];
  const pessoa = t?.participantes.find((p) => p.id === req.get("x-pessoa"));
  if (!t || !pessoa) return erro(res, 401, "Escolhe o teu nome outra vez.");
  req.turma = t; req.pessoa = pessoa; req.entry = estado(t.id); req.est = req.entry.obj;
  next();
}
function formador(req, res, next) {
  if (req.get("x-pin") !== PIN) return erro(res, 401, "PIN errado.");
  req.turma = turmaActiva(); req.entry = estado(req.turma.id); req.est = req.entry.obj;
  next();
}
// Página ao vivo: o formador também a abre (para projectar) e usa o chat com o PIN.
function formandoOuFormador(req, res, next) {
  if (!req.get("x-pin")) return formando(req, res, next);
  if (req.get("x-pin") !== PIN) return erro(res, 401, "PIN errado.");
  req.turma = turmaActiva(); req.pessoa = { id: "formador", nome: "Formador" }; req.entry = estado(req.turma.id); req.est = req.entry.obj;
  next();
}

app.get("/api/config", (req, res) => res.json({ demo: MODO_DEMO, modelo: MODELO }));

// Ecrã de entrada: turma activa e os nomes
app.get("/api/sessao", (req, res) => {
  const t = turmaActiva();
  const est = estado(t.id).obj;
  res.json({ turma: dadosTurma(t), participantes: t.participantes.map((p) => ({ id: p.id, nome: p.nome, presente: !!est.presencas[p.id]?.entrada })) });
});

app.get("/api/estado", formando, (req, res) => {
  const { est, pessoa, turma } = req;
  const pid = pessoa.id;
  res.json({
    pessoa: { id: pid, nome: pessoa.nome },
    turma: dadosTurma(turma),
    activa: turmaActiva().id === turma.id,
    passo: est.passo,
    presenca: est.presencas[pid] || {},
    entregas: est.entregas[pid] || {},
    compromisso: est.compromissos[pid] || null,
    uso: est.uso[pid]?.mensagens || 0,
    limite: LIMITE_MENSAGENS,
  });
});

app.post("/api/presenca", formando, (req, res) => {
  const m = req.body.momento;
  if (!["entrada", "regresso", "saida"].includes(m)) return erro(res, 400, "Momento inválido.");
  const p = (req.est.presencas[req.pessoa.id] ||= {});
  if (!p.entrada && m !== "entrada") return erro(res, 400, "Marca primeiro a entrada.");
  if (!p[m]) p[m] = new Date().toISOString();
  marcar(req.entry);
  res.json({ presenca: p });
});

app.post("/api/entrega", formando, (req, res) => {
  const { passo, texto } = req.body;
  if (!ENTREGAS.includes(passo)) return erro(res, 400, "Exercício inválido.");
  if (!texto || !String(texto).trim()) return erro(res, 400, "Escreve ou cola a tua resposta primeiro.");
  (req.est.entregas[req.pessoa.id] ||= {})[passo] = { texto: String(texto).slice(0, 20000), ts: new Date().toISOString() };
  marcar(req.entry);
  res.json({ ok: true });
});

app.post("/api/compromisso", formando, (req, res) => {
  const campos = req.body.campos || {};
  const limpo = {};
  for (const k of ["oque", "quando", "evidencia"]) limpo[k] = String(campos[k] || "").trim().slice(0, 2000);
  if (Object.values(limpo).some((v) => !v)) return erro(res, 400, "Preenche os 3 campos.");
  req.est.compromissos[req.pessoa.id] = { ...limpo, ts: new Date().toISOString() };
  marcar(req.entry);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- chat (uma conversa por passo)
function conversaDe(req, passo) {
  const entry = conversas(req.turma.id);
  const minhas = (entry.obj[req.pessoa.id] ||= {});
  return { entry, conv: (minhas[passo] ||= { mensagens: [] }) };
}
app.get("/api/conversa/:passo", formandoOuFormador, (req, res) => {
  if (!PASSOS_CHAT.includes(req.params.passo)) return erro(res, 404, "Passo inválido.");
  res.json({ mensagens: conversaDe(req, req.params.passo).conv.mensagens.map((m) => m.vis) });
});
app.post("/api/conversa/:passo/limpar", formandoOuFormador, (req, res) => {
  if (!PASSOS_CHAT.includes(req.params.passo)) return erro(res, 404, "Passo inválido.");
  const { entry, conv } = conversaDe(req, req.params.passo);
  if (conv.mensagens.length) {
    (conv.arquivo ||= []).push(conv.mensagens); // fica guardada para o formador ver
    conv.mensagens = [];
    marcar(entry);
  }
  res.json({ ok: true });
});

const textoDe = (content) => (content || []).filter((b) => b.type === "text").map((b) => b.text).join("");

app.post("/api/chat", formandoOuFormador, async (req, res) => {
  const passo = req.body.passo;
  if (!PASSOS_CHAT.includes(passo)) return erro(res, 400, "Passo inválido.");
  const { entry, conv } = conversaDe(req, passo);
  const texto = String(req.body.texto || "").trim();
  const anexos = Array.isArray(req.body.anexos) ? req.body.anexos : [];
  if (!texto && !anexos.length) return erro(res, 400, "Escreve uma mensagem.");
  const uso = (req.est.uso[req.pessoa.id] ||= { mensagens: 0, entrada: 0, saida: 0 });
  if (uso.mensagens >= LIMITE_MENSAGENS) return erro(res, 429, `Chegaste ao limite de ${LIMITE_MENSAGENS} mensagens desta sessão. Fala com o formador.`);

  const anexosTexto = anexos.filter((a) => a.tipo === "texto").map((a) => ({ nome: String(a.nome).slice(0, 200), conteudo: String(a.conteudo || "") }));
  const anexosPdf = anexos.filter((a) => a.tipo === "pdf").map((a) => ({ nome: String(a.nome).slice(0, 200), conteudo: String(a.conteudo || "") }));
  if (anexosTexto.some((a) => a.conteudo.length > 400000) || anexosPdf.some((a) => a.conteudo.length > 8_000_000))
    return erro(res, 413, "O ficheiro é demasiado grande.");

  const achados = detectarDadosPessoais(texto, anexosTexto);
  if (achados) {
    req.est.eventosPii.push({ pid: req.pessoa.id, passo, ts: new Date().toISOString(), achados, ficheiros: anexos.map((a) => a.nome) });
    marcar(req.entry);
    return res.status(422).json({ erro: "A mensagem ou o ficheiro tem dados pessoais.", pii: achados });
  }

  // Ao vivo: o primeiro pedido «monta» a página (simulado, com os números reais da GoContact).
  if (passo === "aovivo" && req.body.origem !== "pagina" && !conv.mensagens.some((m) => m.vis.pagina))
    return construirPagina(req, res, { entry, conv, texto, uso });

  const blocos = [];
  for (const a of anexosPdf) blocos.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: a.conteudo }, title: a.nome });
  for (const a of anexosTexto) blocos.push({ type: "text", text: `<ficheiro nome="${a.nome.replace(/"/g, "'")}">\n${a.conteudo}\n</ficheiro>` });
  blocos.push({ type: "text", text: texto || "Analisa o ficheiro em anexo." });
  let msgUser = { role: "user", content: blocos };
  let msgEnviada = msgUser;
  let dadosVivo = null;
  if (passo === "aovivo") {
    // Os dados do momento vão só nesta mensagem; no histórico fica a pergunta e a hora dos dados.
    dadosVivo = await obterDados();
    msgEnviada = { role: "user", content: [{ type: "text", text: textoParaIA(dadosVivo) }, ...blocos] };
    msgUser = { role: "user", content: [...blocos.slice(0, -1), { type: "text", text: `${texto}\n\n(Pergunta feita com os dados da GoContact das ${dadosVivo.hora}.)` }] };
  }
  const historico = conv.mensagens.map((m) => m.api);

  res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", Connection: "keep-alive" });
  const enviar = (o) => res.write(`data: ${JSON.stringify(o)}\n\n`);
  let conteudoFinal = null;
  try {
    if (MODO_DEMO) {
      const resposta = passo === "aovivo" ? respostaDemoAoVivo(dadosVivo) : respostaDemo(texto, anexos, passo);
      for (const pedaco of resposta.match(/[\s\S]{1,24}/g)) { enviar({ t: "delta", v: pedaco }); await new Promise((r) => setTimeout(r, 15)); }
      conteudoFinal = [{ type: "text", text: resposta }];
    } else {
      const stream = client.beta.messages.stream({
        model: MODELO,
        max_tokens: 64000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        cache_control: { type: "ephemeral" },
        output_config: { effort: ESFORCO },
        system: systemPrompt(req.turma, passo),
        messages: [...historico, msgEnviada],
      });
      stream.on("text", (d) => enviar({ t: "delta", v: d }));
      res.on("close", () => { if (!res.writableEnded) stream.abort(); });
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") enviar({ t: "aviso", v: "A IA não respondeu a este pedido. Reformula a pergunta ou fala com o formador." });
      conteudoFinal = final.content;
      uso.entrada += (final.usage?.input_tokens || 0) + (final.usage?.cache_read_input_tokens || 0) + (final.usage?.cache_creation_input_tokens || 0);
      uso.saida += final.usage?.output_tokens || 0;
    }
    // A conversa só cresce depois de uma resposta completa (histórico só por acréscimo).
    conv.mensagens.push({ api: msgUser, vis: { role: "user", texto, anexos: anexos.map((a) => a.nome), ts: new Date().toISOString() } });
    conv.mensagens.push({ api: { role: "assistant", content: conteudoFinal }, vis: { role: "assistant", texto: textoDe(conteudoFinal), ts: new Date().toISOString() } });
    uso.mensagens++;
    marcar(entry); marcar(req.entry);
    enviar({ t: "fim" });
  } catch (e) {
    let msg = "Não foi possível falar com a IA. Tenta outra vez.";
    if (e instanceof Anthropic.AuthenticationError) msg = "A chave da IA não é válida. Avisa o formador.";
    else if (e instanceof Anthropic.RateLimitError) msg = "A IA está com muitos pedidos. Espera uns segundos e tenta outra vez.";
    else if (e instanceof Anthropic.BadRequestError) msg = "A IA não aceitou o pedido (ficheiro ou formato). Tenta sem o anexo.";
    else if (e instanceof Anthropic.APIConnectionError) msg = "Sem ligação à IA. Verifica a internet da sala.";
    else if (e instanceof Anthropic.APIUserAbortError) msg = "Pedido cancelado.";
    console.error("[chat]", e?.status || "", e?.message || e);
    enviar({ t: "erro", v: msg });
  }
  res.end();
});

// ---------------------------------------------------------------- ao vivo (GoContact TAAG)
app.get("/api/aovivo/dados", formandoOuFormador, async (req, res) => res.json(await obterDados()));

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
function linhasConstrucao(d) {
  const r = d.resumo, nomes = d.filas.map((f) => f.nome);
  return [
    d.fonte === "gocontact" ? `- ✓ Ligado à GoContact · operação ${d.instancia.toUpperCase()}\n` : `- ⚠ ${d.motivo} A página abre com **dados de exemplo**.\n`,
    `- ✓ ${plural(d.filas.length, "fila de voz", "filas de voz")} com chamadas hoje: ${nomes.slice(0, 4).join(", ")}${nomes.length > 4 ? "…" : ""}\n`,
    `- ✓ ${plural(r.agentes, "agente", "agentes")} com sessão: ${r.emChamada} em chamada, ${r.disponiveis} ${r.disponiveis === 1 ? "disponível" : "disponíveis"}, ${r.emPausa} em pausa\n`,
    `- ✓ ${plural(d.regrasLidas, "regra de pausa lida", "regras de pausa lidas")}: a janela e o limite de cada grupo\n`,
    "- ✓ Indicadores de hoje por fila: TMA, TME, SLA 20 s e abandono\n",
    `- ✓ Alertas: ${plural(r.pausasExcedidas, "pausa acima do limite", "pausas acima do limite")} · ${plural(r.emEspera, "chamada em espera", "chamadas em espera")}\n`,
    "- ✓ Página criada: actualiza sozinha a cada 15 segundos\n",
    "- ✓ Chat ligado aos dados de agora\n",
    `\n*Pronto às ${d.hora}. Carrega em «Abrir a página».*`,
  ];
}
async function construirPagina(req, res, { entry, conv, texto, uso }) {
  res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", Connection: "keep-alive" });
  let fechado = false;
  res.on("close", () => { fechado = true; });
  const enviar = (o) => { if (!fechado) res.write(`data: ${JSON.stringify(o)}\n\n`); };
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  let tudo = "";
  const escrever = async (txt, ms) => {
    tudo += txt;
    for (const p of txt.match(/[\s\S]{1,10}/g) || []) { enviar({ t: "delta", v: p }); await espera(fechado ? 0 : 16); }
    if (!fechado) await espera(ms);
  };
  await escrever("**A montar a tua página**\n\n", 400);
  const d = await obterDados();
  for (const linha of linhasConstrucao(d)) await escrever(linha, 600 + crypto.randomInt(0, 700));
  const ts = new Date().toISOString();
  // Fica guardado mesmo que o formando feche o ecrã a meio: o botão «Abrir a página» aparece ao voltar.
  conv.mensagens.push({ api: { role: "user", content: [{ type: "text", text: texto || "Monta a página." }] }, vis: { role: "user", texto, anexos: [], ts } });
  conv.mensagens.push({ api: { role: "assistant", content: [{ type: "text", text: tudo }] }, vis: { role: "assistant", texto: tudo, pagina: true, ts } });
  uso.mensagens++;
  marcar(entry); marcar(req.entry);
  enviar({ t: "pagina" }); enviar({ t: "fim" });
  res.end();
}
const mmss = (seg) => `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, "0")}`;
function respostaDemoAoVivo(d) {
  const r = d.resumo;
  const espera = d.filas.filter((f) => f.emEspera).sort((a, b) => b.esperaMaisLongaSeg - a.esperaMaisLongaSeg);
  const acima = d.agentes.filter((a) => a.excedeSeg > 0).sort((a, b) => b.excedeSeg - a.excedeSeg);
  return `*(Modo de demonstração: resposta fixa, sem IA.)*\n\n**Agora, às ${d.hora}**${d.fonte === "gocontact" ? "" : " · dados de exemplo"}\n\n`
    + `- **Chamadas em espera:** ${r.emEspera}${espera.length ? ` (${espera.map((f) => `${f.nome}: ${f.emEspera}, a mais longa há ${mmss(f.esperaMaisLongaSeg)}`).join("; ")})` : ""}.\n`
    + `- **Agentes:** ${r.emChamada} em chamada, ${r.disponiveis} disponíveis, ${r.emPausa} em pausa.\n`
    + `- **Pausas acima do limite:** ${acima.length ? acima.map((a) => `${a.nome} (${a.codigo}), ${a.pausa} há ${mmss(a.noEstadoSeg)} para um limite de ${a.limiteMin} min`).join("; ") : "nenhuma"}.`;
}

function respostaDemo(texto, anexos, passo) {
  const t = texto.toLowerCase();
  const aviso = "*(Modo de demonstração: resposta fixa, sem IA.)*\n\n";
  // Directores, DGAs e CE
  if (t.includes("quais estão a piorar")) {
    return `${aviso}| Conta | Sector | Receita (Mai→Out) | Satisfação | Reclamações /1 000 | Leitura |\n|---|---|---|---|---|---|\n| 01 | Telecomunicações | 290 → 292 | 4,2 → 4,3 | 6 → 5 | Estável |\n| 02 | Telecom. pré-pago | 210 → 212 | 4,0 | 8 | Estável |\n| 03 | Banca | 260 → 221 | 4,3 → 3,4 | 5 → 14 | **A piorar** |\n| 04 | Seguros | 95 → 96 | 4,1 → 4,2 | 5 → 4 | Estável |\n| 05 | Retalho | 120 → 126 | 3,9 → 4,1 | 9 → 7 | A melhorar |\n| 06 | Energia | 180 → 181 | 4,0 → 3,9 | 7 → 9 (18 em Agosto) | Pico em Ago–Set, a recuperar |\n| 07 | Água | 48 | 4,0 | 7 | Estável |\n| 08 | Saúde | 110 → 104 (até Agosto) | 4,2 → 3,7 | 6 → 11 | A piorar · **faltam Setembro e Outubro** |\n| 09 | Transportes | 75 → 76 | 4,1 | 6 | Estável |\n| 10 | Televisão por subscrição | 150 → 146 | 4,0 | 8 | Estável, volume a descer |`;
  }
  if (t.includes("reunião de direcção")) {
    return `${aviso}**Resumo para a reunião de direcção**\n\n- **Tendências:** a carteira está estável em 6 de 10 contas; a Conta 05 (Retalho) melhora; a Conta 03 (Banca) piora todos os meses desde Junho.\n- **Risco:** Conta 03: satisfação 4,3 → 3,4, reclamações 5 → 14 e receita 260 → 221 milhões Kz. A Conta 08 (Saúde) também piorava até Agosto e não tem dados de Setembro nem de Outubro.\n- **Oportunidade:** as Contas 09 (56%), 02 (54%) e 05 (51%) têm mais contactos simples. São as mais expostas à automação: ou propomos nós a solução e vendemos valor, ou o cliente parceiro automatiza sem nós.`;
  }
  if (t.includes("alerta_painel_ia")) {
    return `${aviso}O painel calculou o alerta a 06/10/2026 **com dados só até Setembro**.\n\n| Conta | Painel | O que a carteira mostra | Leitura |\n|---|---|---|---|\n| 03 | 78 · Alto | Queda contínua desde Junho; Outubro confirma (satisfação 3,4; reclamações 14) | Alerta sustentado |\n| 06 | 84 · Alto | Pico em Agosto e Setembro, com o novo tarifário a 01/08; em Outubro as reclamações voltam a 9 | Provavelmente exagerado |\n| 08 | 12 · Baixo | Setembro e Outubro **sem dados**; até Agosto a piorar | Não é fiável |\n\n**3 argumentos contra investir já os 45 milhões Kz**\n1. Metade do investimento vai para a Conta 06, que já está a recuperar.\n2. Não sabemos quantas vezes o painel acerta.\n3. A Conta 08 pode ser o risco real e o painel não a vê.`;
  }
  if (t.includes("nota técnica")) {
    return `${aviso}**Limitações do modelo, segundo a nota técnica**\n\n- **4.1** Um mês sem dados conta como zero reclamações: explica o «baixo risco» da Conta 08.\n- **4.2** Não distingue um acontecimento pontual de uma tendência e não lê a coluna «Observação»: explica o alerta da Conta 06 (tarifário).\n- **4.3** A taxa de acerto ainda não foi medida.\n- **4.4** Os pesos foram afinados com só 4 contas.\n- **Secção 5:** investimentos acima de 10 milhões Kz exigem análise do gestor da conta.\n\nSim, mudam a leitura: o alerta é um sinal para investigar, não uma decisão.`;
  }
  if (t.includes("casos_de_uso_ia")) {
    return `${aviso}| Caso | Risco | Porquê | Controlo mínimo |\n|---|---|---|---|\n| U01 Resumo das chamadas | Alto | Gravações com dados de clientes | Ferramenta aprovada pela DSI e regra de dados |\n| U02 Relatório mensal | Baixo | Dados agregados | Quem usa valida |\n| U03 Assistente no WhatsApp | Alto | Chega ao cliente final | Aprovação prévia e testes |\n| U04 Ranking para prémios | Alto | Decide sobre pessoas | Validação humana e direito a contestar |\n| U05 Previsão de volume | Baixo | Histórico agregado | Quem usa valida |\n| U06 Propostas comerciais | Médio | Preços internos; vai ao cliente | A chefia valida |\n| U07 Sentimento das chamadas | Alto | Nome e número do cliente (médio se anonimizado) | Anonimizar antes |\n| U08 Triagem de CV | Alto | Decide sobre pessoas | Validação humana |\n| U09 Tradução de manuais | Baixo | Sem dados pessoais | Quem usa valida |\n| U10 Sugestão durante a chamada | Médio | Chega ao cliente através do assistente | A chefia valida e acompanha |`;
  }
  if (t.includes("quem aprova")) {
    return `${aviso}| Caso | Porquê | Regra | Quem aprova | Indicador |\n|---|---|---|---|---|\n| U01 Resumo das chamadas | Dados de clientes | Só ferramenta aprovada pela DSI | Direcção + DSI | Erros no registo |\n| U03 Assistente no WhatsApp | Chega ao cliente final | Teste fechado antes de abrir | CE + cliente parceiro | Satisfação e passagem a humano |\n| U04 Ranking para prémios | Decide sobre pessoas | Validação humana e direito a contestar | CE + Capital Humano | Contestações |\n| U07 Sentimento das chamadas | Nome e número do cliente | Anonimizar antes | Direcção + Jurídico | Incidentes de dados |\n| U08 Triagem de CV | Decide sobre pessoas | Decisão final sempre humana | Capital Humano + Jurídico | Diversidade dos escolhidos |\n\n**Em uso informal:** U02, U06 e U09. A IA já está a crescer sem regras.`;
  }
  if (t.includes("pilotos_ia")) {
    return `${aviso}Custo por hora: 4 000 Kz; 1 mês = 4 semanas.\n\n| Piloto | Horas líquidas/semana | Erros/mês | Valor/mês | Custo/mês | Adopção |\n|---|---|---|---|---|---|\n| P1 Briefing de turno | 30 − 8 − 4 = **18** | 5 → 2 | 288 000 Kz | 80 000 Kz | 18/20 = 90% |\n| P2 Resumo de reclamações | 32 − 8 − 20 = **4** | 3 → 3 | 64 000 Kz | 60 000 Kz | 9/10 = 90% |\n| P3 E-mails a parceiros | 18 − 4 − 3 = **11** | 1 → 6 | 176 000 Kz | 40 000 Kz | 6/6 = 100% |\n| P4 Relatório de tendências | 24 − 6 − 4 = **14** | 2 → 1 | 224 000 Kz | 90 000 Kz | 7/8 = 88% |\n| P5 Perguntas aos manuais | 20 − 15 − 1 = **4** | 4 → 2 | 64 000 Kz | 0 Kz | 9/50 = 18% |\n\n**O que falta saber:** o P4 teve 1 incidente de dados; o P3 teve 2 queixas de parceiros; no P2 a validação consome quase todo o ganho.`;
  }
  if (t.includes("painel de impacto")) {
    return `${aviso}| Indicador | Fonte | Revisão |\n|---|---|---|\n| Horas poupadas por semana, já sem o tempo de validação | Registo de cada piloto | Mensal |\n| Erros e retrabalho | Qualidade | Mensal |\n| Custo da ferramenta face ao valor das horas | Finanças + DSI | Mensal |\n| Adopção: utilizadores activos face aos previstos | DSI | Mensal |\n| Incidentes de dados | DSI + Jurídico | Sempre que houver |\n| Satisfação do cliente nas contas com IA | Operações | Trimestral |`;
  }
  // Supervisores (dados de scripts/gerar_dados_supervisores.py)
  if (t.includes("relatório de chamadas por hora")) {
    return `${aviso}**Sexta-feira, 06/11: SLA 20 s abaixo da meta (80%)**\n\n| Fila | Oferecidas | Atendidas até 20 s | SLA 20 s | Abandonadas | Abandono |\n|---|---|---|---|---|---|\n| Informações | 644 | 503 | 78,1% | 24 | 3,7% |\n| Reservas | 240 | 181 | 75,4% | 12 | 5,0% |\n| **Dia** | **884** | **684** | **77,4%** | **36** | **4,1%** |\n\nConta: 684 ÷ 884 = 77,4%. A média da coluna «SLA 20 s» dá 81,4%, mas está errada: cada hora tem um volume diferente.\n\n**Horas abaixo da meta**\n\n| Hora | Fila | SLA 20 s | TME | Abandonadas |\n|---|---|---|---|---|\n| 12h–13h | Informações | 35,7% | 82 s | 13 |\n| 12h–13h | Reservas | 31,2% | 95 s | 6 |\n| 13h–14h | Informações | 60,9% | 41 s | 6 |\n| 13h–14h | Reservas | 55,9% | 49 s | 3 |\n\n**Porquê:** às 12h os agentes disponíveis caem para 8,2 em média (folha Agentes_por_hora). É a hora dos intervalos. Nas outras horas a meta foi cumprida.`;
  }
  if (t.includes("e-mail para o meu coordenador")) {
    return `${aviso}**Assunto:** SLA de sexta-feira, 06/11\n\nBom dia. Na sexta o SLA 20 s ficou em 77,4% (684 de 884 chamadas), abaixo da meta de 80%; o abandono foi de 4,1%.\nA falha concentrou-se entre as 12h e as 14h, nas duas filas: às 12h–13h o SLA desceu para 31–36%.\nA causa foi a falta de agentes disponíveis na hora dos intervalos (8,2 em média às 12h).\nPara segunda-feira proponho escalonar os intervalos, com no máximo 3 agentes fora ao mesmo tempo.\nFico disponível para detalhar.`;
  }
  if (t.includes("lista de alertas")) {
    return `${aviso}**Alertas de sexta-feira, 06/11** (do mais grave para o menos grave)\n\n| # | Agente | Alerta | Quanto passou | Hora |\n|---|---|---|---|---|\n| 1 | 40101, 40102, 40103, 40104, 40106, 40107 | 6 agentes em Intervalo ao mesmo tempo (máximo 3) | +3 agentes | 12:01–12:45 |\n| 2 | 40107 | Intervalo de 73 min (máximo 45) | +28 min | 12:02–13:15 |\n| 3 | 40103 | Intervalo de 68 min (máximo 45) | +23 min | 12:00–13:08 |\n| 4 | 40105 | Login atrasado (turno às 08:00, tolerância 5 min) | +27 min | 08:27 |\n| 5 | 40112 | Saiu antes da hora (turno até às 20:00) | −29 min | 19:31 |\n| 6 | 40110 | Intervalo fora da janela (15:00–17:00) | — | 13:10–13:55 |\n| 7 | 40108 | WC/Beber água de 22 min (máximo 10) | +12 min | 09:40–10:02 |\n| 8 | 40111 | 5 pausas WC/Beber água (máximo 3 por turno), 41 min no total | +2 pausas | Turno |\n\n**Repara no alerta 1:** entre as 12:01 e as 12:45 estavam 6 agentes do turno da manhã em Intervalo. É exactamente a hora em que o SLA caiu.`;
  }
  if (t.includes("plano dos intervalos")) {
    return `${aviso}**Plano dos intervalos para segunda-feira** (45 min, no máximo 3 ao mesmo tempo)\n\n| Turno | Início | Fim | Agentes |\n|---|---|---|---|\n| 08h00/17h00 | 12:00 | 12:45 | 40101, 40102, 40103 |\n| 08h00/17h00 | 12:45 | 13:30 | 40104, 40105, 40106 |\n| 08h00/17h00 | 13:30 | 14:15 | 40107, 40108 |\n| 11h00/20h00 | 15:00 | 15:45 | 40109, 40110, 40111 |\n| 11h00/20h00 | 15:45 | 16:30 | 40112, 40113, 40114 |\n\nTodos começam dentro da janela do seu turno. O último grupo da manhã acaba às 14:15: confirma se a regra deixa acabar depois das 14:00.`;
  }
  if (t.includes("ranking dos 14 agentes")) {
    return `${aviso}**Quem precisa de atenção** (semana de 02 a 06/11; referência da equipa: TMA ≈ 270 s, pós-chamada ≈ 25 s, espera ≈ 25 s)\n\n| Agente | O que se vê | Porque preocupa |\n|---|---|---|\n| 40104 | 1.º em atendidas (612) e TMA mais baixo (148 s), mas 196 chamadas com menos de 30 s (32%) e 171 desligadas por ele | Na equipa as chamadas curtas são 3–4% e as desligadas 2–6. Parece estar a cortar chamadas |\n| 40107 | TMA 392 s, espera 88 s, 68 transferidas (19%) | Põe o cliente em espera e transfere muito: dificuldade em resolver |\n| 40110 | Pós-chamada 98 s e só 301 atendidas | Fica muito tempo parado depois de cada chamada |\n| 40113 | 27 chamadas não atendidas (equipa: 0–2) | Deixa tocar sem atender |\n| 40114 | TMA 431 s, 13% transferidas | Está em integração: é esperado. Acompanhar, não penalizar |\n\nOs outros 9 estão perto da referência da equipa. Num ranking só por chamadas atendidas, o 40104 era o melhor.`;
  }
  if (t.includes("formação ou é comportamento")) {
    return `${aviso}| Agente | Formação ou comportamento | O que ouvir na escuta |\n|---|---|---|\n| 40104 | Comportamento | Chamadas com menos de 30 s desligadas por ele: o cliente já tinha terminado? |\n| 40107 | Formação | Em que pedidos põe em espera e transfere: o que não sabe resolver? |\n| 40113 | Comportamento (a confirmar) | Porque não atende: ausência do posto ou problema técnico? |\n| 40110 | A confirmar | O que faz nos 98 s de pós-chamada |\n| 40114 | Integração | Sem escuta extra: acompanhamento normal |\n\n**Escuta, por ordem:** 1) 40104, 2) 40107, 3) 40113. A decisão é tua.`;
  }
  if (t.includes("assistente de supervisão")) {
    if (!anexos.length) return `${aviso}Combinado. Junta os relatórios do dia anterior e eu faço sempre: 1) SLA e abandono, 2) alertas de pessoas, 3) agentes a acompanhar, 4) 3 acções para hoje.`;
    return `${aviso}**Quinta-feira, 05/11**\n\n**1. SLA 20 s e abandono**\n\n| Fila | SLA 20 s | Abandono |\n|---|---|---|\n| Informações | 514 ÷ 600 = 85,7% | 13 ÷ 600 = 2,2% |\n| Reservas | 182 ÷ 218 = 83,5% | 5 ÷ 218 = 2,3% |\n| **Dia** | **696 ÷ 818 = 85,1%** | **18 ÷ 818 = 2,2%** |\n\nAbaixo da meta: 08h–09h (Informações 58,8%, Reservas 50,0%) e 09h–10h (Informações 70,8%, Reservas 66,7%).\n\n**2. Alertas de pessoas**\n- Logins atrasados: 40102 às 08:22 (+22 min), 40106 às 08:35 (+35 min), 40105 às 08:41 (+41 min).\n- 40109: Intervalo de 58 min (máximo 45, +13 min).\n\n**3. Agentes a acompanhar**\n- 40104: 38 de 121 chamadas com menos de 30 s e 34 desligadas por ele.\n- 40110: pós-chamada de 95 s. 40113: 6 chamadas não atendidas.\n\n**4. Acções para hoje**\n1. Falar com 40102, 40105 e 40106: os atrasos coincidem com as 08h–10h abaixo da meta.\n2. Escuta ao 40104.\n3. Lembrar ao 40109 o limite do Intervalo.`;
  }
  return `${aviso}Recebi a tua mensagem${anexos.length ? ` e ${anexos.length} ficheiro(s): ${anexos.map((a) => a.nome).join(", ")}` : ""}. Com a chave da IA configurada, aqui aparece a resposta do Claude.`;
}

// ---------------------------------------------------------------- exportar Word
function runsDe(tokens, estilo = {}) {
  const out = [];
  for (const tk of tokens || []) {
    if (tk.type === "strong") out.push(...runsDe(tk.tokens, { ...estilo, bold: true }));
    else if (tk.type === "em") out.push(...runsDe(tk.tokens, { ...estilo, italics: true }));
    else if (tk.type === "codespan") out.push(new TextRun({ text: tk.text, font: "Consolas", ...estilo }));
    else if (tk.type === "br") out.push(new TextRun({ text: "", break: 1 }));
    else if (tk.tokens) out.push(...runsDe(tk.tokens, estilo));
    else out.push(new TextRun({ text: (tk.text ?? tk.raw ?? "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"), ...estilo }));
  }
  return out;
}
function blocosDocx(tokens, nivelLista = 0) {
  const out = [];
  for (const tk of tokens) {
    if (tk.type === "heading") out.push(new Paragraph({ heading: [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3][Math.min(tk.depth, 3) - 1], children: runsDe(tk.tokens) }));
    else if (tk.type === "paragraph") out.push(new Paragraph({ children: runsDe(tk.tokens), spacing: { after: 120 } }));
    else if (tk.type === "list") {
      tk.items.forEach((it, i) => {
        const [primeiro, ...resto] = it.tokens;
        const prefixo = tk.ordered ? `${(Number(tk.start) || 1) + i}. ` : "";
        const runs = primeiro ? runsDe(primeiro.tokens || [primeiro]) : [];
        out.push(new Paragraph({ children: [new TextRun(prefixo), ...runs], ...(tk.ordered ? { indent: { left: 360 * (nivelLista + 1) } } : { bullet: { level: nivelLista } }) }));
        out.push(...blocosDocx(resto.filter((r) => r.type === "list"), nivelLista + 1));
      });
    } else if (tk.type === "table") {
      const linha = (cels, cab) => new TableRow({ children: cels.map((c) => new TableCell({ children: [new Paragraph({ children: runsDe(c.tokens, cab ? { bold: true } : {}) })] })) });
      out.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [linha(tk.header, true), ...tk.rows.map((r) => linha(r, false))] }));
      out.push(new Paragraph(""));
    } else if (tk.type === "code") out.push(...tk.text.split("\n").map((l) => new Paragraph({ children: [new TextRun({ text: l, font: "Consolas" })] })));
    else if (tk.type === "blockquote") out.push(...blocosDocx(tk.tokens));
    else if (tk.type === "hr" || tk.type === "space") out.push(new Paragraph(""));
  }
  return out;
}
app.post("/api/export/docx", formando, async (req, res) => {
  const md = String(req.body.markdown || "").slice(0, 200000);
  const titulo = String(req.body.titulo || "Documento").slice(0, 120);
  const doc = new Document({
    creator: "Portal M8 · Academia UCALL", title: titulo,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ children: blocosDocx(marked.lexer(md)) }],
  });
  const buf = await Packer.toBuffer(doc);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(titulo)}.docx"`);
  res.send(buf);
});

// ---------------------------------------------------------------- painel do formador (turma activa)
app.get("/api/painel", formador, (req, res) => {
  const { turma, est } = req;
  const pessoas = turma.participantes.map((p) => {
    const pr = est.presencas[p.id] || {};
    return {
      id: p.id, nome: p.nome, categoria: p.categoria,
      presenca: { entrada: pr.entrada ? horaLocal(pr.entrada) : null, regresso: pr.regresso ? horaLocal(pr.regresso) : null, saida: pr.saida ? horaLocal(pr.saida) : null },
      entregas: entregasFeitas(est, p.id),
      pii: est.eventosPii.filter((e) => e.pid === p.id).length,
      mensagens: est.uso[p.id]?.mensagens || 0,
      avaliacao: avaliacaoDe(turma, est, p.id),
    };
  });
  const tokens = Object.values(est.uso).reduce((a, u) => ({ entrada: a.entrada + (u.entrada || 0), saida: a.saida + (u.saida || 0) }), { entrada: 0, saida: 0 });
  res.json({
    turma: dadosTurma(turma), turmas: TURMAS.map((t) => ({ id: t.id, nome: t.nome, data: t.data })),
    passo: est.passo, pessoas, enderecos: enderecos(), demo: MODO_DEMO, modelo: MODELO, tokens,
    gocontact: turma.nivel === "directores" ? null : estadoLigacao(),
  });
});

app.post("/api/painel/turma", formador, (req, res) => {
  if (!turmaPorId[req.body.turma]) return erro(res, 404, "Turma não encontrada.");
  const g = geral();
  g.obj.turmaActiva = req.body.turma;
  marcar(g);
  res.json({ ok: true });
});

app.post("/api/painel/passo", formador, (req, res) => {
  if (!PASSOS.includes(req.body.passo)) return erro(res, 400, "Passo inválido.");
  req.est.passo = req.body.passo;
  marcar(req.entry);
  if (req.est.passo === "aovivo") obterDados().catch(() => {}); // aquece a cache antes dos 12 PCs pedirem
  res.json({ passo: req.est.passo });
});

app.post("/api/painel/avaliacao", formador, (req, res) => {
  const { pessoa, campo, valor } = req.body;
  if (!req.turma.participantes.some((p) => p.id === pessoa)) return erro(res, 404, "Pessoa não encontrada.");
  if (!["assiduidade", "participacao", "assertividade", "comentario"].includes(campo)) return erro(res, 400, "Campo inválido.");
  const av = (req.est.avaliacao[pessoa] ||= {});
  if (campo === "comentario") av.comentario = String(valor || "").slice(0, 1000);
  else if (valor === null || valor === "" || valor === undefined) delete av[campo];
  else {
    const n = Number(valor);
    if (![1, 2, 3, 4].includes(n)) return erro(res, 400, "A nota vai de 1 a 4.");
    av[campo] = n;
  }
  marcar(req.entry);
  res.json({ avaliacao: avaliacaoDe(req.turma, req.est, pessoa) });
});

app.post("/api/painel/presenca", formador, (req, res) => {
  const { pessoa, momento, hora } = req.body; // hora "HH:MM" ou vazio para apagar
  if (!req.turma.participantes.some((p) => p.id === pessoa)) return erro(res, 404, "Pessoa não encontrada.");
  if (!["entrada", "regresso", "saida"].includes(momento)) return erro(res, 400, "Momento inválido.");
  const p = (req.est.presencas[pessoa] ||= {});
  if (!hora) delete p[momento];
  else {
    if (!/^\d{2}:\d{2}$/.test(hora)) return erro(res, 400, "Hora no formato HH:MM.");
    const desvio = new Intl.DateTimeFormat("en-US", { timeZone: FUSO, timeZoneName: "longOffset" }).formatToParts(new Date()).find((x) => x.type === "timeZoneName").value.replace("GMT", "") || "+00:00";
    p[momento] = new Date(`${req.turma.data}T${hora}:00${desvio}`).toISOString();
  }
  marcar(req.entry);
  res.json({ ok: true });
});

app.get("/api/painel/pessoa/:pid", formador, (req, res) => {
  const { turma, est } = req;
  const pid = req.params.pid;
  if (!turma.participantes.some((p) => p.id === pid)) return erro(res, 404, "Pessoa não encontrada.");
  const conv = conversas(turma.id).obj[pid] || {};
  res.json({
    entregas: est.entregas[pid] || {}, compromisso: est.compromissos[pid] || null,
    eventosPii: est.eventosPii.filter((e) => e.pid === pid),
    conversas: Object.fromEntries(Object.entries(conv).map(([passo, c]) => [passo, [...(c.arquivo || []).flat(), ...c.mensagens].map((m) => m.vis)])),
  });
});

app.get("/api/painel/exportar", formador, (req, res) => {
  const { turma, est } = req;
  const linhas = turma.participantes.map((p) => {
    const pr = est.presencas[p.id] || {};
    return { pessoa: p, avaliacao: avaliacaoDe(turma, est, p.id), entregas: entregasFeitas(est, p.id),
      presenca: { entrada: pr.entrada ? horaLocal(pr.entrada) : "", regresso: pr.regresso ? horaLocal(pr.regresso) : "", saida: pr.saida ? horaLocal(pr.saida) : "" },
      compromisso: est.compromissos[p.id] || null, textos: est.entregas[p.id] || {} };
  });
  res.json({ turma: { id: turma.id, nome: turma.nome, data: turma.data, folhaDTP: turma.folhaDTP }, linhas });
});

// Só as turmas de teste podem ser apagadas pelo painel (para ensaiar à vontade).
app.post("/api/painel/apagar-teste", formador, (req, res) => {
  const id = req.turma.id;
  if (!eTeste(req.turma)) return erro(res, 400, "Só as turmas de teste podem ser apagadas aqui.");
  estado(id).obj = vazioEstado(); marcar(estado(id));
  conversas(id).obj = {}; marcar(conversas(id));
  res.json({ ok: true });
});

// ---------------------------------------------------------------- arranque
app.listen(PORTA, () => {
  console.log(`\nPortal M8 a correr${MODO_DEMO ? " em MODO DEMO (sem IA)" : ` com o modelo ${MODELO}`}. Turma nos PCs: ${turmaActiva().nome}.`);
  console.log(`  Neste computador:   http://localhost:${PORTA}`);
  for (const url of enderecos()) console.log(`  Nos PCs da sala:    ${url}`);
  console.log(`  Painel do formador: http://localhost:${PORTA}/painel\n`);
});
