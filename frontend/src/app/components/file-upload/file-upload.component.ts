import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.css'
})
export class FileUploadComponent {
  SelectedFile: File | null = null;
  IsUploading = false;
  UploadProgress = 0;

  OnFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.SelectedFile = input.files[0];
    }
  }

  OnUpload(): void {
    if (!this.SelectedFile) return;
    
    this.IsUploading = true;
    this.UploadProgress = 0;

    const interval = setInterval(() => {
      this.UploadProgress += 10;
      if (this.UploadProgress >= 100) {
        clearInterval(interval);
        this.IsUploading = false;
      }
    }, 200);
  }

  OnClear(): void {
    this.SelectedFile = null;
    this.UploadProgress = 0;
  }
}
