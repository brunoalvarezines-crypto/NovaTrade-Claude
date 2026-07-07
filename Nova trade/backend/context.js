const fs = require('fs');
const path = require('path');
const { leerHistoricoMulti } = require('./feeds/historicos-multi');

const DATA = path.join(__dirname, 'data');

// Activos multi (forex, commodities, acciones)
const FOREX_COMMODITIES = ['EUR/USD', 'GBP/USD', 'XAU/USD', 'XAG/USD', 'WTI'];
const STOCKS = ['TSLA', 'NVDA', 'AMZN', 'AAPL', 'MSFT'];
const MULTI_ACTIVOS = [...FOREX_COMMODITIES, ...STOCKS];

// Palabras clave para detectar qué activos se mencionan en el mensaje
const KEYWORDS = {
  'EUR/USD': ['eur', 'eurusd', 'euro'],
  'GBP/USD': ['gbp', 'gbpusd', 'libra'],
  'XAU/USD': ['xau', 'xauusd', 'oro', 'gold'],
  'XAG/USD': ['xag', 'xagusd', 'plata', 'silver'],
  'WTI':     ['wti', 'petroleo', 'petróleo', 'oil', 'crude'],
  'TSLA':    ['tsla', 'tesla'],
  'NVDA':    ['nvda', 'nvidia'],
  'AMZN':    ['amzn', 'amazon'],
  'AAPL':    ['aapl', 'apple'],
  'MSFT':    ['msft', 'microsoft']
};

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
  catch { return null; }
}

function readText(file) {
  try { return fs.readFileSync(file, 'utf-8'); }
  catch { return ''; }
}

function tailLines(text, n) {
  if (!text) return '';
  const lines = text.split('\n').filter(Boolean);
  return lines.slice(-n).join('\n');
}

function activosMencionados(mensaje) {
  const lower = mensaje.toLowerCase();
  const mencionados = MULTI_ACTIVOS.filter(simbolo =>
    (KEYWORDS[simbolo] || []).some(kw => lower.includes(kw))
  );
  return mencionados.length > 0 ? mencionados : FOREX_COMMODITIES;
}

async function buildContext(mensaje = '') {
  // -- Crypto (siempre incluido) --
  const precio = readJSON(path.join(DATA, 'precios', 'latest.json'));
  const noticias = readJSON(path.join(DATA, 'noticias', 'latest.json'));
  const csv1D  = tailLines(readText(path.join(DATA, 'historicos', '1D.csv')),  30);
  const csv1H  = tailLines(readText(path.join(DATA, 'historicos', '1H.csv')),  30);
  const csv15m = tailLines(readText(path.join(DATA, 'historicos', '15m.csv')), 30);

  // -- Multi-activos (forex, commodities, acciones) --
  const preciosMulti = readJSON(path.join(DATA, 'precios-multi', 'latest.json'));
  const activos = activosMencionados(mensaje);

  const bloqueMulti = [];
  if (preciosMulti && preciosMulti.precios) {
    const resumen = Object.entries(preciosMulti.precios)
      .map(([sym, v]) => `${v.nombre} (${sym}): ${v.precio}`)
      .join(' | ');
    bloqueMulti.push(`Precios actuales (forex/commodities/acciones): ${resumen}`);
  }

  for (const simbolo of activos) {
    const h1D  = leerHistoricoMulti(simbolo, '1D');
    const h1H  = leerHistoricoMulti(simbolo, '1H');
    const h15m = leerHistoricoMulti(simbolo, '15m');
    if (h1D || h1H || h15m) {
      bloqueMulti.push(
        `-- ${simbolo} --\n` +
        (h1D  ? `Historico 1D:\n${h1D}\n`  : '') +
        (h1H  ? `Historico 1H:\n${h1H}\n`  : '') +
        (h15m ? `Historico 15m:\n${h15m}\n` : '')
      );
    }
  }

  return [
    `Precio crypto actual: ${precio ? JSON.stringify(precio) : 'sin datos'}`,
    `Noticias recientes: ${noticias ? JSON.stringify(noticias) : 'sin datos'}`,
    `Historico crypto 1D:\n${csv1D  || 'sin datos'}`,
    `Historico crypto 1H:\n${csv1H  || 'sin datos'}`,
    `Historico crypto 15m:\n${csv15m || 'sin datos'}`,
    ...(bloqueMulti.length > 0 ? bloqueMulti : ['Datos forex/acciones: sin datos (configura TWELVE_DATA_API_KEY)']),
  ].join('\n\n');
}

module.exports = { buildContext };
