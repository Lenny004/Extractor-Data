import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SchemaDefinition, ValidationResult, SupportedType } from '../models/data.models';

@Injectable({
  providedIn: 'root'
})
export class SchemaService {
  private apiUrl = 'http://localhost:3000/api/schema';

  constructor(private http: HttpClient) {}

  validateSchema(schema: SchemaDefinition, data: any[]): Observable<ValidationResult> {
    return this.http.post<ValidationResult>(`${this.apiUrl}/validate`, { schema, data });
  }

  detectSchema(headers: string[], rows: any[][]): Observable<{ success: boolean; schema: SchemaDefinition }> {
    return this.http.post<{ success: boolean; schema: SchemaDefinition }>(
      `${this.apiUrl}/detect`, 
      { headers, rows }
    );
  }

  getSupportedTypes(): Observable<{ success: boolean; types: SupportedType[] }> {
    return this.http.get<{ success: boolean; types: SupportedType[] }>(`${this.apiUrl}/types`);
  }
}
