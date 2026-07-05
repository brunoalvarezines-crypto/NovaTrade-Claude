const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const DIR = path.join(__dirname, '..', 'data', 'precio');

const COINCAP_IDS = {
  BTCUSDT:  'bitcoin',
  ETHUSDT:  'ethereum',
  BNBUSDT:  'binance-coin',
  SOLUSDT:  'solana',
  XRPUSDT:  'ripple',
  ADAUSDT:  'cardano',
  DOGEUSDT: 'dogecoin',
  AVAXUSDT: 'avalanche',
  DOTUSDT:  'polkadot',
  MATICUSDT:'matic-network',
};

const SYMBOLS = process.env.PRICE_SYMBOLS
  ? process.env.PRICE_SYMBOLS.split(',').map(s => s.trim())
  : Object.keys(COINCAP_IDS);

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

async function fetchPrices() {
  try {
    const ids = SYMBOLS.map(s => COINCAP_IDS[s]).filter(Boolean).join(',');
    const url = `https://api.coincap.io/v2/assets?ids=${ids}`;
    const res = await fetch(url);
    const json = await res.json();

    if (!json.data || !Array.isArray(json.data)) {
      console.error('Feed de precios: respuesta inesperada de CoinCap:', JSON.stringify(json).slice(0, 100));
      return;
    }

    const ts = new Date().toISOString();
    for (const coin of json.data) {
      const symbol = Object.keys(COINCAP_IDS).find(k => COINCAP_IDS[k] === coin.id);
      if (!symbol) continue;
      const item = {
        symbol,
        price: parseFloat(coin.priceUsd).toFixed(2),
        priceChangePercent: parseFloat(coin.changePercent24Hr).toFixed(2),
        ts,
      };
      fs.writeFileSync(path.join(DIR, `${symbol}.json`), JSON.stringify(item, null, 2));
    }
    console.log(`Precios actualizados: ${json.data.length} símbolos (CoinCap)`);
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
