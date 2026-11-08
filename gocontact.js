// Ligação à GoContact (API da UCALL) para o passo «Ao vivo» dos Supervisores.
// Fala com o servidor MCP da API (POST {GOCONTACT_URL}/mcp, cabeçalho X-Api-Key) e junta tudo numa
// "fotografia" da operação: filas (hoje + agora), agentes (estado, pausa, tempos) e limites das pausas.
// Guarda em memória (agora: 15 s; hoje por fila: 60 s; pausas e grupos: 30 min) para os 12 PCs
// não carregarem a API. Sem chave ou com erro: dados de exemplo, sempre marcados como tal.

const URL_BASE = (process.env.GOCONTACT_URL || "https://api-gocontact.ucall.co.ao").replace(/\/+$/, "");
const CHAVE = (process.env.GOCONTACT_API_KEY || "").trim();
const INSTANCIA = process.env.GOCONTACT_INSTANCIA || "taag";
const FUSO = process.env.FUSO || "Africa/Luanda";

// Filas de voz da TAAG (id na GoContact → nome curto).
const FILAS = [
  [7, "PT Informações"], [11, "PT Reservas"], [15, "EN Informações"], [13, "EN Reservas"],
  [16, "FR Informações"], [14, "FR Reservas"], [12, "Corporate"], [9, "Antifraude"],
  [508, "Portugal"], [603, "No-show"], [10, "Havana"], [8, "UmbiUmbi"],
];

const ESTADOS = {
  talking: ["conversa", "Em chamada"], ready: ["disponivel", "Disponível"], hold: ["espera", "Cliente em espera"],
  "on-hook-ringing": ["toque", "A tocar"], ringing: ["toque", "A tocar"], outcomes: ["pos", "Pós-chamada"],
};

