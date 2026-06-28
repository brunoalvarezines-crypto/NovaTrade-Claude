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
async function askClaude({ message, image, context }) {
  const content = [];

  if (image) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(image);
    if (match) {
      const [, mediaType, data] = match;
      content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data } });
    }
  }

  content.push({
    type: 'text',
    text: `${message || ''}\n\n--- Contexto de mercado actual ---\n${context}`.trim(),
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content }],
  });

  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

module.exports = { askClaude };
