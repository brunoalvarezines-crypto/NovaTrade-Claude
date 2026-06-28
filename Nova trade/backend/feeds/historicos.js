const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const DIR = path.join(__dirname, '..', 'data', 'historicos');
const SYMBOL = process.env.PRICE_SYMBOL || 'BTCUSDT';
const VELAS = 200;
const CADA_MS = Number(process.env.HISTORICOS_INTERVAL_MS) || 5 * 60 * 1000; // 5 min

// Nombre de archivo (estilo TradingView) -> intervalo que entiende Binance.
const INTERVALOS = { '1D': '1d', '1H': '1h', '15m': '15m' };

/**
 * Descarga velas (klines) de Binance — misma fuente de datos que TradingView
 * para pares cripto, sin necesitar API key — y las deja en CSV.
 */
function csvDeVelas(velas) {
  const cabecera = 'tiempo,apertura,maximo,minimo,cierre,volumen';
  const filas = velas.map((v) => {
    const [tiempoApertura, open, high, low, close, volume] = v;
    return `${new Date(tiempoApertura).toISOString()},${open},${high},${low},${close},${volume}`;
  });
  return [cabecera, ...filas].join('\n');
}

async function fetchTemporalidad(temporalidad, intervalo) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${SYMBOL}&interval=${intervalo}&limit=${VELAS}`;
  const res = await fetch(url);
  const velas = await res.json();
  if (!Array.isArray(velas)) throw new Error(typeof velas === 'object' ? JSON.stringify(velas) : String(velas));
  fs.writeFileSync(path.join(DIR, `${temporalidad}.csv`), csvDeVelas(velas));
}

async function actualizarHistoricos() {
  for (const [temporalidad, intervalo] of Object.entries(INTERVALOS)) {
    try {
      await fetchTemporalidad(temporalidad, intervalo);
    } catch (err) {
      console.error(`Error en histórico ${temporalidad}:`, err.message);
    }
  }
}

/**
 * Lee un CSV ya escrito en data/historicos/ (por el feed automático, o a
 * mano si alguna vez quieres pisar un archivo con tu propia exportación de
 * TradingView — el formato de columnas debe coincidir).
 */
function leerHistorico(temporalidad) {
  try {
    return fs.readFileSync(path.join(DIR, `${temporalidad}.csv`), 'utf-8');
  } catch {
    return null;
  }
}

function startHistoricosFeed() {
  actualizarHistoricos();
  setInterval(actualizarHistoricos, CADA_MS);
}

module.exports = { leerHistorico, startHistoricosFeed };
