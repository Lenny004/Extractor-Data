import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { SqlService } from '../../services/sql.service';
import { FileData, SchemaDefinition, SqlGenerationResult } from '../../models/data.models';

@Component({
  selector: 'app-sql-generator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule
  ],
  templateUrl: './SqlGenerator.component.html',
  styleUrls: ['./SqlGenerator.component.css']
})
export class SqlGeneratorComponent implements OnChanges {
  @Input() data: FileData | null = null;
  @Input() schema: SchemaDefinition | null = null;
  
  tableName = 'my_table';
  generatedSql = '';
  createTableSql = '';
  insertSql = '';
  isLoading = false;

  constructor(
    private sqlService: SqlService,
    private snackBar: MatSnackBar
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      // Suggest table name from filename
      const filename = this.data.filename.replace(/\.[^.]+$/, '');
      this.tableName = this.sanitizeName(filename);
    }
  }

  sanitizeName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^[0-9]/, '_$&')
      .replace(/_+/g, '_')
      .toLowerCase();
  }

  generateFullScript(): void {
    if (!this.data || !this.schema) {
      this.snackBar.open('Please upload a file and configure schema first', 'Close', {
        duration: 3000
      });
      return;
    }

    this.isLoading = true;
    this.sqlService.generateFullScript(
      this.tableName,
      this.data.headers,
      this.data.rows,
      this.schema
    ).subscribe({
      next: (response: SqlGenerationResult) => {
        this.isLoading = false;
        this.generatedSql = response.sql;
        this.createTableSql = response.createTable || '';
        this.insertSql = response.insertStatements?.join('\n') || '';
        this.snackBar.open('SQL generated successfully!', 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open(`Error: ${error.message || 'Failed to generate SQL'}`, 'Close', {
          duration: 5000
        });
      }
    });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Copied to clipboard!', 'Close', {
        duration: 2000
      });
    });
  }

  downloadSql(): void {
    if (!this.generatedSql) return;

    const blob = new Blob([this.generatedSql], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.tableName}.sql`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  get canGenerate(): boolean {
    return !!this.data && !!this.schema && !!this.tableName;
  }
}
