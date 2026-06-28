const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

function readText(file) {
  try {
    return fs.readFileSync(file, 'utf-8');
  } catch {
    return '';
  }
}

function tailLines(text, n) {
  if (!text) return '';
  const lines = text.split('\n').filter(Boolean);
  return lines.slice(-n).join('\n');
}

/**
 * Construye el bloque de contexto que se añade a cada petición a Claude:
 * precio en vivo, noticias recientes y el histórico de las 3 temporalidades
 * (1D / 1H / 15m) que el usuario exporta desde TradingView.
 */
async function buildContext() {
  const precio = readJSON(path.join(DATA, 'precios', 'latest.json'));
  const noticias = readJSON(path.join(DATA, 'noticias', 'latest.json'));
  const csv1D = tailLines(readText(path.join(DATA, 'historicos', '1D.csv')), 30);
  const csv1H = tailLines(readText(path.join(DATA, 'historicos', '1H.csv')), 30);
  const csv15m = tailLines(readText(path.join(DATA, 'historicos', '15m.csv')), 30);

  return [
    `Precio actual: ${precio ? JSON.stringify(precio) : 'sin datos'}`,
    `Noticias recientes: ${noticias ? JSON.stringify(noticias) : 'sin datos'}`,
    `Histórico 1D (últimas filas CSV):\n${csv1D || 'sin datos'}`,
    `Histórico 1H (últimas filas CSV):\n${csv1H || 'sin datos'}`,
    `Histórico 15m (últimas filas CSV):\n${csv15m || 'sin datos'}`,
  ].join('\n\n');
}

module.exports = { buildContext };
