import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SpaceEventsService {
  private apiUrl = environment.url;

  private headers_http = new HttpHeaders({
    'Authorization': `Bearer ${localStorage.getItem('jwt')}`
  });

  constructor(private http: HttpClient) {}

  getSpaceEvents(): Observable<any> {
    return this.http.get(`${this.apiUrl}/space-events`, { headers: this.headers_http });
  }
}
