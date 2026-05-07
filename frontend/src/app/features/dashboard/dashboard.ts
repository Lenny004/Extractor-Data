import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import { DashboardEventBusService } from '../../core/services/dashboard-event-bus.service';
import { ExtractionSessionService } from '../../core/services/extraction-session.service';
import type { DashboardEvent, DashboardSectionRoute } from '../../models/dashboard-events.model';

/**
 * Dashboard: contenedor principal que orquesta la SPA de extracción.
 *
 * Responsabilidades (arquitectura limpia + EDA):
 * - Renderizar el esqueleto (sidenav + área de contenido) y el `router-outlet` de apartados lazy.
 * - Escuchar el bus de eventos y traducir intenciones en navegación y llamadas al servicio de sesión.
 * - Mantener detalles de presentación global (p. ej. ancho del contenido según la ruta).
 *
 * Por qué no metemos HTTP aquí: el acceso al backend vive en `ExtractionSessionService` para reutilizar
 * la misma lógica desde cualquier apartado sin duplicar código.
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventBus = inject(DashboardEventBusService);
  private readonly session = inject(ExtractionSessionService);

  /** URL actual (string simple) para reglas de layout; se actualiza en cada `NavigationEnd`. */
  protected readonly rutaUrl = signal(this.router.url);

  /**
   * Algunas vistas necesitan más ancho (tablas anchas). Centralizar aquí evita repetir lógica en cada hijo.
   */
  readonly usarContenidoAncho = computed(() => {
    const u = this.rutaUrl();
    return (
      u.includes('vista-previa') || u.includes('espacio-trabajo') || u.includes('generador-sql')
    );
  });

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((e) => this.rutaUrl.set(e.urlAfterRedirects));

    this.eventBus.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((evento) => this.manejarEventoDelBus(evento));
  }

  /**
   * Punto único de orquestación EDA → efectos (router + servicio).
   * Mantener este `switch` explícito ayuda a perfiles junior: se ve el mapa completo de reacciones.
   */
  private manejarEventoDelBus(evento: DashboardEvent): void {
    switch (evento.type) {
      case 'REQUEST_NAVIGATION':
        void this.navegarConReglas(evento.payload.target);
        break;
      case 'PROCEED_TO_COLUMN_SELECTION':
        this.session.iniciarSeleccionDeColumnas();
        void this.router.navigate(['columnas']);
        break;
      case 'REQUEST_PREVIEW_FROM_MENU':
        this.session.intentarAbrirVistaPreviaDesdeMenu().subscribe((ok) => {
          if (ok) void this.router.navigate(['vista-previa']);
        });
        break;
      default: {
        const exhaustivo: never = evento;
        return exhaustivo;
      }
    }
  }

  /**
   * Navegación solicitada explícitamente (por ejemplo desde breadcrumbs o apartados).
   * Aquí aplicamos reglas de “limpieza” al volver atrás en el flujo, igual que la app monolítica.
   */
  private async navegarConReglas(destino: DashboardSectionRoute): Promise<void> {
    switch (destino) {
      case 'subir': {
        if (!this.router.url.includes('/subir')) {
          this.aplicarReinicioVisualSubida();
        }
        await this.router.navigate(['subir']);
        break;
      }
      case 'columnas':
        await this.router.navigate(['columnas']);
        break;
      case 'vista-previa':
        await this.router.navigate(['vista-previa']);
        break;
      case 'espacio-trabajo':
        await this.router.navigate(['espacio-trabajo']);
        break;
      case 'generador-sql':
        await this.router.navigate(['generador-sql']);
        break;
      default: {
        const exhaustivo: never = destino;
        return exhaustivo;
      }
    }
  }

  /**
   * Comportamiento equivalente a `volverPasoSubirArchivo()` del componente monolítico:
   * limpia columnas/tablas pero conserva el archivo subido en memoria/servidor.
   */
  private aplicarReinicioVisualSubida(): void {
    this.session.reiniciarApartadoColumnasYPrevia();
  }

  /**
   * Click en el ítem “Subir” del sidenav.
   * Usamos el bus para mantener el mismo patrón que el resto de apartados (EDA consistente).
   */
  alPulsarSubirEnMenu(evento: MouseEvent): void {
    evento.preventDefault();
    this.eventBus.emit({ type: 'REQUEST_NAVIGATION', payload: { target: 'subir' } });
  }

  /**
   * Vista previa desde menú lateral: dispara extracción si aplica (misma semántica que antes).
   */
  alPulsarVistaPreviaEnMenu(evento: MouseEvent): void {
    evento.preventDefault();
    this.eventBus.emit({ type: 'REQUEST_PREVIEW_FROM_MENU' });
  }
}
