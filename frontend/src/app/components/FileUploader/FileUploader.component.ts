import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { fileService } from '../../services/file.service';
import { ParsedFileResponse } from '../../models/data.models';

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './FileUploader.component.html',
  styleUrls: ['./FileUploader.component.css']
})
export class FileUploaderComponent {
  @Output() fileUploaded = new EventEmitter<ParsedFileResponse>();
  
  isDragOver = false;
  isLoading = false;
  selectedFile: File | null = null;

  constructor(
    private fileService: fileService,
    private snackBar: MatSnackBar
  ) {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    
    const hasValidType = validTypes.includes(file.type);
    const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!hasValidType && !hasValidExtension) {
      this.snackBar.open('Invalid file type. Please upload Excel or CSV files only.', 'Close', {
        duration: 5000,
        panelClass: ['snackbar--error']
      });
      return;
    }

    this.selectedFile = file;
    this.uploadFile();
  }

  uploadFile(): void {
    if (!this.selectedFile) return;

    this.isLoading = true;
    this.fileService.parseFile(this.selectedFile).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.fileUploaded.emit(response);
        this.snackBar.open('File uploaded successfully!', 'Close', {
          duration: 3000,
          panelClass: ['snackbar--success']
        });
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open(`Error: ${error.message || 'Failed to upload file'}`, 'Close', {
          duration: 5000,
          panelClass: ['snackbar--error']
        });
      }
    });
  }

  clearFile(): void {
    this.selectedFile = null;
  }
}
