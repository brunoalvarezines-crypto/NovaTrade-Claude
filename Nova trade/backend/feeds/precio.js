const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT = path.join(__dirname, '..', 'data', 'precios', 'latest.json');
const SYMBOL = process.env.PRICE_SYMBOL || 'BTCUSDT';

async function fetchPrice() {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${SYMBOL}`);
    const data = await res.json();
    fs.writeFileSync(OUT, JSON.stringify({ ...data, ts: Date.now() }));
  } catch (err) {
    console.error('Error en feed de precio:', err.message);
  }
}

function startPriceFeed() {
  fetchPrice();
  setInterval(fetchPrice, 1000); // cada segundo
}

module.exports = { startPriceFeed };
