const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const systemPrompt = fs.readFileSync(path.join(__dirname, 'system-prompt.md'), 'utf-8');

// El system prompt se marca como cacheable — Anthropic lo almacena 5 minutos
// y las llamadas siguientes pagan solo el 10% de esos tokens.
const systemWithCache = [
  {
    type: 'text',
    text: systemPrompt,
    cache_control: { type: 'ephemeral' },
  },
];

function buildMessages(history, message, image, context) {
  const messages = history.slice(-10).map(m => ({
    role: m.role,
    content: m.content,
  }));

  if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
    messages.pop();
  }

  const currentContent = [];

  if (image) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(image);
    if (match) {
      const [, mediaType, data] = match;
      currentContent.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } });
    }
  }

  // El contexto de mercado también se cachea — cambia cada 30 min pero dentro
  // de esa ventana todas las preguntas lo reutilizan al 10% del coste.
  currentContent.push({
    type: 'text',
    text: `${message || ''}\n\n--- Contexto de mercado actual ---\n${context}`.trim(),
    cache_control: { type: 'ephemeral' },
  });

  messages.push({ role: 'user', content: currentContent });
  return messages;
}

async function askClaude({ message, image, context, history = [] }) {
  const messages = buildMessages(history, message, image, context);
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 768,
    system: systemWithCache,
    messages,
    betas: ['prompt-caching-2024-07-31'],
  });
  return response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();
}

function askClaudeStream({ message, image, context, history = [] }) {
  const messages = buildMessages(history, message, image, context);
  return anthropic.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 768,
    system: systemWithCache,
    messages,
    betas: ['prompt-caching-2024-07-31'],
  });
}

module.exports = { askClaude, askClaudeStream, anthropic };
