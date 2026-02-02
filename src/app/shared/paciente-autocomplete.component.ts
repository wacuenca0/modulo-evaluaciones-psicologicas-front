import { Component, EventEmitter, Input, Output, signal, inject, ChangeDetectionStrategy, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PersonalMilitarService } from '../services/personal-militar.service';
import { PersonalMilitarDTO } from '../models/personal-militar.models';

@Component({
  selector: 'app-paciente-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <input
        type="text"
        [(ngModel)]="query"
        (input)="onInput()"
        class="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm"
        placeholder="Buscar paciente por cédula o apellidos..."
        autocomplete="off"
      />
      <ul *ngIf="resultados().length > 0 && showResults" class="mt-1 rounded-lg border border-slate-200 bg-white shadow z-10 max-h-48 overflow-auto">
        <li *ngFor="let paciente of resultados()" (click)="selectPaciente(paciente)"
            class="px-4 py-2 cursor-pointer hover:bg-slate-100 text-sm">
          {{ paciente.apellidosNombres }} ({{ paciente.cedula }})
        </li>
      </ul>
      <div *ngIf="loading()" class="text-xs text-slate-400 mt-1">Buscando...</div>
      <div *ngIf="!loading() && query && resultados().length === 0" class="text-xs text-slate-400 mt-1">Sin resultados</div>
    </div>
  `
})
export class PacienteAutocompleteComponent implements OnInit, OnChanges {
  @Input() placeholder = 'Buscar paciente...';
  @Input() selectedId: number | null = null;
  @Output() selectedIdChange = new EventEmitter<number | null>();
  @Output() pacienteSeleccionado = new EventEmitter<PersonalMilitarDTO>();

  private readonly service = inject(PersonalMilitarService);
  query = '';
  showResults = false;
  readonly resultados = signal<PersonalMilitarDTO[]>([]);
  readonly loading = signal(false);
  private selectedPaciente: PersonalMilitarDTO | null = null;

  ngOnInit() {
    if (this.selectedId) {
      this.service.obtenerPorId(this.selectedId).subscribe({
        next: paciente => {
          this.selectedPaciente = paciente;
          this.query = `${paciente.apellidosNombres} (${paciente.cedula})`;
        },
        error: () => {
          this.selectedPaciente = null;
          this.query = '';
        }
      });
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['selectedId'] && !changes['selectedId'].firstChange) {
      if (this.selectedId) {
        this.service.obtenerPorId(this.selectedId).subscribe({
          next: paciente => {
            this.selectedPaciente = paciente;
            this.query = `${paciente.apellidosNombres} (${paciente.cedula})`;
          },
          error: () => {
            this.selectedPaciente = null;
            this.query = '';
          }
        });
      } else {
        this.selectedPaciente = null;
        this.query = '';
      }
    }
  }

  onInput() {
    const value = this.query.trim();
    if (value.length < 2) {
      this.resultados.set([]);
      this.showResults = false;
      return;
    }
    this.loading.set(true);
    this.showResults = true;
      this.service.buscarPorTermino(value).subscribe({
        next: (res: PersonalMilitarDTO[]) => {
          this.resultados.set(res || []);
          this.loading.set(false);
        },
        error: (_err: unknown) => {
          this.resultados.set([]);
          this.loading.set(false);
        }
      });
  }

  selectPaciente(paciente: PersonalMilitarDTO) {
    this.selectedPaciente = paciente;
    this.selectedIdChange.emit(paciente.id);
    this.pacienteSeleccionado.emit(paciente);
    this.query = `${paciente.apellidosNombres} (${paciente.cedula})`;
    this.showResults = false;
  }
}
