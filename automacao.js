// Variáveis de configuração
// 1. Substitua 'SUA_CHAVE_AQUI' pela sua chave da Gemini API.
const GEMINI_API_KEY = "SUA_CHAVE_AQUI"; // Sua chave atual

// 2. Substitua "NOME_DA_ABA_DAS_RESPOSTAS" pelo nome exato da aba (na parte inferior da Planilha Google) onde as respostas do Forms são salvas.
const SHEET_NAME = "NOME_DA_ABA_DAS_RESPOSTAS";

// 3. Substitua 'SEU_ID_DA_PASTA_AQUI' pelo ID da pasta no Google Drive que contém os arquivos que serão anexados.
const DRIVE_FOLDER_ID = "SEU_ID_DA_PASTA_AQUI";

// Configurações das perguntas e colunas:
// As perguntas começam em values[2] (Coluna C).
const START_QUESTION_INDEX = 2;
// Número total de perguntas objetivas do formulário que serão analisadas pela IA.
const QUESTION_COUNT = 15;

// O resultado será inserido nas colunas 30 (Coluna AD) e 31 (Coluna AE).
const START_RESULT_COLUMN = 30;

/**
 * Esta função é o GATILHO que será executado automaticamente
 * Toda vez que uma nova resposta for enviada ao Forms.
 * @param {object} e O objeto do evento de envio do formulário.
 */
