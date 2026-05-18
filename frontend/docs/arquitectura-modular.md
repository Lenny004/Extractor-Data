# Arquitectura modular del frontend (Angular)

> **Nota:** El repositorio usa **Angular 21**, no Vue. Los principios pedidos (módulos, EDA, lazy loading)
> se aplican aquí con el router, servicios y RxJS.

## Estructura de carpetas (alto nivel)

```
frontend/src/app/
├── app.ts / app.html / app.css          # Shell: header + router-outlet + footer
├── app.routes.ts                        # Rutas y `loadComponent` (lazy chunks)
├── core/
│   ├── guards/                          # Reglas de acceso por ruta (flujo de extracción)
│   └── services/
│       ├── dashboard-event-bus.service.ts   # Bus EDA (eventos tipados)
│       └── extraction-session.service.ts    # Estado + HTTP del dominio
├── models/                              # Tipos compartidos (sin lógica)
├── features/
│   ├── dashboard/                       # Layout + sidenav + orquestación de eventos
│   ├── upload-section/                  # Apartado: Subir
│   ├── column-selection-section/        # Apartado: Selección de columnas
│   ├── preview-workspace-section/       # Apartado: Vista previa (tabla + JSON)
│   ├── workspace-section/               # Apartado: Espacio de trabajo (evolutivo)
│   └── sql-generator-section/           # Apartado: Generador SQL (placeholder)
└── components/                          # Piezas reutilizables ya existentes (header/footer)

frontend/src/styles/
└── extraction-ui.css                    # Estilos compartidos del flujo (import global en angular.json)
```

## Event-Driven Architecture (EDA)

1. Los apartados emiten intenciones con `DashboardEventBusService.emit(...)`.
2. `DashboardComponent` escucha `events$` y ejecuta efectos:
   - navegación (`Router`)
   - orquestación de dominio (`ExtractionSessionService`)
3. El estado persistente entre pantallas vive en `ExtractionSessionService` (signals + HTTP).

### Eventos actuales

- `REQUEST_NAVIGATION`: navegar a una sección (`DashboardSectionRoute`), aplicando reglas (p. ej. limpiar columnas al volver a Subir).
- `PROCEED_TO_COLUMN_SELECTION`: cargar columnas e ir a `/columnas`.
- `REQUEST_PREVIEW_FROM_MENU`: ejecutar extracción si aplica (atajo del menú) y navegar a `/vista-previa` si tuvo éxito.

## Lazy loading

Cada apartado bajo `features/*` se carga con `loadComponent` en `app.routes.ts`, generando **chunks separados**
(visible en `ng build` como “Lazy chunk files”).

## Cómo agregar un nuevo apartado

1. **Crear carpeta** `features/mi-apartado/` con `mi-apartado.ts` + `mi-apartado.html` (standalone).
2. **Registrar ruta** en `app.routes.ts` como hijo del Dashboard con `loadComponent`.
3. **Añadir enlace** en `dashboard.html` (sidenav) con `routerLink` o patrón de eventos.
4. Si necesita coordinación global:
   - extiende el union type `DashboardEvent` en `models/dashboard-events.model.ts`;
   - maneja el nuevo caso en `DashboardComponent.manejarEventoDelBus`.
5. Si la ruta tiene prerequisitos (p. ej. archivo subido), añade un guard en `core/guards/`.

## Convención de comentarios

Los archivos nuevos incluyen comentarios orientados a mantenibilidad: propósito del archivo, por qué existe,
y puntos de extensión (guards/eventos).
