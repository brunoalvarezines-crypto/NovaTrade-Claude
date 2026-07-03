const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data', 'historicos');
const CADA_MS = 15 * 60 * 1000; // actualizar cada 15 minutos

// Mapa de simbolo Binance -> id de CoinGecko
const COINGECKO_IDS = {
  BTCUSDT:  'bitcoin',
  ETHUSDT:  'ethereum',
  BNBUSDT:  'binancecoin',
  SOLUSDT:  'solana',
  XRPUSDT:  'ripple',
  ADAUSDT:  'cardano',
  DOGEUSDT: 'dogecoin',
  AVAXUSDT: 'avalanche-2',
  DOTUSDT:  'polkadot',
  MATICUSDT:'matic-network',
};

// Nombre de archivo (estilo TradingView) -> dias de historia para CoinGecko.
// CoinGecko OHLC: 1=1d, 7=7d, 30=30d (granularidad auto)
const INTERVALOS = {
  '1D':  { days: 30,  label: '1D'  },
  '1H':  { days: 7,   label: '1H'  },
  '15m': { days: 1,   label: '15m' },
};

const SYMBOLS = Object.keys(COINGECKO_IDS);

// Asegura que el directorio base existe
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

function csvDeVelas(velas) {
  const cabecera = 'time,open,high,low,close,volume';
  const filas = velas.map((v) => {
    const [tiempoApertura, open, high, low, close] = v;
    return `${new Date(tiempoApertura).toISOString()},${open},${high},${low},${close},0`;
  });
  return [cabecera, ...filas].join('\n');
}

async function fetchTemporalidad(symbol, temporalidad, { days }) {
  const id = COINGECKO_IDS[symbol];
  if (!id) return;

  const url = `https://api.coingecko.com/api/v3/coins/${id}/ohlc?vs_currency=usd&days=${days}`;
  const res = await fetch(url);
  const velas = await res.json();

  if (!Array.isArray(velas)) {
    console.error(`Error en historico ${symbol} ${temporalidad}: respuesta inesperada`, velas);
    return;
  }

  // Carpeta por simbolo: data/historicos/BTCUSDT/
  const symbolDir = path.join(DIR, symbol);
  if (!fs.existsSync(symbolDir)) fs.mkdirSync(symbolDir, { recursive: true });
  fs.writeFileSync(path.join(symbolDir, `${temporalidad}.csv`), csvDeVelas(velas));
}

async function actualizarHistoricos() {
  for (const symbol of SYMBOLS) {
    for (const [temporalidad, config] of Object.entries(INTERVALOS)) {
      try {
        await fetchTemporalidad(symbol, temporalidad, config);
        // Pausa breve para no exceder rate limit de CoinGecko (10-30 req/min free)
        await new Promise(r => setTimeout(r, 1500));
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

module.exports = { startHistoricosFeed, leerHistorico, actualizarHistoricos };
