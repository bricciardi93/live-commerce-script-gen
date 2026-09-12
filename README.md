# Gerador de Roteiros de Live Commerce

Ferramenta web que gera roteiros de live de vendas (Shopee, TikTok Shop, Mercado Livre, etc.) usando a API da Anthropic (Claude). Funciona para qualquer tipo de negócio.

## Como funciona

1. Você descreve o negócio/marca (tom de voz, público-alvo) e lista os produtos (nome, preço, características).
2. O servidor monta um prompt e chama a API da Claude (modelo `claude-sonnet-5`).
3. A Claude retorna um roteiro completo: gancho de abertura, ordem dos produtos, argumento de venda por produto, respostas às 5 objeções mais comuns e oferta/gatilho de urgência para o fechamento.
4. Você copia o roteiro ou exporta como `.txt`.

Não há banco de dados — nada é salvo entre sessões.

## Rodando localmente

Pré-requisito: [Node.js](https://nodejs.org) (LTS) instalado.

```bash
npm install
```

Copie `.env.example` para `.env` e coloque sua chave da API da Anthropic (veja abaixo como criar):

```bash
cp .env.example .env
```

Rode o servidor:

```bash
npm start
```

Acesse `http://localhost:3000`.

## Criando a chave de API da Anthropic

1. Crie uma conta em [console.anthropic.com](https://console.anthropic.com).
2. Adicione um método de pagamento em **Settings → Billing** e um crédito inicial.
3. Vá em **Settings → API Keys → Create Key**, copie a chave gerada (`sk-ant-...`) e cole no `.env`.

A chave nunca deve ser exposta no frontend — por isso este projeto tem um backend (Node/Express) que faz a chamada à API e só entrega o texto pronto para o navegador.

## Publicando para outras pessoas usarem

Como a chave de API fica só no servidor (variável de ambiente), qualquer hospedagem de Node.js funciona. Opções simples:

### Render (gratuito para começar)
1. Suba este projeto num repositório Git (GitHub, por exemplo).
2. Crie um **Web Service** em [render.com](https://render.com) apontando para o repositório.
3. Build command: `npm install` — Start command: `npm start`.
4. Em **Environment**, adicione a variável `ANTHROPIC_API_KEY` com sua chave.

### Railway
1. Mesma ideia: conecte o repositório em [railway.app](https://railway.app).
2. Adicione a variável de ambiente `ANTHROPIC_API_KEY` no painel do projeto.
3. Railway detecta automaticamente `npm start`.

Em ambos os casos, **nunca** commite o arquivo `.env` no Git (ele já está no `.gitignore`).

## Estrutura do projeto

```
server.js           servidor Express + chamada à API da Anthropic
public/
  index.html         página principal
  style.css          estilos
  script.js          lógica do formulário e renderização do roteiro
.env.example         modelo de variáveis de ambiente
```
