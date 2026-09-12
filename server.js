import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import path from "path";
import dns from "node:dns";
import { fileURLToPath } from "url";

// Some hosts (e.g. Render's free tier) fail outbound HTTPS over IPv6;
// prefer IPv4 so calls to the Anthropic API don't intermittently fail.
dns.setDefaultResultOrder("ipv4first");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, ".env") });

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn(
    "Aviso: ANTHROPIC_API_KEY não está definida. Configure o arquivo .env antes de gerar roteiros.",
  );
}

const client = new Anthropic();
const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const LANGUAGE_NAMES = {
  "pt-BR": "português do Brasil",
  en: "English",
  es: "español",
};

function buildPrompt({ businessDescription, products, languageName }) {
  const productList = products
    .map((p, i) => {
      const features = p.features?.trim()
        ? `\n   Características/diferenciais: ${p.features.trim()}`
        : "";
      return `${i + 1}. ${p.name.trim()} — ${p.price.trim()}${features}`;
    })
    .join("\n");

  return `Você é um roteirista especialista em lives de vendas (live commerce) para plataformas como Shopee, TikTok Shop e Mercado Livre. Você atende negócios de qualquer nicho (agropecuária, moda, alimentos, eletrônicos, etc.).

Escreva TODO o roteiro em ${languageName}.

Contexto do negócio/marca (tom de voz e público-alvo):
${businessDescription.trim()}

Produtos a vender nesta live, na ordem em que foram informados:
${productList}

Gere um roteiro de live completo com estas seções, usando exatamente estes títulos (traduza os títulos para ${languageName} se o idioma não for português):

## Abertura / Gancho Inicial
Fala pronta (30-60 segundos) para prender a audiência nos primeiros segundos da live.

## Ordem Sugerida dos Produtos
Reordene os produtos informados da forma que gera mais engajamento no início até o que fecha mais vendas no final, explicando brevemente o porquê de cada posição.

## Argumento de Venda por Produto
Para cada produto, um bloco com um argumento de venda específico e pronto para falar ao vivo, destacando as características/diferenciais informadas. Não invente características que não foram informadas.

## Respostas às 5 Objeções Mais Comuns
As 5 objeções mais comuns de quem compra este tipo de produto nesse tipo de negócio, cada uma com uma resposta pronta para rebater ao vivo.

## Oferta e Gatilho de Urgência para o Fechamento
Sugestão de oferta e gatilho de urgência/escassez para usar no fechamento da live.

Escreva em tom natural de fala, como se fosse dito em voz alta ao vivo, adaptado ao tom de voz e público descritos no contexto do negócio.`;
}

app.post("/api/generate-script", async (req, res) => {
  const { businessDescription, products, language } = req.body ?? {};

  if (typeof businessDescription !== "string" || !businessDescription.trim()) {
    return res.status(400).json({ error: "Descreva o negócio/marca (tom de voz e público)." });
  }
  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: "Adicione ao menos um produto." });
  }
  for (const p of products) {
    if (!p || typeof p.name !== "string" || !p.name.trim() || typeof p.price !== "string" || !p.price.trim()) {
      return res.status(400).json({ error: "Cada produto precisa de nome e preço." });
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "ANTHROPIC_API_KEY não está configurada no servidor. Crie um arquivo .env com sua chave (veja .env.example) e reinicie o servidor.",
    });
  }

  const languageName = LANGUAGE_NAMES[language] ?? LANGUAGE_NAMES["pt-BR"];
  const prompt = buildPrompt({ businessDescription, products, languageName });

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const script = textBlock?.text ?? "";

    if (!script) {
      return res.status(502).json({ error: "A API não retornou nenhum texto. Tente novamente." });
    }

    res.json({ script });
  } catch (error) {
    console.error("Erro ao chamar a API da Anthropic:", error);

    if (error instanceof Anthropic.AuthenticationError) {
      res.status(500).json({ error: "Chave de API inválida ou ausente no servidor. Verifique o .env." });
    } else if (error instanceof Anthropic.RateLimitError) {
      res.status(429).json({ error: "Limite de requisições atingido. Tente novamente em alguns instantes." });
    } else if (error instanceof Anthropic.APIError) {
      res.status(502).json({ error: `Erro na API da Anthropic: ${error.message}` });
    } else {
      res.status(500).json({ error: "Erro inesperado ao gerar o roteiro." });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
