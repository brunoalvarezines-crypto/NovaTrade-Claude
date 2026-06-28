# Desplegar NovaTrade

Carpeta del proyecto: **Escritorio → Proyecto Claude → Nova trade**.

## 1. Git

Ya está inicializado (rama `main`, primer commit hecho). Si en algún momento
hay que rehacerlo desde cero:
```
cd "~/Desktop/Proyecto Claude/Nova trade"
git init
git add -A
git commit -m "NovaTrade: backend + agente Claude + PWA"
git branch -M main
```

## 2. Publicarlo en GitHub

**Aviso de seguridad:** dentro de `backend/` hay `node_modules/` (cientos de
archivos) y `.env` (tu clave real de Anthropic). El `.gitignore` los excluye,
pero **eso solo lo respeta un cliente git de verdad** — si arrastras la
carpeta entera a la web de GitHub, se sube todo igual, clave incluida.

### Opción recomendada — GitHub Desktop
No hay que seleccionar archivos a mano; respeta el `.gitignore` solo.

1. Descarga GitHub Desktop (versión **Intel**, este Mac es Intel) desde
   desktop.github.com/download.
2. Ábrelo e inicia sesión con tu cuenta de GitHub.
3. **File → Add Local Repository...** → navega a Escritorio → Proyecto
   Claude → Nova trade.
4. **Publish repository** — crea el repositorio y sube todo en un paso.

### Alternativa — subir por la web
Si prefieres no instalar nada: en github.com, crea un repositorio nuevo y
en "uploading an existing file" arrastra el contenido de la carpeta **Nova
trade**, pero **excluyendo a mano estos 3 elementos**: `.git`,
`backend/node_modules`, `backend/.env`. Usa una ventana real de Finder (no
el diálogo "choose your files", que solo deja seleccionar ficheros y no
carpetas) y deselecciona esos 3 con Cmd+clic antes de arrastrar.

Avísame cuando esté publicado y sigo con Render (paso 18).

## 3. Desplegar en Render

1. Crea una cuenta en render.com (puedes usar tu cuenta de GitHub).
2. **New → Blueprint** → conecta el repositorio de NovaTrade. Render lee
   `render.yaml` solo y detecta el servicio `novatrade` con `rootDir: backend`.
3. Te pedirá los dos secretos marcados `sync: false`: pega tu
   `ANTHROPIC_API_KEY` real y, si tienes, `NEWS_API_KEY`, directamente en el
   formulario de Render — nunca me las pegues a mí.
4. Despliega. La primera vez tarda unos minutos (`npm install` + arranque).

Recomendado: en console.anthropic.com, ponle un límite de gasto mensual a la
API key antes de activarla en producción.

## 4. Verificar que funciona

- Abre `https://<tu-servicio>.onrender.com/health` → debe responder
  `{"ok":true,...}`.
- Abre la URL raíz → debe cargar la app y poder chatear con el agente.

El plan free de Render se duerme tras ~15 min sin tráfico (primer arranque
30-50s tras dormir) y los feeds (precio/noticias) se pausan mientras duerme.

## 5. Datos reales en producción

- El feed de precio (Binance, cada segundo) arranca solo.
- El feed de noticias solo corre si configuraste `NEWS_API_KEY`.
- Los históricos (`1D.csv`, `1H.csv`, `15m.csv`) ahora se descargan solos de
  Binance cada 5 min, sin que tengas que exportarlos de TradingView ni subir
  nada a mano.
- Las capturas de TradingView también se intentan automáticas (Playwright
  contra el widget público), pero necesitan que el navegador esté instalado
  en el servidor de Render — en el plan free de Render esto puede no
  funcionar solo y quizás haya que subirlas a mano por ahora; si el feed no
  encuentra `playwright` simplemente se desactiva sin romper nada más.

## 6. Revisión periódica (opcional)

`ENABLE_REVIEW_JOB=false` por defecto. Si lo activas en Render, el agente
revisa el mercado solo cada 15 minutos y guarda el resultado en
`backend/data/revisiones/`. Decide si lo quieres antes de activarlo (consume
llamadas a la API aunque no estés usando el chat).

## 7. Instalar como PWA en el móvil

- **iPhone (Safari):** abre la URL de Render → compartir → "Añadir a pantalla
  de inicio".
- **Android (Chrome):** abre la URL → menú ⋮ → "Instalar aplicación".

## 8. Prueba final

Con la app instalada en el móvil, manda un mensaje real al agente y
confirma que responde con datos de contexto reales (no "sin datos").
