# Gera os ficheiros fictícios dos exercícios do M8 · Supervisores (formato dos relatórios do GoContact).
# Uso: python scripts/gerar_dados_supervisores.py public/ficheiros [outra/pasta ...]
# No fim imprime os resultados certos de cada exercício (para o guia do formador).
import sys, os, shutil
sys.stdout.reconfigure(encoding="utf-8")
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

PASTAS = sys.argv[1:] or ["public/ficheiros"]
OUT = PASTAS[0]
AVISO = "DADOS FICTÍCIOS PARA A FORMAÇÃO M8 · IA na Liderança (UCALL). Não são pessoas nem chamadas reais."
HEAD = Font(bold=True, color="FFFFFF")
FILL = PatternFill("solid", fgColor="1B1A22")


def folha(wb, titulo, cab, linhas, larguras=None, pct=()):
    ws = wb.create_sheet(titulo)
    ws.append(cab)
    for c in ws[1]:
        c.font = HEAD; c.fill = FILL; c.alignment = Alignment(wrap_text=True, vertical="center")
    for l in linhas:
        ws.append(list(l))
    for col in pct:
        for row in ws.iter_rows(min_row=2, min_col=col, max_col=col):
            for c in row:
                if isinstance(c.value, (int, float)): c.number_format = "0.0%"
    for i, w in enumerate(larguras or [14] * len(cab), 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A2"
    return ws


def leia_me(wb, titulo, linhas):
    ws = wb.active; ws.title = "LEIA-ME"
    ws.append([titulo, ""]); ws.append([AVISO, ""])
    for l in linhas: ws.append(list(l))
    ws["A1"].font = Font(bold=True, size=14); ws["A2"].font = Font(italic=True, color="CB3637")
    ws.column_dimensions["A"].width = 28; ws.column_dimensions["B"].width = 100
    for row in ws.iter_rows(min_row=3):
        row[0].font = Font(bold=True)
        row[1].alignment = Alignment(wrap_text=True, vertical="top")


METAS = ("Metas", "SLA 20 s ≥ 80% (chamadas atendidas até 20 s ÷ chamadas oferecidas) · Abandono ≤ 5% · TME ≤ 20 s")
TURNOS = ("Turnos", "08h00/17h00: agentes 40101 a 40108 (8) · 11h00/20h00: agentes 40109 a 40114 (6). Tolerância de entrada: 5 min.")
REGRAS = [
    ("Intervalo", "08h00/17h00", "12:00", "14:00", 45, 1, 3),
    ("Intervalo", "11h00/20h00", "15:00", "17:00", 45, 1, 3),
    ("WC/Beber água", "Todos", "08:00", "20:00", 10, 3, 2),
]
CAB_REGRAS = ["Pausa", "Grupo", "Janela: início", "Janela: fim", "Máximo (min)", "Quantas por turno", "Máximo em simultâneo"]
HORAS = [f"{h:02d}:00–{h + 1:02d}:00" for h in range(8, 20)]
TURNO_DE = {a: ("08h00/17h00" if a <= 40108 else "11h00/20h00") for a in range(40101, 40115)}


def m(hhmm):
    h, mi = map(int, hhmm.split(":")); return h * 60 + mi


def hhmm(x):
    return f"{x // 60:02d}:{x % 60:02d}"


def por_hora(vol, sla, tme, abandono, tma, agentes):
    """Linhas do relatório por hora: duas filas. Devolve linhas e totais."""
    linhas, tot = [], {}
    for fi, fila in enumerate(["Informações", "Reservas"]):
        o_t = a20_t = ab_t = at_t = 0
        for i, h in enumerate(HORAS):
            o = vol[fi][i]; ab = abandono[fi][i]; at = o - ab; a20 = round(sla[fi][i] / 100 * o)
            linhas.append(("", h, fila, o, at, ab, a20, a20 / o, tme[fi][i], tma[fi][i]))
            o_t += o; a20_t += a20; ab_t += ab; at_t += at
        tot[fila] = (o_t, at_t, ab_t, a20_t)
    linhas.sort(key=lambda l: (l[1], l[2]))
    return linhas, tot


def resumo(nome, linhas, tot):
    O = sum(t[0] for t in tot.values()); A20 = sum(t[3] for t in tot.values()); AB = sum(t[2] for t in tot.values())
    media_simples = sum(l[7] for l in linhas) / len(linhas)
    print(f"\n== {nome}")
    for f, (o, at, ab, a20) in tot.items():
        print(f"  {f}: oferecidas {o}, atendidas até 20 s {a20} → SLA {a20 / o:.1%}; abandono {ab}/{o} = {ab / o:.1%}")
    print(f"  Dia: {A20}/{O} = {A20 / O:.1%} (média simples da coluna SLA: {media_simples:.1%}); abandono {AB}/{O} = {AB / O:.1%}")
    for l in linhas:
        if l[7] < 0.8: print(f"  abaixo da meta: {l[1]} {l[2]} SLA {l[7]:.1%} TME {l[8]} s abandonadas {l[5]}")


# =====================================================================================
# Ex. 1 · Chamadas por hora · sexta-feira 06/11/2026
# =====================================================================================
vol1 = [[30, 46, 56, 70, 84, 92, 64, 58, 52, 42, 30, 20], [10, 16, 20, 26, 32, 34, 24, 22, 20, 16, 12, 8]]
sla1 = [[93, 90, 86, 95, 36, 61, 88, 87, 89, 84, 92, 95], [90, 88, 85, 93, 31, 56, 86, 84, 88, 81, 92, 88]]
tme1 = [[6, 8, 11, 5, 82, 41, 9, 10, 8, 13, 7, 5], [8, 9, 12, 6, 95, 49, 11, 12, 9, 15, 7, 9]]
ab1 = [[0, 1, 1, 0, 13, 6, 1, 1, 0, 1, 0, 0], [0, 0, 1, 0, 6, 3, 0, 1, 0, 1, 0, 0]]
tma1 = [[214, 221, 226, 219, 231, 228, 224, 217, 220, 223, 212, 209], [296, 305, 311, 302, 318, 314, 307, 299, 301, 309, 293, 288]]
agentes1 = [7.6, 8.0, 7.8, 13.3, 8.2, 10.9, 13.2, 11.8, 11.9, 5.9, 5.8, 5.1]
linhas1, tot1 = por_hora(vol1, sla1, tme1, ab1, tma1, agentes1)
linhas1 = [("06/11/2026",) + l[1:] for l in linhas1]

wb = Workbook()
leia_me(wb, "Relatório de chamadas por hora · sexta-feira, 06/11/2026", [
    ("Operação", "Linha de apoio (fictícia), filas Informações e Reservas, das 08h00 às 20h00."),
    METAS, TURNOS,
    ("Folha Chamadas_por_hora", "Exportação do GoContact: uma linha por hora e por fila."),
    ("Folha Agentes_por_hora", "Média de agentes com login e fora de pausa, em cada hora (as duas filas)."),
])
folha(wb, "Chamadas_por_hora", ["Data", "Intervalo", "Fila", "Oferecidas", "Atendidas", "Abandonadas", "Atendidas até 20 s", "SLA 20 s", "TME (s)", "TMA (s)"],
      linhas1, [12, 14, 13, 11, 11, 12, 13, 10, 9, 9], pct=(8,))
folha(wb, "Agentes_por_hora", ["Data", "Intervalo", "Agentes disponíveis (média)"],
      [("06/11/2026", h, a) for h, a in zip(HORAS, agentes1)], [12, 14, 16])
wb.save(os.path.join(OUT, "M8_Sup_1_Chamadas_por_hora.xlsx"))
resumo("Ex. 1 · sexta 06/11", linhas1, tot1)

# =====================================================================================
# Ex. 2 · Logins e pausas · sexta-feira 06/11/2026
# =====================================================================================
logins = {
    40101: ("07:56", "17:02"), 40102: ("07:58", "17:01"), 40103: ("07:55", "17:03"), 40104: ("07:59", "17:00"),
    40105: ("08:27", "17:04"), 40106: ("07:57", "17:02"), 40107: ("08:01", "17:01"), 40108: ("07:58", "17:05"),
    40109: ("10:57", "20:02"), 40110: ("10:59", "20:01"), 40111: ("10:56", "20:03"), 40112: ("10:58", "19:31"),
    40113: ("11:02", "20:00"), 40114: ("10:55", "20:04"),
}
pausas = [
    # Intervalo do turno 08h00/17h00: seis saem às 12h00 (máximo 3 em simultâneo)
    (40101, "Intervalo", "12:00", "12:44"), (40102, "Intervalo", "12:01", "12:45"), (40103, "Intervalo", "12:00", "13:08"),
    (40104, "Intervalo", "12:02", "12:46"), (40106, "Intervalo", "12:00", "12:43"), (40107, "Intervalo", "12:02", "13:15"),
    (40105, "Intervalo", "13:15", "14:00"), (40108, "Intervalo", "13:16", "14:00"),
    # Intervalo do turno 11h00/20h00 (40110 fora da janela)
    (40110, "Intervalo", "13:10", "13:55"), (40109, "Intervalo", "15:00", "15:44"), (40111, "Intervalo", "15:01", "15:45"),
    (40113, "Intervalo", "15:46", "16:30"), (40114, "Intervalo", "15:47", "16:31"), (40112, "Intervalo", "16:32", "17:16"),
    # WC/Beber água
    (40101, "WC/Beber água", "09:40", "09:46"), (40101, "WC/Beber água", "15:20", "15:27"),
    (40102, "WC/Beber água", "10:05", "10:11"), (40102, "WC/Beber água", "14:35", "14:41"),
    (40103, "WC/Beber água", "09:12", "09:19"), (40103, "WC/Beber água", "15:50", "15:56"),
    (40104, "WC/Beber água", "10:30", "10:35"), (40104, "WC/Beber água", "16:05", "16:12"),
    (40105, "WC/Beber água", "10:48", "10:55"),
    (40106, "WC/Beber água", "09:55", "10:02"), (40106, "WC/Beber água", "14:50", "14:58"),
    (40107, "WC/Beber água", "11:10", "11:16"), (40107, "WC/Beber água", "16:20", "16:27"),
    (40108, "WC/Beber água", "09:40", "10:02"), (40108, "WC/Beber água", "15:35", "15:41"),
    (40109, "WC/Beber água", "12:30", "12:37"), (40109, "WC/Beber água", "18:10", "18:16"),
    (40110, "WC/Beber água", "17:20", "17:27"),
    (40111, "WC/Beber água", "11:50", "11:58"), (40111, "WC/Beber água", "13:20", "13:29"), (40111, "WC/Beber água", "14:40", "14:48"),
    (40111, "WC/Beber água", "17:05", "17:13"), (40111, "WC/Beber água", "18:40", "18:48"),
    (40112, "WC/Beber água", "13:45", "13:51"), (40112, "WC/Beber água", "18:00", "18:07"),
    (40113, "WC/Beber água", "12:15", "12:22"), (40113, "WC/Beber água", "17:50", "17:56"),
    (40114, "WC/Beber água", "13:30", "13:37"), (40114, "WC/Beber água", "18:25", "18:32"),
]
pausas.sort(key=lambda p: (m(p[2]), p[0]))
linhas_pausas = [("06/11/2026", a, TURNO_DE[a], p, i, f, m(f) - m(i)) for a, p, i, f in pausas]

wb = Workbook()
leia_me(wb, "Logins e pausas dos agentes · sexta-feira, 06/11/2026", [
    ("Operação", "Linha de apoio (fictícia), 14 agentes em dois turnos."), TURNOS,
    ("Folha Logins", "Primeiro login e último logout de cada agente (eventos de agente do GoContact)."),
    ("Folha Pausas", "Uma linha por pausa: início, fim e duração em minutos."),
    ("Folha Regras_pausas", "Pausas configuradas no GoContact: janela, máximo de minutos, quantas por turno e máximo em simultâneo."),
])
folha(wb, "Logins", ["Data", "Agente", "Grupo", "Login", "Logout"],
      [("06/11/2026", a, TURNO_DE[a], li, lo) for a, (li, lo) in logins.items()], [12, 10, 14, 9, 9])
folha(wb, "Pausas", ["Data", "Agente", "Grupo", "Pausa", "Início", "Fim", "Duração (min)"], linhas_pausas, [12, 10, 14, 16, 9, 9, 13])
folha(wb, "Regras_pausas", CAB_REGRAS, REGRAS, [16, 14, 13, 12, 13, 16, 18])
wb.save(os.path.join(OUT, "M8_Sup_2_Logins_e_pausas.xlsx"))

print("\n== Ex. 2 · sexta 06/11")
mx = max(range(8 * 60, 20 * 60), key=lambda x: sum(1 for a, p, i, f in pausas if p == "Intervalo" and m(i) <= x < m(f)))
em = [a for a, p, i, f in pausas if p == "Intervalo" and m(i) <= mx < m(f)]
acima = [x for x in range(8 * 60, 20 * 60) if sum(1 for a, p, i, f in pausas if p == "Intervalo" and m(i) <= x < m(f)) > 3]
print(f"  máximo em Intervalo: {len(em)} às {hhmm(mx)} {em}; acima de 3 entre {hhmm(acima[0])} e {hhmm(acima[-1] + 1)}")
for a, p, i, f in pausas:
    d = m(f) - m(i); mx = 45 if p == "Intervalo" else 10
    if d > mx: print(f"  {a} {p} {i}–{f}: {d} min (máx {mx}, +{d - mx})")
from collections import Counter
for a, n in Counter(a for a, p, i, f in pausas if p == "WC/Beber água").items():
    if n > 3: print(f"  {a}: {n} pausas WC (máx 3), total {sum(m(f) - m(i) for b, p, i, f in pausas if b == a and p == 'WC/Beber água')} min")
for a, (li, lo) in logins.items():
    ini, fim = (8 * 60, 17 * 60) if a <= 40108 else (11 * 60, 20 * 60)
    if m(li) > ini + 5: print(f"  {a} entrou às {li} (+{m(li) - ini} min)")
    if m(lo) < fim - 5: print(f"  {a} saiu às {lo} (−{fim - m(lo)} min)")

# =====================================================================================
# Ex. 3 · Indicadores por agente · semana 02 a 06/11/2026
# =====================================================================================
# agente, em integração, atendidas, TMA, pós-chamada, espera (hold), < 30 s, desligadas pelo agente, transferidas, não atendidas
agentes3 = [
    (40101, "Não", 431, 262, 21, 24, 14, 4, 18, 1),
    (40102, "Não", 418, 271, 23, 27, 16, 5, 21, 0),
    (40103, "Não", 402, 279, 25, 26, 13, 3, 19, 2),
    (40104, "Não", 612, 148, 15, 10, 196, 171, 9, 1),
    (40105, "Não", 377, 268, 22, 25, 12, 4, 17, 1),
    (40106, "Não", 425, 265, 20, 23, 15, 6, 20, 0),
    (40107, "Não", 356, 392, 24, 88, 11, 3, 68, 1),
    (40108, "Não", 409, 274, 26, 28, 14, 5, 22, 2),
    (40109, "Não", 398, 270, 22, 25, 13, 4, 19, 1),
    (40110, "Não", 301, 285, 98, 27, 12, 3, 16, 0),
    (40111, "Não", 385, 276, 24, 26, 15, 5, 20, 1),
    (40112, "Não", 371, 281, 23, 29, 12, 4, 18, 2),
    (40113, "Não", 344, 273, 21, 24, 13, 4, 17, 27),
    (40114, "Sim", 246, 431, 31, 47, 9, 2, 31, 1),
]
wb = Workbook()
leia_me(wb, "Indicadores por agente · semana de 02 a 06/11/2026", [
    ("Operação", "Linha de apoio (fictícia), 14 agentes, filas Informações e Reservas."), TURNOS,
    ("Colunas", "TMA = tempo médio de conversação · Pós-chamada = tempo médio de wrap-up depois de desligar · Espera = tempo médio com o cliente em espera (hold) · "
                "Chamadas < 30 s = chamadas atendidas com menos de 30 s de conversação · Desligadas pelo agente = chamadas terminadas do lado do agente · "
                "Não atendidas = chamadas que tocaram no posto e o agente não atendeu."),
    ("Referência da equipa", "TMA ≈ 270 s · Pós-chamada ≈ 25 s · Espera ≈ 25 s"),
])
folha(wb, "Por_agente", ["Agente", "Grupo", "Em integração", "Chamadas atendidas", "TMA (s)", "Pós-chamada médio (s)", "Espera médio (s)",
                         "Chamadas < 30 s", "Desligadas pelo agente", "Transferidas", "Não atendidas"],
      [(a, TURNO_DE[a]) + tuple(r) for a, *r in agentes3], [9, 13, 12, 12, 9, 13, 11, 11, 13, 11, 11])
wb.save(os.path.join(OUT, "M8_Sup_3_Indicadores_por_agente.xlsx"))
print("\n== Ex. 3 · semana")
for a, integ, at, tma, pos, esp, c30, desl, transf, nat in agentes3:
    print(f"  {a}: {at} atendidas, TMA {tma}, pós {pos}, espera {esp}, <30 s {c30} ({c30 / at:.0%}), desligadas {desl}, transf {transf} ({transf / at:.0%}), não atend {nat}, integração {integ}")

# =====================================================================================
# Ex. 4 · Relatórios de quinta-feira 05/11/2026 (o dia que ninguém viu)
# =====================================================================================
vol4 = [[34, 48, 54, 66, 70, 74, 62, 56, 50, 40, 28, 18], [12, 18, 20, 24, 26, 28, 22, 20, 18, 14, 10, 6]]
sla4 = [[58, 71, 87, 92, 88, 86, 89, 87, 90, 86, 93, 94], [50, 67, 85, 90, 86, 84, 88, 86, 89, 85, 90, 100]]
tme4 = [[48, 31, 10, 6, 9, 11, 8, 10, 7, 11, 6, 4], [57, 36, 12, 7, 10, 12, 9, 11, 8, 12, 7, 3]]
ab4 = [[5, 3, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0], [2, 2, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]]
tma4 = [[218, 224, 222, 220, 227, 225, 221, 219, 222, 220, 214, 210], [301, 308, 309, 304, 312, 310, 305, 300, 303, 306, 295, 290]]
linhas4, tot4 = por_hora(vol4, sla4, tme4, ab4, tma4, None)
linhas4 = [("05/11/2026",) + l[1:] for l in linhas4]
logins4 = {
    40101: ("07:57", "17:01"), 40102: ("08:22", "17:02"), 40103: ("07:56", "17:03"), 40104: ("07:58", "17:00"),
    40105: ("08:41", "17:05"), 40106: ("08:35", "17:01"), 40107: ("07:59", "17:02"), 40108: ("07:58", "17:04"),
    40109: ("10:58", "20:01"), 40110: ("10:57", "20:02"), 40111: ("10:59", "20:03"), 40112: ("10:56", "20:00"),
    40113: ("11:01", "20:02"), 40114: ("10:58", "20:01"),
}
pausas4 = [
    (40101, "Intervalo", "12:00", "12:44"), (40104, "Intervalo", "12:01", "12:45"), (40107, "Intervalo", "12:00", "12:43"),
    (40102, "Intervalo", "12:46", "13:30"), (40103, "Intervalo", "12:45", "13:29"), (40106, "Intervalo", "12:47", "13:31"),
    (40105, "Intervalo", "13:15", "13:59"), (40108, "Intervalo", "13:16", "14:00"),
    (40109, "Intervalo", "15:00", "15:58"), (40110, "Intervalo", "15:01", "15:45"), (40111, "Intervalo", "15:02", "15:46"),
    (40112, "Intervalo", "15:59", "16:43"), (40113, "Intervalo", "16:00", "16:44"), (40114, "Intervalo", "16:01", "16:45"),
    (40101, "WC/Beber água", "10:10", "10:16"), (40102, "WC/Beber água", "15:10", "15:16"), (40103, "WC/Beber água", "09:30", "09:37"),
    (40104, "WC/Beber água", "10:40", "10:45"), (40105, "WC/Beber água", "11:20", "11:27"), (40106, "WC/Beber água", "14:20", "14:26"),
    (40107, "WC/Beber água", "09:50", "09:56"), (40108, "WC/Beber água", "10:25", "10:31"), (40109, "WC/Beber água", "13:10", "13:17"),
    (40110, "WC/Beber água", "17:30", "17:36"), (40111, "WC/Beber água", "18:05", "18:12"), (40112, "WC/Beber água", "13:40", "13:47"),
    (40113, "WC/Beber água", "12:35", "12:41"), (40114, "WC/Beber água", "18:30", "18:36"),
]
pausas4.sort(key=lambda p: (m(p[2]), p[0]))
agentes4 = [
    (40101, "Não", 89, 259, 22, 23, 3, 1, 4, 0), (40102, "Não", 78, 266, 24, 26, 3, 1, 4, 0),
    (40103, "Não", 84, 275, 25, 27, 2, 0, 3, 0), (40104, "Não", 121, 151, 14, 11, 38, 34, 2, 0),
    (40105, "Não", 72, 270, 23, 24, 2, 1, 3, 1), (40106, "Não", 76, 263, 21, 22, 3, 1, 4, 0),
    (40107, "Não", 74, 386, 25, 84, 2, 0, 14, 0), (40108, "Não", 85, 272, 27, 27, 3, 1, 4, 0),
    (40109, "Não", 80, 268, 23, 24, 3, 1, 4, 0), (40110, "Não", 61, 284, 95, 26, 2, 0, 3, 0),
    (40111, "Não", 79, 274, 24, 25, 3, 1, 4, 0), (40112, "Não", 81, 279, 22, 28, 2, 1, 4, 0),
    (40113, "Não", 70, 271, 22, 23, 3, 1, 3, 6), (40114, "Sim", 52, 418, 30, 45, 2, 0, 6, 0),
]
wb = Workbook()
leia_me(wb, "Relatórios do GoContact · quinta-feira, 05/11/2026", [
    ("Operação", "Linha de apoio (fictícia), filas Informações e Reservas, das 08h00 às 20h00, 14 agentes."), METAS, TURNOS,
    ("Folhas", "Chamadas_por_hora · Logins · Pausas · Regras_pausas · Por_agente (indicadores do dia)."),
])
folha(wb, "Chamadas_por_hora", ["Data", "Intervalo", "Fila", "Oferecidas", "Atendidas", "Abandonadas", "Atendidas até 20 s", "SLA 20 s", "TME (s)", "TMA (s)"],
      linhas4, [12, 14, 13, 11, 11, 12, 13, 10, 9, 9], pct=(8,))
folha(wb, "Logins", ["Data", "Agente", "Grupo", "Login", "Logout"],
      [("05/11/2026", a, TURNO_DE[a], li, lo) for a, (li, lo) in logins4.items()], [12, 10, 14, 9, 9])
folha(wb, "Pausas", ["Data", "Agente", "Grupo", "Pausa", "Início", "Fim", "Duração (min)"],
      [("05/11/2026", a, TURNO_DE[a], p, i, f, m(f) - m(i)) for a, p, i, f in pausas4], [12, 10, 14, 16, 9, 9, 13])
folha(wb, "Regras_pausas", CAB_REGRAS, REGRAS, [16, 14, 13, 12, 13, 16, 18])
folha(wb, "Por_agente", ["Agente", "Grupo", "Em integração", "Chamadas atendidas", "TMA (s)", "Pós-chamada médio (s)", "Espera médio (s)",
                         "Chamadas < 30 s", "Desligadas pelo agente", "Transferidas", "Não atendidas"],
      [(a, TURNO_DE[a]) + tuple(r) for a, *r in agentes4], [9, 13, 12, 12, 9, 13, 11, 11, 13, 11, 11])
wb.save(os.path.join(OUT, "M8_Sup_4_Relatorios_quinta.xlsx"))
resumo("Ex. 4 · quinta 05/11", linhas4, tot4)
for a, (li, lo) in logins4.items():
    ini = 8 * 60 if a <= 40108 else 11 * 60
    if m(li) > ini + 5: print(f"  {a} entrou às {li} (+{m(li) - ini} min)")
for a, p, i, f in pausas4:
    if m(f) - m(i) > (45 if p == "Intervalo" else 10): print(f"  {a} {p} {i}–{f}: {m(f) - m(i)} min")

for destino in PASTAS[1:]:
    for f in ["M8_Sup_1_Chamadas_por_hora.xlsx", "M8_Sup_2_Logins_e_pausas.xlsx", "M8_Sup_3_Indicadores_por_agente.xlsx", "M8_Sup_4_Relatorios_quinta.xlsx"]:
        shutil.copy(os.path.join(OUT, f), os.path.join(destino, f))
