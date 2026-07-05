const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const DIR = path.join(__dirname, '..', 'data', 'precio');
const PRECIOS_DIR = path.join(__dirname, '..', 'data', 'precios');

const SYMBOLS = process.env.PRICE_SYMBOLS
  ? process.env.PRICE_SYMBOLS.split(',').map(s => s.trim())
  : ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','AVAXUSDT','DOTUSDT','MATICUSDT'];

if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
if (!fs.existsSync(PRECIOS_DIR)) fs.mkdirSync(PRECIOS_DIR, { recursive: true });

async function fetchPrices() {
  try {
    const results = await Promise.allSettled(
      SYMBOLS.map(symbol =>
        fetch(`https://api.binance.us/api/v3/ticker/24hr?symbol=${symbol}`)
          .then(r => r.json())
      )
    );

    const ts = new Date().toISOString();
    let count = 0;
    const allPrices = {};
    for (let i = 0; i < SYMBOLS.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value && result.value.lastPrice) {
        const ticker = result.value;
        const item = {
          symbol: SYMBOLS[i],
          price: parseFloat(ticker.lastPrice).toFixed(2),
          priceChangePercent: parseFloat(ticker.priceChangePercent).toFixed(2),
          ts,
        };
        fs.writeFileSync(path.join(DIR, `${SYMBOLS[i]}.json`), JSON.stringify(item, null, 2));
        allPrices[SYMBOLS[i]] = item;
        count++;
      } else {
        const err = result.reason?.message || JSON.stringify(result.value || '').slice(0, 80);
        console.warn(`Sin precio para ${SYMBOLS[i]}:`, err);
      }
    }
    fs.writeFileSync(path.join(PRECIOS_DIR, 'latest.json'), JSON.stringify(allPrices, null, 2));
    console.log(`Precios actualizados: ${count} símbolos (Binance.US)`);
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
