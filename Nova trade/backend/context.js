require('dotenv').config();
const express = require('express');
const path = require('path');

const { ensureDataDirs } = require('./ensure-data-dirs');
const { askClaude } = require('./claude-client');
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

app.use(express.json({ limit: '15mb' }));
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
    const context = await buildContext(message || '');
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
  startPrecioMultiFeed();
  startHistoricosMultiFeed();
  startCapturasFeed();
  if (process.env.ENABLE_REVIEW_JOB === 'true') {
    startReviewJob();
  }
});
