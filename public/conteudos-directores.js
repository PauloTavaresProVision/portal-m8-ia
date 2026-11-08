// Conteúdos do M8 · IA na Liderança · Directores, DGAs e CE (versão simples).
// As três ideias do nível: decidir com dados → governar o risco → medir o impacto.
// O formador escolhe no painel o passo que todos vêem; o formando só vê esse passo.
window.CONTEUDOS_NIVEIS = window.CONTEUDOS_NIVEIS || {};
window.CONTEUDOS_NIVEIS.directores = {
  nivel: "directores",
  publico: "directores, DGAs e membros da Comissão Executiva",
  ficheiros: {
    carteira: { nome: "Excel da carteira e da IA", botao: "Abrir o Excel", ficheiro: "M8_Directores_Carteira_e_IA_Ficticio.xlsx" },
    nota: { nome: "Nota técnica do painel de risco", botao: "Abrir a nota técnica (PDF)", ficheiro: "M8_Directores_Nota_Tecnica_Painel_FICTICIO.pdf" },
  },

  // Ordem da sessão. "exercicio" conta para a avaliação (entrega).
  passos: [
    {
      id: "inicio", tipo: "info", etiqueta: "Início", titulo: "Bem-vindo/a",
      texto: "Já estás presente. Hoje vamos usar a IA em três passos: decidir com dados, governar o risco e medir o impacto.",
      passos: [
        "Ouve o formador: ele diz quando começa cada exercício.",
        "Enquanto esperas, experimenta o chat: pede à IA os 3 melhores argumentos contra uma decisão que tomaste este mês.",
        "Usa só os ficheiros da formação. Nunca dados reais de clientes ou de colaboradores.",
      ],
    },
    {
      id: "ex1", tipo: "exercicio", n: 1, etiqueta: "Ex. 1", bloco: "Decidir", titulo: "Ver a carteira toda",
      texto: "A IA lê a carteira de 10 contas (6 meses) e prepara a visão global para a reunião de direcção.",
      passos: [
        "Carrega em «Preparar pedido 1». O Excel e o pedido vão para o chat. Carrega em Enviar.",
        "Confere 2 números da resposta no Excel (botão «Abrir o Excel»). Batem certo? Faltam dados de alguma conta?",
        "Carrega em «Preparar pedido 2», envia, e entrega o resumo aqui em baixo.",
      ],
      pedidos: [
        { texto: "Sou director numa empresa de contact center. Em anexo está a carteira de 10 contas de clientes parceiros, de Maio a Outubro de 2026. As metas estão na folha LEIA-ME. Na folha Carteira, diz-me que contas estão a melhorar, quais estão a piorar e quais estão estáveis, em receita, satisfação e reclamações. Responde numa tabela, uma linha por conta, e diz se faltam dados.", anexar: ["carteira"] },
        { texto: "Com base nisto, escreve o resumo para a reunião de direcção: 3 tendências, 1 risco e 1 oportunidade, no máximo 120 palavras. Diz também que contas têm mais contactos simples e o que isso significa para o nosso negócio." },
      ],
      abrir: ["carteira"],
      entrega: "Cola aqui o resumo para a reunião de direcção.",
    },
    {
      id: "ex2", tipo: "exercicio", n: 2, etiqueta: "Ex. 2", bloco: "Decidir", titulo: "Testar o alerta antes de investir",
      texto: "Um painel com IA diz que 2 contas estão em risco e recomenda investir 45 milhões Kz. Antes de decidir, testa o alerta.",
      passos: [
        "Carrega em «Preparar pedido 1» e envia.",
        "Carrega em «Preparar pedido 2» (junta a nota técnica do painel) e envia. O que tem de ser verdade nos dados para confiares?",
        "Decide: investir, investigar ou esperar? Qual é o impacto no cliente? Entrega o memorando.",
      ],
      pedidos: [
        { texto: "A folha Alerta_painel_IA mostra o alerta de um painel de IA e a recomendação de investimento. Compara o alerta com os dados da folha Carteira, conta a conta. Os dados sustentam o alerta? Até que mês vão os dados que o painel usou? Há meses em falta? Depois dá-me os 3 melhores argumentos contra investir já.", anexar: ["carteira"] },
        { texto: "Em anexo está a nota técnica do painel. Com base apenas neste documento, que limitações tem o modelo? Indica a secção de cada uma. Alguma delas muda a leitura do alerta?", anexar: ["nota"] },
      ],
      abrir: ["carteira", "nota"],
      entrega: "O teu memorando em 3 linhas: investir, investigar ou esperar; porquê; e o impacto no cliente.",
    },
    {
      id: "ex3", tipo: "exercicio", n: 3, etiqueta: "Ex. 3", bloco: "Governar", titulo: "Classificar o risco",
      texto: "Chegaram à direcção 10 propostas de uso de IA. Classifica o risco de cada uma e decide quem aprova.",
      passos: [
        "Carrega em «Preparar pedido 1» e envia.",
        "Escolhe 3 classificações da IA e desafia-as: concordas? Porquê? Quais já estão em uso informal?",
        "Carrega em «Preparar pedido 2» e envia. Escolhe o caso com maior dilema ético: é justo para quem é afectado?",
      ],
      pedidos: [
        { texto: "A folha Casos_de_uso_IA lista 10 propostas de uso de IA num contact center. Classifica cada uma em risco baixo, médio ou alto, com 3 critérios: o tipo de dados, se afecta decisões sobre pessoas e se o resultado chega ao cliente. Justifica numa linha e propõe o controlo mínimo. Não decidas a aprovação: isso é nosso.", anexar: ["carteira"] },
        { texto: "Põe numa tabela os casos de risco alto: caso, porquê, regra, quem aprova e o indicador a seguir. Assinala os que já estão em uso informal." },
      ],
      abrir: ["carteira"],
      entrega: "Os teus 3 casos de risco alto (regra e quem aprova) e o dilema ético que escolheste.",
    },
    {
      id: "pausa", tipo: "pausa", etiqueta: "Pausa", titulo: "Pausa",
      texto: "Quando voltares, carrega em «Voltei da pausa».",
    },
    {
      id: "ex4", tipo: "exercicio", n: 4, etiqueta: "Ex. 4", bloco: "Medir", titulo: "Escalar, ajustar ou parar",
      texto: "5 pilotos de IA terminaram o primeiro mês. Mede o impacto e decide o que fazer com cada um.",
      passos: [
        "Carrega em «Preparar pedido 1» e envia.",
        "Confere no Excel: as horas poupadas descontam o tempo de validação? Algum piloto aumentou os erros ou teve incidentes?",
        "Decide para cada piloto: escalar, ajustar ou parar. Depois carrega em «Preparar pedido 2» para o painel da tua direcção.",
      ],
      pedidos: [
        { texto: "A folha Pilotos_IA tem 5 pilotos de IA. Calcula para cada um: horas poupadas por semana já descontado o tempo de validação (antes − depois − validação), variação dos erros, valor mensal das horas poupadas (custo por hora na folha LEIA-ME, 4 semanas por mês) face ao custo da ferramenta, e taxa de adopção. Mostra as contas numa tabela. Não recomendes decisões: apresenta só os números e o que falta saber.", anexar: ["carteira"] },
        { texto: "Propõe o painel de impacto da IA para a minha direcção: 4 a 6 indicadores (produtividade, qualidade, custos, tempo poupado, adopção e risco), com a fonte de cada um e de quanto em quanto tempo o revemos." },
      ],
      abrir: ["carteira"],
      entrega: "A tua decisão para cada piloto (escalar, ajustar ou parar) e porquê, uma linha por piloto.",
    },
    {
      id: "compromisso", tipo: "compromisso", etiqueta: "Compromisso", titulo: "O meu compromisso",
      texto: "Uma acção concreta para aplicar na tua direcção nas próximas semanas.",
      campos: [
        { id: "oque", rotulo: "O que vou fazer", exemplo: "Definir com a DSI as regras e os indicadores de impacto da IA da minha direcção e revê-los todos os meses." },
        { id: "quando", rotulo: "Até quando", exemplo: "Regras e painel em 30 dias; 2 revisões mensais em 2 meses." },
        { id: "evidencia", rotulo: "Como vou mostrar que fiz", exemplo: "Regras aprovadas, painel com linha de base e a acta de 2 revisões com decisões." },
      ],
      formulario: "https://forms.gle/nMrGweqo5fLYvbiRA",
    },
  ],
};
