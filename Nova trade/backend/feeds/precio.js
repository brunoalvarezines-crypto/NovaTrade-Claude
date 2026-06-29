const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const DIR = path.join(__dirname, '..', 'data', 'precios');

// Lista de simbolos a monitorear (pares de Binance)
// Se puede sobreescribir via variable de entorno PRICE_SYMBOLS (separados por coma)
const SYMBOLS = process.env.PRICE_SYMBOLS
  ? process.env.PRICE_SYMBOLS.split(',').map(s => s.trim())
  : ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
     'ADAUSDT', 'DOGEUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT'];

// Asegura que el directorio de salida existe
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

async function fetchPrices() {
  try {
    // Binance permite multiples simbolos en una sola llamada
    const url = `https://api.binance.com/api/v3/ticker/price?symbols=["${SYMBOLS.join('","')}"]`;
    const res = await fetch(url);
    const data = await res.json();

    if (!Array.isArray(data)) {
      console.error('Respuesta inesperada de Binance:', data);
      return;
    }

    const ts = Date.now();
    const resultado = {};

    for (const item of data) {
      resultado[item.symbol] = { symbol: item.symbol, price: item.price, ts };
      // Guarda un archivo individual por simbolo: latest_BTCUSDT.json
      const out = path.join(DIR, `latest_${item.symbol}.json`);
      fs.writeFileSync(out, JSON.stringify({ ...item, ts }));
    }

    // Guarda tambien un archivo consolidado con todos los precios
    fs.writeFileSync(path.join(DIR, 'latest_all.json'), JSON.stringify(resultado, null, 2));

  } catch (err) {
    console.error('Error en feed de precios:', err.message);
  }
}

function startPriceFeed() {
  fetchPrices();
  setInterval(fetchPrices, 5000); // cada 5 segundos (10 simbolos, 1 llamada)
}

module.exports = { startPriceFeed, SYMBOLS };
