import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable, catchError, map, of, take } from 'rxjs';

import type { ColumnaExcel, EstadoSubida, ValidacionTransferenciaColumnas } from '../../models/extraction.model';

/**
 * URL del backend. En producción convendría leerla de `environment.ts`.
 * Se mantiene constante explícita para que un junior vea claramente el acoplamiento con el servidor.
 */
const URL_SERVIDOR = 'http://localhost:3000';

/**
 * Servicio de sesión de extracción: fuente única de verdad del flujo (archivo, columnas, tabla).
 *
 * Por qué no va en componentes: evita duplicar HTTP y estado al partir la UI en apartados lazy.
 * Los apartados leen señales y llaman métodos de este servicio o, preferiblemente, emiten eventos al bus
 * para que el Dashboard orqueste navegación + efectos (según la arquitectura EDA pedida).
 *
 * Buenas prácticas:
 * - `signal` + `computed` para reactividad clara con OnPush en componentes hijos.
 * - Validación temprana de archivos (tamaño y extensión) con mensajes explícitos.
 * - Errores de red diferenciados (status 0 vs otros).
 */
@Injectable({ providedIn: 'root' })
export class ExtractionSessionService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  // ----- Subida -----
  readonly estadoSubida = signal<EstadoSubida>('idle');
  readonly porcentajeBarra = signal(0);
  readonly nombreArchivo = signal('');
  readonly tamanoArchivoVista = signal('');
  readonly mensajeError = signal('');
  readonly arrastrandoArchivo = signal(false);
  readonly idArchivoEnServidor = signal('');
  readonly filaEncabezados = signal(1);
  readonly hojasDisponibles = signal<string[]>([]);
  readonly hojaSeleccionada = signal('');
  /** Hoja con la que se compara el ancho de columnas antes de extraer (opcional). */
  readonly hojaDestinoValidacion = signal('');

  readonly textoBarraProgreso = computed(() => {
    const e = this.estadoSubida();
    if (e === 'uploading') return 'Subiendo archivo...';
    if (e === 'validating') return 'Procesando datos...';
    if (e === 'done') return 'Completado';
    if (e === 'error') return 'Error';
    return '';
  });

  readonly detalleBarraProgreso = computed(() => {
    const e = this.estadoSubida();
    if (e === 'uploading') return 'Transfiriendo archivo al servidor';
    if (e === 'validating') return 'Validando estructura de la hoja';
    if (e === 'done') return 'Archivo procesado correctamente';
    if (e === 'error') return this.mensajeError();
    return '';
  });

  readonly debeMostrarBarraProgreso = computed(() => this.estadoSubida() !== 'idle');

  // ----- Columnas -----
  readonly listaColumnas = signal<ColumnaExcel[]>([]);
  readonly textoBuscarColumnas = signal('');
  readonly paginaListaColumnas = signal(1);
  readonly nombreHojaCalculo = signal('');
  readonly filasDeDatosEnArchivo = signal(0);
  readonly cargandoListaColumnas = signal(false);
  readonly columnasPorPaginaEnPantalla = 5;

  readonly posicionesColumnasElegidas = computed(() =>
    this.listaColumnas()
      .filter((c) => c.elegida)
      .map((c) => c.posicion),
  );

  readonly cuantasColumnasElegidas = computed(() => this.posicionesColumnasElegidas().length);
  readonly totalColumnasDetectadas = computed(() => this.listaColumnas().length);

  readonly columnasQueCoincidenConBusqueda = computed(() => {
    const t = this.textoBuscarColumnas().toLowerCase();
    if (!t) return this.listaColumnas();
    return this.listaColumnas().filter(
      (c) => c.titulo.toLowerCase().includes(t) || c.ejemploCelda.toLowerCase().includes(t),
    );
  });

  readonly columnasPaginaActual = computed(() => {
    const lista = this.columnasQueCoincidenConBusqueda();
    const inicio = (this.paginaListaColumnas() - 1) * this.columnasPorPaginaEnPantalla;
    return lista.slice(inicio, inicio + this.columnasPorPaginaEnPantalla);
  });

  readonly totalPaginasListaColumnas = computed(
    () =>
      Math.ceil(this.columnasQueCoincidenConBusqueda().length / this.columnasPorPaginaEnPantalla) ||
      1,
  );

  readonly numerosPaginaParaBotones = computed(() => {
    const total = this.totalPaginasListaColumnas();
    const actual = this.paginaListaColumnas();

    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

    const paginas: (number | string)[] = [1];
    if (actual > 3) paginas.push('...');

    const desde = Math.max(2, actual - 1);
    const hasta = Math.min(total - 1, actual + 1);
    for (let i = desde; i <= hasta; i++) paginas.push(i);

    if (actual < total - 2) paginas.push('...');
    paginas.push(total);
    return paginas;
  });

  // ----- Tabla / vista previa -----
  readonly esperandoRespuestaTabla = signal(false);
  readonly mensajeErrorTabla = signal('');
  readonly nombreHojaEnResultado = signal('');
  readonly titulosTabla = signal<string[]>([]);
  readonly filasTabla = signal<string[][]>([]);
  readonly resultadoTruncado = signal(false);
  readonly totalFilasQueHayEnExcel = signal(0);
  readonly ultimaValidacionTransferencia = signal<ValidacionTransferenciaColumnas | null>(null);

  readonly tamanoPaginaVistaPrevia = signal<10 | 15 | 20>(10);
  readonly paginaVistaPrevia = signal(1);

  readonly totalPaginasVistaPrevia = computed(() => {
    const totalFilas = this.filasTabla().length;
    const size = this.tamanoPaginaVistaPrevia();
    return Math.max(1, Math.ceil(totalFilas / size) || 1);
  });

  readonly filasVistaPreviaPaginadas = computed(() => {
    const todas = this.filasTabla();
    const size = this.tamanoPaginaVistaPrevia();
    const pag = Math.min(this.paginaVistaPrevia(), this.totalPaginasVistaPrevia());
    const inicio = (pag - 1) * size;
    return todas.slice(inicio, inicio + size);
  });

  readonly numerosPaginaVistaPreviaParaBotones = computed(() => {
    const total = this.totalPaginasVistaPrevia();
    const actual = Math.min(this.paginaVistaPrevia(), total);

    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

    const paginas: (number | string)[] = [1];
    if (actual > 3) paginas.push('...');

    const desde = Math.max(2, actual - 1);
    const hasta = Math.min(total - 1, actual + 1);
    for (let i = desde; i <= hasta; i++) paginas.push(i);

    if (actual < total - 2) paginas.push('...');
    paginas.push(total);
    return paginas;
  });

  /** JSON derivado para copiar al portapapeles (misma semántica que la implementación monolítica). */
  readonly jsonVista = computed(() => {
    const encabezados = this.titulosTabla();
    const filas = this.filasTabla();

    const arregloObjetos = filas.map((fila) => {
      const obj: Record<string, string> = {};
      encabezados.forEach((titulo, index) => {
        obj[titulo] = fila[index] ?? '';
      });
      return obj;
    });

    return JSON.stringify(arregloObjetos, null, 2);
  });

  /**
   * Indica si ya hay un archivo subido listo para continuar el flujo.
   * Útil para guards y para habilitar botones sin acoplar componentes entre sí.
   */
  tieneArchivoListo(): boolean {
    return this.estadoSubida() === 'done' && Boolean(this.idArchivoEnServidor());
  }

  /**
   * Devuelve el icono Material asociado al tipo de columna (presentación pura).
   */
  iconoTipoColumna(tipo: string): string {
    const mapa: Record<string, string> = {
      number: 'tag',
      date: 'calendar_today',
      text: 'match_case',
      boolean: 'toggle_on',
    };
    return mapa[tipo] ?? 'help';
  }

  cuandoArrastraEncima(evento: DragEvent): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.arrastrandoArchivo.set(true);
  }

  cuandoArrastraFuera(evento: DragEvent): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.arrastrandoArchivo.set(false);
  }

  cuandoSueltaArchivo(evento: DragEvent): void {
    evento.preventDefault();
    evento.stopPropagation();
    this.arrastrandoArchivo.set(false);
    const archivos = evento.dataTransfer?.files;
    if (archivos?.length) this.procesarArchivoSubida(archivos[0]);
  }

  cuandoEligeArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    if (input.files?.length) this.procesarArchivoSubida(input.files[0]);
  }

  cuandoCambiaFilaEncabezado(evento: Event): void {
    const valor = parseInt((evento.target as HTMLInputElement).value, 10) || 1;
    this.filaEncabezados.set(Math.max(1, valor));
  }

  cuandoCambiaHoja(evento: Event): void {
    const select = evento.target as HTMLSelectElement;
    this.hojaSeleccionada.set(select.value);
    if (this.hojaDestinoValidacion() === select.value) {
      this.hojaDestinoValidacion.set('');
    }
  }

  cuandoCambiaHojaDestinoValidacion(evento: Event): void {
    const select = evento.target as HTMLSelectElement;
    this.hojaDestinoValidacion.set(select.value);
  }

  quitarArchivoYEmpezarDeNuevo(): void {
    this.estadoSubida.set('idle');
    this.porcentajeBarra.set(0);
    this.nombreArchivo.set('');
    this.tamanoArchivoVista.set('');
    this.mensajeError.set('');
    this.idArchivoEnServidor.set('');
    this.hojasDisponibles.set([]);
    this.hojaSeleccionada.set('');
    this.hojaDestinoValidacion.set('');
    this.limpiarDatosTabla();
  }

  private formatearTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private pedirHojasAlServidor(filename: string): void {
    this.http
      .get<{ success: boolean; data: string[]; message?: string }>(
        `${URL_SERVIDOR}/api/sheets/${filename}`,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success && res.data && res.data.length > 0) {
            this.hojasDisponibles.set(res.data);
            this.hojaSeleccionada.set(res.data[0]);
          } else {
            this.estadoSubida.set('error');
            this.mensajeError.set('No se encontraron hojas en el archivo.');
          }
        },
        error: (err: { error?: { message?: string } }) => {
          this.estadoSubida.set('error');
          this.mensajeError.set(err?.error?.message || 'Error al leer las hojas del archivo.');
        },
      });
  }

  /**
   * Valida y sube el archivo. Mantiene la misma lógica que el componente raíz anterior.
   */
  procesarArchivoSubida(archivo: File): void {
    const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['xlsx', 'xls', 'csv', 'dat'].includes(extension)) {
      this.estadoSubida.set('error');
      this.porcentajeBarra.set(0);
      this.mensajeError.set('Formato no soportado. Usa .xlsx, .xls, .csv o .dat');
      return;
    }

    if (archivo.size > 10 * 1024 * 1024) {
      this.estadoSubida.set('error');
      this.porcentajeBarra.set(0);
      this.mensajeError.set('El archivo excede el tamaño máximo de 10MB');
      return;
    }

    this.nombreArchivo.set(archivo.name);
    this.tamanoArchivoVista.set(this.formatearTamano(archivo.size));
    this.estadoSubida.set('uploading');
    this.porcentajeBarra.set(0);
    this.mensajeError.set('');

    const datosFormulario = new FormData();
    datosFormulario.append('file', archivo);

    this.http
      .post<{ success: boolean; data: { storedName: string }; message: string }>(
        `${URL_SERVIDOR}/api/upload`,
        datosFormulario,
        { reportProgress: true, observe: 'events' },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (evento) => {
          if (evento.type === HttpEventType.UploadProgress && evento.total) {
            this.porcentajeBarra.set(Math.round((evento.loaded / evento.total) * 70));
          }
          if (evento.type === HttpEventType.Response) {
            const cuerpo = evento.body;
            if (cuerpo?.data?.storedName) {
              this.idArchivoEnServidor.set(cuerpo.data.storedName);
              this.pedirHojasAlServidor(cuerpo.data.storedName);
            }
            this.estadoSubida.set('validating');
            this.porcentajeBarra.set(75);
            setTimeout(() => this.porcentajeBarra.set(85), 400);
            setTimeout(() => this.porcentajeBarra.set(95), 800);
            setTimeout(() => {
              if (this.estadoSubida() !== 'error') {
                this.porcentajeBarra.set(100);
                this.estadoSubida.set('done');
              }
            }, 1200);
          }
        },
        error: (err: { error?: { message?: string }; status?: number }) => {
          this.estadoSubida.set('error');
          this.porcentajeBarra.set(0);
          const texto =
            err?.error?.message ||
            (err.status === 0
              ? 'No se pudo conectar al servidor. Verifica que el backend esté corriendo.'
              : 'Error al subir el archivo');
          this.mensajeError.set(texto);
        },
      });
  }

  /**
   * Limpia selección de columnas y resultados, típico al volver a "Subir".
   */
  reiniciarApartadoColumnasYPrevia(): void {
    this.listaColumnas.set([]);
    this.textoBuscarColumnas.set('');
    this.paginaListaColumnas.set(1);
    this.limpiarDatosTabla();
  }

  /**
   * Arranca la carga de metadatos de columnas (antes de mostrar el apartado correspondiente).
   */
  iniciarSeleccionDeColumnas(): void {
    this.pedirListaColumnasAlServidor();
  }

  volverDesdePreviaAColumnas(): void {
    this.limpiarDatosTabla();
  }

  /**
   * Solicita al servidor la tabla extraída.
   * @returns Observable que emite `true` solo si la respuesta fue exitosa y trajo datos.
   * Así el Dashboard o los apartados pueden navegar en el `subscribe` sin acoplarse entre sí.
   */
  pedirTablaAlServidor(): Observable<boolean> {
    const columnasQueQuiero = this.posicionesColumnasElegidas();
    if (columnasQueQuiero.length === 0) return of(false);

    this.esperandoRespuestaTabla.set(true);
    this.mensajeErrorTabla.set('');
    this.ultimaValidacionTransferencia.set(null);

    const destino = this.hojaDestinoValidacion().trim();
    const cuerpo: {
      filename: string;
      headerRow: number;
      columnIndices: number[];
      sheetName: string;
      targetSheetName?: string;
    } = {
      filename: this.idArchivoEnServidor(),
      headerRow: this.filaEncabezados(),
      columnIndices: columnasQueQuiero,
      sheetName: this.hojaSeleccionada(),
    };
    if (destino) {
      cuerpo['targetSheetName'] = destino;
    }

    return this.http
      .post<{
        success: boolean;
        message?: string;
        data?: {
          sheetName: string;
          headers: string[];
          rows: string[][];
          totalRowsInFile: number;
          truncated: boolean;
          columnTransferValidation?: {
            enabled: boolean;
            targetSheetName: string;
            sourceColumnCount: number;
            destinationColumnCount: number;
            transferredHeaders: string[];
            omittedHeaders: string[];
          };
        };
      }>(`${URL_SERVIDOR}/api/extract`, cuerpo)
      .pipe(
        take(1),
        map((respuesta) => {
          this.esperandoRespuestaTabla.set(false);
          if (respuesta.success && respuesta.data) {
            this.nombreHojaEnResultado.set(respuesta.data.sheetName);
            this.titulosTabla.set(respuesta.data.headers);
            this.filasTabla.set(respuesta.data.rows);
            this.resultadoTruncado.set(respuesta.data.truncated);
            this.totalFilasQueHayEnExcel.set(respuesta.data.totalRowsInFile);
            const v = respuesta.data.columnTransferValidation;
            if (v?.enabled) {
              this.ultimaValidacionTransferencia.set({
                habilitada: true,
                hojaDestino: v.targetSheetName,
                columnasOrigen: v.sourceColumnCount,
                columnasDestino: v.destinationColumnCount,
                encabezadosTransferidos: v.transferredHeaders,
                encabezadosOmitidos: v.omittedHeaders,
              });
            } else {
              this.ultimaValidacionTransferencia.set(null);
            }
            this.paginaVistaPrevia.set(1);
            return true;
          }
          this.mensajeErrorTabla.set(respuesta.message || 'No se pudo extraer los datos');
          return false;
        }),
        catchError((err: { error?: { message?: string }; status?: number }) => {
          this.esperandoRespuestaTabla.set(false);
          const delServidor = err?.error?.message;
          const codigo = err?.status != null ? err.status : '';
          const sinRed = err?.status === 0;
          this.mensajeErrorTabla.set(
            delServidor ||
              (sinRed
                ? 'No hubo respuesta del servidor. ¿Está encendido el backend en el puerto 3000?'
                : `Fallo al pedir la tabla${codigo !== '' ? ` (HTTP ${codigo})` : ''}. Verifica los datos del archivo.`),
          );
          return of(false);
        }),
      );
  }

  /**
   * Lógica del menú lateral: devuelve un observable vacío si no hay contexto suficiente.
   */
  intentarAbrirVistaPreviaDesdeMenu(): Observable<boolean> {
    if (!this.idArchivoEnServidor() || this.listaColumnas().length === 0) return of(false);
    return this.pedirTablaAlServidor();
  }

  /**
   * Genera un script SQL (CREATE opcional + INSERTs) con la misma selección de columnas que la extracción.
   */
  solicitarGeneracionSql(opciones: {
    tableName: string;
    dialect: 'mysql' | 'postgresql';
    includeCreateTable: boolean;
    emptyStringAsNull: boolean;
  }): Observable<
    | {
        ok: true;
        data: {
          sql: string;
          truncated: boolean;
          totalRowsInFile: number;
          rowCountInScript: number;
          sheetName: string;
        };
      }
    | { ok: false; message: string }
  > {
    const columnasQueQuiero = this.posicionesColumnasElegidas();
    if (columnasQueQuiero.length === 0) {
      return of({ ok: false, message: 'Selecciona al menos una columna antes de generar SQL.' });
    }

    const destino = this.hojaDestinoValidacion().trim();
    const cuerpo: Record<string, unknown> = {
      filename: this.idArchivoEnServidor(),
      headerRow: this.filaEncabezados(),
      columnIndices: columnasQueQuiero,
      sheetName: this.hojaSeleccionada(),
      tableName: opciones.tableName.trim(),
      dialect: opciones.dialect,
      includeCreateTable: opciones.includeCreateTable,
      emptyStringAsNull: opciones.emptyStringAsNull,
    };
    if (destino) {
      cuerpo['targetSheetName'] = destino;
    }

    return this.http
      .post<{
        success: boolean;
        message?: string;
        data?: {
          sql: string;
          truncated: boolean;
          totalRowsInFile: number;
          rowCountInScript: number;
          sheetName: string;
        };
      }>(`${URL_SERVIDOR}/api/generate-sql`, cuerpo)
      .pipe(
        take(1),
        map((respuesta) => {
          if (respuesta.success && respuesta.data?.sql != null) {
            const d = respuesta.data;
            return {
              ok: true as const,
              data: {
                sql: d.sql,
                truncated: d.truncated,
                totalRowsInFile: d.totalRowsInFile,
                rowCountInScript: d.rowCountInScript,
                sheetName: d.sheetName,
              },
            };
          }
          return { ok: false as const, message: respuesta.message || 'No se pudo generar el SQL' };
        }),
        catchError((err: { error?: { message?: string }; status?: number }) => {
          const delServidor = err?.error?.message;
          const sinRed = err?.status === 0;
          return of({
            ok: false as const,
            message:
              delServidor ||
              (sinRed
                ? 'No hubo respuesta del servidor. ¿Está encendido el backend en el puerto 3000?'
                : 'Fallo al generar SQL. Revisa el archivo y los parámetros.'),
          });
        }),
      );
  }

  private limpiarDatosTabla(): void {
    this.esperandoRespuestaTabla.set(false);
    this.mensajeErrorTabla.set('');
    this.nombreHojaEnResultado.set('');
    this.titulosTabla.set([]);
    this.filasTabla.set([]);
    this.resultadoTruncado.set(false);
    this.totalFilasQueHayEnExcel.set(0);
    this.ultimaValidacionTransferencia.set(null);
    this.paginaVistaPrevia.set(1);
  }

  private pedirListaColumnasAlServidor(): void {
    this.cargandoListaColumnas.set(true);
    const url = `${URL_SERVIDOR}/api/columns/${this.idArchivoEnServidor()}?headerRow=${this.filaEncabezados()}&sheetName=${encodeURIComponent(this.hojaSeleccionada())}`;

    this.http
      .get<{
        success: boolean;
        data: {
          sheetName: string;
          totalRows: number;
          columns: { index: number; name: string; type: string; sampleData: string }[];
        };
      }>(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          if (respuesta.success) {
            const mapeadas: ColumnaExcel[] = respuesta.data.columns.map((c) => ({
              posicion: c.index,
              titulo: c.name,
              tipo: c.type,
              ejemploCelda: c.sampleData,
              elegida: true,
            }));
            this.listaColumnas.set(mapeadas);
            this.nombreHojaCalculo.set(respuesta.data.sheetName);
            this.filasDeDatosEnArchivo.set(respuesta.data.totalRows);
          }
          this.cargandoListaColumnas.set(false);
        },
        error: (err: { error?: { message?: string } }) => {
          this.cargandoListaColumnas.set(false);
          this.mensajeErrorTabla.set(err?.error?.message || 'Error al procesar las columnas.');
        },
      });
  }

  clicEnFilaColumna(posicion: number): void {
    this.listaColumnas.update((lista) =>
      lista.map((c) => (c.posicion === posicion ? { ...c, elegida: !c.elegida } : c)),
    );
  }

  marcarTodasLasColumnas(): void {
    this.listaColumnas.update((lista) => lista.map((c) => ({ ...c, elegida: true })));
  }

  quitarMarcaEnTodasLasColumnas(): void {
    this.listaColumnas.update((lista) => lista.map((c) => ({ ...c, elegida: false })));
  }

  invertirMarcadas(): void {
    this.listaColumnas.update((lista) => lista.map((c) => ({ ...c, elegida: !c.elegida })));
  }

  alEscribirEnBusquedaColumnas(valor: string): void {
    this.textoBuscarColumnas.set(valor);
    this.paginaListaColumnas.set(1);
  }

  irAPaginaColumnas(numeroPagina: number): void {
    if (numeroPagina >= 1 && numeroPagina <= this.totalPaginasListaColumnas()) {
      this.paginaListaColumnas.set(numeroPagina);
    }
  }

  alCambiarTamanoPaginaVistaPrevia(valor: string): void {
    const n = parseInt(valor, 10);
    if (n === 10 || n === 15 || n === 20) {
      this.tamanoPaginaVistaPrevia.set(n);
      this.paginaVistaPrevia.set(1);
    }
  }

  irAPaginaVistaPrevia(numeroPagina: number): void {
    const total = this.totalPaginasVistaPrevia();
    if (numeroPagina >= 1 && numeroPagina <= total) {
      this.paginaVistaPrevia.set(numeroPagina);
    }
  }

  async copiarJsonAlPortapapeles(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.jsonVista());
      // Mantenemos `alert` como en el código original; sustituible por snackbar.
      alert('JSON copiado al portapapeles.');
    } catch {
      this.mensajeErrorTabla.set('No se pudo copiar al portapapeles en este navegador.');
    }
  }
}
