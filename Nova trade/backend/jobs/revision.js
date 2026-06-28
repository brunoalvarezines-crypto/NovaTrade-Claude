const fs = require('fs');
const path = require('path');

const { buildContext } = require('../context');
const { askClaude } = require('../claude-client');

const LOG = path.join(__dirname, '..', 'data', 'revisiones', 'log.jsonl');
const ULTIMA = path.join(__dirname, '..', 'data', 'revisiones', 'ultima.json');

async function revisar() {
  try {
    const context = await buildContext();
    const reply = await askClaude({
      message: 'Revisión periódica: analiza el contexto actual y di si hay una oportunidad de trade ahora mismo, siguiendo tu estructura de respuesta habitual.',
      context,
    });
    const entry = { ts: Date.now(), reply };
    fs.appendFileSync(LOG, JSON.stringify(entry) + '\n');
    fs.writeFileSync(ULTIMA, JSON.stringify(entry));
  } catch (err) {
    console.error('Error en la revisión periódica:', err.message);
  }
}

/** Job opcional (ENABLE_REVIEW_JOB=true) que revisa el mercado cada 15 min. */
function startReviewJob() {
  revisar();
  setInterval(revisar, 15 * 60 * 1000);
}

module.exports = { startReviewJob };
