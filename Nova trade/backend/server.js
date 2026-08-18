require('dotenv').config();
const express = require('express');
const path = require('path');

const { ensureDataDirs } = require('./ensure-data-dirs');
const { askClaude, askClaudeStream, generateTitle } = require('./claude-client');
const { buildContext } = require('./context');
const { startPriceFeed } = require('./feeds/precio');
const { startNewsFeed } = require('./feeds/noticias');
const { startHistoricosFeed } = require('./feeds/historicos');
const { startPrecioMultiFeed } = require('./feeds/precio-multi');
const { startHistoricosMultiFeed } = require('./feeds/historicos-multi');
const { startCapturasFeed } = require('./feeds/capturas');
const { startReviewJob } = require('./jobs/revision');

ensureDataDirs();

const app = express();
const PORT = process.env.PORT || 3000;

// Permite imágenes en base64 dentro del body de /chat.
app.use(express.json({ limit: '15mb' }));

// Sirve la PWA (public/index.html, manifest, sw.js, iconos) y la API
// desde el mismo origen.
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

app.post('/api/title', async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'Falta message' });
    const title = await generateTitle(message);
    res.json({ title });
  } catch (err) {
    res.status(500).json({ error: 'Error generando título' });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { message, image, history } = req.body || {};
    if (!message && !image) {
      return res.status(400).json({ error: 'Falta "message" o "image" en el cuerpo de la petición.' });
    }

    const context = await buildContext(message || '');

    // Cabeceras SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // evita buffer en proxies nginx
    res.flushHeaders();
    // Desactiva Nagle: cada write() sale por TCP inmediatamente sin esperar
    req.socket?.setNoDelay(true);

    const stream = await askClaudeStream({ message, image, context, history: history || [] });

    for await (const chunk of stream) {
      if (res.writableEnded) break;
      try {
        const text = chunk.text();
        if (text) res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
      } catch (_) {
        // chunk sin texto (safety ratings, etc.) — ignorar
      }
    }

    if (!res.writableEnded) {
      res.write('data: [DONE]\n\n');
      res.end();
    }
  } catch (err) {
    console.error('Error en /chat:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error interno al consultar al agente.' });
    } else if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Dex backend escuchando en puerto ${PORT}`);
  startPriceFeed();
  startNewsFeed();
  startHistoricosFeed();
  startPrecioMultiFeed();
  startHistoricosMultiFeed();
  startCapturasFeed();
  if (process.env.ENABLE_REVIEW_JOB === 'true') {
    startReviewJob();
  }
});
