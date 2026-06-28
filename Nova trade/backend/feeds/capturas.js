const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'data', 'capturas');
// Símbolo en formato TradingView (EXCHANGE:PAR). Por defecto deriva del
// mismo símbolo que usa el feed de precio, asumiendo Binance.
const SYMBOL = process.env.TV_SYMBOL || `BINANCE:${process.env.PRICE_SYMBOL || 'BTCUSDT'}`;
const CADA_MS = Number(process.env.CAPTURAS_INTERVAL_MS) || 5 * 60 * 1000; // 5 min

// Nombre de archivo (estilo TradingView) -> intervalo del widget.
const INTERVALOS = { '1D': 'D', '1H': '60', '15m': '15' };

// playwright es dependencia OPCIONAL (ver package.json -> optionalDependencies):
// si no está instalado, el feed automático simplemente no arranca y no rompe
// nada más del backend.
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = null;
}

/** Guarda una captura que ya llega en base64 (subida a mano o desde la app). */
function guardarCaptura(nombre, dataUrl) {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(dataUrl);
  if (!match) return false;
  fs.writeFileSync(path.join(DIR, nombre), Buffer.from(match[1], 'base64'));
  return true;
}

function leerUltimaCaptura(nombre = '1D.png') {
  try {
    return fs.readFileSync(path.join(DIR, nombre));
  } catch {
    return null;
  }
}

/**
 * Abre el widget PÚBLICO de TradingView (sin login) para un timeframe y
 * guarda el PNG. Limitación conocida: al no haber sesión, no refleja
 * indicadores ni layouts personalizados — solo precio + velas, igual que la
 * versión original de este feed.
 */
async function capturarTimeframe(browser, temporalidad, intervalo) {
  const url = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(SYMBOL)}&interval=${intervalo}&theme=dark&hide_top_toolbar=1`;
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2500); // deja terminar de pintar el gráfico
    await page.screenshot({ path: path.join(DIR, `${temporalidad}.png`) });
  } finally {
    await page.close();
  }
}

async function capturarTodo() {
  if (!playwright) return;
  let browser;
  try {
    browser = await playwright.chromium.launch();
    for (const [temporalidad, intervalo] of Object.entries(INTERVALOS)) {
      await capturarTimeframe(browser, temporalidad, intervalo);
    }
  } catch (err) {
    console.error('Error en feed de capturas:', err.message);
  } finally {
    if (browser) await browser.close();
  }
}

function startCapturasFeed() {
  if (!playwright) {
    console.log('Feed de capturas desactivado: falta "playwright". Corre "npm install" y "npx playwright install chromium" para activarlo.');
    return;
  }
  capturarTodo();
  setInterval(capturarTodo, CADA_MS);
}

module.exports = { guardarCaptura, leerUltimaCaptura, startCapturasFeed };
