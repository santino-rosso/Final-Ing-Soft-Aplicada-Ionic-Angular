import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.url;

  constructor(private http: HttpClient) {}

  login(username: string, password: string, rememberMe: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/authenticate`, { username, password, rememberMe });
  }

  register(login: string, email: string, langKey: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, { login, email, langKey, password }, {observe : 'response'});
  }
}