const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { SYMBOLS } = require('./precio');

const DIR = path.join(__dirname, '..', 'data', 'historicos');
const VELAS = 200;
const CADA_MS = Number(process.env.HISTORICOS_INTERVAL_MS) || 5 * 60 * 1000; // 5 min

// Nombre de archivo (estilo TradingView) -> intervalo que entiende Binance.
const INTERVALOS = { '1D': '1d', '1H': '1h', '15m': '15m' };

// Asegura que el directorio base existe
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

function csvDeVelas(velas) {
  const cabecera = 'tiempo,apertura,maximo,minimo,cierre,volumen';
  const filas = velas.map((v) => {
    const [tiempoApertura, open, high, low, close, volume] = v;
    return `${new Date(tiempoApertura).toISOString()},${open},${high},${low},${close},${volume}`;
  });
  return [cabecera, ...filas].join('\n');
}

async function fetchTemporalidad(symbol, temporalidad, intervalo) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${intervalo}&limit=${VELAS}`;
  const res = await fetch(url);
  const velas = await res.json();
  if (!Array.isArray(velas)) throw new Error(typeof velas === 'object' ? JSON.stringify(velas) : String(velas));
  // Carpeta por simbolo: data/historicos/BTCUSDT/
  const symbolDir = path.join(DIR, symbol);
  if (!fs.existsSync(symbolDir)) fs.mkdirSync(symbolDir, { recursive: true });
  fs.writeFileSync(path.join(symbolDir, `${temporalidad}.csv`), csvDeVelas(velas));
}

async function actualizarHistoricos() {
  for (const symbol of SYMBOLS) {
    for (const [temporalidad, intervalo] of Object.entries(INTERVALOS)) {
      try {
        await fetchTemporalidad(symbol, temporalidad, intervalo);
      } catch (err) {
        console.error(`Error en historico ${symbol} ${temporalidad}:`, err.message);
      }
    }
  }
}

function leerHistorico(symbol, temporalidad) {
  try {
    return fs.readFileSync(path.join(DIR, symbol, `${temporalidad}.csv`), 'utf-8');
  } catch {
    return null;
  }
}

function startHistoricosFeed() {
  actualizarHistoricos();
  setInterval(actualizarHistoricos, CADA_MS);
}

module.exports = { leerHistorico, startHistoricosFeed };
