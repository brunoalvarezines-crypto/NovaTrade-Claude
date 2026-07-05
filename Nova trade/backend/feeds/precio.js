const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const DIR = path.join(__dirname, '..', 'data', 'precio');

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

const SYMBOLS = process.env.PRICE_SYMBOLS
  ? process.env.PRICE_SYMBOLS.split(',').map(s => s.trim())
  : Object.keys(COINGECKO_IDS);

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

async function fetchPrices() {
  try {
    const ids = SYMBOLS.map(s => COINGECKO_IDS[s] || s.toLowerCase().replace('usdt', '')).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`;
    const res = await fetch(url);

    // Leer como texto primero para detectar rate limit ANTES de parsear JSON
    const text = await res.text();
    if (res.status === 429 || text.toLowerCase().includes('throttled')) {
      console.log('Rate limit CoinGecko (precio). Reintentando en 90s...');
      setTimeout(fetchPrices, 90000);
      return;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Feed de precios: respuesta no válida de CoinGecko:', text.slice(0, 80));
      return;
    }

    if (!data || typeof data !== 'object') {
      console.error('Respuesta inesperada de CoinGecko:', data);
      return;
    }

    const ts = new Date().toISOString();
    for (const symbol of SYMBOLS) {
      const id = COINGECKO_IDS[symbol] || symbol.toLowerCase().replace('usdt', '');
      const coin = data[id];
      if (!coin) continue;
      const item = {
        symbol,
        price: String(coin.usd),
        priceChangePercent: coin.usd_24h_change ? coin.usd_24h_change.toFixed(2) : '0',
        ts,
      };
      fs.writeFileSync(path.join(DIR, `${symbol}.json`), JSON.stringify(item, null, 2));
    }
    console.log(`Precios actualizados: ${SYMBOLS.length} símbolos`);
  } catch (err) {
    console.error('Error en feed de precios:', err.message);
  }
}

function startPriceFeed() {
  const CADA_MS = Number(process.env.PRICE_INTERVAL_MS) || 90 * 1000;
  fetchPrices();
  setInterval(fetchPrices, CADA_MS);
}

module.exports = { startPriceFeed, fetchPrices, SYMBOLS };
