const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const DIR = path.join(__dirname, '..', 'data', 'precio');

const SYMBOLS = process.env.PRICE_SYMBOLS
  ? process.env.PRICE_SYMBOLS.split(',').map(s => s.trim())
  : ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','AVAXUSDT','DOTUSDT','MATICUSDT'];

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

async function fetchPrices() {
  try {
    const symbolsParam = JSON.stringify(SYMBOLS);
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbolsParam)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error('Feed de precios: respuesta inesperada de Binance:', JSON.stringify(data).slice(0, 100));
      return;
    }

    const ts = new Date().toISOString();
    for (const coin of data) {
      const item = {
        symbol: coin.symbol,
        price: coin.lastPrice,
        priceChangePercent: coin.priceChangePercent,
        ts,
      };
      fs.writeFileSync(path.join(DIR, `${coin.symbol}.json`), JSON.stringify(item, null, 2));
    }
    console.log(`Precios actualizados: ${data.length} símbolos (Binance)`);
  } catch (err) {
    console.error('Error en feed de precios:', err.message);
  }
}

function startPriceFeed() {
  const CADA_MS = Number(process.env.PRICE_INTERVAL_MS) || 60 * 1000;
  fetchPrices();
  setInterval(fetchPrices, CADA_MS);
}

module.exports = { startPriceFeed, fetchPrices, SYMBOLS };
