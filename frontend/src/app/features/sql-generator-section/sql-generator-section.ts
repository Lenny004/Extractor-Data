import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { SheetTabsComponent } from '../../components/sheet-tabs/sheet-tabs';
import { DashboardEventBusService } from '../../core/services/dashboard-event-bus.service';
import { ExtractionSessionService } from '../../core/services/extraction-session.service';

@Component({
  standalone: true,
  selector: 'app-sql-generator-section',
  imports: [RouterLink, SheetTabsComponent],
  templateUrl: './sql-generator-section.html',
  styleUrl: './sql-generator-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SqlGeneratorSectionComponent {
  readonly session = inject(ExtractionSessionService);
  private readonly eventBus = inject(DashboardEventBusService);
  private readonly destroyRef = inject(DestroyRef);

  readonly nombreTabla = signal('');
  readonly dialecto = signal<'mysql' | 'postgresql'>('postgresql');
  readonly incluirCreate = signal(true);
  readonly vacioComoNull = signal(false);

  readonly _sqlSalida = signal('');
  readonly _sqlGenerating = signal(false);
  readonly sqlCopied = signal(false);
  readonly _error = signal('');
  readonly _sqlMeta = signal<{
    truncated: boolean;
    totalRowsInFile: number;
    rowCountInScript: number;
    sheetName: string;
  } | null>(null);

  readonly previewMaxLines = 60;

  readonly puedeGenerar = computed(
    () =>
      this.session.tieneArchivoListo() &&
      this.session.cuantasColumnasElegidas() > 0 &&
      this.nombreTabla().trim().length > 0,
  );

  readonly sqlGenerated = computed(() => this._sqlMeta() !== null);

  readonly csvDownloadReady = computed(
    () => this.session.titulosTabla().length > 0 && this.session.filasTabla().length > 0,
  );

  readonly sqlLines = computed(() => {
    const sql = this._sqlSalida();
    if (!sql) return [];
    const allLines = sql.split('\n');
    const capped = allLines.length > this.previewMaxLines;
    const lines = capped ? allLines.slice(0, this.previewMaxLines) : allLines;
    const result = lines.map((text, i) => ({
      num: i + 1,
      segments: this.tokenizeLine(text),
    }));
    if (capped) {
      const remaining = allLines.length - this.previewMaxLines;
      result.push({
        num: this.previewMaxLines + 1,
        segments: [{ text: `-- ... ${remaining} líneas más`, cls: 'sql-comment' }],
      });
    }
    return result;
  });

  constructor() {
    afterNextRender(() => {
      this.cargarDefaults();
    });
  }

  private cargarDefaults(): void {
    this.sincronizarConWorkflow();
    if (!this.nombreTabla()) {
      this.derivarNombreTabla();
    }
  }

  private derivarNombreTabla(): void {
    const archivo = this.session.nombreArchivo();
    if (archivo) {
      const wf = this.session.activeWorkflow();
      const base = this.deriveTableName(archivo);
      const sheetSuffix = wf ? `_${wf.sheetName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}` : '';
      const name = `${base}${sheetSuffix}`;
      this.nombreTabla.set(name);
      this.escribirAWorkflow({ tableName: name });
    } else {
      this.nombreTabla.set('datos_extraidos');
      this.escribirAWorkflow({ tableName: 'datos_extraidos' });
    }
  }

  private sincronizarConWorkflow(): void {
    const wf = this.session.activeWorkflow();
    if (!wf) return;
    this.nombreTabla.set(wf.tableName);
    this.dialecto.set(wf.dialect);
    this.incluirCreate.set(wf.includeCreateTable);
    this.vacioComoNull.set(wf.emptyStringAsNull);
    this._sqlSalida.set(wf.sqlOutput);
    this._sqlMeta.set(wf.sqlMeta);
    this._sqlGenerating.set(wf.sqlGenerating);
    this._error.set(wf.sqlError);
  }

  private escribirAWorkflow(patch: Record<string, unknown>): void {
    const wf = this.session.activeWorkflow();
    if (!wf) return;
    this.session.patchWorkflow(wf.sheetName, patch as any);
  }

  cambiarHoja(name: string): void {
    const current = this.session.activeSheetName();
    if (name === current) return;
    this.session.activarHoja(name);
    this.sincronizarConWorkflow();
    this.sqlCopied.set(false);
    if (!this.nombreTabla()) {
      this.derivarNombreTabla();
    }
    const wf = this.session.activeWorkflow();
    if (wf && wf.columns.length === 0 && !wf.loadingColumns) {
      this.session.pedirColumnasDeHoja(name);
    }
  }

  alCambiarNombreTabla(valor: string): void {
    this.nombreTabla.set(valor);
    this.escribirAWorkflow({ tableName: valor });
  }

  alCambiarDialecto(valor: string): void {
    const d = valor === 'postgresql' ? 'postgresql' : 'mysql';
    this.dialecto.set(d);
    this.escribirAWorkflow({ dialect: d });
  }

  alternarIncluirCreate(): void {
    const v = !this.incluirCreate();
    this.incluirCreate.set(v);
    this.escribirAWorkflow({ includeCreateTable: v });
  }

  alternarVacioComoNull(): void {
    const v = !this.vacioComoNull();
    this.vacioComoNull.set(v);
    this.escribirAWorkflow({ emptyStringAsNull: v });
  }

  generar(): void {
    this._error.set('');
    this._sqlMeta.set(null);
    if (!this.puedeGenerar()) {
      this._error.set('Completa el nombre de la tabla y selecciona al menos una columna.');
      return;
    }

    this._sqlGenerating.set(true);
    this.escribirAWorkflow({ sqlGenerating: true });

    const wf = this.session.activeWorkflow();
    if (!wf) {
      this._error.set('No hay una hoja activa.');
      this._sqlGenerating.set(false);
      return;
    }

    this.session
      .solicitarGeneracionSqlDeHoja(wf.sheetName, {
        tableName: this.nombreTabla().trim(),
        dialect: this.dialecto(),
        includeCreateTable: this.incluirCreate(),
        emptyStringAsNull: this.vacioComoNull(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this._sqlGenerating.set(false);
          if (res.ok) {
            this._sqlSalida.set(res.data.sql);
            this._sqlMeta.set({
              truncated: res.data.truncated,
              totalRowsInFile: res.data.totalRowsInFile,
              rowCountInScript: res.data.rowCountInScript,
              sheetName: res.data.sheetName,
            });
          } else {
            this._sqlSalida.set('');
            this._error.set(res.message);
          }
        },
      });
  }

  copiarSql(): void {
    const texto = this._sqlSalida();
    if (!texto) return;
    void navigator.clipboard.writeText(texto).then(() => {
      this.sqlCopied.set(true);
      setTimeout(() => this.sqlCopied.set(false), 2000);
    });
  }

  descargarSql(): void {
    const texto = this._sqlSalida();
    if (!texto) return;
    const nombreBase = this.nombreTabla().trim().replace(/[^\w.-]+/g, '_') || 'output';
    const blob = new Blob([texto], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombreBase}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  }

  descargarCsv(): void {
    const headers = this.session.titulosTabla();
    const rows = this.session.filasTabla();
    if (headers.length === 0 || rows.length === 0) return;

    const escapar = (v: string): string => {
      if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    };

    const lineas: string[] = [headers.map(escapar).join(',')];
    for (const fila of rows) {
      lineas.push(fila.map(escapar).join(','));
    }

    const bom = '\uFEFF';
    const blob = new Blob([bom + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const nombreBase = this.nombreTabla().trim().replace(/[^\w.-]+/g, '_') || 'output';
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombreBase}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  volverAColumnas(): void {
    this.eventBus.emit({ type: 'REQUEST_NAVIGATION', payload: { target: 'columnas' } });
  }

  volverASubir(): void {
    this.eventBus.emit({ type: 'REQUEST_NAVIGATION', payload: { target: 'subir' } });
  }

  private tokenizeLine(line: string): { text: string; cls: string }[] {
    if (line.trimStart().startsWith('--')) {
      return [{ text: line, cls: 'sql-comment' }];
    }

    const segments: { text: string; cls: string }[] = [];
    const keywords =
      'CREATE|TABLE|INSERT|INTO|VALUES|PRIMARY|KEY|NOT|NULL|DEFAULT|SERIAL|VARCHAR|INTEGER|INT|NUMERIC|DECIMAL|BOOLEAN|DATE|TIMESTAMP|DATETIME|DATETIME2|TEXT|REAL|NVARCHAR|BIT|TINYINT|INDEX|ON|AUTO_INCREMENT|IDENTITY';
    const regex = new RegExp(`('(?:[^']|'')*'|\\b(?:${keywords})\\b|\\b\\d+(?:\\.\\d+)?\\b)`, 'gi');

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ text: line.slice(lastIndex, match.index), cls: 'sql-plain' });
      }
      const token = match[0];
      if (token.startsWith("'")) segments.push({ text: token, cls: 'sql-string' });
      else if (/^\d/.test(token)) segments.push({ text: token, cls: 'sql-number' });
      else segments.push({ text: token, cls: 'sql-keyword' });
      lastIndex = match.index + token.length;
    }
    if (lastIndex < line.length) {
      segments.push({ text: line.slice(lastIndex), cls: 'sql-plain' });
    }
    return segments;
  }

  private deriveTableName(filename: string): string {
    return filename
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }
}
