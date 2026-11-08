# Portal M8 · IA na Liderança — guia do formador

O portal corre no teu computador. Os formandos abrem-no no browser dos PCs da sala.

- **Formando** (2 ecrãs): escolhe o nome → «Estou presente» → trabalha. Vê só o passo que tu abrires.
- **Formador** (1 ecrã, `/painel`): escolhes o passo, vês presenças e entregas, dás as notas e exportas para o DTP.

| Dia | Turma | Horário | Exercícios | PPT |
|---|---|---|---|---|
| seg 9/11 | Supervisores 3 | 09h00–13h00 | Supervisores | `M8_IA_na_Lideranca_Supervisores.pptx` |
| qui 12/11 | Directores | 09h00–13h00 | Directores | `M8_IA_na_Lideranca_Directores.pptx` |
| seg 16/11 | DGAs & CE | 13h00–17h00 | Directores (iguais) | `M8_IA_na_Lideranca_DGAs_CE.pptx` |
| sex 20/11 | Supervisores 1 | 13h00–17h00 | Supervisores | `M8_IA_na_Lideranca_Supervisores.pptx`* |
| qua 25/11 | Supervisores 2 | 13h00–17h00 | Supervisores | `M8_IA_na_Lideranca_Supervisores.pptx`* |

O portal escolhe sozinho os exercícios certos pela turma. \*O PPT dos Supervisores tem a agenda das 09h00: nas turmas da tarde, diz as horas de viva voz ou pede-me uma versão das 13h00.

## 1. Preparar (uma vez)

1. Instalar o **Node.js 22.9 ou mais recente**.
2. Na pasta `portal-m8`, correr `npm install`.
3. Copiar `.env.example` para `.env` e preencher:
   - `ANTHROPIC_API_KEY`: a chave da API (com aprovação da DSI).
   - `FORMADOR_PIN`: o teu PIN do painel. Se ficar vazio, o portal cria um PIN novo a cada arranque e mostra-o na janela.
   - `MODELO`: deixar `claude-opus-5-5`. Para gastar menos, usar `claude-sonnet-5-5`.
   - `GOCONTACT_API_KEY` (só Supervisores): a chave da API da GoContact da operação TAAG, para o passo «Ao vivo». Sem ela, a página ao vivo abre com dados de exemplo (e diz isso no ecrã).

## 2. Ensaiar (antes de segunda)

1. Correr `npm run demo`. O chat dá respostas fixas, sem IA e sem custos.
2. Abrir `http://localhost:3000/painel`, entrar com o PIN e escolher **Turma de teste · Supervisores** (ou **· Directores**, para ensaiar os exercícios dos Directores e DGAs).
3. Noutro separador, abrir `http://localhost:3000`, escolher um nome e fazer o Ex. 1.
4. No fim do ensaio, carregar em **«Apagar dados de teste»** e escolher a turma do dia.

## 3. No dia

1. Correr `npm start`. A janela mostra:
   - **Nos PCs da sala:** `http://10.x.x.x:3000` → abrir este endereço em todos os PCs (também aparece no painel).
   - **Painel do formador:** `http://localhost:3000/painel`.
2. Se o Windows perguntar pela firewall, **permitir em rede privada**. Sem isto, os PCs não chegam ao portal.
3. No painel, confirmar que a turma é a do dia (o portal escolhe-a sozinho pela data).
4. Durante a sessão, carregar nos passos: **Início → Ex. 1 → Ex. 2 → Ex. 3 → Pausa → Ex. 4 → Compromisso** (nos Supervisores há **Ao vivo** antes do Compromisso). Os PCs mudam sozinhos em poucos segundos.

### O passo «Ao vivo» (Supervisores)

1. No painel, carregar em **Ao vivo**. Os formandos escrevem no chat o que querem ver no ecrã (ou usam o exemplo).
2. A IA «monta a página» em cerca de 10 segundos, com os números verdadeiros da GoContact (agentes, filas, pausas). A montagem é uma encenação; os números não.
3. Aparece o botão **«Abrir a página»**: filas de hoje (TMA, TME, SLA 20 s, abandono), agentes agora (nome, estado, fila, tempo no estado, pausas e limites) e um chat para perguntar sobre a operação. Actualiza sozinha a cada 15 segundos.
4. Para projectar, no painel: **«Abrir a página ao vivo (para projectar)»**.
5. As perguntas no chat enviam à IA os nomes e estados dos agentes nesse momento. Os limites das pausas vêm da GoContact; as metas da operação não, e a IA diz isso.

## 4. Avaliação (igual ao DTP)

| Critério | Como se calcula |
|---|---|
| **Assiduidade** (1–4) | 1 ponto base, mais 1 por cada: entrou até 10 min depois do início; voltou da pausa até 5 min depois do fim da pausa; saiu nos últimos 15 min ou mais tarde. |
| **Participação** (1–4) | Pelas entregas (Ex. 1 a 4 + compromisso): 5 → 4 · 4 → 3 · 2 ou 3 → 2 · 0 ou 1 → 1. |
| **Assertividade** (1–4) | Dás tu, no painel. |

- **Nota % = média × 25.** Aprovado com **75% ou mais**.
- Podes corrigir qualquer nota ou hora em **«Ver»**.
- **«Exportar para o DTP»** dá um Excel com as fórmulas.

## 5. Se algo falhar

- **A IA não responde** (internet ou chave): fechar a janela e arrancar com `npm run demo`. A sessão continua com respostas fixas.
- **Formando escolheu o nome errado:** carrega em «Não sou eu», no canto de cima.
- **Hora mal registada:** corrigir em «Ver», no painel.

## 6. Privacidade

- O portal bloqueia mensagens com e-mail, telefone, NIF ou IBAN, e anexos com colunas de dados pessoais. As tentativas ficam em «Ver».
- Presenças, conversas e entregas ficam em `portal-m8/data/`. **Apagar esta pasta depois de exportar para o DTP.**
- Usar só os ficheiros fictícios da formação.

## Onde está cada coisa

- **PPT:** na pasta `materiais/` (um por nível; ver a tabela no início).
- **Ficheiros dos exercícios:** `materiais/ficheiros_exercicios/` (os mesmos que os formandos abrem no portal).
- **Textos dos exercícios:** `portal-m8/public/conteudos-supervisores.js` e `conteudos-directores.js` (os PPT usam os mesmos textos).
- **Turmas, datas e horas:** `portal-m8/config/turmas.json`. Tem os nomes reais e não vai para o GitHub. Sem ele, o portal abre só com as turmas de teste (`config/turmas.exemplo.json`).

## 7. Online (servidor com Docker)

- `docker compose up -d --build` arranca o portal na porta 3000 e volta a arrancar sozinho se o servidor reiniciar.
- O `.env` do servidor é igual ao daqui, mais `SENHA_SALA`: o portal abre com o ecrã «Palavra-passe da sala» (cada PC escreve-a uma vez; fica 30 dias). O painel continua só com o PIN. Sem `SENHA_SALA`, qualquer pessoa com o endereço entra.
- `config/turmas.json` (os nomes) copia-se à parte para o servidor; `data/` guarda presenças, conversas e entregas.
- Actualizar: `git pull` e outra vez `docker compose up -d --build`.
