import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private ApiUrl = 'http://localhost:3000/api/files';

  constructor(private Http: HttpClient) { }

  UploadFile(File: File): Observable<any> {
    const FormData = new FormData();
    FormData.append('file', File);
    return this.Http.post(`${this.ApiUrl}/upload`, FormData);
  }

  ProcessFile(FileData: any, Options: any): Observable<any> {
    return this.Http.post(`${this.ApiUrl}/process`, { fileData: FileData, options: Options });
  }

  DownloadFile(FileId: string): Observable<any> {
    return this.Http.get(`${this.ApiUrl}/download/${FileId}`);
  }
}
