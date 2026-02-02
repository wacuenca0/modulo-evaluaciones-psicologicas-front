import { ProgramarSeguimientoModalComponent } from '../atenciones/programar-seguimiento-modal.component';

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PsicologoNombreService } from '../../services/psicologo-nombre.service';
import { AuthService } from '../../services/auth.service';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PersonalMilitarService } from '../../services/personal-militar.service';
import { PersonalMilitarDTO } from '../../models/personal-militar.models';
import { FichasPsicologicasService } from '../../services/fichas-psicologicas.service';
import { FichaPsicologicaHistorialDTO } from '../../models/fichas-psicologicas.models';
import { catchError, forkJoin, of, throwError } from 'rxjs';

type MensajeFlashTipo = 'ALTA' | 'SEGUIMIENTO' | 'TRANSFERENCIA' | 'DEFAULT';

type MensajeFlash = {
  texto: string;
  tipo: MensajeFlashTipo;
};

@Component({
  selector: 'app-personal-historial',
  imports: [CommonModule, RouterLink, ProgramarSeguimientoModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="space-y-8 p-4 lg:p-6">

      <!-- Mensaje Flash -->
      @if (mensajeFlash()) {
        @let flash = mensajeFlash()!;
        <div 
          [class]="mensajeFlashClase(flash.tipo)"
          class="animate-slide-down rounded-xl border-l-4 p-4 shadow-lg"
        >
          <div class="flex items-start gap-3">
            <div [class]="mensajeFlashIcono(flash.tipo)" class="mt-0.5">
              @switch (flash.tipo) {
                @case ('ALTA') {
                  <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                }
                @case ('SEGUIMIENTO') {
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                }
                @case ('TRANSFERENCIA') {
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                  </svg>
                }
                @default {
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                }
              }
            </div>
            <div class="flex-1">
              <p class="font-bold" [class]="mensajeFlashTitulo(flash.tipo)">
                {{ flash.tipo === 'DEFAULT' ? 'Aviso' : flash.tipo === 'ALTA' ? 'Alta Médica' : flash.tipo === 'SEGUIMIENTO' ? 'Seguimiento' : 'Transferencia' }}
              </p>
              <p class="text-sm opacity-90 mt-1">{{ flash.texto }}</p>
            </div>
            <button 
              type="button" 
              (click)="mensajeFlash.set(null)"
              class="rounded-full p-1 hover:bg-white/20 transition-colors"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>
      }

      <!-- Error -->
      @if (error()) {
        <div class="animate-pulse-subtle rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-red-100 p-4 shadow-sm">
          <div class="flex items-center gap-3">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-red-100">
              <svg class="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div>
              <p class="font-medium text-red-800">Error</p>
              <p class="text-sm text-red-700 mt-0.5">{{ error() }}</p>
            </div>
          </div>
        </div>
      }

      <!-- Loading -->
      @if (cargando()) {
        <div class="space-y-4">
          @for (_ of [0, 1, 2]; track $index) {
            <div class="h-32 animate-pulse rounded-2xl bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50"></div>
          }
        </div>
      }

      <!-- Sin datos -->
      @if (!cargando() && !persona()) {
        <div class="mx-auto max-w-md rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-8 text-center shadow-sm">
          <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <svg class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <h3 class="mb-2 text-lg font-semibold text-slate-900">No se encontró información</h3>
          <p class="text-sm text-slate-600">El personal solicitado no existe o no tiene datos registrados.</p>
          <button 
            routerLink="/psicologo/personal"
            class="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Volver al listado
          </button>
        </div>
      }

      <!-- Con datos -->
      @if (persona() && !cargando()) {
        <div class="space-y-8">
          <!-- Tarjeta de información del personal -->
          <div class="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-lg">
            <!-- Header y contenido principal -->
            <div class="flex flex-col items-center justify-center gap-2 py-8 px-4">
              <div class="relative mb-2">
                <div class="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg">
                  <span class="text-3xl font-extrabold text-white">{{ personaIniciales() }}</span>
                </div>
                <div [class]="tipoPersonaBadgeClass() + ' absolute -bottom-2 right-0 rounded-full px-3 py-1 text-xs font-bold shadow border'">
                  {{ persona()?.tipoPersona ?? 'Sin tipo' }}
                </div>
              </div>
              <h2 class="text-2xl font-extrabold text-slate-900 tracking-tight mb-1 text-center">{{ personaNombre() }}</h2>
              <div class="flex flex-wrap items-center justify-center gap-2 mt-1">
                <span [class]="servicioChipClass() + ' inline-block rounded-full px-3 py-1 text-xs font-semibold'">{{ servicioLabel() }}</span>
                <span *ngIf="persona()?.grado" class="inline-block rounded-full px-3 py-1 text-xs font-semibold border border-slate-300 bg-white text-slate-700">{{ persona()?.grado }}</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-sm text-slate-700">
                <div *ngIf="persona()?.telefono || persona()?.celular">
                  <span class="inline-flex items-center gap-2">
                    <svg class="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                    <span>
                      <span *ngIf="persona()?.telefono">{{ persona()?.telefono }}</span>
                      <span *ngIf="persona()?.telefono && persona()?.celular">&nbsp;|&nbsp;</span>
                      <span *ngIf="persona()?.celular">{{ persona()?.celular }}</span>
                    </span>
                  </span>
                </div>
                <div *ngIf="persona()?.email">
                  <span class="inline-flex items-center gap-2">
                    <svg class="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12H8m8 0a4 4 0 11-8 0 4 4 0 018 0zm2 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2v-1"/></svg>
                    <span>{{ persona()?.email }}</span>
                  </span>
                </div>
                <div *ngIf="persona()?.unidad">
                  <span class="inline-flex items-center gap-2">
                    <svg class="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v4a1 1 0 001 1h3v2a1 1 0 001 1h2a1 1 0 001-1v-2h3a1 1 0 001-1V7a1 1 0 00-1-1H4a1 1 0 00-1 1z"/></svg>
                    <span>{{ persona()?.unidad }}</span>
                  </span>
                </div>
                <div *ngIf="persona()?.sexo">
                  <span class="inline-flex items-center gap-2">
                    <svg class="h-5 w-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m0 6v1m0 6v1m-4-4h1m6 0h1m-7.07-7.07a7 7 0 119.9 9.9 7 7 0 01-9.9-9.9z"/></svg>
                    <span>{{ persona()?.sexo }}</span>
                  </span>
                </div>
                <div *ngIf="persona()?.ocupacion">
                  <span class="inline-flex items-center gap-2">
                    <svg class="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2a4 4 0 018 0v2m-4-4V7a4 4 0 10-8 0v6m4 4v2a4 4 0 01-8 0v-2"/></svg>
                    <span>{{ persona()?.ocupacion }}</span>
                  </span>
                </div>
              </div>
              <div class="flex justify-center mt-4">
                <button
                  type="button"
                  (click)="irANuevaEvaluacion()"
                  class="inline-flex items-center gap-2 rounded-lg border border-emerald-500 bg-emerald-600 px-7 py-3 text-base font-semibold text-white shadow-md transition-all hover:bg-emerald-700 hover:border-emerald-600 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-400">
                  <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  Registrar nueva evaluación
                </button>
              </div>
            </div>
          </div>

          <!-- Historial de fichas -->
          <div>
            <div class="mb-6 flex items-center justify-between">
              <div>
                <h2 class="text-lg font-bold text-slate-900">Historial de evaluaciones psicológicas</h2>
                <p class="text-sm text-slate-600">Listado cronológico de valoraciones anuales y especiales</p>
              </div>
              <div class="text-sm text-slate-500">
                {{ historial().length }} {{ historial().length === 1 ? 'registro' : 'registros' }}
              </div>
            </div>

            @if (!historial().length) {
              <div class="rounded-2xl border-2 border-dashed border-slate-200 bg-gradient-to-b from-white to-slate-50 p-10 text-center">
                <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <svg class="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.801 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.801 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/>
                  </svg>
                </div>
                <h3 class="mb-2 text-lg font-semibold text-slate-900">No hay evaluaciones registradas</h3>
                <p class="mb-6 text-sm text-slate-600">Este personal no cuenta con fichas psicológicas históricas.</p>
                @if (personaId()) {
                  <a 
                    [routerLink]="['/psicologo/valoracion/nueva', personaId()]" 
                    [state]="{ persona: persona() }"
                    class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:border-slate-400 active:scale-[0.98]"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                    </svg>
                    Crear primera evaluación
                  </a>
                }
              </div>
            } @else {
              <div class="space-y-4">
                @for (item of historial(); track item.id ?? item.fechaEvaluacion ?? $index) {
                  @let itemId = item.id ?? $index;
                  <div 
                    [class]="'group relative overflow-hidden rounded-xl border-2 ' + fichaBorderClass(item.condicion) + ' bg-white shadow-lg transition-all hover:shadow-xl'"
                    [class.border-l-8]="esCondicionImportante(item.condicion)"
                  >
                    <!-- Barra lateral con gradiente -->
                    <div [class]="'absolute left-0 top-0 h-full w-1.5 ' + fichaSidebarClass(item.condicion)"></div>
                    
                    <div class="pl-6 pr-4 py-4">
                      <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <!-- Información principal -->
                        <div class="flex-1 space-y-3">
                          <!-- Fecha y número -->
                          <div class="flex flex-wrap items-center gap-3">
                            <div class="flex items-center gap-2">
                              <svg class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                              </svg>
                              <span class="text-sm font-semibold text-slate-900">{{ fechaFormateada(item.fechaEvaluacion) }}</span>
                            </div>
                            
                            @if (item.numeroEvaluacion) {
                              <span class="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                                Ficha #{{ item.numeroEvaluacion }}
                              </span>
                            }

                            @if (item.tipoEvaluacion) {
                              <span class="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-200">
                                {{ item.tipoEvaluacion }}
                              </span>
                            }
                          </div>
                          
                          <!-- Badges de estado con efecto glow -->
                          <div class="flex flex-wrap items-center gap-2">
                            <span [class]="'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ' + estadoBadgeClass(item.estado)">
                              <span class="h-2 w-2 rounded-full" [class]="estadoDotClass(item.estado)"></span>
                              {{ estadoLabel(item.estado) }}
                            </span>
                            
                            <span [class]="'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm ' + condicionBadgeClass(item.condicion)">
                              <span class="h-2 w-2 rounded-full" [class]="condicionDotClass(item.condicion)"></span>
                              {{ condicionLabelCorto(item.condicion) }}
                            </span>
                          </div>
                          
                          <!-- Información de auditoría -->
                          <div class="text-xs text-slate-500">
                            <div class="flex flex-wrap items-center gap-2">
                              <span class="font-medium text-slate-700">{{ creadoPorResumen(item) }}</span>
                              <span class="text-slate-300">•</span>
                              <span>{{ ultimaEdicionResumen(item) }}</span>
                            </div>
                          </div>
                        </div>
                        
                        <!-- Acciones -->
                        <div class="flex flex-col gap-2 sm:flex-row lg:flex-col">
                          <button 
                            type="button" 
                            (click)="toggleDetalle(itemId)"
                            class="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 
                                   transition-all hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98]"
                          >
                            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              @if (detalleAbiertoId() === itemId) {
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7"/>
                              } @else {
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/>
                              }
                            </svg>
                            {{ detalleAbiertoId() === itemId ? 'Ocultar' : 'Ver detalles' }}
                          </button>
                          @if (esCondicionSeguimiento(item.condicion)) {
                            <button
                              type="button"
                              class="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-500 bg-blue-600 px-3.5 py-2 text-xs font-medium text-white shadow transition-all hover:bg-blue-700 hover:border-blue-600 active:scale-[0.98]"
                              (click)="abrirSeguimientoModal(item.id ?? 0)"
                            >
                              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                              </svg>
                              Programar seguimiento
                            </button>
                          }
                          
                        </div>
                      </div>
                      
                      <!-- Detalles expandidos -->
                      @if (detalleAbiertoId() === itemId) {
                        <div class="mt-5 space-y-5 rounded-lg border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-5">
                          <!-- Diagnóstico(s) CIE-10 -->
                          <div>
                            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Diagnóstico(s) CIE-10</p>
                            <div class="rounded-lg bg-white p-3 border border-slate-200 space-y-2">
                              @if (item.diagnosticosCie10 && item.diagnosticosCie10.length > 0) {
                                @for (dx of item.diagnosticosCie10; track dx.id) {
                                  <div class="text-sm text-slate-900">
                                    <span class="font-semibold">{{ dx.codigo }}:</span> {{ dx.nombre }}
                                    <span class="block text-xs text-slate-500">{{ dx.descripcion }}</span>
                                  </div>
                                }
                              } @else {
                                <p class="text-sm text-slate-500">Sin diagnóstico registrado</p>
                              }
                            </div>
                          </div>
                          
                          <!-- Información específica por condición -->
                          @if (esCondicionSeguimiento(item.condicion)) {
                            <div class="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-blue-100/30 p-4">
                              <div class="mb-3 flex items-center gap-2">
                                <div class="rounded-full bg-blue-100 p-1.5">
                                  <svg class="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                  </svg>
                                </div>
                                <p class="text-sm font-semibold text-blue-900">Plan de seguimiento activo</p>
                              </div>
                              <div class="grid gap-4 md:grid-cols-2">
                                <div>
                                  <p class="mb-1 text-xs font-medium text-blue-700">Frecuencia</p>
                                  <p class="text-sm text-blue-900">{{ displayOrDefault(item.planFrecuencia, 'No definida') }}</p>
                                </div>
                                <div>
                                  <p class="mb-1 text-xs font-medium text-blue-700">Tipo de sesión</p>
                                  <p class="text-sm text-blue-900">{{ displayOrDefault(item.planTipoSesion, 'No definido') }}</p>
                                </div>
                                @if (item.planDetalle) {
                                  <div class="md:col-span-2">
                                    <p class="mb-1 text-xs font-medium text-blue-700">Detalle del plan</p>
                                    <p class="text-sm text-blue-900">{{ item.planDetalle }}</p>
                                  </div>
                                }
                              </div>
                            </div>
                          } 
                          
                          @if (esCondicionTransferencia(item.condicion)) {
                            <div class="rounded-lg border border-indigo-100 bg-gradient-to-r from-indigo-50 to-indigo-100/30 p-4">
                              <div class="mb-3 flex items-center gap-2">
                                <div class="rounded-full bg-indigo-100 p-1.5">
                                  <svg class="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                                  </svg>
                                </div>
                                <p class="text-sm font-semibold text-indigo-900">Transferencia registrada</p>
                              </div>
                              <div class="grid gap-4 md:grid-cols-2">
                                <div>
                                  <p class="mb-1 text-xs font-medium text-indigo-700">Unidad destino</p>
                                  <p class="text-sm font-medium text-indigo-900">{{ displayOrDefault(item.transferenciaUnidad, 'No registrada') }}</p>
                                </div>
                                <div>
                                  <p class="mb-1 text-xs font-medium text-indigo-700">Fecha de transferencia</p>
                                  <p class="text-sm text-indigo-900">{{ fechaHoraFormateada(item.transferenciaFecha) || 'No registrada' }}</p>
                                </div>
                                @if (item.transferenciaObservacion) {
                                  <div class="md:col-span-2">
                                    <p class="mb-1 text-xs font-medium text-indigo-700">Observación</p>
                                    <p class="text-sm text-indigo-900">{{ item.transferenciaObservacion }}</p>
                                  </div>
                                }
                              </div>
                            </div>
                          } 
                          
                          @if (esCondicionAlta(item.condicion)) {
                            <div class="rounded-lg border border-emerald-100 bg-gradient-to-r from-emerald-50 to-emerald-100/30 p-4">
                              <div class="flex items-start gap-3">
                                <div class="rounded-full bg-emerald-100 p-1.5">
                                  <svg class="h-5 w-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                                  </svg>
                                </div>
                                <div>
                                  <p class="text-sm font-semibold text-emerald-900">Paciente en alta médica</p>
                                  <p class="text-xs text-emerald-700">No presenta psicopatología activa</p>
                                </div>
                              </div>
                            </div>
                          }
                          
                          <!-- Información general -->
                          <div class="grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
                            <div>
                              <p class="mb-1 text-xs font-medium text-slate-500">Tipo de evaluación</p>
                              <p class="text-sm text-slate-900">{{ displayOrDefault(item.tipoEvaluacion, 'No especificado') }}</p>
                            </div>
                            <div>
                              <p class="mb-1 text-xs font-medium text-slate-500">Estado actual</p>
                              <p class="text-sm font-medium text-slate-900">{{ estadoLabel(item.estado) }}</p>
                            </div>
                          </div>
                          
                          <!-- Auditoría detallada -->
                          <div class="grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
                            <div>
                              <p class="mb-1 text-xs font-medium text-slate-500">Creada por</p>
                              <p class="text-sm text-slate-700">{{ creadoPorDetalle(item) }}</p>
                            </div>
                            <div>
                              <p class="mb-1 text-xs font-medium text-slate-500">Última edición</p>
                              <p class="text-sm text-slate-700">{{ ultimaEdicionDetalle(item) }}</p>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </section>
      <!-- DEBUG: Estado del modal -->
      <div class="mb-2 p-2 bg-yellow-50 border border-yellow-300 rounded text-xs text-yellow-800 font-mono">
        <!-- debugModalState eliminado -->
        <div *ngIf="seguimientoError" class="text-red-600">Error: {{ seguimientoError }}</div>
        <div *ngIf="seguimientoMensajeExito" class="text-green-600">Mensaje: {{ seguimientoMensajeExito }}</div>
      </div>
      <!-- Modal para programar seguimiento -->
      <app-programar-seguimiento-modal
        *ngIf="mostrarModalSeguimiento"
        [show]="mostrarModalSeguimiento"
        [psicologoActual]="seguimientoFicha ? { id: seguimientoFicha.psicologoId ?? null, nombre: seguimientoFicha.psicologoNombre ?? '' } : null"
        [formModel]="seguimientoFicha"
        (cancelar)="cerrarModalSeguimiento()"
      ></app-programar-seguimiento-modal>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .animate-slide-down {
      animation: slideDown 0.3s ease-out;
    }
    
    .animate-pulse-subtle {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.9;
      }
    }
  `]
})
export class PersonalHistorialComponent {
  // Propiedad única para pasar la ficha seleccionada al modal de seguimiento
  // (Eliminada declaración duplicada de seguimientoFicha)

    // Navegación funcional para crear nueva evaluación
    irANuevaEvaluacion(): void {
      const id = this.personaId();
      const persona = this.persona();
      if (!id || !persona) {
        this.mensajeFlash.set({ texto: 'No se puede crear la ficha: falta información de la persona.', tipo: 'DEFAULT' });
        return;
      }
      this.router.navigate(['/psicologo/valoracion/nueva', id], { state: { persona } });
    }
  private readonly authService = inject(AuthService);
  
  // Propiedades para el modal de seguimiento
  mostrarModalSeguimiento = false;
  seguimientoFicha: any = null;
  seguimientoCargando = false;
  seguimientoError: string | null = null;
  seguimientoMensajeExito: string | null = null;

  abrirSeguimientoModal(fichaId: number) {
    const ficha = this.historial().find(f => f.id === fichaId);
    if (!ficha) {
      this.seguimientoError = 'Ficha no encontrada';
      this.mostrarModalSeguimiento = false;
      // Mostrar debug visual
      this.seguimientoMensajeExito = 'DEBUG: No se encontró la ficha para el id ' + fichaId;
      console.error('DEBUG abrirSeguimientoModal: ficha no encontrada', fichaId);
      return;
    }
    // Debug visual y consola
    this.seguimientoMensajeExito = `DEBUG: Abrir modal seguimiento para fichaId=${fichaId}, fichaPsicologicaId=${ficha.id}`;
    console.log('DEBUG abrirSeguimientoModal', fichaId, ficha);
    this.seguimientoFicha = {
      fichaId: ficha.id,
      fichaPsicologicaId: ficha.id,
      personalMilitarId: this.persona()?.id,
      psicologoId: ficha.creadoPorId,
      psicologoNombre: this.obtenerNombrePsicologo(ficha.creadoPorId, ficha.creadoPorNombre),
      personalNombre: this.personaNombre(),
      personalCedula: this.persona()?.cedula || '',
      estado: 'PROGRAMADA'
    };
    this.mostrarModalSeguimiento = true;
    this.seguimientoCargando = false;
    this.seguimientoError = null;
    // Forzar visibilidad del modal y debug visual
    setTimeout(() => {
      this.mostrarModalSeguimiento = true;
      console.log('DEBUG setTimeout mostrarModalSeguimiento', this.mostrarModalSeguimiento, this.seguimientoFicha);
      this.seguimientoMensajeExito = 'DEBUG: Modal debe estar visible. mostrarModalSeguimiento=' + this.mostrarModalSeguimiento;
    }, 10);
  }

  cerrarModalSeguimiento() {
    this.mostrarModalSeguimiento = false;
    this.seguimientoFicha = null;
    this.seguimientoMensajeExito = 'DEBUG: Modal cerrado.';
  }

  guardarSeguimiento() {
    // Este método ahora se maneja en el componente del modal
    // Solo cerramos el modal
    this.cerrarModalSeguimiento();
  }
  
  // For passing to the modal
  // El método psicologoIdParaModal y psicologoNombreParaModal ya no son necesarios
  
  personalMilitarIdParaModal(): number {
    return this.persona()?.id ?? this.personalId() ?? 0;
  }
  
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly personalService = inject(PersonalMilitarService);
  private readonly fichasService = inject(FichasPsicologicasService);
  
  private readonly personalId = signal<number | null>(null);
  readonly cargando = signal(true);
  readonly persona = signal<PersonalMilitarDTO | null>(null);
  readonly historial = signal<FichaPsicologicaHistorialDTO[]>([]);
  readonly mensajeFlash = signal<MensajeFlash | null>(null);
  readonly error = signal<string | null>(null);
  readonly detalleAbiertoId = signal<number | null>(null);
  // El modal se muestra solo si mostrarModalSeguimiento es true
    // DEBUG visual para mostrar el estado del modal en la UI
    get debugModalState(): string {
      return `DEBUG: mostrarModalSeguimiento=${this.mostrarModalSeguimiento}, seguimientoFicha=${JSON.stringify(this.seguimientoFicha)}, seguimientoError=${this.seguimientoError}`;
    }
  
  // Computed properties
  readonly personaNombre = computed(() => {
    const current = this.persona();
    if (!current) {
      return 'Sin datos';
    }
    const apellidosNombres = current.apellidosNombres?.trim();
    if (apellidosNombres?.length) {
      return apellidosNombres;
    }
    const partes = [current.apellidos, current.nombres]
      .filter((parte): parte is string => !!parte && parte.trim().length > 0)
      .map(parte => parte.trim());
    return partes.length ? partes.join(' ') : 'Sin nombres registrados';
  });
  
  readonly personaId = computed(() => {
    const value = this.personalId();
    return Number.isFinite(value) ? Number(value) : null;
  });
  
  readonly servicioLabel = computed(() => {
    const current = this.persona();
    if (!current) {
      return 'Sin información';
    }
    const activo = current.servicioActivo ? 'Activo' : null;
    const pasivo = current.servicioPasivo ? 'Pasivo' : null;
    const piezas = [activo, pasivo].filter((p): p is string => !!p);
    if (piezas.length) {
      return piezas.join(' / ');
    }
    return 'Sin información';
  });
  
  readonly contactoLabel = computed(() => {
    const current = this.persona();
    if (!current) {
      return 'Sin información de contacto';
    }
    const telefono = current.telefono?.trim();
    const celular = current.celular?.trim();
    const email = current.email?.trim();
    const partes = [telefono, celular, email].filter((part): part is string => !!part && part.length > 0);
    return partes.length ? partes.join(' / ') : 'Sin información de contacto';
  });
  
  // Métodos de utilidad para UI
  personaIniciales(): string {
    const nombre = this.personaNombre();
    const partes = nombre.split(' ').filter(p => p.trim().length);
    const letras = partes.slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
    return letras || 'P';
  }
  
  // Métodos para mensajes flash mejorados
  mensajeFlashClase(tipo: MensajeFlashTipo): string {
    const base = 'flex items-center justify-between gap-3 rounded-xl border-l-4 p-4 shadow-lg backdrop-blur-sm';
    const colors = {
      ALTA: 'border-emerald-500 bg-gradient-to-r from-emerald-50 to-emerald-100/50 text-emerald-800',
      SEGUIMIENTO: 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100/50 text-blue-800',
      TRANSFERENCIA: 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-indigo-100/50 text-indigo-800',
      DEFAULT: 'border-slate-500 bg-gradient-to-r from-slate-50 to-slate-100/50 text-slate-800'
    };
    return `${base} ${colors[tipo] ?? colors.DEFAULT}`;
  }
  
  mensajeFlashIcono(tipo: MensajeFlashTipo): string {
    const colors = {
      ALTA: 'rounded-full bg-emerald-100 p-1.5 text-emerald-600',
      SEGUIMIENTO: 'rounded-full bg-blue-100 p-1.5 text-blue-600',
      TRANSFERENCIA: 'rounded-full bg-indigo-100 p-1.5 text-indigo-600',
      DEFAULT: 'rounded-full bg-slate-100 p-1.5 text-slate-600'
    };
    return colors[tipo] ?? colors.DEFAULT;
  }
  
  mensajeFlashTitulo(tipo: MensajeFlashTipo): string {
    const colors = {
      ALTA: 'text-emerald-900',
      SEGUIMIENTO: 'text-blue-900',
      TRANSFERENCIA: 'text-indigo-900',
      DEFAULT: 'text-slate-900'
    };
    return colors[tipo] ?? colors.DEFAULT;
  }
  
  // Métodos para badges del personal con más contraste
  tipoPersonaBadgeClass(): string {
    const current = this.persona();
    const tipo = current?.tipoPersona?.trim().toLowerCase();
    if (tipo === 'militar') return 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-sm';
    if (tipo === 'dependiente') return 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm';
    if (tipo === 'civil') return 'bg-gradient-to-r from-sky-600 to-sky-700 text-white shadow-sm';
    return 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-sm';
  }
  
  servicioChipClass(): string {
    const current = this.persona();
    const activo = !!current?.servicioActivo;
    const pasivo = !!current?.servicioPasivo;
    if (activo && pasivo) return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white';
    if (activo) return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
    if (pasivo) return 'bg-gradient-to-r from-slate-500 to-slate-600 text-white';
    return 'bg-gradient-to-r from-slate-500 to-slate-600 text-white';
  }
  
  // Métodos para fichas con colores más intensos
  fichaBorderClass(condicion?: string | null): string {
    const tipo = this.normalizarCondicion(condicion);
    if (!tipo) return 'border-slate-300 hover:border-slate-400';
    const classes: Record<string, string> = {
      'ALTA': 'border-emerald-300 hover:border-emerald-400',
      'SEGUIMIENTO': 'border-blue-300 hover:border-blue-400',
      'TRANSFERENCIA': 'border-indigo-300 hover:border-indigo-400'
    };
    return classes[tipo] ?? 'border-slate-300 hover:border-slate-400';
  }
  
  fichaSidebarClass(condicion?: string | null): string {
    const tipo = this.normalizarCondicion(condicion);
    if (!tipo) return 'bg-gradient-to-b from-slate-500 to-slate-600';
    const classes: Record<string, string> = {
      'ALTA': 'bg-gradient-to-b from-emerald-500 to-emerald-600',
      'SEGUIMIENTO': 'bg-gradient-to-b from-blue-500 to-blue-600',
      'TRANSFERENCIA': 'bg-gradient-to-b from-indigo-500 to-indigo-600'
    };
    return classes[tipo] ?? 'bg-gradient-to-b from-slate-500 to-slate-600';
  }
  
  estadoBadgeClass(estado?: string | null): string {
    const estadoUpper = estado?.trim().toUpperCase();
    if (!estadoUpper) return 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800';
    const classes: Record<string, string> = {
      'ABIERTA': 'bg-gradient-to-r from-sky-200 to-sky-300 text-sky-800',
      'CERRADA': 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800',
      'EN_PROCESO': 'bg-gradient-to-r from-amber-200 to-amber-300 text-amber-800'
    };
    return classes[estadoUpper] ?? 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800';
  }
  
  estadoDotClass(estado?: string | null): string {
    const estadoUpper = estado?.trim().toUpperCase();
    if (!estadoUpper) return 'bg-slate-600';
    const classes: Record<string, string> = {
      'ABIERTA': 'bg-sky-600',
      'CERRADA': 'bg-slate-600',
      'EN_PROCESO': 'bg-amber-600'
    };
    return classes[estadoUpper] ?? 'bg-slate-600';
  }
  
  condicionBadgeClass(condicion?: string | null): string {
    const tipo = this.normalizarCondicion(condicion);
    if (!tipo) return 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800';
    const classes: Record<string, string> = {
      // Verde vibrante para ALTA
      'ALTA': 'bg-gradient-to-r from-green-400 to-green-600 text-white',
      // Azul intenso para SEGUIMIENTO
      'SEGUIMIENTO': 'bg-gradient-to-r from-sky-500 to-blue-700 text-white',
      // Naranja fuerte para TRANSFERENCIA
      'TRANSFERENCIA': 'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
    };
    return classes[tipo] ?? 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-800';
  }
  
  condicionDotClass(condicion?: string | null): string {
    const tipo = this.normalizarCondicion(condicion);
    if (!tipo) return 'bg-slate-600';
    const classes: Record<string, string> = {
      // Verde vibrante para ALTA
      'ALTA': 'bg-green-600',
      // Azul intenso para SEGUIMIENTO
      'SEGUIMIENTO': 'bg-blue-700',
      // Naranja fuerte para TRANSFERENCIA
      'TRANSFERENCIA': 'bg-orange-500'
    };
    return classes[tipo] ?? 'bg-slate-600';
  }
  
  condicionLabelCorto(condicion?: string | null): string {
    const tipo = this.normalizarCondicion(condicion);
    if (!tipo) return 'Sin condición';
    const labels: Record<string, string> = {
      'ALTA': 'Alta Médica',
      'SEGUIMIENTO': 'Seguimiento',
      'TRANSFERENCIA': 'Transferencia'
    };
    return labels[tipo] ?? 'Sin condición';
  }
  
  esCondicionImportante(condicion?: string | null): boolean {
    const tipo = this.normalizarCondicion(condicion);
    return tipo === 'SEGUIMIENTO' || tipo === 'TRANSFERENCIA';
  }
  
  estadoLabel(value?: string | null): string {
    const estadoUpper = value?.trim().toUpperCase();
    if (!estadoUpper) return 'Sin estado';
    const labels: Record<string, string> = {
      'ABIERTA': 'Abierta',
      'CERRADA': 'Cerrada',
      'EN_PROCESO': 'En proceso'
    };
    return labels[estadoUpper] ?? value?.trim() ?? 'Sin estado';
  }
  
  esCondicionAlta(condicion?: string | null): boolean {
    return this.normalizarCondicion(condicion) === 'ALTA';
  }
  
  esCondicionSeguimiento(condicion?: string | null): boolean {
    return this.normalizarCondicion(condicion) === 'SEGUIMIENTO';
  }
  
  esCondicionTransferencia(condicion?: string | null): boolean {
    return this.normalizarCondicion(condicion) === 'TRANSFERENCIA';
  }
  
  diagnosticoDisplay(codigo?: string | null, descripcion?: string | null): string {
    const codigoTrim = codigo?.trim();
    const descripcionTrim = descripcion?.trim();
    if (codigoTrim && descripcionTrim) {
      return `${codigoTrim} · ${descripcionTrim}`;
    }
    if (codigoTrim) {
      return codigoTrim;
    }
    if (descripcionTrim) {
      return descripcionTrim;
    }
    return 'Sin diagnóstico registrado';
  }
  
  displayOrDefault(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length) {
        return trimmed;
      }
    }
    return fallback;
  }
  
  fechaFormateada(fecha?: string): string {
    if (!fecha) {
      return 'Fecha no registrada';
    }
    const instante = new Date(fecha);
    if (Number.isNaN(instante.getTime())) {
      return fecha;
    }
    return new Intl.DateTimeFormat('es-EC', { 
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    }).format(instante);
  }
  
  fechaHoraFormateada(fecha?: string | null): string | null {
    if (!fecha) {
      return null;
    }
    const instante = new Date(fecha);
    if (Number.isNaN(instante.getTime())) {
      return fecha;
    }
    return new Intl.DateTimeFormat('es-EC', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    }).format(instante);
  }
  
  // Mapas para cachear nombres de psicólogos por userId
  private readonly psicologoNombreCache = new Map<number, string>();
  private readonly psicologoNombreService = inject(PsicologoNombreService);

  // Obtiene el nombre del psicólogo por id, usando cache y fallback a nombre directo
  obtenerNombrePsicologo(userId?: number | null, nombre?: string | null): string {
    if (nombre?.trim()) return nombre.trim();
    if (!userId) return 'Psicólogo';
    if (this.psicologoNombreCache.has(userId)) {
      return this.psicologoNombreCache.get(userId)!;
    }
    // Llama al servicio y cachea el resultado
    this.psicologoNombreService.obtenerNombrePorUserId(userId).subscribe({
      next: nombreCompleto => this.psicologoNombreCache.set(userId, nombreCompleto),
      error: () => this.psicologoNombreCache.set(userId, 'Psicólogo')
    });
    return 'Psicólogo';
  }

  creadoPorResumen(item: FichaPsicologicaHistorialDTO): string {
    return this.obtenerNombrePsicologo(item.creadoPorId, item.creadoPorNombre) || 'Sin registro';
  }

  creadoPorDetalle(item: FichaPsicologicaHistorialDTO): string {
    return this.obtenerNombrePsicologo(item.creadoPorId, item.creadoPorNombre) || 'Sin información del creador';
  }

  ultimaEdicionResumen(item: FichaPsicologicaHistorialDTO): string {
    const editor = this.obtenerNombrePsicologo(item.actualizadoPorId, item.actualizadoPorNombre);
    const fecha = this.fechaHoraFormateada(item.updatedAt);
    if (!editor && !fecha) {
      return 'Sin ediciones registradas';
    }
    if (editor && fecha) {
      return `Última edición por ${editor} · ${fecha}`;
    }
    if (editor) {
      return `Última edición por ${editor}`;
    }
    return `Última edición ${fecha}`;
  }

  ultimaEdicionDetalle(item: FichaPsicologicaHistorialDTO): string {
    const editor = this.obtenerNombrePsicologo(item.actualizadoPorId, item.actualizadoPorNombre);
    const fecha = this.fechaHoraFormateada(item.updatedAt);
    if (!editor && !fecha) {
      return 'Sin información de ediciones';
    }
    if (editor && fecha) {
      return `${editor} · ${fecha}`;
    }
    return editor ?? fecha ?? 'Sin información de ediciones';
  }
  
  // Métodos de acción
  toggleDetalle(id: number) {
    const actual = this.detalleAbiertoId();
    this.detalleAbiertoId.set(actual === id ? null : id);
  }
  
  cerrarSeguimientoModal() {
    this.cerrarModalSeguimiento();
  }
  
  recargarSeguimientos() {
    const id = this.personalId();
    if (id) {
      this.cargarHistorial(id);
    }
  }
  
  // Constructor y métodos de inicialización
  constructor() {
    const param = this.route.snapshot.paramMap.get('personalId');
    const id = param ? Number(param) : Number.NaN;
    if (!Number.isFinite(id)) {
      this.cargando.set(false);
      this.error.set('Identificador de personal no válido.');
      return;
    }
    this.personalId.set(Number(id));
    this.intentarObtenerMensaje();
    this.cargarDatos(Number(id));
  }
  
  private normalizarCondicion(value?: string | null): 'ALTA' | 'SEGUIMIENTO' | 'TRANSFERENCIA' | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim().toUpperCase();
    if (!normalized.length) {
      return null;
    }
    if (normalized.includes('ALTA')) {
      return 'ALTA';
    }
    if (normalized.includes('SEGUIMIENTO')) {
      return 'SEGUIMIENTO';
    }
    if (normalized.includes('TRANSFERENCIA') || normalized.includes('DERIV')) {
      return 'TRANSFERENCIA';
    }
    return null;
  }
  
  private cargarDatos(id: number) {
    this.cargando.set(true);
    this.error.set(null);
    
    forkJoin({
      persona: this.personalService.obtenerPorId(id),
      historial: this.fichasService.obtenerHistorial(id).pipe(
        catchError((err) => {
          if (this.es404(err)) {
            return of([] as FichaPsicologicaHistorialDTO[]);
          }
          return throwError(() => err);
        })
      )
    })
    .pipe(
      catchError((err) => {
        this.error.set(this.resolverError(err));
        return of({ persona: null, historial: [] as FichaPsicologicaHistorialDTO[] });
      })
    )
    .subscribe(({ persona, historial }) => {
      this.persona.set(persona);
      const ordenado = (historial ?? []).sort((a, b) => {
        const fechaA = a.fechaEvaluacion || '';
        const fechaB = b.fechaEvaluacion || '';
        if (fechaA !== fechaB) {
          return fechaB.localeCompare(fechaA);
        }
        const idA = a.id ?? 0;
        const idB = b.id ?? 0;
        return idB - idA;
      });
      this.historial.set(ordenado);
      this.cargando.set(false);
    });
  }
  
  private cargarHistorial(id: number) {
    this.fichasService.obtenerHistorial(id)
      .pipe(
        catchError((err) => {
          if (this.es404(err)) {
            return of([] as FichaPsicologicaHistorialDTO[]);
          }
          return throwError(() => err);
        })
      )
      .subscribe((historial) => {
        const ordenado = (historial ?? []).sort((a, b) => {
          const fechaA = a.fechaEvaluacion || '';
          const fechaB = b.fechaEvaluacion || '';
          if (fechaA !== fechaB) {
            return fechaB.localeCompare(fechaA);
          }
          const idA = a.id ?? 0;
          const idB = b.id ?? 0;
          return idB - idA;
        });
        this.historial.set(ordenado);
      });
  }
  
  private intentarObtenerMensaje() {
    const navigationState = (this.router.lastSuccessfulNavigation?.extras?.state ?? {}) as Record<string, unknown>;
    const historyState = (globalThis.history?.state ?? {}) as Record<string, unknown>;
    const rawMensaje = navigationState['mensaje'] ?? historyState['mensaje'];
    if (typeof rawMensaje === 'string') {
      const mensaje = rawMensaje.trim();
      if (!mensaje.length) {
        return;
      }
      const tipo = this.normalizarMensajeTipo(navigationState['mensajeTipo'] ?? historyState['mensajeTipo']);
      this.mensajeFlash.set({ texto: mensaje, tipo });
      const nuevoEstado = { ...historyState };
      delete nuevoEstado['mensaje'];
      delete nuevoEstado['mensajeTipo'];
      const href = globalThis.location?.href ?? '/';
      globalThis.history?.replaceState?.(nuevoEstado, '', href);
    }
  }
  
  private normalizarMensajeTipo(value: unknown): MensajeFlashTipo {
    if (typeof value !== 'string') {
      return 'DEFAULT';
    }
    const normalized = value.trim().toUpperCase();
    if (normalized === 'ALTA' || normalized === 'SEGUIMIENTO' || normalized === 'TRANSFERENCIA') {
      return normalized as MensajeFlashTipo;
    }
    return 'DEFAULT';
  }
  
  // Métodos de username eliminados: solo se muestra nombre completo
  
  private resolverError(err: unknown): string {
    const status = this.extractStatus(err);
    if (status === 404) {
      return 'No se encontró información del personal solicitado.';
    }
    const mensaje = this.extractErrorMessage(err);
    if (mensaje) {
      return mensaje;
    }
    return 'Ocurrió un error al consultar el historial de fichas.';
  }
  
  private es404(err: unknown): boolean {
    return this.extractStatus(err) === 404;
  }
  
  private extractStatus(err: unknown): number | null {
    if (err && typeof err === 'object' && 'status' in err) {
      const status = (err as { status?: unknown }).status;
      if (typeof status === 'number') {
        return status;
      }
    }
    return null;
  }
  
  private extractErrorMessage(err: unknown): string | null {
    const fallback = this.toTrimmedString(err);
    if (fallback) {
      return fallback;
    }
    if (!err || typeof err !== 'object') {
      return null;
    }
    if ('error' in err) {
      const contenido = (err as { error?: unknown }).error;
      const mensajeDesdeContenido = this.extractMessageFromErrorPayload(contenido);
      if (mensajeDesdeContenido) {
        return mensajeDesdeContenido;
      }
    }
    if ('message' in err) {
      return this.toTrimmedString((err as { message?: unknown }).message);
    }
    return null;
  }
  
  private extractMessageFromErrorPayload(payload: unknown): string | null {
    const directo = this.toTrimmedString(payload);
    if (directo) {
      return directo;
    }
    if (payload && typeof payload === 'object' && 'message' in payload) {
      return this.toTrimmedString((payload as { message?: unknown }).message);
    }
    return null;
  }
  
  private toTrimmedString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
}