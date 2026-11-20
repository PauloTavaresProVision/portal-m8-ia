// Conteúdos do M8 · IA na Liderança · Supervisores.
// O dia-a-dia do supervisor: ler os relatórios da GoContact, dar alertas e decidir sobre pessoas.
// No fim, a operação ao vivo. (O antigo Ex. 4, «O pedido de todas as manhãs», saiu por falta de tempo.)
// Cada passo tem o seu botão no ecrã: juntar o ficheiro, ver o exemplo, abrir o Excel.
window.CONTEUDOS_NIVEIS = window.CONTEUDOS_NIVEIS || {};
window.CONTEUDOS_NIVEIS.supervisores = {
  nivel: "supervisores",
  publico: "supervisores de contact center",
  ficheiros: {
    hora: { nome: "Chamadas por hora · sexta 06/11", botao: "Abrir o Excel", juntar: "Juntar o relatório", ficheiro: "M8_Sup_1_Chamadas_por_hora.xlsx" },
    pausas: { nome: "Logins e pausas · sexta 06/11", botao: "Abrir o Excel", juntar: "Juntar o relatório", ficheiro: "M8_Sup_2_Logins_e_pausas.xlsx" },
    agentes: { nome: "Indicadores por agente · semana 02–06/11", botao: "Abrir o Excel", juntar: "Juntar os indicadores", ficheiro: "M8_Sup_3_Indicadores_por_agente.xlsx" },
  },

  // Ordem da sessão. "exercicio" conta para a avaliação (entrega).
  passos: [
    {
      id: "inicio", tipo: "info", etiqueta: "Início", titulo: "Bem-vindo/a",
      texto: "Hoje a IA faz contigo o que fazes todos os dias: ler os relatórios da GoContact, dar alertas e preparar decisões. No fim, liga-se à operação TAAG ao vivo.",
      passos: [
        "Ouve o formador: ele diz quando começa cada exercício.",
        "Em cada exercício escreves tu o pedido. Se ficares parado, há um exemplo.",
        "Os ficheiros são fictícios, no formato da GoContact. Confere sempre o que a IA diz.",
      ],
    },
    {
      id: "ex1", tipo: "exercicio", n: 1, etiqueta: "Ex. 1", bloco: "Relatório", titulo: "O relatório do dia",
      texto: "Sexta-feira (06/11) o SLA falhou. O teu coordenador quer saber o que aconteceu. Tens o relatório de chamadas por hora da GoContact.",
      diferenca: "Todos os dias fazes isto à mão no Excel. Aqui a IA lê o relatório, faz as contas e escreve o e-mail. Tu confirmas.",
      passos: [
        { texto: "Junta o relatório e pede à IA como correu o dia: o SLA, as horas abaixo da meta e porquê.", juntar: "hora", exemplo: 0 },
        { texto: "Confere no Excel: faz a média da coluna «SLA 20 s». Dá o mesmo que a IA? Qual está certo?", abrir: "hora" },
        { texto: "Pede o e-mail de 5 linhas para o coordenador.", exemplo: 1 },
      ],
      pedidos: [
        { texto: "Sou supervisor numa operação com as filas Informações e Reservas. Em anexo está o relatório de chamadas por hora de sexta-feira, 06/11, tirado da GoContact; as metas estão na folha LEIA-ME. Diz-me o SLA 20 s e o abandono do dia, por fila e no total, e mostra a conta. Depois diz-me em que horas falhámos a meta e o que explica essas horas. Responde curto, com uma tabela.", anexar: ["hora"] },
        { texto: "Escreve o e-mail para o meu coordenador, no máximo 5 linhas: como correu o dia, onde falhámos, a causa e o que proponho para segunda-feira." },
      ],
      abrir: ["hora"],
      entrega: "Cola aqui o e-mail para o coordenador.",
    },
    {
      id: "ex2", tipo: "exercicio", n: 2, etiqueta: "Ex. 2", bloco: "Alertas", titulo: "Os alertas das pausas",
      texto: "Todos os dias controlas logins e pausas. Dá à IA o relatório de sexta e as regras das pausas, e pede-lhe os alertas.",
      diferenca: "À mão vês um agente de cada vez. A IA cruza todos com as regras e vê o que ninguém vê: quantos estavam em pausa ao mesmo tempo.",
      passos: [
        { texto: "Junta o relatório e pede a lista de alertas: quem não cumpriu as regras, em quê e por quantos minutos.", juntar: "pausas", exemplo: 0 },
        { texto: "Procura na resposta: quantos agentes estiveram em Intervalo ao mesmo tempo? Lembra-te do Ex. 1: o que aconteceu ao SLA a essa hora?", abrir: "pausas" },
        { texto: "Pede o plano dos intervalos para segunda-feira, dentro das regras.", exemplo: 1 },
      ],
      pedidos: [
        { texto: "Em anexo estão os logins e as pausas dos agentes de sexta-feira, 06/11, e as regras das pausas (folha Regras_pausas). Faz-me a lista de alertas: atrasos no login, saídas antes da hora, pausas acima do máximo, fora da janela, pausas a mais no turno e mais agentes em pausa ao mesmo tempo do que o permitido. Uma tabela: agente, alerta, quanto passou, hora. Do mais grave para o menos grave.", anexar: ["pausas"] },
        { texto: "Faz o plano dos intervalos de segunda-feira para os dois turnos, a cumprir as regras: começar dentro da janela, 45 minutos e no máximo 3 agentes ao mesmo tempo. Uma tabela: início, fim e agentes." },
      ],
      abrir: ["pausas"],
      entrega: "Os 3 alertas mais graves e o plano dos intervalos.",
    },
    {
      id: "ex3", tipo: "exercicio", n: 3, etiqueta: "Ex. 3", bloco: "Pessoas", titulo: "O melhor agente que não é",
      texto: "Esta semana só tens tempo para fazer escuta a 3 agentes. Tens os indicadores da semana por agente. A quem fazes escuta?",
      diferenca: "Quem olha só para o TMA e as chamadas atendidas escolhe mal. A IA lê as colunas todas de uma vez e mostra o que um número sozinho esconde.",
      passos: [
        { texto: "Junta os indicadores e pede o ranking dos agentes e quem precisa de atenção, a olhar para todas as colunas.", juntar: "agentes", exemplo: 0 },
        { texto: "Confere o 40104 no Excel: é o que mais atende e tem o TMA mais baixo. É mesmo o melhor? O que diz a IA?", abrir: "agentes" },
        { texto: "Pede para separar formação de comportamento e escolhe os 3 a quem fazes escuta.", exemplo: 1 },
      ],
      pedidos: [
        { texto: "Em anexo estão os indicadores por agente da semana de 02 a 06/11, tirados da GoContact. Faz o ranking dos 14 agentes e diz-me quem precisa de atenção. Olha para todas as colunas, não só para o TMA e as chamadas atendidas, e compara com a referência da equipa (folha LEIA-ME). Tabela curta: agente, o que se vê, porque preocupa.", anexar: ["agentes"] },
        { texto: "Para os agentes que precisam de atenção, separa: é falta de formação ou é comportamento? Tem em conta quem está em integração. Escolhe 3 para eu fazer escuta, por ordem, e diz-me o que devo ouvir nas chamadas de cada um." },
      ],
      abrir: ["agentes"],
      entrega: "Os 3 agentes, o que vais ouvir na escuta de cada um e quem ouves primeiro.",
    },
    {
      id: "pausa", tipo: "pausa", etiqueta: "Pausa", titulo: "Pausa",
      texto: "Quando voltares, carrega em «Voltei da pausa».",
    },
    {
      id: "aovivo", tipo: "aovivo", etiqueta: "Ao vivo", titulo: "A operação TAAG agora",
      texto: "Até aqui deste ficheiros à IA. E se ela fosse buscar os dados sozinha à GoContact, em tempo real?",
      passos: [
        { texto: "Escreve no chat o que gostavas de ver no teu ecrã durante o turno.", exemplo: 0 },
        { texto: "Vê a IA a ligar-se à GoContact e a montar a página." },
        { texto: "Abre a página e pergunta à IA o que precisas de saber agora.", pagina: true },
      ],
      pedidos: [
        { texto: "Liga-te à GoContact da operação TAAG e faz-me uma página em tempo real com as chamadas por fila, o TMA e o TME, os agentes e o estado de cada um, as pausas e os tempos de pausa. Junta um chat para eu fazer perguntas sobre a operação." },
      ],
    },
    {
      id: "compromisso", tipo: "compromisso", etiqueta: "Compromisso", titulo: "O meu compromisso",
      texto: "Uma acção concreta para aplicar na tua equipa nas próximas 4 semanas.",
      campos: [
        { id: "oque", rotulo: "O que vou fazer", exemplo: "Todas as manhãs, antes da reunião de turno, pedir à IA o SLA por hora e os alertas das pausas do dia anterior, a partir dos relatórios da GoContact." },
        { id: "quando", rotulo: "Até quando", exemplo: "Todos os dias úteis, durante as próximas 4 semanas." },
        { id: "evidencia", rotulo: "Como vou mostrar que fiz", exemplo: "Guardo a resposta da IA de cada manhã e marco o que confirmei no Excel e o que decidi." },
      ],
      formulario: "https://forms.gle/nMrGweqo5fLYvbiRA",
    },
  ],

  // Versões por perfil: o formando com este perfil vê estes textos e ficheiros no lugar dos de contact center.
  // «limpeza»: supervisores de limpeza da Direcção de Logística e Património (categoria com «LIMPEZA»).
  // Mesmos exercícios, mesmas lições e mesmo tempo: o debrief é comum a toda a turma.
  perfis: {
    limpeza: {
      ficheiros: {
        lplano: { nome: "Plano de limpeza por hora · sexta 06/11", botao: "Abrir o Excel", juntar: "Juntar o relatório", ficheiro: "M8_Sup_L1_Plano_de_limpeza_por_hora.xlsx" },
        lpausas: { nome: "Picagens e pausas · sexta 06/11", botao: "Abrir o Excel", juntar: "Juntar o relatório", ficheiro: "M8_Sup_L2_Picagens_e_pausas.xlsx" },
        lcolab: { nome: "Indicadores por colaborador · semana 02–06/11", botao: "Abrir o Excel", juntar: "Juntar os indicadores", ficheiro: "M8_Sup_L3_Indicadores_por_colaborador.xlsx" },
      },
      passos: {
        inicio: {
          texto: "Hoje a IA faz contigo o que fazes todos os dias na equipa de limpeza: ler os relatórios, dar alertas e preparar decisões. Os exercícios são os mesmos da turma, com os dados da tua área. No fim, vês com o grupo a operação TAAG ao vivo.",
          passos: [
            "Ouve o formador: ele diz quando começa cada exercício.",
            "Em cada exercício escreves tu o pedido. Se ficares parado, há um exemplo.",
            "Os ficheiros são fictícios, de uma equipa de limpeza. Confere sempre o que a IA diz.",
          ],
        },
        ex1: {
          texto: "Sexta-feira (06/11) o plano de limpeza ficou abaixo da meta. O teu chefe quer saber o que aconteceu. Tens o relatório do plano de limpeza por hora.",
          diferenca: "Todos os dias fazes estas contas à mão. Aqui a IA lê o relatório, faz as contas e escreve o e-mail. Tu confirmas.",
          passos: [
            { texto: "Junta o relatório e pede à IA como correu o dia: as tarefas feitas a horas, as horas abaixo da meta e porquê.", juntar: "lplano", exemplo: 0 },
            { texto: "Confere no Excel: faz a média da coluna «% a horas». Dá o mesmo que a IA? Qual está certo?", abrir: "lplano" },
            { texto: "Pede o e-mail de 5 linhas para o teu chefe.", exemplo: 1 },
          ],
          pedidos: [
            { texto: "Sou supervisor da equipa de limpeza de um edifício de escritórios, com as zonas Escritórios e Instalações sanitárias. Em anexo está o relatório do plano de limpeza por hora de sexta-feira, 06/11; as metas estão na folha LEIA-ME. Diz-me a % de tarefas feitas a horas e a % de tarefas não feitas no dia, por zona e no total, e mostra a conta. Depois diz-me em que horas falhámos a meta e o que explica essas horas. Responde curto, com uma tabela.", anexar: ["lplano"] },
            { texto: "Escreve o e-mail para o meu chefe, na Direcção de Logística e Património, no máximo 5 linhas: como correu o dia, onde falhámos, a causa e o que proponho para segunda-feira." },
          ],
          abrir: ["lplano"],
          entrega: "Cola aqui o e-mail para o teu chefe.",
        },
        ex2: {
          texto: "Todos os dias controlas as picagens e as pausas da equipa. Dá à IA o relatório de sexta e as regras das pausas, e pede-lhe os alertas.",
          diferenca: "À mão vês um colaborador de cada vez. A IA cruza todos com as regras e vê o que ninguém vê: quantos estavam em pausa ao mesmo tempo.",
          passos: [
            { texto: "Junta o relatório e pede a lista de alertas: quem não cumpriu as regras, em quê e por quantos minutos.", juntar: "lpausas", exemplo: 0 },
            { texto: "Procura na resposta: quantos colaboradores estiveram em Intervalo ao mesmo tempo? Lembra-te do Ex. 1: o que aconteceu ao plano a essa hora?", abrir: "lpausas" },
            { texto: "Pede o plano dos intervalos para segunda-feira, dentro das regras.", exemplo: 1 },
          ],
          pedidos: [
            { texto: "Em anexo estão as picagens e as pausas da equipa de limpeza de sexta-feira, 06/11, e as regras das pausas (folha Regras_pausas). Faz-me a lista de alertas: atrasos na entrada, saídas antes da hora, pausas acima do máximo, fora da janela, pausas a mais no turno e mais colaboradores em pausa ao mesmo tempo do que o permitido. Uma tabela: colaborador, alerta, quanto passou, hora. Do mais grave para o menos grave.", anexar: ["lpausas"] },
            { texto: "Faz o plano dos intervalos de segunda-feira para os dois turnos, a cumprir as regras: começar dentro da janela, 45 minutos e no máximo 2 colaboradores ao mesmo tempo. Uma tabela: início, fim e colaboradores." },
          ],
          abrir: ["lpausas"],
          entrega: "Os 3 alertas mais graves e o plano dos intervalos.",
        },
        ex3: {
          titulo: "O melhor colaborador que não é",
          texto: "Esta semana só tens tempo para acompanhar de perto 3 colaboradores na ronda. Tens os indicadores da semana por colaborador. Quem acompanhas?",
          diferenca: "Quem olha só para as tarefas feitas e o tempo por tarefa escolhe mal. A IA lê as colunas todas de uma vez e mostra o que um número sozinho esconde.",
          passos: [
            { texto: "Junta os indicadores e pede o ranking dos colaboradores e quem precisa de atenção, a olhar para todas as colunas.", juntar: "lcolab", exemplo: 0 },
            { texto: "Confere o 50105 no Excel: é o que faz mais tarefas e o mais rápido. É mesmo o melhor? O que diz a IA?", abrir: "lcolab" },
            { texto: "Pede para separar formação de comportamento e escolhe os 3 que vais acompanhar.", exemplo: 1 },
          ],
          pedidos: [
            { texto: "Em anexo estão os indicadores por colaborador da equipa de limpeza, semana de 02 a 06/11. Faz o ranking dos 9 colaboradores e diz-me quem precisa de atenção. Olha para todas as colunas, não só para as tarefas feitas e o tempo por tarefa, e compara com a referência da equipa (folha LEIA-ME). Tabela curta: colaborador, o que se vê, porque preocupa.", anexar: ["lcolab"] },
            { texto: "Para os colaboradores que precisam de atenção, separa: é falta de formação ou é comportamento? Tem em conta quem está em integração. Escolhe 3 para eu acompanhar na ronda, por ordem, e diz-me o que devo verificar com cada um." },
          ],
          abrir: ["lcolab"],
          entrega: "Os 3 colaboradores, o que vais verificar com cada um e quem acompanhas primeiro.",
        },
        aovivo: {
          texto: "Até aqui deste ficheiros à IA. Agora vê com o grupo a IA a ir buscar os dados sozinha à GoContact da operação TAAG. Imagina o mesmo para a tua equipa: as picagens, as pausas e as tarefas em tempo real.",
        },
        compromisso: {
          campos: [
            { id: "oque", rotulo: "O que vou fazer", exemplo: "Todas as manhãs, antes de distribuir as zonas, pedir à IA o cumprimento do plano por hora e os alertas das picagens e pausas do dia anterior." },
            { id: "quando", rotulo: "Até quando", exemplo: "Todos os dias úteis, durante as próximas 4 semanas." },
            { id: "evidencia", rotulo: "Como vou mostrar que fiz", exemplo: "Guardo a resposta da IA de cada manhã e marco o que confirmei no Excel e o que decidi." },
          ],
        },
      },
    },
  },
};
