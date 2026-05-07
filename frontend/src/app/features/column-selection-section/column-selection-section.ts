import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { DashboardEventBusService } from '../../core/services/dashboard-event-bus.service';
import { ExtractionSessionService } from '../../core/services/extraction-session.service';

/**
 * Apartado "Selección de Columnas": permite filtrar, paginar y marcar columnas a extraer.
 *
 * EDA:
 * - La navegación hacia atrás/adelante se expresa como eventos `REQUEST_NAVIGATION` para que el Dashboard
 *   aplique reglas globales (guards ya protegen rutas, pero el bus mantiene el patrón consistente).
 * - La extracción (`pedirTablaAlServidor`) regresa un `Observable<boolean>`: si es exitoso, emitimos navegación.
 */
@Component({
  standalone: true,
  selector: 'app-column-selection-section',
  templateUrl: './column-selection-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnSelectionSectionComponent {
  readonly session = inject(ExtractionSessionService);
  private readonly eventBus = inject(DashboardEventBusService);

  volverASubir(): void {
    this.eventBus.emit({ type: 'REQUEST_NAVIGATION', payload: { target: 'subir' } });
  }

  /**
   * Extrae datos y, solo si el servidor respondió OK, pide navegar a la vista previa.
   * Importante: no navegamos si `ok` es false para no mostrar una pantalla vacía.
   */
  extraerYContinuarAVistaPrevia(): void {
    this.session.pedirTablaAlServidor().subscribe((ok) => {
      if (!ok) return;
      this.eventBus.emit({ type: 'REQUEST_NAVIGATION', payload: { target: 'vista-previa' } });
    });
  }

  /**
   * Adaptador de evento DOM → servicio (mantiene el template simple y tipado).
   */
  alEscribirBusqueda(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.session.alEscribirEnBusquedaColumnas(valor);
  }
}
