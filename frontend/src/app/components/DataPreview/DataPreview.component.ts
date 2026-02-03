import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { FileData } from '../../models/data.models';

@Component({
  selector: 'app-data-preview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule
  ],
  templateUrl: './DataPreview.component.html',
  styleUrls: ['./DataPreview.component.css']
})
export class DataPreviewComponent implements OnChanges {
  @Input() data: FileData | null = null;
  
  displayedColumns: string[] = [];
  dataSource: any[] = [];
  paginatedData: any[] = [];
  
  pageSize = 10;
  pageIndex = 0;
  totalRows = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data'] && this.data) {
      this.setupTable();
    }
  }

  setupTable(): void {
    if (!this.data) return;
    
    this.displayedColumns = ['rowNumber', ...this.data.headers];
    this.dataSource = this.data.rows.map((row, index) => {
      const rowObj: any = { rowNumber: index + 1 };
      this.data!.headers.forEach((header, i) => {
        rowObj[header] = row[i] ?? '';
      });
      return rowObj;
    });
    this.totalRows = this.dataSource.length;
    this.updatePaginatedData();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedData();
  }

  updatePaginatedData(): void {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedData = this.dataSource.slice(startIndex, endIndex);
  }

  getCellValue(row: any, column: string): string {
    const value = row[column];
    if (value === null || value === undefined) return '';
    return String(value);
  }
}
