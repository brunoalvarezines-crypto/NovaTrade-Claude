const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const systemPrompt = fs.readFileSync(path.join(__dirname, 'system-prompt.md'), 'utf-8');

const MODEL = 'gemini-2.5-flash';

// Desactivar filtros de seguridad para contenido financiero
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

function buildContents(history, message, image, context) {
  const contents = history.slice(-10).map(m => {
    const text = typeof m.content === 'string'
      ? m.content
      : (m.content.find(c => c.type === 'text')?.text || '');
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text }]
    };
  });

  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents.pop();
  }

  const parts = [];
  if (image) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(image);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
  }
  parts.push({ text: `${message || ''}\n\n--- Contexto de mercado actual ---\n${context}`.trim() });
  contents.push({ role: 'user', parts });

  return contents;
}

async function askClaude({ message, image, context, history = [] }) {
  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: systemPrompt, safetySettings });
  const contents = buildContents(history, message, image, context);
  const result = await model.generateContent({ contents, generationConfig: { maxOutputTokens: 768 } });
  return result.response.text();
}

async function askClaudeStream({ message, image, context, history = [] }) {
  const model = genAI.getGenerativeModel({ model: MODEL, systemInstruction: systemPrompt, safetySettings });
  const contents = buildContents(history, message, image, context);
  const result = await model.generateContentStream({ contents, generationConfig: { maxOutputTokens: 768 } });
  return result.stream;
}

async function generateTitle(message) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: 'Genera un título corto (3-5 palabras, sin puntuación, sin comillas) que resuma esta pregunta de trading. Solo el título, nada más.'
  });
  const result = await model.generateContent(message);
  return result.response.text().trim().replace(/^["'«»]|["'«»]$/g, '');
}

module.exports = { askClaude, askClaudeStream, generateTitle };
