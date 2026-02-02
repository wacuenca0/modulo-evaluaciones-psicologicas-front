import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-users-tabs',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="mb-4 flex items-center gap-2 text-sm">
      <a routerLink="/users" routerLinkActive="bg-indigo-600 text-white"
         [routerLinkActiveOptions]="{ exact: true }"
         class="px-3 py-1.5 rounded-full border border-indigo-600 text-indigo-700 hover:bg-indigo-50 transition">
        Listado
      </a>
      <a routerLink="/users/new" routerLinkActive="bg-indigo-600 text-white"
         [routerLinkActiveOptions]="{ exact: true }"
         class="px-3 py-1.5 rounded-full border border-indigo-600 text-indigo-700 hover:bg-indigo-50 transition">
        Nuevo
      </a>
      <a routerLink="/users/password-requests" routerLinkActive="bg-indigo-600 text-white"
         [routerLinkActiveOptions]="{ exact: true }"
         class="px-3 py-1.5 rounded-full border border-indigo-600 text-indigo-700 hover:bg-indigo-50 transition">
        Solicitudes
      </a>
    </nav>
  `
})
export class UsersTabsComponent {}
