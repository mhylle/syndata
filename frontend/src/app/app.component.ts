import { Component, OnInit, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HelloWorldService, HelloWorld } from './features/notes/services/hello-world.service';
import { LoginDialogComponent } from './features/auth/components/login-dialog.component';
import { AuthService } from './core/auth/services';
import { User } from './core/auth/models';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule, CommonModule, LoginDialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  @ViewChild(LoginDialogComponent) loginDialog!: LoginDialogComponent;

  title = 'MyNotes';
  text = '';
  helloWorlds: HelloWorld[] = [];
  loading = false;
  error = '';

  constructor(
    private helloWorldService: HelloWorldService,
    private authService: AuthService
  ) {}

  get currentUser$() {
    return this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.loadHelloWorlds();
  }

  loadHelloWorlds(): void {
    this.loading = true;
    this.error = '';
    this.helloWorldService.getAll().subscribe({
      next: (data) => {
        this.helloWorlds = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load data: ' + err.message;
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (!this.text.trim()) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.helloWorldService.create(this.text).subscribe({
      next: () => {
        this.text = '';
        this.loadHelloWorlds();
      },
      error: (err) => {
        this.error = 'Failed to save: ' + err.message;
        this.loading = false;
      }
    });
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
