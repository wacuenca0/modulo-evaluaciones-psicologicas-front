import { Component, signal, inject } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { AppNavComponent } from './general/nav/app-nav.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, AppNavComponent],
  template: `
    @if (!isLoginRoute) {
      <app-nav></app-nav>
    }
    <main class="p-4">
      <router-outlet></router-outlet>
    </main>
  `,
  providers: []
})
export class App {
  protected readonly title = signal('modulo-evaluaciones-psicologicas');
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  // Computed auth state via signals
  isAuthenticated = () => this.auth.isAuthenticated();

  get isLoginRoute(): boolean {
    try {
      const url = this.router.url || '';
      return url.startsWith('/login') || url === '/';
    } catch {
      return false;
    }
  }

  // logout and isAdmin now live inside AppNavComponent
}
