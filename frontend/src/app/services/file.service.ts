import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ParsedFileResponse } from '../models/data.models';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private apiUrl = 'http://localhost:3000/api/files';

  constructor(private http: HttpClient) {}

  uploadFile(file: File): Observable<ParsedFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ParsedFileResponse>(`${this.apiUrl}/upload`, formData);
  }

  parseFile(file: File): Observable<ParsedFileResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ParsedFileResponse>(`${this.apiUrl}/parse`, formData);
  }

  previewFile(file: File, limit: number = 10): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<any>(`${this.apiUrl}/preview?limit=${limit}`, formData);
  }
}
