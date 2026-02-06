import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsersTabsComponent } from '../users-tabs.component';
import {
  PasswordChangeRequestDTO,
  PasswordChangeStatus
} from '../../models/password-change-request.models';
import { PasswordChangeService } from '../../services/password-change.service';
import { PsicologosService } from '../../services/psicologos.service';

const STATUS_LABEL: Record<PasswordChangeStatus, string> = {
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado'
};

type FilterOption = PasswordChangeStatus;

@Component({
  selector: 'app-password-requests',
  imports: [CommonModule, ReactiveFormsModule, UsersTabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section style="width:100vw;min-height:100vh;height:100vh;display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch;padding:0;margin:0;background:#fff;">
      <header class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">Atención a usuarios</p>
        <h1 class="text-3xl font-semibold text-slate-900">Solicitudes de cambio de contraseña</h1>
        <p class="text-sm text-slate-500 max-w-2xl">
          Gestiona de forma integral las solicitudes de restablecimiento. Filtra por estado, revisa los detalles y completa o rechaza cada caso con total trazabilidad.
        </p>
      </header>

      <app-users-tabs></app-users-tabs>

      @if (error()) {
        <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {{ error() }}
        </div>
      }

      <div class="grid gap-6 lg:grid-cols-[1.6fr,1fr]" style="flex:1 1 auto;width:100vw;min-height:0;margin:0;padding:0;box-sizing:border-box;">
        <article style="width:100%;height:100%;min-height:0;background:#fff;border-radius:1.5rem;box-shadow:0 2px 8px rgba(0,0,0,0.03);border:1px solid #e2e8f0;padding:2vw;display:flex;flex-direction:column;">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-900">Bandeja de solicitudes</h2>
              <p class="text-sm text-slate-500">{{ statusDescription() }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              @for (option of filterOptions; track option) {
                <button
                  type="button"
                  (click)="setFilter(option)"
                  [class.bg-slate-900]="statusFilter() === option"
                  [class.text-white]="statusFilter() === option"
                  [class.shadow-md]="statusFilter() === option"
                  class="flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm"
                >
                  @if (option === 'PENDIENTE') {
                    <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                    </svg>
                  }
                  @if (option === 'APROBADO') {
                    <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                    </svg>
                  }
                  @if (option === 'RECHAZADO') {
                    <svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                  }
                  {{ filterLabel(option) }}
                </button>
              }
            </div>
          </div>

          <div class="mt-6">
            @if (loading()) {
              <div class="space-y-3">
                @for (_ of [0,1,2,3]; track $index) {
                  <div class="h-16 animate-pulse rounded-2xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100"></div>
                }
              </div>
            } @else if (!requests().length) {
              <div class="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                <svg class="mx-auto mb-3 h-12 w-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                No hay solicitudes registradas con el filtro seleccionado.
              </div>
            } @else {
              <ul class="space-y-3">
                @for (request of requests(); track request.id) {
                  <li class="relative">
                    <button
                      type="button"
                      (click)="select(request)"
                      [class.border-slate-900]="selected()?.id === request.id"
                      [class.ring-2]="selected()?.id === request.id"
                      [class.ring-slate-100]="selected()?.id === request.id"
                      class="group w-full rounded-2xl border border-slate-200 bg-white p-5 text-left transition-all duration-200 hover:border-slate-400 hover:shadow-md"
                    >
                      <div class="flex flex-wrap items-center justify-between gap-3">
                        <div class="flex items-center gap-3">
                          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 group-hover:from-slate-200 group-hover:to-slate-300">
                            <svg class="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                          </div>
                          <div>
                            <p class="text-sm font-semibold text-slate-900">{{ request.username }}</p>
                            <p class="text-xs text-slate-500">Registrada {{ request.requestedAt | date: 'short' }}</p>
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
                          <span
                            class="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
                            [class.bg-amber-50]="request.status === 'PENDIENTE'"
                            [class.text-amber-700]="request.status === 'PENDIENTE'"
                            [class.border]="request.status === 'PENDIENTE'"
                            [class.border-amber-200]="request.status === 'PENDIENTE'"
                            [class.bg-emerald-50]="request.status === 'APROBADO'"
                            [class.text-emerald-700]="request.status === 'APROBADO'"
                            [class.border]="request.status === 'APROBADO'"
                            [class.border-emerald-200]="request.status === 'APROBADO'"
                            [class.bg-rose-50]="request.status === 'RECHAZADO'"
                            [class.text-rose-700]="request.status === 'RECHAZADO'"
                            [class.border]="request.status === 'RECHAZADO'"
                            [class.border-rose-200]="request.status === 'RECHAZADO'"
                          >
                            @if (request.status === 'PENDIENTE') {
                              <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                              </svg>
                            }
                            @if (request.status === 'APROBADO') {
                              <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                              </svg>
                            }
                            @if (request.status === 'RECHAZADO') {
                              <svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                              </svg>
                            }
                            {{ filterLabel(request.status) }}
                          </span>
                          <!-- Botón de menú flotante eliminado -->
                        </div>
                      </div>
                      <p class="mt-3 line-clamp-2 text-sm text-slate-600" [class.italic]="!request.motivo">
                        {{ request.motivo || 'Sin motivo especificado' }}
                      </p>
                    </button>
                    <dl class="grid gap-3 text-sm">
                      <div class="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
                        <dt class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                          </svg>
                          Notas del solicitante
                        </dt>
                        <dd class="whitespace-pre-line text-slate-900">{{ request.motivo || 'Sin comentarios adicionales' }}</dd>
                      </div>
                      @if (request.adminNotes) {
                        <div class="rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm">
                          <dt class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                            </svg>
                            Notas administrativas
                          </dt>
                          <dd class="whitespace-pre-line text-slate-900">{{ request.adminNotes }}</dd>
                        </div>
                      }
                    </dl>
                  </li>
                } <!-- end @for -->
              </ul>
              }

              @if (selected()?.status === 'PENDIENTE') {
                <section class="space-y-6 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-sm">
                  <h3 class="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-600">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    Completar solicitud
                  </h3>
                  
                  <form [formGroup]="completeForm" (ngSubmit)="complete()" class="space-y-4">
                    <div>
                      <label class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                        </svg>
                        Nueva contraseña
                      </label>
                      <input 
                        formControlName="newPassword" 
                        type="password" 
                        autocomplete="off" 
                        placeholder="Ingresa la nueva contraseña"
                        class="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm transition-all focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-100"
                      />
                    </div>
                    
                    <div>
                      <label class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                        </svg>
                        Notas para el usuario
                      </label>
                      <textarea 
                        formControlName="adminNotes" 
                        rows="3" 
                        placeholder="Agrega notas adicionales para el usuario"
                        class="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm transition-all focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-100"
                      ></textarea>
                    </div>
                    
                    <label class="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-slate-300 hover:bg-slate-50">
                      <input type="checkbox" formControlName="unlockAccount" class="h-4 w-4 rounded border border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-100" />
                      <div>
                        <p class="text-sm font-medium text-slate-900">Desbloquear cuenta al completar</p>
                        <p class="text-xs text-slate-500">La cuenta se desbloqueará automáticamente después de cambiar la contraseña</p>
                      </div>
                    </label>
                    
                    <button 
                      type="submit" 
                      [disabled]="completeForm.invalid || completing()"
                      class="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      @if (completing()) {
                        <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Guardando cambios...
                      } @else {
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Completar solicitud
                      }
                    </button>
                  </form>

                  <div class="relative">
                    <div class="absolute inset-0 flex items-center">
                      <div class="w-full border-t border-dashed border-slate-200"></div>
                    </div>
                    <div class="relative flex justify-center">
                      <span class="bg-white px-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Rechazar solicitud</span>
                    </div>
                  </div>

                  <form [formGroup]="rejectForm" (ngSubmit)="reject()" class="space-y-4">
                    <div>
                      <label class="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-rose-600">
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Motivo del rechazo
                      </label>
                      <textarea 
                        formControlName="adminNotes" 
                        rows="3" 
                        placeholder="Describe por qué se rechaza esta solicitud"
                        class="w-full rounded-lg border border-rose-200 bg-rose-50/50 px-4 py-3 text-sm transition-all focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                      ></textarea>
                    </div>
                    <button 
                      type="submit" 
                      [disabled]="rejectForm.invalid || rejecting()"
                      class="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-3 text-sm font-semibold text-rose-600 transition-all hover:border-rose-400 hover:bg-rose-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      @if (rejecting()) {
                        <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Registrando rechazo...
                      } @else {
                        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Rechazar solicitud
                      }
                    </button>
                  </form>
                </section>
              }
  
  `
})
export class PasswordRequestsComponent implements OnInit {
  // ... El resto del código permanece igual (las signals, métodos, etc.)
  readonly openActionMenu = signal<number | null>(null);

  toggleActionMenu(requestId: number) {
    this.openActionMenu.set(this.openActionMenu() === requestId ? null : requestId);
    this.error.set(null);
  }

  onApprove(request: PasswordChangeRequestDTO) {
    if (this.completeForm.invalid) return;
    this.select(request);
    this.complete();
    this.openActionMenu.set(null);
  }

  onReject(request: PasswordChangeRequestDTO) {
    if (this.rejectForm.invalid) return;
    this.select(request);
    this.reject();
    this.openActionMenu.set(null);
  }

  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PasswordChangeService);
  private readonly psicologosService = inject(PsicologosService);

  private readonly defaultFilter: FilterOption = 'PENDIENTE';
  readonly filterOptions: FilterOption[] = ['PENDIENTE', 'APROBADO', 'RECHAZADO'];

  readonly statusFilter = signal<FilterOption>(this.defaultFilter);
  readonly requests = signal<PasswordChangeRequestDTO[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selected = signal<PasswordChangeRequestDTO | null>(null);

  readonly creating = signal(false);
  readonly completing = signal(false);
  readonly rejecting = signal(false);

  readonly adminNamesByPsicologoId = signal<Record<number, string>>({});

  readonly statusDescription = computed(() => {
    const filter = this.statusFilter();
    switch (filter) {
      case 'PENDIENTE':
        return 'Solicitudes en espera de atención.';
      case 'APROBADO':
        return 'Historial de solicitudes aprobadas.';
      case 'RECHAZADO':
        return 'Solicitudes rechazadas con su justificación.';
      default:
        return 'Visualiza todas las solicitudes registradas.';
    }
  });

  readonly completeForm = this.fb.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    adminNotes: [''],
    unlockAccount: [true]
  });

  readonly rejectForm = this.fb.group({
    adminNotes: ['']
  });

  readonly createForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    contactEmail: ['', Validators.email],
    motivo: ['']
  });

  ngOnInit(): void {
    this.load();
    this.loadAdmins();
  }

  setFilter(option: FilterOption) {
    if (this.statusFilter() === option) return;
    this.statusFilter.set(option);
    this.selected.set(null);
    this.load();
  }

  filterLabel(option: FilterOption): string {
    return STATUS_LABEL[option];
  }

  select(request: PasswordChangeRequestDTO) {
    this.selected.set(request);
    this.completeForm.reset({ newPassword: '', adminNotes: '', unlockAccount: true });
    this.rejectForm.reset({ adminNotes: '' });
  }

  getAdminName(request: PasswordChangeRequestDTO | null): string {
    if (!request || !request.processedBy) {
      return '—';
    }
    const id = Number(request.processedBy);
    if (!Number.isFinite(id)) {
      return request.processedBy;
    }
    const map = this.adminNamesByPsicologoId();
    return map[id] || request.processedBy;
  }

  create() {
    if (this.createForm.invalid) return;
    this.error.set(null);
    this.creating.set(true);
    const payload = this.createForm.getRawValue();
    this.service.requestChange(payload.username!, payload.motivo || '').subscribe({
      next: () => {
        this.creating.set(false);
        this.createForm.reset({ username: '', contactEmail: '', motivo: '' });
        this.statusFilter.set('PENDIENTE');
        this.load();
      },
      error: (err: any) => {
        this.creating.set(false);
        this.error.set(this.resolveError(err, 'No se pudo registrar la solicitud.'));
      }
    });
  }

  complete() {
    const current = this.selected();
    if (!current || this.completeForm.invalid) return;
    this.error.set(null);
    this.completing.set(true);
    const value = this.completeForm.getRawValue();
    this.service.approve(current.id, value.newPassword!).subscribe({
      next: () => {
        this.completing.set(false);
        this.completeForm.reset({ newPassword: '', adminNotes: '', unlockAccount: true });
        this.load();
      },
      error: (err: any) => {
        this.completing.set(false);
        this.error.set(this.resolveError(err, 'No se pudo completar la solicitud.'));
      }
    });
  }

  reject() {
    const current = this.selected();
    if (!current) return;
    this.error.set(null);
    this.rejecting.set(true);
    const value = this.rejectForm.getRawValue();
    this.service.reject(current.id, value.adminNotes || '').subscribe({
      next: () => {
        this.rejecting.set(false);
        this.rejectForm.reset({ adminNotes: '' });
        this.load();
      },
      error: (err: any) => {
        this.rejecting.set(false);
        this.error.set(this.resolveError(err, 'No se pudo rechazar la solicitud.'));
      }
    });
  }

  private load() {
    this.loading.set(true);
    this.error.set(null);
    const status = this.statusFilter();
    if (status === 'PENDIENTE') {
      this.service.getPending().subscribe({
        next: (list) => {
          this.loading.set(false);
          this.requests.set(list);
          this.syncSelected(list);
        },
        error: (err) => {
          this.loading.set(false);
          this.requests.set([]);
          this.selected.set(null);
          this.error.set(this.resolveError(err, 'No se pudieron obtener las solicitudes.'));
        }
      });
    } else if (status === 'APROBADO' || status === 'RECHAZADO') {
      this.service.listByStatus(status).subscribe({
        next: (list: any[]) => {
          this.loading.set(false);
          this.requests.set(list);
          this.syncSelected(list);
        },
        error: (err: any) => {
          this.loading.set(false);
          this.requests.set([]);
          this.selected.set(null);
          this.error.set(this.resolveError(err, 'No se pudieron obtener las solicitudes.'));
        }
      });
    } else {
      this.loading.set(false);
      this.requests.set([]);
      this.selected.set(null);
    }
  }

  private loadAdmins() {
    this.psicologosService.list().subscribe({
      next: (psicologos: any[]) => {
        const map: Record<number, string> = {};
        psicologos.forEach((p: any) => {
          const rawId = typeof p.id === 'number' ? p.id : Number(p.id);
          const id = Number.isFinite(rawId) ? Number(rawId) : NaN;
          if (!Number.isFinite(id)) {
            return;
          }
          const nombre = `${(p.nombres ?? '').toString().trim()} ${(p.apellidos ?? '').toString().trim()}`.trim()
            || (p.nombre ?? '').toString().trim()
            || (p.username ?? '').toString().trim()
            || (p.email ?? '').toString().trim();
          if (nombre) {
            map[id] = nombre;
          }
        });
        this.adminNamesByPsicologoId.set(map);
      },
      error: () => {
        this.adminNamesByPsicologoId.set({});
      }
    });
  }

  private syncSelected(list: PasswordChangeRequestDTO[]) {
    const current = this.selected();
    if (!list.length) {
      this.selected.set(null);
      return;
    }
    if (!current) {
      this.selected.set(list[0]);
      return;
    }
    const updated = list.find(item => item.id === current.id);
    this.selected.set(updated ?? list[0]);
  }

  private resolveError(err: unknown, fallback: string): string {
    if (err && typeof err === 'object' && 'error' in err) {
      const anyErr = err as { error?: any };
      const message = typeof anyErr.error === 'string' ? anyErr.error : anyErr.error?.message;
      if (typeof message === 'string' && message.trim().length) {
        return message;
      }
    }
    return fallback;
  }
}