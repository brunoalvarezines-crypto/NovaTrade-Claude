const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data', 'precio');

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

// Lista de simbolos a monitorear
// Se puede sobreescribir via variable de entorno PRICE_SYMBOLS (separados por coma)
const SYMBOLS = process.env.PRICE_SYMBOLS
  ? process.env.PRICE_SYMBOLS.split(',').map(s => s.trim())
  : Object.keys(COINGECKO_IDS);

// Asegura que el directorio de salida existe
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

async function fetchPrices() {
  try {
    const ids = SYMBOLS.map(s => COINGECKO_IDS[s] || s.toLowerCase().replace('usdt','')).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data || typeof data !== 'object') {
      console.error('Respuesta inesperada de CoinGecko:', data);
      return;
    }

    const ts = new Date().toISOString();
    const resultado = {};

    for (const symbol of SYMBOLS) {
      const id = COINGECKO_IDS[symbol] || symbol.toLowerCase().replace('usdt','');
      const coin = data[id];
      if (!coin) continue;

      const item = {
        symbol,
        price: String(coin.usd),
        priceChangePercent: coin.usd_24h_change ? coin.usd_24h_change.toFixed(2) : '0',
        lastUpdated: new Date(coin.last_updated_at * 1000).toISOString(),
        ts,
      };
      resultado[symbol] = item;

      // Guarda un archivo individual por simbolo: latest_BTCUSDT.json
      const out = path.join(DIR, `latest_${symbol}.json`);
      fs.writeFileSync(out, JSON.stringify(item));
    }

    // Guarda tambien un archivo consolidado con todos los precios
    fs.writeFileSync(path.join(DIR, 'latest_all.json'), JSON.stringify(resultado, null, 2));

  } catch (err) {
    console.error('Error en feed de precios:', err.message);
  }
}

function startPriceFeed() {
  fetchPrices();
  setInterval(fetchPrices, 30000); // CoinGecko free: max ~30 req/min, usamos 30s
}

module.exports = { startPriceFeed, fetchPrices, SYMBOLS };
