import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { SheetTabsComponent } from '../../components/sheet-tabs/sheet-tabs';
import { DashboardEventBusService } from '../../core/services/dashboard-event-bus.service';
import { ExtractionSessionService } from '../../core/services/extraction-session.service';

@Component({
  standalone: true,
  selector: 'app-preview-workspace-section',
  imports: [SheetTabsComponent],
  templateUrl: './preview-workspace-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewWorkspaceSectionComponent {
  readonly session = inject(ExtractionSessionService);
  private readonly eventBus = inject(DashboardEventBusService);

  readonly paginaParaSaltar = signal('');

  cambiarHoja(name: string): void {
    const current = this.session.activeSheetName();
    if (name === current) return;
    this.session.activarHoja(name);
  }

  extraerHojaActiva(): void {
    const wf = this.session.activeWorkflow();
    if (!wf) return;
    this.session.pedirTablaDeHoja(wf.sheetName).subscribe((ok) => {
      if (ok) {
        this.sincronizarInputPaginaConSesion();
      }
    });
  }

  volverASubir(): void {
    this.eventBus.emit({ type: 'REQUEST_NAVIGATION', payload: { target: 'subir' } });
  }

  volverAColumnas(): void {
    this.session.volverDesdePreviaAColumnas();
    this.eventBus.emit({ type: 'REQUEST_NAVIGATION', payload: { target: 'columnas' } });
  }

  copiarJson(): void {
    void this.session.copiarJsonAlPortapapeles();
  }

  sincronizarInputPaginaConSesion(): void {
    this.paginaParaSaltar.set(String(this.session.paginaVistaPrevia()));
  }

  irAPaginaDesdeCampo(): void {
    const n = parseInt(this.paginaParaSaltar().trim(), 10);
    if (Number.isNaN(n)) return;
    this.session.irAPaginaVistaPrevia(n);
    this.sincronizarInputPaginaConSesion();
  }
}
