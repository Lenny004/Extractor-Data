# Plan actualizado: paso 3 (tabla) y extracción

Este documento sustituye/actualiza el plan técnico anterior con una versión **en lenguaje simple** y con el estado **ya aplicado en el código** del repo.

---

## Explicación “peras y manzanas”

1. **Subes el Excel** (paso 1). El servidor lo guarda y te devuelve un **nombre interno** del archivo (`idArchivoEnServidor`). No es el nombre que ves en tu carpeta; es como la etiqueta del cajón donde lo guardó el servidor.

2. **Marca columnas** (paso 2). Ves la lista de columnas y con la casilla eliges cuáles quieres. En código eso son `posicionesColumnasElegidas` (números 0, 1, 2…).

3. **Ver tabla** (paso 3). La app manda al servidor: nombre interno + fila de títulos + números de columnas elegidas. El servidor contesta con **títulos** y **filas**. La pantalla solo **pinta** eso; el navegador no “abre el Excel” otra vez.

---

## Qué endpoint usa el paso 3 (importante)

- Debe ser **`POST /api/extract`** en `http://localhost:3000`.
- Antes el frontend apuntaba por error a **`/api/viewer`**, que no existe en el backend → fallo (muchas veces 404) y mensaje poco claro.
- **Corregido** en [`frontend/src/app/app.ts`](../../frontend/src/app/app.ts): constante `URL_SERVIDOR` y ruta `${URL_SERVIDOR}/api/extract`.

---

## Cómo leer el código ahora (nombres en español)

| Idea | Variable / método |
|------|-------------------|
| En qué pantalla estás (1, 2 o 3) | `pasoVisual` |
| Nombre interno del archivo en el servidor | `idArchivoEnServidor` |
| Fila del Excel donde están los títulos | `filaEncabezados` |
| Lista de columnas con casillas | `listaColumnas` (`ColumnaExcel`: `posicion`, `titulo`, `elegida`, …) |
| Ir del 1 al 2 | `irPasoElegirColumnas()` |
| Pedir la tabla y pasar al 3 | `pedirTablaAlServidorYMostrarPaso3()` |
| Títulos y celdas de la tabla del paso 3 | `titulosTabla`, `filasTabla` |
| Si falló la petición de la tabla | `mensajeErrorTabla` |
| Mientras espera la tabla | `esperandoRespuestaTabla` |

La plantilla [`frontend/src/app/app.html`](../../frontend/src/app/app.html) usa los mismos nombres.

---

## Si algo falla

1. Arranca el backend (puerto **3000**).
2. En el navegador, **F12 → Red**, pulsa de nuevo “Siguiente: ver datos extraídos” y mira el **código HTTP** y el cuerpo de la respuesta.
3. El mensaje en rojo en el paso 2 intenta decir si fue **sin respuesta** (servidor apagado) u **HTTP** (incluido 404 si la ruta no coincide).

---

## Archivos tocados en esta iteración

- [`frontend/src/app/app.ts`](../../frontend/src/app/app.ts) — refactor nombres español, `URL_SERVIDOR`, `POST /api/extract`, errores más claros.
- [`frontend/src/app/app.html`](../../frontend/src/app/app.html) — enlaces a los nuevos nombres y `#inputArchivo`.
- Este plan: [`.cursor/plans/paso-3-extraccion-tabla.md`](paso-3-extraccion-tabla.md).

---

## Checklist rápido (dev)

- [ ] `GET http://localhost:3000/api/health` responde OK.
- [ ] Subir archivo → existe fichero en `backend/uploads/` con el `idArchivoEnServidor` que devuelve upload.
- [ ] Paso 2 carga columnas; al menos una `elegida`.
- [ ] Paso 3: `POST /api/extract` devuelve `success: true` y `data.headers` / `data.rows`.
