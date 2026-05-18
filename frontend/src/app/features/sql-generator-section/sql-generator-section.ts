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

import { DashboardEventBusService } from '../../core/services/dashboard-event-bus.service';
import { ExtractionSessionService } from '../../core/services/extraction-session.service';

@Component({
  standalone: true,
  selector: 'app-sql-generator-section',
  imports: [RouterLink],
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

  readonly sqlSalida = signal('');
  readonly sqlGenerating = signal(false);
  readonly sqlCopied = signal(false);
  readonly error = signal('');
  readonly meta = signal<{
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

  readonly sqlGenerated = computed(() => this.meta() !== null);

  readonly sqlLines = computed(() => {
    const sql = this.sqlSalida();
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
      const archivo = this.session.nombreArchivo();
      const tabla = this.nombreTabla().trim();
      if (!tabla) {
        this.nombreTabla.set(archivo ? this.deriveTableName(archivo) : 'datos_extraidos');
      }
    });
  }

  alCambiarNombreTabla(valor: string): void {
    this.nombreTabla.set(valor);
  }

  alCambiarDialecto(valor: string): void {
    this.dialecto.set(valor === 'postgresql' ? 'postgresql' : 'mysql');
  }

  alternarIncluirCreate(): void {
    this.incluirCreate.update((v) => !v);
  }

  alternarVacioComoNull(): void {
    this.vacioComoNull.update((v) => !v);
  }

  generar(): void {
    this.error.set('');
    this.meta.set(null);
    if (!this.puedeGenerar()) {
      this.error.set('Completa el nombre de la tabla y selecciona al menos una columna.');
      return;
    }

    this.sqlGenerating.set(true);
    this.session
      .solicitarGeneracionSql({
        tableName: this.nombreTabla().trim(),
        dialect: this.dialecto(),
        includeCreateTable: this.incluirCreate(),
        emptyStringAsNull: this.vacioComoNull(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.sqlGenerating.set(false);
          if (res.ok) {
            this.sqlSalida.set(res.data.sql);
            this.meta.set({
              truncated: res.data.truncated,
              totalRowsInFile: res.data.totalRowsInFile,
              rowCountInScript: res.data.rowCountInScript,
              sheetName: res.data.sheetName,
            });
          } else {
            this.sqlSalida.set('');
            this.error.set(res.message);
          }
        },
      });
  }

  copiarSql(): void {
    const texto = this.sqlSalida();
    if (!texto) return;
    void navigator.clipboard.writeText(texto).then(() => {
      this.sqlCopied.set(true);
      setTimeout(() => this.sqlCopied.set(false), 2000);
    });
  }

  descargarSql(): void {
    const texto = this.sqlSalida();
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
