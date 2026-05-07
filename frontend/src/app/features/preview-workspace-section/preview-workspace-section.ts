import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { DashboardEventBusService } from '../../core/services/dashboard-event-bus.service';
import { ExtractionSessionService } from '../../core/services/extraction-session.service';

/**
 * Apartado "Vista Previa": muestra el resultado tabular + JSON derivado.
 *
 * Nota de diseño: puede montarse aunque la tabla aún esté vacía; en la práctica el guard exige columnas detectadas
 * y el flujo normal llega aquí tras una extracción exitosa.
 */
@Component({
  standalone: true,
  selector: 'app-preview-workspace-section',
  templateUrl: './preview-workspace-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewWorkspaceSectionComponent {
  readonly session = inject(ExtractionSessionService);
  private readonly eventBus = inject(DashboardEventBusService);

  volverASubir(): void {
    this.eventBus.emit({ type: 'REQUEST_NAVIGATION', payload: { target: 'subir' } });
  }

  /**
   * Volver a columnas implica limpiar el resultado (misma semántica que el monolítico).
   * Lo hacemos aquí (dominio) y luego pedimos navegación (orquestación).
   */
  volverAColumnas(): void {
    this.session.volverDesdePreviaAColumnas();
    this.eventBus.emit({ type: 'REQUEST_NAVIGATION', payload: { target: 'columnas' } });
  }

  copiarJson(): void {
    void this.session.copiarJsonAlPortapapeles();
  }
}
