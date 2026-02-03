import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { schemaService } from '../../services/schema.service';
import { FileData, SchemaDefinition, SupportedType } from '../../models/data.models';

@Component({
  selector: 'app-schema-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './SchemaEditor.component.html',
  styleUrls: ['./SchemaEditor.component.css']
})
export class SchemaEditorComponent implements OnChanges {
  @Input() data: FileData | null = null;
  @Output() schemaChanged = new EventEmitter<SchemaDefinition>();
  
  schema: SchemaDefinition = {};
  supportedTypes: SupportedType[] = [];
  isLoading = false;

  constructor(
    private schemaService: schemaService,
    private snackBar: MatSnackBar
  ) {
    this.loadSupportedTypes();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.detectSchema();
    }
  }

  loadSupportedTypes(): void {
    this.schemaService.getSupportedTypes().subscribe({
      next: (response) => {
        this.supportedTypes = response.types;
      },
      error: () => {
        // Default types if API fails
        this.supportedTypes = [
          { name: 'VARCHAR(255)', description: 'Variable-length string' },
          { name: 'TEXT', description: 'Long text' },
          { name: 'INTEGER', description: 'Whole number' },
          { name: 'DECIMAL(10,2)', description: 'Decimal number' },
          { name: 'DATE', description: 'Date value' },
          { name: 'DATETIME', description: 'Date and time' },
          { name: 'BOOLEAN', description: 'True/False value' }
        ];
      }
    });
  }

  detectSchema(): void {
    if (!this.data) return;

    this.isLoading = true;
    this.schemaService.detectSchema(this.data.headers, this.data.rows).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.schema = response.schema;
        this.emitSchema();
        this.snackBar.open('Schema detected automatically', 'Close', {
          duration: 3000
        });
      },
      error: (error) => {
        this.isLoading = false;
        // Set default schema
        this.data!.headers.forEach(header => {
          this.schema[header] = 'VARCHAR(255)';
        });
        this.emitSchema();
      }
    });
  }

  onTypeChange(column: string, type: string): void {
    this.schema[column] = type;
    this.emitSchema();
  }

  emitSchema(): void {
    this.schemaChanged.emit({ ...this.schema });
  }

  getTypesList(): string[] {
    return this.supportedTypes.map(t => t.name);
  }
}
