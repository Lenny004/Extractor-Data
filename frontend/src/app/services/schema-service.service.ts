import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SchemaServiceService {
  private ApiUrl = 'http://localhost:3000/api/schemas';

  constructor(private Http: HttpClient) { }

  ValidateSchema(Schema: any, Data: any): Observable<any> {
    return this.Http.post(`${this.ApiUrl}/validate`, { schema: Schema, data: Data });
  }

  GetTemplates(): Observable<any> {
    return this.Http.get(`${this.ApiUrl}/templates`);
  }
}
