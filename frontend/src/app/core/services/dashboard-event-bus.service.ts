import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import type { DashboardEvent } from '../../models/dashboard-events.model';

/**
 * Bus de eventos ligero basado en RxJS.
 *
 * Propósito: comunicación desacoplada estilo EDA dentro del frontend Angular.
 * No reemplaza el estado de negocio: para datos persistentes entre pantallas usamos `ExtractionSessionService`.
 *
 * Buenas prácticas aplicadas:
 * - `Subject` privado: evita que los productores llamen `.next` desde fuera del servicio.
 * - API explícita `emit` / `events$`: fácil de testear y de razonar para perfiles junior.
 */
@Injectable({ providedIn: 'root' })
export class DashboardEventBusService {
  private readonly eventos$ = new Subject<DashboardEvent>();

  /**
   * Stream de solo lectura para suscriptores (p. ej. el Dashboard).
   * Importante: componentes hijos no deberían suscribirse al bus completo salvo casos excepcionales.
   */
  readonly events$: Observable<DashboardEvent> = this.eventos$.asObservable();

  /**
   * Publica un evento en el bus.
   * @param evento Carga útil tipada; el Dashboard decide efectos secundarios.
   */
  emit(evento: DashboardEvent): void {
    this.eventos$.next(evento);
  }
}
