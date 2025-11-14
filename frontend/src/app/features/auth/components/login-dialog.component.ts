import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/services';
import { LoginRequest, RegisterRequest } from '../../../core/auth/models';

@Component({
  selector: 'app-login-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-dialog.component.html',
  styleUrls: ['./login-dialog.component.scss']
})
export class LoginDialogComponent {
  isVisible = false;
  isLoginMode = true;
  loading = false;
  error = '';

  formData = {
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  };

  constructor(private authService: AuthService) {}

  open(loginMode = true): void {
    this.isLoginMode = loginMode;
    this.isVisible = true;
    this.reset();
  }

  close(): void {
    this.isVisible = false;
    this.reset();
  }

  onOverlayClick(event: MouseEvent): void {
    // Only close if clicking directly on the overlay, not its children
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  toggleMode(): void {
    this.isLoginMode = !this.isLoginMode;
    this.error = '';
  }

  onSubmit(): void {
    this.error = '';
    this.loading = true;

    if (this.isLoginMode) {
      this.login();
    } else {
      this.register();
    }
  }

  private login(): void {
    const credentials: LoginRequest = {
      email: this.formData.email,
      password: this.formData.password
    };

    this.authService.login(credentials).subscribe({
      next: () => {
        this.loading = false;
        this.close();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Login failed. Please try again.';
      }
    });
  }

  private register(): void {
    const data: RegisterRequest = {
      email: this.formData.email,
      password: this.formData.password,
      confirmPassword: this.formData.confirmPassword,
      firstName: this.formData.firstName || undefined,
      lastName: this.formData.lastName || undefined
    };

    this.authService.register(data).subscribe({
      next: () => {
        this.loading = false;
        this.close();
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Registration failed. Please try again.';
      }
    });
  }

  private reset(): void {
    this.formData = {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: ''
    };
    this.error = '';
    this.loading = false;
  }
}
