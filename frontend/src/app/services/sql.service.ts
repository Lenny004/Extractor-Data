import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SchemaDefinition, SqlGenerationResult } from '../models/data.models';

@Injectable({
  providedIn: 'root'
})
export class SqlService {
  private apiUrl = 'http://localhost:3000/api/sql';

  constructor(private http: HttpClient) {}

  generateInsert(
    tableName: string, 
    headers: string[], 
    rows: any[][], 
    schema?: SchemaDefinition
  ): Observable<SqlGenerationResult> {
    return this.http.post<SqlGenerationResult>(`${this.apiUrl}/generate/insert`, {
      tableName,
      headers,
      rows,
      schema
    });
  }

  generateCreateTable(tableName: string, schema: SchemaDefinition): Observable<SqlGenerationResult> {
    return this.http.post<SqlGenerationResult>(`${this.apiUrl}/generate/create-table`, {
      tableName,
      schema
    });
  }

  generateFullScript(
    tableName: string, 
    headers: string[], 
    rows: any[][], 
    schema: SchemaDefinition
  ): Observable<SqlGenerationResult> {
    return this.http.post<SqlGenerationResult>(`${this.apiUrl}/generate/full`, {
      tableName,
      headers,
      rows,
      schema
    });
  }
}
