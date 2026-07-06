const fs = require('fs');
const path = require('path');

// Las carpetas de data/ solo existen en git gracias a archivos ".gitkeep"
// (ocultos). Subir el proyecto arrastrando la carpeta a la web de GitHub
// (en vez de con un cliente git real) puede no incluir archivos ocultos,
// y entonces estas carpetas no llegan al repo ni al servidor de Render.
// Esto las crea solas al arrancar, para que los feeds nunca fallen por
// "no existe la carpeta".
const SUBCARPETAS = ['precios', 'noticias', 'historicos', 'capturas', 'revisiones', 'precios-multi', 'historicos-multi'];

function ensureDataDirs() {
  for (const sub of SUBCARPETAS) {
    fs.mkdirSync(path.join(__dirname, 'data', sub), { recursive: true });
  }
}

module.exports = { ensureDataDirs };
