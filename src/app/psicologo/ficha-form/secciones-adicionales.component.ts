import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, computed, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

import type { StepId } from './ficha-psicologica-form.component';

@Component({
  selector: 'app-secciones-adicionales',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      <!-- Encabezado dinámico según la sección -->
      <div [class]="headerClasses()" class="p-6">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 class="text-2xl font-bold text-white">{{ sectionTitle() }}</h2>
            <p class="text-opacity-90">{{ sectionSubtitle() }}</p>
          </div>
        </div>
      </div>
      <div class="p-6 md:p-8">
        <!-- Mensajes de error -->
        @if (error) {
          <div class="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
            <svg class="w-5 h-5 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-sm text-red-700">{{ error }}</p>
          </div>
        }
        <!-- Formulario dinámico -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-8">
          @switch (currentStep) {
            <!-- Sección: Adolescencia, Juventud y Adultez -->
            @case ('adolescencia') {
              <div class="space-y-6">
                <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                  <h3 class="text-xl font-bold text-slate-800 mb-6">Desarrollo Adolescente y Adulto</h3>
                  <div class="grid gap-6 md:grid-cols-2">
                    <div class="md:col-span-2">
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Habilidades sociales
                        <span class="text-xs font-normal text-slate-500">(Relaciones interpersonales, adaptación)</span>
                      </label>
                      <textarea formControlName="habilidadesSociales" rows="3"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                        placeholder="Describa las habilidades sociales..."></textarea>
                    </div>

                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Trastornos identificados
                      </label>
                      <input type="text" formControlName="trastorno"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                        placeholder="Ej: Ansiedad, depresión..." />
                    </div>

                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Maltrato/negligencia en adultez
                      </label>
                      <input type="text" formControlName="maltratoAdultoProblemasNegligencia"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                        placeholder="Situaciones reportadas..." />
                    </div>

                    <div class="md:col-span-2">
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Historia personal relevante
                      </label>
                      <textarea formControlName="historiaPersonal" rows="3"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                        placeholder="Eventos importantes en adolescencia/adultez..."></textarea>
                    </div>

                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Problemas legales
                      </label>
                      <input type="text" formControlName="problemasRelacionadosCircunstanciasLegales"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                        placeholder="Situaciones legales..." />
                    </div>

                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Tratamientos psicológicos/psiquiátricos
                      </label>
                      <input type="text" formControlName="tratamientosPsicologicosPsiquiatricos"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                        placeholder="Tratamientos recibidos..." />
                    </div>

                    <div class="md:col-span-2">
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Observación general
                      </label>
                      <textarea formControlName="observacion" rows="3"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none transition"
                        placeholder="Observaciones adicionales..."></textarea>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Sección: Psicoanamnesis Familiar -->
            @case ('familiar') {
              <div class="space-y-6">
                <div class="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200">
                  <h3 class="text-xl font-bold text-slate-800 mb-6">Antecedentes Familiares</h3>
                  <div class="grid gap-6">
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Miembros con quienes convive
                      </label>
                      <input type="text" formControlName="miembrosConQuienesConvive"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                        placeholder="Ej: Padre, madre, hermanos..." />
                    </div>

                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Antecedentes patológicos familiares
                      </label>
                      <textarea formControlName="antecedentesPatologicosFamiliares" rows="3"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                        placeholder="Enfermedades hereditarias o familiares..."></textarea>
                    </div>

                    <div class="grid md:grid-cols-2 gap-6">
                      <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-2">
                          ¿Tiene alguna enfermedad?
                        </label>
                        <select formControlName="tieneAlgunaEnfermedad"
                          class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition">
                          <option value="">Seleccionar</option>
                          <option value="Sí">Sí</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      @if (mostrarTipoEnfermedad()) {
                        <div>
                          <label class="block text-sm font-semibold text-slate-700 mb-2">
                            Tipo de enfermedad
                          </label>
                          <input type="text" formControlName="tipoEnfermedad"
                            class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                            placeholder="Especificar enfermedad..." />
                        </div>
                      }
                    </div>

                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Observación familiar
                      </label>
                      <textarea formControlName="observacion" rows="3"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition"
                        placeholder="Observaciones sobre dinámica familiar..."></textarea>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Sección: Exámenes de Funciones Psicológicas -->
            @case ('funciones') {
              <div class="space-y-6">
                <div class="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                  <h3 class="text-xl font-bold text-slate-800 mb-6">Evaluación de Funciones Psicológicas</h3>
                  <div class="grid gap-6 md:grid-cols-2">
                    @for (item of funcionesItems(); track item.key) {
                      <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-2">
                          {{ item.label }}
                        </label>
                        <textarea [formControlName]="item.key" rows="2"
                          class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none transition"
                          [placeholder]="item.placeholder"></textarea>
                      </div>
                    }
                  </div>
                </div>
              </div>
            }

            <!-- Sección: Rasgos de Personalidad -->
            @case ('rasgos') {
              <div class="space-y-6">
                <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                  <h3 class="text-xl font-bold text-slate-800 mb-6">Rasgos de Personalidad y Exámenes</h3>
                  <div class="grid gap-6">
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Rasgos de personalidad predominantes
                      </label>
                      <textarea formControlName="rasgo" rows="3"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none transition"
                        placeholder="Describa los rasgos principales..."></textarea>
                    </div>

                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Exámenes psicológicos aplicados
                      </label>
                      <textarea formControlName="examenesPsicologicos" rows="3"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none transition"
                        placeholder="Resultados de tests aplicados..."></textarea>
                    </div>

                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Observación
                      </label>
                      <textarea formControlName="observacion" rows="3"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none transition"
                        placeholder="Observaciones adicionales..."></textarea>
                    </div>
                  </div>
                </div>
              </div>
            }

            <!-- Sección: Formulación Etiopatogénica -->
            @case ('etiopatogenica') {
              <div class="space-y-6">
                <div class="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-6 border border-rose-200">
                  <h3 class="text-xl font-bold text-slate-800 mb-6">Formulación Etiopatogénica y Pronóstico</h3>
                  <div class="grid gap-6">
                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Factores predisponentes
                        <span class="text-xs font-normal text-slate-500">(Factores de vulnerabilidad)</span>
                      </label>
                      <textarea formControlName="factoresPredisponentes" rows="3"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none transition"
                        placeholder="Factores que aumentan la vulnerabilidad..."></textarea>
                    </div>

                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Factores determinantes
                        <span class="text-xs font-normal text-slate-500">(Factores causales principales)</span>
                      </label>
                      <textarea formControlName="factoresDeterminantes" rows="3"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none transition"
                        placeholder="Factores que determinan la condición..."></textarea>
                    </div>

                    <div>
                      <label class="block text-sm font-semibold text-slate-700 mb-2">
                        Factores desencadenantes
                        <span class="text-xs font-normal text-slate-500">(Eventos precipitantes)</span>
                      </label>
                      <textarea formControlName="factoresDesencadenantes" rows="3"
                        class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none transition"
                        placeholder="Eventos que desencadenaron la situación actual..."></textarea>
                    </div>

                    <div class="grid md:grid-cols-2 gap-6">
                      <div>
                        <label class="block text-sm font-semibold text-slate-700 mb-2">
                          Tipo de pronóstico
                        </label>
                        <select formControlName="pronosticoTipo"
                          class="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-rose-500 focus:ring-2 focus:ring-rose-200 focus:outline-none transition">
                          <option value="">Seleccionar pronóstico</option>
                          <option value="Favorable">Favorable</option>
                          <option value="Reservado">Reservado</option>
                          <option value="Desfavorable">Desfavorable</option>
                          <option value="Incierto">Incierto</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            }
          }

          <!-- Footer de la sección -->
          <div class="pt-6 border-t border-slate-200">
            <div class="flex flex-col md:flex-row items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <div [class]="iconClasses()" class="w-10 h-10 rounded-full flex items-center justify-center">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-700">Completar información</p>
                  <p class="text-xs text-slate-500">Todos los campos son importantes para el diagnóstico</p>
                </div>
              </div>

              <div class="flex flex-wrap gap-3">
                <button type="button" 
                  (click)="limpiar.emit()"
                  class="px-6 py-3 rounded-lg border-2 border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition">
                  <svg class="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Limpiar formulario
                </button>
                
                <button type="submit"
                  [disabled]="loading || !fichaId"
                  class="px-6 py-3 rounded-lg bg-gradient-to-r text-white font-semibold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  [class]="buttonGradient()">
                  @if (!loading) {
                    <span>
                      <svg class="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Guardar {{ sectionTitle() }}
                    </span>
                  } @else {
                    <span class="flex items-center gap-2">
                      <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Guardando...
                    </span>
                  }
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

    <!-- Botones de navegación adicionales -->
    <div class="mt-6 flex justify-between">
      <button type="button"
        (click)="anterior.emit()"
        class="flex items-center gap-2 px-6 py-3 rounded-lg bg-white border border-slate-300 text-slate-700 shadow-sm hover:shadow-md hover:border-slate-400 transition">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        Anterior
      </button>
      
      <button type="button"
        (click)="siguiente.emit()"
        [disabled]="!guardado"
        class="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
        Siguiente
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeccionesAdicionalesComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  
  // Inputs
  @Input() fichaId: number | undefined;
  @Input() currentStep!: StepId;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() guardado = false;
  
  // Outputs
  @Output() guardar = new EventEmitter<any>();
  @Output() limpiar = new EventEmitter<void>();
  @Output() siguiente = new EventEmitter<void>();
  @Output() anterior = new EventEmitter<void>();
  
  // Formulario dinámico
  form!: FormGroup;
  
  // Señales computadas
  readonly sectionTitle = computed(() => {
    switch (this.currentStep) {
      case 'adolescencia': return 'Adolescencia, Juventud y Adultez';
      case 'familiar': return 'Psicoanamnesis Familiar';
      case 'funciones': return 'Exámenes de Funciones Psicológicas';
      case 'rasgos': return 'Rasgos de Personalidad y Exámenes Psicológicos';
      case 'etiopatogenica': return 'Formulación Etiopatogénica y Pronóstico';
      default: return 'Sección';
    }
  });
  
  readonly sectionSubtitle = computed(() => {
    switch (this.currentStep) {
      case 'adolescencia': return 'Historia personal en adolescencia y adultez';
      case 'familiar': return 'Antecedentes familiares y dinámica familiar';
      case 'funciones': return 'Evaluación de funciones psicológicas básicas';
      case 'rasgos': return 'Características de personalidad y resultados de exámenes';
      case 'etiopatogenica': return 'Factores causales y pronóstico';
      default: return 'Información adicional';
    }
  });
  
  readonly headerClasses = computed(() => {
    switch (this.currentStep) {
      case 'adolescencia': return 'bg-gradient-to-r from-purple-600 to-pink-600';
      case 'familiar': return 'bg-gradient-to-r from-indigo-600 to-blue-600';
      case 'funciones': return 'bg-gradient-to-r from-emerald-600 to-teal-600';
      case 'rasgos': return 'bg-gradient-to-r from-amber-600 to-orange-600';
      case 'etiopatogenica': return 'bg-gradient-to-r from-rose-600 to-pink-600';
      default: return 'bg-gradient-to-r from-slate-600 to-gray-600';
    }
  });
  
  readonly buttonGradient = computed(() => {
    switch (this.currentStep) {
      case 'adolescencia': return 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600';
      case 'familiar': return 'from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600';
      case 'funciones': return 'from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600';
      case 'rasgos': return 'from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600';
      case 'etiopatogenica': return 'from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600';
      default: return 'from-slate-500 to-gray-500 hover:from-slate-600 hover:to-gray-600';
    }
  });
  
  readonly iconClasses = computed(() => {
    switch (this.currentStep) {
      case 'adolescencia': return 'bg-purple-100 text-purple-600';
      case 'familiar': return 'bg-indigo-100 text-indigo-600';
      case 'funciones': return 'bg-emerald-100 text-emerald-600';
      case 'rasgos': return 'bg-amber-100 text-amber-600';
      case 'etiopatogenica': return 'bg-rose-100 text-rose-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  });
  
  readonly mostrarTipoEnfermedad = computed(() => {
    return this.form?.get('tieneAlgunaEnfermedad')?.value === 'Sí';
  });
  
  readonly funcionesItems = computed(() => {
    return [
      { key: 'orientacion', label: 'Orientación', placeholder: 'Orientación en tiempo, espacio y persona...' },
      { key: 'atencion', label: 'Atención', placeholder: 'Capacidad de atención y concentración...' },
      { key: 'sensopercepciones', label: 'Sensopercepciones', placeholder: 'Percepción sensorial...' },
      { key: 'voluntad', label: 'Voluntad', placeholder: 'Iniciativa y capacidad volitiva...' },
      { key: 'juicioRazonamiento', label: 'Juicio y Razonamiento', placeholder: 'Capacidad de juicio y razonamiento...' },
      { key: 'nutricion', label: 'Nutrición', placeholder: 'Hábitos alimenticios...' },
      { key: 'sueno', label: 'Sueño', placeholder: 'Patrones de sueño...' },
      { key: 'sexual', label: 'Sexual', placeholder: 'Funcionamiento sexual...' },
      { key: 'pensamientoCurso', label: 'Curso del Pensamiento', placeholder: 'Fluidez y coherencia del pensamiento...' },
      { key: 'pensamientoEstructura', label: 'Estructura del Pensamiento', placeholder: 'Organización del pensamiento...' },
      { key: 'pensamientoContenido', label: 'Contenido del Pensamiento', placeholder: 'Contenido de las ideas...' },
      { key: 'concienciaEnfermedadTratamiento', label: 'Conciencia de Enfermedad', placeholder: 'Conciencia de su condición...' }
    ];
  });
  
  ngOnInit() {
    this.initializeForm();
  }
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['currentStep']) {
      this.initializeForm();
    }
  }
  
  private initializeForm() {
    switch (this.currentStep) {
      case 'adolescencia':
        this.form = this.fb.group({
          habilidadesSociales: ['', [Validators.maxLength(2000)]],
          trastorno: ['', [Validators.maxLength(1000)]],
          historiaPersonal: ['', [Validators.maxLength(4000)]],
          maltratoAdultoProblemasNegligencia: ['', [Validators.maxLength(2000)]],
          problemasRelacionadosCircunstanciasLegales: ['', [Validators.maxLength(2000)]],
          tratamientosPsicologicosPsiquiatricos: ['', [Validators.maxLength(2000)]],
          observacion: ['', [Validators.maxLength(4000)]]
        });
        break;
        
      case 'familiar':
        this.form = this.fb.group({
          miembrosConQuienesConvive: ['', [Validators.maxLength(1000)]],
          antecedentesPatologicosFamiliares: ['', [Validators.maxLength(4000)]],
          tieneAlgunaEnfermedad: [''],
          tipoEnfermedad: ['', [Validators.maxLength(1000)]],
          observacion: ['', [Validators.maxLength(4000)]]
        });
        break;
        
      case 'funciones':
        this.form = this.fb.group({
          orientacion: ['', [Validators.maxLength(1000)]],
          atencion: ['', [Validators.maxLength(1000)]],
          sensopercepciones: ['', [Validators.maxLength(1000)]],
          voluntad: ['', [Validators.maxLength(1000)]],
          juicioRazonamiento: ['', [Validators.maxLength(1000)]],
          nutricion: ['', [Validators.maxLength(1000)]],
          sueno: ['', [Validators.maxLength(1000)]],
          sexual: ['', [Validators.maxLength(1000)]],
          pensamientoCurso: ['', [Validators.maxLength(1000)]],
          pensamientoEstructura: ['', [Validators.maxLength(1000)]],
          pensamientoContenido: ['', [Validators.maxLength(1000)]],
          concienciaEnfermedadTratamiento: ['', [Validators.maxLength(1000)]]
        });
        break;
        
      case 'rasgos':
        this.form = this.fb.group({
          rasgo: ['', [Validators.maxLength(2000)]],
          examenesPsicologicos: ['', [Validators.maxLength(4000)]],
          observacion: ['', [Validators.maxLength(4000)]]
        });
        break;
        
      case 'etiopatogenica':
        this.form = this.fb.group({
          factoresPredisponentes: ['', [Validators.maxLength(4000)]],
          factoresDeterminantes: ['', [Validators.maxLength(4000)]],
          factoresDesencadenantes: ['', [Validators.maxLength(4000)]],
          pronosticoTipo: ['', [Validators.maxLength(200)]]
        });
        break;
    }
  }
  
  onSubmit() {
    if (this.form.valid && this.fichaId) {
      const formValue = this.form.getRawValue();
      // Limpiar valores vacíos
      const cleanedValue = Object.fromEntries(
        Object.entries(formValue).filter(([_, value]) => 
          value !== null && value !== undefined && value !== ''
        )
      );
      
      this.guardar.emit(cleanedValue);
    }
  }
}