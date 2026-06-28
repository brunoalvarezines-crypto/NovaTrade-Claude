require('dotenv').config();
const express = require('express');
const path = require('path');

const { ensureDataDirs } = require('./ensure-data-dirs');
const { askClaude } = require('./claude-client');
const { buildContext } = require('./context');
const { startPriceFeed } = require('./feeds/precio');
const { startNewsFeed } = require('./feeds/noticias');
const { startHistoricosFeed } = require('./feeds/historicos');
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

app.post('/chat', async (req, res) => {
  try {
    const { message, image } = req.body || {};
    if (!message && !image) {
      return res.status(400).json({ error: 'Falta "message" o "image" en el cuerpo de la petición.' });
    }
    const context = await buildContext();
    const reply = await askClaude({ message, image, context });
    res.json({ reply });
  } catch (err) {
    console.error('Error en /chat:', err);
    res.status(500).json({ error: 'Error interno al consultar al agente.' });
  }
});

app.listen(PORT, () => {
  console.log(`NovaTrade backend escuchando en puerto ${PORT}`);
  startPriceFeed();
  startNewsFeed();
  startHistoricosFeed();
  startCapturasFeed();
  if (process.env.ENABLE_REVIEW_JOB === 'true') {
    startReviewJob();
  }
});
