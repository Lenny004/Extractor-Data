import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FooterComponent } from './components/footer/footer';
import { HeaderComponent } from './components/header/header';

/**
 * Shell de la aplicación: encabezado, pie y `router-outlet`.
 *
 * Importante: el flujo de negocio ya no vive aquí; se movió a servicios y apartados lazy para mejorar mantenibilidad.
 */
@Component({
  selector: 'app-root',
  imports: [HeaderComponent, FooterComponent, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
