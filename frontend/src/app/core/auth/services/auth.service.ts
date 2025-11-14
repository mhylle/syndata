import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User, AuthResponse, LoginRequest, RegisterRequest } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private authUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {
    // Don't make HTTP calls in constructor to avoid circular dependency
  }

  public initializeAuth(): void {
    const token = this.getToken();
    const user = this.getUser();

    if (token && user) {
      // Restore user from localStorage
      this.currentUserSubject.next(user);

      // Optionally validate token with backend in the background
      // this.validateToken();
    }
  }

  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/login`, credentials).pipe(
      tap(response => {
        this.setToken(response.accessToken);
        this.setUser(response.user);
        this.currentUserSubject.next(response.user);
      })
    );
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/register`, data).pipe(
      tap(response => {
        this.setToken(response.accessToken);
        this.setUser(response.user);
        this.currentUserSubject.next(response.user);
      })
    );
  }

  logout(): void {
    this.removeToken();
    this.removeUser();
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private setToken(token: string): void {
    localStorage.setItem('access_token', token);
  }

  private removeToken(): void {
    localStorage.removeItem('access_token');
  }

  private getUser(): User | null {
    const userJson = localStorage.getItem('current_user');
    return userJson ? JSON.parse(userJson) : null;
  }

  private setUser(user: User): void {
    localStorage.setItem('current_user', JSON.stringify(user));
  }

  private removeUser(): void {
    localStorage.removeItem('current_user');
  }

  private validateToken(): void {
    this.http.get<User>(`${this.authUrl}/me`).subscribe({
      next: (user) => {
        this.currentUserSubject.next(user);
      },
      error: (error) => {
        // Only logout on authentication errors (401), not network errors
        if (error.status === 401) {
          this.logout();
        }
      }
    });
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
}
