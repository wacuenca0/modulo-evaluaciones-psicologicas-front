import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-ficha-antecedentes-step',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let fg = group();
    <section [formGroup]="fg" class="space-y-5">
      <div>
        <label class="block text-sm font-semibold text-slate-700">
          Antecedentes familiares
          <textarea formControlName="antecedentesFamiliares" rows="3"
            class="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring"></textarea>
        </label>
        @if (hasError('antecedentesFamiliares')) {
          <p class="mt-1 text-xs text-red-600">Registra los antecedentes familiares relevantes.</p>
        }
      </div>

      <div>
        <label class="block text-sm font-semibold text-slate-700">
          Antecedentes personales
          <textarea formControlName="antecedentesPersonales" rows="3"
            class="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring"></textarea>
        </label>
        @if (hasError('antecedentesPersonales')) {
          <p class="mt-1 text-xs text-red-600">Detalla los antecedentes personales.</p>
        }
      </div>

      <div>
        <label class="block text-sm font-semibold text-slate-700">
          Desarrollo en la infancia
          <textarea formControlName="desarrolloInfancia" rows="3"
            class="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring"></textarea>
        </label>
        @if (hasError('desarrolloInfancia')) {
          <p class="mt-1 text-xs text-red-600">Describe aspectos relevantes del desarrollo en la infancia.</p>
        }
      </div>

      <div>
        <label class="block text-sm font-semibold text-slate-700">
          Acontecimientos relevantes
          <textarea formControlName="acontecimientosRelevantes" rows="3"
            class="mt-1 w-full resize-y rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none focus:ring"></textarea>
        </label>
      </div>
    </section>
  `
})
export class FichaAntecedentesStepComponent {
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
