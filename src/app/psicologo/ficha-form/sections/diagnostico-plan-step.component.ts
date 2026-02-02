import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

interface CanonicalOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-ficha-diagnostico-step',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let fg = group();
    <section [formGroup]="fg" class="space-y-5">
      <div>
        <label class="block text-sm font-semibold text-slate-700">
          Diagnostico principal
          <textarea formControlName="diagnostico" rows="3"
            class="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring"></textarea>
        </label>
        @if (hasError('diagnostico')) {
          <p class="mt-1 text-xs text-red-600">Incluye el diagnostico clinico principal.</p>
        }
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <label class="block text-sm font-semibold text-slate-700">
          Condicion final
          <select formControlName="condicion"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring">
            <option value="">Selecciona una condicion</option>
            @for (option of condiciones(); track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
        <label class="block text-sm font-semibold text-slate-700">
          Estado de la ficha
          <select formControlName="estado"
            class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring">
            <option value="">Selecciona un estado</option>
            @for (option of estados(); track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </label>
      </div>
      @if (hasError('condicion')) {
        <p class="mt-1 text-xs text-red-600">Selecciona la condicion final.</p>
      }
      @if (hasError('estado')) {
        <p class="mt-1 text-xs text-red-600">Selecciona el estado de la ficha.</p>
      }

      <div>
        <label class="block text-sm font-semibold text-slate-700">
          Plan de intervencion
          <textarea formControlName="planIntervencion" rows="3"
            class="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring"></textarea>
        </label>
        @if (hasError('planIntervencion')) {
          <p class="mt-1 text-xs text-red-600">Describe el plan de intervencion.</p>
        }
      </div>

      <div>
        <label class="block text-sm font-semibold text-slate-700">
          Observaciones adicionales
          <textarea formControlName="observaciones" rows="3"
            class="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring"></textarea>
        </label>
      </div>
    </section>
  `
})
export class FichaDiagnosticoStepComponent {
  readonly group = input.required<FormGroup>();
  readonly condiciones = input.required<ReadonlyArray<CanonicalOption>>();
  readonly estados = input.required<ReadonlyArray<CanonicalOption>>();

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
