const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const OUT = path.join(__dirname, '..', 'data', 'precios-multi', 'latest.json');
const API_KEY = process.env.TWELVE_DATA_API_KEY;
const INTERVAL_MS = 30 * 60 * 1000; // cada 30 minutos

const SIMBOLOS = [
  'EUR/USD', 'GBP/USD',                      // Forex
  'XAU/USD', 'XAG/USD', 'WTI',              // Commodities (oro, plata, petróleo)
  'TSLA', 'NVDA', 'AMZN', 'AAPL', 'MSFT'   // Acciones
];

const NOMBRES = {
  'EUR/USD': 'Euro/Dólar',
  'GBP/USD': 'Libra/Dólar',
  'XAU/USD': 'Oro',
  'XAG/USD': 'Plata',
  'WTI':     'Petróleo WTI',
  'TSLA':    'Tesla',
  'NVDA':    'Nvidia',
  'AMZN':    'Amazon',
  'AAPL':    'Apple',
  'MSFT':    'Microsoft'
};

async function fetchPrecios() {
  if (!API_KEY) {
    console.warn('[precio-multi] TWELVE_DATA_API_KEY no configurada — feed deshabilitado');
    return;
  }
  try {
    const simbolosStr = SIMBOLOS.join(',');
    const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(simbolosStr)}&apikey=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    const precios = {};
    for (const simbolo of SIMBOLOS) {
      const entry = data[simbolo] || data;
      if (entry && entry.price) {
        precios[simbolo] = {
          precio: entry.price,
          nombre: NOMBRES[simbolo] || simbolo
        };
      }
    }

    fs.writeFileSync(OUT, JSON.stringify({ ts: Date.now(), precios }));
    console.log(`[precio-multi] Actualizados ${Object.keys(precios).length} activos`);
  } catch (err) {
    console.error('[precio-multi] Error:', err.message);
  }
}

function startPrecioMultiFeed() {
  fetchPrecios();
  setInterval(fetchPrecios, INTERVAL_MS);
}

module.exports = { startPrecioMultiFeed };
