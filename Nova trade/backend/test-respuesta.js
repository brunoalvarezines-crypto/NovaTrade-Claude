#!/usr/bin/env node
/**
 * Prueba end-to-end real: manda una pregunta al agente vía POST /chat
 * (el servidor tiene que estar corriendo, con un ANTHROPIC_API_KEY válido
 * en .env) y valida la respuesta con validar-respuesta.js.
 *
 * Uso:
 *   npm start                 # en una terminal
 *   npm run test:respuesta    # en otra
 *
 * Variables opcionales:
 *   TEST_URL      - base del servidor (por defecto http://localhost:PORT)
 *   TEST_PREGUNTA - pregunta a mandar (por defecto una genérica)
 */

const fetch = require('node-fetch');
const { validarRespuesta } = require('./validar-respuesta');

const BASE_URL = process.env.TEST_URL || `http://localhost:${process.env.PORT || 3000}`;
const PREGUNTA =
  process.env.TEST_PREGUNTA || '¿Qué decisión tomarías ahora mismo con el contexto de mercado actual?';

async function main() {
  console.log(`Mandando pregunta a ${BASE_URL}/chat ...`);

  let res;
  try {
    res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: PREGUNTA }),
    });
  } catch (err) {
    console.error(`No se pudo conectar a ${BASE_URL}. ¿Está el servidor corriendo ("npm start")?`);
    console.error(err.message);
    process.exitCode = 1;
    return;
  }

  if (!res.ok) {
    const texto = await res.text();
    console.error(`El servidor respondió ${res.status}: ${texto}`);
    process.exitCode = 1;
    return;
  }

  const { reply } = await res.json();
  console.log('--- Respuesta del agente ---');
  console.log(reply);
  console.log('----------------------------');

  const { valido, errores, decision } = validarRespuesta(reply);
  if (valido) {
    console.log(`Estructura válida. Decisión: ${decision}`);
    process.exitCode = 0;
  } else {
    console.error('Estructura inválida:');
    errores.forEach((e) => console.error(`  - ${e}`));
    process.exitCode = 1;
  }
}

main();
