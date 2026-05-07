/**
 * Modelos de dominio para el flujo de extracción de Excel/CSV.
 *
 * Propósito: centralizar tipos compartidos entre apartados sin importar componentes entre sí.
 * Buena práctica: DTOs y estados explícitos facilitan validación y mensajes de error coherentes.
 */

/** Estados posibles del proceso de subida (máquina de estados simple y legible). */
export type EstadoSubida = 'idle' | 'uploading' | 'validating' | 'done' | 'error';

/**
 * Representa una columna detectada en el archivo, tal como la consume la UI de selección.
 * El backend envía nombres distintos; aquí normalizamos para la vista.
 */
export interface ColumnaExcel {
  posicion: number;
  titulo: string;
  tipo: string;
  ejemploCelda: string;
  elegida: boolean;
}
