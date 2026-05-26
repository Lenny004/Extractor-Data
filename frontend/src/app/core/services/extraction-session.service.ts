import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable, catchError, map, of, take } from 'rxjs';
import * as XLSX from 'xlsx';

import type {
  ColumnaExcel,
  EstadoSubida,
  SheetInfo,
  SheetWorkflow,
  ValidacionTransferenciaColumnas,
} from '../../models/extraction.model';

const URL_SERVIDOR = 'http://localhost:3000';

@Injectable({ providedIn: 'root' })
export class ExtractionSessionService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  // =========================================================================
  // Upload-level state (shared across all sheets)
  // =========================================================================
  readonly estadoSubida = signal<EstadoSubida>('idle');
  readonly porcentajeBarra = signal(0);
  readonly nombreArchivo = signal('');
  readonly tamanoArchivoVista = signal('');
  readonly mensajeError = signal('');
  readonly arrastrandoArchivo = signal(false);
  readonly idArchivoEnServidor = signal('');
  readonly filaEncabezados = signal(1);
  readonly hojasDisponibles = signal<string[]>([]);
  readonly hojasInfo = signal<SheetInfo[]>([]);
  readonly hojasVacias = computed(() =>
    this.hojasInfo().filter((h) => h.isEmpty).map((h) => h.name),
  );

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

  // =========================================================================
  // Multi-sheet workflow state
  // =========================================================================
  private readonly workflowsMap = signal<Record<string, SheetWorkflow>>({});

  readonly workflows = computed(() => this.workflowsMap());
  readonly hojasActivas = computed(() => Object.keys(this.workflowsMap()));
  readonly activeSheetName = signal('');
  readonly activeWorkflow = computed(() => {
    const name = this.activeSheetName();
    return this.workflowsMap()[name] ?? null;
  });

  // =========================================================================
  // Backward-compatible proxy signals (delegate to activeWorkflow)
  // =========================================================================
  readonly listaColumnas = computed(() => this.activeWorkflow()?.columns ?? []);
  readonly textoBuscarColumnas = computed(() => this.activeWorkflow()?.columnSearchText ?? '');
  readonly paginaListaColumnas = computed(() => this.activeWorkflow()?.columnPage ?? 1);
  readonly nombreHojaCalculo = computed(() => this.activeWorkflow()?.sheetName ?? '');
  readonly filasDeDatosEnArchivo = computed(() => this.activeWorkflow()?.totalRowsInFile ?? 0);
  readonly cargandoListaColumnas = computed(() => this.activeWorkflow()?.loadingColumns ?? false);
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

  // ----- Preview / extraction proxy signals -----
  readonly esperandoRespuestaTabla = computed(
    () => this.activeWorkflow()?.previewLoading ?? false,
  );
  readonly mensajeErrorTabla = computed(() => this.activeWorkflow()?.previewError ?? '');
  readonly nombreHojaEnResultado = computed(() => this.activeWorkflow()?.sheetName ?? '');

  readonly nombreHojaFormateado = computed(() => {
    const raw = this.nombreHojaEnResultado();
    const match = raw.match(/^(Hoja|Sheet|Blad|Feuille|Foglio)\s*(\d+)$/i);
    if (match) {
      return `Hoja ${match[2]}`;
    }
    return raw;
  });

  readonly titulosTabla = computed(() => this.activeWorkflow()?.previewHeaders ?? []);
  readonly filasTabla = computed(() => this.activeWorkflow()?.previewRows ?? []);
  readonly resultadoTruncado = computed(() => this.activeWorkflow()?.previewTruncated ?? false);
  readonly totalFilasQueHayEnExcel = computed(
    () => this.activeWorkflow()?.previewTotalRowsInFile ?? 0,
  );
  readonly ultimaValidacionTransferencia = computed(
    () => this.activeWorkflow()?.columnTransferValidation ?? null,
  );

  readonly tamanoPaginaVistaPrevia = computed(
    () => this.activeWorkflow()?.previewPageSize ?? 10,
  );

  readonly paginaVistaPrevia = computed(() => this.activeWorkflow()?.previewPage ?? 1);

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

  // ----- Cross-sheet validation -----
  readonly hojaDestinoValidacion = computed(
    () => this.activeWorkflow()?.targetSheetName ?? '',
  );

  // =========================================================================
  // Workflow lifecycle
  // =========================================================================

  private crearWorkflowVacio(info: SheetInfo): SheetWorkflow {
    return {
      sheetName: info.name,
      isEmpty: info.isEmpty,
      columns: [],
      columnSearchText: '',
      columnPage: 1,
      loadingColumns: false,
      totalRowsInFile: 0,
      previewHeaders: [],
      previewRows: [],
      previewTruncated: false,
      previewTotalRowsInFile: 0,
      previewLoading: false,
      previewError: '',
      previewPageSize: 10,
      previewPage: 1,
      columnTransferValidation: null,
      targetSheetName: '',
      sqlOutput: '',
      sqlMeta: null,
      sqlGenerating: false,
      sqlError: '',
      tableName: '',
      dialect: 'postgresql',
      includeCreateTable: true,
      emptyStringAsNull: false,
    };
  }

  patchWorkflow(sheetName: string, patch: Partial<SheetWorkflow>): void {
    this.workflowsMap.update((wfs) => {
      const existing = wfs[sheetName];
      if (!existing) return wfs;
      return { ...wfs, [sheetName]: { ...existing, ...patch } };
    });
  }

  inicializarWorkflow(info: SheetInfo): void {
    this.workflowsMap.update((wfs) => {
      if (wfs[info.name]) return wfs;
      return { ...wfs, [info.name]: this.crearWorkflowVacio(info) };
    });
  }

  eliminarWorkflow(name: string): void {
    this.workflowsMap.update((wfs) => {
      const next = { ...wfs };
      delete next[name];
      return next;
    });
    if (this.activeSheetName() === name) {
      const rest = this.hojasActivas();
      this.activeSheetName.set(rest.length > 0 ? rest[0] : '');
    }
  }

  activarHoja(name: string): void {
    if (this.workflowsMap()[name]) {
      this.activeSheetName.set(name);
    }
  }

  // =========================================================================
  // Upload-level methods (unchanged)
  // =========================================================================

  tieneArchivoListo(): boolean {
    return this.estadoSubida() === 'done' && Boolean(this.idArchivoEnServidor());
  }

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

  cuandoCambiaHojaDestinoValidacion(evento: Event): void {
    const select = evento.target as HTMLSelectElement;
    const wf = this.activeWorkflow();
    if (wf) {
      this.patchWorkflow(wf.sheetName, { targetSheetName: select.value });
    }
  }

  quitarArchivoYEmpezarDeNuevo(): void {
    this.estadoSubida.set('idle');
    this.porcentajeBarra.set(0);
    this.nombreArchivo.set('');
    this.tamanoArchivoVista.set('');
    this.mensajeError.set('');
    this.idArchivoEnServidor.set('');
    this.hojasDisponibles.set([]);
    this.hojasInfo.set([]);
    this.hojasVacias();
    this.activeSheetName.set('');
    this.workflowsMap.set({});
  }

  private formatearTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private pedirHojasAlServidor(filename: string): void {
    this.http
      .get<{ success: boolean; data: SheetInfo[]; message?: string }>(
        `${URL_SERVIDOR}/api/sheets/${filename}`,
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          if (res.success && res.data && res.data.length > 0) {
            this.hojasInfo.set(res.data);
            this.hojasDisponibles.set(res.data.map((h) => h.name));
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

  // =========================================================================
  // Per-sheet column loading
  // =========================================================================

  pedirColumnasDeHoja(sheetName: string): void {
    const filename = this.idArchivoEnServidor();
    if (!filename) return;

    this.patchWorkflow(sheetName, { loadingColumns: true });

    const url = `${URL_SERVIDOR}/api/columns/${filename}?headerRow=${this.filaEncabezados()}&sheetName=${encodeURIComponent(sheetName)}`;

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
            this.patchWorkflow(sheetName, {
              columns: mapeadas,
              totalRowsInFile: respuesta.data.totalRows,
              loadingColumns: false,
            });
          } else {
            this.patchWorkflow(sheetName, { loadingColumns: false });
          }
        },
        error: (err: { error?: { message?: string } }) => {
          this.patchWorkflow(sheetName, {
            loadingColumns: false,
            previewError: err?.error?.message || 'Error al procesar las columnas.',
          });
        },
      });
  }

  /** Loads columns for the currently active sheet (backward compat). */
  iniciarSeleccionDeColumnas(): void {
    const wf = this.activeWorkflow();
    if (wf) {
      this.pedirColumnasDeHoja(wf.sheetName);
    }
  }

  // =========================================================================
  // Per-sheet extraction / preview
  // =========================================================================

  pedirTablaDeHoja(sheetName: string): Observable<boolean> {
    const wf = this.workflowsMap()[sheetName];
    if (!wf) return of(false);

    const columnasQueQuiero = wf.columns
      .filter((c) => c.elegida)
      .map((c) => c.posicion);
    if (columnasQueQuiero.length === 0) return of(false);

    this.patchWorkflow(sheetName, { previewLoading: true, previewError: '' });

    const destino = wf.targetSheetName.trim();
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
      sheetName,
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
          if (respuesta.success && respuesta.data) {
            const d = respuesta.data;
            const colVal = d.columnTransferValidation
              ? {
                  habilitada: d.columnTransferValidation.enabled,
                  hojaDestino: d.columnTransferValidation.targetSheetName,
                  columnasOrigen: d.columnTransferValidation.sourceColumnCount,
                  columnasDestino: d.columnTransferValidation.destinationColumnCount,
                  encabezadosTransferidos: d.columnTransferValidation.transferredHeaders,
                  encabezadosOmitidos: d.columnTransferValidation.omittedHeaders,
                }
              : null;

            this.patchWorkflow(sheetName, {
              previewLoading: false,
              previewHeaders: d.headers,
              previewRows: d.rows,
              previewTruncated: d.truncated,
              previewTotalRowsInFile: d.totalRowsInFile,
              columnTransferValidation: colVal,
              previewPage: 1,
            });
            return true;
          }
          this.patchWorkflow(sheetName, {
            previewLoading: false,
            previewError: respuesta.message || 'No se pudo extraer los datos',
          });
          return false;
        }),
        catchError((err: { error?: { message?: string }; status?: number }) => {
          const delServidor = err?.error?.message;
          const codigo = err?.status != null ? err.status : '';
          const sinRed = err?.status === 0;
          this.patchWorkflow(sheetName, {
            previewLoading: false,
            previewError:
              delServidor ||
              (sinRed
                ? 'No hubo respuesta del servidor. ¿Está encendido el backend en el puerto 3000?'
                : `Fallo al pedir la tabla${codigo !== '' ? ` (HTTP ${codigo})` : ''}. Verifica los datos del archivo.`),
          });
          return of(false);
        }),
      );
  }

  /** Extracts for the active sheet (backward compat). */
  pedirTablaAlServidor(): Observable<boolean> {
    const wf = this.activeWorkflow();
    if (!wf) return of(false);
    return this.pedirTablaDeHoja(wf.sheetName);
  }

  intentarAbrirVistaPreviaDesdeMenu(): Observable<boolean> {
    const wf = this.activeWorkflow();
    if (!wf || !this.idArchivoEnServidor()) return of(false);
    return this.pedirTablaDeHoja(wf.sheetName);
  }

  // =========================================================================
  // Per-sheet SQL generation
  // =========================================================================

  solicitarGeneracionSqlDeHoja(
    sheetName: string,
    opciones: {
      tableName: string;
      dialect: 'mysql' | 'postgresql';
      includeCreateTable: boolean;
      emptyStringAsNull: boolean;
    },
  ): Observable<
    | { ok: true; data: { sql: string; truncated: boolean; totalRowsInFile: number; rowCountInScript: number; sheetName: string } }
    | { ok: false; message: string }
  > {
    const wf = this.workflowsMap()[sheetName];
    if (!wf) {
      return of({ ok: false, message: 'Hoja no encontrada en el flujo de trabajo.' });
    }

    const columnasQueQuiero = wf.columns
      .filter((c) => c.elegida)
      .map((c) => c.posicion);
    if (columnasQueQuiero.length === 0) {
      return of({ ok: false, message: 'Selecciona al menos una columna antes de generar SQL.' });
    }

    const destino = wf.targetSheetName.trim();
    const cuerpo: Record<string, unknown> = {
      filename: this.idArchivoEnServidor(),
      headerRow: this.filaEncabezados(),
      columnIndices: columnasQueQuiero,
      sheetName,
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
            this.patchWorkflow(sheetName, {
              sqlOutput: d.sql,
              sqlMeta: {
                truncated: d.truncated,
                totalRowsInFile: d.totalRowsInFile,
                rowCountInScript: d.rowCountInScript,
                sheetName: d.sheetName,
              },
              sqlGenerating: false,
              sqlError: '',
            });
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
          return {
            ok: false as const,
            message: respuesta.message || 'No se pudo generar el SQL',
          };
        }),
        catchError((err: { error?: { message?: string }; status?: number }) => {
          const delServidor = err?.error?.message;
          const sinRed = err?.status === 0;
          this.patchWorkflow(sheetName, { sqlGenerating: false });
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

  solicitarGeneracionSql(opciones: {
    tableName: string;
    dialect: 'mysql' | 'postgresql';
    includeCreateTable: boolean;
    emptyStringAsNull: boolean;
  }): Observable<
    | { ok: true; data: { sql: string; truncated: boolean; totalRowsInFile: number; rowCountInScript: number; sheetName: string } }
    | { ok: false; message: string }
  > {
    const wf = this.activeWorkflow();
    if (!wf) {
      return of({ ok: false, message: 'No hay una hoja activa.' });
    }
    return this.solicitarGeneracionSqlDeHoja(wf.sheetName, opciones);
  }

  // =========================================================================
  // Column selection actions (operate on active workflow)
  // =========================================================================

  private actualizarColumnasEnActiva(
    fn: (cols: ColumnaExcel[]) => ColumnaExcel[],
  ): void {
    const wf = this.activeWorkflow();
    if (!wf) return;
    this.patchWorkflow(wf.sheetName, { columns: fn(wf.columns) });
  }

  clicEnFilaColumna(posicion: number): void {
    this.actualizarColumnasEnActiva((cols) =>
      cols.map((c) => (c.posicion === posicion ? { ...c, elegida: !c.elegida } : c)),
    );
  }

  marcarTodasLasColumnas(): void {
    this.actualizarColumnasEnActiva((cols) => cols.map((c) => ({ ...c, elegida: true })));
  }

  quitarMarcaEnTodasLasColumnas(): void {
    this.actualizarColumnasEnActiva((cols) => cols.map((c) => ({ ...c, elegida: false })));
  }

  invertirMarcadas(): void {
    this.actualizarColumnasEnActiva((cols) =>
      cols.map((c) => ({ ...c, elegida: !c.elegida })),
    );
  }

  alEscribirEnBusquedaColumnas(valor: string): void {
    const wf = this.activeWorkflow();
    if (!wf) return;
    this.patchWorkflow(wf.sheetName, { columnSearchText: valor, columnPage: 1 });
  }

  irAPaginaColumnas(numeroPagina: number): void {
    const wf = this.activeWorkflow();
    if (!wf) return;
    if (numeroPagina >= 1 && numeroPagina <= this.totalPaginasListaColumnas()) {
      this.patchWorkflow(wf.sheetName, { columnPage: numeroPagina });
    }
  }

  // =========================================================================
  // Preview actions (operate on active workflow)
  // =========================================================================

  alCambiarTamanoPaginaVistaPrevia(valor: string): void {
    const wf = this.activeWorkflow();
    if (!wf) return;
    const n = parseInt(valor, 10);
    if (n === 10 || n === 15 || n === 20) {
      this.patchWorkflow(wf.sheetName, { previewPageSize: n, previewPage: 1 });
    }
  }

  irAPaginaVistaPrevia(numeroPagina: number): void {
    const wf = this.activeWorkflow();
    if (!wf) return;
    const total = this.totalPaginasVistaPrevia();
    if (numeroPagina >= 1 && numeroPagina <= total) {
      this.patchWorkflow(wf.sheetName, { previewPage: numeroPagina });
    }
  }

  async copiarJsonAlPortapapeles(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.jsonVista());
      alert('JSON copiado al portapapeles.');
    } catch {
      const wf = this.activeWorkflow();
      if (wf) {
        this.patchWorkflow(wf.sheetName, {
          previewError: 'No se pudo copiar al portapapeles en este navegador.',
        });
      }
    }
  }

  descargarExcel(): void {
    const headers = this.titulosTabla();
    const rows = this.filasTabla();
    if (headers.length === 0 || rows.length === 0) return;

    const sheetData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        h.length,
        ...rows.map((r) => (r[i] ?? '').length),
      );
      return { wch: Math.min(maxLen + 3, 60) };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, this.nombreHojaFormateado() || 'Datos');

    const nombreBase = this.nombreArchivo()
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
    XLSX.writeFile(wb, `${nombreBase}_extraido.xlsx`);
  }

  // =========================================================================
  // Flow navigation helpers (operate on active workflow)
  // =========================================================================

  reiniciarApartadoColumnasYPrevia(): void {
    const wf = this.activeWorkflow();
    if (!wf) return;
    this.patchWorkflow(wf.sheetName, {
      columns: [],
      columnSearchText: '',
      columnPage: 1,
      previewHeaders: [],
      previewRows: [],
      previewTruncated: false,
      previewTotalRowsInFile: 0,
      previewLoading: false,
      previewError: '',
      previewPageSize: 10,
      previewPage: 1,
      columnTransferValidation: null,
    });
  }

  volverDesdePreviaAColumnas(): void {
    const wf = this.activeWorkflow();
    if (!wf) return;
    this.patchWorkflow(wf.sheetName, {
      previewHeaders: [],
      previewRows: [],
      previewTruncated: false,
      previewTotalRowsInFile: 0,
      previewLoading: false,
      previewError: '',
      previewPageSize: 10,
      previewPage: 1,
      columnTransferValidation: null,
    });
  }
}
