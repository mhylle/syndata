import { Component, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoginDialogComponent } from './features/auth/components/login-dialog.component';
import { AuthService } from './core/auth/services';
import { User } from './core/auth/models';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, LoginDialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  @ViewChild(LoginDialogComponent) loginDialog!: LoginDialogComponent;

  title = 'syndata';

  constructor(private authService: AuthService) {}

  get currentUser$() {
    return this.authService.currentUser$;
  }

  openLogin(): void {
    this.loginDialog.open(true);
  }

  openRegister(): void {
    this.loginDialog.open(false);
  }

  logout(): void {
    this.authService.logout();
  }

  getUserDisplayName(user: User): string {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.lastName) {
      return user.lastName;
    }
    return user.email;
  }
}
