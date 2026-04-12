import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient, HttpEventType } from '@angular/common/http';

import { FooterComponent } from './components/footer/footer';
import { HeaderComponent } from './components/header/header';

/** URL base del backend (desarrollo local). */
const URL_SERVIDOR = 'http://localhost:3000';

/**
 * Idea simple (tres “cajas” en pantalla):
 *
 * 1) Subes el Excel → el servidor lo guarda y te da un nombre interno del archivo (`idArchivoEnServidor`).
 * 2) Ves la lista de columnas y marcas cuáles quieres (`elegida: true/false`).
 * 3) Pides la tabla al servidor (`POST /api/extract`) con: ese nombre interno, la fila de títulos, y los
 *    números de columna elegidos. El servidor devuelve `titulosTabla` + `filasTabla`; la pantalla solo las pinta.
 *
 * Los nombres de variables/métodos están en español para leer el flujo sin diccionario técnico.
 */

/** Estados de la barrita mientras subes el archivo (caja 1). */
type EstadoSubida = 'idle' | 'uploading' | 'validating' | 'done' | 'error';

/**
 * Una columna del Excel. Lo que viene del servidor usa `index`, `name`, etc.; aquí lo guardamos con nombres claros.
 * `posicion` = qué columna es (0 = primera). `elegida` = si entra en la tabla del paso 3.
 */
interface ColumnaExcel {
  posicion: number;
  titulo: string;
  tipo: string;
  ejemploCelda: string;
  elegida: boolean;
}

