import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-ficha-datos-clinicos-step',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let fg = group();
    <section [formGroup]="fg" class="space-y-5">
      <div>
        <label class="block text-sm font-semibold text-slate-700">
          Fecha de evaluacion
          <input type="date" formControlName="fechaEvaluacion"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring" />
        </label>
        @if (hasError('fechaEvaluacion')) {
          <p class="mt-1 text-xs text-red-600">Ingresa la fecha de evaluacion.</p>
        }
      </div>

      <div>
        <label class="block text-sm font-semibold text-slate-700">
          Motivo de consulta
          <textarea formControlName="motivoConsulta" rows="3"
            class="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring"></textarea>
        </label>
        @if (hasError('motivoConsulta')) {
          <p class="mt-1 text-xs text-red-600">Describe el motivo de la consulta.</p>
        }
      </div>

      <div>
        <label class="block text-sm font-semibold text-slate-700">
          Procedencia / derivacion
          <input type="text" formControlName="procedencia"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring" />
        </label>
        @if (hasError('procedencia')) {
          <p class="mt-1 text-xs text-red-600">Indica la procedencia del caso.</p>
        }
      </div>

      <div>
        <label class="block text-sm font-semibold text-slate-700">
          Antecedentes medicos
          <textarea formControlName="antecedentesMedicos" rows="3"
            class="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring"></textarea>
        </label>
      </div>

      <div>
        <label class="block text-sm font-semibold text-slate-700">
          Medicamentos actuales
          <textarea formControlName="medicamentos" rows="2"
            class="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring"></textarea>
        </label>
      </div>
    </section>
  `
})
export class FichaDatosClinicosStepComponent {
  readonly group = input.required<FormGroup>();

  private readonly touched = computed(() => {
    const fg = this.group();
    return Object.values(fg.controls).some(control => control.touched || control.dirty);
  });

  hasError(controlName: string): boolean {
    const control = this.group().get(controlName);
    if (!control) {
      return false;
    }
    return control.invalid && (control.touched || control.dirty || this.touched());
  }
}
