import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Apartado "Generador SQL": placeholder autónomo.
 *
 * Patrón recomendado para crecer: cuando exista API, crear un servicio dedicado y emitir eventos al Dashboard
 * solo si la navegación debe coordinarse con otros apartados.
 */
@Component({
  standalone: true,
  selector: 'app-sql-generator-section',
  imports: [RouterLink],
  templateUrl: './sql-generator-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SqlGeneratorSectionComponent {}
