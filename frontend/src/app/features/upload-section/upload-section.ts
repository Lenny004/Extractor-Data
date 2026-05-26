import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';

import { DashboardEventBusService } from '../../core/services/dashboard-event-bus.service';
import { ExtractionSessionService } from '../../core/services/extraction-session.service';

@Component({
  standalone: true,
  selector: 'app-upload-section',
  templateUrl: './upload-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadSectionComponent {
  readonly session = inject(ExtractionSessionService);
  private readonly eventBus = inject(DashboardEventBusService);

  private readonly inputArchivo = viewChild<ElementRef<HTMLInputElement>>('inputArchivo');

  terminosAceptados = signal(false);
  hojasSeleccionadas = signal<Set<string>>(new Set());

  aceptarTerminos(evento: Event) {
    const input = evento.target as HTMLInputElement;
    this.terminosAceptados.set(input.checked);
  }

  abrirSelectorArchivo(): void {
    this.inputArchivo()?.nativeElement.click();
  }

  toggleHoja(name: string): void {
    this.hojasSeleccionadas.update((set) => {
      const next = new Set(set);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  seleccionarTodasLasHojas(): void {
    const names = this.session.hojasDisponibles();
    this.hojasSeleccionadas.set(new Set(names));
  }

  hayAlMenosUnaHojaSeleccionada(): boolean {
    return this.hojasSeleccionadas().size > 0;
  }

  solicitarPasoSeleccionColumnas(): void {
    const seleccionadas = Array.from(this.hojasSeleccionadas());
    this.eventBus.emit({
      type: 'PROCEED_TO_COLUMN_SELECTION',
      payload: { selectedSheets: seleccionadas },
    });
  }
}