@Component({
  selector: 'app-root',
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly inputArchivo = viewChild<ElementRef<HTMLInputElement>>('inputArchivo');

  /** 1 = subir, 2 = columnas, 3 = tabla final. */
  pasoVisual = signal(1);

  // ----- Caja 1: subida -----
  estadoSubida = signal<EstadoSubida>('idle');
  porcentajeBarra = signal(0);
  nombreArchivo = signal('');
  tamanoArchivoVista = signal('');
  mensajeError = signal('');
  arrastrandoArchivo = signal(false);
  /** Nombre interno del archivo en el servidor (carpeta uploads), no el nombre bonito del usuario. */
  idArchivoEnServidor = signal('');
  /** Fila del Excel donde están los títulos (normalmente 1). */
  filaEncabezados = signal(1);

  textoBarraProgreso = computed(() => {
    const e = this.estadoSubida();
    if (e === 'uploading') return 'Subiendo archivo...';
    if (e === 'validating') return 'Procesando datos...';
    if (e === 'done') return 'Completado';
    if (e === 'error') return 'Error';
    return '';
  });

  detalleBarraProgreso = computed(() => {
    const e = this.estadoSubida();
    if (e === 'uploading') return 'Transfiriendo archivo al servidor';
    if (e === 'validating') return 'Validando estructura de la hoja';
    if (e === 'done') return 'Archivo procesado correctamente';
    if (e === 'error') return this.mensajeError();
    return '';
  });

  debeMostrarBarraProgreso = computed(() => this.estadoSubida() !== 'idle');

  // ----- Caja 2: columnas -----
  listaColumnas = signal<ColumnaExcel[]>([]);
  textoBuscarColumnas = signal('');
  paginaListaColumnas = signal(1);
  nombreHojaCalculo = signal('');
  filasDeDatosEnArchivo = signal(0);
  cargandoListaColumnas = signal(false);
  readonly columnasPorPaginaEnPantalla = 5;

  /** Números de columna (0,1,2…) de las filas con casilla marcada; eso se manda al paso 3. */
  posicionesColumnasElegidas = computed(() =>
    this.listaColumnas().filter((c) => c.elegida).map((c) => c.posicion)
  );

  cuantasColumnasElegidas = computed(() => this.posicionesColumnasElegidas().length);
  totalColumnasDetectadas = computed(() => this.listaColumnas().length);

  columnasQueCoincidenConBusqueda = computed(() => {
    const t = this.textoBuscarColumnas().toLowerCase();
    if (!t) return this.listaColumnas();
    return this.listaColumnas().filter(
      (c) =>
        c.titulo.toLowerCase().includes(t) || c.ejemploCelda.toLowerCase().includes(t)
    );
  });

  columnasPaginaActual = computed(() => {
    const lista = this.columnasQueCoincidenConBusqueda();
    const inicio = (this.paginaListaColumnas() - 1) * this.columnasPorPaginaEnPantalla;
    return lista.slice(inicio, inicio + this.columnasPorPaginaEnPantalla);
  });

  totalPaginasListaColumnas = computed(
    () =>
      Math.ceil(this.columnasQueCoincidenConBusqueda().length / this.columnasPorPaginaEnPantalla) || 1
  );

  numerosPaginaParaBotones = computed(() => {
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

  // ----- Caja 3: respuesta del servidor (tabla) -----
  esperandoRespuestaTabla = signal(false);
  mensajeErrorTabla = signal('');
  nombreHojaEnResultado = signal('');
  titulosTabla = signal<string[]>([]);
  filasTabla = signal<string[][]>([]);
  resultadoTruncado = signal(false);
  totalFilasQueHayEnExcel = signal(0);

  iconoTipoColumna(tipo: string): string {
    const mapa: Record<string, string> = {
      number: 'tag',
      date: 'calendar_today',
      text: 'match_case',
      boolean: 'toggle_on',
    };
    return mapa[tipo] ?? 'help';
  }

  cuandoArrastraEncima(evento: DragEvent) {
    evento.preventDefault();
    evento.stopPropagation();
    this.arrastrandoArchivo.set(true);
  }

  cuandoArrastraFuera(evento: DragEvent) {
    evento.preventDefault();
    evento.stopPropagation();
    this.arrastrandoArchivo.set(false);
  }

  cuandoSueltaArchivo(evento: DragEvent) {
    evento.preventDefault();
    evento.stopPropagation();
    this.arrastrandoArchivo.set(false);
    const archivos = evento.dataTransfer?.files;
    if (archivos?.length) this.procesarArchivoSubida(archivos[0]);
  }

  cuandoEligeArchivo(evento: Event) {
    const input = evento.target as HTMLInputElement;
    if (input.files?.length) this.procesarArchivoSubida(input.files[0]);
  }

  abrirSelectorArchivo() {
    this.inputArchivo()?.nativeElement.click();
  }

  cuandoCambiaFilaEncabezado(evento: Event) {
    const valor = parseInt((evento.target as HTMLInputElement).value) || 1;
    this.filaEncabezados.set(Math.max(1, valor));
  }

  quitarArchivoYEmpezarDeNuevo() {
    this.estadoSubida.set('idle');
    this.porcentajeBarra.set(0);
    this.nombreArchivo.set('');
    this.tamanoArchivoVista.set('');
    this.mensajeError.set('');
    this.idArchivoEnServidor.set('');
    this.limpiarDatosTabla();
    const input = this.inputArchivo()?.nativeElement;
    if (input) input.value = '';
  }

  private formatearTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private procesarArchivoSubida(archivo: File) {
    const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['xlsx', 'xls', 'csv'].includes(extension)) {
      this.estadoSubida.set('error');
      this.porcentajeBarra.set(0);
      this.mensajeError.set('Formato no soportado. Usa .xlsx, .xls o .csv');
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
        { reportProgress: true, observe: 'events' }
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
            }
            this.estadoSubida.set('validating');
            this.porcentajeBarra.set(75);
            setTimeout(() => this.porcentajeBarra.set(85), 400);
            setTimeout(() => this.porcentajeBarra.set(95), 800);
            setTimeout(() => {
              this.porcentajeBarra.set(100);
              this.estadoSubida.set('done');
            }, 1200);
          }
        },
        error: (err) => {
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

  irPasoElegirColumnas() {
    this.pasoVisual.set(2);
    this.pedirListaColumnasAlServidor();
  }

  volverPasoSubirArchivo() {
    this.pasoVisual.set(1);
    this.listaColumnas.set([]);
    this.textoBuscarColumnas.set('');
    this.paginaListaColumnas.set(1);
    this.limpiarDatosTabla();
  }

  volverPasoElegirColumnas() {
    this.pasoVisual.set(2);
    this.limpiarDatosTabla();
  }

  pedirTablaAlServidorYMostrarPaso3() {
    const columnasQueQuiero = this.posicionesColumnasElegidas();
    if (columnasQueQuiero.length === 0) return;

    this.esperandoRespuestaTabla.set(true);
    this.mensajeErrorTabla.set('');

    this.http
      .post<{
        success: boolean;
        message?: string;
        data?: {
          sheetName: string;
          headers: string[];
          rows: string[][];
          totalRowsInFile: number;
          truncated: boolean;
        };
      }>(`${URL_SERVIDOR}/api/extract`, {
        filename: this.idArchivoEnServidor(),
        headerRow: this.filaEncabezados(),
        columnIndices: columnasQueQuiero,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (respuesta) => {
          this.esperandoRespuestaTabla.set(false);
          if (respuesta.success && respuesta.data) {
            this.nombreHojaEnResultado.set(respuesta.data.sheetName);
            this.titulosTabla.set(respuesta.data.headers);
            this.filasTabla.set(respuesta.data.rows);
            this.resultadoTruncado.set(respuesta.data.truncated);
            this.totalFilasQueHayEnExcel.set(respuesta.data.totalRowsInFile);
            this.pasoVisual.set(3);
          } else {
            this.mensajeErrorTabla.set(respuesta.message || 'No se pudo extraer los datos');
          }
        },
        error: (err) => {
          this.esperandoRespuestaTabla.set(false);
          const delServidor = err?.error?.message;
          const codigo = err?.status != null ? err.status : '';
          const sinRed = err?.status === 0;
          this.mensajeErrorTabla.set(
            delServidor ||
              (sinRed
                ? 'No hubo respuesta del servidor. ¿Está encendido el backend en el puerto 3000?'
                : `Fallo al pedir la tabla${codigo !== '' ? ` (HTTP ${codigo})` : ''}. Si ves 404, la ruta debe ser POST /api/extract.`)
          );
        },
      });
  }

  abrirVistaPreviaDesdeMenu() {
    if (this.pasoVisual() === 3) return;
    if (!this.idArchivoEnServidor() || this.listaColumnas().length === 0) return;
    this.pedirTablaAlServidorYMostrarPaso3();
  }

  private limpiarDatosTabla() {
    this.esperandoRespuestaTabla.set(false);
    this.mensajeErrorTabla.set('');
    this.nombreHojaEnResultado.set('');
    this.titulosTabla.set([]);
    this.filasTabla.set([]);
    this.resultadoTruncado.set(false);
    this.totalFilasQueHayEnExcel.set(0);
  }

  private pedirListaColumnasAlServidor() {
    this.cargandoListaColumnas.set(true);
    const url = `${URL_SERVIDOR}/api/columns/${this.idArchivoEnServidor()}?headerRow=${this.filaEncabezados()}`;

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
        error: () => {
          this.cargandoListaColumnas.set(false);
        },
      });
  }

  clicEnFilaColumna(posicion: number) {
    this.listaColumnas.update((lista) =>
      lista.map((c) => (c.posicion === posicion ? { ...c, elegida: !c.elegida } : c))
    );
  }

  marcarTodasLasColumnas() {
    this.listaColumnas.update((lista) => lista.map((c) => ({ ...c, elegida: true })));
  }

  quitarMarcaEnTodasLasColumnas() {
    this.listaColumnas.update((lista) => lista.map((c) => ({ ...c, elegida: false })));
  }

  invertirMarcadas() {
    this.listaColumnas.update((lista) => lista.map((c) => ({ ...c, elegida: !c.elegida })));
  }

  alEscribirEnBusquedaColumnas(evento: Event) {
    this.textoBuscarColumnas.set((evento.target as HTMLInputElement).value);
    this.paginaListaColumnas.set(1);
  }

  irAPaginaColumnas(numeroPagina: number) {
    if (numeroPagina >= 1 && numeroPagina <= this.totalPaginasListaColumnas()) {
      this.paginaListaColumnas.set(numeroPagina);
    }
  }
}
