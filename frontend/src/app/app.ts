import { ChangeDetectionStrategy, Component, signal, computed, ElementRef, viewChild } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { inject } from '@angular/core';

import { FooterComponent } from './components/footer/footer';
import { HeaderComponent } from './components/header/header';

type UploadState = 'idle' | 'uploading' | 'validating' | 'done' | 'error';

interface ColumnInfo {
  index: number;
  name: string;
  type: string;
  sampleData: string;
  selected: boolean;
}

@Component({
  selector: 'app-root',
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  private http = inject(HttpClient);
  private fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  currentStep = signal(1);

  // Step 1 — Upload
  uploadState = signal<UploadState>('idle');
  progress = signal(0);
  fileName = signal('');
  fileSize = signal('');
  errorMessage = signal('');
  isDragOver = signal(false);
  storedFilename = signal('');
  headerRow = signal(1);

  progressLabel = computed(() => {
    const state = this.uploadState();
    if (state === 'uploading') return 'Subiendo archivo...';
    if (state === 'validating') return 'Procesando datos...';
    if (state === 'done') return 'Completado';
    if (state === 'error') return 'Error';
    return '';
  });

  progressStatus = computed(() => {
    const state = this.uploadState();
    if (state === 'uploading') return 'Transfiriendo archivo al servidor';
    if (state === 'validating') return 'Validando estructura de la hoja';
    if (state === 'done') return 'Archivo procesado correctamente';
    if (state === 'error') return this.errorMessage();
    return '';
  });

  showProgress = computed(() => this.uploadState() !== 'idle');

  // Step 2 — Column selection
  columns = signal<ColumnInfo[]>([]);
  searchQuery = signal('');
  currentPage = signal(1);
  sheetName = signal('');
  totalRows = signal(0);
  columnsLoading = signal(false);
  readonly pageSize = 5;

  selectedCount = computed(() => this.columns().filter(c => c.selected).length);
  totalColumns = computed(() => this.columns().length);

  filteredColumns = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.columns();
    return this.columns().filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.sampleData.toLowerCase().includes(query)
    );
  });

  paginatedColumns = computed(() => {
    const filtered = this.filteredColumns();
    const start = (this.currentPage() - 1) * this.pageSize;
    return filtered.slice(start, start + this.pageSize);
  });

  totalPages = computed(() => Math.ceil(this.filteredColumns().length / this.pageSize) || 1);

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();

    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

    const pages: (number | string)[] = [1];
    if (current > 3) pages.push('...');

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  });

  typeIcon(type: string): string {
    const icons: Record<string, string> = {
      number: 'tag', date: 'calendar_today', text: 'match_case', boolean: 'toggle_on',
    };
    return icons[type] ?? 'help';
  }

  // Step 1 methods

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files?.length) this.handleFile(files[0]);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.handleFile(input.files[0]);
  }

  triggerFileInput() {
    this.fileInput()?.nativeElement.click();
  }

  onHeaderRowChange(event: Event) {
    const value = parseInt((event.target as HTMLInputElement).value) || 1;
    this.headerRow.set(Math.max(1, value));
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      this.uploadState.set('error');
      this.progress.set(0);
      this.errorMessage.set('Formato no soportado. Usa .xlsx, .xls o .csv');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.uploadState.set('error');
      this.progress.set(0);
      this.errorMessage.set('El archivo excede el tamaño máximo de 10MB');
      return;
    }

    this.fileName.set(file.name);
    this.fileSize.set(this.formatSize(file.size));
    this.uploadState.set('uploading');
    this.progress.set(0);
    this.errorMessage.set('');

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<{ success: boolean; data: { storedName: string }; message: string }>(
      'http://localhost:3000/api/upload', formData, {
        reportProgress: true,
        observe: 'events',
      }
    ).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress.set(Math.round((event.loaded / event.total) * 70));
        }
        if (event.type === HttpEventType.Response) {
          const body = event.body;
          if (body?.data?.storedName) {
            this.storedFilename.set(body.data.storedName);
          }
          this.uploadState.set('validating');
          this.progress.set(75);
          setTimeout(() => this.progress.set(85), 400);
          setTimeout(() => this.progress.set(95), 800);
          setTimeout(() => {
            this.progress.set(100);
            this.uploadState.set('done');
          }, 1200);
        }
      },
      error: (err) => {
        this.uploadState.set('error');
        this.progress.set(0);
        const message = err?.error?.message
          || (err.status === 0 ? 'No se pudo conectar al servidor. Verifica que el backend esté corriendo.' : 'Error al subir el archivo');
        this.errorMessage.set(message);
      },
    });
  }

  resetUpload() {
    this.uploadState.set('idle');
    this.progress.set(0);
    this.fileName.set('');
    this.fileSize.set('');
    this.errorMessage.set('');
    this.storedFilename.set('');
    const input = this.fileInput()?.nativeElement;
    if (input) input.value = '';
  }

  // Step 2 methods

  goToStep2() {
    this.currentStep.set(2);
    this.fetchColumns();
  }

  backToUpload() {
    this.currentStep.set(1);
    this.columns.set([]);
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  private fetchColumns() {
    this.columnsLoading.set(true);
    const url = `http://localhost:3000/api/columns/${this.storedFilename()}?headerRow=${this.headerRow()}`;

    this.http.get<{ success: boolean; data: { sheetName: string; totalRows: number; columns: Omit<ColumnInfo, 'selected'>[] } }>(url)
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.columns.set(res.data.columns.map(c => ({ ...c, selected: true })));
            this.sheetName.set(res.data.sheetName);
            this.totalRows.set(res.data.totalRows);
          }
          this.columnsLoading.set(false);
        },
        error: () => {
          this.columnsLoading.set(false);
        },
      });
  }

  toggleColumn(index: number) {
    this.columns.update(cols =>
      cols.map(c => c.index === index ? { ...c, selected: !c.selected } : c)
    );
  }

  selectAll() {
    this.columns.update(cols => cols.map(c => ({ ...c, selected: true })));
  }

  deselectAll() {
    this.columns.update(cols => cols.map(c => ({ ...c, selected: false })));
  }

  invertSelection() {
    this.columns.update(cols => cols.map(c => ({ ...c, selected: !c.selected })));
  }

  onSearch(event: Event) {
    this.searchQuery.set((event.target as HTMLInputElement).value);
    this.currentPage.set(1);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }
}
