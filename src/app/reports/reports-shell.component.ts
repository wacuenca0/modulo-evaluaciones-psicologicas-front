import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

interface ReportLink {
  path: string;
  label: string;
}

@Component({
  selector: 'app-reports-shell',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-6">
      <nav class="flex flex-wrap gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        @for (link of links; track link.path) {
          <a
            [routerLink]="link.path"
            routerLinkActive="bg-slate-900 text-white"
            [routerLinkActiveOptions]="{ exact: true }"
            class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:bg-slate-100"
          >
            {{ link.label }}
          </a>
        }
      </nav>
      <router-outlet />
    </section>
  `
})
export class ReportsShellComponent {
  readonly links: ReportLink[] = [
    { path: 'atenciones-psicologos', label: 'Atenciones por psicólogo' },
    { path: 'personal-diagnosticos', label: 'Personal por diagnóstico' },
    { path: 'historial-fichas', label: 'Historial de fichas' },
    { path: 'condicion-seguimiento', label: 'Condición seguimiento' }
  ];
}
