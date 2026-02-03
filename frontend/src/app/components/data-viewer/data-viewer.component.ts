import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';

interface DataRow {
  Id: number;
  Name: string;
  Email: string;
  Status: string;
}

@Component({
  selector: 'app-data-viewer',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatChipsModule],
  templateUrl: './data-viewer.component.html',
  styleUrl: './data-viewer.component.css'
})
export class DataViewerComponent {
  DisplayedColumns: string[] = ['Id', 'Name', 'Email', 'Status'];
  DataSource: DataRow[] = [
    { Id: 1, Name: 'John Doe', Email: 'john@example.com', Status: 'Valid' },
    { Id: 2, Name: 'Jane Smith', Email: 'jane@example.com', Status: 'Valid' },
    { Id: 3, Name: 'Bob Johnson', Email: 'bob@example.com', Status: 'Invalid' }
  ];
}
