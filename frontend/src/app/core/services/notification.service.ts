import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Tipos de notificaciones disponibles.
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

/**
 * Estructura de una notificación.
 */
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // en milisegundos, undefined = sin auto-cierre
}

/**
 * Servicio de notificaciones: centraliza el manejo de toasts/snackbars.
 *
 * Propósito: mostrar mensajes de feedback al usuario de forma consistente.
 * Responsabilidades:
 * - Generar notificaciones con ID único
 * - Gestionar duración automática de mensajes
 * - Proporcionar stream observable para componentes que las renderizen
 *
 * Patrón: inyección en root, accesible desde cualquier servicio/componente.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notificaciones$ = new Subject<Notification>();
  private readonly eliminarNotificacion$ = new Subject<string>();

  /**
   * Stream de notificaciones a mostrar. Los componentes UI se suscriben aquí.
   */
  readonly notifications$ = this.notificaciones$.asObservable();

  /**
   * Stream para eliminar notificaciones por ID.
   */
  readonly removeNotification$ = this.eliminarNotificacion$.asObservable();

  private contador = 0;

  /**
   * Emite una notificación con duración automática (por defecto 4 segundos).
   * @param message Texto del mensaje
   * @param type Tipo de notificación (info, success, warning, error)
   * @param duration Duración en ms; si no se especifica, usa 4000ms
   */
  showNotification(message: string, type: NotificationType = 'info', duration: number = 4000): void {
    const id = `notif-${++this.contador}`;
    const notification: Notification = { id, type, message, duration };

    this.notificaciones$.next(notification);

    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(id);
      }, duration);
    }
  }

  /**
   * Elimina una notificación por su ID.
   * @param id ID de la notificación a eliminar
   */
  removeNotification(id: string): void {
    this.eliminarNotificacion$.next(id);
  }

  /**
   * Métodos convenientes para cada tipo de notificación.
   */
  info(message: string, duration?: number): void {
    this.showNotification(message, 'info', duration);
  }

  success(message: string, duration?: number): void {
    this.showNotification(message, 'success', duration);
  }

  warning(message: string, duration?: number): void {
    this.showNotification(message, 'warning', duration);
  }

  error(message: string, duration?: number): void {
    this.showNotification(message, 'error', duration);
  }
}
