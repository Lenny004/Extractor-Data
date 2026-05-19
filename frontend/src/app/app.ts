import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FooterComponent } from './components/footer/footer';
import { HeaderComponent } from './components/header/header';
import { NotificationsComponent } from './components/notifications/notifications';

/**
 * Shell de la aplicación: encabezado, pie, router-outlet y contenedor de notificaciones.
 *
 * Importante: el flujo de negocio ya no vive aquí; se movió a servicios y apartados lazy para mejorar mantenibilidad.
 * El componente de notificaciones se renderiza aquí para estar disponible en toda la SPA.
 */
@Component({
  selector: 'app-root',
  imports: [HeaderComponent, FooterComponent, RouterOutlet, NotificationsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
