# Estilos modulares del flujo de extracción

Punto de entrada global: `../extraction-ui.css` (importado desde `angular.json`).

## Archivos

| Archivo | Propósito |
|--------|-----------|
| `common.css` | Cabecera de tarjeta (`.card-header*`), botones (`.btn--primary`, `.btn--compact`, `.btn--back`), banners de alerta (`.alert-banner*`). |
| `extraction-layout.css` | Layout del dashboard: `.main`, `.main__content`, `.side-menu*`. |
| `extraction-card.css` | Contenedor de paso: `.card`, `.card__step-*`, `.card__body`. |
| `extraction-upload-zone.css` | Zona de carga: `.upload-zone*`. |
| `extraction-file-info.css` | Ficha del archivo: `.file-info*`. |
| `extraction-options-grid.css` | Grid de opciones del paso 1: `.options-grid`. |
| `extraction-field.css` | Campo con etiqueta: `.field*`. |
| `extraction-progress.css` | Progreso de procesamiento: `.progress-block*`. |
| `extraction-card-footer.css` | Pie de tarjeta: `.card-footer*`, modificador `--between`, elemento `__tip`. |
| `extraction-info-cards.css` | Tarjetas informativas: `.info-grid`, `.info-card*`. |
| `extraction-breadcrumb.css` | Migas: `.breadcrumb*`. |
| `extraction-column-selection.css` | Paso 2: columnas, tabla, vista previa, workspace y paginación. |
| `extraction-responsive.css` | Media queries que afectan a varios bloques. |
| `extraction-json-preview.css` | Bloque JSON y botón copiar: `.json-preview*`, `.btn-copy*`. |

## Notas

- Las variables de color y tipografía siguen en `src/styles.css` (`:root`).
- No alterar el orden de los `@import` en `extraction-ui.css` salvo que se entienda el impacto en la cascada.
