**Automação: Google Forms e Gemini**

Este repositório contém um script em Google Apps Script desenvolvido para automatizar a análise de formulários de orientação de carreira, integrando o Google Forms diretamente com a API do Google Gemini.

O sistema processa as respostas, utiliza IA para classificar o perfil do usuário (Qualidade de Software, Ciência de Dados ou Desenvolvimento com IA) e dispara e-mails com feedbacks personalizados e materiais de estudo que incluem uma Cartilha em PDF com a trilha de estudos completa para a sua área de afinidade.

**Funcionalidades:**

- Gatilho Automático: Execução em tempo real (`onFormSubmit`) a cada nova resposta no formulário.
- Classificação Inteligente: Algoritmo que identifica a área de afinidade baseada na frequência das alternativas (A, B, C) em 15 perguntas.
- Análise com Gemini 2.5 Flash: A IA gera um comentário técnico e motivacional, levando em conta:
  - O nome do participante.
  - Conhecimentos prévios declarados (ex: "Já sei Python", "Conheço SQL").
- E-mail HTML: Envio de mensagem formatada via GmailApp.
- Anexos Dinâmicos: O script busca automaticamente no Google Drive o PDF correspondente à classificação (ex: `Ciência de dados.pdf`) e o anexa ao e-mail.

**Tecnologias:**
- Linguagem: JavaScript (Google Apps Script)
- IA: Google Gemini API (REST via `UrlFetchApp`)
Google Services: DriveApp, MailApp, SpreadsheetApp, PropertiesService.  

**Instalação e Configuração:**

**1. Preparação**
- Tenha uma planilha vinculada ao seu Google Form.
- Crie uma pasta no Google Drive e coloque os PDFs das carreiras.
- Obtenha sua chave de API no [Google AI Studio](https://aistudio.google.com/).

**2. Configurando o Script**
  - Copie o conteúdo do arquivo automacao.js deste repositório para o seu projeto no Apps Script e faça os ajustes necessários

**3. Segurança (API Key)**
- Nunca cole sua chave de API diretamente no código.
- No editor do Apps Script, vá em Configurações do Projeto (ícone de engrenagem ⚙️).
- Role até Propriedades do script.
- Clique em Adicionar propriedade de script:
- Propriedade: GEMINI_API_KEY
- Valor: Sua_Chave_Aqui...

**4. Ativando o Gatilho**
- Para que o script rode sozinho:
	- No menu lateral esquerdo, vá em Acionadores (ícone de relógio).
	- Clique em + Adicionar Acionador.

- Configure:
  - Função: onFormSubmitTrigger
  - Origem do evento: Da planilha
  - Tipo de evento: No envio do formulário

**Como funciona o Prompt:**

O script concatena as 15 perguntas e respostas do usuário e envia para o Gemini com instruções estritas para:	
  - Contar as alternativas.
  - Definir a classificação vencedora.
  - Criar um comentário personalizado.
  - Retornar apenas um JSON estruturado para que o código possa processar o envio do e-mail.

**Autores:**

Este projeto foi desenvolvido em grupo para a disciplina de Empregabilidade e Carreira - Extensão do curso de Análise e Desenvolvimento de Sistemas (ADS) no SENAC.

  - Eliakim Oliveira
  - Lara Peddinghausen 
  - Nilo Lisboa

