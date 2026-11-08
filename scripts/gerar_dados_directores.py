# Gera os ficheiros fictícios dos exercícios do M8 · Directores, DGAs e CE.
# Uso: python scripts/gerar_dados_directores.py public/ficheiros
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

OUT = sys.argv[1]
AVISO = ("DADOS FICTÍCIOS PARA EXERCÍCIO · M8 IA na Liderança · Academia UCALL. "
         "Não correspondem a pessoas, clientes nem operações reais.")
HEAD = Font(bold=True, color="FFFFFF")
FILL = PatternFill("solid", fgColor="CB3637")


def sheet(ws, header, rows, widths=None, pct_cols=(), wrap_cols=(), money_cols=()):
    ws.append(header)
    for c in ws[1]:
        c.font = HEAD
        c.fill = FILL
        c.alignment = Alignment(wrap_text=True, vertical="center")
    for r in rows:
        ws.append(list(r))
    for col in pct_cols:
        for row in ws.iter_rows(min_row=2, min_col=col, max_col=col):
            for c in row:
                if isinstance(c.value, (int, float)):
                    c.number_format = "0%"
    for col in money_cols:
        for row in ws.iter_rows(min_row=2, min_col=col, max_col=col):
            for c in row:
                if isinstance(c.value, (int, float)):
                    c.number_format = "#,##0"
    for col in wrap_cols:
        for row in ws.iter_rows(min_row=2, min_col=col, max_col=col):
            for c in row:
                c.alignment = Alignment(wrap_text=True, vertical="top")
    if widths:
        for i, w in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A2"


MESES = ["Mai/2026", "Jun/2026", "Jul/2026", "Ago/2026", "Set/2026", "Out/2026"]

# ---------- Carteira: 10 contas × 6 meses ----------
# Por conta: sector, % simples, e listas mensais (volume, receita, satisfação, reclamações/1000, nível de serviço, observação).
# None = dado não carregado.
CONTAS = {
    "Conta 01": ("Telecomunicações", 0.40,
                 [48200, 48650, 47900, 48400, 48800, 48300], [290, 292, 289, 291, 293, 292],
                 [4.2, 4.2, 4.3, 4.2, 4.2, 4.3], [6, 6, 5, 6, 6, 5], [0.82, 0.83, 0.81, 0.82, 0.84, 0.83], [""] * 6),
    "Conta 02": ("Telecomunicações (pré-pago)", 0.54,
                 [61200, 60800, 61900, 62300, 61500, 61800], [210, 209, 212, 213, 211, 212],
                 [4.0, 4.0, 3.9, 4.0, 4.0, 4.0], [8, 8, 8, 7, 8, 8], [0.80, 0.79, 0.80, 0.81, 0.80, 0.80], [""] * 6),
    "Conta 03": ("Banca", 0.32,
                 [30100, 29800, 28600, 27200, 25900, 24500], [260, 259, 251, 240, 230, 221],
                 [4.3, 4.2, 4.0, 3.8, 3.6, 3.4], [5, 6, 8, 10, 12, 14], [0.84, 0.83, 0.80, 0.78, 0.76, 0.74], [""] * 6),
    "Conta 04": ("Seguros", 0.30,
                 [12100, 12000, 12300, 12200, 12100, 12250], [95, 95, 96, 95, 95, 96],
                 [4.1, 4.1, 4.2, 4.1, 4.1, 4.2], [5, 5, 4, 5, 5, 4], [0.85, 0.86, 0.85, 0.85, 0.86, 0.85], [""] * 6),
    "Conta 05": ("Retalho", 0.51,
                 [21800, 22100, 22400, 22600, 22900, 23100], [120, 121, 122, 124, 125, 126],
                 [3.9, 3.9, 4.0, 4.0, 4.1, 4.1], [9, 9, 8, 8, 7, 7], [0.78, 0.79, 0.80, 0.81, 0.82, 0.82], [""] * 6),
    "Conta 06": ("Energia", 0.38,
                 [40100, 40500, 40300, 52000, 49100, 41200], [180, 181, 180, 186, 184, 181],
                 [4.0, 4.0, 4.0, 3.5, 3.6, 3.9], [7, 7, 7, 18, 16, 9], [0.81, 0.80, 0.81, 0.70, 0.74, 0.80],
                 ["", "", "", "Novo tarifário do cliente parceiro a 01/08", "", "Volume volta ao normal"]),
    "Conta 07": ("Água", 0.36,
                 [9000, 9100, 8900, 9050, 9000, 9100], [48, 48, 47, 48, 48, 48],
                 [4.0, 4.0, 4.0, 4.1, 4.0, 4.0], [7, 7, 7, 6, 7, 7], [0.80, 0.81, 0.80, 0.80, 0.81, 0.80], [""] * 6),
    "Conta 08": ("Saúde", 0.34,
                 [15100, 15300, 15200, 15400, None, None], [110, 109, 107, 104, None, None],
                 [4.2, 4.0, 3.9, 3.7, None, None], [6, 7, 9, 11, None, None], [0.83, 0.82, 0.80, 0.79, None, None],
                 ["", "", "", "", "Dados não carregados", "Dados não carregados"]),
    "Conta 09": ("Transportes", 0.56,
                 [26100, 25900, 26300, 26200, 26000, 26400], [75, 75, 76, 75, 75, 76],
                 [4.1, 4.1, 4.1, 4.2, 4.1, 4.1], [6, 6, 6, 5, 6, 6], [0.83, 0.83, 0.84, 0.83, 0.83, 0.84], [""] * 6),
    "Conta 10": ("Televisão por subscrição", 0.44,
                 [33000, 32600, 32300, 31900, 31500, 31000], [150, 149, 149, 148, 147, 146],
                 [4.0, 4.0, 4.0, 4.0, 3.9, 4.0], [8, 8, 8, 8, 8, 8], [0.79, 0.79, 0.80, 0.79, 0.78, 0.79], [""] * 6),
}

