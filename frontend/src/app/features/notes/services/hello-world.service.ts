import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface HelloWorld {
  id: number;
  text: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class HelloWorldService {
  private apiUrl = `${environment.apiUrl}/hello-world`;

  constructor(private http: HttpClient) { }

  create(text: string): Observable<HelloWorld> {
    return this.http.post<HelloWorld>(this.apiUrl, { text });
  }

  getAll(): Observable<HelloWorld[]> {
    return this.http.get<HelloWorld[]>(this.apiUrl);
  }
}