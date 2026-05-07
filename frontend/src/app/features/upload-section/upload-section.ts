import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';

import { DashboardEventBusService } from '../../core/services/dashboard-event-bus.service';
import { ExtractionSessionService } from '../../core/services/extraction-session.service';

/**
 * Apartado "Subir": responsabilidad única = capturar el archivo y opciones básicas (fila de encabezado).
 *
 * Comunicación EDA:
 * - No navega directamente al paso 2: emite `PROCEED_TO_COLUMN_SELECTION` para que el Dashboard coordine
 *   la carga de columnas + `router.navigate`.
 *
 * Estado: lee/escribe vía `ExtractionSessionService` (fuente única de verdad del dominio).
 */
@Component({
  standalone: true,
  selector: 'app-upload-section',
  templateUrl: './upload-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadSectionComponent {
  /** Sesión compartida: evita prop-drilling entre muchos niveles de componentes. */
  readonly session = inject(ExtractionSessionService);

  private readonly eventBus = inject(DashboardEventBusService);

  /** Referencia al input file oculto (misma técnica que el componente monolítico). */
  private readonly inputArchivo = viewChild<ElementRef<HTMLInputElement>>('inputArchivo');

  /**
   * Dispara el selector nativo de archivos.
   * Por qué existe: separa la intención UX (click en zona) del detalle del DOM.
   */
  abrirSelectorArchivo(): void {
    this.inputArchivo()?.nativeElement.click();
  }

  /**
   * El botón “Siguiente” no debe asumir rutas: delega en el Dashboard vía bus de eventos.
   */
  solicitarPasoSeleccionColumnas(): void {
    this.eventBus.emit({ type: 'PROCEED_TO_COLUMN_SELECTION' });
  }
}
