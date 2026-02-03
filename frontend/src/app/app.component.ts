import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { FileUploaderComponent } from './components/FileUploader/FileUploader.component';
import { DataPreviewComponent } from './components/DataPreview/DataPreview.component';
import { SchemaEditorComponent } from './components/SchemaEditor/SchemaEditor.component';
import { SqlGeneratorComponent } from './components/SqlGenerator/SqlGenerator.component';
import { FileData, ParsedFileResponse, SchemaDefinition } from './models/data.models';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatIconModule,
    FileUploaderComponent,
    DataPreviewComponent,
    SchemaEditorComponent,
    SqlGeneratorComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Data Extractor Tool';
  fileData: FileData | null = null;
  schema: SchemaDefinition | null = null;

  onFileUploaded(response: ParsedFileResponse): void {
    this.fileData = {
      filename: response.filename,
      sheetName: response.sheetName,
      headers: response.headers,
      rows: response.rows,
      totalRows: response.totalRows
    };
  }

  onSchemaChanged(schema: SchemaDefinition): void {
    this.schema = schema;
  }
}
