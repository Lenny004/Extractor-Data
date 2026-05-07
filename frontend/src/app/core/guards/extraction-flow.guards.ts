import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { ExtractionSessionService } from '../services/extraction-session.service';

/**
 * Impide entrar al apartado de columnas sin un archivo subido correctamente.
 *
 * Por qué: mantiene el flujo coherente y evita llamadas HTTP con `filename` vacío.
 * Patrón: guard funcional (`CanActivateFn`) — más simple de testear que clases.
 */
export const requiereArchivoSubidoGuard: CanActivateFn = () => {
  const sesion = inject(ExtractionSessionService);
  const router = inject(Router);

  if (sesion.tieneArchivoListo()) return true;

  return router.createUrlTree(['/subir']);
};

/**
 * La vista previa necesita haber detectado columnas al menos una vez.
 * Si el usuario aún no pasó por "Selección de Columnas", lo redirigimos allí.
 */
export const requiereColumnasDetectadasGuard: CanActivateFn = () => {
  const sesion = inject(ExtractionSessionService);
  const router = inject(Router);

  if (sesion.tieneArchivoListo() && sesion.listaColumnas().length > 0) return true;

  if (!sesion.tieneArchivoListo()) return router.createUrlTree(['/subir']);

  return router.createUrlTree(['/columnas']);
};