rows_carteira = []
for conta, (sector, simples, vol, rec, sat, recl, ns, obs) in CONTAS.items():
    for i, mes in enumerate(MESES):
        rows_carteira.append((conta, sector, mes, vol[i], simples if vol[i] is not None else None,
                              rec[i], sat[i], recl[i], ns[i], obs[i] or None))

ALERTA = [
    ("Conta 01", 22, "Baixo", "—"),
    ("Conta 02", 30, "Baixo", "—"),
    ("Conta 03", 78, "Alto", "Queda da satisfação e da receita"),
    ("Conta 04", 15, "Baixo", "—"),
    ("Conta 05", 28, "Baixo", "—"),
    ("Conta 06", 84, "Alto", "Subida das reclamações"),
    ("Conta 07", 20, "Baixo", "—"),
    ("Conta 08", 12, "Baixo", "—"),
    ("Conta 09", 18, "Baixo", "—"),
    ("Conta 10", 35, "Baixo", "Volume a descer"),
]

CASOS = [
    ("U01", "Resumo automático das chamadas para o registo no CRM", "Operações", "Gravações de chamadas (com dados de clientes)", "Não", "Não", 800, "Proposta"),
    ("U02", "Rascunho do relatório mensal de indicadores da direcção", "Operações", "Indicadores agregados", "Não", "Não", 40, "Em uso informal"),
    ("U03", "Assistente virtual no WhatsApp para clientes finais", "Comercial", "Base de conhecimento do cliente parceiro", "Não", "Sim", 1000, "Proposta"),
    ("U04", "Ranking automático dos assistentes para atribuir prémios", "Capital Humano", "Notas de qualidade e produtividade por assistente", "Sim", "Não", 60, "Piloto pedido"),
    ("U05", "Previsão de volume para fazer as escalas", "Planeamento", "Histórico de volume (agregado)", "Não", "Não", 120, "Proposta"),
    ("U06", "Rascunho de propostas comerciais", "Comercial", "Preços, custos e margens internos", "Não", "Sim", 80, "Em uso informal"),
    ("U07", "Análise do sentimento de 100% das chamadas", "Qualidade", "Transcrições com o nome e o número do cliente", "Não", "Não", 500, "Proposta"),
    ("U08", "Triagem de CV no recrutamento", "Capital Humano", "CV de candidatos", "Sim", "Não", 100, "Proposta"),
    ("U09", "Tradução de manuais de procedimento", "Academia", "Manuais internos, sem dados pessoais", "Não", "Não", 30, "Em uso informal"),
    ("U10", "Sugestão de resposta ao assistente durante a chamada", "Operações", "Conversa em curso com o cliente", "Não", "Sim (através do assistente)", 600, "Proposta"),
]

