import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ExtractionSessionService } from '../services/extraction-session.service';
import { NotificationService } from '../services/notification.service';

/**
 * Impide entrar al apartado de columnas sin un archivo subido correctamente.
 *
 * Por qué: mantiene el flujo coherente y evita llamadas HTTP con `filename` vacío.
 * Patrón: guard funcional (`CanActivateFn`) — más simple de testear que clases.
 * Efecto: si el usuario intenta acceder sin archivo, muestra notificación de error.
 */
export const requiereArchivoSubidoGuard: CanActivateFn = () => {
  const sesion = inject(ExtractionSessionService);
  const router = inject(Router);
  const notificaciones = inject(NotificationService);

  if (sesion.tieneArchivoListo()) return true;

  notificaciones.error('No haz subido ningún archivo');
  return router.createUrlTree(['/subir']);
};

/**
 * La vista previa necesita haber detectado columnas al menos una vez.
 * Si el usuario aún no pasó por "Selección de Columnas", lo redirigimos allí.
 * Efecto: muestra notificación si intenta acceder sin archivo o columnas.
 */
export const requiereColumnasDetectadasGuard: CanActivateFn = () => {
  const sesion = inject(ExtractionSessionService);
  const router = inject(Router);
  const notificaciones = inject(NotificationService);

  if (!sesion.tieneArchivoListo()) {
    notificaciones.error('No haz subido ningún archivo');
    return router.createUrlTree(['/subir']);
  }

  if (sesion.hojasActivas().length === 0) {
    notificaciones.error('Selecciona al menos una hoja para procesar');
    return router.createUrlTree(['/subir']);
  }

  if (sesion.activeWorkflow() && sesion.listaColumnas().length > 0) return true;

  notificaciones.warning('Debes seleccionar columnas primero');
  return router.createUrlTree(['/columnas']);
};