// ------------------------------------------------------------ cliente MCP mínimo
let sessao = null, iniciado = false, idPedido = 1;
async function rpc(metodo, params, notificacao = false) {
  const corpo = { jsonrpc: "2.0", method: metodo, ...(params ? { params } : {}), ...(notificacao ? {} : { id: idPedido++ }) };
  const r = await fetch(`${URL_BASE}/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", "X-Api-Key": CHAVE,
      "MCP-Protocol-Version": "2025-06-18", ...(sessao ? { "Mcp-Session-Id": sessao } : {}) },
    body: JSON.stringify(corpo), signal: AbortSignal.timeout(20000),
  });
  const s = r.headers.get("mcp-session-id");
  if (s) sessao = s;
  if (notificacao) { await r.text().catch(() => ""); return null; }
  const txt = await r.text();
  if (!r.ok) { const e = new Error(r.status === 401 || r.status === 403 ? "a chave da API não foi aceite" : `a API respondeu ${r.status}`); e.status = r.status; throw e; }
  let msg = null;
  if ((r.headers.get("content-type") || "").includes("text/event-stream")) {
    for (const linha of txt.split(/\r?\n/)) {
      if (!linha.startsWith("data:")) continue;
      try { const j = JSON.parse(linha.slice(5).trim()); if (j.id === corpo.id) msg = j; } catch (e) { /* linha sem JSON */ }
    }
  } else msg = JSON.parse(txt);
  if (!msg) throw new Error("resposta vazia da API");
  if (msg.error) throw new Error(msg.error.message || "erro da API");
  return msg.result;
}
async function iniciar() {
  if (iniciado) return;
  await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "portal-m8", version: "1.0.0" } });
  await rpc("notifications/initialized", null, true);
  iniciado = true;
}
async function ferramenta(nome, args) {
  await iniciar();
  let res;
  try { res = await rpc("tools/call", { name: nome, arguments: { instance: INSTANCIA, ...args } }); }
  catch (e) {
    if (e.status !== 400 && e.status !== 404) throw e; // sessão expirada: abre outra e tenta uma vez
    iniciado = false; sessao = null; await iniciar();
    res = await rpc("tools/call", { name: nome, arguments: { instance: INSTANCIA, ...args } });
  }
  const texto = (res?.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  if (res?.isError) throw new Error(texto || `${nome} falhou`);
  try { return JSON.parse(texto); } catch (e) { if (res?.structuredContent) return res.structuredContent; throw new Error(`${nome}: resposta inesperada`); }
}

// ------------------------------------------------------------ cache
const cache = { vivo: null, hoje: new Map(), pausas: null, grupos: null, chamadas: null, chamadasFalhou: 0 };
const fresco = (c, ms) => c && Date.now() - c.ts < ms;
const hojeData = () => new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(new Date());

// Relatório de chamadas recebidas de hoje (uma linha por chamada) → números por agente.
// Demora 3–10 s na GoContact: actualiza de 3 em 3 minutos, em segundo plano.
async function buscarChamadas() {
  const data = hojeData();
  const campos = "agentUsername,agentFirstName,agentLastName,queueName,callStart,talkTimeSec,holdTimeSec,termReason,transferTarget";
  const linhas = [];
  for (let offset = 0; offset < 50000;) {
    const r = await ferramenta("fetch_report", { kind: "inbound-calls", from: data, fields: campos, limit: 5000, offset });
    const rows = r.rows || [];
    linhas.push(...rows);
    if (!r.hasMore || !rows.length) break;
    offset += rows.length;
  }
  return { data, hora: hora(new Date()), linhas };
}
let aBuscarChamadas = null;
async function lerChamadas() {
  const c = cache.chamadas?.v.data === hojeData() ? cache.chamadas : null;
  if (fresco(c, 180000)) return c.v;
  if (!aBuscarChamadas && Date.now() - cache.chamadasFalhou > 60000) {
    aBuscarChamadas = buscarChamadas()
      .then((v) => { cache.chamadas = { ts: Date.now(), v }; return v; })
      .catch((e) => { console.error("[gocontact] relatório de chamadas:", e.message); cache.chamadasFalhou = Date.now(); return c?.v || null; })
      .finally(() => { aBuscarChamadas = null; });
  }
  if (c) return c.v; // usa o anterior enquanto actualiza
  if (!aBuscarChamadas) return null;
  // Primeira vez: espera até 12 s; se demorar mais, a página abre sem estes números e eles aparecem a seguir.
  return Promise.race([aBuscarChamadas, new Promise((r) => setTimeout(() => r(null), 12000))]);
}
async function lerVivo() {
  if (!fresco(cache.vivo, 15000)) cache.vivo = { ts: Date.now(), v: await ferramenta("voice_live", {}) };
  return cache.vivo.v;
}
async function lerHoje() {
  const res = [];
  for (let i = 0; i < FILAS.length; i += 4) { // 4 de cada vez
    res.push(...await Promise.all(FILAS.slice(i, i + 4).map(async ([id]) => {
      const c = cache.hoje.get(id);
      if (fresco(c, 60000)) return c.v;
      try { const v = await ferramenta("voice_today", { queueId: id }); cache.hoje.set(id, { ts: Date.now(), v }); return v; }
      catch (e) { return c?.v || null; } // uma fila com erro não estraga a página
    })));
  }
  return res;
}
async function lerConfiguracao() {
  // Se falhar, a página continua sem os limites das pausas e volta a tentar daqui a 2 minutos.
  if (!fresco(cache.pausas, cache.pausas?.falhou ? 120000 : 1800000)) {
    let falhou = false;
    const [pausas, grupos] = await Promise.all([
      ferramenta("list_breaks", {}).catch(() => { falhou = true; return cache.pausas?.v || []; }),
      ferramenta("list_groups", {}).catch(() => { falhou = true; return cache.grupos?.v || []; }),
    ]);
    cache.pausas = { ts: Date.now(), v: pausas, falhou }; cache.grupos = { ts: Date.now(), v: grupos };
  }
  return { pausas: cache.pausas.v, grupos: cache.grupos.v };
}

// ------------------------------------------------------------ fotografia da operação
const hora = (d) => new Intl.DateTimeFormat("pt-PT", { timeZone: FUSO, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(d);
const curto = (fila) => fila ? String(fila).replace(/^TAAG Geral \| /, "") : null;
const hhmm = (t) => (t || "").slice(0, 5);

// Chamadas atendidas hoje, por agente (só linhas com agente e com conversa).
function porAgente(chamadas) {
  const m = new Map();
  for (const c of chamadas?.linhas || []) {
    const cod = String(c.agentUsername ?? "");
    if (!/^\d+$/.test(cod) || !(c.talkTimeSec > 0)) continue;
    let a = m.get(cod);
    if (!a) m.set(cod, a = { codigo: cod, nome: [c.agentFirstName, c.agentLastName].filter(Boolean).join(" ") || cod,
      atendidas: 0, conversaSeg: 0, esperaSeg: 0, curtas: 0, transferidas: 0, desligouAgente: 0, filas: new Map(), primeira: null, ultima: null });
    a.atendidas++; a.conversaSeg += c.talkTimeSec; a.esperaSeg += c.holdTimeSec || 0;
    if (c.talkTimeSec < 30) a.curtas++;
    // Transferir para o IVR é o inquérito no fim da chamada: não conta como transferência.
    if (c.termReason === "TRANSFER" && c.transferTarget && c.transferTarget !== "ivr") a.transferidas++;
    if (c.termReason === "AGENT") a.desligouAgente++;
    const f = curto(c.queueName); a.filas.set(f, (a.filas.get(f) || 0) + 1);
    const h = String(c.callStart || "").slice(11, 16);
    if (h && (!a.primeira || h < a.primeira)) a.primeira = h;
    if (h && (!a.ultima || h > a.ultima)) a.ultima = h;
  }
  return [...m.values()].map(({ filas, esperaSeg, ...a }) => ({ ...a,
    tmaSeg: Math.round(a.conversaSeg / a.atendidas), esperaMediaSeg: Math.round(esperaSeg / a.atendidas),
    filaPrincipal: [...filas].sort((x, y) => y[1] - x[1])[0][0] })).sort((x, y) => y.atendidas - x.atendidas);
}

export function montar(vivo, hoje, { pausas, grupos }, fonte, chamadas = null) {
  const grupoDe = new Map((vivo.voiceStates || []).map((v) => [String(v.username), v.group]));
  const idGrupo = new Map((grupos || []).filter((g) => !g.deleted).map((g) => [g.name, g.id]));
  const limite = (grupo, pausa) => {
    const gid = idGrupo.get(grupo);
    const doGrupo = pausas.find((b) => b.groupId === gid && b.name === pausa);
    if (doGrupo) return doGrupo;
    const iguais = pausas.filter((b) => b.name === pausa);
    return iguais.length && iguais.every((b) => b.maxMinutes === iguais[0].maxMinutes) ? iguais[0] : null;
  };
  const agentes = (vivo.agents || []).map((a) => {
    const [cod, rotulo] = a.onBreak ? ["pausa", a.state] : ESTADOS[a.state] || ["outro", a.state || "—"];
    const grupo = grupoDe.get(String(a.code)) || null;
    const regra = a.onBreak ? limite(grupo, a.state) : null;
    const limiteMin = regra?.maxMinutes ?? null;
    return {
      codigo: String(a.code), nome: a.name || String(a.code), estado: rotulo, tipo: cod, pausa: a.onBreak ? a.state : null,
      noEstadoSeg: a.timeInStateSec || 0, fila: curto(a.queue), grupo,
      pausasHojeSeg: (a.breakTimeSec || 0) + (a.onBreak ? a.timeInStateSec || 0 : 0),
      limiteMin, excedeSeg: limiteMin != null && a.onBreak ? Math.max(0, (a.timeInStateSec || 0) - limiteMin * 60) : 0,
      janela: regra ? `${hhmm(regra.startTime)}–${hhmm(regra.endTime)}` : null,
    };
  });
  // Números de hoje por agente (relatório de chamadas). Junta-os aos agentes com sessão agora.
  const ligados = new Map(agentes.map((a) => [a.codigo, a]));
  const agentesHoje = chamadas ? porAgente(chamadas).map((x) => ({ ...x, comSessao: ligados.has(x.codigo),
    pausasHojeSeg: ligados.get(x.codigo)?.pausasHojeSeg ?? null })) : null;
  const hojeDe = new Map((agentesHoje || []).map((x) => [x.codigo, x]));
  for (const a of agentes) {
    const x = hojeDe.get(a.codigo);
    a.atendidasHoje = chamadas ? x?.atendidas ?? 0 : null;
    a.tmaHojeSeg = x?.tmaSeg ?? null;
  }
  const espera = new Map((vivo.waiting || []).map((w) => [Number(w.queueId), w]));
  const filas = FILAS.map(([id, nome], i) => {
    const t = hoje[i] || {};
    const w = espera.get(id);
    return {
      id, nome, emEspera: w?.calls || 0, esperaMaisLongaSeg: w?.longestWaitSec || 0,
      oferecidas: t.offered ?? null, atendidas: t.answered ?? null, abandonadas: t.abandoned ?? null,
      abandonoPct: t.offered ? Math.round((t.abandoned / t.offered) * 1000) / 10 : null,
      tmaSeg: t.avgTalkSec ?? null, tmeSeg: t.avgWaitSec ?? null, esperaMaxHojeSeg: t.maxWaitSec ?? null,
      sla20Pct: t.sla20Pct ?? null, agentesEmChamada: agentes.filter((a) => a.fila === nome).length,
      semDados: !hoje[i],
    };
  }).filter((f) => f.oferecidas || f.emEspera || f.agentesEmChamada);
  // Regras das pausas só dos grupos com agentes ligados (para a página e para a IA).
  const gruposLigados = new Set(agentes.map((a) => a.grupo).filter(Boolean));
  const regras = pausas.filter((b) => [...gruposLigados].some((g) => idGrupo.get(g) === b.groupId))
    .map((b) => ({ grupo: (grupos.find((g) => g.id === b.groupId) || {}).name, pausa: b.name, janela: `${hhmm(b.startTime)}–${hhmm(b.endTime)}`, maxMin: b.maxMinutes, maxSimultaneo: b.maxConcurrent }));
  const soma = (k) => filas.reduce((s, f) => s + (f[k] || 0), 0);
  const at = vivo.at ? new Date(vivo.at) : new Date();
  return {
    fonte, instancia: INSTANCIA, at: at.toISOString(), hora: hora(at),
    resumo: {
      agentes: agentes.length, emChamada: agentes.filter((a) => ["conversa", "espera", "toque", "pos"].includes(a.tipo)).length,
      disponiveis: agentes.filter((a) => a.tipo === "disponivel").length, emPausa: agentes.filter((a) => a.tipo === "pausa").length,
      pausasExcedidas: agentes.filter((a) => a.excedeSeg > 0).length, emEspera: vivo.callsInQueue ?? soma("emEspera"),
      oferecidas: soma("oferecidas"), atendidas: soma("atendidas"), abandonadas: soma("abandonadas"),
    },
    filas, agentes, regras, regrasLidas: pausas.length,
    agentesHoje, chamadasHora: chamadas?.hora || null,
  };
}

// ------------------------------------------------------------ dados de exemplo (sem chave ou sem ligação)
function exemplo(motivo) {
  const agora = new Date();
  const s = Math.floor(agora.getTime() / 1000);
  const onda = (k, a) => Math.round(a * (1 + Math.sin(s / 90 + k)) / 2);
  const estados = ["talking", "talking", "ready", "talking", "Intervalo", "talking", "hold", "ready", "talking", "WC/Beber água", "talking", "ready", "Intervalo", "talking"];
  const agents = estados.map((st, i) => {
    const pausa = st === "Intervalo" || st === "WC/Beber água";
    return { code: String(90001 + i), name: `Agente de exemplo ${i + 1}`, state: st, onBreak: pausa,
      timeInStateSec: pausa ? (st === "Intervalo" ? (i === 4 ? 3900 : 1200) : 840) + (s % 60) : 30 + ((s + i * 37) % 400),
      queue: st === "talking" || st === "hold" ? (i % 3 ? "TAAG Geral | PT Reservas" : "TAAG Geral | PT Informações") : null,
      sessionTimeSec: 14000, breakTimeSec: 600 + i * 45 };
  });
  const waiting = [{ queueId: 7, calls: onda(1, 3), longestWaitSec: 10 + onda(2, 70) }, { queueId: 11, calls: onda(3, 2), longestWaitSec: 5 + onda(4, 40) }];
  const vivo = { at: agora.toISOString(), callsInQueue: waiting.reduce((s, w) => s + w.calls, 0), agents, waiting,
    voiceStates: agents.map((a) => ({ username: a.code, group: "08h00/17h00" })) };
  const hoje = FILAS.map(([id]) => ({ 7: [412, 398, 14, 331, 17, 84.2], 11: [296, 281, 15, 402, 24, 76.9], 15: [58, 57, 1, 288, 9, 93.1], 508: [77, 74, 3, 356, 21, 79.2], 8: [39, 39, 0, 245, 6, 97.4] }[id]))
    .map((v) => v && { offered: v[0], answered: v[1], abandoned: v[2], avgTalkSec: v[3], avgWaitSec: v[4], maxWaitSec: v[4] * 9, sla20Pct: v[5] });
  const config = {
    grupos: [{ id: 1, name: "08h00/17h00" }],
    pausas: [
      { groupId: 1, name: "Intervalo", startTime: "08:00:00", endTime: "20:00:00", maxMinutes: 60, maxConcurrent: null },
      { groupId: 1, name: "WC/Beber água", startTime: "08:00:00", endTime: "20:00:00", maxMinutes: 10, maxConcurrent: null },
    ],
  };
  // Chamadas atendidas de hoje, inventadas mas estáveis (cada agente com o seu ritmo).
  const linhas = [];
  agents.forEach((a, i) => {
    const n = 18 + ((i * 7) % 23);
    for (let k = 0; k < n; k++) {
      const min = 8 * 60 + Math.floor((k * 540) / n) + (i % 5);
      linhas.push({ agentUsername: a.code, agentFirstName: "Agente de exemplo", agentLastName: String(i + 1),
        queueName: i % 3 ? "TAAG Geral | PT Reservas" : "TAAG Geral | PT Informações",
        callStart: `2026-01-01 ${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}:00`,
        talkTimeSec: k % 11 === 0 ? 20 : 180 + ((i * 53 + k * 29) % 260), holdTimeSec: (k * 13) % 50, termReason: k % 9 === 0 ? "TRANSFER" : "CALLER" });
    }
  });
  const d = montar(vivo, hoje, config, "exemplo", { data: hojeData(), hora: hora(agora), linhas });
  d.motivo = motivo;
  return d;
}

// ------------------------------------------------------------ API para o portal
let ultimo = null, aCarregar = null;
export const temChave = () => !!CHAVE;
export async function obterDados() {
  if (!CHAVE) return exemplo("O portal ainda não tem a chave da API da GoContact (GOCONTACT_API_KEY no ficheiro .env).");
  if (aCarregar) return aCarregar; // vários PCs ao mesmo tempo: um só pedido
  aCarregar = (async () => {
    try {
      const [vivo, hoje, config, chamadas] = await Promise.all([lerVivo(), lerHoje(), lerConfiguracao(), lerChamadas().catch(() => null)]);
      ultimo = montar(vivo, hoje, config, "gocontact", chamadas);
      return ultimo;
    } catch (e) {
      console.error("[gocontact]", e.message);
      if (ultimo && Date.now() - new Date(ultimo.at).getTime() < 5 * 60000) return { ...ultimo, aviso: `Sem resposta da GoContact agora (${e.message}). A mostrar os dados de ${ultimo.hora}.` };
      return exemplo(`Sem ligação à GoContact (${e.message}).`);
    } finally { aCarregar = null; }
  })();
  return aCarregar;
}
export function estadoLigacao() {
  if (!CHAVE) return "sem chave no .env (a página mostra dados de exemplo)";
  if (!ultimo) return "chave no .env, ainda sem dados";
  return `ligada · últimos dados às ${ultimo.hora}`;
}

// Texto compacto para a IA (só a fotografia do momento; não fica no histórico).
const mmss = (seg) => seg == null ? "—" : `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, "0")}`;
export function textoParaIA(d) {
  const linhas = [];
  linhas.push(`<dados_gocontact instancia="${d.instancia}" hora="${d.hora}" fonte="${d.fonte === "gocontact" ? "GoContact ao vivo" : "EXEMPLO (não são dados reais)"}">`);
  if (d.aviso) linhas.push(`Aviso: ${d.aviso}`);
  const r = d.resumo;
  linhas.push(`Agora: ${r.agentes} agentes com sessão · ${r.emChamada} em chamada · ${r.disponiveis} disponíveis · ${r.emPausa} em pausa (${r.pausasExcedidas} acima do limite) · ${r.emEspera} chamadas em espera.`);
  linhas.push(`Hoje até agora (filas abaixo): ${r.oferecidas} oferecidas, ${r.atendidas} atendidas, ${r.abandonadas} abandonadas.`);
  linhas.push("", "FILAS (hoje até agora; em espera = agora)", "fila;em espera agora;espera mais longa agora (m:ss);oferecidas;atendidas;abandonadas;abandono %;TMA (m:ss);TME (m:ss);espera máxima hoje (m:ss);SLA 20 s %;agentes em chamada desta fila");
  for (const f of d.filas) linhas.push([f.nome, f.emEspera, mmss(f.esperaMaisLongaSeg), f.oferecidas ?? "—", f.atendidas ?? "—", f.abandonadas ?? "—", f.abandonoPct ?? "—", mmss(f.tmaSeg), mmss(f.tmeSeg), mmss(f.esperaMaxHojeSeg), f.sla20Pct ?? "—", f.agentesEmChamada].join(";"));
  linhas.push("", "AGENTES AGORA", "código;nome;estado;fila da chamada;no estado há (m:ss);grupo;pausas hoje (min);limite da pausa actual (min);janela da pausa actual;acima do limite (m:ss)");
  for (const a of d.agentes) linhas.push([a.codigo, a.nome, a.estado, a.fila || "—", mmss(a.noEstadoSeg), a.grupo || "—", Math.round(a.pausasHojeSeg / 60), a.limiteMin ?? "—", a.janela || "—", a.excedeSeg ? mmss(a.excedeSeg) : "—"].join(";"));
  if (d.agentesHoje) {
    linhas.push("", `AGENTES HOJE: chamadas atendidas desde as 00:00 (relatório de chamadas das ${d.chamadasHora}; inclui quem já saiu)`,
      "código;nome;com sessão agora;fila principal;atendidas;TMA (m:ss);cliente em espera, média por chamada (m:ss);chamadas com menos de 30 s;transferidas;terminadas pelo agente;1.ª chamada;última chamada;pausas hoje (min; só quem tem sessão agora)");
    for (const a of d.agentesHoje) linhas.push([a.codigo, a.nome, a.comSessao ? "sim" : "não", a.filaPrincipal, a.atendidas, mmss(a.tmaSeg), mmss(a.esperaMediaSeg), a.curtas, a.transferidas, a.desligouAgente, a.primeira, a.ultima, a.pausasHojeSeg == null ? "—" : Math.round(a.pausasHojeSeg / 60)].join(";"));
    linhas.push("Não há horas de sessão por agente: a 1.ª e a última chamada mostram só quando atendeu.");
  } else linhas.push("", "AGENTES HOJE: o relatório de chamadas por agente ainda não chegou da GoContact (tenta daqui a um minuto).");
  if (d.regras.length) {
    linhas.push("", "REGRAS DAS PAUSAS (grupos com agentes ligados)", "grupo;pausa;janela;máximo (min);máximo em simultâneo");
    for (const g of d.regras) linhas.push([g.grupo, g.pausa, g.janela, g.maxMin, g.maxSimultaneo ?? "sem limite"].join(";"));
  }
  linhas.push("</dados_gocontact>");
  return linhas.join("\n");
}
