# Gera config/turmas.json a partir do DTP (Dossier Técnico-Pedagógico).
# Uso: python scripts/gerar_turmas.py "<caminho do DTP.xlsx>" config/turmas.json
import sys, json, random
sys.stdout.reconfigure(encoding="utf-8")
import openpyxl

dtp, out = sys.argv[1], sys.argv[2]
wb = openpyxl.load_workbook(dtp, data_only=True)


def pessoas(folha, grupo=None):
    ws = wb[folha]
    res = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        nome, cat, proj, grp = row[1], row[2], row[3], row[4]
        if not nome or not str(nome).strip():
            continue
        if grupo is not None and grp != grupo:
            continue
        res.append({"nome": str(nome).strip(), "categoria": (cat or "").strip(), "projecto": (proj or "").strip(), "grupo": grp})
    return res


rnd = random.Random(2026)


def turma(id_, nome, folha, grupo, data, inicio, pausa_ini, pausa_fim, fim, nivel):
    ps = pessoas(folha, grupo)
    for i, p in enumerate(ps, 1):
        p["id"] = f"{id_}-{i:02d}"
    return {"id": id_, "nome": nome, "folhaDTP": folha, "data": data, "inicio": inicio, "pausaInicio": pausa_ini,
            "pausaFim": pausa_fim, "fim": fim, "sala": "Kinshassa (Vilage)", "nivel": nivel,
            "codigo": f"{rnd.randint(1000, 9999)}", "participantes": ps}


turmas = [
    turma("sup3", "Supervisores 3", "Supervisores", 3, "2026-11-09", "09:00", "11:25", "11:45", "13:00", "supervisores"),
    turma("dir", "Directores", "Directores", None, "2026-11-12", "09:00", "11:25", "11:45", "13:00", "directores"),
    turma("dgas", "DGAs & CE", "DGAs & CE", None, "2026-11-16", "13:00", "15:25", "15:45", "17:00", "directores"),
    turma("sup1", "Supervisores 1", "Supervisores", 1, "2026-11-20", "13:00", "15:25", "15:45", "17:00", "supervisores"),
    turma("sup2", "Supervisores 2", "Supervisores", 2, "2026-11-25", "13:00", "15:25", "15:45", "17:00", "supervisores"),
]
# Turmas de teste (uma por nível), para ensaiar no painel sem mexer nas turmas reais.
def teste(id_, nome, folha, data, nivel, rotulo, categoria):
    return {"id": id_, "nome": nome, "folhaDTP": folha, "data": data, "inicio": "09:00",
            "pausaInicio": "11:25", "pausaFim": "11:45", "fim": "13:00", "sala": "Ensaio", "nivel": nivel, "codigo": "0000",
            "participantes": [{"id": f"{id_}-{i:02d}", "nome": f"{rotulo} de teste {i}", "categoria": categoria,
                               "projecto": "DN", "grupo": 0} for i in range(1, 5)]}


turmas.append(teste("teste", "Turma de teste · Supervisores", "Supervisores", "2026-11-09", "supervisores", "Formando", "SUPERVISOR OPERACIONAL"))
turmas.append(teste("teste-dir", "Turma de teste · Directores", "Directores", "2026-11-12", "directores", "Director", "DIRECTOR"))
with open(out, "w", encoding="utf-8") as f:
    json.dump({"turmas": turmas}, f, ensure_ascii=False, indent=2)
for t in turmas:
    print(t["id"], t["nome"], t["data"], "codigo", t["codigo"], "n=", len(t["participantes"]))
