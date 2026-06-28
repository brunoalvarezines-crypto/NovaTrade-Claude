/**
 * Valida que una respuesta del agente cumple la "Estructura de Respuesta
 * Obligatoria" definida en system-prompt.md:
 * Decisión / Estrategia (1H) / Indicadores (opcional) / Gatillo (15m) /
 * Gestión de Riesgo (SL + TP).
 *
 * Las regex buscan la PALABRA dentro del texto (no anclada al inicio de
 * línea), para que detecten igual el campo venga en negrita markdown
 * (`**Decisión:**`), con guion, o como texto plano.
 */

const DECISIONES_VALIDAS = ['OPERAR', 'NO OPERAR', 'ESPERAR'];

// "Indicadores (TradingView)" es opcional ("solo si aplica" en el prompt),
// el resto es obligatorio en toda respuesta.
const CAMPOS_OBLIGATORIOS = [
  { etiqueta: 'Decisión', regex: /Decisi[oó]n/i },
  { etiqueta: 'Estrategia (1H)', regex: /Estrategia\s*\(1H\)/i },
  { etiqueta: 'Gatillo (15m)', regex: /Gatillo\s*\(15m\)/i },
  { etiqueta: 'Gestión de Riesgo', regex: /Gesti[oó]n de Riesgo/i },
  { etiqueta: 'SL', regex: /\bSL\b\s*:/i },
  { etiqueta: 'TP', regex: /\bTP\b\s*:/i },
];

function extraerDecision(texto) {
  // "NO OPERAR" antes que "OPERAR" en la alternancia, por si acaso.
  const m = /Decisi[oó]n[^A-Za-z]*?(NO OPERAR|OPERAR|ESPERAR)/i.exec(texto);
  return m ? m[1].toUpperCase() : null;
}

/**
 * @param {string} texto - la respuesta completa del agente (texto plano/markdown).
 * @returns {{valido: boolean, errores: string[], decision: string|null}}
 */
function validarRespuesta(texto) {
  if (!texto || typeof texto !== 'string' || !texto.trim()) {
    return { valido: false, errores: ['Respuesta vacía o no es texto.'], decision: null };
  }

  const errores = [];
  for (const campo of CAMPOS_OBLIGATORIOS) {
    if (!campo.regex.test(texto)) {
      errores.push(`Falta el campo obligatorio: ${campo.etiqueta}`);
    }
  }

  const decision = extraerDecision(texto);
  if (!decision) {
    errores.push('No se encontró un valor de Decisión (debe ser OPERAR / NO OPERAR / ESPERAR).');
  } else if (!DECISIONES_VALIDAS.includes(decision)) {
    errores.push(`Valor de Decisión no reconocido: "${decision}".`);
  }

  return { valido: errores.length === 0, errores, decision };
}

module.exports = { validarRespuesta, DECISIONES_VALIDAS };
