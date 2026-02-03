import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { DataViewerComponent } from './components/data-viewer/data-viewer.component';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, FileUploadComponent, DataViewerComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
  Title = 'Data Extractor Tool';
}
