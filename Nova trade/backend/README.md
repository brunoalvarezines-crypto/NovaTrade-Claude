# NovaTrade — backend

Backend Node/Express que sirve la PWA (`public/`) y expone el agente Claude
en `/chat`, para que la clave de Anthropic viva solo en el servidor.

## Endpoints
- `GET /health` — comprobación de estado, usada por la app y por Render.
- `POST /chat` — `{ message, image? }` → `{ reply }`. `image` es opcional,
  una data URL base64 (`data:image/png;base64,...`).

## Desarrollo local
```
npm install
cp .env.example .env   # y pega tu ANTHROPIC_API_KEY real
npm start
```

## Validar la estructura de respuesta
- `validar-respuesta.js` — comprueba que un texto cumple la "Estructura de
  Respuesta Obligatoria" (Decisión / Estrategia (1H) / Gatillo (15m) /
  Gestión de Riesgo con SL y TP; "Indicadores" es opcional) y que la
  Decisión sea `OPERAR`, `NO OPERAR` o `ESPERAR`. Robusto a markdown en
  negrita (`**Decisión:**`).
- `npm run test:respuesta` — con el servidor corriendo (`npm start`), manda
  una pregunta real a `/chat` y valida la respuesta con lo anterior.
  Variables opcionales: `TEST_URL`, `TEST_PREGUNTA`.

## Variables de entorno (`.env`, nunca se sube a git)
- `ANTHROPIC_API_KEY` — obligatoria.
- `NEWS_API_KEY` — opcional, si falta el feed de noticias simplemente no corre.
- `PRICE_SYMBOL` — símbolo para el feed de precio (por defecto `BTCUSDT`).
- `ENABLE_REVIEW_JOB` — `true` para activar la revisión periódica automática.
- `PORT` — puerto del servidor (Render lo asigna solo).

## Datos dinámicos (`data/`)
- `precios/latest.json` — último precio (feed cada segundo, Binance).
- `noticias/latest.json` — últimas noticias (feed cada minuto, si hay `NEWS_API_KEY`).
- `historicos/1D.csv`, `1H.csv`, `15m.csv` — velas de Binance (misma fuente que
  TradingView para pares cripto), descargadas automáticamente cada 5 min. No
  necesita API key. Configurable con `HISTORICOS_INTERVAL_MS`.
- `capturas/1D.png`, `1H.png`, `15m.png` — capturas automáticas del widget
  público de TradingView (sin login) vía Playwright, cada 5 min. Si
  `playwright` no está instalado, este feed simplemente no arranca (no rompe
  el resto del backend) y puedes seguir subiendo capturas a mano con
  `guardarCaptura()`. Para activarlo: `npm install` (ya incluye `playwright`
  como dependencia opcional) y luego `npx playwright install chromium` una
  vez, para descargar el navegador. Configurable con `TV_SYMBOL` (formato
  `EXCHANGE:PAR`, por defecto deriva de `PRICE_SYMBOL`) y
  `CAPTURAS_INTERVAL_MS`. Limitación conocida: al no haber sesión iniciada,
  no refleja indicadores ni layouts personalizados, solo precio y velas; y es
  la pieza más frágil si TradingView cambia su web o detecta el bot.
- `revisiones/` — log de la revisión periódica (si está activada).

Nada de esto se sube a git salvo la estructura de carpetas (`.gitkeep`).
