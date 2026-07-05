const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const DIR = path.join(__dirname, '..', 'data', 'historicos');
const CADA_MS = 30 * 60 * 1000; // actualizar cada 30 min

const SYMBOL = process.env.HISTORICOS_SYMBOL || 'BTCUSDT';

const INTERVALOS = {
  '1D':  { interval: '1d',  limit: 90  },
  '1H':  { interval: '1h',  limit: 168 },
  '15m': { interval: '15m', limit: 672 },
};

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

function csvDeVelas(klines) {
  const cabecera = 'time,open,high,low,close,volume';
  const filas = klines.map(v => {
    const [openTime, open, high, low, close, volume] = v;
    return `${new Date(openTime).toISOString()},${open},${high},${low},${close},${volume}`;
  });
  return [cabecera, ...filas].join('\n');
}

async function fetchTemporalidad(temporalidad, config) {
  const { interval, limit } = config;
  const url = `https://api.binance.us/api/v3/klines?symbol=${SYMBOL}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  const klines = await res.json();
  if (!Array.isArray(klines)) {
    console.error(`Histórico ${temporalidad}: respuesta inesperada`, JSON.stringify(klines).slice(0, 80));
    return;
  }
  const csv = csvDeVelas(klines);
  fs.writeFileSync(path.join(DIR, `${temporalidad}.csv`), csv);
  console.log(`Histórico ${temporalidad}: ${klines.length} velas (${SYMBOL})`);
}

async function fetchHistoricos() {
  for (const [temporalidad, config] of Object.entries(INTERVALOS)) {
    try {
      await fetchTemporalidad(temporalidad, config);
    } catch (err) {
      console.error(`Error en histórico ${temporalidad}:`, err.message);
    }
  }
}

function startHistoricosFeed() {
  fetchHistoricos();
  setInterval(fetchHistoricos, CADA_MS);
}

module.exports = { startHistoricosFeed };
