const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const systemPrompt = fs.readFileSync(path.join(__dirname, 'system-prompt.md'), 'utf-8');

/**
 * Llama a Claude con el mensaje del usuario + el contexto de mercado actual.
 * @param {{message?: string, image?: string, context: string}} params
 *   image: data URL completa ("data:image/png;base64,...") si el usuario
 *   adjunta una captura/foto en el chat.
 */
async function askClaude({ message, image, context, history = [] }) {
  // Mensajes anteriores de la conversación (sin contexto de mercado, solo el texto)
  const messages = history.slice(-10).map(m => ({
    role: m.role,
    content: m.content
  }));

  // Si el último mensaje del historial ya es del usuario (el actual), lo eliminamos
  // para evitar duplicado — lo añadimos abajo con el contexto de mercado
  if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
    messages.pop();
  }

  // Construir el mensaje actual con contexto de mercado
  const currentContent = [];
  if (image) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(image);
    if (match) {
      const [, mediaType, data] = match;
      currentContent.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } });
    }
  }
  currentContent.push({
    type: 'text',
    text: `${message || ''}\n\n--- Contexto de mercado actual ---\n${context}`.trim(),
  });

  messages.push({ role: 'user', content: currentContent });

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 768,
    system: systemPrompt,
    messages,
  });

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

/**
 * Versión streaming de askClaude.
 * Devuelve un Stream de Anthropic con .textStream iterable.
 */
function askClaudeStream({ message, image, context, history = [] }) {
  const messages = history.slice(-10).map(m => ({
    role: m.role,
    content: m.content
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
  currentContent.push({
    type: 'text',
    text: `${message || ''}\n\n--- Contexto de mercado actual ---\n${context}`.trim(),
  });

  messages.push({ role: 'user', content: currentContent });

  return anthropic.messages.stream({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 768,
    system: systemPrompt,
    messages,
  });
}

module.exports = { askClaude, askClaudeStream, anthropic };
