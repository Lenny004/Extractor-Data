import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { DashboardEventBusService } from '../../core/services/dashboard-event-bus.service';
import { ExtractionSessionService } from '../../core/services/extraction-session.service';

/**
 * Apartado "Espacio de Trabajo": componente autónomo (placeholder evolutivo).
 *
 * Hoy no replica la vista previa (para evitar duplicar UI), pero ya puede leer el estado de sesión
 * y enlazar con otras rutas sin acoplarse a sus implementaciones (solo vía bus / router).
 */
@Component({
  standalone: true,
  selector: 'app-workspace-section',
  imports: [RouterLink],
  templateUrl: './workspace-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceSectionComponent {
  readonly session = inject(ExtractionSessionService);
  private readonly eventBus = inject(DashboardEventBusService);

  abrirVistaPrevia(): void {
    this.eventBus.emit({ type: 'REQUEST_PREVIEW_FROM_MENU' });
  }
}
