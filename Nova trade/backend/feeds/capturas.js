const fs = require('fs');
const path = require('path');
const { SYMBOLS } = require('./precio');

const DIR = path.join(__dirname, '..', 'data', 'capturas');
const CADA_MS = Number(process.env.CAPTURAS_INTERVAL_MS) || 5 * 60 * 1000; // 5 min

// Nombre de archivo (estilo TradingView) -> intervalo del widget.
const INTERVALOS = { '1D': 'D', '1H': '60', '15m': '15' };

// playwright es dependencia OPCIONAL (ver package.json -> optionalDependencies):
// si no esta instalado, el feed automatico simplemente no arranca y no rompe
// nada mas del backend.
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

async function capturarTimeframe(browser, symbol, temporalidad, intervalo) {
  // Carpeta por simbolo: data/capturas/BTCUSDT/
  const symbolDir = path.join(DIR, symbol);
  if (!fs.existsSync(symbolDir)) fs.mkdirSync(symbolDir, { recursive: true });

  // Simbolo en formato TradingView (EXCHANGE:PAR)
  const tvSymbol = `BINANCE:${symbol}`;
  const url = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(tvSymbol)}&interval=${intervalo}&theme=dark&hide_top_toolbar=1`;
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2500); // deja terminar de pintar el grafico
    await page.screenshot({ path: path.join(symbolDir, `${temporalidad}.png`) });
  } finally {
    await page.close();
  }
}

async function capturarTodo() {
  if (!playwright) return;
  let browser;
  try {
    browser = await playwright.chromium.launch();
    for (const symbol of SYMBOLS) {
      for (const [temporalidad, intervalo] of Object.entries(INTERVALOS)) {
        try {
          await capturarTimeframe(browser, symbol, temporalidad, intervalo);
        } catch (err) {
          console.error(`Error captura ${symbol} ${temporalidad}:`, err.message);
        }
      }
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
  // Asegura que el directorio base existe
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  capturarTodo();
  setInterval(capturarTodo, CADA_MS);
}

module.exports = { guardarCaptura, startCapturasFeed };
