/**
 * Contrato del bus de eventos del Dashboard (EDA).
 *
 * Por qué existe: los apartados no deben conocer el router ni la lógica global del flujo.
 * Emiten intenciones (`DashboardEvent`) y el Dashboard las traduce en navegación y llamadas al servicio de sesión.
 *
 * Ejemplo mental:
 * - El apartado "Subir" emite `PROCEED_TO_COLUMN_SELECTION` cuando el usuario pulsa "Siguiente".
 * - El Dashboard escucha, valida con `ExtractionSessionService` y navega a `/columnas`.
 */

/** Rutas hijas bajo el Dashboard (alineadas con `app.routes.ts`). */
export type DashboardSectionRoute =
  | 'subir'
  | 'columnas'
  | 'vista-previa'
  | 'espacio-trabajo'
  | 'generador-sql';

/**
 * Eventos tipados del sistema.
 * Ampliación: agrega nuevas variantes aquí y maneja el `switch` en `DashboardComponent`.
 */
export type DashboardEvent =
  | {
      type: 'REQUEST_NAVIGATION';
      /** Destino deseado por el usuario (puede ser bloqueado por guards o reglas de negocio). */
      payload: { target: DashboardSectionRoute };
    }
  | {
      type: 'PROCEED_TO_COLUMN_SELECTION';
      /** El usuario terminó la subida y quiere mapear columnas. */
    }
  | {
      type: 'REQUEST_PREVIEW_FROM_MENU';
      /** Equivale al comportamiento previo de "Vista Previa" / atajo en el sidenav. */
    };
