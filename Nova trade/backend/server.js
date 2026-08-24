require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const webpush = require('web-push');

const { ensureDataDirs } = require('./ensure-data-dirs');
const { askClaude, askClaudeStream, anthropic } = require('./claude-client');
const { buildContext } = require('./context');

// ── Web Push: claves VAPID ──
webpush.setVapidDetails(
  'mailto:somosboto@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ── Suscripciones en archivo (se reconstruyen al abrir la app) ──
const SUBS_FILE = path.join(__dirname, 'data', 'subscriptions.json');
function loadSubs() {
  try { return JSON.parse(fs.readFileSync(SUBS_FILE, 'utf-8')); } catch { return []; }
}
function saveSubs(subs) {
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs));
}
function addSub(sub) {
  const subs = loadSubs();
  const endpoint = sub.endpoint;
  if (!subs.find(s => s.endpoint === endpoint)) { subs.push(sub); saveSubs(subs); }
}
async function sendPushToAll(payload) {
  const subs = loadSubs();
  const valid = [];
  for (const sub of subs) {
    try { await webpush.sendNotification(sub, JSON.stringify(payload)); valid.push(sub); }
    catch (e) { if (e.statusCode !== 410 && e.statusCode !== 404) valid.push(sub); }
  }
  saveSubs(valid);
}
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
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      system: 'Genera un título corto (3-5 palabras, sin puntuación, sin comillas) que resuma esta pregunta de trading. Solo el título, nada más.',
      messages: [{ role: 'user', content: message }]
    });
    const title = response.content[0].text.trim().replace(/^["'«»]|["'«»]$/g, '');
    res.json({ title });
  } catch (err) {
    res.status(500).json({ error: 'Error generando título' });
  }
});

// ── PUSH: clave pública VAPID para el frontend ──
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY });
});

// ── PUSH: guardar suscripción del dispositivo ──
app.post('/api/push/subscribe', (req, res) => {
  const { subscription } = req.body || {};
  if (!subscription?.endpoint) return res.status(400).json({ error: 'Falta subscription' });
  addSub(subscription);
  res.json({ ok: true });
});

// ── ANÁLISIS AUTOMÁTICO: llamado por cron-job.org cada 30 min ──
app.post('/api/analyze', async (req, res) => {
  // Protección simple con token secreto
  const token = req.headers['x-cron-token'];
  if (token !== process.env.CRON_SECRET) return res.status(401).json({ error: 'No autorizado' });

  try {
    const context = await buildContext('analisis general todos los activos');
    const prompt = `Analiza TODOS los activos disponibles ahora mismo y clasifica el mejor en uno de estos 3 niveles. Responde SOLO con el nivel y el activo, en este formato exacto:

NIVEL1|ACTIVO|texto breve natural (max 8 palabras) explicando por qué es operable
NIVEL2|ACTIVO|texto breve natural (max 8 palabras) explicando el setup
NIVEL3|ACTIVO|texto breve natural (max 8 palabras) explicando por qué es excepcional
SIN_ALERTA

Criterios:
- NIVEL1: el mercado tiene estructura legible, tendencia definida, se puede practicar trading. Umbral bajo — basta con que haya algo claro.
- NIVEL2: hay un setup concreto con entrada, SL y TP identificables. Umbral medio.
- NIVEL3: confluencias múltiples excepcionales, ocurre 1-2 veces al mes. Umbral muy alto.

Elige el nivel más alto que se cumpla. Si no hay nada mínimamente operable, responde: SIN_ALERTA`;

    const respuesta = await askClaude({ message: prompt, context, history: [] });
    const linea = respuesta.trim();

    if (!linea || linea === 'SIN_ALERTA') {
      return res.json({ sent: false, reason: 'Sin alerta' });
    }

    const partes = linea.split('|');
    if (partes.length < 3) return res.json({ sent: false, reason: 'Formato inesperado' });

    const [nivel, activo, texto] = partes;

    const titulos = {
      NIVEL1: `${activo} tiene buena estructura`,
      NIVEL2: `Buen setup en ${activo}`,
      NIVEL3: `⚡ Setup excepcional en ${activo}`,
    };

    const titulo = titulos[nivel.trim()] || `Alerta en ${activo}`;

    await sendPushToAll({ title: titulo, body: texto.trim(), url: '/' });
    res.json({ sent: true, nivel, activo, message: texto.trim() });
  } catch (err) {
    console.error('Error en /api/analyze:', err);
    res.status(500).json({ error: err.message });
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

    const stream = askClaudeStream({ message, image, context, history: history || [] });

    for await (const event of stream) {
      if (res.writableEnded) break;
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ token: event.delta.text })}\n\n`);
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