PILOTOS = [
    ("P1", "Briefing diário de turno", "Operações", 20, 18, 30, 8, 4, 5, 2, 80000, 4.3, 0, None),
    ("P2", "Resumo de reclamações escritas", "Qualidade", 10, 9, 32, 8, 20, 3, 3, 60000, 3.5, 0, "A equipa revê cada resumo frase a frase."),
    ("P3", "Respostas a e-mails de clientes parceiros", "Comercial", 6, 6, 18, 4, 3, 1, 6, 40000, 4.0, 0, "2 queixas de clientes parceiros por dados errados nas respostas."),
    ("P4", "Relatório mensal de tendências para clientes parceiros", "Gestão de contas", 8, 7, 24, 6, 4, 2, 1, 90000, 4.4, 1, "Um ficheiro com nomes de clientes foi carregado numa ferramenta não autorizada."),
    ("P5", "Perguntas aos manuais de procedimento", "Academia", 50, 9, 20, 15, 1, 4, 2, 0, 4.6, 0, "A ferramenta já está paga na licença actual."),
]

wb = Workbook()
ws = wb.active
ws.title = "LEIA-ME"
leia = [
    ("M8 · Directores, DGAs e CE · Carteira e IA (fictícios)", ""),
    (AVISO, ""),
    ("Para que serve", "Exercícios do M8 para Directores, DGAs e CE: visão global da carteira, testar um alerta de IA, governar os casos de uso e medir os pilotos."),
    ("Folha Carteira", "10 contas fictícias de clientes parceiros (Conta 01 a Conta 10), de Maio a Outubro de 2026. Receita em milhões de Kz."),
    ("Metas", "Satisfação do cliente final ≥ 4,0 · Reclamações ≤ 8 por 1 000 contactos · Nível de serviço ≥ 80%"),
    ("% contactos simples", "Contactos que um canal automático poderia resolver (saldo, 2.ª via, estado do pedido)."),
    ("Folha Alerta_painel_IA", "Resultado de um painel de risco com IA, em teste, e a recomendação de investimento que o painel gerou."),
    ("Folha Casos_de_uso_IA", "10 propostas de uso de IA que chegaram à direcção (fictícias)."),
    ("Folha Pilotos_IA", "5 pilotos de IA ao fim de 4 semanas (fictícios). Horas por semana somadas para todos os utilizadores activos."),
    ("Custo por hora", "Custo médio de uma hora de trabalho: 4 000 Kz (fictício). Um mês = 4 semanas."),
]
for r in leia:
    ws.append(r)
ws["A1"].font = Font(bold=True, size=14)
ws["A2"].font = Font(bold=True, color="9C0006")
for row in ws.iter_rows(min_row=3, max_col=1):
    for c in row:
        c.font = Font(bold=True)
for row in ws.iter_rows(min_row=3, min_col=2, max_col=2):
    for c in row:
        c.alignment = Alignment(wrap_text=True, vertical="top")
ws.column_dimensions["A"].width = 26
ws.column_dimensions["B"].width = 100

sheet(wb.create_sheet("Carteira"),
      ["Conta parceira", "Sector", "Mês", "Volume de contactos", "% contactos simples", "Receita (milhões Kz)",
       "Satisfação do cliente final (1–5)", "Reclamações por 1 000 contactos", "Nível de serviço", "Observação"],
      rows_carteira, widths=[14, 26, 11, 12, 12, 12, 14, 14, 11, 40], pct_cols=(5, 9), money_cols=(4,))

ws = wb.create_sheet("Alerta_painel_IA")
sheet(ws, ["Conta parceira", "Score de risco (0–100)", "Nível de risco", "Principal factor indicado", "Dados usados até"],
      [(c, s, n, f, "Set/2026") for c, s, n, f in ALERTA], widths=[14, 14, 12, 36, 14])
ws.append([])
ws.append(["Data do cálculo", "06/10/2026"])
ws.append(["Recomendação do painel", "Investir 45 milhões Kz num plano de retenção: 22,5 milhões para a Conta 03 e 22,5 milhões para a Conta 06."])
for r in (ws.max_row - 1, ws.max_row):
    ws.cell(row=r, column=1).font = Font(bold=True)

sheet(wb.create_sheet("Casos_de_uso_IA"),
      ["ID", "Caso de uso proposto (fictício)", "Direcção proponente", "Dados usados", "Afecta decisões sobre pessoas?",
       "O resultado chega ao cliente?", "Horas poupadas/mês (estimativa)", "Estado"],
      CASOS, widths=[6, 46, 16, 40, 14, 18, 14, 16], wrap_cols=(2, 4))