function onFormSubmitTrigger(e) {

  // Obtém a planilha e a aba das respostas
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  // Pega o número da linha recém-adicionada
  const newRow = e.range.getRow();
  // Pega todos os valores da nova linha
  const values = e.values;

  // Coleta todas as 15 respostas de forma dinâmica
  let allData = "";
  for (let i = 0; i < QUESTION_COUNT; i++) {
    const questionNumber = i + 1;
    const answerIndex = START_QUESTION_INDEX + i;
    const answer = values[answerIndex];

    // Concatena a pergunta e a resposta. Ex: "Pergunta 1: Resposta A), Pergunta 2: Resposta B), ..."
    if (answer) {
      allData += `Pergunta ${questionNumber}: ${answer}, `;
    }
  }

  // Remove a vírgula e o espaço sobrantes no final da lista de respostas
  allData = allData.trim().slice(0, -1);

  // Coleta o nome e a resposta discursiva, ambos usados para personalizar o resultado (values[25] é coluna Z e values[26] é coluna AA)
  const nome = values[25];
  const respostaPersonalizada = values[26];

  if (allData.length > 0) {
    const analysisResult = analyzeWithGemini(allData, nome, respostaPersonalizada);
    const classification = analysisResult.classification; // Para usar no nome do arquivo
    // Pega o e-mail do respondente (values[1] é a Coluna B)
    const recipientEmail = values[1];


    // Lógica para encontrar e anexar o arquivo do Google Drive
    const attachments = [];

    try {
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

      // Assume que o arquivo PDF tem o mesmo nome da classificação, seguido de ".pdf"
      const fileNameToSearch = `${classification}.pdf`;
      const files = folder.getFilesByName(fileNameToSearch);

      if (files.hasNext()) {
        const attachmentFile = files.next();
        attachments.push(attachmentFile.getBlob());
        Logger.log(`Arquivo anexado: ${attachmentFile.getName()}`);
      } else {
        // Se não encontrar o arquivo, envia o e-mail sem anexo, mas registra o problema
        Logger.log(`Aviso: Arquivo "${fileNameToSearch}" não encontrado na pasta.`);
      }
    } catch (e) {
      Logger.log("Erro ao buscar arquivo no Drive: " + e.toString());
    }

    // Monta o corpo do e-mail em HTML para permitir formatação (justificado e negrito)
    const subject = "Análise Personalizada do Seu Formulário 'Carreiras em TI'";

    const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; text-align: justify; padding: 0 10px;">
        <p>Olá, ${nome}! Obrigado por preencher o formulário.</p>

        <p>Aqui está a sua análise Personalizada:</p>

        <p><strong>Classificação do Perfil:</strong> ${analysisResult.classification}</p>
        
        <p><strong>Análise:</strong> ${analysisResult.comment}</p>

        <p>Confira a Cartilha 'Guia Rápido de Carreira Tech' em anexo para saber mais sobre sua área de afinidade.</p>

        <p>Atenciosamente,</p>

        <p>Empregabilidade e Carreira Módulo 3</p>
        <p>ADS SENAC</p>
    </div>
  `;

    // Envia o e-mail usando a opção htmlBody
    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      htmlBody: htmlBody,
      attachments: attachments // Anexo adicionado aqui 
    });

    // Verifica se os cabeçalhos das colunas de resultado existem. 
    // Se for a primeira execução ou se estiverem vazios, cria os títulos.
    if (newRow === 2) {
      sheet.getRange(1, START_RESULT_COLUMN).setValue("Classificação IA");
      sheet.getRange(1, START_RESULT_COLUMN + 1).setValue("Comentário IA");
    }

    // Grava o resultado da análise (Classificação e Comentário) na linha do respondente
    sheet.getRange(newRow, START_RESULT_COLUMN).setValue(analysisResult.classification);
    sheet.getRange(newRow, START_RESULT_COLUMN + 1).setValue(analysisResult.comment);
  }
}

/**
 * Esta função envia os dados para a API do Gemini processar a classificação do perfil e gerar o feedback.
 * O prompt é construído considerando a frequência das alternativas (A, B, C) e a personalização.
 * @param {string} text A string concatenada contendo todas as 15 perguntas e respostas do formulário.
 * @param {string} nome O nome do respondente, utilizado para personalizar a resposta.
 * @param {string} respostaPersonalizada O texto da resposta aberta sobre conhecimentos prévios para personalizar a orientação.
 * @returns {object} Um objeto JSON contendo a classificação do perfil ("classification") e a análise detalhada ("comment").
 */
function analyzeWithGemini(text, nome, respostaPersonalizada) {

  // Prompt:
  const prompt = `Você é um sistema de análise de perfil. Receberá as respostas de um formulário com ${QUESTION_COUNT} perguntas de múltipla escolha. As respostas seguem o formato de texto completo, mas você deve identificar qual alternativa (A, B ou C) o respondente escolheu mais vezes. Sua tarefa é classificar o perfil do respondente com base na contagem da alternativa mais frequente, seguindo estas regras:

  - Se a maioria das respostas for a alternativa 'A', a classificação é "Qualidade de software".
  - Se a maioria das respostas for a alternativa 'B', a classificação é "Desenvolvimento com IA".
  - Se a maioria das respostas for a alternativa 'C', a classificação é "Ciência de dados".
  - Se houver empate entre as alternativas, a classificação é "Indefinido".

  Personalizar a resposta do resultado levando em consideração:
    - O nome do respondente: ${nome}.
    - A resposta da pergunta "Você já possui conhecimento em alguma tecnologia ou ferramenta específica (como Python, AWS, SQL, por exemplo)? Se sim, qual?" que será ${respostaPersonalizada}. Considerar que, caso a pessoa tenha algum conhecimento, você não sabe quanto, apenas que ela tem algum conhecimento. Em caso de ter algum conhecimento, sugerir como ele pode ser útil na classificação tirada. Caso o conhecimento não seja útil, você deve valorizar o conhecimento, mas reorientar ou focar em uma habilidade transferível. Se a pessoa não tiver nenhum conhecimento, dar alguma indicação.

  Responda APENAS e SOMENTE com um objeto JSON válido, sem qualquer texto ou explicação ANTES ou DEPOIS. O formato deve ser: {"classification": "Classificação do Perfil", "comment": "Comentário breve sobre o resultado desta classificação como um profissional acompanhado de uma breve explicação sobre o que é a área da classificação obtida. Se for indefinido, citar as classificações que empataram. Adicionar conteúdo personalizado de acordo com o que foi orientado para se levar em consideração"}.

  Respostas do Formulário (${QUESTION_COUNT} perguntas): ${text}`;

  const model = 'gemini-2.5-flash';

  // URL:
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  // Payload ajustado(formatação para análise da API Gemini)
  const payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const content = response.getContentText();
    const result = JSON.parse(content);

    if (!result.candidates || result.candidates.length === 0) {
      Logger.log("ERRO FATAL DA API. Resposta completa: " + content);
      throw new Error("A API não retornou o resultado esperado.");
    }

    // Pega a string de texto do Gemini
    let jsonString = result.candidates[0].content.parts[0].text;

    // Limpa a string de JSON removendo o Markdown ```json e ```
    jsonString = jsonString
      .replace('```json', '')
      .replace('```', '')
      .trim(); // Remove espaços em branco antes e depois

    // 3. Tenta analisar o JSON limpo
    const analysis = JSON.parse(jsonString);
    console.log("análise", jsonString);
    return analysis;

  } catch (e) {
    Logger.log("Erro crítico na chamada ou análise da Gemini API: " + e.toString());
    return {
      classification: "Ops! Parece que algo deu errado.",
      comment: "Pedimos desculpas pelo imprevisto. Não conseguimos processar o seu resultado agora. Por favor, tente refazer o seu teste de afinidade em alguns minutos."
    };
  }
}
