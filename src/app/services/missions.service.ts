import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MissionsService {
  private apiUrl = environment.url;

  private headers_http = new HttpHeaders({
    'Authorization': `Bearer ${localStorage.getItem('jwt')}`
  });

  constructor(private http: HttpClient) {}

  createMission(mission: any): Observable<any> {
  return this.http.post(`${this.apiUrl}/missions`, mission, { headers: this.headers_http });
  }
}