sheet(wb.create_sheet("Pilotos_IA"),
      ["Piloto", "Descrição (fictícia)", "Direcção", "Utilizadores previstos", "Utilizadores activos (semana 4)",
       "Horas/semana antes", "Horas/semana depois (sem validação)", "Horas de validação/semana", "Erros/mês antes",
       "Erros/mês depois", "Custo da ferramenta/mês (Kz)", "Satisfação dos utilizadores (1–5)", "Incidentes de dados", "Observação"],
      PILOTOS, widths=[7, 34, 16, 11, 12, 10, 12, 11, 9, 9, 13, 12, 10, 44], wrap_cols=(2, 14), money_cols=(11,))

wb.save(os.path.join(OUT, "M8_Directores_Carteira_e_IA_Ficticio.xlsx"))

# ---------- PDF: nota técnica do painel ----------
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import cm

VERM = colors.HexColor("#CB3637")
st = getSampleStyleSheet()
H1 = ParagraphStyle("h1", parent=st["Heading1"], fontSize=16, textColor=VERM)
H2 = ParagraphStyle("h2", parent=st["Heading2"], fontSize=12, textColor=colors.HexColor("#1B1A22"))
B = ParagraphStyle("b", parent=st["BodyText"], fontSize=10, leading=14)
W = ParagraphStyle("w", parent=B, textColor=colors.HexColor("#9C0006"), fontSize=9)
doc = SimpleDocTemplate(os.path.join(OUT, "M8_Directores_Nota_Tecnica_Painel_FICTICIO.pdf"), pagesize=A4,
                        leftMargin=2 * cm, rightMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm,
                        title="Nota técnica do painel de risco da carteira (fictícia)")
el = [Paragraph("Painel de risco da carteira · Nota técnica (versão de teste)", H1),
      Paragraph("DOCUMENTO FICTÍCIO PARA EXERCÍCIO · M8 IA na Liderança · Academia UCALL. Não descreve nenhuma ferramenta real.", W),
      Spacer(1, 8),
      Paragraph("1. Para que serve", H2),
      Paragraph("O painel calcula todos os meses um score de risco de 0 a 100 para cada conta parceira. "
                "Score de 75 ou mais = risco alto; de 40 a 74 = risco médio; abaixo de 40 = risco baixo. "
                "Para cada conta de risco alto, o painel recomenda um plano de retenção de 22,5 milhões Kz.", B),
      Paragraph("2. Dados usados", H2),
      Paragraph("Satisfação do cliente final, reclamações por 1 000 contactos, volume e receita, da folha Carteira. "
                "Último cálculo: 06/10/2026, com dados até Setembro de 2026. Os dados de Outubro ainda não estavam fechados.", B),
      Paragraph("3. Como se calcula o score", H2)]
t = Table([[Paragraph("<b>Indicador</b>", B), Paragraph("<b>Peso</b>", B), Paragraph("<b>O que o painel compara</b>", B)],
           [Paragraph("Satisfação do cliente final", B), Paragraph("40%", B), Paragraph("Média dos últimos 2 meses face à média dos meses anteriores", B)],
           [Paragraph("Reclamações por 1 000 contactos", B), Paragraph("40%", B), Paragraph("Média dos últimos 2 meses face à média dos meses anteriores", B)],
           [Paragraph("Volume e receita", B), Paragraph("20%", B), Paragraph("Variação dos últimos 3 meses", B)]],
          colWidths=[5.5 * cm, 2 * cm, 9.5 * cm])
t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                       ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FBEAEA")),
                       ("VALIGN", (0, 0), (-1, -1), "TOP")]))
el += [t, Paragraph("4. Limitações conhecidas", H2)]
for p in ["4.1 Um mês sem dados conta como zero reclamações, e a satisfação fica igual à do último mês com dados.",
          "4.2 O modelo não distingue um acontecimento pontual (por exemplo, uma mudança de tarifário ou o lançamento "
          "de um produto) de uma tendência. A coluna «Observação» da carteira não é lida.",
          "4.3 A taxa de acerto ainda não foi medida. O painel está em teste desde Agosto de 2026 e nenhum alerta foi "
          "comparado com o que aconteceu depois.",
          "4.4 Os pesos foram afinados com dados de apenas 4 contas."]:
    el.append(Paragraph(p, B))
el += [Paragraph("5. Como usar", H2),
       Paragraph("O score é um sinal para investigar, não uma decisão. Investimentos acima de 10 milhões Kz exigem uma análise "
                 "do gestor da conta e a aprovação da direcção.", B)]
doc.build(el)
print("ok")
