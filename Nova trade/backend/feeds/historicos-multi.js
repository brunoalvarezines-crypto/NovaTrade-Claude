const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const DIR = path.join(__dirname, '..', 'data', 'historicos-multi');
const API_KEY = process.env.TWELVE_DATA_API_KEY;
const INTERVAL_MS = 8 * 60 * 60 * 1000; // cada 8 horas
const OUTPUTSIZE = 30;
const DELAY_MS = 8000; // 8s entre peticiones para no superar 8 req/min

const SIMBOLOS = [
  'EUR/USD', 'GBP/USD',
  'XAU/USD', 'XAG/USD', 'WTI',
  'TSLA', 'NVDA', 'AMZN', 'AAPL', 'MSFT'
];

// Twelve Data intervals
const INTERVALOS = { '1D': '1day', '1H': '1h', '15m': '15min' };

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function csvDeVelas(values) {
  const cabecera = 'tiempo,apertura,maximo,minimo,cierre,volumen';
  const filas = values.map(v =>
    `${v.datetime},${v.open},${v.high},${v.low},${v.close},${v.volume || 0}`
  );
  return [cabecera, ...filas].join('\n');
}

function nombreArchivo(simbolo, temporalidad) {
  return simbolo.replace('/', '_') + '_' + temporalidad + '.csv';
}

async function fetchHistorico(simbolo, temporalidad, intervaloTD) {
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(simbolo)}&interval=${intervaloTD}&outputsize=${OUTPUTSIZE}&apikey=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.values || !Array.isArray(data.values)) {
    throw new Error(data.message || JSON.stringify(data));
  }
  fs.writeFileSync(path.join(DIR, nombreArchivo(simbolo, temporalidad)), csvDeVelas(data.values));
}

async function actualizarHistoricosMulti() {
  if (!API_KEY) return;
  let ok = 0, errores = 0;
  for (const simbolo of SIMBOLOS) {
    for (const [temporalidad, intervaloTD] of Object.entries(INTERVALOS)) {
      try {
        await fetchHistorico(simbolo, temporalidad, intervaloTD);
        ok++;
      } catch (err) {
        errores++;
        console.error(`[historicos-multi] ${simbolo} ${temporalidad}: ${err.message}`);
      }
      await sleep(DELAY_MS);
    }
  }
  console.log(`[historicos-multi] ${ok} OK, ${errores} errores`);
}

function leerHistoricoMulti(simbolo, temporalidad) {
  try {
    const lines = fs.readFileSync(path.join(DIR, nombreArchivo(simbolo, temporalidad)), 'utf-8')
      .split('\n').filter(Boolean);
    return lines.slice(-31).join('\n'); // header + últimas 30 velas
  } catch {
    return null;
  }
}

function startHistoricosMultiFeed() {
  actualizarHistoricosMulti();
  setInterval(actualizarHistoricosMulti, INTERVAL_MS);
}

module.exports = { leerHistoricoMulti, startHistoricosMultiFeed };
