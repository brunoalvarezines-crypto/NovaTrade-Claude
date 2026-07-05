const fs = require('fs');
const path = require('path');

let SYMBOLS;
try {
  ({ SYMBOLS } = require('./precio'));
} catch {
  SYMBOLS = ['BTCUSDT'];
}

const DIR = path.join(__dirname, '..', 'data', 'capturas');
const CADA_MS = Number(process.env.CAPTURAS_INTERVAL_MS) || 10 * 60 * 1000;
const INTERVALOS = { '1D': 'D', '1H': '60', '15m': '15' };

let playwright;
try { playwright = require('playwright'); } catch { playwright = null; }

function guardarCaptura(nombre, dataUrl) {
  const match = /^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/.exec(dataUrl);
  if (!match) return false;
  fs.writeFileSync(path.join(DIR, nombre), Buffer.from(match[1], 'base64'));
  return true;
}

function leerUltimaCaptura(symbol = 'BTCUSDT', temporalidad = '1D') {
  try { return fs.readFileSync(path.join(DIR, symbol, `${temporalidad}.png`)); }
  catch { return null; }
}

async function capturarTimeframe(browser, symbol, temporalidad, intervalo) {
  const url = `https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent('BINANCE:' + symbol)}&interval=${intervalo}&theme=dark&hide_top_toolbar=1`;
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);
    const dir = path.join(DIR, symbol);
    fs.mkdirSync(dir, { recursive: true });
    await page.screenshot({ path: path.join(dir, `${temporalidad}.png`) });
    console.log(`Captura OK: ${symbol} ${temporalidad}`);
  } catch (err) {
    console.error(`Error captura ${symbol} ${temporalidad}: ${err.message}`);
  } finally {
    await page.close();
  }
}

async function capturarTodo() {
  if (!playwright) return;
  for (const symbol of SYMBOLS) {
    let browser;
    try {
      browser = await playwright.chromium.launch({
        args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      });
      for (const [temporalidad, intervalo] of Object.entries(INTERVALOS)) {
        await capturarTimeframe(browser, symbol, temporalidad, intervalo);
      }
    } catch (err) {
      console.error(`Error en capturas de ${symbol}:`, err.message);
    } finally {
      if (browser) await browser.close().catch(() => {});
    }
  }
}
function startCapturasFeed() {
  if (!playwright) {
    console.log('Feed de capturas desactivado: falta "playwright".');
    return;
  }
  capturarTodo();
  setInterval(capturarTodo, CADA_MS);
}

module.exports = { guardarCaptura, leerUltimaCaptura, startCapturasFeed };
