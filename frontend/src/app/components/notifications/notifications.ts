import { Component, ChangeDetectionStrategy, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService, Notification } from '../../core/services/notification.service';

/**
 * Componente de contenedor de notificaciones.
 *
 * Responsabilidades:
 * - Suscribirse al servicio de notificaciones
 * - Renderizar notificaciones en la esquina superior derecha
 * - Aplicar clases de estilo según el tipo
 * - Permitir cerrar notificaciones manualmente
 *
 * Ubicación en el árbol: se importa en `app.ts` para estar disponible en toda la SPA.
 */
@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsComponent {
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Lista de notificaciones activas.
   */
  readonly notificaciones = signal<Notification[]>([]);

  /**
   * Calcula la clase CSS para cada notificación según su tipo.
   */
  getNotificationClass(type: string): string {
    const mapa: Record<string, string> = {
      info: 'notification--info',
      success: 'notification--success',
      warning: 'notification--warning',
      error: 'notification--error',
    };
    return mapa[type] ?? 'notification--info';
  }

  /**
   * Icono Material según el tipo de notificación.
   */
  getNotificationIcon(type: string): string {
    const mapa: Record<string, string> = {
      info: 'info',
      success: 'check_circle',
      warning: 'warning',
      error: 'error',
    };
    return mapa[type] ?? 'info';
  }

  /**
   * Elimina una notificación de la lista.
   */
  cerrarNotificacion(id: string): void {
    this.notificaciones.update((lista) => lista.filter((n) => n.id !== id));
  }

  constructor() {
    // Se suscribe a nuevas notificaciones y las agrega a la lista
    this.notificationService.notifications$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((notif) => {
        this.notificaciones.update((lista) => [...lista, notif]);
      });

    // Se suscribe a eliminaciones y las remueve de la lista
    this.notificationService.removeNotification$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id) => {
        this.cerrarNotificacion(id);
      });
  }
}
