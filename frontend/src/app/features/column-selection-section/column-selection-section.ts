import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { SheetTabsComponent } from '../../components/sheet-tabs/sheet-tabs';
import { DashboardEventBusService } from '../../core/services/dashboard-event-bus.service';
import { ExtractionSessionService } from '../../core/services/extraction-session.service';

@Component({
  standalone: true,
  selector: 'app-column-selection-section',
  imports: [SheetTabsComponent],
  templateUrl: './column-selection-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnSelectionSectionComponent {
  readonly session = inject(ExtractionSessionService);
  private readonly eventBus = inject(DashboardEventBusService);

  cambiarHoja(name: string): void {
    const current = this.session.activeSheetName();
    if (name === current) return;
    this.session.activarHoja(name);
    const wf = this.session.activeWorkflow();
    if (wf && wf.columns.length === 0 && !wf.loadingColumns) {
      this.session.pedirColumnasDeHoja(name);
    }
  }

  volverASubir(): void {
    this.eventBus.emit({ type: 'REQUEST_NAVIGATION', payload: { target: 'subir' } });
  }

  extraerYContinuarAVistaPrevia(): void {
    this.session.pedirTablaAlServidor().subscribe((ok) => {
      if (!ok) return;
      this.eventBus.emit({ type: 'REQUEST_NAVIGATION', payload: { target: 'vista-previa' } });
    });
  }

  alEscribirBusqueda(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.session.alEscribirEnBusquedaColumnas(valor);
  }
}
